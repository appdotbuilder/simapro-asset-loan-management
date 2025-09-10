import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { locationsTable } from '../db/schema';
import { type CreateLocationInput } from '../schema';
import { getLocations } from '../handlers/get_locations';

describe('getLocations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no locations exist', async () => {
    const result = await getLocations();

    expect(result).toEqual([]);
  });

  it('should return all locations', async () => {
    // Create test locations
    const testLocations = [
      { name: 'Main Office', description: 'Primary office building' },
      { name: 'Warehouse A', description: 'Storage facility A' },
      { name: 'Lab Room 101', description: null }
    ];

    await db.insert(locationsTable)
      .values(testLocations)
      .execute();

    const result = await getLocations();

    expect(result).toHaveLength(3);
    
    // Verify all locations are returned
    const locationNames = result.map(loc => loc.name).sort();
    expect(locationNames).toEqual(['Lab Room 101', 'Main Office', 'Warehouse A']);

    // Verify data structure
    result.forEach(location => {
      expect(location.id).toBeNumber();
      expect(location.name).toBeString();
      expect(location.created_at).toBeInstanceOf(Date);
      expect(location.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should handle locations with null descriptions', async () => {
    const testLocation = {
      name: 'Storage Room',
      description: null
    };

    await db.insert(locationsTable)
      .values(testLocation)
      .execute();

    const result = await getLocations();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Storage Room');
    expect(result[0].description).toBeNull();
  });

  it('should return locations in database insertion order by default', async () => {
    const testLocations = [
      { name: 'First Location', description: 'First' },
      { name: 'Second Location', description: 'Second' },
      { name: 'Third Location', description: 'Third' }
    ];

    // Insert one by one to ensure order
    for (const location of testLocations) {
      await db.insert(locationsTable)
        .values(location)
        .execute();
    }

    const result = await getLocations();

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('First Location');
    expect(result[1].name).toEqual('Second Location');
    expect(result[2].name).toEqual('Third Location');
  });

  it('should return locations with complete field structure', async () => {
    const testLocation = {
      name: 'Complete Test Location',
      description: 'Full description for testing'
    };

    await db.insert(locationsTable)
      .values(testLocation)
      .execute();

    const result = await getLocations();

    expect(result).toHaveLength(1);
    const location = result[0];

    // Verify all expected fields are present
    expect(location).toHaveProperty('id');
    expect(location).toHaveProperty('name');
    expect(location).toHaveProperty('description');
    expect(location).toHaveProperty('created_at');
    expect(location).toHaveProperty('updated_at');

    // Verify field values and types
    expect(typeof location.id).toBe('number');
    expect(typeof location.name).toBe('string');
    expect(typeof location.description).toBe('string');
    expect(location.created_at).toBeInstanceOf(Date);
    expect(location.updated_at).toBeInstanceOf(Date);

    expect(location.name).toEqual('Complete Test Location');
    expect(location.description).toEqual('Full description for testing');
  });
});