import { db } from '../db';
import { assetsTable, categoriesTable, locationsTable, suppliersTable } from '../db/schema';
import { type CreateAssetInput, type Asset } from '../schema';
import { eq, desc, like } from 'drizzle-orm';

// Generate asset code in format AST-YYYY-NNNN
const generateAssetCode = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `AST-${currentYear}-`;
  
  // Get the latest asset code for the current year
  const latestAsset = await db.select()
    .from(assetsTable)
    .where(like(assetsTable.asset_code, `${yearPrefix}%`))
    .orderBy(desc(assetsTable.asset_code))
    .limit(1)
    .execute();

  let nextNumber = 1;
  if (latestAsset.length > 0) {
    const lastCode = latestAsset[0].asset_code;
    const numberPart = lastCode.split('-')[2];
    nextNumber = parseInt(numberPart) + 1;
  }

  return `${yearPrefix}${nextNumber.toString().padStart(4, '0')}`;
};

// Generate QR code data (JSON string with asset info)
const generateQRCode = (assetCode: string, assetName: string): string => {
  return JSON.stringify({
    asset_code: assetCode,
    name: assetName,
    type: 'asset_qr',
    generated_at: new Date().toISOString()
  });
};

export const createAsset = async (input: CreateAssetInput): Promise<Asset> => {
  try {
    // Validate required foreign key references exist
    const conditions = [];
    
    // Check if category exists
    conditions.push(eq(categoriesTable.id, input.category_id));
    const categoryExists = await db.select()
      .from(categoriesTable)
      .where(conditions[0])
      .limit(1)
      .execute();
    
    if (categoryExists.length === 0) {
      throw new Error(`Category with id ${input.category_id} does not exist`);
    }

    // Check if location exists
    const locationExists = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, input.location_id))
      .limit(1)
      .execute();
    
    if (locationExists.length === 0) {
      throw new Error(`Location with id ${input.location_id} does not exist`);
    }

    // Check if supplier exists (if provided)
    if (input.supplier_id !== null && input.supplier_id !== undefined) {
      const supplierExists = await db.select()
        .from(suppliersTable)
        .where(eq(suppliersTable.id, input.supplier_id))
        .limit(1)
        .execute();
      
      if (supplierExists.length === 0) {
        throw new Error(`Supplier with id ${input.supplier_id} does not exist`);
      }
    }

    // Generate asset code and QR code
    const assetCode = await generateAssetCode();
    const qrCode = generateQRCode(assetCode, input.name);

    // Insert asset record
    const result = await db.insert(assetsTable)
      .values({
        asset_code: assetCode,
        name: input.name,
        photos: input.photos,
        category_id: input.category_id,
        brand: input.brand,
        serial_number: input.serial_number,
        specification: input.specification,
        location_id: input.location_id,
        supplier_id: input.supplier_id,
        purchase_date: input.purchase_date ? input.purchase_date.toISOString().split('T')[0] : null,
        purchase_price: input.purchase_price ? input.purchase_price.toString() : null,
        status: input.status,
        qr_code: qrCode
      })
      .returning()
      .execute();

    // Convert numeric and date fields back to proper types before returning
    const asset = result[0];
    return {
      ...asset,
      purchase_price: asset.purchase_price ? parseFloat(asset.purchase_price) : null,
      purchase_date: asset.purchase_date ? new Date(asset.purchase_date) : null
    };
  } catch (error) {
    console.error('Asset creation failed:', error);
    throw error;
  }
};