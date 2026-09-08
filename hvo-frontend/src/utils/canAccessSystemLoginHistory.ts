import { useReferenceDataStore } from '../store/referenceDataStore';

/** 서버 `requireRootOrPlatformEmployee` 와 동일: root 또는 Hyvision India(플랫폼) 소속 */
export function isPlatformCompanyName(name?: string | null): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes('hyvision') || n.includes('minsub ventures');
}

/** @deprecated use isPlatformCompanyName */
export const isMinsubCompanyName = isPlatformCompanyName;

export async function canAccessSystemLoginHistory(user?: {
  role?: string | null;
  company_id?: number | null;
} | null): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'root') return true;
  const companyId = Number(user.company_id);
  if (!Number.isFinite(companyId) || companyId <= 0) return false;
  try {
    const company = await useReferenceDataStore.getState().fetchCompanyById(companyId);
    return isPlatformCompanyName(company?.name);
  } catch {
    return false;
  }
}
