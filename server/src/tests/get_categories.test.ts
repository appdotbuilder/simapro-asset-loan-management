import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { getCategories } from '../handlers/get_categories';

// Test data for creating categories
const testCategories: CreateCategoryInput[] = [
  {
    name: 'Electronics',
    description: 'Electronic devices and equipment'
  },
  {
    name: 'Furniture',
    description: 'Office and classroom furniture'
  },
  {
    name: 'Laboratory Equipment',
    description: null // Test with null description
  }
];

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all categories', async () => {
    // Create test categories
    for (const categoryData of testCategories) {
      await db.insert(categoriesTable)
        .values({
          name: categoryData.name,
          description: categoryData.description
        })
        .execute();
    }

    const result = await getCategories();

    // Should return all 3 categories
    expect(result).toHaveLength(3);
    
    // Check that all category names are present
    const categoryNames = result.map(category => category.name);
    expect(categoryNames).toContain('Electronics');
    expect(categoryNames).toContain('Furniture');
    expect(categoryNames).toContain('Laboratory Equipment');
  });

  it('should return categories with all required fields', async () => {
    // Create a single category
    await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    const category = result[0];

    // Verify all required fields are present and have correct types
    expect(category.id).toBeDefined();
    expect(typeof category.id).toBe('number');
    expect(category.name).toEqual('Test Category');
    expect(typeof category.name).toBe('string');
    expect(category.description).toEqual('A test category');
    expect(category.created_at).toBeInstanceOf(Date);
    expect(category.updated_at).toBeInstanceOf(Date);
  });

  it('should handle categories with null description', async () => {
    // Create category with null description
    await db.insert(categoriesTable)
      .values({
        name: 'Category with null description',
        description: null
      })
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    const category = result[0];
    expect(category.name).toEqual('Category with null description');
    expect(category.description).toBeNull();
  });

  it('should return categories in database order', async () => {
    // Create categories in a specific order
    const orderedCategories = ['First Category', 'Second Category', 'Third Category'];
    
    for (const name of orderedCategories) {
      await db.insert(categoriesTable)
        .values({
          name: name,
          description: `Description for ${name}`
        })
        .execute();
    }

    const result = await getCategories();

    expect(result).toHaveLength(3);
    
    // Categories should be returned in the order they were inserted (by ID)
    expect(result[0].name).toEqual('First Category');
    expect(result[1].name).toEqual('Second Category');
    expect(result[2].name).toEqual('Third Category');
    
    // Verify IDs are in ascending order
    expect(result[0].id).toBeLessThan(result[1].id);
    expect(result[1].id).toBeLessThan(result[2].id);
  });

  it('should return categories with timestamps', async () => {
    // Create category
    await db.insert(categoriesTable)
      .values({
        name: 'Timestamped Category',
        description: 'Category for timestamp testing'
      })
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    const category = result[0];

    // Verify timestamps are Date objects and reasonable
    expect(category.created_at).toBeInstanceOf(Date);
    expect(category.updated_at).toBeInstanceOf(Date);
    
    // Timestamps should be recent (within the last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    expect(category.created_at.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
    expect(category.updated_at.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
  });

  it('should handle large number of categories', async () => {
    // Create many categories to test performance
    const numberOfCategories = 50;
    const categoryPromises = [];
    
    for (let i = 1; i <= numberOfCategories; i++) {
      categoryPromises.push(
        db.insert(categoriesTable)
          .values({
            name: `Category ${i}`,
            description: `Description for category ${i}`
          })
          .execute()
      );
    }
    
    await Promise.all(categoryPromises);

    const result = await getCategories();

    expect(result).toHaveLength(numberOfCategories);
    
    // Verify first and last categories
    const categoryNames = result.map(c => c.name);
    expect(categoryNames).toContain('Category 1');
    expect(categoryNames).toContain(`Category ${numberOfCategories}`);
  });
});