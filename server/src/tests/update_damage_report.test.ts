import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  damageReportsTable, 
  usersTable, 
  categoriesTable, 
  locationsTable, 
  assetsTable 
} from '../db/schema';
import { type UpdateDamageReportInput } from '../schema';
import { updateDamageReport } from '../handlers/update_damage_report';
import { eq } from 'drizzle-orm';

describe('updateDamageReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  const createTestData = async () => {
    // Create test users
    const users = await db.insert(usersTable).values([
      {
        username: 'reporter',
        email: 'reporter@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Reporter',
        role: 'user'
      },
      {
        username: 'resolver',
        email: 'resolver@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Resolver',
        role: 'petugas_sarpras'
      }
    ]).returning().execute();

    // Create test category
    const categories = await db.insert(categoriesTable).values({
      name: 'Test Category',
      description: 'Test category description'
    }).returning().execute();

    // Create test location
    const locations = await db.insert(locationsTable).values({
      name: 'Test Location',
      description: 'Test location description'
    }).returning().execute();

    // Create test asset
    const assets = await db.insert(assetsTable).values({
      asset_code: 'ASSET-001',
      name: 'Test Asset',
      photos: [],
      category_id: categories[0].id,
      location_id: locations[0].id,
      status: 'damaged',
      qr_code: 'QR-001'
    }).returning().execute();

    // Create test damage report
    const damageReports = await db.insert(damageReportsTable).values({
      asset_id: assets[0].id,
      reported_by: users[0].id,
      description: 'Test damage description',
      photos: ['photo1.jpg'],
      severity: 'major',
      is_resolved: false
    }).returning().execute();

    return {
      users,
      categories,
      locations,
      assets,
      damageReports
    };
  };

  it('should resolve a damage report successfully', async () => {
    const testData = await createTestData();
    const damageReport = testData.damageReports[0];
    const resolver = testData.users[1];

    const input: UpdateDamageReportInput = {
      id: damageReport.id,
      is_resolved: true,
      resolution_notes: 'Issue has been fixed'
    };

    const result = await updateDamageReport(input, resolver.id);

    // Verify the result
    expect(result.id).toBe(damageReport.id);
    expect(result.is_resolved).toBe(true);
    expect(result.resolution_notes).toBe('Issue has been fixed');
    expect(result.resolved_by).toBe(resolver.id);
    expect(result.resolved_at).toBeInstanceOf(Date);
  });

  it('should update resolution notes without changing resolved status', async () => {
    const testData = await createTestData();
    const damageReport = testData.damageReports[0];

    const input: UpdateDamageReportInput = {
      id: damageReport.id,
      resolution_notes: 'Additional notes added'
    };

    const result = await updateDamageReport(input);

    expect(result.id).toBe(damageReport.id);
    expect(result.is_resolved).toBe(false); // Should remain unchanged
    expect(result.resolution_notes).toBe('Additional notes added');
    expect(result.resolved_by).toBeNull();
    expect(result.resolved_at).toBeNull();
  });

  it('should unresolve a damage report', async () => {
    const testData = await createTestData();
    const damageReport = testData.damageReports[0];
    const resolver = testData.users[1];

    // First resolve the report
    await updateDamageReport({
      id: damageReport.id,
      is_resolved: true,
      resolution_notes: 'Initially resolved'
    }, resolver.id);

    // Then unresolve it
    const input: UpdateDamageReportInput = {
      id: damageReport.id,
      is_resolved: false,
      resolution_notes: 'Issue reopened'
    };

    const result = await updateDamageReport(input);

    expect(result.id).toBe(damageReport.id);
    expect(result.is_resolved).toBe(false);
    expect(result.resolution_notes).toBe('Issue reopened');
    expect(result.resolved_by).toBeNull();
    expect(result.resolved_at).toBeNull();
  });

  it('should update asset status to available when damage is resolved and no other unresolved damage exists', async () => {
    const testData = await createTestData();
    const damageReport = testData.damageReports[0];
    const asset = testData.assets[0];
    const resolver = testData.users[1];

    // Verify asset is initially damaged
    expect(asset.status).toBe('damaged');

    const input: UpdateDamageReportInput = {
      id: damageReport.id,
      is_resolved: true,
      resolution_notes: 'Damage fixed'
    };

    await updateDamageReport(input, resolver.id);

    // Check that asset status was updated to available
    const updatedAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, asset.id))
      .execute();

    expect(updatedAsset[0].status).toBe('available');
  });

  it('should not update asset status when other unresolved damage reports exist', async () => {
    const testData = await createTestData();
    const asset = testData.assets[0];
    const resolver = testData.users[1];

    // Create a second damage report for the same asset
    const secondDamageReports = await db.insert(damageReportsTable).values({
      asset_id: asset.id,
      reported_by: testData.users[0].id,
      description: 'Another damage issue',
      photos: [],
      severity: 'minor',
      is_resolved: false
    }).returning().execute();

    // Resolve the first damage report
    const input: UpdateDamageReportInput = {
      id: testData.damageReports[0].id,
      is_resolved: true,
      resolution_notes: 'First issue fixed'
    };

    await updateDamageReport(input, resolver.id);

    // Asset should still be damaged due to the second unresolved report
    const updatedAsset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, asset.id))
      .execute();

    expect(updatedAsset[0].status).toBe('damaged');
  });

  it('should save changes to database correctly', async () => {
    const testData = await createTestData();
    const damageReport = testData.damageReports[0];
    const resolver = testData.users[1];

    const input: UpdateDamageReportInput = {
      id: damageReport.id,
      is_resolved: true,
      resolution_notes: 'Database persistence test'
    };

    await updateDamageReport(input, resolver.id);

    // Verify data was persisted to database
    const savedReport = await db.select()
      .from(damageReportsTable)
      .where(eq(damageReportsTable.id, damageReport.id))
      .execute();

    expect(savedReport).toHaveLength(1);
    expect(savedReport[0].is_resolved).toBe(true);
    expect(savedReport[0].resolution_notes).toBe('Database persistence test');
    expect(savedReport[0].resolved_by).toBe(resolver.id);
    expect(savedReport[0].resolved_at).toBeInstanceOf(Date);
  });

  it('should throw error when damage report does not exist', async () => {
    const input: UpdateDamageReportInput = {
      id: 999, // Non-existent ID
      is_resolved: true,
      resolution_notes: 'This should fail'
    };

    await expect(updateDamageReport(input, 1)).rejects.toThrow(/not found/i);
  });

  it('should handle partial updates correctly', async () => {
    const testData = await createTestData();
    const damageReport = testData.damageReports[0];

    // Update only resolution_notes
    const input: UpdateDamageReportInput = {
      id: damageReport.id,
      resolution_notes: 'Only notes updated'
    };

    const result = await updateDamageReport(input);

    expect(result.resolution_notes).toBe('Only notes updated');
    expect(result.is_resolved).toBe(false); // Should remain unchanged
    expect(result.resolved_by).toBeNull();
    expect(result.resolved_at).toBeNull();
  });

  it('should update updated_at timestamp', async () => {
    const testData = await createTestData();
    const damageReport = testData.damageReports[0];
    const originalUpdatedAt = damageReport.updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateDamageReportInput = {
      id: damageReport.id,
      resolution_notes: 'Timestamp test'
    };

    const result = await updateDamageReport(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});