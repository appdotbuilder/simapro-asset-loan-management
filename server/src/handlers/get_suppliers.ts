import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type Supplier } from '../schema';
import { desc } from 'drizzle-orm';

export const getSuppliers = async (): Promise<Supplier[]> => {
  try {
    const results = await db.select()
      .from(suppliersTable)
      .orderBy(desc(suppliersTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get suppliers:', error);
    throw error;
  }
};