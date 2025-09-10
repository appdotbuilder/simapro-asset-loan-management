import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  createCategoryInputSchema,
  updateCategoryInputSchema,
  createLocationInputSchema,
  updateLocationInputSchema,
  createSupplierInputSchema,
  updateSupplierInputSchema,
  createAssetInputSchema,
  updateAssetInputSchema,
  assetSearchInputSchema,
  createLoanRequestInputSchema,
  updateLoanRequestInputSchema,
  createDamageReportInputSchema,
  updateDamageReportInputSchema,
  createMaintenanceRecordInputSchema,
  updateMaintenanceRecordInputSchema
} from './schema';

// Import handlers
import { getDashboardStats } from './handlers/get_dashboard_stats';
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { updateCategory } from './handlers/update_category';
import { createLocation } from './handlers/create_location';
import { getLocations } from './handlers/get_locations';
import { updateLocation } from './handlers/update_location';
import { createSupplier } from './handlers/create_supplier';
import { getSuppliers } from './handlers/get_suppliers';
import { updateSupplier } from './handlers/update_supplier';
import { createAsset } from './handlers/create_asset';
import { getAssets } from './handlers/get_assets';
import { searchAssets } from './handlers/search_assets';
import { getAssetById } from './handlers/get_asset_by_id';
import { getAssetByQrCode } from './handlers/get_asset_by_qr_code';
import { updateAsset } from './handlers/update_asset';
import { createLoanRequest } from './handlers/create_loan_request';
import { getLoanRequests } from './handlers/get_loan_requests';
import { getUserLoanHistory } from './handlers/get_user_loan_history';
import { updateLoanRequest } from './handlers/update_loan_request';
import { createDamageReport } from './handlers/create_damage_report';
import { getDamageReports } from './handlers/get_damage_reports';
import { updateDamageReport } from './handlers/update_damage_report';
import { createMaintenanceRecord } from './handlers/create_maintenance_record';
import { getMaintenanceRecords } from './handlers/get_maintenance_records';
import { updateMaintenanceRecord } from './handlers/update_maintenance_record';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Dashboard
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),

  // User Management (Admin only)
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Category Management (Admin only)
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),
  
  getCategories: publicProcedure
    .query(() => getCategories()),
  
  updateCategory: publicProcedure
    .input(updateCategoryInputSchema)
    .mutation(({ input }) => updateCategory(input)),

  // Location Management (Admin only)
  createLocation: publicProcedure
    .input(createLocationInputSchema)
    .mutation(({ input }) => createLocation(input)),
  
  getLocations: publicProcedure
    .query(() => getLocations()),
  
  updateLocation: publicProcedure
    .input(updateLocationInputSchema)
    .mutation(({ input }) => updateLocation(input)),

  // Supplier Management (Admin only)
  createSupplier: publicProcedure
    .input(createSupplierInputSchema)
    .mutation(({ input }) => createSupplier(input)),
  
  getSuppliers: publicProcedure
    .query(() => getSuppliers()),
  
  updateSupplier: publicProcedure
    .input(updateSupplierInputSchema)
    .mutation(({ input }) => updateSupplier(input)),

  // Asset Management (Admin/Petugas Sarpras)
  createAsset: publicProcedure
    .input(createAssetInputSchema)
    .mutation(({ input }) => createAsset(input)),
  
  getAssets: publicProcedure
    .query(() => getAssets()),
  
  searchAssets: publicProcedure
    .input(assetSearchInputSchema)
    .query(({ input }) => searchAssets(input)),
  
  getAssetById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getAssetById(input.id)),
  
  getAssetByQrCode: publicProcedure
    .input(z.object({ qrCode: z.string() }))
    .query(({ input }) => getAssetByQrCode(input.qrCode)),
  
  updateAsset: publicProcedure
    .input(updateAssetInputSchema)
    .mutation(({ input }) => updateAsset(input)),

  // Loan Request Management
  createLoanRequest: publicProcedure
    .input(createLoanRequestInputSchema.extend({ userId: z.number() }))
    .mutation(({ input }) => createLoanRequest(input, input.userId)),
  
  getLoanRequests: publicProcedure
    .query(() => getLoanRequests()),
  
  getUserLoanHistory: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserLoanHistory(input.userId)),
  
  updateLoanRequest: publicProcedure
    .input(updateLoanRequestInputSchema.extend({ approverId: z.number().optional() }))
    .mutation(({ input }) => updateLoanRequest(input, input.approverId)),

  // Damage Report Management
  createDamageReport: publicProcedure
    .input(createDamageReportInputSchema.extend({ reporterId: z.number() }))
    .mutation(({ input }) => createDamageReport(input, input.reporterId)),
  
  getDamageReports: publicProcedure
    .query(() => getDamageReports()),
  
  updateDamageReport: publicProcedure
    .input(updateDamageReportInputSchema.extend({ resolverId: z.number().optional() }))
    .mutation(({ input }) => updateDamageReport(input, input.resolverId)),

  // Maintenance Management
  createMaintenanceRecord: publicProcedure
    .input(createMaintenanceRecordInputSchema.extend({ creatorId: z.number() }))
    .mutation(({ input }) => createMaintenanceRecord(input, input.creatorId)),
  
  getMaintenanceRecords: publicProcedure
    .query(() => getMaintenanceRecords()),
  
  updateMaintenanceRecord: publicProcedure
    .input(updateMaintenanceRecordInputSchema)
    .mutation(({ input }) => updateMaintenanceRecord(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`SIMAPRO TRPC server listening at port: ${port}`);
  console.log('Asset and Loan Management System API ready');
}

start();