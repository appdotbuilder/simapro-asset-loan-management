import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, locationsTable, assetsTable, loanRequestsTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats when no data exists', async () => {
    const result = await getDashboardStats();

    expect(result.total_assets).toEqual(0);
    expect(result.available_assets).toEqual(0);
    expect(result.borrowed_assets).toEqual(0);
    expect(result.pending_requests).toEqual(0);
    expect(result.assets_under_repair).toEqual(0);
    expect(result.damaged_assets).toEqual(0);
  });

  it('should return correct asset counts by status', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      full_name: 'Test User',
      role: 'user'
    }).returning().execute();

    const categoryResult = await db.insert(categoriesTable).values({
      name: 'Electronics',
      description: 'Electronic devices'
    }).returning().execute();

    const locationResult = await db.insert(locationsTable).values({
      name: 'Office A',
      description: 'Main office'
    }).returning().execute();

    // Create assets with different statuses
    await db.insert(assetsTable).values([
      {
        asset_code: 'AST001',
        name: 'Laptop 1',
        category_id: categoryResult[0].id,
        location_id: locationResult[0].id,
        status: 'available',
        qr_code: 'QR001'
      },
      {
        asset_code: 'AST002',
        name: 'Laptop 2',
        category_id: categoryResult[0].id,
        location_id: locationResult[0].id,
        status: 'available',
        qr_code: 'QR002'
      },
      {
        asset_code: 'AST003',
        name: 'Laptop 3',
        category_id: categoryResult[0].id,
        location_id: locationResult[0].id,
        status: 'borrowed',
        qr_code: 'QR003'
      },
      {
        asset_code: 'AST004',
        name: 'Laptop 4',
        category_id: categoryResult[0].id,
        location_id: locationResult[0].id,
        status: 'under_repair',
        qr_code: 'QR004'
      },
      {
        asset_code: 'AST005',
        name: 'Laptop 5',
        category_id: categoryResult[0].id,
        location_id: locationResult[0].id,
        status: 'damaged',
        qr_code: 'QR005'
      },
      {
        asset_code: 'AST006',
        name: 'Laptop 6',
        category_id: categoryResult[0].id,
        location_id: locationResult[0].id,
        status: 'deleted',
        qr_code: 'QR006'
      }
    ]).execute();

    const result = await getDashboardStats();

    expect(result.total_assets).toEqual(5); // Excluding deleted asset
    expect(result.available_assets).toEqual(2);
    expect(result.borrowed_assets).toEqual(1);
    expect(result.assets_under_repair).toEqual(1);
    expect(result.damaged_assets).toEqual(1);
  });

  it('should return correct pending requests count', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      full_name: 'Test User',
      role: 'user'
    }).returning().execute();

    const categoryResult = await db.insert(categoriesTable).values({
      name: 'Electronics',
      description: 'Electronic devices'
    }).returning().execute();

    const locationResult = await db.insert(locationsTable).values({
      name: 'Office A',
      description: 'Main office'
    }).returning().execute();

    const assetResult = await db.insert(assetsTable).values({
      asset_code: 'AST001',
      name: 'Test Laptop',
      category_id: categoryResult[0].id,
      location_id: locationResult[0].id,
      status: 'available',
      qr_code: 'QR001'
    }).returning().execute();

    // Create loan requests with different statuses
    await db.insert(loanRequestsTable).values([
      {
        user_id: userResult[0].id,
        asset_id: assetResult[0].id,
        purpose: 'Work project',
        borrow_date: new Date('2024-01-15'),
        return_date: new Date('2024-01-20'),
        status: 'pending_approval'
      },
      {
        user_id: userResult[0].id,
        asset_id: assetResult[0].id,
        purpose: 'Research',
        borrow_date: new Date('2024-01-16'),
        return_date: new Date('2024-01-21'),
        status: 'pending_approval'
      },
      {
        user_id: userResult[0].id,
        asset_id: assetResult[0].id,
        purpose: 'Testing',
        borrow_date: new Date('2024-01-17'),
        return_date: new Date('2024-01-22'),
        status: 'approved'
      },
      {
        user_id: userResult[0].id,
        asset_id: assetResult[0].id,
        purpose: 'Development',
        borrow_date: new Date('2024-01-18'),
        return_date: new Date('2024-01-23'),
        status: 'rejected'
      }
    ]).execute();

    const result = await getDashboardStats();

    expect(result.pending_requests).toEqual(2);
  });

  it('should handle mixed asset and loan request data correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      full_name: 'Test User',
      role: 'user'
    }).returning().execute();

    const categoryResult = await db.insert(categoriesTable).values({
      name: 'Electronics',
      description: 'Electronic devices'
    }).returning().execute();

    const locationResult = await db.insert(locationsTable).values({
      name: 'Office A',
      description: 'Main office'
    }).returning().execute();

    // Create multiple assets
    const assetResults = await db.insert(assetsTable).values([
      {
        asset_code: 'AST001',
        name: 'Laptop 1',
        category_id: categoryResult[0].id,
        location_id: locationResult[0].id,
        status: 'available',
        qr_code: 'QR001'
      },
      {
        asset_code: 'AST002',
        name: 'Laptop 2',
        category_id: categoryResult[0].id,
        location_id: locationResult[0].id,
        status: 'borrowed',
        qr_code: 'QR002'
      },
      {
        asset_code: 'AST003',
        name: 'Laptop 3',
        category_id: categoryResult[0].id,
        location_id: locationResult[0].id,
        status: 'under_repair',
        qr_code: 'QR003'
      }
    ]).returning().execute();

    // Create some pending loan requests
    await db.insert(loanRequestsTable).values([
      {
        user_id: userResult[0].id,
        asset_id: assetResults[0].id,
        purpose: 'Work project 1',
        borrow_date: new Date('2024-01-15'),
        return_date: new Date('2024-01-20'),
        status: 'pending_approval'
      },
      {
        user_id: userResult[0].id,
        asset_id: assetResults[1].id,
        purpose: 'Work project 2',
        borrow_date: new Date('2024-01-16'),
        return_date: new Date('2024-01-21'),
        status: 'pending_approval'
      },
      {
        user_id: userResult[0].id,
        asset_id: assetResults[2].id,
        purpose: 'Work project 3',
        borrow_date: new Date('2024-01-17'),
        return_date: new Date('2024-01-22'),
        status: 'approved'
      }
    ]).execute();

    const result = await getDashboardStats();

    expect(result.total_assets).toEqual(3);
    expect(result.available_assets).toEqual(1);
    expect(result.borrowed_assets).toEqual(1);
    expect(result.assets_under_repair).toEqual(1);
    expect(result.damaged_assets).toEqual(0);
    expect(result.pending_requests).toEqual(2);
  });

  it('should exclude deleted assets from total count', async () => {
    // Create prerequisite data
    const categoryResult = await db.insert(categoriesTable).values({
      name: 'Electronics',
      description: 'Electronic devices'
    }).returning().execute();

    const locationResult = await db.insert(locationsTable).values({
      name: 'Office A',
      description: 'Main office'
    }).returning().execute();

    // Create assets including deleted ones
    await db.insert(assetsTable).values([
      {
        asset_code: 'AST001',
        name: 'Active Laptop',
        category_id: categoryResult[0].id,
        location_id: locationResult[0].id,
        status: 'available',
        qr_code: 'QR001'
      },
      {
        asset_code: 'AST002',
        name: 'Deleted Laptop 1',
        category_id: categoryResult[0].id,
        location_id: locationResult[0].id,
        status: 'deleted',
        qr_code: 'QR002'
      },
      {
        asset_code: 'AST003',
        name: 'Deleted Laptop 2',
        category_id: categoryResult[0].id,
        location_id: locationResult[0].id,
        status: 'deleted',
        qr_code: 'QR003'
      }
    ]).execute();

    const result = await getDashboardStats();

    expect(result.total_assets).toEqual(1); // Only non-deleted assets
    expect(result.available_assets).toEqual(1);
    expect(result.borrowed_assets).toEqual(0);
    expect(result.assets_under_repair).toEqual(0);
    expect(result.damaged_assets).toEqual(0);
  });
});