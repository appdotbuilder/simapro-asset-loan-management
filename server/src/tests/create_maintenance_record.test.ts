import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { maintenanceRecordsTable, assetsTable, categoriesTable, locationsTable, usersTable } from '../db/schema';
import { type CreateMaintenanceRecordInput } from '../schema';
import { createMaintenanceRecord } from '../handlers/create_maintenance_record';
import { eq } from 'drizzle-orm';

describe('createMaintenanceRecord', () => {
  let testUserId: number;
  let testAssetId: number;
  let testCategoryId: number;
  let testLocationId: number;

  beforeEach(async () => {
    await createDB();

    // Create prerequisite test data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin',
        is_active: true
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: 'Location for testing'
      })
      .returning()
      .execute();
    testLocationId = locationResult[0].id;

    const assetResult = await db.insert(assetsTable)
      .values({
        asset_code: 'TEST001',
        name: 'Test Asset',
        photos: [],
        category_id: testCategoryId,
        location_id: testLocationId,
        status: 'available',
        qr_code: 'test-qr-code'
      })
      .returning()
      .execute();
    testAssetId = assetResult[0].id;
  });

  afterEach(resetDB);

  it('should create a maintenance record with all fields', async () => {
    const testInput: CreateMaintenanceRecordInput = {
      asset_id: testAssetId,
      maintenance_type: 'preventive',
      description: 'Regular maintenance check',
      scheduled_date: new Date('2024-02-01'),
      cost: 150.50,
      performed_by: 'John Technician',
      notes: 'Scheduled during off-hours'
    };

    const result = await createMaintenanceRecord(testInput, testUserId);

    // Verify basic field mapping
    expect(result.asset_id).toEqual(testAssetId);
    expect(result.maintenance_type).toEqual('preventive');
    expect(result.description).toEqual('Regular maintenance check');
    expect(result.scheduled_date).toEqual(new Date('2024-02-01'));
    expect(result.cost).toEqual(150.50);
    expect(typeof result.cost).toBe('number');
    expect(result.performed_by).toEqual('John Technician');
    expect(result.notes).toEqual('Scheduled during off-hours');
    expect(result.created_by).toEqual(testUserId);
    expect(result.status).toEqual('scheduled');
    expect(result.completed_date).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create maintenance record with nullable fields as null', async () => {
    const testInput: CreateMaintenanceRecordInput = {
      asset_id: testAssetId,
      maintenance_type: 'corrective',
      description: 'Fix broken component',
      scheduled_date: new Date('2024-02-15'),
      cost: null,
      performed_by: null,
      notes: null
    };

    const result = await createMaintenanceRecord(testInput, testUserId);

    expect(result.cost).toBeNull();
    expect(result.performed_by).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.maintenance_type).toEqual('corrective');
    expect(result.description).toEqual('Fix broken component');
  });

  it('should save maintenance record to database', async () => {
    const testInput: CreateMaintenanceRecordInput = {
      asset_id: testAssetId,
      maintenance_type: 'emergency',
      description: 'Urgent repair needed',
      scheduled_date: new Date('2024-01-20'),
      cost: 500.75,
      performed_by: 'Emergency Team',
      notes: 'High priority'
    };

    const result = await createMaintenanceRecord(testInput, testUserId);

    // Query the database directly to verify data was saved
    const records = await db.select()
      .from(maintenanceRecordsTable)
      .where(eq(maintenanceRecordsTable.id, result.id))
      .execute();

    expect(records).toHaveLength(1);
    const savedRecord = records[0];
    expect(savedRecord.asset_id).toEqual(testAssetId);
    expect(savedRecord.maintenance_type).toEqual('emergency');
    expect(savedRecord.description).toEqual('Urgent repair needed');
    expect(savedRecord.scheduled_date).toEqual(new Date('2024-01-20'));
    expect(parseFloat(savedRecord.cost!)).toEqual(500.75);
    expect(savedRecord.performed_by).toEqual('Emergency Team');
    expect(savedRecord.notes).toEqual('High priority');
    expect(savedRecord.created_by).toEqual(testUserId);
    expect(savedRecord.status).toEqual('scheduled');
    expect(savedRecord.created_at).toBeInstanceOf(Date);
    expect(savedRecord.updated_at).toBeInstanceOf(Date);
  });

  it('should update asset status to under_repair when maintenance is scheduled', async () => {
    const testInput: CreateMaintenanceRecordInput = {
      asset_id: testAssetId,
      maintenance_type: 'preventive',
      description: 'Routine maintenance',
      scheduled_date: new Date('2024-03-01'),
      cost: 75.00,
      performed_by: 'Maintenance Team',
      notes: 'Regular schedule'
    };

    // Verify asset is initially available
    const beforeAssets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, testAssetId))
      .execute();
    expect(beforeAssets[0].status).toEqual('available');

    await createMaintenanceRecord(testInput, testUserId);

    // Verify asset status was updated to under_repair
    const afterAssets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, testAssetId))
      .execute();
    expect(afterAssets[0].status).toEqual('under_repair');
    expect(afterAssets[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent asset', async () => {
    const testInput: CreateMaintenanceRecordInput = {
      asset_id: 99999, // Non-existent asset ID
      maintenance_type: 'preventive',
      description: 'Test maintenance',
      scheduled_date: new Date('2024-02-01'),
      cost: 100.00,
      performed_by: 'Technician',
      notes: 'Test notes'
    };

    await expect(createMaintenanceRecord(testInput, testUserId)).rejects.toThrow(/Asset with id 99999 not found/i);
  });

  it('should handle numeric cost conversion correctly', async () => {
    const testInput: CreateMaintenanceRecordInput = {
      asset_id: testAssetId,
      maintenance_type: 'corrective',
      description: 'Cost conversion test',
      scheduled_date: new Date('2024-02-10'),
      cost: 299.99,
      performed_by: 'Test Technician',
      notes: 'Testing numeric conversion'
    };

    const result = await createMaintenanceRecord(testInput, testUserId);

    // Verify cost is returned as number
    expect(typeof result.cost).toBe('number');
    expect(result.cost).toEqual(299.99);

    // Verify cost is stored correctly in database
    const records = await db.select()
      .from(maintenanceRecordsTable)
      .where(eq(maintenanceRecordsTable.id, result.id))
      .execute();

    expect(typeof records[0].cost).toBe('string'); // Database stores as string
    expect(parseFloat(records[0].cost!)).toEqual(299.99);
  });
});