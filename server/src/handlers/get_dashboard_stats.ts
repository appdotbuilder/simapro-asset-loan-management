import { db } from '../db';
import { assetsTable, loanRequestsTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { eq, and, count, sql } from 'drizzle-orm';

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Get total assets count (excluding deleted assets)
    const totalAssetsResult = await db.select({ count: count() })
      .from(assetsTable)
      .where(sql`${assetsTable.status} != 'deleted'`)
      .execute();

    // Get available assets count
    const availableAssetsResult = await db.select({ count: count() })
      .from(assetsTable)
      .where(eq(assetsTable.status, 'available'))
      .execute();

    // Get borrowed assets count
    const borrowedAssetsResult = await db.select({ count: count() })
      .from(assetsTable)
      .where(eq(assetsTable.status, 'borrowed'))
      .execute();

    // Get pending loan requests count
    const pendingRequestsResult = await db.select({ count: count() })
      .from(loanRequestsTable)
      .where(eq(loanRequestsTable.status, 'pending_approval'))
      .execute();

    // Get assets under repair count
    const underRepairAssetsResult = await db.select({ count: count() })
      .from(assetsTable)
      .where(eq(assetsTable.status, 'under_repair'))
      .execute();

    // Get damaged assets count
    const damagedAssetsResult = await db.select({ count: count() })
      .from(assetsTable)
      .where(eq(assetsTable.status, 'damaged'))
      .execute();

    return {
      total_assets: totalAssetsResult[0].count,
      available_assets: availableAssetsResult[0].count,
      borrowed_assets: borrowedAssetsResult[0].count,
      pending_requests: pendingRequestsResult[0].count,
      assets_under_repair: underRepairAssetsResult[0].count,
      damaged_assets: damagedAssetsResult[0].count
    };
  } catch (error) {
    console.error('Dashboard stats retrieval failed:', error);
    throw error;
  }
};