import { db } from '../db';
import { assetsTable } from '../db/schema';
import { type Asset } from '../schema';
import { eq } from 'drizzle-orm';

export const getAssetById = async (id: number): Promise<Asset | null> => {
  try {
    const result = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const asset = result[0];
    
    // Convert numeric and date fields for the response
    return {
      ...asset,
      purchase_price: asset.purchase_price ? parseFloat(asset.purchase_price) : null,
      purchase_date: asset.purchase_date ? new Date(asset.purchase_date) : null
    };
  } catch (error) {
    console.error('Failed to fetch asset:', error);
    throw error;
  }
};