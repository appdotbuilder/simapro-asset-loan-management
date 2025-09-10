import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // Prepare the update object
    const updateData: any = {};
    
    // Only include fields that are provided in input
    if (input.username !== undefined) {
      updateData.username = input.username;
    }
    
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    
    if (input.password !== undefined) {
      // Hash the new password using crypto
      const salt = randomBytes(32).toString('hex');
      const hash = pbkdf2Sync(input.password, salt, 10000, 64, 'sha512').toString('hex');
      updateData.password_hash = `${salt}:${hash}`;
    }
    
    if (input.full_name !== undefined) {
      updateData.full_name = input.full_name;
    }
    
    if (input.role !== undefined) {
      updateData.role = input.role;
    }
    
    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update the user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    // Check if user was found and updated
    if (result.length === 0) {
      throw new Error(`User with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};