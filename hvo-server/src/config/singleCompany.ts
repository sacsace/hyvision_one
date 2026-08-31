/**
 * Hyvision One operates as a single-company ERP (not multi-tenant SaaS).
 * Keep tenant_id/company_id columns, but disable multi-company UX and APIs.
 */
export const isSingleCompanyMode = (): boolean => {
  const raw = String(process.env.HVO_SINGLE_COMPANY_MODE ?? 'true').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off' && raw !== 'no';
};
