import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

// Test user data
const testUsers: CreateUserInput[] = [
  {
    username: 'admin_user',
    email: 'admin@example.com',
    password: 'password123',
    full_name: 'Admin User',
    role: 'admin',
    is_active: true
  },
  {
    username: 'sarpras_user',
    email: 'sarpras@example.com',
    password: 'password123',
    full_name: 'Sarpras User',
    role: 'petugas_sarpras',
    is_active: true
  },
  {
    username: 'regular_user',
    email: 'user@example.com',
    password: 'password123',
    full_name: 'Regular User',
    role: 'user',
    is_active: false
  }
];

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    
    expect(result).toEqual([]);
  });

  it('should return all users from database', async () => {
    // Create test users
    for (const user of testUsers) {
      await db.insert(usersTable).values({
        username: user.username,
        email: user.email,
        password_hash: 'hashed_' + user.password,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active
      }).execute();
    }

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Check admin user
    const adminUser = result.find(u => u.username === 'admin_user');
    expect(adminUser).toBeDefined();
    expect(adminUser!.email).toBe('admin@example.com');
    expect(adminUser!.full_name).toBe('Admin User');
    expect(adminUser!.role).toBe('admin');
    expect(adminUser!.is_active).toBe(true);
    expect(adminUser!.id).toBeDefined();
    expect(adminUser!.created_at).toBeInstanceOf(Date);
    expect(adminUser!.updated_at).toBeInstanceOf(Date);
    expect(adminUser!.password_hash).toMatch(/^hashed_/);

    // Check sarpras user
    const sarprasUser = result.find(u => u.username === 'sarpras_user');
    expect(sarprasUser).toBeDefined();
    expect(sarprasUser!.role).toBe('petugas_sarpras');
    expect(sarprasUser!.is_active).toBe(true);

    // Check regular user
    const regularUser = result.find(u => u.username === 'regular_user');
    expect(regularUser).toBeDefined();
    expect(regularUser!.role).toBe('user');
    expect(regularUser!.is_active).toBe(false);
  });

  it('should return users with correct field types', async () => {
    await db.insert(usersTable).values({
      username: 'test_user',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      full_name: 'Test User',
      role: 'user',
      is_active: true
    }).execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];
    
    expect(typeof user.id).toBe('number');
    expect(typeof user.username).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.password_hash).toBe('string');
    expect(typeof user.full_name).toBe('string');
    expect(typeof user.role).toBe('string');
    expect(typeof user.is_active).toBe('boolean');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should preserve database order', async () => {
    // Create users in specific order
    const usernames = ['user_1', 'user_2', 'user_3'];
    
    for (let i = 0; i < usernames.length; i++) {
      await db.insert(usersTable).values({
        username: usernames[i],
        email: `${usernames[i]}@example.com`,
        password_hash: 'hashed_password',
        full_name: `User ${i + 1}`,
        role: 'user',
        is_active: true
      }).execute();
    }

    const result = await getUsers();

    expect(result).toHaveLength(3);
    // Users should be returned in creation order (by id)
    expect(result[0].username).toBe('user_1');
    expect(result[1].username).toBe('user_2');
    expect(result[2].username).toBe('user_3');
  });

  it('should handle users with all role types', async () => {
    const roles = ['admin', 'petugas_sarpras', 'user'] as const;
    
    for (let i = 0; i < roles.length; i++) {
      await db.insert(usersTable).values({
        username: `user_${roles[i]}`,
        email: `${roles[i]}@example.com`,
        password_hash: 'hashed_password',
        full_name: `${roles[i]} User`,
        role: roles[i],
        is_active: true
      }).execute();
    }

    const result = await getUsers();

    expect(result).toHaveLength(3);
    expect(result.some(u => u.role === 'admin')).toBe(true);
    expect(result.some(u => u.role === 'petugas_sarpras')).toBe(true);
    expect(result.some(u => u.role === 'user')).toBe(true);
  });

  it('should include both active and inactive users', async () => {
    await db.insert(usersTable).values([
      {
        username: 'active_user',
        email: 'active@example.com',
        password_hash: 'hashed_password',
        full_name: 'Active User',
        role: 'user',
        is_active: true
      },
      {
        username: 'inactive_user',
        email: 'inactive@example.com',
        password_hash: 'hashed_password',
        full_name: 'Inactive User',
        role: 'user',
        is_active: false
      }
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    expect(result.some(u => u.is_active === true)).toBe(true);
    expect(result.some(u => u.is_active === false)).toBe(true);
  });
});