import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, locationsTable, assetsTable, loanRequestsTable } from '../db/schema';
import { type CreateLoanRequestInput } from '../schema';
import { createLoanRequest } from '../handlers/create_loan_request';
import { eq } from 'drizzle-orm';

// Test data setup
const createTestUser = async () => {
  const result = await db.insert(usersTable)
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
  return result[0];
};

const createInactiveUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      username: 'inactiveuser',
      email: 'inactive@example.com',
      password_hash: 'hashedpassword',
      full_name: 'Inactive User',
      role: 'user',
      is_active: false
    })
    .returning()
    .execute();
  return result[0];
};

const createTestCategory = async () => {
  const result = await db.insert(categoriesTable)
    .values({
      name: 'Test Category',
      description: 'A category for testing'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestLocation = async () => {
  const result = await db.insert(locationsTable)
    .values({
      name: 'Test Location',
      description: 'A location for testing'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestAsset = async (categoryId: number, locationId: number, status: 'available' | 'borrowed' | 'under_repair' | 'damaged' | 'deleted' = 'available') => {
  const result = await db.insert(assetsTable)
    .values({
      asset_code: 'TEST001',
      name: 'Test Asset',
      photos: [],
      category_id: categoryId,
      brand: 'Test Brand',
      serial_number: 'SN001',
      specification: 'Test specification',
      location_id: locationId,
      supplier_id: null,
      purchase_date: '2024-01-01',
      purchase_price: '1000.00',
      status: status,
      qr_code: 'QR_TEST001'
    })
    .returning()
    .execute();
  return result[0];
};

describe('createLoanRequest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a loan request successfully', async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    const location = await createTestLocation();
    const asset = await createTestAsset(category.id, location.id);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const input: CreateLoanRequestInput = {
      asset_id: asset.id,
      purpose: 'Testing purposes',
      borrow_date: tomorrow,
      return_date: nextWeek,
      notes: 'Test notes'
    };

    const result = await createLoanRequest(input, user.id);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(user.id);
    expect(result.asset_id).toEqual(asset.id);
    expect(result.purpose).toEqual('Testing purposes');
    expect(result.borrow_date).toEqual(tomorrow);
    expect(result.return_date).toEqual(nextWeek);
    expect(result.status).toEqual('pending_approval');
    expect(result.notes).toEqual('Test notes');
    expect(result.approved_by).toBeNull();
    expect(result.approved_at).toBeNull();
    expect(result.handover_date).toBeNull();
    expect(result.actual_return_date).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save loan request to database', async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    const location = await createTestLocation();
    const asset = await createTestAsset(category.id, location.id);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const input: CreateLoanRequestInput = {
      asset_id: asset.id,
      purpose: 'Database test',
      borrow_date: tomorrow,
      return_date: nextWeek,
      notes: null
    };

    const result = await createLoanRequest(input, user.id);

    const savedRequest = await db.select()
      .from(loanRequestsTable)
      .where(eq(loanRequestsTable.id, result.id))
      .execute();

    expect(savedRequest).toHaveLength(1);
    expect(savedRequest[0].user_id).toEqual(user.id);
    expect(savedRequest[0].asset_id).toEqual(asset.id);
    expect(savedRequest[0].purpose).toEqual('Database test');
    expect(savedRequest[0].status).toEqual('pending_approval');
    expect(savedRequest[0].notes).toBeNull();
  });

  it('should throw error for non-existent user', async () => {
    const category = await createTestCategory();
    const location = await createTestLocation();
    const asset = await createTestAsset(category.id, location.id);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const input: CreateLoanRequestInput = {
      asset_id: asset.id,
      purpose: 'Test purpose',
      borrow_date: tomorrow,
      return_date: nextWeek,
      notes: null
    };

    await expect(createLoanRequest(input, 999)).rejects.toThrow(/user not found/i);
  });

  it('should throw error for inactive user', async () => {
    const inactiveUser = await createInactiveUser();
    const category = await createTestCategory();
    const location = await createTestLocation();
    const asset = await createTestAsset(category.id, location.id);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const input: CreateLoanRequestInput = {
      asset_id: asset.id,
      purpose: 'Test purpose',
      borrow_date: tomorrow,
      return_date: nextWeek,
      notes: null
    };

    await expect(createLoanRequest(input, inactiveUser.id)).rejects.toThrow(/user account is inactive/i);
  });

  it('should throw error for non-existent asset', async () => {
    const user = await createTestUser();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const input: CreateLoanRequestInput = {
      asset_id: 999,
      purpose: 'Test purpose',
      borrow_date: tomorrow,
      return_date: nextWeek,
      notes: null
    };

    await expect(createLoanRequest(input, user.id)).rejects.toThrow(/asset not found/i);
  });

  it('should throw error for unavailable asset', async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    const location = await createTestLocation();
    const asset = await createTestAsset(category.id, location.id, 'borrowed');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const input: CreateLoanRequestInput = {
      asset_id: asset.id,
      purpose: 'Test purpose',
      borrow_date: tomorrow,
      return_date: nextWeek,
      notes: null
    };

    await expect(createLoanRequest(input, user.id)).rejects.toThrow(/asset is not available for borrowing/i);
  });

  it('should throw error for invalid date range', async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    const location = await createTestLocation();
    const asset = await createTestAsset(category.id, location.id);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const today = new Date();

    const input: CreateLoanRequestInput = {
      asset_id: asset.id,
      purpose: 'Test purpose',
      borrow_date: tomorrow,
      return_date: today,
      notes: null
    };

    await expect(createLoanRequest(input, user.id)).rejects.toThrow(/return date must be after borrow date/i);
  });

  it('should throw error for past borrow date', async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    const location = await createTestLocation();
    const asset = await createTestAsset(category.id, location.id);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const input: CreateLoanRequestInput = {
      asset_id: asset.id,
      purpose: 'Test purpose',
      borrow_date: yesterday,
      return_date: nextWeek,
      notes: null
    };

    await expect(createLoanRequest(input, user.id)).rejects.toThrow(/borrow date cannot be in the past/i);
  });

  it('should throw error for conflicting approved loan request', async () => {
    const user1 = await createTestUser();
    const user2Result = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User 2',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();
    const user2 = user2Result[0];
    
    const category = await createTestCategory();
    const location = await createTestLocation();
    const asset = await createTestAsset(category.id, location.id);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Create existing approved loan request
    await db.insert(loanRequestsTable)
      .values({
        user_id: user1.id,
        asset_id: asset.id,
        purpose: 'Existing request',
        borrow_date: tomorrow,
        return_date: nextWeek,
        status: 'approved',
        approved_by: null,
        approved_at: null,
        handover_date: null,
        actual_return_date: null,
        notes: null
      })
      .execute();

    const overlappingInput: CreateLoanRequestInput = {
      asset_id: asset.id,
      purpose: 'Conflicting request',
      borrow_date: tomorrow,
      return_date: nextWeek,
      notes: null
    };

    await expect(createLoanRequest(overlappingInput, user2.id)).rejects.toThrow(/asset is already requested or booked/i);
  });

  it('should throw error for conflicting pending loan request', async () => {
    const user1 = await createTestUser();
    const user2Result = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User 2',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();
    const user2 = user2Result[0];
    
    const category = await createTestCategory();
    const location = await createTestLocation();
    const asset = await createTestAsset(category.id, location.id);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Create existing pending loan request
    await db.insert(loanRequestsTable)
      .values({
        user_id: user1.id,
        asset_id: asset.id,
        purpose: 'Existing request',
        borrow_date: tomorrow,
        return_date: dayAfter,
        status: 'pending_approval',
        approved_by: null,
        approved_at: null,
        handover_date: null,
        actual_return_date: null,
        notes: null
      })
      .execute();

    // Try to create overlapping request
    const overlappingInput: CreateLoanRequestInput = {
      asset_id: asset.id,
      purpose: 'Conflicting request',
      borrow_date: dayAfter,
      return_date: nextWeek,
      notes: null
    };

    await expect(createLoanRequest(overlappingInput, user2.id)).rejects.toThrow(/asset is already requested or booked/i);
  });

  it('should allow non-overlapping loan requests', async () => {
    const user1 = await createTestUser();
    const user2Result = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User 2',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();
    const user2 = user2Result[0];
    
    const category = await createTestCategory();
    const location = await createTestLocation();
    const asset = await createTestAsset(category.id, location.id);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const weekAfter = new Date();
    weekAfter.setDate(weekAfter.getDate() + 8);

    // Create first loan request
    await db.insert(loanRequestsTable)
      .values({
        user_id: user1.id,
        asset_id: asset.id,
        purpose: 'First request',
        borrow_date: tomorrow,
        return_date: dayAfter,
        status: 'approved',
        approved_by: null,
        approved_at: null,
        handover_date: null,
        actual_return_date: null,
        notes: null
      })
      .execute();

    // Create second non-overlapping request
    const nonOverlappingInput: CreateLoanRequestInput = {
      asset_id: asset.id,
      purpose: 'Non-overlapping request',
      borrow_date: nextWeek,
      return_date: weekAfter,
      notes: null
    };

    const result = await createLoanRequest(nonOverlappingInput, user2.id);

    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(user2.id);
    expect(result.asset_id).toEqual(asset.id);
    expect(result.status).toEqual('pending_approval');
  });
});