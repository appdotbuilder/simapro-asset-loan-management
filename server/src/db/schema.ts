import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean, 
  varchar,
  pgEnum,
  json,
  date
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'petugas_sarpras', 'user']);
export const assetStatusEnum = pgEnum('asset_status', ['available', 'borrowed', 'under_repair', 'damaged', 'deleted']);
export const loanRequestStatusEnum = pgEnum('loan_request_status', ['pending_approval', 'approved', 'rejected', 'completed']);
export const maintenanceStatusEnum = pgEnum('maintenance_status', ['scheduled', 'in_progress', 'completed']);
export const damageSeverityEnum = pgEnum('damage_severity', ['minor', 'major', 'critical']);
export const maintenanceTypeEnum = pgEnum('maintenance_type', ['preventive', 'corrective', 'emergency']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: varchar('full_name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Locations table
export const locationsTable = pgTable('locations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Suppliers table
export const suppliersTable = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  contact_person: varchar('contact_person', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Assets table
export const assetsTable = pgTable('assets', {
  id: serial('id').primaryKey(),
  asset_code: varchar('asset_code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  photos: json('photos').$type<string[]>().notNull().default([]),
  category_id: integer('category_id').notNull().references(() => categoriesTable.id),
  brand: varchar('brand', { length: 100 }),
  serial_number: varchar('serial_number', { length: 100 }),
  specification: text('specification'),
  location_id: integer('location_id').notNull().references(() => locationsTable.id),
  supplier_id: integer('supplier_id').references(() => suppliersTable.id),
  purchase_date: date('purchase_date'),
  purchase_price: numeric('purchase_price', { precision: 15, scale: 2 }),
  status: assetStatusEnum('status').notNull().default('available'),
  qr_code: text('qr_code').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Loan Requests table
export const loanRequestsTable = pgTable('loan_requests', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  asset_id: integer('asset_id').notNull().references(() => assetsTable.id),
  purpose: text('purpose').notNull(),
  borrow_date: timestamp('borrow_date').notNull(),
  return_date: timestamp('return_date').notNull(),
  status: loanRequestStatusEnum('status').notNull().default('pending_approval'),
  approved_by: integer('approved_by').references(() => usersTable.id),
  approved_at: timestamp('approved_at'),
  handover_date: timestamp('handover_date'),
  actual_return_date: timestamp('actual_return_date'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Damage Reports table
export const damageReportsTable = pgTable('damage_reports', {
  id: serial('id').primaryKey(),
  asset_id: integer('asset_id').notNull().references(() => assetsTable.id),
  reported_by: integer('reported_by').notNull().references(() => usersTable.id),
  loan_request_id: integer('loan_request_id').references(() => loanRequestsTable.id),
  description: text('description').notNull(),
  photos: json('photos').$type<string[]>().notNull().default([]),
  severity: damageSeverityEnum('severity').notNull(),
  is_resolved: boolean('is_resolved').notNull().default(false),
  resolution_notes: text('resolution_notes'),
  resolved_by: integer('resolved_by').references(() => usersTable.id),
  resolved_at: timestamp('resolved_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Maintenance Records table
export const maintenanceRecordsTable = pgTable('maintenance_records', {
  id: serial('id').primaryKey(),
  asset_id: integer('asset_id').notNull().references(() => assetsTable.id),
  maintenance_type: maintenanceTypeEnum('maintenance_type').notNull(),
  description: text('description').notNull(),
  scheduled_date: timestamp('scheduled_date').notNull(),
  completed_date: timestamp('completed_date'),
  status: maintenanceStatusEnum('status').notNull().default('scheduled'),
  cost: numeric('cost', { precision: 15, scale: 2 }),
  performed_by: varchar('performed_by', { length: 255 }),
  notes: text('notes'),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  loanRequests: many(loanRequestsTable),
  damageReports: many(damageReportsTable),
  maintenanceRecords: many(maintenanceRecordsTable),
  approvedLoanRequests: many(loanRequestsTable, { relationName: 'approvedBy' }),
  resolvedDamageReports: many(damageReportsTable, { relationName: 'resolvedBy' })
}));

export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  assets: many(assetsTable)
}));

export const locationsRelations = relations(locationsTable, ({ many }) => ({
  assets: many(assetsTable)
}));

export const suppliersRelations = relations(suppliersTable, ({ many }) => ({
  assets: many(assetsTable)
}));

export const assetsRelations = relations(assetsTable, ({ one, many }) => ({
  category: one(categoriesTable, {
    fields: [assetsTable.category_id],
    references: [categoriesTable.id]
  }),
  location: one(locationsTable, {
    fields: [assetsTable.location_id],
    references: [locationsTable.id]
  }),
  supplier: one(suppliersTable, {
    fields: [assetsTable.supplier_id],
    references: [suppliersTable.id]
  }),
  loanRequests: many(loanRequestsTable),
  damageReports: many(damageReportsTable),
  maintenanceRecords: many(maintenanceRecordsTable)
}));

export const loanRequestsRelations = relations(loanRequestsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [loanRequestsTable.user_id],
    references: [usersTable.id]
  }),
  asset: one(assetsTable, {
    fields: [loanRequestsTable.asset_id],
    references: [assetsTable.id]
  }),
  approvedBy: one(usersTable, {
    fields: [loanRequestsTable.approved_by],
    references: [usersTable.id],
    relationName: 'approvedBy'
  })
}));

export const damageReportsRelations = relations(damageReportsTable, ({ one }) => ({
  asset: one(assetsTable, {
    fields: [damageReportsTable.asset_id],
    references: [assetsTable.id]
  }),
  reportedBy: one(usersTable, {
    fields: [damageReportsTable.reported_by],
    references: [usersTable.id]
  }),
  loanRequest: one(loanRequestsTable, {
    fields: [damageReportsTable.loan_request_id],
    references: [loanRequestsTable.id]
  }),
  resolvedBy: one(usersTable, {
    fields: [damageReportsTable.resolved_by],
    references: [usersTable.id],
    relationName: 'resolvedBy'
  })
}));

export const maintenanceRecordsRelations = relations(maintenanceRecordsTable, ({ one }) => ({
  asset: one(assetsTable, {
    fields: [maintenanceRecordsTable.asset_id],
    references: [assetsTable.id]
  }),
  createdBy: one(usersTable, {
    fields: [maintenanceRecordsTable.created_by],
    references: [usersTable.id]
  })
}));

// Export all tables for drizzle integration
export const tables = {
  users: usersTable,
  categories: categoriesTable,
  locations: locationsTable,
  suppliers: suppliersTable,
  assets: assetsTable,
  loanRequests: loanRequestsTable,
  damageReports: damageReportsTable,
  maintenanceRecords: maintenanceRecordsTable
};