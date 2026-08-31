import { Response } from 'express';
import { Op } from 'sequelize';
import {
  HqAccessLog,
  HqComplianceItem,
  HqPrivacySetting,
  HqApprovalPolicy,
  MfgHqReportSnapshot,
  User,
} from '../models';
import { RequestWithUser } from '../types';
import { resolveCompanyScope } from '../utils/companyScope';
import { getIntegratedDashboard, getDrilldown } from '../services/hqPortalService';
import { listRequests, createRequest, approveRequest, rejectRequest } from '../services/hqApprovalService';
import {
  listAvailableReports,
  createSnapshot,
  logExport,
} from '../services/hqReportService';
import { listRates, upsertRate } from '../services/hqFxService';
import { decRow, handleError } from './mfgControllerHelpers';

const clientIp = (req: RequestWithUser) =>
  (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;

// ── Dashboard ──

export const integratedDashboard = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const data = await getIntegratedDashboard(tenantId, companyId, req.user);
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'integratedDashboard');
  }
};

export const drilldownHelper = async (req: RequestWithUser, res: Response) => {
  try {
    const { companyId } = resolveCompanyScope(req);
    const section = String(req.params.section || '');
    const data = getDrilldown(section, companyId);
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'drilldownHelper');
  }
};

// ── Approvals ──

export const listApprovals = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const status = req.query.status ? String(req.query.status) : undefined;
    const rows = await listRequests(tenantId, companyId, { status, limit: Number(req.query.limit) || 50 });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listApprovals');
  }
};

export const postApproval = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const result = await createRequest({
      tenantId,
      companyId,
      eventType: String(req.body?.event_type || ''),
      docType: String(req.body?.doc_type || ''),
      docId: Number(req.body?.doc_id),
      docNo: req.body?.doc_no,
      partnerName: req.body?.partner_name,
      amount: req.body?.amount != null ? Number(req.body.amount) : undefined,
      currencyCode: req.body?.currency_code,
      requesterId: req.user.id,
      requestReason: req.body?.request_reason,
      attachmentUrls: req.body?.attachment_urls,
      deepLink: req.body?.deep_link,
      policyId: req.body?.policy_id,
    });
    res.status(result.deduped ? 200 : 201).json({
      success: true,
      data: decRow(result.row),
      deduped: result.deduped,
    });
  } catch (error) {
    handleError(res, error, 'postApproval');
  }
};

export const approveApproval = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const row = await approveRequest(
      Number(req.params.id),
      tenantId,
      companyId,
      req.user,
      req.body?.decision_reason,
      clientIp(req) ?? undefined
    );
    res.json({ success: true, data: decRow(row) });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Not found' });
    if (error.message === 'NOT_PENDING') return res.status(409).json({ success: false, message: 'Not pending' });
    handleError(res, error, 'approveApproval');
  }
};

export const rejectApproval = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const row = await rejectRequest(
      Number(req.params.id),
      tenantId,
      companyId,
      req.user,
      req.body?.decision_reason,
      clientIp(req) ?? undefined
    );
    res.json({ success: true, data: decRow(row) });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Not found' });
    if (error.message === 'NOT_PENDING') return res.status(409).json({ success: false, message: 'Not pending' });
    handleError(res, error, 'rejectApproval');
  }
};

// ── Reports ──

export const reportsCatalog = async (_req: RequestWithUser, res: Response) => {
  try {
    res.json({ success: true, data: listAvailableReports() });
  } catch (error) {
    handleError(res, error, 'reportsCatalog');
  }
};

export const postReportSnapshot = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const reportKey = String(req.body?.report_key || req.body?.report_type || '').trim();
    const period = String(req.body?.report_period || req.body?.period || '').trim();
    if (!reportKey || !period) {
      return res.status(400).json({ success: false, message: 'report_key and period required' });
    }
    const row = await createSnapshot({
      tenantId,
      companyId,
      reportKey,
      period,
      payload: req.body?.payload ?? {},
      userId: req.user.id,
      title: req.body?.title,
    });
    res.status(201).json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'postReportSnapshot');
  }
};

export const listReportSnapshotsHq = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = {
      tenant_id: resolveCompanyScope(req).tenantId,
      company_id: resolveCompanyScope(req).companyId,
    };
    if (req.query.report_key) where.report_type = String(req.query.report_key);
    const rows = await (MfgHqReportSnapshot as any).findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Math.min(Number(req.query.limit) || 50, 200),
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listReportSnapshotsHq');
  }
};

export const getReportSnapshotHq = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const row = await (MfgHqReportSnapshot as any).findOne({
      where: { id: Number(req.params.id), tenant_id: tenantId, company_id: companyId },
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'getReportSnapshotHq');
  }
};

