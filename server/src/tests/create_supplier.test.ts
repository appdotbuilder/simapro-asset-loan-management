import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type CreateSupplierInput } from '../schema';
import { createSupplier } from '../handlers/create_supplier';
import { eq } from 'drizzle-orm';

// Complete test input with all fields
const testInput: CreateSupplierInput = {
  name: 'Tech Solutions Inc',
  contact_person: 'John Doe',
  phone: '+1-234-567-8900',
  email: 'john.doe@techsolutions.com',
  address: '123 Business St, Tech City, TC 12345'
};

// Minimal test input (only required fields)
const minimalInput: CreateSupplierInput = {
  name: 'Minimal Supplier',
  contact_person: null,
  phone: null,
  email: null,
  address: null
};

describe('createSupplier', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a supplier with complete information', async () => {
    const result = await createSupplier(testInput);

    // Basic field validation
    expect(result.name).toEqual('Tech Solutions Inc');
    expect(result.contact_person).toEqual('John Doe');
    expect(result.phone).toEqual('+1-234-567-8900');
    expect(result.email).toEqual('john.doe@techsolutions.com');
    expect(result.address).toEqual('123 Business St, Tech City, TC 12345');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a supplier with minimal information', async () => {
    const result = await createSupplier(minimalInput);

    // Basic field validation
    expect(result.name).toEqual('Minimal Supplier');
    expect(result.contact_person).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.address).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save supplier to database', async () => {
    const result = await createSupplier(testInput);

    // Query database to verify the supplier was saved
    const suppliers = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, result.id))
      .execute();

    expect(suppliers).toHaveLength(1);
    expect(suppliers[0].name).toEqual('Tech Solutions Inc');
    expect(suppliers[0].contact_person).toEqual('John Doe');
    expect(suppliers[0].phone).toEqual('+1-234-567-8900');
    expect(suppliers[0].email).toEqual('john.doe@techsolutions.com');
    expect(suppliers[0].address).toEqual('123 Business St, Tech City, TC 12345');
    expect(suppliers[0].created_at).toBeInstanceOf(Date);
    expect(suppliers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle multiple suppliers with different names', async () => {
    const supplier1 = await createSupplier({
      name: 'Supplier One',
      contact_person: 'Contact One',
      phone: '111-111-1111',
      email: 'one@supplier.com',
      address: 'Address One'
    });

    const supplier2 = await createSupplier({
      name: 'Supplier Two',
      contact_person: 'Contact Two',
      phone: '222-222-2222',
      email: 'two@supplier.com',
      address: 'Address Two'
    });

    // Verify both suppliers were created with different IDs
    expect(supplier1.id).not.toEqual(supplier2.id);
    expect(supplier1.name).toEqual('Supplier One');
    expect(supplier2.name).toEqual('Supplier Two');

    // Verify both are in database
    const allSuppliers = await db.select()
      .from(suppliersTable)
      .execute();

    expect(allSuppliers).toHaveLength(2);
  });

  it('should handle suppliers with same contact info but different names', async () => {
    // This tests that we can have suppliers with same contact details
    // but different company names (common in business scenarios)
    const supplier1 = await createSupplier({
      name: 'Company A',
      contact_person: 'Shared Contact',
      phone: '555-555-5555',
      email: 'shared@contact.com',
      address: 'Shared Address'
    });

    const supplier2 = await createSupplier({
      name: 'Company B',
      contact_person: 'Shared Contact',
      phone: '555-555-5555',
      email: 'shared@contact.com',
      address: 'Shared Address'
    });

    expect(supplier1.name).toEqual('Company A');
    expect(supplier2.name).toEqual('Company B');
    expect(supplier1.id).not.toEqual(supplier2.id);
  });

  it('should create suppliers with null optional fields correctly', async () => {
    const result = await createSupplier({
      name: 'Name Only Supplier',
      contact_person: null,
      phone: null,
      email: null,
      address: null
    });

    // Verify null fields are handled properly
    expect(result.name).toEqual('Name Only Supplier');
    expect(result.contact_person).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.address).toBeNull();

    // Verify in database
    const suppliers = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, result.id))
      .execute();

    expect(suppliers[0].contact_person).toBeNull();
    expect(suppliers[0].phone).toBeNull();
    expect(suppliers[0].email).toBeNull();
    expect(suppliers[0].address).toBeNull();
  });
});