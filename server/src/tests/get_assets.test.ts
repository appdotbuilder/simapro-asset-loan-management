import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, categoriesTable, locationsTable, suppliersTable } from '../db/schema';
import { getAssets } from '../handlers/get_assets';

describe('getAssets', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no assets exist', async () => {
    const result = await getAssets();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should fetch all assets with proper type conversions', async () => {
    // Create prerequisite data
    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic equipment'
      })
      .returning()
      .execute();

    const [location] = await db.insert(locationsTable)
      .values({
        name: 'Lab A',
        description: 'Computer laboratory'
      })
      .returning()
      .execute();

    const [supplier] = await db.insert(suppliersTable)
      .values({
        name: 'Tech Supplier',
        contact_person: 'John Doe',
        phone: '123456789',
        email: 'supplier@example.com',
        address: '123 Tech Street'
      })
      .returning()
      .execute();

    // Create test asset
    const [createdAsset] = await db.insert(assetsTable)
      .values({
        asset_code: 'AST-001',
        name: 'Laptop Dell',
        photos: ['photo1.jpg', 'photo2.jpg'],
        category_id: category.id,
        brand: 'Dell',
        serial_number: 'DL123456',
        specification: '8GB RAM, 256GB SSD',
        location_id: location.id,
        supplier_id: supplier.id,
        purchase_date: '2023-01-15',
        purchase_price: '15000000.50',
        status: 'available',
        qr_code: 'QR-AST-001'
      })
      .returning()
      .execute();

    const result = await getAssets();

    expect(result).toHaveLength(1);
    
    const asset = result[0];
    expect(asset.id).toBe(createdAsset.id);
    expect(asset.asset_code).toBe('AST-001');
    expect(asset.name).toBe('Laptop Dell');
    expect(asset.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
    expect(asset.category_id).toBe(category.id);
    expect(asset.brand).toBe('Dell');
    expect(asset.serial_number).toBe('DL123456');
    expect(asset.specification).toBe('8GB RAM, 256GB SSD');
    expect(asset.location_id).toBe(location.id);
    expect(asset.supplier_id).toBe(supplier.id);
    expect(asset.purchase_date).toEqual(new Date('2023-01-15'));
    expect(asset.purchase_price).toBe(15000000.50);
    expect(typeof asset.purchase_price).toBe('number');
    expect(asset.status).toBe('available');
    expect(asset.qr_code).toBe('QR-AST-001');
    expect(asset.created_at).toBeInstanceOf(Date);
    expect(asset.updated_at).toBeInstanceOf(Date);
  });

  it('should handle assets with null purchase_price correctly', async () => {
    // Create prerequisite data
    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'Furniture',
        description: 'Office furniture'
      })
      .returning()
      .execute();

    const [location] = await db.insert(locationsTable)
      .values({
        name: 'Office',
        description: 'Main office'
      })
      .returning()
      .execute();

    // Create asset without purchase price
    await db.insert(assetsTable)
      .values({
        asset_code: 'AST-002',
        name: 'Office Chair',
        photos: [],
        category_id: category.id,
        brand: null,
        serial_number: null,
        specification: null,
        location_id: location.id,
        supplier_id: null,
        purchase_date: null,
        purchase_price: null,
        status: 'available',
        qr_code: 'QR-AST-002'
      })
      .returning()
      .execute();

    const result = await getAssets();

    expect(result).toHaveLength(1);
    const asset = result[0];
    expect(asset.purchase_price).toBeNull();
    expect(asset.supplier_id).toBeNull();
    expect(asset.brand).toBeNull();
    expect(asset.photos).toEqual([]);
  });

  it('should fetch multiple assets correctly', async () => {
    // Create prerequisite data
    const [category1] = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic equipment'
      })
      .returning()
      .execute();

    const [category2] = await db.insert(categoriesTable)
      .values({
        name: 'Furniture',
        description: 'Office furniture'
      })
      .returning()
      .execute();

    const [location] = await db.insert(locationsTable)
      .values({
        name: 'Office',
        description: 'Main office'
      })
      .returning()
      .execute();

    // Create multiple assets
    await db.insert(assetsTable)
      .values([
        {
          asset_code: 'AST-001',
          name: 'Laptop',
          photos: [],
          category_id: category1.id,
          brand: 'Dell',
          serial_number: 'DL001',
          specification: null,
          location_id: location.id,
          supplier_id: null,
          purchase_date: null,
          purchase_price: '10000000.00',
          status: 'available',
          qr_code: 'QR-AST-001'
        },
        {
          asset_code: 'AST-002',
          name: 'Desk',
          photos: [],
          category_id: category2.id,
          brand: 'IKEA',
          serial_number: null,
          specification: 'Wooden desk',
          location_id: location.id,
          supplier_id: null,
          purchase_date: null,
          purchase_price: '2500000.75',
          status: 'borrowed',
          qr_code: 'QR-AST-002'
        }
      ])
      .execute();

    const result = await getAssets();

    expect(result).toHaveLength(2);
    
    // Check first asset
    const laptop = result.find(asset => asset.asset_code === 'AST-001');
    expect(laptop).toBeDefined();
    expect(laptop!.name).toBe('Laptop');
    expect(laptop!.category_id).toBe(category1.id);
    expect(laptop!.purchase_price).toBe(10000000.00);
    expect(laptop!.status).toBe('available');
    
    // Check second asset
    const desk = result.find(asset => asset.asset_code === 'AST-002');
    expect(desk).toBeDefined();
    expect(desk!.name).toBe('Desk');
    expect(desk!.category_id).toBe(category2.id);
    expect(desk!.purchase_price).toBe(2500000.75);
    expect(desk!.status).toBe('borrowed');
  });

  it('should handle all asset statuses correctly', async () => {
    // Create prerequisite data
    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'Equipment',
        description: 'Various equipment'
      })
      .returning()
      .execute();

    const [location] = await db.insert(locationsTable)
      .values({
        name: 'Storage',
        description: 'Storage room'
      })
      .returning()
      .execute();

    const statuses = ['available', 'borrowed', 'under_repair', 'damaged', 'deleted'] as const;

    // Create assets with different statuses
    const assetPromises = statuses.map((status, index) => 
      db.insert(assetsTable)
        .values({
          asset_code: `AST-${String(index + 1).padStart(3, '0')}`,
          name: `Asset ${status}`,
          photos: [],
          category_id: category.id,
          brand: null,
          serial_number: null,
          specification: null,
          location_id: location.id,
          supplier_id: null,
          purchase_date: null,
          purchase_price: null,
          status: status,
          qr_code: `QR-AST-${String(index + 1).padStart(3, '0')}`
        })
        .execute()
    );

    await Promise.all(assetPromises);

    const result = await getAssets();

    expect(result).toHaveLength(5);
    
    statuses.forEach(status => {
      const asset = result.find(asset => asset.status === status);
      expect(asset).toBeDefined();
      expect(asset!.name).toBe(`Asset ${status}`);
    });
  });
});