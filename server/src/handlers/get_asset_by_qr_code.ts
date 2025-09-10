import { db } from '../db';
import { assetsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Asset } from '../schema';

export const getAssetByQrCode = async (qrCode: string): Promise<Asset | null> => {
  try {
    const results = await db.select()
      .from(assetsTable)
      .where(eq(assetsTable.qr_code, qrCode))
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    const asset = results[0];
    
    // Convert numeric and date fields to proper types
    return {
      ...asset,
      purchase_price: asset.purchase_price ? parseFloat(asset.purchase_price) : null,
      purchase_date: asset.purchase_date ? new Date(asset.purchase_date) : null
    };
  } catch (error) {
    console.error('Asset lookup by QR code failed:', error);
    throw error;
  }
};