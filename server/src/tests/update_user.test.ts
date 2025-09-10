import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';
import { randomBytes, pbkdf2Sync } from 'crypto';

// Helper function to create a test user
const createTestUser = async (): Promise<number> => {
  const testUserInput: CreateUserInput = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    full_name: 'Test User',
    role: 'user',
    is_active: true
  };

  // Hash password before insertion
  const salt = randomBytes(32).toString('hex');
  const hash = pbkdf2Sync(testUserInput.password, salt, 10000, 64, 'sha512').toString('hex');
  const password_hash = `${salt}:${hash}`;

  const result = await db.insert(usersTable)
    .values({
      username: testUserInput.username,
      email: testUserInput.email,
      password_hash: password_hash,
      full_name: testUserInput.full_name,
      role: testUserInput.role,
      is_active: testUserInput.is_active
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user username and email', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'updateduser',
      email: 'updated@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.username).toEqual('updateduser');
    expect(result.email).toEqual('updated@example.com');
    expect(result.full_name).toEqual('Test User'); // Unchanged
    expect(result.role).toEqual('user'); // Unchanged
    expect(result.is_active).toEqual(true); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user password and hash it correctly', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      password: 'newpassword123'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.username).toEqual('testuser'); // Unchanged
    expect(result.email).toEqual('test@example.com'); // Unchanged

    // Verify password was hashed and stored correctly
    const userInDB = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(userInDB).toHaveLength(1);
    expect(userInDB[0].password_hash).not.toEqual('newpassword123'); // Should be hashed
    expect(userInDB[0].password_hash).toContain(':'); // Should contain salt:hash format
    
    // Verify password can be validated
    const [storedSalt, storedHash] = userInDB[0].password_hash.split(':');
    const verifyHash = pbkdf2Sync('newpassword123', storedSalt, 10000, 64, 'sha512').toString('hex');
    expect(verifyHash).toEqual(storedHash);
  });

  it('should update user role and active status', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      role: 'admin',
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.role).toEqual('admin');
    expect(result.is_active).toEqual(false);
    expect(result.username).toEqual('testuser'); // Unchanged
    expect(result.email).toEqual('test@example.com'); // Unchanged
  });

  it('should update full name', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      full_name: 'Updated Full Name'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.full_name).toEqual('Updated Full Name');
    expect(result.username).toEqual('testuser'); // Unchanged
    expect(result.email).toEqual('test@example.com'); // Unchanged
    expect(result.role).toEqual('user'); // Unchanged
  });

  it('should update multiple fields at once', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'multiupdate',
      email: 'multi@example.com',
      full_name: 'Multi Update User',
      role: 'petugas_sarpras',
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.username).toEqual('multiupdate');
    expect(result.email).toEqual('multi@example.com');
    expect(result.full_name).toEqual('Multi Update User');
    expect(result.role).toEqual('petugas_sarpras');
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'dbcheck',
      email: 'dbcheck@example.com'
    };

    await updateUser(updateInput);

    // Verify changes are persisted in database
    const userInDB = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(userInDB).toHaveLength(1);
    expect(userInDB[0].username).toEqual('dbcheck');
    expect(userInDB[0].email).toEqual('dbcheck@example.com');
    expect(userInDB[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update updated_at timestamp even when no other fields change', async () => {
    const userId = await createTestUser();

    // Get initial updated_at
    const initialUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    const initialUpdatedAt = initialUser[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateUserInput = {
      id: userId
    };

    const result = await updateUser(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
  });

  it('should throw error when user not found', async () => {
    const nonExistentUserId = 99999;

    const updateInput: UpdateUserInput = {
      id: nonExistentUserId,
      username: 'nonexistent'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 99999 not found/);
  });

  it('should handle partial updates correctly', async () => {
    const userId = await createTestUser();

    // Update only username
    await updateUser({
      id: userId,
      username: 'partialupdate'
    });

    // Verify only username changed
    const userAfterUpdate = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(userAfterUpdate[0].username).toEqual('partialupdate');
    expect(userAfterUpdate[0].email).toEqual('test@example.com'); // Should remain unchanged
    expect(userAfterUpdate[0].full_name).toEqual('Test User'); // Should remain unchanged
  });
});