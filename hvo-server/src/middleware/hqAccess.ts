import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export type HqAccessLevel =
  | 'kpi_only'
  | 'reports'
  | 'txn_detail'
  | 'attachments'
  | 'export'
  | 'approve'
  | 'modify'
  | 'admin';

export type HqFlag =
  | 'hq_can_approve'
  | 'hq_can_view_cost'
  | 'hq_can_view_hr_pii'
  | 'hq_can_view_bank_detail'
  | 'hq_can_view_tax';

export const HQ_ACCESS_LEVEL_ORDER: HqAccessLevel[] = [
  'kpi_only',
  'reports',
  'txn_detail',
  'attachments',
  'export',
  'approve',
  'modify',
  'admin',
];

export const compareHqAccessLevel = (userLevel: HqAccessLevel, minLevel: HqAccessLevel): boolean => {
  const userIdx = HQ_ACCESS_LEVEL_ORDER.indexOf(userLevel);
  const minIdx = HQ_ACCESS_LEVEL_ORDER.indexOf(minLevel);
  if (userIdx < 0 || minIdx < 0) return false;
  return userIdx >= minIdx;
};

export type HqUserLike = {
  role?: string;
  hq_role?: string | null;
  hq_access_level?: HqAccessLevel;
  hq_can_approve?: boolean;
  hq_can_view_cost?: boolean;
  hq_can_view_hr_pii?: boolean;
  hq_can_view_bank_detail?: boolean;
  hq_can_view_tax?: boolean;
};

export const isHqUser = (user: HqUserLike | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'root') return true;
  return Boolean(user.hq_role);
};

export const getEffectiveHqAccessLevel = (user: HqUserLike): HqAccessLevel => {
  if (user.role === 'root') return 'admin';
  return (user.hq_access_level as HqAccessLevel) || 'kpi_only';
};

const SENSITIVE_KEYS = new Set([
  'salary',
  'bank_account',
  'bank_name',
  'bank_ifsc',
  'account_number',
  'ifsc',
  'unit_cost',
  'cost',
  'cogs_amount',
  'standard_cost',
]);

/** Strip or mask sensitive fields based on HQ flags */
export const maskSensitive = (payload: unknown, user: HqUserLike): unknown => {
  if (payload == null) return payload;
  if (user.role === 'root') return payload;

  const canPii = Boolean(user.hq_can_view_hr_pii);
  const canCost = Boolean(user.hq_can_view_cost);
  const canBank = Boolean(user.hq_can_view_bank_detail);

  const maskValue = (key: string): boolean => {
    const k = key.toLowerCase();
    if (['salary', 'birth_date', 'phone', 'address', 'emergency_contact', 'emergency_phone'].includes(k)) {
      return !canPii;
    }
    if (['bank_account', 'bank_name', 'bank_ifsc', 'account_number', 'ifsc'].includes(k)) {
      return !canBank;
    }
    if (['unit_cost', 'cost', 'cogs_amount', 'standard_cost', 'gross_profit', 'operating_profit'].includes(k)) {
      return !canCost;
    }
    return SENSITIVE_KEYS.has(k) && !canCost && !canBank && !canPii;
  };

  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
        if (maskValue(key)) {
          out[key] = null;
        } else {
          out[key] = walk(val);
        }
      }
      return out;
    }
    return node;
  };

  return walk(payload);
};

export const requireHqAccess = (minLevel: HqAccessLevel) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      return;
    }
    if (!isHqUser(user)) {
      res.status(403).json({ success: false, message: '본사 포털 접근 권한이 없습니다.' });
      return;
    }
    const level = getEffectiveHqAccessLevel(user);
    if (!compareHqAccessLevel(level, minLevel)) {
      res.status(403).json({ success: false, message: '본사 포털 접근 등급이 부족합니다.' });
      return;
    }
    next();
  };
};

export const requireHqFlag = (flag: HqFlag) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      return;
    }
    if (user.role === 'root' || (user as any)[flag] === true) {
      next();
      return;
    }
    res.status(403).json({ success: false, message: '필요한 본사 권한 플래그가 없습니다.' });
  };
};

/** hq_auditor, hq_admin, or root for access log viewing */
export const requireHqAuditorOrAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    return;
  }
  if (user.role === 'root') {
    next();
    return;
  }
  const role = user.hq_role;
  if (role === 'hq_auditor' || role === 'hq_admin') {
    next();
    return;
  }
  res.status(403).json({ success: false, message: '접근 로그 조회 권한이 없습니다.' });
};

export const requireRootOrAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    return;
  }
  if (user.role === 'root' || user.role === 'admin') {
    next();
    return;
  }
  res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
};
