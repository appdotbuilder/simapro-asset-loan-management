import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type Category } from '../schema';

export const getCategories = async (): Promise<Category[]> => {
  try {
    // Fetch all categories from the database
    const result = await db.select()
      .from(categoriesTable)
      .execute();

    // Return the categories as-is since all fields are already in the correct format
    return result;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
};