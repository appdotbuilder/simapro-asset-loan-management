import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, locationsTable, assetsTable, loanRequestsTable } from '../db/schema';
import { getLoanRequests } from '../handlers/get_loan_requests';

describe('getLoanRequests', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no loan requests exist', async () => {
    const result = await getLoanRequests();
    
    expect(result).toEqual([]);
  });

  it('should fetch all loan requests', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
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

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic devices'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Office',
        description: 'Main office'
      })
      .returning()
      .execute();

    const assetResult = await db.insert(assetsTable)
      .values({
        asset_code: 'AST001',
        name: 'Test Asset',
        photos: [],
        category_id: categoryResult[0].id,
        brand: 'Test Brand',
        serial_number: 'SN123',
        specification: 'Test specs',
        location_id: locationResult[0].id,
        supplier_id: null,
        purchase_date: '2023-01-01',
        purchase_price: '1000.00',
        status: 'available',
        qr_code: 'QR123'
      })
      .returning()
      .execute();

    // Create test loan requests
    const borrowDate = new Date('2024-01-15');
    const returnDate = new Date('2024-01-20');
    
    await db.insert(loanRequestsTable)
      .values({
        user_id: userResult[0].id,
        asset_id: assetResult[0].id,
        purpose: 'Testing purposes',
        borrow_date: borrowDate,
        return_date: returnDate,
        status: 'pending_approval',
        notes: 'Test notes'
      })
      .execute();

    await db.insert(loanRequestsTable)
      .values({
        user_id: userResult[0].id,
        asset_id: assetResult[0].id,
        purpose: 'Another test',
        borrow_date: new Date('2024-02-01'),
        return_date: new Date('2024-02-05'),
        status: 'approved',
        approved_by: userResult[0].id,
        approved_at: new Date('2024-01-16'),
        notes: null
      })
      .execute();

    const result = await getLoanRequests();

    expect(result).toHaveLength(2);
    
    // Check first loan request
    const firstRequest = result[0];
    expect(firstRequest.user_id).toEqual(userResult[0].id);
    expect(firstRequest.asset_id).toEqual(assetResult[0].id);
    expect(firstRequest.purpose).toEqual('Testing purposes');
    expect(firstRequest.borrow_date).toBeInstanceOf(Date);
    expect(firstRequest.borrow_date.getTime()).toEqual(borrowDate.getTime());
    expect(firstRequest.return_date).toBeInstanceOf(Date);
    expect(firstRequest.return_date.getTime()).toEqual(returnDate.getTime());
    expect(firstRequest.status).toEqual('pending_approval');
    expect(firstRequest.approved_by).toBeNull();
    expect(firstRequest.approved_at).toBeNull();
    expect(firstRequest.handover_date).toBeNull();
    expect(firstRequest.actual_return_date).toBeNull();
    expect(firstRequest.notes).toEqual('Test notes');
    expect(firstRequest.created_at).toBeInstanceOf(Date);
    expect(firstRequest.updated_at).toBeInstanceOf(Date);

    // Check second loan request
    const secondRequest = result[1];
    expect(secondRequest.status).toEqual('approved');
    expect(secondRequest.approved_by).toEqual(userResult[0].id);
    expect(secondRequest.approved_at).toBeInstanceOf(Date);
    expect(secondRequest.notes).toBeNull();
  });

  it('should handle loan requests with all status types', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
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

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic devices'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Office',
        description: 'Main office'
      })
      .returning()
      .execute();

    const assetResult = await db.insert(assetsTable)
      .values({
        asset_code: 'AST001',
        name: 'Test Asset',
        photos: [],
        category_id: categoryResult[0].id,
        location_id: locationResult[0].id,
        status: 'available',
        qr_code: 'QR123'
      })
      .returning()
      .execute();

    // Create loan requests with different statuses
    const statuses = ['pending_approval', 'approved', 'rejected', 'completed'] as const;
    
    for (const status of statuses) {
      await db.insert(loanRequestsTable)
        .values({
          user_id: userResult[0].id,
          asset_id: assetResult[0].id,
          purpose: `Request with ${status} status`,
          borrow_date: new Date('2024-01-15'),
          return_date: new Date('2024-01-20'),
          status: status,
          notes: `Notes for ${status}`
        })
        .execute();
    }

    const result = await getLoanRequests();

    expect(result).toHaveLength(4);
    
    // Verify all statuses are present
    const resultStatuses = result.map(r => r.status);
    expect(resultStatuses).toContain('pending_approval');
    expect(resultStatuses).toContain('approved');
    expect(resultStatuses).toContain('rejected');
    expect(resultStatuses).toContain('completed');
  });

  it('should handle loan requests with complete workflow data', async () => {
    // Create users (requester and approver)
    const requesterResult = await db.insert(usersTable)
      .values({
        username: 'requester',
        email: 'requester@example.com',
        password_hash: 'hashed_password',
        full_name: 'Requester User',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();

    const approverResult = await db.insert(usersTable)
      .values({
        username: 'approver',
        email: 'approver@example.com',
        password_hash: 'hashed_password',
        full_name: 'Approver User',
        role: 'petugas_sarpras',
        is_active: true
      })
      .returning()
      .execute();

    // Create prerequisites
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic devices'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Office',
        description: 'Main office'
      })
      .returning()
      .execute();

    const assetResult = await db.insert(assetsTable)
      .values({
        asset_code: 'AST001',
        name: 'Test Asset',
        photos: [],
        category_id: categoryResult[0].id,
        location_id: locationResult[0].id,
        status: 'available',
        qr_code: 'QR123'
      })
      .returning()
      .execute();

    // Create completed loan request with full workflow
    const approvedDate = new Date('2024-01-16T10:00:00Z');
    const handoverDate = new Date('2024-01-17T09:00:00Z');
    const returnDate = new Date('2024-01-22T15:30:00Z');

    await db.insert(loanRequestsTable)
      .values({
        user_id: requesterResult[0].id,
        asset_id: assetResult[0].id,
        purpose: 'Complete workflow test',
        borrow_date: new Date('2024-01-15'),
        return_date: new Date('2024-01-20'),
        status: 'completed',
        approved_by: approverResult[0].id,
        approved_at: approvedDate,
        handover_date: handoverDate,
        actual_return_date: returnDate,
        notes: 'Workflow completed successfully'
      })
      .execute();

    const result = await getLoanRequests();

    expect(result).toHaveLength(1);
    
    const request = result[0];
    expect(request.user_id).toEqual(requesterResult[0].id);
    expect(request.approved_by).toEqual(approverResult[0].id);
    expect(request.status).toEqual('completed');
    
    // Verify date conversions
    expect(request.approved_at).toBeInstanceOf(Date);
    expect(request.approved_at?.getTime()).toEqual(approvedDate.getTime());
    expect(request.handover_date).toBeInstanceOf(Date);
    expect(request.handover_date?.getTime()).toEqual(handoverDate.getTime());
    expect(request.actual_return_date).toBeInstanceOf(Date);
    expect(request.actual_return_date?.getTime()).toEqual(returnDate.getTime());
    
    expect(request.notes).toEqual('Workflow completed successfully');
  });

  it('should maintain data integrity with proper field types', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
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

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic devices'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Office',
        description: 'Main office'
      })
      .returning()
      .execute();

    const assetResult = await db.insert(assetsTable)
      .values({
        asset_code: 'AST001',
        name: 'Test Asset',
        photos: [],
        category_id: categoryResult[0].id,
        location_id: locationResult[0].id,
        status: 'available',
        qr_code: 'QR123'
      })
      .returning()
      .execute();

    await db.insert(loanRequestsTable)
      .values({
        user_id: userResult[0].id,
        asset_id: assetResult[0].id,
        purpose: 'Type validation test',
        borrow_date: new Date('2024-01-15'),
        return_date: new Date('2024-01-20'),
        status: 'pending_approval',
        notes: null
      })
      .execute();

    const result = await getLoanRequests();

    expect(result).toHaveLength(1);
    
    const request = result[0];
    
    // Verify field types
    expect(typeof request.id).toBe('number');
    expect(typeof request.user_id).toBe('number');
    expect(typeof request.asset_id).toBe('number');
    expect(typeof request.purpose).toBe('string');
    expect(request.borrow_date).toBeInstanceOf(Date);
    expect(request.return_date).toBeInstanceOf(Date);
    expect(typeof request.status).toBe('string');
    expect(request.approved_by).toBeNull();
    expect(request.approved_at).toBeNull();
    expect(request.handover_date).toBeNull();
    expect(request.actual_return_date).toBeNull();
    expect(request.notes).toBeNull();
    expect(request.created_at).toBeInstanceOf(Date);
    expect(request.updated_at).toBeInstanceOf(Date);
  });
});