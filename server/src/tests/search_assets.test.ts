import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, categoriesTable, locationsTable, suppliersTable } from '../db/schema';
import { type AssetSearchInput } from '../schema';
import { searchAssets } from '../handlers/search_assets';

// Test data
const testCategory = {
  name: 'Electronics',
  description: 'Electronic devices and equipment'
};

const testLocation = {
  name: 'Room A-101',
  description: 'Main office room'
};

const testSupplier = {
  name: 'Tech Supplies Inc',
  contact_person: 'John Doe',
  phone: '123-456-7890',
  email: 'john@techsupplies.com',
  address: '123 Tech Street'
};

const createTestAsset = (overrides: any = {}) => ({
  asset_code: 'ASSET-001',
  name: 'Dell Laptop',
  photos: ['photo1.jpg', 'photo2.jpg'],
  category_id: 1,
  brand: 'Dell',
  serial_number: 'DL123456',
  specification: 'Intel i5, 8GB RAM, 256GB SSD',
  location_id: 1,
  supplier_id: 1,
  purchase_date: new Date('2024-01-15'),
  purchase_price: 1200.50,
  status: 'available' as const,
  qr_code: 'QR-ASSET-001',
  ...overrides
});

describe('searchAssets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all assets when no filters are applied', async () => {
    // Create prerequisite data
    const [category] = await db.insert(categoriesTable).values(testCategory).returning();
    const [location] = await db.insert(locationsTable).values(testLocation).returning();
    const [supplier] = await db.insert(suppliersTable).values(testSupplier).returning();

    // Create test assets
    const asset1 = createTestAsset({
      asset_code: 'ASSET-001',
      name: 'Dell Laptop',
      category_id: category.id,
      location_id: location.id,
      supplier_id: supplier.id
    });
    const asset2 = createTestAsset({
      asset_code: 'ASSET-002',
      name: 'HP Printer',
      brand: 'HP',
      category_id: category.id,
      location_id: location.id,
      supplier_id: supplier.id
    });

    await db.insert(assetsTable).values([asset1, asset2]);

    const input: AssetSearchInput = {
      available_only: false
    };
    const results = await searchAssets(input);

    expect(results).toHaveLength(2);
    expect(results[0].name).toEqual('Dell Laptop');
    expect(results[1].name).toEqual('HP Printer');
    expect(typeof results[0].purchase_price).toBe('number');
    expect(results[0].purchase_price).toEqual(1200.5);
  });

  it('should search assets by name', async () => {
    // Create prerequisite data
    const [category] = await db.insert(categoriesTable).values(testCategory).returning();
    const [location] = await db.insert(locationsTable).values(testLocation).returning();
    const [supplier] = await db.insert(suppliersTable).values(testSupplier).returning();

    // Create test assets
    const asset1 = createTestAsset({
      asset_code: 'ASSET-001',
      name: 'Dell Laptop',
      category_id: category.id,
      location_id: location.id,
      supplier_id: supplier.id
    });
    const asset2 = createTestAsset({
      asset_code: 'ASSET-002',
      name: 'HP Printer',
      brand: 'HP',
      category_id: category.id,
      location_id: location.id,
      supplier_id: supplier.id
    });

    await db.insert(assetsTable).values([asset1, asset2]);

    const input: AssetSearchInput = {
      search: 'laptop',
      available_only: false
    };
    const results = await searchAssets(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Dell Laptop');
  });

  it('should search assets by asset code', async () => {
    // Create prerequisite data
    const [category] = await db.insert(categoriesTable).values(testCategory).returning();
    const [location] = await db.insert(locationsTable).values(testLocation).returning();
    const [supplier] = await db.insert(suppliersTable).values(testSupplier).returning();

    // Create test asset
    const asset = createTestAsset({
      asset_code: 'LAPTOP-001',
      name: 'Dell Laptop',
      category_id: category.id,
      location_id: location.id,
      supplier_id: supplier.id
    });

    await db.insert(assetsTable).values(asset);

    const input: AssetSearchInput = {
      search: 'LAPTOP-001',
      available_only: false
    };
    const results = await searchAssets(input);

    expect(results).toHaveLength(1);
    expect(results[0].asset_code).toEqual('LAPTOP-001');
  });

  it('should search assets by brand', async () => {
    // Create prerequisite data
    const [category] = await db.insert(categoriesTable).values(testCategory).returning();
    const [location] = await db.insert(locationsTable).values(testLocation).returning();
    const [supplier] = await db.insert(suppliersTable).values(testSupplier).returning();

    // Create test assets
    const asset1 = createTestAsset({
      asset_code: 'ASSET-001',
      name: 'Laptop Model X',
      brand: 'Dell',
      category_id: category.id,
      location_id: location.id,
      supplier_id: supplier.id
    });
    const asset2 = createTestAsset({
      asset_code: 'ASSET-002',
      name: 'Printer Model Y',
      brand: 'HP',
      category_id: category.id,
      location_id: location.id,
      supplier_id: supplier.id
    });

    await db.insert(assetsTable).values([asset1, asset2]);

    const input: AssetSearchInput = {
      search: 'dell',
      available_only: false
    };
    const results = await searchAssets(input);

    expect(results).toHaveLength(1);
    expect(results[0].brand).toEqual('Dell');
  });

  it('should search assets by serial number', async () => {
    // Create prerequisite data
    const [category] = await db.insert(categoriesTable).values(testCategory).returning();
    const [location] = await db.insert(locationsTable).values(testLocation).returning();
    const [supplier] = await db.insert(suppliersTable).values(testSupplier).returning();

    // Create test asset
    const asset = createTestAsset({
      asset_code: 'ASSET-001',
      name: 'Dell Laptop',
      serial_number: 'SN123456789',
      category_id: category.id,
      location_id: location.id,
      supplier_id: supplier.id
    });

    await db.insert(assetsTable).values(asset);

    const input: AssetSearchInput = {
      search: 'SN123456789',
      available_only: false
    };
    const results = await searchAssets(input);

    expect(results).toHaveLength(1);
    expect(results[0].serial_number).toEqual('SN123456789');
  });

  it('should filter assets by category', async () => {
    // Create prerequisite data
    const [category1] = await db.insert(categoriesTable).values({ name: 'Electronics', description: 'Electronic devices' }).returning();
    const [category2] = await db.insert(categoriesTable).values({ name: 'Furniture', description: 'Office furniture' }).returning();
    const [location] = await db.insert(locationsTable).values(testLocation).returning();
    const [supplier] = await db.insert(suppliersTable).values(testSupplier).returning();

    // Create test assets
    const asset1 = createTestAsset({
      asset_code: 'ASSET-001',
      name: 'Dell Laptop',
      category_id: category1.id,
      location_id: location.id,
      supplier_id: supplier.id
    });
    const asset2 = createTestAsset({
      asset_code: 'ASSET-002',
      name: 'Office Chair',
      category_id: category2.id,
      location_id: location.id,
      supplier_id: supplier.id
    });

    await db.insert(assetsTable).values([asset1, asset2]);

    const input: AssetSearchInput = {
      category_id: category1.id,
      available_only: false
    };
    const results = await searchAssets(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Dell Laptop');
    expect(results[0].category_id).toEqual(category1.id);
  });

  it('should filter assets by location', async () => {
    // Create prerequisite data
    const [category] = await db.insert(categoriesTable).values(testCategory).returning();
    const [location1] = await db.insert(locationsTable).values({ name: 'Room A-101', description: 'Main office' }).returning();
    const [location2] = await db.insert(locationsTable).values({ name: 'Room B-202', description: 'Meeting room' }).returning();
    const [supplier] = await db.insert(suppliersTable).values(testSupplier).returning();

    // Create test assets
    const asset1 = createTestAsset({
      asset_code: 'ASSET-001',
      name: 'Dell Laptop',
      category_id: category.id,
      location_id: location1.id,
      supplier_id: supplier.id
    });
    const asset2 = createTestAsset({
      asset_code: 'ASSET-002',
      name: 'HP Printer',
      category_id: category.id,
      location_id: location2.id,
      supplier_id: supplier.id
    });

    await db.insert(assetsTable).values([asset1, asset2]);

    const input: AssetSearchInput = {
      location_id: location1.id,
      available_only: false
    };
    const results = await searchAssets(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Dell Laptop');
    expect(results[0].location_id).toEqual(location1.id);
  });

  it('should filter assets by status', async () => {
    // Create prerequisite data
    const [category] = await db.insert(categoriesTable).values(testCategory).returning();
    const [location] = await db.insert(locationsTable).values(testLocation).returning();
    const [supplier] = await db.insert(suppliersTable).values(testSupplier).returning();

    // Create test assets
    const asset1 = createTestAsset({
      asset_code: 'ASSET-001',
      name: 'Dell Laptop',
      status: 'available',
      category_id: category.id,
      location_id: location.id,
      supplier_id: supplier.id
    });
    const asset2 = createTestAsset({
      asset_code: 'ASSET-002',
      name: 'HP Printer',
      status: 'borrowed',
      category_id: category.id,
      location_id: location.id,
      supplier_id: supplier.id
    });

    await db.insert(assetsTable).values([asset1, asset2]);

    const input: AssetSearchInput = {
      status: 'borrowed',
      available_only: false
    };
    const results = await searchAssets(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('HP Printer');
    expect(results[0].status).toEqual('borrowed');
  });

  it('should filter for available assets only', async () => {
    // Create prerequisite data
    const [category] = await db.insert(categoriesTable).values(testCategory).returning();
    const [location] = await db.insert(locationsTable).values(testLocation).returning();
    const [supplier] = await db.insert(suppliersTable).values(testSupplier).returning();

    // Create test assets with different statuses
    const asset1 = createTestAsset({
      asset_code: 'ASSET-001',
      name: 'Dell Laptop',
      status: 'available',
      category_id: category.id,
      location_id: location.id,
      supplier_id: supplier.id
    });
    const asset2 = createTestAsset({
      asset_code: 'ASSET-002',
      name: 'HP Printer',
      status: 'borrowed',
      category_id: category.id,
      location_id: location.id,
      supplier_id: supplier.id
    });
    const asset3 = createTestAsset({
      asset_code: 'ASSET-003',
      name: 'Canon Camera',
      status: 'under_repair',
      category_id: category.id,
      location_id: location.id,
      supplier_id: supplier.id
    });

    await db.insert(assetsTable).values([asset1, asset2, asset3]);

    const input: AssetSearchInput = {
      available_only: true
    };
    const results = await searchAssets(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Dell Laptop');
    expect(results[0].status).toEqual('available');
  });

  it('should combine multiple filters', async () => {
    // Create prerequisite data
    const [category1] = await db.insert(categoriesTable).values({ name: 'Electronics', description: 'Electronic devices' }).returning();
    const [category2] = await db.insert(categoriesTable).values({ name: 'Furniture', description: 'Office furniture' }).returning();
    const [location] = await db.insert(locationsTable).values(testLocation).returning();
    const [supplier] = await db.insert(suppliersTable).values(testSupplier).returning();

    // Create test assets
    const asset1 = createTestAsset({
      asset_code: 'ASSET-001',
      name: 'Dell Laptop',
      brand: 'Dell',
      status: 'available',
      category_id: category1.id,
      location_id: location.id,
      supplier_id: supplier.id
    });
    const asset2 = createTestAsset({
      asset_code: 'ASSET-002',
      name: 'Dell Monitor',
      brand: 'Dell',
      status: 'borrowed',
      category_id: category1.id,
      location_id: location.id,
      supplier_id: supplier.id
    });
    const asset3 = createTestAsset({
      asset_code: 'ASSET-003',
      name: 'Dell Chair',
      brand: 'Dell',
      status: 'available',
      category_id: category2.id,
      location_id: location.id,
      supplier_id: supplier.id
    });

    await db.insert(assetsTable).values([asset1, asset2, asset3]);

    const input: AssetSearchInput = {
      search: 'dell',
      category_id: category1.id,
      status: 'available',
      available_only: false
    };
    const results = await searchAssets(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Dell Laptop');
    expect(results[0].brand).toEqual('Dell');
    expect(results[0].status).toEqual('available');
    expect(results[0].category_id).toEqual(category1.id);
  });

  it('should return empty array when no assets match filters', async () => {
    // Create prerequisite data
    const [category] = await db.insert(categoriesTable).values(testCategory).returning();
    const [location] = await db.insert(locationsTable).values(testLocation).returning();
    const [supplier] = await db.insert(suppliersTable).values(testSupplier).returning();

    // Create test asset
    const asset = createTestAsset({
      asset_code: 'ASSET-001',
      name: 'Dell Laptop',
      category_id: category.id,
      location_id: location.id,
      supplier_id: supplier.id
    });

    await db.insert(assetsTable).values(asset);

    const input: AssetSearchInput = {
      search: 'nonexistent',
      available_only: false
    };
    const results = await searchAssets(input);

    expect(results).toHaveLength(0);
  });

  it('should perform case-insensitive search', async () => {
    // Create prerequisite data
    const [category] = await db.insert(categoriesTable).values(testCategory).returning();
    const [location] = await db.insert(locationsTable).values(testLocation).returning();
    const [supplier] = await db.insert(suppliersTable).values(testSupplier).returning();

    // Create test asset
    const asset = createTestAsset({
      asset_code: 'ASSET-001',
      name: 'Dell Laptop',
      brand: 'Dell',
      category_id: category.id,
      location_id: location.id,
      supplier_id: supplier.id
    });

    await db.insert(assetsTable).values(asset);

    const input: AssetSearchInput = {
      search: 'DELL',
      available_only: false
    };
    const results = await searchAssets(input);

    expect(results).toHaveLength(1);
    expect(results[0].brand).toEqual('Dell');
  });

  it('should handle null purchase price correctly', async () => {
    // Create prerequisite data
    const [category] = await db.insert(categoriesTable).values(testCategory).returning();
    const [location] = await db.insert(locationsTable).values(testLocation).returning();
    const [supplier] = await db.insert(suppliersTable).values(testSupplier).returning();

    // Create test asset with null purchase price
    const asset = createTestAsset({
      asset_code: 'ASSET-001',
      name: 'Dell Laptop',
      purchase_price: null,
      category_id: category.id,
      location_id: location.id,
      supplier_id: supplier.id
    });

    await db.insert(assetsTable).values(asset);

    const input: AssetSearchInput = {
      available_only: false
    };
    const results = await searchAssets(input);

    expect(results).toHaveLength(1);
    expect(results[0].purchase_price).toBeNull();
  });
});