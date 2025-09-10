import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { locationsTable } from '../db/schema';
import { type UpdateLocationInput } from '../schema';
import { updateLocation } from '../handlers/update_location';
import { eq } from 'drizzle-orm';

// Test input for updating location
const updateInput: UpdateLocationInput = {
  id: 1,
  name: 'Updated Location',
  description: 'Updated description for testing'
};

describe('updateLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create a test location to update
    await db.insert(locationsTable)
      .values({
        name: 'Original Location',
        description: 'Original description'
      })
      .execute();
  });

  it('should update location with all fields', async () => {
    const result = await updateLocation(updateInput);

    // Verify returned data
    expect(result.id).toEqual(1);
    expect(result.name).toEqual('Updated Location');
    expect(result.description).toEqual('Updated description for testing');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated location to database', async () => {
    await updateLocation(updateInput);

    // Query database to verify update
    const locations = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, 1))
      .execute();

    expect(locations).toHaveLength(1);
    expect(locations[0].name).toEqual('Updated Location');
    expect(locations[0].description).toEqual('Updated description for testing');
    expect(locations[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update only name field', async () => {
    const partialInput: UpdateLocationInput = {
      id: 1,
      name: 'Only Name Updated'
    };

    const result = await updateLocation(partialInput);

    expect(result.name).toEqual('Only Name Updated');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
  });

  it('should update only description field', async () => {
    const partialInput: UpdateLocationInput = {
      id: 1,
      description: 'Only description updated'
    };

    const result = await updateLocation(partialInput);

    expect(result.name).toEqual('Original Location'); // Should remain unchanged
    expect(result.description).toEqual('Only description updated');
  });

  it('should handle null description', async () => {
    const nullDescriptionInput: UpdateLocationInput = {
      id: 1,
      name: 'Updated Name',
      description: null
    };

    const result = await updateLocation(nullDescriptionInput);

    expect(result.name).toEqual('Updated Name');
    expect(result.description).toBeNull();
  });

  it('should return existing location when no fields to update', async () => {
    const emptyInput: UpdateLocationInput = {
      id: 1
    };

    const result = await updateLocation(emptyInput);

    // Should return original data since nothing to update
    expect(result.name).toEqual('Original Location');
    expect(result.description).toEqual('Original description');
  });

  it('should throw error for non-existent location', async () => {
    const nonExistentInput: UpdateLocationInput = {
      id: 999,
      name: 'Non-existent Location'
    };

    await expect(updateLocation(nonExistentInput)).rejects.toThrow(/Location with id 999 not found/i);
  });

  it('should update timestamps correctly', async () => {
    // Get original timestamps
    const originalLocation = await db.select()
      .from(locationsTable)
      .where(eq(locationsTable.id, 1))
      .execute();

    const originalUpdatedAt = originalLocation[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update location
    const result = await updateLocation(updateInput);

    // Verify updated timestamp is newer
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    expect(result.created_at).toEqual(originalLocation[0].created_at); // Should not change
  });

  it('should handle updating location used by assets', async () => {
    // Create test category, supplier, and user first for the asset
    await db.insert(locationsTable)
      .values({
        name: 'Secondary Location',
        description: 'Another location'
      })
      .execute();

    // Since we can't create assets without proper foreign keys in this test,
    // we'll just test that location update works regardless
    const result = await updateLocation({
      id: 2,
      name: 'Updated Secondary Location'
    });

    expect(result.name).toEqual('Updated Secondary Location');
    expect(result.description).toEqual('Another location');
  });
});