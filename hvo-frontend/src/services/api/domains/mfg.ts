import { api } from '../client';

export const mfgService = {
  listBranches: async () => (await api.get('/mfg/branches')).data,
  createBranch: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/branches', data)).data,
  updateBranch: async (id: number, data: Record<string, unknown>) =>
    (await api.put(`/mfg/branches/${id}`, data)).data,

  listWarehouses: async () => (await api.get('/mfg/warehouses')).data,
  updateWarehouse: async (id: number, data: Record<string, unknown>) =>
    (await api.put(`/mfg/warehouses/${id}`, data)).data,

  listBinLocations: async (params?: { warehouse_id?: number }) =>
    (await api.get('/mfg/bin-locations', { params })).data,
  createBinLocation: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/bin-locations', data)).data,

  listDocumentSequences: async () => (await api.get('/mfg/document-sequences')).data,
  upsertDocumentSequence: async (data: Record<string, unknown>) =>
    (await api.put('/mfg/document-sequences', data)).data,

  listPurchaseRequisitions: async (params?: { status?: string }) =>
    (await api.get('/mfg/purchase-requisitions', { params })).data,
  getPurchaseRequisition: async (id: number) =>
    (await api.get(`/mfg/purchase-requisitions/${id}`)).data,
  createPurchaseRequisition: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/purchase-requisitions', data)).data,
  submitPurchaseRequisition: async (id: number) =>
    (await api.post(`/mfg/purchase-requisitions/${id}/submit`)).data,
  approvePurchaseRequisition: async (id: number) =>
    (await api.post(`/mfg/purchase-requisitions/${id}/approve`)).data,
  rejectPurchaseRequisition: async (id: number, reason?: string) =>
    (await api.post(`/mfg/purchase-requisitions/${id}/reject`, { reason })).data,
  cancelPurchaseRequisition: async (id: number, reason?: string) =>
    (await api.post(`/mfg/purchase-requisitions/${id}/cancel`, { reason })).data,
  purchaseDashboard: async () => (await api.get('/mfg/purchase-dashboard')).data,

  listPurchaseOrders: async () => (await api.get('/mfg/purchase-orders')).data,
  getPurchaseOrder: async (id: number) => (await api.get(`/mfg/purchase-orders/${id}`)).data,
  createPurchaseOrder: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/purchase-orders', data)).data,
  approvePurchaseOrder: async (id: number) =>
    (await api.post(`/mfg/purchase-orders/${id}/approve`)).data,

  listGoodsReceipts: async () => (await api.get('/mfg/goods-receipts')).data,
  getGoodsReceipt: async (id: number) => (await api.get(`/mfg/goods-receipts/${id}`)).data,
  createGoodsReceipt: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/goods-receipts', data)).data,
  approveGoodsReceipt: async (id: number) =>
    (await api.post(`/mfg/goods-receipts/${id}/approve`)).data,

  listStockLedger: async (params?: { product_id?: number; warehouse_id?: number }) =>
    (await api.get('/mfg/stock-ledger', { params })).data,

  createQualityInspection: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/quality-inspections', data)).data,
  updateQualityInspection: async (id: number, data: Record<string, unknown>) =>
    (await api.put(`/mfg/quality-inspections/${id}/status`, data)).data,

  listAuditLogs: async (params?: { doc_type?: string; doc_id?: number }) =>
    (await api.get('/mfg/audit-logs', { params })).data,

  // Phase 2
  listSalesOrders: async () => (await api.get('/mfg/sales-orders')).data,
  createSalesOrder: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/sales-orders', data)).data,
  approveSalesOrder: async (id: number) =>
    (await api.post(`/mfg/sales-orders/${id}/approve`)).data,
  listStockReservations: async () => (await api.get('/mfg/stock-reservations')).data,
  createStockReservation: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/stock-reservations', data)).data,
  listDeliveryChallans: async () => (await api.get('/mfg/delivery-challans')).data,
  createDeliveryChallan: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/delivery-challans', data)).data,
  dispatchDeliveryChallan: async (id: number) =>
    (await api.post(`/mfg/delivery-challans/${id}/dispatch`)).data,
  listCreditNotes: async () => (await api.get('/mfg/credit-notes')).data,
  createCreditNote: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/credit-notes', data)).data,

  // Phase 3
  listWorkCenters: async () => (await api.get('/mfg/work-centers')).data,
  createWorkCenter: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/work-centers', data)).data,
  listBoms: async () => (await api.get('/mfg/boms')).data,
  createBom: async (data: Record<string, unknown>) => (await api.post('/mfg/boms', data)).data,
  approveBomVersion: async (versionId: number) =>
    (await api.post(`/mfg/bom-versions/${versionId}/approve`)).data,
  listRoutings: async () => (await api.get('/mfg/routings')).data,
  createRouting: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/routings', data)).data,
  listProductionPlans: async () => (await api.get('/mfg/production-plans')).data,
  createProductionPlan: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/production-plans', data)).data,
  runMrp: async (data: Record<string, unknown>) => (await api.post('/mfg/mrp/run', data)).data,
  listWorkOrders: async () => (await api.get('/mfg/work-orders')).data,
  createWorkOrder: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/work-orders', data)).data,
  releaseWorkOrder: async (id: number) =>
    (await api.post(`/mfg/work-orders/${id}/release`)).data,
  listMaterialIssues: async () => (await api.get('/mfg/material-issues')).data,
  createMaterialIssue: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/material-issues', data)).data,
  approveMaterialIssue: async (id: number) =>
    (await api.post(`/mfg/material-issues/${id}/approve`)).data,
  listProductionEntries: async () => (await api.get('/mfg/production-entries')).data,
  createProductionEntry: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/production-entries', data)).data,
  listStandardCosts: async () => (await api.get('/mfg/standard-costs')).data,
  computeStandardCost: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/standard-costs/compute', data)).data,

  // Phase 4
  listTaxConfigurations: async () => (await api.get('/mfg/tax-configurations')).data,
  createTaxConfiguration: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/tax-configurations', data)).data,
  listPeriodLocks: async () => (await api.get('/mfg/period-locks')).data,
  lockPeriod: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/period-locks/lock', data)).data,
  unlockPeriod: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/period-locks/unlock', data)).data,
  listAutoJournals: async () => (await api.get('/mfg/auto-journals')).data,
  postPendingAutoJournals: async () =>
    (await api.post('/mfg/auto-journals/post-pending')).data,

  // Phase 5
  hqDashboard: async () => (await api.get('/mfg/hq-dashboard')).data,
  listBudgets: async () => (await api.get('/mfg/budgets')).data,
  createBudget: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/budgets', data)).data,
  listKpiDaily: async () => (await api.get('/mfg/kpi/daily')).data,
  refreshKpi: async () => (await api.post('/mfg/kpi/refresh')).data,
  listReportSnapshots: async () => (await api.get('/mfg/report-snapshots')).data,
  createReportSnapshot: async (data: Record<string, unknown>) =>
    (await api.post('/mfg/report-snapshots', data)).data,
  getReportSnapshot: async (id: number) =>
    (await api.get(`/mfg/report-snapshots/${id}`)).data,
};

export const hqService = {
  dashboard: async () => (await api.get('/hq/dashboard')).data,
};
