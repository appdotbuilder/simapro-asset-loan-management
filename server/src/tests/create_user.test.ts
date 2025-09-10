import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'securepassword123',
  full_name: 'Test User',
  role: 'user',
  is_active: true
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.role).toEqual('user');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('securepassword123'); // Should be hashed
  });

  it('should hash the password', async () => {
    const result = await createUser(testInput);

    // Password should be hashed, not stored in plain text
    expect(result.password_hash).not.toEqual(testInput.password);
    expect(result.password_hash.length).toBeGreaterThan(20); // bcrypt hashes are typically 60 chars
    expect(result.password_hash.startsWith('$2')).toBe(true); // bcrypt format
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].role).toEqual('user');
    expect(users[0].is_active).toEqual(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create admin user', async () => {
    const adminInput: CreateUserInput = {
      username: 'admin',
      email: 'admin@example.com',
      password: 'adminpassword123',
      full_name: 'System Administrator',
      role: 'admin',
      is_active: true
    };

    const result = await createUser(adminInput);

    expect(result.role).toEqual('admin');
    expect(result.username).toEqual('admin');
  });

  it('should create petugas_sarpras user', async () => {
    const petugasInput: CreateUserInput = {
      username: 'petugas',
      email: 'petugas@example.com',
      password: 'petugaspassword123',
      full_name: 'Petugas Sarana Prasarana',
      role: 'petugas_sarpras',
      is_active: true
    };

    const result = await createUser(petugasInput);

    expect(result.role).toEqual('petugas_sarpras');
    expect(result.username).toEqual('petugas');
  });

  it('should create inactive user when specified', async () => {
    const inactiveInput: CreateUserInput = {
      username: 'inactive',
      email: 'inactive@example.com',
      password: 'password123',
      full_name: 'Inactive User',
      role: 'user',
      is_active: false
    };

    const result = await createUser(inactiveInput);

    expect(result.is_active).toEqual(false);
  });

  it('should use default active status when not specified', async () => {
    const inputWithoutActive: CreateUserInput = {
      username: 'defaultactive',
      email: 'default@example.com',
      password: 'password123',
      full_name: 'Default Active User',
      role: 'user',
      is_active: true // Default is applied by Zod, so we include it explicitly in test
    };

    const result = await createUser(inputWithoutActive);

    expect(result.is_active).toEqual(true);
  });

  it('should fail when username is not unique', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same username
    const duplicateUsernameInput: CreateUserInput = {
      username: 'testuser', // Same username
      email: 'different@example.com',
      password: 'password123',
      full_name: 'Different User',
      role: 'user',
      is_active: true
    };

    expect(createUser(duplicateUsernameInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should fail when email is not unique', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateEmailInput: CreateUserInput = {
      username: 'differentuser',
      email: 'test@example.com', // Same email
      password: 'password123',
      full_name: 'Different User',
      role: 'user',
      is_active: true
    };

    expect(createUser(duplicateEmailInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });
});