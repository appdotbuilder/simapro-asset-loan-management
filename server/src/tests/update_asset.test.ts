import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assetsTable, categoriesTable, locationsTable, suppliersTable } from '../db/schema';
import { type UpdateAssetInput } from '../schema';
import { updateAsset } from '../handlers/update_asset';
import { eq } from 'drizzle-orm';

describe('updateAsset', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testAssetId: number;
  let testCategoryId: number;
  let testLocationId: number;
  let testSupplierId: number;

  beforeEach(async () => {
    // Create prerequisite data
    const categoryResult = await db.insert(categoriesTable)
      .values({ name: 'Test Category', description: 'Category for testing' })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    const locationResult = await db.insert(locationsTable)
      .values({ name: 'Test Location', description: 'Location for testing' })
      .returning()
      .execute();
    testLocationId = locationResult[0].id;

    const supplierResult = await db.insert(suppliersTable)
      .values({ 
        name: 'Test Supplier', 
        contact_person: 'John Doe',
        phone: '123-456-7890',
        email: 'supplier@example.com'
      })
      .returning()
      .execute();
    testSupplierId = supplierResult[0].id;

    // Create test asset
    const assetResult = await db.insert(assetsTable)
      .values({
        asset_code: 'AST-2024-0001',
        name: 'Original Asset',
        photos: ['photo1.jpg'],
        category_id: testCategoryId,
        brand: 'Original Brand',
        serial_number: 'SN001',
        specification: 'Original spec',
        location_id: testLocationId,
        supplier_id: testSupplierId,
        purchase_date: '2024-01-01',
        purchase_price: '1000.00',
        status: 'available',
        qr_code: 'original_qr_code'
      })
      .returning()
      .execute();
    testAssetId = assetResult[0].id;
  });

  it('should update basic asset fields', async () => {
    const updateInput: UpdateAssetInput = {
      id: testAssetId,
      name: 'Updated Asset Name',
      brand: 'Updated Brand',
      specification: 'Updated specification'
    };

    const result = await updateAsset(updateInput);

    expect(result.id).toEqual(testAssetId);
    expect(result.name).toEqual('Updated Asset Name');
    expect(result.brand).toEqual('Updated Brand');
    expect(result.specification).toEqual('Updated specification');
    expect(result.asset_code).toEqual('AST-2024-0001'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update numeric fields correctly', async () => {
    const updateInput: UpdateAssetInput = {
      id: testAssetId,
      purchase_price: 2500.75
    };

    const result = await updateAsset(updateInput);

    expect(result.purchase_price).toEqual(2500.75);
    expect(typeof result.purchase_price).toBe('number');
  });

  it('should update array fields', async () => {
    const updateInput: UpdateAssetInput = {
      id: testAssetId,
      photos: ['new_photo1.jpg', 'new_photo2.jpg', 'new_photo3.jpg']
    };

    const result = await updateAsset(updateInput);

    expect(result.photos).toEqual(['new_photo1.jpg', 'new_photo2.jpg', 'new_photo3.jpg']);
    expect(Array.isArray(result.photos)).toBe(true);
  });

  it('should update status field', async () => {
    const updateInput: UpdateAssetInput = {
      id: testAssetId,
      status: 'under_repair'
    };

    const result = await updateAsset(updateInput);

    expect(result.status).toEqual('under_repair');
  });

  it('should update foreign key references', async () => {
    // Create new category and location
    const newCategoryResult = await db.insert(categoriesTable)
      .values({ name: 'New Category', description: 'New category' })
      .returning()
      .execute();
    const newCategoryId = newCategoryResult[0].id;

    const newLocationResult = await db.insert(locationsTable)
      .values({ name: 'New Location', description: 'New location' })
      .returning()
      .execute();
    const newLocationId = newLocationResult[0].id;

    const updateInput: UpdateAssetInput = {
      id: testAssetId,
      category_id: newCategoryId,
      location_id: newLocationId
    };

    const result = await updateAsset(updateInput);

    expect(result.category_id).toEqual(newCategoryId);
    expect(result.location_id).toEqual(newLocationId);
  });

  it('should handle nullable fields correctly', async () => {
    // First create an asset with some nullable fields set to null
    const nullableAssetResult = await db.insert(assetsTable)
      .values({
        asset_code: 'AST-2024-NULL',
        name: 'Nullable Asset',
        photos: [],
        category_id: testCategoryId,
        brand: null,
        serial_number: null,
        specification: null,
        location_id: testLocationId,
        supplier_id: null,
        purchase_date: null,
        purchase_price: null,
        status: 'available',
        qr_code: 'nullable_qr_code'
      })
      .returning()
      .execute();
    const nullableAssetId = nullableAssetResult[0].id;

    const updateInput: UpdateAssetInput = {
      id: nullableAssetId,
      supplier_id: null,
      purchase_date: null,
      purchase_price: null,
      serial_number: null
    };

    const result = await updateAsset(updateInput);

    expect(result.supplier_id).toBeNull();
    expect(result.purchase_date).toBeNull();
    expect(result.purchase_price).toBeNull();
    expect(result.serial_number).toBeNull();
  });

  it('should persist changes to database', async () => {
    const updateInput: UpdateAssetInput = {
      id: testAssetId,
      name: 'Database Updated Asset',
      status: 'borrowed',
      purchase_price: 3500.50
    };

    await updateAsset(updateInput);

    // Query database directly to verify persistence
    const assets = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, testAssetId))
      .execute();

    expect(assets).toHaveLength(1);
    expect(assets[0].name).toEqual('Database Updated Asset');
    expect(assets[0].status).toEqual('borrowed');
    expect(parseFloat(assets[0].purchase_price!)).toEqual(3500.50);
    expect(assets[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    const updateInput: UpdateAssetInput = {
      id: testAssetId,
      name: 'Partially Updated Asset'
    };

    const result = await updateAsset(updateInput);

    // Updated field
    expect(result.name).toEqual('Partially Updated Asset');
    
    // Unchanged fields should retain original values
    expect(result.brand).toEqual('Original Brand');
    expect(result.specification).toEqual('Original spec');
    expect(result.serial_number).toEqual('SN001');
    expect(result.status).toEqual('available');
  });

  it('should handle complex update with multiple field types', async () => {
    const updateInput: UpdateAssetInput = {
      id: testAssetId,
      name: 'Complex Updated Asset',
      photos: ['complex1.jpg', 'complex2.jpg'],
      brand: 'Complex Brand',
      status: 'damaged',
      purchase_price: 4999.99,
      specification: 'Complex updated specification with detailed information'
    };

    const result = await updateAsset(updateInput);

    expect(result.name).toEqual('Complex Updated Asset');
    expect(result.photos).toEqual(['complex1.jpg', 'complex2.jpg']);
    expect(result.brand).toEqual('Complex Brand');
    expect(result.status).toEqual('damaged');
    expect(result.purchase_price).toEqual(4999.99);
    expect(result.specification).toEqual('Complex updated specification with detailed information');
    expect(typeof result.purchase_price).toBe('number');
  });

  it('should throw error for non-existent asset', async () => {
    const updateInput: UpdateAssetInput = {
      id: 99999,
      name: 'Non-existent Asset'
    };

    await expect(updateAsset(updateInput)).rejects.toThrow(/Asset with id 99999 not found/i);
  });

  it('should throw error for invalid foreign key reference', async () => {
    const updateInput: UpdateAssetInput = {
      id: testAssetId,
      category_id: 99999 // Non-existent category
    };

    await expect(updateAsset(updateInput)).rejects.toThrow();
  });
});