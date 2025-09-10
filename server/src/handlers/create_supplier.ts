import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type CreateSupplierInput, type Supplier } from '../schema';

export const createSupplier = async (input: CreateSupplierInput): Promise<Supplier> => {
  try {
    // Insert supplier record
    const result = await db.insert(suppliersTable)
      .values({
        name: input.name,
        contact_person: input.contact_person,
        phone: input.phone,
        email: input.email,
        address: input.address
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Supplier creation failed:', error);
    throw error;
  }
};