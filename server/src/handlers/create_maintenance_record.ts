import { db } from '../db';
import { maintenanceRecordsTable, assetsTable } from '../db/schema';
import { type CreateMaintenanceRecordInput, type MaintenanceRecord } from '../schema';
import { eq } from 'drizzle-orm';

export const createMaintenanceRecord = async (input: CreateMaintenanceRecordInput, creatorId: number): Promise<MaintenanceRecord> => {
  try {
    // Verify the asset exists before creating maintenance record
    const existingAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, input.asset_id))
      .execute();

    if (existingAsset.length === 0) {
      throw new Error(`Asset with id ${input.asset_id} not found`);
    }

    // Insert the maintenance record
    const result = await db.insert(maintenanceRecordsTable)
      .values({
        asset_id: input.asset_id,
        maintenance_type: input.maintenance_type,
        description: input.description,
        scheduled_date: input.scheduled_date,
        cost: input.cost ? input.cost.toString() : null, // Convert number to string for numeric column
        performed_by: input.performed_by,
        notes: input.notes,
        created_by: creatorId,
        status: 'scheduled' // Default status
      })
      .returning()
      .execute();

    const maintenanceRecord = result[0];

    // Update asset status to 'under_repair' when maintenance is scheduled
    await db.update(assetsTable)
      .set({ 
        status: 'under_repair',
        updated_at: new Date()
      })
      .where(eq(assetsTable.id, input.asset_id))
      .execute();

    // Convert numeric fields back to numbers before returning
    return {
      ...maintenanceRecord,
      cost: maintenanceRecord.cost ? parseFloat(maintenanceRecord.cost) : null
    };
  } catch (error) {
    console.error('Maintenance record creation failed:', error);
    throw error;
  }
};