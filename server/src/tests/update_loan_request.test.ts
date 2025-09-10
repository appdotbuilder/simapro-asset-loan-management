import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, locationsTable, assetsTable, loanRequestsTable } from '../db/schema';
import { type UpdateLoanRequestInput } from '../schema';
import { updateLoanRequest } from '../handlers/update_loan_request';
import { eq } from 'drizzle-orm';

describe('updateLoanRequest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testAssetId: number;
  let testLoanRequestId: number;
  let testApproverId: number;

  beforeEach(async () => {
    // Create test user (borrower)
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

    // Create test approver
    const approverResult = await db.insert(usersTable)
      .values({
        username: 'approver',
        email: 'approver@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Approver',
        role: 'petugas_sarpras',
        is_active: true
      })
      .returning()
      .execute();
    testApproverId = approverResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .returning()
      .execute();

    // Create test location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: 'A test location'
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
        purchase_date: '2023-01-01',
        purchase_price: '1000.00',
        status: 'available',
        qr_code: 'QR001'
      })
      .returning()
      .execute();
    testAssetId = assetResult[0].id;

    // Create test loan request
    const loanRequestResult = await db.insert(loanRequestsTable)
      .values({
        user_id: testUserId,
        asset_id: testAssetId,
        purpose: 'Testing purposes',
        borrow_date: new Date('2023-12-01'),
        return_date: new Date('2023-12-15'),
        status: 'pending_approval',
        approved_by: null,
        approved_at: null,
        handover_date: null,
        actual_return_date: null,
        notes: 'Initial notes'
      })
      .returning()
      .execute();
    testLoanRequestId = loanRequestResult[0].id;
  });

  it('should update loan request status to approved', async () => {
    const input: UpdateLoanRequestInput = {
      id: testLoanRequestId,
      status: 'approved'
    };

    const result = await updateLoanRequest(input, testApproverId);

    expect(result.id).toEqual(testLoanRequestId);
    expect(result.status).toEqual('approved');
    expect(result.approved_by).toEqual(testApproverId);
    expect(result.approved_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify asset status changed to borrowed
    const asset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, testAssetId))
      .execute();
    expect(asset[0].status).toEqual('borrowed');
  });

  it('should update loan request status to rejected', async () => {
    const input: UpdateLoanRequestInput = {
      id: testLoanRequestId,
      status: 'rejected'
    };

    const result = await updateLoanRequest(input, testApproverId);

    expect(result.status).toEqual('rejected');
    expect(result.approved_by).toEqual(testApproverId);
    expect(result.approved_at).toBeInstanceOf(Date);

    // Verify asset remains available
    const asset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, testAssetId))
      .execute();
    expect(asset[0].status).toEqual('available');
  });

  it('should handle handover date and update asset status', async () => {
    // First approve the loan
    await updateLoanRequest({
      id: testLoanRequestId,
      status: 'approved'
    }, testApproverId);

    const handoverDate = new Date('2023-12-01T10:00:00Z');
    const input: UpdateLoanRequestInput = {
      id: testLoanRequestId,
      handover_date: handoverDate
    };

    const result = await updateLoanRequest(input);

    expect(result.handover_date).toEqual(handoverDate);

    // Verify asset is borrowed
    const asset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, testAssetId))
      .execute();
    expect(asset[0].status).toEqual('borrowed');
  });

  it('should handle actual return date and complete loan', async () => {
    // Set up an approved loan first
    await updateLoanRequest({
      id: testLoanRequestId,
      status: 'approved'
    }, testApproverId);

    const returnDate = new Date('2023-12-15T14:00:00Z');
    const input: UpdateLoanRequestInput = {
      id: testLoanRequestId,
      actual_return_date: returnDate
    };

    const result = await updateLoanRequest(input);

    expect(result.actual_return_date).toEqual(returnDate);
    expect(result.status).toEqual('completed');

    // Verify asset is available again
    const asset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, testAssetId))
      .execute();
    expect(asset[0].status).toEqual('available');
  });

  it('should update notes', async () => {
    const input: UpdateLoanRequestInput = {
      id: testLoanRequestId,
      notes: 'Updated notes for loan request'
    };

    const result = await updateLoanRequest(input);

    expect(result.notes).toEqual('Updated notes for loan request');
  });

  it('should handle multiple fields update at once', async () => {
    const handoverDate = new Date('2023-12-01T10:00:00Z');
    const input: UpdateLoanRequestInput = {
      id: testLoanRequestId,
      status: 'approved',
      handover_date: handoverDate,
      notes: 'Approved and handed over'
    };

    const result = await updateLoanRequest(input, testApproverId);

    expect(result.status).toEqual('approved');
    expect(result.approved_by).toEqual(testApproverId);
    expect(result.approved_at).toBeInstanceOf(Date);
    expect(result.handover_date).toEqual(handoverDate);
    expect(result.notes).toEqual('Approved and handed over');

    // Verify asset status
    const asset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, testAssetId))
      .execute();
    expect(asset[0].status).toEqual('borrowed');
  });

  it('should complete loan when status is set to completed', async () => {
    const input: UpdateLoanRequestInput = {
      id: testLoanRequestId,
      status: 'completed'
    };

    const result = await updateLoanRequest(input);

    expect(result.status).toEqual('completed');

    // Verify asset is available again
    const asset = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, testAssetId))
      .execute();
    expect(asset[0].status).toEqual('available');
  });

  it('should throw error for non-existent loan request', async () => {
    const input: UpdateLoanRequestInput = {
      id: 99999,
      status: 'approved'
    };

    expect(updateLoanRequest(input, testApproverId)).rejects.toThrow(/not found/i);
  });

  it('should persist in database after update', async () => {
    const input: UpdateLoanRequestInput = {
      id: testLoanRequestId,
      status: 'approved',
      notes: 'Persistence test'
    };

    await updateLoanRequest(input, testApproverId);

    // Verify data persisted in database
    const loanRequests = await db.select()
      .from(loanRequestsTable)
      .where(eq(loanRequestsTable.id, testLoanRequestId))
      .execute();

    expect(loanRequests).toHaveLength(1);
    expect(loanRequests[0].status).toEqual('approved');
    expect(loanRequests[0].approved_by).toEqual(testApproverId);
    expect(loanRequests[0].approved_at).toBeInstanceOf(Date);
    expect(loanRequests[0].notes).toEqual('Persistence test');
    expect(loanRequests[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null values correctly', async () => {
    const input: UpdateLoanRequestInput = {
      id: testLoanRequestId,
      notes: null
    };

    const result = await updateLoanRequest(input);

    expect(result.notes).toBeNull();
  });
});