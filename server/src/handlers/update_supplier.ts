import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type UpdateSupplierInput, type Supplier } from '../schema';
import { eq } from 'drizzle-orm';

export const updateSupplier = async (input: UpdateSupplierInput): Promise<Supplier> => {
  try {
    // Check if supplier exists
    const existingSupplier = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, input.id))
      .execute();

    if (existingSupplier.length === 0) {
      throw new Error(`Supplier with id ${input.id} not found`);
    }

    // Build update data object, only including provided fields
    const updateData: Partial<typeof suppliersTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.contact_person !== undefined) {
      updateData.contact_person = input.contact_person;
    }

    if (input.phone !== undefined) {
      updateData.phone = input.phone;
    }

    if (input.email !== undefined) {
      updateData.email = input.email;
    }

    if (input.address !== undefined) {
      updateData.address = input.address;
    }

    // Update supplier record
    const result = await db.update(suppliersTable)
      .set(updateData)
      .where(eq(suppliersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Supplier update failed:', error);
    throw error;
  }
};