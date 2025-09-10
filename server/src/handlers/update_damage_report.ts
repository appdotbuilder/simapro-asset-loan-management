import { db } from '../db';
import { damageReportsTable, assetsTable } from '../db/schema';
import { type UpdateDamageReportInput, type DamageReport } from '../schema';
import { eq } from 'drizzle-orm';

export const updateDamageReport = async (input: UpdateDamageReportInput, resolverId?: number): Promise<DamageReport> => {
  try {
    // First, get the existing damage report to check if it exists
    const existingReport = await db.select()
      .from(damageReportsTable)
      .where(eq(damageReportsTable.id, input.id))
      .execute();

    if (existingReport.length === 0) {
      throw new Error(`Damage report with ID ${input.id} not found`);
    }

    // Prepare update values
    const updateValues: any = {};

    if (input.is_resolved !== undefined) {
      updateValues.is_resolved = input.is_resolved;
      
      // If marking as resolved, set resolver and timestamp
      if (input.is_resolved && resolverId) {
        updateValues.resolved_by = resolverId;
        updateValues.resolved_at = new Date();
      }
      
      // If marking as unresolved, clear resolver info
      if (!input.is_resolved) {
        updateValues.resolved_by = null;
        updateValues.resolved_at = null;
      }
    }

    if (input.resolution_notes !== undefined) {
      updateValues.resolution_notes = input.resolution_notes;
    }

    updateValues.updated_at = new Date();

    // Update the damage report
    const result = await db.update(damageReportsTable)
      .set(updateValues)
      .where(eq(damageReportsTable.id, input.id))
      .returning()
      .execute();

    const updatedReport = result[0];

    // If damage report is being resolved, potentially update asset status
    if (input.is_resolved === true) {
      // Check if there are any other unresolved damage reports for this asset
      const otherUnresolvedReports = await db.select()
        .from(damageReportsTable)
        .where(eq(damageReportsTable.asset_id, updatedReport.asset_id))
        .execute();

      const hasOtherUnresolvedDamage = otherUnresolvedReports.some(
        report => report.id !== updatedReport.id && !report.is_resolved
      );

      // If no other unresolved damage reports and asset is currently damaged, set to available
      if (!hasOtherUnresolvedDamage) {
        const currentAsset = await db.select()
          .from(assetsTable)
          .where(eq(assetsTable.id, updatedReport.asset_id))
          .execute();

        if (currentAsset.length > 0 && currentAsset[0].status === 'damaged') {
          await db.update(assetsTable)
            .set({ 
              status: 'available',
              updated_at: new Date()
            })
            .where(eq(assetsTable.id, updatedReport.asset_id))
            .execute();
        }
      }
    }

    return updatedReport;
  } catch (error) {
    console.error('Damage report update failed:', error);
    throw error;
  }
};