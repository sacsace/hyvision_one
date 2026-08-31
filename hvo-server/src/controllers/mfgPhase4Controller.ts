import { Response } from 'express';
import {
  MfgTaxConfiguration,
  MfgPeriodLock,
  MfgAutoJournalLink,
} from '../models';
import { RequestWithUser } from '../types';
import { resolveCompanyScope } from '../utils/companyScope';
import { lockPeriod, unlockPeriod } from '../services/mfgPeriodLockService';
import { postPendingAutoJournals } from '../services/mfgAutoJournalService';
import { decRow, scopeWhere, handleError } from './mfgControllerHelpers';

// ── Tax Configurations ──

export const listTaxConfigurations = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req);
    if (req.query.active !== 'false') where.is_active = true;
    if (req.query.tax_type) where.tax_type = String(req.query.tax_type);
    const rows = await (MfgTaxConfiguration as any).findAll({ where, order: [['code', 'ASC']] });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listTaxConfigurations');
  }
};

export const createTaxConfiguration = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const tax_type = String(req.body?.tax_type || '').trim();
    const code = String(req.body?.code || '').trim();
    const name = String(req.body?.name || '').trim();
    if (!tax_type || !code || !name) {
      return res.status(400).json({ success: false, message: 'tax_type, code, name required' });
    }
    const row = await (MfgTaxConfiguration as any).create({
      tenant_id: tenantId,
      company_id: companyId,
      tax_type,
      code,
      name,
      rate: req.body?.rate ?? 0,
      threshold_amount: req.body?.threshold_amount ?? null,
      effective_from: req.body?.effective_from ?? null,
      effective_to: req.body?.effective_to ?? null,
      is_active: true,
      meta: req.body?.meta ?? null,
    });
    res.status(201).json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'createTaxConfiguration');
  }
};

export const updateTaxConfiguration = async (req: RequestWithUser, res: Response) => {
  try {
    const row = await (MfgTaxConfiguration as any).findOne({
      where: { ...scopeWhere(req), id: Number(req.params.id) },
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const patch: Record<string, unknown> = {};
    for (const key of ['name', 'rate', 'threshold_amount', 'effective_from', 'effective_to', 'is_active', 'meta']) {
      if (req.body?.[key] !== undefined) patch[key] = req.body[key];
    }
    await row.update(patch);
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'updateTaxConfiguration');
  }
};

export const deactivateTaxConfiguration = async (req: RequestWithUser, res: Response) => {
  try {
    const row = await (MfgTaxConfiguration as any).findOne({
      where: { ...scopeWhere(req), id: Number(req.params.id), is_active: true },
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    await row.update({ is_active: false });
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'deactivateTaxConfiguration');
  }
};

// ── Period Locks ──

export const listPeriodLocks = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req);
    if (req.query.period_ym) where.period_ym = String(req.query.period_ym);
    const rows = await (MfgPeriodLock as any).findAll({ where, order: [['period_ym', 'DESC']] });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listPeriodLocks');
  }
};

export const lockPeriodHandler = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const period_ym = String(req.body?.period_ym || '').trim();
    const module = String(req.body?.module || 'all').trim();
    if (!period_ym) return res.status(400).json({ success: false, message: 'period_ym required' });
    const row = await lockPeriod(
      tenantId,
      companyId,
      period_ym,
      module,
      req.user.id,
      req.body?.financial_year_id ?? null
    );
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'lockPeriodHandler');
  }
};

export const unlockPeriodHandler = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const period_ym = String(req.body?.period_ym || '').trim();
    const module = String(req.body?.module || 'all').trim();
    if (!period_ym) return res.status(400).json({ success: false, message: 'period_ym required' });
    const row = await unlockPeriod(tenantId, companyId, period_ym, module, req.user.id, req.body?.reason);
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'unlockPeriodHandler');
  }
};

// ── Auto Journals ──

export const listAutoJournalLinks = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req);
    if (req.query.status) where.status = String(req.query.status);
    const rows = await (MfgAutoJournalLink as any).findAll({ where, order: [['id', 'DESC']] });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listAutoJournalLinks');
  }
};

export const postPendingAutoJournalsHandler = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const results = await postPendingAutoJournals(tenantId, companyId, req.user.id);
    res.json({ success: true, data: results });
  } catch (error) {
    handleError(res, error, 'postPendingAutoJournalsHandler');
  }
};
