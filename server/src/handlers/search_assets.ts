import { db } from '../db';
import { assetsTable } from '../db/schema';
import { type AssetSearchInput, type Asset } from '../schema';
import { eq, and, or, ilike, SQL } from 'drizzle-orm';

export const searchAssets = async (input: AssetSearchInput): Promise<Asset[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Text search across multiple fields
    if (input.search) {
      const searchTerm = `%${input.search}%`;
      conditions.push(
        or(
          ilike(assetsTable.name, searchTerm),
          ilike(assetsTable.asset_code, searchTerm),
          ilike(assetsTable.brand, searchTerm),
          ilike(assetsTable.serial_number, searchTerm)
        )!
      );
    }

    // Filter by category
    if (input.category_id !== undefined) {
      conditions.push(eq(assetsTable.category_id, input.category_id));
    }

    // Filter by location
    if (input.location_id !== undefined) {
      conditions.push(eq(assetsTable.location_id, input.location_id));
    }

    // Filter by status
    if (input.status !== undefined) {
      conditions.push(eq(assetsTable.status, input.status));
    }

    // Filter for available assets only (for user catalog)
    if (input.available_only) {
      conditions.push(eq(assetsTable.status, 'available'));
    }

    // Build and execute query
    const results = conditions.length > 0
      ? await db.select().from(assetsTable).where(conditions.length === 1 ? conditions[0] : and(...conditions)).execute()
      : await db.select().from(assetsTable).execute();

    // Convert numeric and date fields appropriately
    return results.map(asset => ({
      ...asset,
      purchase_price: asset.purchase_price ? parseFloat(asset.purchase_price) : null,
      purchase_date: asset.purchase_date ? new Date(asset.purchase_date) : null
    }));
  } catch (error) {
    console.error('Asset search failed:', error);
    throw error;
  }
};