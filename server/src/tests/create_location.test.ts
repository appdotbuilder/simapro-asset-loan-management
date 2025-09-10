import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { locationsTable } from '../db/schema';
import { type CreateLocationInput } from '../schema';
import { createLocation } from '../handlers/create_location';
import { eq } from 'drizzle-orm';

// Test inputs
const testInput: CreateLocationInput = {
  name: 'Test Location',
  description: 'A location for testing'
};

const testInputNullDescription: CreateLocationInput = {
  name: 'Minimal Location',
  description: null
};

describe('createLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a location with description', async () => {
    const result = await createLocation(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Location');
    expect(result.description).toEqual('A location for testing');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a location with null description', async () => {
    const result = await createLocation(testInputNullDescription);

    // Basic field validation
    expect(result.name).toEqual('Minimal Location');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save location to database', async () => {
    const result = await createLocation(testInput);

    // Query to verify database insertion
    const locations = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, result.id))
      .execute();

    expect(locations).toHaveLength(1);
    expect(locations[0].name).toEqual('Test Location');
    expect(locations[0].description).toEqual('A location for testing');
    expect(locations[0].created_at).toBeInstanceOf(Date);
    expect(locations[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle duplicate location names', async () => {
    // Create first location
    await createLocation(testInput);

    // Try to create location with same name - should not fail
    // (no unique constraint on name in schema)
    const result = await createLocation(testInput);
    
    expect(result.name).toEqual('Test Location');
    expect(result.id).toBeDefined();
  });

  it('should generate timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createLocation(testInput);
    const afterCreation = new Date();

    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});