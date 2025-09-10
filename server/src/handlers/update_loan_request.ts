import { db } from '../db';
import { loanRequestsTable, assetsTable } from '../db/schema';
import { type UpdateLoanRequestInput, type LoanRequest } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateLoanRequest(input: UpdateLoanRequestInput, approverId?: number): Promise<LoanRequest> {
  try {
    // First, get the current loan request to understand its state
    const existingLoanRequest = await db.select()
      .from(loanRequestsTable)
      .where(eq(loanRequestsTable.id, input.id))
      .execute();

    if (existingLoanRequest.length === 0) {
      throw new Error(`Loan request with id ${input.id} not found`);
    }

    const currentRequest = existingLoanRequest[0];

    // Prepare update data
    const updateData: any = {
      updated_at: new Date()
    };

    // Handle status changes and their side effects
    if (input.status !== undefined) {
      updateData.status = input.status;

      // Handle approval
      if (input.status === 'approved' && approverId) {
        updateData.approved_by = approverId;
        updateData.approved_at = new Date();
      }

      // Handle rejection - reset approved fields
      if (input.status === 'rejected') {
        if (approverId) {
          updateData.approved_by = approverId;
          updateData.approved_at = new Date();
        }
      }

      // Update asset status based on loan request status
      if (input.status === 'approved' && currentRequest.status === 'pending_approval') {
        // When loan is approved, asset becomes borrowed (assuming handover happens immediately)
        await db.update(assetsTable)
          .set({ 
            status: 'borrowed',
            updated_at: new Date()
          })
          .where(eq(assetsTable.id, currentRequest.asset_id))
          .execute();
      } else if (input.status === 'completed') {
        // When loan is completed, asset becomes available again
        await db.update(assetsTable)
          .set({ 
            status: 'available',
            updated_at: new Date()
          })
          .where(eq(assetsTable.id, currentRequest.asset_id))
          .execute();
      } else if (input.status === 'rejected') {
        // When loan is rejected, ensure asset is available
        await db.update(assetsTable)
          .set({ 
            status: 'available',
            updated_at: new Date()
          })
          .where(eq(assetsTable.id, currentRequest.asset_id))
          .execute();
      }
    }

    // Handle handover date
    if (input.handover_date !== undefined) {
      updateData.handover_date = input.handover_date;
      
      // If handover date is set and status is approved, update asset to borrowed
      if (input.handover_date && currentRequest.status === 'approved') {
        await db.update(assetsTable)
          .set({ 
            status: 'borrowed',
            updated_at: new Date()
          })
          .where(eq(assetsTable.id, currentRequest.asset_id))
          .execute();
      }
    }

    // Handle actual return date
    if (input.actual_return_date !== undefined) {
      updateData.actual_return_date = input.actual_return_date;
      
      // If return date is set, mark as completed and make asset available
      if (input.actual_return_date) {
        updateData.status = 'completed';
        await db.update(assetsTable)
          .set({ 
            status: 'available',
            updated_at: new Date()
          })
          .where(eq(assetsTable.id, currentRequest.asset_id))
          .execute();
      }
    }

    // Handle notes
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    // Update the loan request
    const result = await db.update(loanRequestsTable)
      .set(updateData)
      .where(eq(loanRequestsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Loan request update failed:', error);
    throw error;
  }
}