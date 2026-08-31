import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireMenuPermission } from '../middleware/menuPermission';
import {
  listBranches,
  createBranch,
  updateBranch,
  listWarehouses,
  updateWarehouse,
  listBinLocations,
  createBinLocation,
  updateBinLocation,
  listDocumentSequences,
  upsertDocumentSequence,
  listPurchaseRequisitions,
  getPurchaseRequisition,
  createPurchaseRequisition,
  submitPurchaseRequisition,
  approvePurchaseRequisition,
  rejectPurchaseRequisition,
  cancelPurchaseRequisition,
  purchaseDashboardStats,
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  approvePurchaseOrder,
  listGoodsReceipts,
  getGoodsReceipt,
  createGoodsReceipt,
  approveGoodsReceipt,
  listStockLedger,
  createQualityInspection,
  updateQualityInspectionStatus,
  listAuditLogs,
} from '../controllers/mfgPhase1Controller';
import {
  listSalesOrders,
  getSalesOrder,
  createSalesOrder,
  updateSalesOrder,
  approveSalesOrder,
  deactivateSalesOrder,
  listStockReservations,
  createStockReservation,
  listDeliveryChallans,
  getDeliveryChallan,
  createDeliveryChallan,
  approveDispatchDeliveryChallan,
  listCreditNotes,
  createCreditNote,
} from '../controllers/mfgPhase2Controller';
import {
  listWorkCenters,
  createWorkCenter,
  updateWorkCenter,
  listBoms,
  createBom,
  approveBomVersion,
  listRoutings,
  createRouting,
  listProductionPlans,
  createProductionPlan,
  runMrp,
  listWorkOrders,
  createWorkOrder,
  releaseWorkOrder,
  listMaterialIssues,
  createMaterialIssue,
  approveMaterialIssue,
  listProductionEntries,
  createProductionEntry,
  listStandardCosts,
  computeStandardCost,
} from '../controllers/mfgPhase3Controller';
import {
  listTaxConfigurations,
  createTaxConfiguration,
  updateTaxConfiguration,
  deactivateTaxConfiguration,
  listPeriodLocks,
  lockPeriodHandler,
  unlockPeriodHandler,
  listAutoJournalLinks,
  postPendingAutoJournalsHandler,
} from '../controllers/mfgPhase4Controller';
import {
  hqDashboard,
  listBudgetLines,
  createBudgetLine,
  updateBudgetLine,
  deactivateBudgetLine,
  listKpiDaily,
  refreshKpi,
  listReportSnapshots,
  getReportSnapshot,
  createReportSnapshot,
} from '../controllers/mfgPhase5Controller';

const router = Router();

router.use(authenticateToken);

const view = (route: string) => requireMenuPermission(route, 'can_view');
const create = (route: string) => requireMenuPermission(route, 'can_create');
const edit = (route: string) => requireMenuPermission(route, 'can_edit');

// Phase 1 — Branches
router.get('/branches', view('/mfg/branches'), listBranches);
router.post('/branches', create('/mfg/branches'), createBranch);
router.put('/branches/:id', edit('/mfg/branches'), updateBranch);

// Warehouses
router.get('/warehouses', view('/mfg/warehouses'), listWarehouses);
router.put('/warehouses/:id', edit('/mfg/warehouses'), updateWarehouse);

// Bin locations
router.get('/bin-locations', view('/mfg/warehouses'), listBinLocations);
router.post('/bin-locations', create('/mfg/warehouses'), createBinLocation);
router.put('/bin-locations/:id', edit('/mfg/warehouses'), updateBinLocation);

// Document sequences
router.get('/document-sequences', view('/mfg/document-sequences'), listDocumentSequences);
router.put('/document-sequences', edit('/mfg/document-sequences'), upsertDocumentSequence);

// Purchase requisitions
router.get('/purchase-requisitions', view('/purchase/requisitions'), listPurchaseRequisitions);
router.get('/purchase-requisitions/:id', view('/purchase/requisitions'), getPurchaseRequisition);
router.post('/purchase-requisitions', create('/purchase/requisitions'), createPurchaseRequisition);
router.post('/purchase-requisitions/:id/submit', edit('/purchase/requisitions'), submitPurchaseRequisition);
router.post('/purchase-requisitions/:id/approve', edit('/purchase/requisitions'), approvePurchaseRequisition);
router.post('/purchase-requisitions/:id/reject', edit('/purchase/requisitions'), rejectPurchaseRequisition);
router.post('/purchase-requisitions/:id/cancel', edit('/purchase/requisitions'), cancelPurchaseRequisition);
router.get('/purchase-dashboard', view('/purchase/dashboard'), purchaseDashboardStats);

// Purchase orders
router.get('/purchase-orders', view('/purchase/orders'), listPurchaseOrders);
router.get('/purchase-orders/:id', view('/purchase/orders'), getPurchaseOrder);
router.post('/purchase-orders', create('/purchase/orders'), createPurchaseOrder);
router.post('/purchase-orders/:id/approve', edit('/purchase/orders'), approvePurchaseOrder);

// Goods receipts
router.get('/goods-receipts', view('/purchase/goods-receipts'), listGoodsReceipts);
router.get('/goods-receipts/:id', view('/purchase/goods-receipts'), getGoodsReceipt);
router.post('/goods-receipts', create('/purchase/goods-receipts'), createGoodsReceipt);
router.post('/goods-receipts/:id/approve', edit('/purchase/goods-receipts'), approveGoodsReceipt);

