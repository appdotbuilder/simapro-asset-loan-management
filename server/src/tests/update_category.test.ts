import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type UpdateCategoryInput } from '../schema';
import { updateCategory } from '../handlers/update_category';
import { eq } from 'drizzle-orm';

describe('updateCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCategoryId: number;
  let otherCategoryId: number;

  beforeEach(async () => {
    // Create test categories
    const categories = await db.insert(categoriesTable)
      .values([
        {
          name: 'Electronics',
          description: 'Electronic devices and equipment'
        },
        {
          name: 'Furniture',
          description: 'Office and room furniture'
        }
      ])
      .returning()
      .execute();

    testCategoryId = categories[0].id;
    otherCategoryId = categories[1].id;
  });

  it('should update category name', async () => {
    const input: UpdateCategoryInput = {
      id: testCategoryId,
      name: 'Updated Electronics'
    };

    const result = await updateCategory(input);

    expect(result.id).toEqual(testCategoryId);
    expect(result.name).toEqual('Updated Electronics');
    expect(result.description).toEqual('Electronic devices and equipment');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update category description', async () => {
    const input: UpdateCategoryInput = {
      id: testCategoryId,
      description: 'Updated description for electronics'
    };

    const result = await updateCategory(input);

    expect(result.id).toEqual(testCategoryId);
    expect(result.name).toEqual('Electronics');
    expect(result.description).toEqual('Updated description for electronics');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both name and description', async () => {
    const input: UpdateCategoryInput = {
      id: testCategoryId,
      name: 'Technology Equipment',
      description: 'All kinds of technology and electronic equipment'
    };

    const result = await updateCategory(input);

    expect(result.id).toEqual(testCategoryId);
    expect(result.name).toEqual('Technology Equipment');
    expect(result.description).toEqual('All kinds of technology and electronic equipment');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update description to null', async () => {
    const input: UpdateCategoryInput = {
      id: testCategoryId,
      description: null
    };

    const result = await updateCategory(input);

    expect(result.id).toEqual(testCategoryId);
    expect(result.name).toEqual('Electronics');
    expect(result.description).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const input: UpdateCategoryInput = {
      id: testCategoryId,
      name: 'Database Updated Electronics',
      description: 'Updated in database'
    };

    await updateCategory(input);

    // Verify changes were saved
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, testCategoryId))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Database Updated Electronics');
    expect(categories[0].description).toEqual('Updated in database');
    expect(categories[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error if category does not exist', async () => {
    const input: UpdateCategoryInput = {
      id: 99999,
      name: 'Non-existent Category'
    };

    expect(updateCategory(input)).rejects.toThrow(/Category with id 99999 not found/i);
  });

  it('should throw error if name conflicts with existing category', async () => {
    const input: UpdateCategoryInput = {
      id: testCategoryId,
      name: 'Furniture' // This name already exists for otherCategoryId
    };

    expect(updateCategory(input)).rejects.toThrow(/Category with name 'Furniture' already exists/i);
  });

  it('should allow keeping the same name for the same category', async () => {
    const input: UpdateCategoryInput = {
      id: testCategoryId,
      name: 'Electronics', // Same name as current
      description: 'Updated description'
    };

    const result = await updateCategory(input);

    expect(result.name).toEqual('Electronics');
    expect(result.description).toEqual('Updated description');
  });

  it('should update timestamp on any field change', async () => {
    // Get original timestamp
    const originalCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, testCategoryId))
      .execute();

    const originalTimestamp = originalCategory[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateCategoryInput = {
      id: testCategoryId,
      description: 'Timestamp test'
    };

    const result = await updateCategory(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });

  it('should handle partial updates correctly', async () => {
    // Update only name
    const nameUpdate: UpdateCategoryInput = {
      id: testCategoryId,
      name: 'Only Name Updated'
    };

    const nameResult = await updateCategory(nameUpdate);
    expect(nameResult.name).toEqual('Only Name Updated');
    expect(nameResult.description).toEqual('Electronic devices and equipment'); // Should remain unchanged

    // Update only description
    const descUpdate: UpdateCategoryInput = {
      id: testCategoryId,
      description: 'Only description updated'
    };

    const descResult = await updateCategory(descUpdate);
    expect(descResult.name).toEqual('Only Name Updated'); // Should remain from previous update
    expect(descResult.description).toEqual('Only description updated');
  });
});