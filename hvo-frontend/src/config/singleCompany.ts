/**
 * Hyvision One: single-company ERP (no multi-tenant / multi-company switching).
 * Override with REACT_APP_HVO_SINGLE_COMPANY_MODE=false only if needed.
 */
export const isSingleCompanyMode = (): boolean => {
  const raw = String(process.env.REACT_APP_HVO_SINGLE_COMPANY_MODE ?? 'true').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off' && raw !== 'no';
};
