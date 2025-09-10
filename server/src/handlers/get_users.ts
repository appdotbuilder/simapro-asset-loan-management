import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';

export const getUsers = async (): Promise<User[]> => {
  try {
    const results = await db.select()
      .from(usersTable)
      .execute();

    return results.map(user => ({
      ...user,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    }));
  } catch (error) {
    console.error('Get users failed:', error);
    throw error;
  }
};