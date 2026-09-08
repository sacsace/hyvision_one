import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireMenuPermission } from '../middleware/menuPermission';
import {
  requireHqAccess,
  requireHqAuditorOrAdmin,
  requireRootOrAdmin,
  requireHqFlag,
} from '../middleware/hqAccess';
import {
  integratedDashboard,
  drilldownHelper,
  listApprovals,
  postApproval,
  approveApproval,
  rejectApproval,
  reportsCatalog,
  postReportSnapshot,
  listReportSnapshotsHq,
  getReportSnapshotHq,
  postExportLog,
  getFxRates,
  postFxRate,
  listCompliance,
  postCompliance,
  listAccessLogs,
  listHqUsers,
  updateHqUser,
} from '../controllers/hqController';

const router = Router();

router.use(authenticateToken);

const hqView = requireMenuPermission('/hq/dashboard', 'can_view');

// Dashboard
router.get('/dashboard', hqView, requireHqAccess('kpi_only'), integratedDashboard);
router.get('/drilldown/:section', hqView, requireHqAccess('kpi_only'), drilldownHelper);

// Approvals
router.get('/approvals', requireMenuPermission('/hq/approvals', 'can_view'), requireHqAccess('reports'), listApprovals);
router.post('/approvals', requireMenuPermission('/hq/approvals', 'can_create'), requireHqAccess('reports'), postApproval);
router.post(
  '/approvals/:id/approve',
  requireMenuPermission('/hq/approvals', 'can_edit'),
  requireHqAccess('approve'),
  requireHqFlag('hq_can_approve'),
  approveApproval
);
router.post(
  '/approvals/:id/reject',
  requireMenuPermission('/hq/approvals', 'can_edit'),
  requireHqAccess('approve'),
  requireHqFlag('hq_can_approve'),
  rejectApproval
);

// Reports
router.get('/reports/catalog', requireMenuPermission('/hq/reports', 'can_view'), requireHqAccess('reports'), reportsCatalog);
router.post(
  '/reports/snapshot',
  requireMenuPermission('/hq/reports', 'can_create'),
  requireHqAccess('export'),
  postReportSnapshot
);
router.get(
  '/reports/snapshots',
  requireMenuPermission('/hq/reports', 'can_view'),
  requireHqAccess('reports'),
  listReportSnapshotsHq
);
router.get(
  '/reports/snapshots/:id',
  requireMenuPermission('/hq/reports', 'can_view'),
  requireHqAccess('txn_detail'),
  getReportSnapshotHq
);
router.post(
  '/reports/export-log',
  requireMenuPermission('/hq/reports', 'can_create'),
  requireHqAccess('export'),
  postExportLog
);

// FX Rates
router.get('/fx-rates', requireMenuPermission('/hq/fx-rates', 'can_view'), requireHqAccess('reports'), getFxRates);
router.post(
  '/fx-rates',
  requireMenuPermission('/hq/fx-rates', 'can_create'),
  requireHqAccess('modify'),
  postFxRate
);

// Compliance
router.get('/compliance', requireMenuPermission('/hq/compliance', 'can_view'), requireHqAccess('reports'), listCompliance);
router.post(
  '/compliance',
  requireMenuPermission('/hq/compliance', 'can_create'),
  requireHqAccess('modify'),
  postCompliance
);

// Access Logs
router.get(
  '/access-logs',
  requireMenuPermission('/hq/access-logs', 'can_view'),
  requireHqAccess('reports'),
  requireHqAuditorOrAdmin,
  listAccessLogs
);

// HQ Users (root/admin only)
router.get('/users-hq', requireMenuPermission('/hq/users', 'can_view'), requireRootOrAdmin, listHqUsers);
router.put('/users-hq/:id', requireMenuPermission('/hq/users', 'can_edit'), requireRootOrAdmin, updateHqUser);

export default router;
