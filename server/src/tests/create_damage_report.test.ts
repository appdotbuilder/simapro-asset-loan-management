import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { damageReportsTable, assetsTable, usersTable, categoriesTable, locationsTable, loanRequestsTable } from '../db/schema';
import { type CreateDamageReportInput } from '../schema';
import { createDamageReport } from '../handlers/create_damage_report';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  username: 'test_user',
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User',
  role: 'user' as const,
  is_active: true
};

const testCategory = {
  name: 'Electronics',
  description: 'Electronic devices'
};

const testLocation = {
  name: 'Office',
  description: 'Main office location'
};

const testAsset = {
  asset_code: 'AST001',
  name: 'Test Laptop',
  photos: ['photo1.jpg'],
  brand: 'Dell',
  serial_number: 'DL123456',
  specification: 'Intel i5, 8GB RAM',
  purchase_price: '1500.00',
  status: 'available' as const,
  qr_code: 'QR123456'
};

const testLoanRequest = {
  purpose: 'Work project',
  borrow_date: new Date('2024-01-15'),
  return_date: new Date('2024-01-20'),
  status: 'approved' as const,
  handover_date: new Date('2024-01-15')
};

describe('createDamageReport', () => {
  let userId: number;
  let assetId: number;
  let categoryId: number;
  let locationId: number;
  let loanRequestId: number;

  beforeEach(async () => {
    await createDB();

    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    const locationResult = await db.insert(locationsTable)
      .values(testLocation)
      .returning()
      .execute();
    locationId = locationResult[0].id;

    const assetResult = await db.insert(assetsTable)
      .values({
        ...testAsset,
        category_id: categoryId,
        location_id: locationId
      })
      .returning()
      .execute();
    assetId = assetResult[0].id;

    const loanResult = await db.insert(loanRequestsTable)
      .values({
        ...testLoanRequest,
        user_id: userId,
        asset_id: assetId
      })
      .returning()
      .execute();
    loanRequestId = loanResult[0].id;
  });

  afterEach(resetDB);

  it('should create a damage report for minor damage', async () => {
    const testInput: CreateDamageReportInput = {
      asset_id: assetId,
      loan_request_id: loanRequestId,
      description: 'Screen has minor scratches',
      photos: ['damage1.jpg', 'damage2.jpg'],
      severity: 'minor'
    };

    const result = await createDamageReport(testInput, userId);

    // Basic field validation
    expect(result.asset_id).toEqual(assetId);
    expect(result.reported_by).toEqual(userId);
    expect(result.loan_request_id).toEqual(loanRequestId);
    expect(result.description).toEqual(testInput.description);
    expect(result.photos).toEqual(testInput.photos);
    expect(result.severity).toEqual('minor');
    expect(result.is_resolved).toEqual(false);
    expect(result.resolution_notes).toBeNull();
    expect(result.resolved_by).toBeNull();
    expect(result.resolved_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update asset status to under_repair for minor damage', async () => {
    const testInput: CreateDamageReportInput = {
      asset_id: assetId,
      loan_request_id: null,
      description: 'Minor keyboard issue',
      photos: [],
      severity: 'minor'
    };

    await createDamageReport(testInput, userId);

    // Check asset status was updated
    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, assetId))
      .execute();

    expect(assets).toHaveLength(1);
    expect(assets[0].status).toEqual('under_repair');
  });

  it('should update asset status to damaged for major damage', async () => {
    const testInput: CreateDamageReportInput = {
      asset_id: assetId,
      loan_request_id: loanRequestId,
      description: 'Screen is cracked severely',
      photos: ['major_damage.jpg'],
      severity: 'major'
    };

    await createDamageReport(testInput, userId);

    // Check asset status was updated
    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, assetId))
      .execute();

    expect(assets).toHaveLength(1);
    expect(assets[0].status).toEqual('damaged');
  });

  it('should update asset status to damaged for critical damage', async () => {
    const testInput: CreateDamageReportInput = {
      asset_id: assetId,
      loan_request_id: loanRequestId,
      description: 'Device completely non-functional',
      photos: ['critical_damage.jpg'],
      severity: 'critical'
    };

    await createDamageReport(testInput, userId);

    // Check asset status was updated
    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, assetId))
      .execute();

    expect(assets).toHaveLength(1);
    expect(assets[0].status).toEqual('damaged');
  });

  it('should save damage report to database', async () => {
    const testInput: CreateDamageReportInput = {
      asset_id: assetId,
      loan_request_id: null,
      description: 'Battery not charging properly',
      photos: ['battery_issue.jpg'],
      severity: 'major'
    };

    const result = await createDamageReport(testInput, userId);

    // Query database to verify record was saved
    const reports = await db.select()
      .from(damageReportsTable)
      .where(eq(damageReportsTable.id, result.id))
      .execute();

    expect(reports).toHaveLength(1);
    expect(reports[0].asset_id).toEqual(assetId);
    expect(reports[0].reported_by).toEqual(userId);
    expect(reports[0].loan_request_id).toBeNull();
    expect(reports[0].description).toEqual(testInput.description);
    expect(reports[0].photos).toEqual(testInput.photos);
    expect(reports[0].severity).toEqual('major');
    expect(reports[0].is_resolved).toEqual(false);
    expect(reports[0].created_at).toBeInstanceOf(Date);
  });

  it('should create report without loan_request_id', async () => {
    const testInput: CreateDamageReportInput = {
      asset_id: assetId,
      loan_request_id: null,
      description: 'Found during routine inspection',
      photos: [],
      severity: 'minor'
    };

    const result = await createDamageReport(testInput, userId);

    expect(result.loan_request_id).toBeNull();
    expect(result.asset_id).toEqual(assetId);
    expect(result.reported_by).toEqual(userId);
  });

  it('should create report with empty photos array', async () => {
    const testInput: CreateDamageReportInput = {
      asset_id: assetId,
      loan_request_id: loanRequestId,
      description: 'Damage without photo documentation',
      photos: [],
      severity: 'minor'
    };

    const result = await createDamageReport(testInput, userId);

    expect(result.photos).toEqual([]);
    expect(result.description).toEqual(testInput.description);
  });

  it('should throw error for non-existent asset', async () => {
    const testInput: CreateDamageReportInput = {
      asset_id: 99999,
      loan_request_id: loanRequestId,
      description: 'Report for non-existent asset',
      photos: [],
      severity: 'minor'
    };

    await expect(createDamageReport(testInput, userId)).rejects.toThrow(/Asset not found/i);
  });

  it('should handle multiple photos correctly', async () => {
    const testInput: CreateDamageReportInput = {
      asset_id: assetId,
      loan_request_id: loanRequestId,
      description: 'Damage with multiple photo angles',
      photos: ['angle1.jpg', 'angle2.jpg', 'close_up.jpg', 'overview.jpg'],
      severity: 'major'
    };

    const result = await createDamageReport(testInput, userId);

    expect(result.photos).toHaveLength(4);
    expect(result.photos).toEqual(testInput.photos);
  });
});