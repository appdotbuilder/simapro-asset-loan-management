import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, categoriesTable, locationsTable, suppliersTable } from '../db/schema';
import { getAssetById } from '../handlers/get_asset_by_id';

describe('getAssetById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return asset by id with all fields', async () => {
    // Create prerequisite data
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic devices'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Office Floor 1',
        description: 'First floor office'
      })
      .returning()
      .execute();

    const supplierResult = await db.insert(suppliersTable)
      .values({
        name: 'TechCorp',
        contact_person: 'John Doe',
        phone: '+1234567890',
        email: 'contact@techcorp.com',
        address: '123 Tech Street'
      })
      .returning()
      .execute();

    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        asset_code: 'LAPTOP001',
        name: 'Dell Laptop',
        photos: ['photo1.jpg', 'photo2.jpg'],
        category_id: categoryResult[0].id,
        brand: 'Dell',
        serial_number: 'DL123456',
        specification: 'Intel i5, 8GB RAM, 256GB SSD',
        location_id: locationResult[0].id,
        supplier_id: supplierResult[0].id,
        purchase_date: '2023-01-15',
        purchase_price: '1299.99',
        status: 'available',
        qr_code: 'QR_LAPTOP001'
      })
      .returning()
      .execute();

    const result = await getAssetById(assetResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(assetResult[0].id);
    expect(result!.asset_code).toBe('LAPTOP001');
    expect(result!.name).toBe('Dell Laptop');
    expect(result!.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
    expect(result!.category_id).toBe(categoryResult[0].id);
    expect(result!.brand).toBe('Dell');
    expect(result!.serial_number).toBe('DL123456');
    expect(result!.specification).toBe('Intel i5, 8GB RAM, 256GB SSD');
    expect(result!.location_id).toBe(locationResult[0].id);
    expect(result!.supplier_id).toBe(supplierResult[0].id);
    expect(result!.purchase_date).toBeInstanceOf(Date);
    expect(result!.purchase_price).toBe(1299.99);
    expect(typeof result!.purchase_price).toBe('number');
    expect(result!.status).toBe('available');
    expect(result!.qr_code).toBe('QR_LAPTOP001');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should handle asset with null purchase_price', async () => {
    // Create prerequisite data
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Furniture',
        description: 'Office furniture'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Storage Room',
        description: 'Storage facility'
      })
      .returning()
      .execute();

    // Create asset without purchase price
    const assetResult = await db.insert(assetsTable)
      .values({
        asset_code: 'CHAIR001',
        name: 'Office Chair',
        photos: [],
        category_id: categoryResult[0].id,
        brand: null,
        serial_number: null,
        specification: null,
        location_id: locationResult[0].id,
        supplier_id: null,
        purchase_date: null,
        purchase_price: null,
        status: 'available',
        qr_code: 'QR_CHAIR001'
      })
      .returning()
      .execute();

    const result = await getAssetById(assetResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.purchase_price).toBeNull();
    expect(result!.brand).toBeNull();
    expect(result!.serial_number).toBeNull();
    expect(result!.specification).toBeNull();
    expect(result!.supplier_id).toBeNull();
    expect(result!.purchase_date).toBeNull();
    expect(result!.photos).toEqual([]);
  });

  it('should return null when asset does not exist', async () => {
    const result = await getAssetById(999);

    expect(result).toBeNull();
  });

  it('should handle asset with different status values', async () => {
    // Create prerequisite data
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Equipment',
        description: 'Office equipment'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Repair Shop',
        description: 'Equipment repair area'
      })
      .returning()
      .execute();

    // Create asset with 'under_repair' status
    const assetResult = await db.insert(assetsTable)
      .values({
        asset_code: 'PRINTER001',
        name: 'HP Printer',
        photos: ['printer.jpg'],
        category_id: categoryResult[0].id,
        brand: 'HP',
        serial_number: 'HP789012',
        specification: 'Color LaserJet Pro',
        location_id: locationResult[0].id,
        supplier_id: null,
        purchase_date: '2022-06-10',
        purchase_price: '599.50',
        status: 'under_repair',
        qr_code: 'QR_PRINTER001'
      })
      .returning()
      .execute();

    const result = await getAssetById(assetResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.status).toBe('under_repair');
    expect(result!.purchase_price).toBe(599.50);
    expect(typeof result!.purchase_price).toBe('number');
  });

  it('should handle zero purchase price correctly', async () => {
    // Create prerequisite data
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Donated Items',
        description: 'Donated equipment'
      })
      .returning()
      .execute();

    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Main Office',
        description: 'Main office location'
      })
      .returning()
      .execute();

    // Create asset with zero purchase price
    const assetResult = await db.insert(assetsTable)
      .values({
        asset_code: 'DONATED001',
        name: 'Donated Monitor',
        photos: [],
        category_id: categoryResult[0].id,
        brand: 'Samsung',
        serial_number: 'SAM123',
        specification: '24 inch LCD',
        location_id: locationResult[0].id,
        supplier_id: null,
        purchase_date: '2023-03-20',
        purchase_price: '0.00',
        status: 'available',
        qr_code: 'QR_DONATED001'
      })
      .returning()
      .execute();

    const result = await getAssetById(assetResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.purchase_price).toBe(0);
    expect(typeof result!.purchase_price).toBe('number');
  });
});