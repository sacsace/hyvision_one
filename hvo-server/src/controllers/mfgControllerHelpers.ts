import { Response } from 'express';
import { RequestWithUser } from '../types';
import { resolveCompanyScope } from '../utils/companyScope';

export const decRow = (row: any) => {
  if (!row) return row;
  const plain = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
  for (const key of Object.keys(plain)) {
    if (plain[key] != null && typeof plain[key] === 'object' && typeof plain[key].toFixed === 'function') {
      plain[key] = String(plain[key]);
    }
  }
  return plain;
};

export const scopeWhere = (req: RequestWithUser, extra: Record<string, unknown> = {}) => {
  const { tenantId, companyId } = resolveCompanyScope(req);
  return { tenant_id: tenantId, company_id: companyId, ...extra };
};

export const clientIp = (req: RequestWithUser) =>
  String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || null;

export const handleError = (res: Response, error: unknown, label: string) => {
  console.error(`${label}:`, error);
  const msg = error instanceof Error ? error.message : '';
  if (msg === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Not found' });
  if (msg === 'NEGATIVE_STOCK') return res.status(400).json({ success: false, message: 'Insufficient stock' });
  if (msg === 'PERIOD_LOCKED') return res.status(423).json({ success: false, message: 'Period is locked' });
  if (msg.startsWith('INVALID_STATUS:')) {
    return res.status(400).json({ success: false, message: `Invalid status: ${msg.split(':')[1]}` });
  }
  res.status(500).json({ success: false, message: 'Server error' });
};