export const postExportLog = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const row = await logExport({
      tenantId,
      companyId,
      userId: req.user.id,
      exportType: String(req.body?.export_type || 'report'),
      reportKey: req.body?.report_key,
      rowCount: req.body?.row_count != null ? Number(req.body.row_count) : undefined,
      format: req.body?.format,
      ipAddress: clientIp(req) ?? undefined,
      userAgent: req.headers['user-agent'],
    });
    res.status(201).json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'postExportLog');
  }
};

// ── FX Rates ──

export const getFxRates = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId } = resolveCompanyScope(req);
    const rows = await listRates(tenantId, {
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
      limit: Number(req.query.limit) || 100,
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'getFxRates');
  }
};

export const postFxRate = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId } = resolveCompanyScope(req);
    const rateDate = String(req.body?.rate_date || new Date().toISOString().slice(0, 10));
    const from = String(req.body?.from_currency || '').trim();
    const to = String(req.body?.to_currency || '').trim();
    const rate = Number(req.body?.rate);
    if (!from || !to || !Number.isFinite(rate)) {
      return res.status(400).json({ success: false, message: 'from_currency, to_currency, rate required' });
    }
    const row = await upsertRate({
      tenantId,
      rateDate,
      fromCurrency: from,
      toCurrency: to,
      rate,
      source: req.body?.source,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'postFxRate');
  }
};

// ── Compliance ──

export const listCompliance = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const rows = await (HqComplianceItem as any).findAll({
      where: { tenant_id: tenantId, company_id: companyId, is_active: true },
      order: [['due_date', 'ASC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listCompliance');
  }
};

export const postCompliance = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const itemType = String(req.body?.item_type || '').trim();
    const title = String(req.body?.title || '').trim();
    if (!itemType || !title) {
      return res.status(400).json({ success: false, message: 'item_type and title required' });
    }
    const row = await (HqComplianceItem as any).create({
      tenant_id: tenantId,
      company_id: companyId,
      item_type: itemType,
      title,
      due_date: req.body?.due_date ?? null,
      status: req.body?.status ?? 'pending',
      notes: req.body?.notes ?? null,
      is_active: true,
    });
    res.status(201).json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'postCompliance');
  }
};

// ── Access Logs ──

export const listAccessLogs = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const where: Record<string, unknown> = { tenant_id: tenantId, company_id: companyId };
    if (req.query.action) where.action = String(req.query.action);
    const rows = await (HqAccessLog as any).findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Math.min(Number(req.query.limit) || 100, 500),
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listAccessLogs');
  }
};

// ── Privacy Settings ──

export const getPrivacySettings = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId } = resolveCompanyScope(req);
    const [row] = await (HqPrivacySetting as any).findOrCreate({
      where: { tenant_id: tenantId },
      defaults: { tenant_id: tenantId },
    });
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'getPrivacySettings');
  }
};

export const putPrivacySettings = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId } = resolveCompanyScope(req);
    const [row] = await (HqPrivacySetting as any).findOrCreate({
      where: { tenant_id: tenantId },
      defaults: { tenant_id: tenantId },
    });
    const patch: Record<string, unknown> = {};
    for (const key of ['purpose', 'retention_days', 'cross_border_allowed', 'legal_basis', 'contact_email', 'meta']) {
      if (req.body?.[key] !== undefined) patch[key] = req.body[key];
    }
    await row.update(patch);
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'putPrivacySettings');
  }
};

// ── HQ User Management ──

export const listHqUsers = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId } = resolveCompanyScope(req);
    const rows = await (User as any).findAll({
      where: {
        tenant_id: tenantId,
        [Op.or]: [{ hq_role: { [Op.ne]: null } }, { role: 'root' }],
      },
      attributes: [
        'id',
        'userid',
        'username',
        'email',
        'role',
        'hq_role',
        'hq_access_level',
        'hq_can_approve',
        'hq_can_view_cost',
        'hq_can_view_hr_pii',
        'hq_can_view_bank_detail',
        'hq_can_view_tax',
        'hq_home_timezone',
        'status',
      ],
      order: [['username', 'ASC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listHqUsers');
  }
};

export const updateHqUser = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId } = resolveCompanyScope(req);
    const userId = Number(req.params.id);
    const row = await (User as any).findOne({ where: { id: userId, tenant_id: tenantId } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });

    const patch: Record<string, unknown> = {};
    for (const key of [
      'hq_role',
      'hq_access_level',
      'hq_can_approve',
      'hq_can_view_cost',
      'hq_can_view_hr_pii',
      'hq_can_view_bank_detail',
      'hq_can_view_tax',
      'hq_home_timezone',
    ]) {
      if (req.body?.[key] !== undefined) patch[key] = req.body[key];
    }
    await row.update(patch);
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'updateHqUser');
  }
};

export const listApprovalPolicies = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const rows = await (HqApprovalPolicy as any).findAll({
      where: { tenant_id: tenantId, company_id: companyId, is_active: true },
      order: [['event_type', 'ASC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listApprovalPolicies');
  }
};
