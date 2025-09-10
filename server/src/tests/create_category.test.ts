import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateCategoryInput = {
  name: 'Electronics',
  description: 'Electronic devices and equipment'
};

// Test input with null description
const testInputNullDesc: CreateCategoryInput = {
  name: 'Furniture',
  description: null
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category with description', async () => {
    const result = await createCategory(testInput);

    // Verify returned category object
    expect(result.name).toEqual('Electronics');
    expect(result.description).toEqual('Electronic devices and equipment');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a category with null description', async () => {
    const result = await createCategory(testInputNullDesc);

    // Verify returned category object
    expect(result.name).toEqual('Furniture');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const result = await createCategory(testInput);

    // Query database to verify the category was saved
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    const savedCategory = categories[0];
    expect(savedCategory.name).toEqual('Electronics');
    expect(savedCategory.description).toEqual('Electronic devices and equipment');
    expect(savedCategory.created_at).toBeInstanceOf(Date);
    expect(savedCategory.updated_at).toBeInstanceOf(Date);
  });

  it('should allow duplicate category names', async () => {
    // Create first category
    const category1 = await createCategory(testInput);

    // Create another category with the same name (should be allowed)
    const category2 = await createCategory(testInput);

    // Both categories should be created successfully
    expect(category1.id).not.toEqual(category2.id);
    expect(category1.name).toEqual(category2.name);
    expect(category1.name).toEqual('Electronics');
    
    // Verify both are in database
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(2);
  });

  it('should create multiple categories with different names', async () => {
    const category1 = await createCategory(testInput);
    const category2 = await createCategory(testInputNullDesc);

    // Verify both categories were created with different IDs
    expect(category1.id).not.toEqual(category2.id);
    expect(category1.name).toEqual('Electronics');
    expect(category2.name).toEqual('Furniture');

    // Verify both are in database
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(2);
  });

  it('should generate sequential IDs for multiple categories', async () => {
    const category1 = await createCategory({
      name: 'Category 1',
      description: 'First category'
    });

    const category2 = await createCategory({
      name: 'Category 2', 
      description: 'Second category'
    });

    // IDs should be sequential (assuming fresh database)
    expect(category2.id).toBeGreaterThan(category1.id);
  });

  it('should handle empty string description', async () => {
    const inputWithEmptyDesc: CreateCategoryInput = {
      name: 'Test Category',
      description: ''
    };

    const result = await createCategory(inputWithEmptyDesc);

    expect(result.name).toEqual('Test Category');
    expect(result.description).toEqual('');
  });
});