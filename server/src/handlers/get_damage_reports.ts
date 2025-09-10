import { db } from '../db';
import { damageReportsTable, assetsTable, usersTable } from '../db/schema';
import { type DamageReport } from '../schema';
import { eq, desc, and, SQL } from 'drizzle-orm';

export interface GetDamageReportsFilters {
  is_resolved?: boolean;
  severity?: 'minor' | 'major' | 'critical';
  asset_id?: number;
  reported_by?: number;
}

export const getDamageReports = async (filters?: GetDamageReportsFilters): Promise<DamageReport[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (filters?.is_resolved !== undefined) {
      conditions.push(eq(damageReportsTable.is_resolved, filters.is_resolved));
    }

    if (filters?.severity) {
      conditions.push(eq(damageReportsTable.severity, filters.severity));
    }

    if (filters?.asset_id) {
      conditions.push(eq(damageReportsTable.asset_id, filters.asset_id));
    }

    if (filters?.reported_by) {
      conditions.push(eq(damageReportsTable.reported_by, filters.reported_by));
    }

    // Build query with joins and conditions
    const baseQuery = db.select({
      id: damageReportsTable.id,
      asset_id: damageReportsTable.asset_id,
      reported_by: damageReportsTable.reported_by,
      loan_request_id: damageReportsTable.loan_request_id,
      description: damageReportsTable.description,
      photos: damageReportsTable.photos,
      severity: damageReportsTable.severity,
      is_resolved: damageReportsTable.is_resolved,
      resolution_notes: damageReportsTable.resolution_notes,
      resolved_by: damageReportsTable.resolved_by,
      resolved_at: damageReportsTable.resolved_at,
      created_at: damageReportsTable.created_at,
      updated_at: damageReportsTable.updated_at
    })
    .from(damageReportsTable)
    .innerJoin(assetsTable, eq(damageReportsTable.asset_id, assetsTable.id))
    .innerJoin(usersTable, eq(damageReportsTable.reported_by, usersTable.id));

    // Apply filters if any exist
    const query = conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    // Order by creation date (newest first) and execute
    const results = await query
      .orderBy(desc(damageReportsTable.created_at))
      .execute();

    // Return results in proper DamageReport format
    return results.map(result => ({
      id: result.id,
      asset_id: result.asset_id,
      reported_by: result.reported_by,
      loan_request_id: result.loan_request_id,
      description: result.description,
      photos: result.photos,
      severity: result.severity,
      is_resolved: result.is_resolved,
      resolution_notes: result.resolution_notes,
      resolved_by: result.resolved_by,
      resolved_at: result.resolved_at,
      created_at: result.created_at,
      updated_at: result.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch damage reports:', error);
    throw error;
  }
};