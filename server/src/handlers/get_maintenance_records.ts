import { db } from '../db';
import { maintenanceRecordsTable } from '../db/schema';
import { type MaintenanceRecord } from '../schema';

export const getMaintenanceRecords = async (): Promise<MaintenanceRecord[]> => {
  try {
    const results = await db.select()
      .from(maintenanceRecordsTable)
      .execute();

    // Convert numeric fields back to numbers for maintenance records
    return results.map(record => ({
      ...record,
      cost: record.cost ? parseFloat(record.cost) : null
    }));
  } catch (error) {
    console.error('Failed to fetch maintenance records:', error);
    throw error;
  }
};