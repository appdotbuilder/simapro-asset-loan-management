import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, categoriesTable, locationsTable, suppliersTable } from '../db/schema';
import { type CreateAssetInput } from '../schema';
import { createAsset } from '../handlers/create_asset';
import { eq } from 'drizzle-orm';

describe('createAsset', () => {
  let categoryId: number;
  let locationId: number;
  let supplierId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite data
    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic equipment'
      })
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    // Create location
    const locationResult = await db.insert(locationsTable)
      .values({
        name: 'Main Office',
        description: 'Main office building'
      })
      .returning()
      .execute();
    locationId = locationResult[0].id;

    // Create supplier
    const supplierResult = await db.insert(suppliersTable)
      .values({
        name: 'Tech Supplier Co.',
        contact_person: 'John Doe',
        phone: '+1234567890',
        email: 'contact@techsupplier.com',
        address: '123 Tech Street'
      })
      .returning()
      .execute();
    supplierId = supplierResult[0].id;
  });

  afterEach(resetDB);

  const baseTestInput: CreateAssetInput = {
    name: 'Test Laptop',
    photos: ['photo1.jpg', 'photo2.jpg'],
    category_id: 0, // Will be set in tests
    brand: 'Dell',
    serial_number: 'DL123456',
    specification: 'Intel i7, 16GB RAM, 512GB SSD',
    location_id: 0, // Will be set in tests
    supplier_id: 0, // Will be set in tests
    purchase_date: new Date('2024-01-15'),
    purchase_price: 1299.99,
    status: 'available'
  };

  it('should create an asset with all fields', async () => {
    const testInput = {
      ...baseTestInput,
      category_id: categoryId,
      location_id: locationId,
      supplier_id: supplierId
    };

    const result = await createAsset(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Laptop');
    expect(result.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
    expect(result.category_id).toEqual(categoryId);
    expect(result.brand).toEqual('Dell');
    expect(result.serial_number).toEqual('DL123456');
    expect(result.specification).toEqual('Intel i7, 16GB RAM, 512GB SSD');
    expect(result.location_id).toEqual(locationId);
    expect(result.supplier_id).toEqual(supplierId);
    expect(result.purchase_date).toEqual(new Date('2024-01-15'));
    expect(result.purchase_price).toEqual(1299.99);
    expect(typeof result.purchase_price).toBe('number');
    expect(result.status).toEqual('available');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should generate unique asset code in correct format', async () => {
    const testInput = {
      ...baseTestInput,
      category_id: categoryId,
      location_id: locationId,
      supplier_id: supplierId
    };

    const result = await createAsset(testInput);
    const currentYear = new Date().getFullYear();
    
    expect(result.asset_code).toMatch(new RegExp(`^AST-${currentYear}-\\d{4}$`));
    expect(result.asset_code).toEqual(`AST-${currentYear}-0001`);
  });

  it('should generate incremental asset codes', async () => {
    const testInput = {
      ...baseTestInput,
      category_id: categoryId,
      location_id: locationId,
      supplier_id: supplierId
    };

    // Create first asset
    const result1 = await createAsset({ ...testInput, name: 'First Asset' });
    
    // Create second asset
    const result2 = await createAsset({ ...testInput, name: 'Second Asset' });

    const currentYear = new Date().getFullYear();
    expect(result1.asset_code).toEqual(`AST-${currentYear}-0001`);
    expect(result2.asset_code).toEqual(`AST-${currentYear}-0002`);
  });

  it('should generate QR code with asset information', async () => {
    const testInput = {
      ...baseTestInput,
      category_id: categoryId,
      location_id: locationId,
      supplier_id: supplierId
    };

    const result = await createAsset(testInput);
    
    expect(result.qr_code).toBeDefined();
    const qrData = JSON.parse(result.qr_code);
    expect(qrData.asset_code).toEqual(result.asset_code);
    expect(qrData.name).toEqual('Test Laptop');
    expect(qrData.type).toEqual('asset_qr');
    expect(qrData.generated_at).toBeDefined();
  });

  it('should create asset with null supplier', async () => {
    const testInput = {
      ...baseTestInput,
      category_id: categoryId,
      location_id: locationId,
      supplier_id: null
    };

    const result = await createAsset(testInput);

    expect(result.supplier_id).toBeNull();
    expect(result.name).toEqual('Test Laptop');
    expect(result.id).toBeDefined();
  });

  it('should create asset with null purchase price', async () => {
    const testInput = {
      ...baseTestInput,
      category_id: categoryId,
      location_id: locationId,
      supplier_id: supplierId,
      purchase_price: null
    };

    const result = await createAsset(testInput);

    expect(result.purchase_price).toBeNull();
    expect(result.name).toEqual('Test Laptop');
    expect(result.id).toBeDefined();
  });

  it('should create asset with minimal required fields', async () => {
    const minimalInput: CreateAssetInput = {
      name: 'Minimal Asset',
      photos: [],
      category_id: categoryId,
      brand: null,
      serial_number: null,
      specification: null,
      location_id: locationId,
      supplier_id: null,
      purchase_date: null,
      purchase_price: null,
      status: 'available'
    };

    const result = await createAsset(minimalInput);

    expect(result.name).toEqual('Minimal Asset');
    expect(result.photos).toEqual([]);
    expect(result.brand).toBeNull();
    expect(result.serial_number).toBeNull();
    expect(result.specification).toBeNull();
    expect(result.supplier_id).toBeNull();
    expect(result.purchase_date).toBeNull();
    expect(result.purchase_price).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should save asset to database', async () => {
    const testInput = {
      ...baseTestInput,
      category_id: categoryId,
      location_id: locationId,
      supplier_id: supplierId
    };

    const result = await createAsset(testInput);

    // Query database to verify asset was saved
    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, result.id))
      .execute();

    expect(assets).toHaveLength(1);
    expect(assets[0].name).toEqual('Test Laptop');
    expect(assets[0].category_id).toEqual(categoryId);
    expect(assets[0].location_id).toEqual(locationId);
    expect(assets[0].supplier_id).toEqual(supplierId);
    expect(parseFloat(assets[0].purchase_price!)).toEqual(1299.99);
    expect(assets[0].status).toEqual('available');
    expect(assets[0].asset_code).toMatch(/^AST-\d{4}-\d{4}$/);
    expect(assets[0].qr_code).toBeDefined();
  });

  it('should throw error for non-existent category', async () => {
    const testInput = {
      ...baseTestInput,
      category_id: 99999, // Non-existent category
      location_id: locationId,
      supplier_id: supplierId
    };

    expect(createAsset(testInput)).rejects.toThrow(/Category with id 99999 does not exist/i);
  });

  it('should throw error for non-existent location', async () => {
    const testInput = {
      ...baseTestInput,
      category_id: categoryId,
      location_id: 99999, // Non-existent location
      supplier_id: supplierId
    };

    expect(createAsset(testInput)).rejects.toThrow(/Location with id 99999 does not exist/i);
  });

  it('should throw error for non-existent supplier', async () => {
    const testInput = {
      ...baseTestInput,
      category_id: categoryId,
      location_id: locationId,
      supplier_id: 99999 // Non-existent supplier
    };

    expect(createAsset(testInput)).rejects.toThrow(/Supplier with id 99999 does not exist/i);
  });

  it('should handle default status correctly', async () => {
    const testInput: CreateAssetInput = {
      name: 'Status Test Asset',
      photos: [],
      category_id: categoryId,
      brand: 'Test Brand',
      serial_number: null,
      specification: null,
      location_id: locationId,
      supplier_id: null,
      purchase_date: null,
      purchase_price: null,
      status: 'available' // Explicitly set to default
    };

    const result = await createAsset(testInput);

    expect(result.status).toEqual('available');
  });
});