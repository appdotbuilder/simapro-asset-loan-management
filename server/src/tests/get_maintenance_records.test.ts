import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  categoriesTable, 
  locationsTable, 
  assetsTable, 
  maintenanceRecordsTable 
} from '../db/schema';
import { getMaintenanceRecords } from '../handlers/get_maintenance_records';

describe('getMaintenanceRecords', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no maintenance records exist', async () => {
    const result = await getMaintenanceRecords();
    expect(result).toEqual([]);
  });

  it('should fetch all maintenance records', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic equipment'
      })
      .returning()
      .execute();

    const [location] = await db.insert(locationsTable)
      .values({
        name: 'Office A',
        description: 'Main office'
      })
      .returning()
      .execute();

    const [asset] = await db.insert(assetsTable)
      .values({
        asset_code: 'AST001',
        name: 'Laptop',
        category_id: category.id,
        location_id: location.id,
        qr_code: 'QR001',
        status: 'available'
      })
      .returning()
      .execute();

    // Create test maintenance records
    const testRecord1 = {
      asset_id: asset.id,
      maintenance_type: 'preventive' as const,
      description: 'Regular cleaning and checkup',
      scheduled_date: new Date('2024-01-15'),
      status: 'completed' as const,
      cost: '50.00',
      performed_by: 'Tech Team',
      notes: 'All components working fine',
      created_by: user.id
    };

    const testRecord2 = {
      asset_id: asset.id,
      maintenance_type: 'corrective' as const,
      description: 'Fix keyboard issue',
      scheduled_date: new Date('2024-01-20'),
      completed_date: new Date('2024-01-21'),
      status: 'completed' as const,
      cost: '25.75',
      performed_by: 'Repair Service',
      created_by: user.id
    };

    await db.insert(maintenanceRecordsTable)
      .values([testRecord1, testRecord2])
      .execute();

    const result = await getMaintenanceRecords();

    expect(result).toHaveLength(2);
    
    // Verify first record
    const record1 = result.find(r => r.description === 'Regular cleaning and checkup');
    expect(record1).toBeDefined();
    expect(record1!.asset_id).toEqual(asset.id);
    expect(record1!.maintenance_type).toEqual('preventive');
    expect(record1!.scheduled_date).toBeInstanceOf(Date);
    expect(record1!.status).toEqual('completed');
    expect(typeof record1!.cost).toEqual('number');
    expect(record1!.cost).toEqual(50.00);
    expect(record1!.performed_by).toEqual('Tech Team');
    expect(record1!.notes).toEqual('All components working fine');
    expect(record1!.created_by).toEqual(user.id);
    expect(record1!.created_at).toBeInstanceOf(Date);
    expect(record1!.updated_at).toBeInstanceOf(Date);

    // Verify second record
    const record2 = result.find(r => r.description === 'Fix keyboard issue');
    expect(record2).toBeDefined();
    expect(record2!.maintenance_type).toEqual('corrective');
    expect(record2!.completed_date).toBeInstanceOf(Date);
    expect(typeof record2!.cost).toEqual('number');
    expect(record2!.cost).toEqual(25.75);
    expect(record2!.performed_by).toEqual('Repair Service');
    expect(record2!.notes).toBeNull();
  });

  it('should handle maintenance records without cost', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'petugas_sarpras'
      })
      .returning()
      .execute();

    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'Furniture',
        description: 'Office furniture'
      })
      .returning()
      .execute();

    const [location] = await db.insert(locationsTable)
      .values({
        name: 'Storage Room',
        description: 'Equipment storage'
      })
      .returning()
      .execute();

    const [asset] = await db.insert(assetsTable)
      .values({
        asset_code: 'AST002',
        name: 'Office Chair',
        category_id: category.id,
        location_id: location.id,
        qr_code: 'QR002',
        status: 'under_repair'
      })
      .returning()
      .execute();

    const testRecord = {
      asset_id: asset.id,
      maintenance_type: 'emergency' as const,
      description: 'Chair leg repair',
      scheduled_date: new Date('2024-01-10'),
      status: 'scheduled' as const,
      cost: null,
      performed_by: null,
      notes: null,
      created_by: user.id
    };

    await db.insert(maintenanceRecordsTable)
      .values(testRecord)
      .execute();

    const result = await getMaintenanceRecords();

    expect(result).toHaveLength(1);
    expect(result[0].cost).toBeNull();
    expect(result[0].performed_by).toBeNull();
    expect(result[0].notes).toBeNull();
    expect(result[0].maintenance_type).toEqual('emergency');
    expect(result[0].status).toEqual('scheduled');
    expect(result[0].description).toEqual('Chair leg repair');
  });

  it('should handle multiple maintenance types and statuses', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'maintainer',
        email: 'maintain@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Maintenance User',
        role: 'petugas_sarpras'
      })
      .returning()
      .execute();

    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'Equipment',
        description: 'Various equipment'
      })
      .returning()
      .execute();

    const [location] = await db.insert(locationsTable)
      .values({
        name: 'Workshop',
        description: 'Repair workshop'
      })
      .returning()
      .execute();

    const [asset] = await db.insert(assetsTable)
      .values({
        asset_code: 'AST003',
        name: 'Printer',
        category_id: category.id,
        location_id: location.id,
        qr_code: 'QR003',
        status: 'available'
      })
      .returning()
      .execute();

    const records = [
      {
        asset_id: asset.id,
        maintenance_type: 'preventive' as const,
        description: 'Monthly maintenance',
        scheduled_date: new Date('2024-01-01'),
        status: 'scheduled' as const,
        created_by: user.id
      },
      {
        asset_id: asset.id,
        maintenance_type: 'corrective' as const,
        description: 'Paper jam fix',
        scheduled_date: new Date('2024-01-05'),
        status: 'in_progress' as const,
        cost: '15.50',
        created_by: user.id
      },
      {
        asset_id: asset.id,
        maintenance_type: 'emergency' as const,
        description: 'Power supply replacement',
        scheduled_date: new Date('2024-01-08'),
        completed_date: new Date('2024-01-09'),
        status: 'completed' as const,
        cost: '120.00',
        performed_by: 'External Service',
        created_by: user.id
      }
    ];

    await db.insert(maintenanceRecordsTable)
      .values(records)
      .execute();

    const result = await getMaintenanceRecords();

    expect(result).toHaveLength(3);

    // Verify different maintenance types are present
    const maintenanceTypes = result.map(r => r.maintenance_type);
    expect(maintenanceTypes).toContain('preventive');
    expect(maintenanceTypes).toContain('corrective');
    expect(maintenanceTypes).toContain('emergency');

    // Verify different statuses are present
    const statuses = result.map(r => r.status);
    expect(statuses).toContain('scheduled');
    expect(statuses).toContain('in_progress');
    expect(statuses).toContain('completed');

    // Verify cost conversion for records with cost
    const recordsWithCost = result.filter(r => r.cost !== null);
    recordsWithCost.forEach(record => {
      expect(typeof record.cost).toEqual('number');
    });
  });

  it('should convert numeric cost field correctly from database', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();

    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test'
      })
      .returning()
      .execute();

    const [location] = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: 'Test'
      })
      .returning()
      .execute();

    const [asset] = await db.insert(assetsTable)
      .values({
        asset_code: 'TEST001',
        name: 'Test Asset',
        category_id: category.id,
        location_id: location.id,
        qr_code: 'QR_TEST001',
        status: 'available'
      })
      .returning()
      .execute();

    // Insert record with cost that needs numeric conversion
    await db.insert(maintenanceRecordsTable)
      .values({
        asset_id: asset.id,
        maintenance_type: 'corrective',
        description: 'Cost conversion test',
        scheduled_date: new Date(),
        status: 'completed',
        cost: '999.99', // Insert as string (this is how numeric fields are handled in Drizzle)
        created_by: user.id
      })
      .execute();

    const result = await getMaintenanceRecords();

    expect(result).toHaveLength(1);
    expect(typeof result[0].cost).toEqual('number');
    expect(result[0].cost).toEqual(999.99);
  });
});