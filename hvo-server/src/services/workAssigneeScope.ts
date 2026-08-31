import { normalizePartnerCompanyName } from '../utils/partnerCompanyName';

export type WorkAssigneeClientScope = {
  /** true면 배정 고객사만 조회 */
  enforced: boolean;
  partnerIds: number[];
  partnerNamesNormalized: string[];
  customerIds: number[];
};

function normalizeKey(raw: unknown): string {
  return normalizePartnerCompanyName(raw).trim().toLowerCase();
}

/** 고객사 리스트 기능 제거 — 항상 미강제 */
export function shouldEnforceAssignedClientScope(_user: any): boolean {
  return false;
}

/**
 * 로그인 사용자의 고객사 리스트 배정 범위.
 * 기능 미사용: 항상 enforced=false
 */
export async function resolveAssignedClientScope(_user: any): Promise<WorkAssigneeClientScope> {
  return {
    enforced: false,
    partnerIds: [],
    partnerNamesNormalized: [],
    customerIds: [],
  };
}

export function expenseMatchesAssignedScope(expense: any, scope: WorkAssigneeClientScope): boolean {
  if (!scope.enforced) return true;
  if (scope.partnerIds.length === 0 && scope.partnerNamesNormalized.length === 0) return false;

  let meta: any = {};
  const items = expense?.items;
  if (items && typeof items === 'object' && !Array.isArray(items)) {
    meta = items.meta || {};
  }

  const partnerId = Number(meta.partnerId ?? meta.partner_id ?? 0);
  if (partnerId > 0 && scope.partnerIds.includes(partnerId)) return true;

  const nameCandidates = [
    meta.department,
    meta.partnerName,
    meta.partner_name,
    meta.companyName,
    expense?.title,
  ];
  for (const raw of nameCandidates) {
    const key = normalizeKey(raw);
    if (key && scope.partnerNamesNormalized.includes(key)) return true;
  }
  return false;
}

export function invoiceMatchesAssignedScope(invoice: any, scope: WorkAssigneeClientScope): boolean {
  if (!scope.enforced) return true;
  if (scope.customerIds.length === 0 && scope.partnerNamesNormalized.length === 0) return false;

  const customerId = Number(invoice?.customer_id ?? invoice?.customer?.id ?? 0);
  if (customerId > 0 && scope.customerIds.includes(customerId)) return true;

  const name = normalizeKey(invoice?.customer?.name);
  if (name && scope.partnerNamesNormalized.includes(name)) return true;
  return false;
}
