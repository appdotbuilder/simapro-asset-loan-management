import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, categoriesTable, locationsTable, suppliersTable } from '../db/schema';
import { getAssetByQrCode } from '../handlers/get_asset_by_qr_code';
import { type CreateCategoryInput, type CreateLocationInput, type CreateSupplierInput } from '../schema';

describe('getAssetByQrCode', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should find asset by QR code', async () => {
    // Create prerequisite data
    const category = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test description'
      })
      .returning()
      .execute();

    const location = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: 'Test location description'
      })
      .returning()
      .execute();

    const supplier = await db.insert(suppliersTable)
      .values({
        name: 'Test Supplier',
        contact_person: 'John Doe',
        phone: '123-456-7890',
        email: 'supplier@test.com',
        address: 'Test Address'
      })
      .returning()
      .execute();

    // Create test asset
    const testAsset = await db.insert(assetsTable)
      .values({
        asset_code: 'AST001',
        name: 'Test Asset',
        photos: ['photo1.jpg', 'photo2.jpg'],
        category_id: category[0].id,
        brand: 'Test Brand',
        serial_number: 'SN12345',
        specification: 'Test specifications',
        location_id: location[0].id,
        supplier_id: supplier[0].id,
        purchase_date: '2024-01-15',
        purchase_price: '1500.50',
        status: 'available',
        qr_code: 'QR123456789'
      })
      .returning()
      .execute();

    const result = await getAssetByQrCode('QR123456789');

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testAsset[0].id);
    expect(result!.asset_code).toEqual('AST001');
    expect(result!.name).toEqual('Test Asset');
    expect(result!.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
    expect(result!.category_id).toEqual(category[0].id);
    expect(result!.brand).toEqual('Test Brand');
    expect(result!.serial_number).toEqual('SN12345');
    expect(result!.specification).toEqual('Test specifications');
    expect(result!.location_id).toEqual(location[0].id);
    expect(result!.supplier_id).toEqual(supplier[0].id);
    expect(result!.purchase_date).toBeInstanceOf(Date);
    expect(result!.purchase_price).toEqual(1500.50);
    expect(typeof result!.purchase_price).toBe('number');
    expect(result!.status).toEqual('available');
    expect(result!.qr_code).toEqual('QR123456789');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent QR code', async () => {
    const result = await getAssetByQrCode('NONEXISTENT_QR');
    
    expect(result).toBeNull();
  });

  it('should handle asset with null purchase_price', async () => {
    // Create prerequisite data
    const category = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test description'
      })
      .returning()
      .execute();

    const location = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: 'Test location description'
      })
      .returning()
      .execute();

    // Create test asset without purchase price
    const testAsset = await db.insert(assetsTable)
      .values({
        asset_code: 'AST002',
        name: 'Asset Without Price',
        photos: [],
        category_id: category[0].id,
        brand: null,
        serial_number: null,
        specification: null,
        location_id: location[0].id,
        supplier_id: null,
        purchase_date: null,
        purchase_price: null,
        status: 'available',
        qr_code: 'QR987654321'
      })
      .returning()
      .execute();

    const result = await getAssetByQrCode('QR987654321');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testAsset[0].id);
    expect(result!.asset_code).toEqual('AST002');
    expect(result!.name).toEqual('Asset Without Price');
    expect(result!.photos).toEqual([]);
    expect(result!.brand).toBeNull();
    expect(result!.serial_number).toBeNull();
    expect(result!.specification).toBeNull();
    expect(result!.supplier_id).toBeNull();
    expect(result!.purchase_date).toBeNull();
    expect(result!.purchase_price).toBeNull();
    expect(result!.status).toEqual('available');
    expect(result!.qr_code).toEqual('QR987654321');
  });

  it('should handle different asset statuses', async () => {
    // Create prerequisite data
    const category = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test description'
      })
      .returning()
      .execute();

    const location = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: 'Test location description'
      })
      .returning()
      .execute();

    // Create asset with borrowed status
    const testAsset = await db.insert(assetsTable)
      .values({
        asset_code: 'AST003',
        name: 'Borrowed Asset',
        photos: [],
        category_id: category[0].id,
        brand: 'Test Brand',
        serial_number: 'SN67890',
        specification: 'Test spec',
        location_id: location[0].id,
        supplier_id: null,
        purchase_date: '2024-02-01',
        purchase_price: '2000.00',
        status: 'borrowed',
        qr_code: 'QR_BORROWED'
      })
      .returning()
      .execute();

    const result = await getAssetByQrCode('QR_BORROWED');

    expect(result).not.toBeNull();
    expect(result!.status).toEqual('borrowed');
    expect(result!.purchase_price).toEqual(2000.00);
    expect(typeof result!.purchase_price).toBe('number');
  });

  it('should handle empty QR code string', async () => {
    const result = await getAssetByQrCode('');
    
    expect(result).toBeNull();
  });

  it('should handle special characters in QR code', async () => {
    // Create prerequisite data
    const category = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test description'
      })
      .returning()
      .execute();

    const location = await db.insert(locationsTable)
      .values({
        name: 'Test Location',
        description: 'Test location description'
      })
      .returning()
      .execute();

    // Create asset with special characters in QR code
    const specialQrCode = 'QR#@$%^&*()_+-={}[]|;:,.<>?/~`';
    const testAsset = await db.insert(assetsTable)
      .values({
        asset_code: 'AST004',
        name: 'Special QR Asset',
        photos: [],
        category_id: category[0].id,
        brand: 'Test Brand',
        serial_number: 'SN_SPECIAL',
        specification: 'Special QR test',
        location_id: location[0].id,
        supplier_id: null,
        purchase_date: '2024-03-01',
        purchase_price: '500.75',
        status: 'available',
        qr_code: specialQrCode
      })
      .returning()
      .execute();

    const result = await getAssetByQrCode(specialQrCode);

    expect(result).not.toBeNull();
    expect(result!.qr_code).toEqual(specialQrCode);
    expect(result!.purchase_price).toEqual(500.75);
  });
});