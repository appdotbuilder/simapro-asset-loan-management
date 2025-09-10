import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type CreateSupplierInput } from '../schema';
import { getSuppliers } from '../handlers/get_suppliers';

// Test supplier data
const testSupplier1: CreateSupplierInput = {
  name: 'Tech Solutions Inc',
  contact_person: 'John Smith',
  phone: '+1-555-0123',
  email: 'contact@techsolutions.com',
  address: '123 Business Park, Tech City, TC 12345'
};

const testSupplier2: CreateSupplierInput = {
  name: 'Office Supplies Co',
  contact_person: 'Jane Doe',
  phone: '+1-555-0456',
  email: 'sales@officesupplies.com',
  address: '456 Commerce Street, Business Town, BT 67890'
};

const minimalSupplier: CreateSupplierInput = {
  name: 'Minimal Supplier',
  contact_person: null,
  phone: null,
  email: null,
  address: null
};

describe('getSuppliers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no suppliers exist', async () => {
    const result = await getSuppliers();
    
    expect(result).toEqual([]);
  });

  it('should return all suppliers', async () => {
    // Create test suppliers
    await db.insert(suppliersTable).values([
      testSupplier1,
      testSupplier2,
      minimalSupplier
    ]).execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(3);
    
    // Check that all supplier names are present
    const supplierNames = result.map(s => s.name);
    expect(supplierNames).toContain('Tech Solutions Inc');
    expect(supplierNames).toContain('Office Supplies Co');
    expect(supplierNames).toContain('Minimal Supplier');
  });

  it('should return suppliers with all fields populated correctly', async () => {
    // Insert supplier with all fields
    const insertResult = await db.insert(suppliersTable)
      .values(testSupplier1)
      .returning()
      .execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(1);
    const supplier = result[0];

    expect(supplier.id).toBeDefined();
    expect(supplier.name).toEqual('Tech Solutions Inc');
    expect(supplier.contact_person).toEqual('John Smith');
    expect(supplier.phone).toEqual('+1-555-0123');
    expect(supplier.email).toEqual('contact@techsolutions.com');
    expect(supplier.address).toEqual('123 Business Park, Tech City, TC 12345');
    expect(supplier.created_at).toBeInstanceOf(Date);
    expect(supplier.updated_at).toBeInstanceOf(Date);
  });

  it('should handle suppliers with null optional fields', async () => {
    // Insert supplier with minimal data
    await db.insert(suppliersTable)
      .values(minimalSupplier)
      .execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(1);
    const supplier = result[0];

    expect(supplier.name).toEqual('Minimal Supplier');
    expect(supplier.contact_person).toBeNull();
    expect(supplier.phone).toBeNull();
    expect(supplier.email).toBeNull();
    expect(supplier.address).toBeNull();
    expect(supplier.created_at).toBeInstanceOf(Date);
    expect(supplier.updated_at).toBeInstanceOf(Date);
  });

  it('should return suppliers ordered by creation date (newest first)', async () => {
    // Insert suppliers with slight delay to ensure different timestamps
    await db.insert(suppliersTable).values(testSupplier1).execute();
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(suppliersTable).values(testSupplier2).execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(2);
    
    // Should be ordered by creation date descending (newest first)
    expect(result[0].name).toEqual('Office Supplies Co'); // Created second, should be first
    expect(result[1].name).toEqual('Tech Solutions Inc'); // Created first, should be second
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
  });

  it('should handle multiple suppliers with same creation time', async () => {
    // Insert multiple suppliers in same transaction (same timestamp)
    await db.insert(suppliersTable).values([
      testSupplier1,
      testSupplier2,
      minimalSupplier
    ]).execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(3);
    
    // All should have valid data regardless of order
    result.forEach(supplier => {
      expect(supplier.id).toBeDefined();
      expect(supplier.name).toBeDefined();
      expect(supplier.created_at).toBeInstanceOf(Date);
      expect(supplier.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should maintain data consistency across multiple calls', async () => {
    // Create test data
    await db.insert(suppliersTable).values([
      testSupplier1,
      testSupplier2
    ]).execute();

    // Call function multiple times
    const result1 = await getSuppliers();
    const result2 = await getSuppliers();
    const result3 = await getSuppliers();

    // All calls should return same data
    expect(result1).toHaveLength(2);
    expect(result2).toHaveLength(2);
    expect(result3).toHaveLength(2);

    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });
});