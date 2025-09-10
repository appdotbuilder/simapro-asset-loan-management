import { db } from '../db';
import { maintenanceRecordsTable, assetsTable } from '../db/schema';
import { type UpdateMaintenanceRecordInput, type MaintenanceRecord } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateMaintenanceRecord(input: UpdateMaintenanceRecordInput): Promise<MaintenanceRecord> {
  try {
    // Update the maintenance record
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.completed_date !== undefined) {
      updateData.completed_date = input.completed_date;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.cost !== undefined) {
      updateData.cost = input.cost !== null ? input.cost.toString() : null; // Convert number to string for numeric column
    }
    if (input.performed_by !== undefined) {
      updateData.performed_by = input.performed_by;
    }
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    const result = await db.update(maintenanceRecordsTable)
      .set(updateData)
      .where(eq(maintenanceRecordsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Maintenance record with id ${input.id} not found`);
    }

    const maintenanceRecord = result[0];

    // If maintenance is completed, update asset status back to 'available'
    if (input.status === 'completed') {
      await db.update(assetsTable)
        .set({ 
          status: 'available',
          updated_at: new Date()
        })
        .where(eq(assetsTable.id, maintenanceRecord.asset_id))
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    return {
      ...maintenanceRecord,
      cost: maintenanceRecord.cost ? parseFloat(maintenanceRecord.cost) : null
    };
  } catch (error) {
    console.error('Maintenance record update failed:', error);
    throw error;
  }
}