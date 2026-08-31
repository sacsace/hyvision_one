/** DB 메뉴에 남아 있어도 네비게이션에서 숨길 경로 (제거·리다이렉트 전용 화면) */
export function isRemovedNavMenuRoute(route: string | undefined | null): boolean {
  const n = String(route || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  return (
    n === 'customers/support' ||
    n === 'customers/info' ||
    n === 'work/assignee-list' ||
    n === 'mfg/hq-dashboard' ||
    n === 'mfg/report-snapshots' ||
    n === 'mfg/gst-registers' ||
    n === 'accounting/budget' ||
    n === 'accounting/e-invoice' ||
    n.startsWith('accounting/e-invoice/')
  );
}
