import { db } from '../db';
import { loanRequestsTable } from '../db/schema';
import { type LoanRequest } from '../schema';

export const getLoanRequests = async (): Promise<LoanRequest[]> => {
  try {
    const results = await db.select()
      .from(loanRequestsTable)
      .execute();

    return results.map(result => ({
      ...result,
      borrow_date: new Date(result.borrow_date),
      return_date: new Date(result.return_date),
      approved_at: result.approved_at ? new Date(result.approved_at) : null,
      handover_date: result.handover_date ? new Date(result.handover_date) : null,
      actual_return_date: result.actual_return_date ? new Date(result.actual_return_date) : null,
      created_at: new Date(result.created_at),
      updated_at: new Date(result.updated_at)
    }));
  } catch (error) {
    console.error('Fetching loan requests failed:', error);
    throw error;
  }
};