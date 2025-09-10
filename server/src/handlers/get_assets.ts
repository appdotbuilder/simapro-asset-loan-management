import { db } from '../db';
import { assetsTable, categoriesTable, locationsTable, suppliersTable } from '../db/schema';
import { type Asset } from '../schema';
import { eq } from 'drizzle-orm';

export const getAssets = async (): Promise<Asset[]> => {
  try {
    // Query assets with all related data using joins
    const results = await db.select()
      .from(assetsTable)
      .leftJoin(categoriesTable, eq(assetsTable.category_id, categoriesTable.id))
      .leftJoin(locationsTable, eq(assetsTable.location_id, locationsTable.id))
      .leftJoin(suppliersTable, eq(assetsTable.supplier_id, suppliersTable.id))
      .execute();

    // Map results to Asset type with proper numeric and date conversions
    return results.map(result => ({
      id: result.assets.id,
      asset_code: result.assets.asset_code,
      name: result.assets.name,
      photos: result.assets.photos,
      category_id: result.assets.category_id,
      brand: result.assets.brand,
      serial_number: result.assets.serial_number,
      specification: result.assets.specification,
      location_id: result.assets.location_id,
      supplier_id: result.assets.supplier_id,
      purchase_date: result.assets.purchase_date ? new Date(result.assets.purchase_date) : null,
      purchase_price: result.assets.purchase_price ? parseFloat(result.assets.purchase_price) : null,
      status: result.assets.status,
      qr_code: result.assets.qr_code,
      created_at: result.assets.created_at,
      updated_at: result.assets.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch assets:', error);
    throw error;
  }
};