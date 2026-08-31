import { RequestWithUser } from '../types';
import { isSingleCompanyMode } from '../config/singleCompany';

/** 로그인 회사 고정. 단일회사 모드에서는 root/audit 도 company_id 오버라이드 불가 */
export const resolveCompanyId = (req: RequestWithUser): number => {
  const { company_id, role } = req.user;
  if (isSingleCompanyMode()) {
    return company_id;
  }

  const raw =
    req.query.company_id ??
    req.query.companyId ??
    req.body?.company_id ??
    req.body?.companyId;
  const parsed = raw != null ? parseInt(String(raw), 10) : NaN;
  const hasOverride = Number.isFinite(parsed) && parsed > 0;

  if ((role === 'root' || role === 'audit') && hasOverride) {
    return parsed;
  }
  return company_id;
};

export const resolveCompanyScope = (req: RequestWithUser) => {
  const { tenant_id } = req.user;
  return { tenantId: tenant_id, companyId: resolveCompanyId(req) };
};
