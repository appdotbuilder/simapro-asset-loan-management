import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { maintenanceRecordsTable, assetsTable, usersTable, categoriesTable, locationsTable } from '../db/schema';
import { type UpdateMaintenanceRecordInput } from '../schema';
import { updateMaintenanceRecord } from '../handlers/update_maintenance_record';
import { eq } from 'drizzle-orm';

describe('updateMaintenanceRecord', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testMaintenanceId: number;
  let testAssetId: number;
  let testUserId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        role: 'admin',
        is_active: true
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    // Create test location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: 'Test location description'
      })
      .returning()
      .execute();

    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        asset_code: 'TEST001',
        name: 'Test Asset',
        photos: [],
        category_id: categoryResult[0].id,
        brand: 'Test Brand',
        serial_number: 'SN001',
        specification: 'Test specs',
        location_id: locationResult[0].id,
        supplier_id: null,
        purchase_date: '2024-01-01',
        purchase_price: '1000.00',
        status: 'under_repair',
        qr_code: 'QR123'
      })
      .returning()
      .execute();
    testAssetId = assetResult[0].id;

    // Create test maintenance record
    const maintenanceResult = await db.insert(maintenanceRecordsTable)
      .values({
        asset_id: testAssetId,
        maintenance_type: 'preventive',
        description: 'Regular maintenance check',
        scheduled_date: new Date(),
        completed_date: null,
        status: 'in_progress',
        cost: '50.00',
        performed_by: 'John Doe',
        notes: 'Initial notes',
        created_by: testUserId
      })
      .returning()
      .execute();
    testMaintenanceId = maintenanceResult[0].id;
  });

  it('should update maintenance record with all fields', async () => {
    const completedDate = new Date();
    const updateInput: UpdateMaintenanceRecordInput = {
      id: testMaintenanceId,
      completed_date: completedDate,
      status: 'completed',
      cost: 75.50,
      performed_by: 'Jane Smith',
      notes: 'Maintenance completed successfully'
    };

    const result = await updateMaintenanceRecord(updateInput);

    expect(result.id).toBe(testMaintenanceId);
    expect(result.completed_date).toEqual(completedDate);
    expect(result.status).toBe('completed');
    expect(result.cost).toBe(75.50);
    expect(result.performed_by).toBe('Jane Smith');
    expect(result.notes).toBe('Maintenance completed successfully');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update maintenance record with partial fields', async () => {
    const updateInput: UpdateMaintenanceRecordInput = {
      id: testMaintenanceId,
      status: 'completed',
      notes: 'Work completed'
    };

    const result = await updateMaintenanceRecord(updateInput);

    expect(result.id).toBe(testMaintenanceId);
    expect(result.status).toBe('completed');
    expect(result.notes).toBe('Work completed');
    expect(result.cost).toBe(50); // Should remain unchanged
    expect(result.performed_by).toBe('John Doe'); // Should remain unchanged
  });

  it('should save updated maintenance record to database', async () => {
    const updateInput: UpdateMaintenanceRecordInput = {
      id: testMaintenanceId,
      status: 'completed',
      cost: 100.25
    };

    await updateMaintenanceRecord(updateInput);

    const records = await db.select()
      .from(maintenanceRecordsTable)
      .where(eq(maintenanceRecordsTable.id, testMaintenanceId))
      .execute();

    expect(records).toHaveLength(1);
    expect(records[0].status).toBe('completed');
    expect(parseFloat(records[0].cost!)).toBe(100.25);
    expect(records[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update asset status to available when maintenance is completed', async () => {
    const updateInput: UpdateMaintenanceRecordInput = {
      id: testMaintenanceId,
      status: 'completed'
    };

    await updateMaintenanceRecord(updateInput);

    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, testAssetId))
      .execute();

    expect(assets).toHaveLength(1);
    expect(assets[0].status).toBe('available');
    expect(assets[0].updated_at).toBeInstanceOf(Date);
  });

  it('should not update asset status when maintenance is not completed', async () => {
    const updateInput: UpdateMaintenanceRecordInput = {
      id: testMaintenanceId,
      status: 'in_progress',
      notes: 'Still working on it'
    };

    await updateMaintenanceRecord(updateInput);

    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, testAssetId))
      .execute();

    expect(assets).toHaveLength(1);
    expect(assets[0].status).toBe('under_repair'); // Should remain unchanged
  });

  it('should handle null values correctly', async () => {
    const updateInput: UpdateMaintenanceRecordInput = {
      id: testMaintenanceId,
      completed_date: null,
      cost: null,
      performed_by: null,
      notes: null
    };

    const result = await updateMaintenanceRecord(updateInput);

    expect(result.completed_date).toBeNull();
    expect(result.cost).toBeNull();
    expect(result.performed_by).toBeNull();
    expect(result.notes).toBeNull();

    // Verify in database
    const records = await db.select()
      .from(maintenanceRecordsTable)
      .where(eq(maintenanceRecordsTable.id, testMaintenanceId))
      .execute();

    expect(records[0].completed_date).toBeNull();
    expect(records[0].cost).toBeNull();
    expect(records[0].performed_by).toBeNull();
    expect(records[0].notes).toBeNull();
  });

  it('should convert numeric cost values correctly', async () => {
    const updateInput: UpdateMaintenanceRecordInput = {
      id: testMaintenanceId,
      cost: 123.45
    };

    const result = await updateMaintenanceRecord(updateInput);

    expect(typeof result.cost).toBe('number');
    expect(result.cost).toBe(123.45);

    // Verify in database
    const records = await db.select()
      .from(maintenanceRecordsTable)
      .where(eq(maintenanceRecordsTable.id, testMaintenanceId))
      .execute();

    expect(parseFloat(records[0].cost!)).toBe(123.45);
  });

  it('should throw error for non-existent maintenance record', async () => {
    const updateInput: UpdateMaintenanceRecordInput = {
      id: 99999,
      status: 'completed'
    };

    await expect(updateMaintenanceRecord(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should preserve unchanged fields', async () => {
    const updateInput: UpdateMaintenanceRecordInput = {
      id: testMaintenanceId,
      status: 'completed'
    };

    const result = await updateMaintenanceRecord(updateInput);

    // Fields that shouldn't change
    expect(result.asset_id).toBe(testAssetId);
    expect(result.maintenance_type).toBe('preventive');
    expect(result.description).toBe('Regular maintenance check');
    expect(result.created_by).toBe(testUserId);
    expect(result.scheduled_date).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });
});