import { db } from '../db';
import { assetsTable } from '../db/schema';
import { type UpdateAssetInput, type Asset } from '../schema';
import { eq } from 'drizzle-orm';

export const updateAsset = async (input: UpdateAssetInput): Promise<Asset> => {
  try {
    // Prepare update data - convert numeric fields to strings
    const updateData: any = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.photos !== undefined) updateData.photos = input.photos;
    if (input.category_id !== undefined) updateData.category_id = input.category_id;
    if (input.brand !== undefined) updateData.brand = input.brand;
    if (input.serial_number !== undefined) updateData.serial_number = input.serial_number;
    if (input.specification !== undefined) updateData.specification = input.specification;
    if (input.location_id !== undefined) updateData.location_id = input.location_id;
    if (input.supplier_id !== undefined) updateData.supplier_id = input.supplier_id;
    if (input.purchase_date !== undefined) {
      updateData.purchase_date = input.purchase_date ? input.purchase_date.toISOString().split('T')[0] : null;
    }
    if (input.purchase_price !== undefined) {
      updateData.purchase_price = input.purchase_price?.toString();
    }
    if (input.status !== undefined) updateData.status = input.status;

    // Add updated_at timestamp
    updateData.updated_at = new Date();

    // Update the asset record
    const result = await db.update(assetsTable)
      .set(updateData)
      .where(eq(assetsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Asset with id ${input.id} not found`);
    }

    // Convert numeric and date fields back to proper types before returning
    const asset = result[0];
    return {
      ...asset,
      purchase_price: asset.purchase_price ? parseFloat(asset.purchase_price) : null,
      purchase_date: asset.purchase_date ? new Date(asset.purchase_date) : null
    };
  } catch (error) {
    console.error('Asset update failed:', error);
    throw error;
  }
};