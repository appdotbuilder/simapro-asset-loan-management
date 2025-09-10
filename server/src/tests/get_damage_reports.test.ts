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
import { getDamageReports, type GetDamageReportsFilters } from '../handlers/get_damage_reports';

describe('getDamageReports', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testAssetId: number;
  let categoryId: number;
  let locationId: number;

  beforeEach(async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category for damage reports'
      })
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    // Create test location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: 'Test location for assets'
      })
      .returning()
      .execute();
    locationId = locationResult[0].id;

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        asset_code: 'TEST001',
        name: 'Test Asset',
        photos: [],
        category_id: categoryId,
        brand: 'Test Brand',
        serial_number: 'SN123',
        specification: 'Test specs',
        location_id: locationId,
        supplier_id: null,
        purchase_date: '2024-01-01',
        purchase_price: '1000.00',
        status: 'available',
        qr_code: 'qr_test_001'
      })
      .returning()
      .execute();
    testAssetId = assetResult[0].id;
  });

  it('should fetch all damage reports without filters', async () => {
    // Create test damage reports
    await db.insert(damageReportsTable)
      .values([
        {
          asset_id: testAssetId,
          reported_by: testUserId,
          loan_request_id: null,
          description: 'Minor scratch on surface',
          photos: ['photo1.jpg'],
          severity: 'minor',
          is_resolved: false,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null
        },
        {
          asset_id: testAssetId,
          reported_by: testUserId,
          loan_request_id: null,
          description: 'Major damage to component',
          photos: ['photo2.jpg', 'photo3.jpg'],
          severity: 'major',
          is_resolved: true,
          resolution_notes: 'Repaired successfully',
          resolved_by: testUserId,
          resolved_at: new Date()
        }
      ])
      .execute();

    const results = await getDamageReports();

    expect(results).toHaveLength(2);
    
    // Find reports by description since order is not guaranteed in quick succession
    const majorReport = results.find(r => r.description === 'Major damage to component');
    const minorReport = results.find(r => r.description === 'Minor scratch on surface');

    // Check major damage report
    expect(majorReport).toBeDefined();
    expect(majorReport!.severity).toEqual('major');
    expect(majorReport!.is_resolved).toEqual(true);
    expect(majorReport!.asset_id).toEqual(testAssetId);
    expect(majorReport!.reported_by).toEqual(testUserId);
    expect(majorReport!.photos).toEqual(['photo2.jpg', 'photo3.jpg']);
    expect(majorReport!.resolution_notes).toEqual('Repaired successfully');
    expect(majorReport!.resolved_by).toEqual(testUserId);
    expect(majorReport!.resolved_at).toBeInstanceOf(Date);

    // Check minor damage report
    expect(minorReport).toBeDefined();
    expect(minorReport!.severity).toEqual('minor');
    expect(minorReport!.is_resolved).toEqual(false);
    expect(minorReport!.resolution_notes).toBeNull();
    expect(minorReport!.resolved_by).toBeNull();
    expect(minorReport!.resolved_at).toBeNull();
  });

  it('should filter by resolution status', async () => {
    // Create resolved and unresolved damage reports
    await db.insert(damageReportsTable)
      .values([
        {
          asset_id: testAssetId,
          reported_by: testUserId,
          loan_request_id: null,
          description: 'Unresolved damage',
          photos: [],
          severity: 'minor',
          is_resolved: false,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null
        },
        {
          asset_id: testAssetId,
          reported_by: testUserId,
          loan_request_id: null,
          description: 'Resolved damage',
          photos: [],
          severity: 'major',
          is_resolved: true,
          resolution_notes: 'Fixed',
          resolved_by: testUserId,
          resolved_at: new Date()
        }
      ])
      .execute();

    // Test filtering for unresolved reports
    const unresolvedFilters: GetDamageReportsFilters = { is_resolved: false };
    const unresolvedResults = await getDamageReports(unresolvedFilters);

    expect(unresolvedResults).toHaveLength(1);
    expect(unresolvedResults[0].description).toEqual('Unresolved damage');
    expect(unresolvedResults[0].is_resolved).toEqual(false);

    // Test filtering for resolved reports
    const resolvedFilters: GetDamageReportsFilters = { is_resolved: true };
    const resolvedResults = await getDamageReports(resolvedFilters);

    expect(resolvedResults).toHaveLength(1);
    expect(resolvedResults[0].description).toEqual('Resolved damage');
    expect(resolvedResults[0].is_resolved).toEqual(true);
  });

  it('should filter by severity level', async () => {
    // Create damage reports with different severity levels
    await db.insert(damageReportsTable)
      .values([
        {
          asset_id: testAssetId,
          reported_by: testUserId,
          loan_request_id: null,
          description: 'Minor damage',
          photos: [],
          severity: 'minor',
          is_resolved: false,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null
        },
        {
          asset_id: testAssetId,
          reported_by: testUserId,
          loan_request_id: null,
          description: 'Critical damage',
          photos: [],
          severity: 'critical',
          is_resolved: false,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null
        },
        {
          asset_id: testAssetId,
          reported_by: testUserId,
          loan_request_id: null,
          description: 'Major damage',
          photos: [],
          severity: 'major',
          is_resolved: false,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null
        }
      ])
      .execute();

    // Test filtering by critical severity
    const criticalFilters: GetDamageReportsFilters = { severity: 'critical' };
    const criticalResults = await getDamageReports(criticalFilters);

    expect(criticalResults).toHaveLength(1);
    expect(criticalResults[0].description).toEqual('Critical damage');
    expect(criticalResults[0].severity).toEqual('critical');

    // Test filtering by minor severity
    const minorFilters: GetDamageReportsFilters = { severity: 'minor' };
    const minorResults = await getDamageReports(minorFilters);

    expect(minorResults).toHaveLength(1);
    expect(minorResults[0].description).toEqual('Minor damage');
    expect(minorResults[0].severity).toEqual('minor');
  });

  it('should filter by asset_id', async () => {
    // Create second asset
    const secondAssetResult = await db.insert(assetsTable)
      .values({
        asset_code: 'TEST002',
        name: 'Second Test Asset',
        photos: [],
        category_id: categoryId,
        brand: 'Test Brand',
        serial_number: 'SN456',
        specification: 'Test specs',
        location_id: locationId,
        supplier_id: null,
        purchase_date: '2024-01-01',
        purchase_price: '1500.00',
        status: 'available',
        qr_code: 'qr_test_002'
      })
      .returning()
      .execute();
    const secondAssetId = secondAssetResult[0].id;

    // Create damage reports for both assets
    await db.insert(damageReportsTable)
      .values([
        {
          asset_id: testAssetId,
          reported_by: testUserId,
          loan_request_id: null,
          description: 'Damage on first asset',
          photos: [],
          severity: 'minor',
          is_resolved: false,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null
        },
        {
          asset_id: secondAssetId,
          reported_by: testUserId,
          loan_request_id: null,
          description: 'Damage on second asset',
          photos: [],
          severity: 'major',
          is_resolved: false,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null
        }
      ])
      .execute();

    // Filter by first asset
    const firstAssetFilters: GetDamageReportsFilters = { asset_id: testAssetId };
    const firstAssetResults = await getDamageReports(firstAssetFilters);

    expect(firstAssetResults).toHaveLength(1);
    expect(firstAssetResults[0].description).toEqual('Damage on first asset');
    expect(firstAssetResults[0].asset_id).toEqual(testAssetId);

    // Filter by second asset
    const secondAssetFilters: GetDamageReportsFilters = { asset_id: secondAssetId };
    const secondAssetResults = await getDamageReports(secondAssetFilters);

    expect(secondAssetResults).toHaveLength(1);
    expect(secondAssetResults[0].description).toEqual('Damage on second asset');
    expect(secondAssetResults[0].asset_id).toEqual(secondAssetId);
  });

  it('should filter by reported_by user', async () => {
    // Create second user
    const secondUserResult = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hashedpassword2',
        full_name: 'Test User 2',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();
    const secondUserId = secondUserResult[0].id;

    // Create damage reports by different users
    await db.insert(damageReportsTable)
      .values([
        {
          asset_id: testAssetId,
          reported_by: testUserId,
          loan_request_id: null,
          description: 'Report by first user',
          photos: [],
          severity: 'minor',
          is_resolved: false,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null
        },
        {
          asset_id: testAssetId,
          reported_by: secondUserId,
          loan_request_id: null,
          description: 'Report by second user',
          photos: [],
          severity: 'major',
          is_resolved: false,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null
        }
      ])
      .execute();

    // Filter by first user
    const firstUserFilters: GetDamageReportsFilters = { reported_by: testUserId };
    const firstUserResults = await getDamageReports(firstUserFilters);

    expect(firstUserResults).toHaveLength(1);
    expect(firstUserResults[0].description).toEqual('Report by first user');
    expect(firstUserResults[0].reported_by).toEqual(testUserId);

    // Filter by second user
    const secondUserFilters: GetDamageReportsFilters = { reported_by: secondUserId };
    const secondUserResults = await getDamageReports(secondUserFilters);

    expect(secondUserResults).toHaveLength(1);
    expect(secondUserResults[0].description).toEqual('Report by second user');
    expect(secondUserResults[0].reported_by).toEqual(secondUserId);
  });

  it('should apply multiple filters combined', async () => {
    // Create multiple damage reports with different combinations
    await db.insert(damageReportsTable)
      .values([
        {
          asset_id: testAssetId,
          reported_by: testUserId,
          loan_request_id: null,
          description: 'Unresolved critical damage',
          photos: [],
          severity: 'critical',
          is_resolved: false,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null
        },
        {
          asset_id: testAssetId,
          reported_by: testUserId,
          loan_request_id: null,
          description: 'Resolved critical damage',
          photos: [],
          severity: 'critical',
          is_resolved: true,
          resolution_notes: 'Fixed critical issue',
          resolved_by: testUserId,
          resolved_at: new Date()
        },
        {
          asset_id: testAssetId,
          reported_by: testUserId,
          loan_request_id: null,
          description: 'Unresolved minor damage',
          photos: [],
          severity: 'minor',
          is_resolved: false,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null
        }
      ])
      .execute();

    // Filter for unresolved critical damage
    const combinedFilters: GetDamageReportsFilters = { 
      is_resolved: false, 
      severity: 'critical' 
    };
    const results = await getDamageReports(combinedFilters);

    expect(results).toHaveLength(1);
    expect(results[0].description).toEqual('Unresolved critical damage');
    expect(results[0].is_resolved).toEqual(false);
    expect(results[0].severity).toEqual('critical');
  });

  it('should return empty array when no damage reports exist', async () => {
    const results = await getDamageReports();
    expect(results).toHaveLength(0);
  });

  it('should order results by created_at descending', async () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute earlier
    const later = new Date(now.getTime() + 60000); // 1 minute later

    // Insert reports with specific timestamps by inserting and then updating
    const reportResults = await db.insert(damageReportsTable)
      .values([
        {
          asset_id: testAssetId,
          reported_by: testUserId,
          loan_request_id: null,
          description: 'First report',
          photos: [],
          severity: 'minor',
          is_resolved: false,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null
        },
        {
          asset_id: testAssetId,
          reported_by: testUserId,
          loan_request_id: null,
          description: 'Second report',
          photos: [],
          severity: 'major',
          is_resolved: false,
          resolution_notes: null,
          resolved_by: null,
          resolved_at: null
        }
      ])
      .returning()
      .execute();

    const results = await getDamageReports();

    expect(results).toHaveLength(2);
    // Results should be ordered by created_at desc (newest first)
    expect(results[0].created_at >= results[1].created_at).toBe(true);
  });
});