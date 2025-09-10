import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, locationsTable, assetsTable, loanRequestsTable } from '../db/schema';
import { getUserLoanHistory } from '../handlers/get_user_loan_history';

describe('getUserLoanHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testAssetId: number;

  beforeEach(async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();
    testUserId = user[0].id;

    // Create test category
    const category = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic equipment'
      })
      .returning()
      .execute();

    // Create test location
    const location = await db.insert(locationsTable)
      .values({
        name: 'Office A',
        description: 'Main office location'
      })
      .returning()
      .execute();

    // Create test asset
    const asset = await db.insert(assetsTable)
      .values({
        asset_code: 'TEST001',
        name: 'Test Laptop',
        photos: [],
        category_id: category[0].id,
        location_id: location[0].id,
        status: 'available',
        qr_code: 'QR001'
      })
      .returning()
      .execute();
    testAssetId = asset[0].id;
  });

  it('should return empty arrays when user has no loan history', async () => {
    const result = await getUserLoanHistory(testUserId);

    expect(result.current_loans).toEqual([]);
    expect(result.loan_history).toEqual([]);
    expect(result.pending_requests).toEqual([]);
  });

  it('should categorize pending requests correctly', async () => {
    const borrowDate = new Date();
    const returnDate = new Date(borrowDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later

    await db.insert(loanRequestsTable)
      .values({
        user_id: testUserId,
        asset_id: testAssetId,
        purpose: 'Testing purposes',
        borrow_date: borrowDate,
        return_date: returnDate,
        status: 'pending_approval'
      })
      .execute();

    const result = await getUserLoanHistory(testUserId);

    expect(result.pending_requests).toHaveLength(1);
    expect(result.pending_requests[0].status).toBe('pending_approval');
    expect(result.pending_requests[0].purpose).toBe('Testing purposes');
    expect(result.current_loans).toEqual([]);
    expect(result.loan_history).toEqual([]);
  });

  it('should categorize current loans correctly', async () => {
    const borrowDate = new Date();
    const returnDate = new Date(borrowDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const handoverDate = new Date();

    await db.insert(loanRequestsTable)
      .values({
        user_id: testUserId,
        asset_id: testAssetId,
        purpose: 'Current loan',
        borrow_date: borrowDate,
        return_date: returnDate,
        status: 'approved',
        handover_date: handoverDate,
        approved_by: testUserId,
        approved_at: new Date()
      })
      .execute();

    const result = await getUserLoanHistory(testUserId);

    expect(result.current_loans).toHaveLength(1);
    expect(result.current_loans[0].status).toBe('approved');
    expect(result.current_loans[0].handover_date).toEqual(handoverDate);
    expect(result.current_loans[0].actual_return_date).toBeNull();
    expect(result.pending_requests).toEqual([]);
    expect(result.loan_history).toEqual([]);
  });

  it('should categorize completed loans correctly', async () => {
    const borrowDate = new Date();
    const returnDate = new Date(borrowDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const handoverDate = new Date();
    const actualReturnDate = new Date(returnDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before due

    await db.insert(loanRequestsTable)
      .values({
        user_id: testUserId,
        asset_id: testAssetId,
        purpose: 'Completed loan',
        borrow_date: borrowDate,
        return_date: returnDate,
        status: 'completed',
        handover_date: handoverDate,
        actual_return_date: actualReturnDate,
        approved_by: testUserId,
        approved_at: new Date()
      })
      .execute();

    const result = await getUserLoanHistory(testUserId);

    expect(result.loan_history).toHaveLength(1);
    expect(result.loan_history[0].status).toBe('completed');
    expect(result.loan_history[0].actual_return_date).toEqual(actualReturnDate);
    expect(result.current_loans).toEqual([]);
    expect(result.pending_requests).toEqual([]);
  });

  it('should handle loans with actual return date but not completed status', async () => {
    const borrowDate = new Date();
    const returnDate = new Date(borrowDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const handoverDate = new Date();
    const actualReturnDate = new Date();

    await db.insert(loanRequestsTable)
      .values({
        user_id: testUserId,
        asset_id: testAssetId,
        purpose: 'Returned but not marked completed',
        borrow_date: borrowDate,
        return_date: returnDate,
        status: 'approved',
        handover_date: handoverDate,
        actual_return_date: actualReturnDate,
        approved_by: testUserId,
        approved_at: new Date()
      })
      .execute();

    const result = await getUserLoanHistory(testUserId);

    expect(result.loan_history).toHaveLength(1);
    expect(result.loan_history[0].actual_return_date).toEqual(actualReturnDate);
    expect(result.current_loans).toEqual([]);
    expect(result.pending_requests).toEqual([]);
  });

  it('should handle mixed loan statuses correctly', async () => {
    const borrowDate = new Date();
    const returnDate = new Date(borrowDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const handoverDate = new Date();
    const actualReturnDate = new Date();

    // Create multiple loans with different statuses
    await db.insert(loanRequestsTable)
      .values([
        {
          user_id: testUserId,
          asset_id: testAssetId,
          purpose: 'Pending request',
          borrow_date: borrowDate,
          return_date: returnDate,
          status: 'pending_approval'
        },
        {
          user_id: testUserId,
          asset_id: testAssetId,
          purpose: 'Current active loan',
          borrow_date: borrowDate,
          return_date: returnDate,
          status: 'approved',
          handover_date: handoverDate,
          approved_by: testUserId,
          approved_at: new Date()
        },
        {
          user_id: testUserId,
          asset_id: testAssetId,
          purpose: 'Completed loan',
          borrow_date: borrowDate,
          return_date: returnDate,
          status: 'completed',
          handover_date: handoverDate,
          actual_return_date: actualReturnDate,
          approved_by: testUserId,
          approved_at: new Date()
        },
        {
          user_id: testUserId,
          asset_id: testAssetId,
          purpose: 'Rejected request',
          borrow_date: borrowDate,
          return_date: returnDate,
          status: 'rejected',
          approved_by: testUserId,
          approved_at: new Date()
        }
      ])
      .execute();

    const result = await getUserLoanHistory(testUserId);

    expect(result.pending_requests).toHaveLength(1);
    expect(result.pending_requests[0].purpose).toBe('Pending request');
    
    expect(result.current_loans).toHaveLength(1);
    expect(result.current_loans[0].purpose).toBe('Current active loan');
    
    expect(result.loan_history).toHaveLength(1);
    expect(result.loan_history[0].purpose).toBe('Completed loan');
  });

  it('should handle rejected requests as neither current nor history', async () => {
    const borrowDate = new Date();
    const returnDate = new Date(borrowDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(loanRequestsTable)
      .values({
        user_id: testUserId,
        asset_id: testAssetId,
        purpose: 'Rejected request',
        borrow_date: borrowDate,
        return_date: returnDate,
        status: 'rejected',
        approved_by: testUserId,
        approved_at: new Date()
      })
      .execute();

    const result = await getUserLoanHistory(testUserId);

    expect(result.pending_requests).toEqual([]);
    expect(result.current_loans).toEqual([]);
    expect(result.loan_history).toEqual([]);
  });

  it('should only return loans for the specified user', async () => {
    // Create another user
    const otherUser = await db.insert(usersTable)
      .values({
        username: 'otheruser',
        email: 'other@example.com',
        password_hash: 'hashed_password',
        full_name: 'Other User',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();

    const borrowDate = new Date();
    const returnDate = new Date(borrowDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Create loans for both users
    await db.insert(loanRequestsTable)
      .values([
        {
          user_id: testUserId,
          asset_id: testAssetId,
          purpose: 'My loan',
          borrow_date: borrowDate,
          return_date: returnDate,
          status: 'pending_approval'
        },
        {
          user_id: otherUser[0].id,
          asset_id: testAssetId,
          purpose: 'Other user loan',
          borrow_date: borrowDate,
          return_date: returnDate,
          status: 'pending_approval'
        }
      ])
      .execute();

    const result = await getUserLoanHistory(testUserId);

    expect(result.pending_requests).toHaveLength(1);
    expect(result.pending_requests[0].purpose).toBe('My loan');
    expect(result.pending_requests[0].user_id).toBe(testUserId);
  });
});