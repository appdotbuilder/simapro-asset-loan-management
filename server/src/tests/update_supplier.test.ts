import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type CreateSupplierInput, type UpdateSupplierInput } from '../schema';
import { updateSupplier } from '../handlers/update_supplier';
import { eq } from 'drizzle-orm';

// Test supplier data
const testSupplierInput: CreateSupplierInput = {
  name: 'Test Supplier',
  contact_person: 'John Doe',
  phone: '+1234567890',
  email: 'john@testsupplier.com',
  address: '123 Test Street, Test City'
};

const createTestSupplier = async (data: CreateSupplierInput) => {
  const result = await db.insert(suppliersTable)
    .values({
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    })
    .returning()
    .execute();
  return result[0];
};

describe('updateSupplier', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update supplier name', async () => {
    // Create test supplier
    const createdSupplier = await createTestSupplier(testSupplierInput);

    const updateInput: UpdateSupplierInput = {
      id: createdSupplier.id,
      name: 'Updated Supplier Name'
    };

    const result = await updateSupplier(updateInput);

    expect(result.id).toEqual(createdSupplier.id);
    expect(result.name).toEqual('Updated Supplier Name');
    expect(result.contact_person).toEqual(testSupplierInput.contact_person);
    expect(result.phone).toEqual(testSupplierInput.phone);
    expect(result.email).toEqual(testSupplierInput.email);
    expect(result.address).toEqual(testSupplierInput.address);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
  });

  it('should update supplier contact information', async () => {
    // Create test supplier
    const createdSupplier = await createTestSupplier(testSupplierInput);

    const updateInput: UpdateSupplierInput = {
      id: createdSupplier.id,
      contact_person: 'Jane Smith',
      phone: '+0987654321',
      email: 'jane@newsupplier.com'
    };

    const result = await updateSupplier(updateInput);

    expect(result.id).toEqual(createdSupplier.id);
    expect(result.name).toEqual(testSupplierInput.name);
    expect(result.contact_person).toEqual('Jane Smith');
    expect(result.phone).toEqual('+0987654321');
    expect(result.email).toEqual('jane@newsupplier.com');
    expect(result.address).toEqual(testSupplierInput.address);
  });

  it('should update supplier address', async () => {
    // Create test supplier
    const createdSupplier = await createTestSupplier(testSupplierInput);

    const updateInput: UpdateSupplierInput = {
      id: createdSupplier.id,
      address: '456 New Address, New City, New State'
    };

    const result = await updateSupplier(updateInput);

    expect(result.id).toEqual(createdSupplier.id);
    expect(result.address).toEqual('456 New Address, New City, New State');
    expect(result.name).toEqual(testSupplierInput.name);
    expect(result.contact_person).toEqual(testSupplierInput.contact_person);
  });

  it('should update multiple fields at once', async () => {
    // Create test supplier
    const createdSupplier = await createTestSupplier(testSupplierInput);

    const updateInput: UpdateSupplierInput = {
      id: createdSupplier.id,
      name: 'Completely New Supplier',
      contact_person: 'New Contact Person',
      phone: '+1111111111',
      email: 'new@supplier.com',
      address: 'New Address'
    };

    const result = await updateSupplier(updateInput);

    expect(result.id).toEqual(createdSupplier.id);
    expect(result.name).toEqual('Completely New Supplier');
    expect(result.contact_person).toEqual('New Contact Person');
    expect(result.phone).toEqual('+1111111111');
    expect(result.email).toEqual('new@supplier.com');
    expect(result.address).toEqual('New Address');
  });

  it('should handle null values for optional fields', async () => {
    // Create test supplier
    const createdSupplier = await createTestSupplier(testSupplierInput);

    const updateInput: UpdateSupplierInput = {
      id: createdSupplier.id,
      contact_person: null,
      phone: null,
      email: null,
      address: null
    };

    const result = await updateSupplier(updateInput);

    expect(result.id).toEqual(createdSupplier.id);
    expect(result.name).toEqual(testSupplierInput.name); // Should remain unchanged
    expect(result.contact_person).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
    expect(result.address).toBeNull();
  });

  it('should save updates to database', async () => {
    // Create test supplier
    const createdSupplier = await createTestSupplier(testSupplierInput);

    const updateInput: UpdateSupplierInput = {
      id: createdSupplier.id,
      name: 'Database Updated Supplier'
    };

    await updateSupplier(updateInput);

    // Verify changes are persisted in database
    const suppliers = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, createdSupplier.id))
      .execute();

    expect(suppliers).toHaveLength(1);
    expect(suppliers[0].name).toEqual('Database Updated Supplier');
    expect(suppliers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when supplier does not exist', async () => {
    const updateInput: UpdateSupplierInput = {
      id: 999999, // Non-existent ID
      name: 'Non-existent Supplier'
    };

    await expect(updateSupplier(updateInput)).rejects.toThrow(/supplier with id 999999 not found/i);
  });

  it('should update only timestamp when no fields provided', async () => {
    // Create test supplier
    const createdSupplier = await createTestSupplier(testSupplierInput);

    const updateInput: UpdateSupplierInput = {
      id: createdSupplier.id
    };

    const result = await updateSupplier(updateInput);

    // All original data should remain the same
    expect(result.id).toEqual(createdSupplier.id);
    expect(result.name).toEqual(testSupplierInput.name);
    expect(result.contact_person).toEqual(testSupplierInput.contact_person);
    expect(result.phone).toEqual(testSupplierInput.phone);
    expect(result.email).toEqual(testSupplierInput.email);
    expect(result.address).toEqual(testSupplierInput.address);
    
    // But updated_at should be newer
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(createdSupplier.updated_at.getTime());
  });
});