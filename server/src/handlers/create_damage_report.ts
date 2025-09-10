import { db } from '../db';
import { damageReportsTable, assetsTable } from '../db/schema';
import { type CreateDamageReportInput, type DamageReport } from '../schema';
import { eq } from 'drizzle-orm';

export const createDamageReport = async (input: CreateDamageReportInput, reporterId: number): Promise<DamageReport> => {
  try {
    // Verify that the asset exists
    const asset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, input.asset_id))
      .execute();

    if (asset.length === 0) {
      throw new Error('Asset not found');
    }

    // Create the damage report
    const result = await db.insert(damageReportsTable)
      .values({
        asset_id: input.asset_id,
        reported_by: reporterId,
        loan_request_id: input.loan_request_id,
        description: input.description,
        photos: input.photos,
        severity: input.severity
      })
      .returning()
      .execute();

    const damageReport = result[0];

    // Update asset status based on severity
    // Critical and major damage -> damaged status
    // Minor damage -> under_repair status
    const newAssetStatus = input.severity === 'minor' ? 'under_repair' : 'damaged';

    await db.update(assetsTable)
      .set({ status: newAssetStatus })
      .where(eq(assetsTable.id, input.asset_id))
      .execute();

    return damageReport;
  } catch (error) {
    console.error('Damage report creation failed:', error);
    throw error;
  }
};