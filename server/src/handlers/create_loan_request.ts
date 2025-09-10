import { db } from '../db';
import { loanRequestsTable, assetsTable, usersTable } from '../db/schema';
import { type CreateLoanRequestInput, type LoanRequest } from '../schema';
import { eq, and, gte, lte, or, isNull } from 'drizzle-orm';

export const createLoanRequest = async (input: CreateLoanRequestInput, userId: number): Promise<LoanRequest> => {
  try {
    // Validate that user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (!user[0].is_active) {
      throw new Error('User account is inactive');
    }

    // Validate that asset exists and is available
    const asset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, input.asset_id))
      .execute();

    if (asset.length === 0) {
      throw new Error('Asset not found');
    }

    if (asset[0].status !== 'available') {
      throw new Error('Asset is not available for borrowing');
    }

    // Validate date range
    if (input.borrow_date >= input.return_date) {
      throw new Error('Return date must be after borrow date');
    }

    const now = new Date();
    if (input.borrow_date < now) {
      throw new Error('Borrow date cannot be in the past');
    }

    // Check for conflicting loan requests for the same asset in the requested date range
    const conflictingRequests = await db.select()
      .from(loanRequestsTable)
      .where(
        and(
          eq(loanRequestsTable.asset_id, input.asset_id),
          or(
            eq(loanRequestsTable.status, 'approved'),
            eq(loanRequestsTable.status, 'pending_approval')
          ),
          or(
            // New request starts during existing request period
            and(
              gte(loanRequestsTable.borrow_date, input.borrow_date),
              lte(loanRequestsTable.borrow_date, input.return_date)
            ),
            // New request ends during existing request period  
            and(
              gte(loanRequestsTable.return_date, input.borrow_date),
              lte(loanRequestsTable.return_date, input.return_date)
            ),
            // Existing request is within new request period
            and(
              gte(loanRequestsTable.borrow_date, input.borrow_date),
              lte(loanRequestsTable.return_date, input.return_date)
            ),
            // New request is within existing request period
            and(
              lte(loanRequestsTable.borrow_date, input.borrow_date),
              gte(loanRequestsTable.return_date, input.return_date)
            )
          )
        )
      )
      .execute();

    if (conflictingRequests.length > 0) {
      throw new Error('Asset is already requested or booked for the specified date range');
    }

    // Create the loan request
    const result = await db.insert(loanRequestsTable)
      .values({
        user_id: userId,
        asset_id: input.asset_id,
        purpose: input.purpose,
        borrow_date: input.borrow_date,
        return_date: input.return_date,
        status: 'pending_approval',
        notes: input.notes,
        approved_by: null,
        approved_at: null,
        handover_date: null,
        actual_return_date: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Loan request creation failed:', error);
    throw error;
  }
};