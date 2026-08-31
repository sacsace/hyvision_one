import { Response } from 'express';
import { Op } from 'sequelize';
import {
  MfgBudgetLine,
  MfgHqReportSnapshot,
  MfgKpiDaily,
} from '../models';
import { RequestWithUser } from '../types';
import { resolveCompanyScope } from '../utils/companyScope';
import { getHqDashboard, refreshKpiDaily } from '../services/mfgHqDashboardService';
import { decRow, scopeWhere, handleError } from './mfgControllerHelpers';

// ── HQ Dashboard ──

export const hqDashboard = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const data = await getHqDashboard(tenantId, companyId);
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'hqDashboard');
  }
};

// ── Budget Lines ──

export const listBudgetLines = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req, { is_active: true });
    if (req.query.period_ym) where.period_ym = String(req.query.period_ym);
    if (req.query.financial_year_id) where.financial_year_id = Number(req.query.financial_year_id);
    const rows = await (MfgBudgetLine as any).findAll({ where, order: [['period_ym', 'ASC']] });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listBudgetLines');
  }
};

export const createBudgetLine = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const period_ym = String(req.body?.period_ym || '').trim();
    if (!period_ym) return res.status(400).json({ success: false, message: 'period_ym required' });
    const row = await (MfgBudgetLine as any).create({
      tenant_id: tenantId,
      company_id: companyId,
      financial_year_id: req.body?.financial_year_id ?? null,
      department_id: req.body?.department_id ?? null,
      gl_account_id: req.body?.gl_account_id ?? null,
      period_ym,
      budget_amount: req.body?.budget_amount ?? 0,
      actual_amount: req.body?.actual_amount ?? 0,
      currency_code: req.body?.currency_code ?? 'INR',
      is_active: true,
    });
    res.status(201).json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'createBudgetLine');
  }
};

export const updateBudgetLine = async (req: RequestWithUser, res: Response) => {
  try {
    const row = await (MfgBudgetLine as any).findOne({
      where: { ...scopeWhere(req), id: Number(req.params.id) },
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const patch: Record<string, unknown> = {};
    for (const key of [
      'financial_year_id',
      'department_id',
      'gl_account_id',
      'period_ym',
      'budget_amount',
      'actual_amount',
      'currency_code',
    ]) {
      if (req.body?.[key] !== undefined) patch[key] = req.body[key];
    }
    await row.update(patch);
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'updateBudgetLine');
  }
};

export const deactivateBudgetLine = async (req: RequestWithUser, res: Response) => {
  try {
    const row = await (MfgBudgetLine as any).findOne({
      where: { ...scopeWhere(req), id: Number(req.params.id), is_active: true },
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    await row.update({ is_active: false });
    res.json({ success: true, message: 'Deactivated', data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'deactivateBudgetLine');
  }
};

// ── KPI ──

export const listKpiDaily = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req);
    if (req.query.from && req.query.to) {
      where.kpi_date = { [Op.between]: [String(req.query.from), String(req.query.to)] };
    } else if (req.query.from) {
      where.kpi_date = { [Op.gte]: String(req.query.from) };
    }
    const rows = await (MfgKpiDaily as any).findAll({
      where,
      order: [['kpi_date', 'DESC']],
      limit: Math.min(Number(req.query.limit) || 30, 365),
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listKpiDaily');
  }
};

export const refreshKpi = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const kpiDate = req.body?.kpi_date ?? new Date().toISOString().slice(0, 10);
    const row = await refreshKpiDaily(tenantId, companyId, kpiDate);
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'refreshKpi');
  }
};

// ── Report Snapshots ──

export const listReportSnapshots = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req);
    if (req.query.report_type) where.report_type = String(req.query.report_type);
    const rows = await (MfgHqReportSnapshot as any).findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Math.min(Number(req.query.limit) || 50, 200),
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listReportSnapshots');
  }
};

export const getReportSnapshot = async (req: RequestWithUser, res: Response) => {
  try {
    const row = await (MfgHqReportSnapshot as any).findOne({
      where: { ...scopeWhere(req), id: Number(req.params.id) },
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'getReportSnapshot');
  }
};

export const createReportSnapshot = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const report_type = String(req.body?.report_type || '').trim();
    const report_period = String(req.body?.report_period || '').trim();
    const title = String(req.body?.title || '').trim();
    if (!report_type || !report_period || !title) {
      return res.status(400).json({ success: false, message: 'report_type, report_period, title required' });
    }
    const row = await (MfgHqReportSnapshot as any).create({
      tenant_id: tenantId,
      company_id: companyId,
      report_type,
      report_period,
      title,
      payload: req.body?.payload ?? null,
      created_by: req.user.id,
    });
    res.status(201).json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'createReportSnapshot');
  }
};
