import { z } from 'zod';

// Enums for various status types
export const userRoleSchema = z.enum(['admin', 'petugas_sarpras', 'user']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const assetStatusSchema = z.enum(['available', 'borrowed', 'under_repair', 'damaged', 'deleted']);
export type AssetStatus = z.infer<typeof assetStatusSchema>;

export const loanRequestStatusSchema = z.enum(['pending_approval', 'approved', 'rejected', 'completed']);
export type LoanRequestStatus = z.infer<typeof loanRequestStatusSchema>;

export const maintenanceStatusSchema = z.enum(['scheduled', 'in_progress', 'completed']);
export type MaintenanceStatus = z.infer<typeof maintenanceStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string(),
  role: userRoleSchema,
  is_active: z.boolean().default(true)
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  full_name: z.string().optional(),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional()
});
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Category = z.infer<typeof categorySchema>;

export const createCategoryInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable()
});
export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const updateCategoryInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().nullable().optional()
});
export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

// Location schema
export const locationSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Location = z.infer<typeof locationSchema>;

export const createLocationInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable()
});
export type CreateLocationInput = z.infer<typeof createLocationInputSchema>;

export const updateLocationInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().nullable().optional()
});
export type UpdateLocationInput = z.infer<typeof updateLocationInputSchema>;

// Supplier schema
export const supplierSchema = z.object({
  id: z.number(),
  name: z.string(),
  contact_person: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Supplier = z.infer<typeof supplierSchema>;

export const createSupplierInputSchema = z.object({
  name: z.string(),
  contact_person: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable()
});
export type CreateSupplierInput = z.infer<typeof createSupplierInputSchema>;

export const updateSupplierInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  contact_person: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional()
});
export type UpdateSupplierInput = z.infer<typeof updateSupplierInputSchema>;

// Asset schema
export const assetSchema = z.object({
  id: z.number(),
  asset_code: z.string(),
  name: z.string(),
  photos: z.array(z.string()),
  category_id: z.number(),
  brand: z.string().nullable(),
  serial_number: z.string().nullable(),
  specification: z.string().nullable(),
  location_id: z.number(),
  supplier_id: z.number().nullable(),
  purchase_date: z.coerce.date().nullable(),
  purchase_price: z.number().nullable(),
  status: assetStatusSchema,
  qr_code: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type Asset = z.infer<typeof assetSchema>;

export const createAssetInputSchema = z.object({
  name: z.string(),
  photos: z.array(z.string()).default([]),
  category_id: z.number(),
  brand: z.string().nullable(),
  serial_number: z.string().nullable(),
  specification: z.string().nullable(),
  location_id: z.number(),
  supplier_id: z.number().nullable(),
  purchase_date: z.coerce.date().nullable(),
  purchase_price: z.number().positive().nullable(),
  status: assetStatusSchema.default('available')
});
export type CreateAssetInput = z.infer<typeof createAssetInputSchema>;

export const updateAssetInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  photos: z.array(z.string()).optional(),
  category_id: z.number().optional(),
  brand: z.string().nullable().optional(),
  serial_number: z.string().nullable().optional(),
  specification: z.string().nullable().optional(),
  location_id: z.number().optional(),
  supplier_id: z.number().nullable().optional(),
  purchase_date: z.coerce.date().nullable().optional(),
  purchase_price: z.number().positive().nullable().optional(),
  status: assetStatusSchema.optional()
});
export type UpdateAssetInput = z.infer<typeof updateAssetInputSchema>;

// Loan Request schema
export const loanRequestSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  asset_id: z.number(),
  purpose: z.string(),
  borrow_date: z.coerce.date(),
  return_date: z.coerce.date(),
  status: loanRequestStatusSchema,
  approved_by: z.number().nullable(),
  approved_at: z.coerce.date().nullable(),
  handover_date: z.coerce.date().nullable(),
  actual_return_date: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type LoanRequest = z.infer<typeof loanRequestSchema>;

