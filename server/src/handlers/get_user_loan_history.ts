import { db } from '../db';
import { loanRequestsTable } from '../db/schema';
import { type UserLoanHistory } from '../schema';
import { eq, and, or } from 'drizzle-orm';

export async function getUserLoanHistory(userId: number): Promise<UserLoanHistory> {
  try {
    // Get all loan requests for this user
    const allLoanRequests = await db.select()
      .from(loanRequestsTable)
      .where(eq(loanRequestsTable.user_id, userId))
      .execute();

    // Categorize the loan requests based on their status
    const currentLoans = allLoanRequests.filter(loan => 
      loan.status === 'approved' && loan.handover_date !== null && loan.actual_return_date === null
    );

    const loanHistory = allLoanRequests.filter(loan => 
      loan.status === 'completed' || loan.actual_return_date !== null
    );

    const pendingRequests = allLoanRequests.filter(loan => 
      loan.status === 'pending_approval'
    );

    return {
      current_loans: currentLoans,
      loan_history: loanHistory,
      pending_requests: pendingRequests
    };
  } catch (error) {
    console.error('Failed to get user loan history:', error);
    throw error;
  }
}