// Stock ledger
router.get('/stock-ledger', view('/mfg/stock-ledger'), listStockLedger);

// Quality inspections
router.post('/quality-inspections', create('/purchase/quality-inspections'), createQualityInspection);
router.put('/quality-inspections/:id/status', edit('/purchase/quality-inspections'), updateQualityInspectionStatus);

// Audit logs
router.get('/audit-logs', view('/mfg/audit-logs'), listAuditLogs);

// Phase 2 — Sales
router.get('/sales-orders', view('/mfg/sales-orders'), listSalesOrders);
router.get('/sales-orders/:id', view('/mfg/sales-orders'), getSalesOrder);
router.post('/sales-orders', create('/mfg/sales-orders'), createSalesOrder);
router.put('/sales-orders/:id', edit('/mfg/sales-orders'), updateSalesOrder);
router.post('/sales-orders/:id/approve', edit('/mfg/sales-orders'), approveSalesOrder);
router.delete('/sales-orders/:id', edit('/mfg/sales-orders'), deactivateSalesOrder);

router.get('/stock-reservations', view('/mfg/stock-reservations'), listStockReservations);
router.post('/stock-reservations', create('/mfg/stock-reservations'), createStockReservation);

router.get('/delivery-challans', view('/mfg/delivery-challans'), listDeliveryChallans);
router.get('/delivery-challans/:id', view('/mfg/delivery-challans'), getDeliveryChallan);
router.post('/delivery-challans', create('/mfg/delivery-challans'), createDeliveryChallan);
router.post('/delivery-challans/:id/dispatch', edit('/mfg/delivery-challans'), approveDispatchDeliveryChallan);

router.get('/credit-notes', view('/mfg/credit-notes'), listCreditNotes);
router.post('/credit-notes', create('/mfg/credit-notes'), createCreditNote);

// Phase 3 — Production
router.get('/work-centers', view('/mfg/work-centers'), listWorkCenters);
router.post('/work-centers', create('/mfg/work-centers'), createWorkCenter);
router.put('/work-centers/:id', edit('/mfg/work-centers'), updateWorkCenter);

router.get('/boms', view('/mfg/boms'), listBoms);
router.post('/boms', create('/mfg/boms'), createBom);
router.post('/bom-versions/:versionId/approve', edit('/mfg/boms'), approveBomVersion);

router.get('/routings', view('/mfg/routings'), listRoutings);
router.post('/routings', create('/mfg/routings'), createRouting);

router.get('/production-plans', view('/mfg/production-plans'), listProductionPlans);
router.post('/production-plans', create('/mfg/production-plans'), createProductionPlan);
router.post('/mrp/run', edit('/mfg/production-plans'), runMrp);

router.get('/work-orders', view('/mfg/work-orders'), listWorkOrders);
router.post('/work-orders', create('/mfg/work-orders'), createWorkOrder);
router.post('/work-orders/:id/release', edit('/mfg/work-orders'), releaseWorkOrder);

router.get('/material-issues', view('/mfg/material-issues'), listMaterialIssues);
router.post('/material-issues', create('/mfg/material-issues'), createMaterialIssue);
router.post('/material-issues/:id/approve', edit('/mfg/material-issues'), approveMaterialIssue);

router.get('/production-entries', view('/mfg/production-entries'), listProductionEntries);
router.post('/production-entries', create('/mfg/production-entries'), createProductionEntry);

router.get('/standard-costs', view('/mfg/standard-costs'), listStandardCosts);
router.post('/standard-costs/compute', edit('/mfg/standard-costs'), computeStandardCost);

// Phase 4 — Tax, locks, journals
router.get('/tax-configurations', view('/mfg/tax-configurations'), listTaxConfigurations);
router.post('/tax-configurations', create('/mfg/tax-configurations'), createTaxConfiguration);
router.put('/tax-configurations/:id', edit('/mfg/tax-configurations'), updateTaxConfiguration);
router.delete('/tax-configurations/:id', edit('/mfg/tax-configurations'), deactivateTaxConfiguration);

router.get('/period-locks', view('/mfg/period-locks'), listPeriodLocks);
router.post('/period-locks/lock', edit('/mfg/period-locks'), lockPeriodHandler);
router.post('/period-locks/unlock', edit('/mfg/period-locks'), unlockPeriodHandler);

router.get('/auto-journals', view('/mfg/auto-journals'), listAutoJournalLinks);
router.post('/auto-journals/post-pending', edit('/mfg/auto-journals'), postPendingAutoJournalsHandler);

// Phase 5 — HQ, budgets, KPI
router.get('/hq-dashboard', view('/mfg/hq-dashboard'), hqDashboard);

router.get('/budgets', view('/mfg/budgets'), listBudgetLines);
router.post('/budgets', create('/mfg/budgets'), createBudgetLine);
router.put('/budgets/:id', edit('/mfg/budgets'), updateBudgetLine);
router.delete('/budgets/:id', edit('/mfg/budgets'), deactivateBudgetLine);

router.get('/kpi/daily', view('/mfg/kpi'), listKpiDaily);
router.post('/kpi/refresh', edit('/mfg/kpi'), refreshKpi);

router.get('/report-snapshots', view('/mfg/report-snapshots'), listReportSnapshots);
router.get('/report-snapshots/:id', view('/mfg/report-snapshots'), getReportSnapshot);
router.post('/report-snapshots', create('/mfg/report-snapshots'), createReportSnapshot);

export default router;