export const createLoanRequestInputSchema = z.object({
  asset_id: z.number(),
  purpose: z.string(),
  borrow_date: z.coerce.date(),
  return_date: z.coerce.date(),
  notes: z.string().nullable()
});
export type CreateLoanRequestInput = z.infer<typeof createLoanRequestInputSchema>;

export const updateLoanRequestInputSchema = z.object({
  id: z.number(),
  status: loanRequestStatusSchema.optional(),
  approved_by: z.number().nullable().optional(),
  handover_date: z.coerce.date().nullable().optional(),
  actual_return_date: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional()
});
export type UpdateLoanRequestInput = z.infer<typeof updateLoanRequestInputSchema>;

// Damage Report schema
export const damageReportSchema = z.object({
  id: z.number(),
  asset_id: z.number(),
  reported_by: z.number(),
  loan_request_id: z.number().nullable(),
  description: z.string(),
  photos: z.array(z.string()),
  severity: z.enum(['minor', 'major', 'critical']),
  is_resolved: z.boolean(),
  resolution_notes: z.string().nullable(),
  resolved_by: z.number().nullable(),
  resolved_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type DamageReport = z.infer<typeof damageReportSchema>;

export const createDamageReportInputSchema = z.object({
  asset_id: z.number(),
  loan_request_id: z.number().nullable(),
  description: z.string(),
  photos: z.array(z.string()).default([]),
  severity: z.enum(['minor', 'major', 'critical'])
});
export type CreateDamageReportInput = z.infer<typeof createDamageReportInputSchema>;

export const updateDamageReportInputSchema = z.object({
  id: z.number(),
  is_resolved: z.boolean().optional(),
  resolution_notes: z.string().nullable().optional()
});
export type UpdateDamageReportInput = z.infer<typeof updateDamageReportInputSchema>;

// Maintenance Record schema
export const maintenanceRecordSchema = z.object({
  id: z.number(),
  asset_id: z.number(),
  maintenance_type: z.enum(['preventive', 'corrective', 'emergency']),
  description: z.string(),
  scheduled_date: z.coerce.date(),
  completed_date: z.coerce.date().nullable(),
  status: maintenanceStatusSchema,
  cost: z.number().nullable(),
  performed_by: z.string().nullable(),
  notes: z.string().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type MaintenanceRecord = z.infer<typeof maintenanceRecordSchema>;

export const createMaintenanceRecordInputSchema = z.object({
  asset_id: z.number(),
  maintenance_type: z.enum(['preventive', 'corrective', 'emergency']),
  description: z.string(),
  scheduled_date: z.coerce.date(),
  cost: z.number().nullable(),
  performed_by: z.string().nullable(),
  notes: z.string().nullable()
});
export type CreateMaintenanceRecordInput = z.infer<typeof createMaintenanceRecordInputSchema>;

export const updateMaintenanceRecordInputSchema = z.object({
  id: z.number(),
  completed_date: z.coerce.date().nullable().optional(),
  status: maintenanceStatusSchema.optional(),
  cost: z.number().nullable().optional(),
  performed_by: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});
export type UpdateMaintenanceRecordInput = z.infer<typeof updateMaintenanceRecordInputSchema>;

// Asset search and filter schema
export const assetSearchInputSchema = z.object({
  search: z.string().optional(),
  category_id: z.number().optional(),
  location_id: z.number().optional(),
  status: assetStatusSchema.optional(),
  available_only: z.boolean().default(false)
});
export type AssetSearchInput = z.infer<typeof assetSearchInputSchema>;

// Dashboard data schema
export const dashboardStatsSchema = z.object({
  total_assets: z.number(),
  available_assets: z.number(),
  borrowed_assets: z.number(),
  pending_requests: z.number(),
  assets_under_repair: z.number(),
  damaged_assets: z.number()
});
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// User loan history schema
export const userLoanHistorySchema = z.object({
  current_loans: z.array(loanRequestSchema),
  loan_history: z.array(loanRequestSchema),
  pending_requests: z.array(loanRequestSchema)
});
export type UserLoanHistory = z.infer<typeof userLoanHistorySchema>;