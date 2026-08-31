import { Op } from 'sequelize';
import {
  MfgKpiDaily,
  MfgPurchaseOrder,
  MfgPurchaseRequisition,
  MfgSalesOrder,
  MfgWorkOrder,
  MfgStockLedgerEntry,
  MfgBudgetLine,
  MfgScrapEntry,
  Invoice,
  Product,
  AcBankAccount,
  HqComplianceItem,
  HqApprovalRequest,
} from '../models';
import { refreshKpiDaily, dateOnlyMonthRange } from './mfgHqDashboardService';
import { convert } from './hqFxService';
import { maskSensitive, type HqUserLike } from '../middleware/hqAccess';

const n = (v: unknown) => Number(v || 0);

const multiCurrency = async (tenantId: number, inrAmount: number, rateDate: string) => {
  const krw = await convert(inrAmount, 'INR', 'KRW', tenantId, rateDate);
  const usd = await convert(inrAmount, 'INR', 'USD', tenantId, rateDate);
  return { inr: inrAmount, krw: krw.amount, usd: usd.amount };
};

const kpiWithFx = async (
  tenantId: number,
  label: string,
  valueInr: number,
  drilldown_path: string,
  extras?: Record<string, unknown>
) => {
  const rateDate = new Date().toISOString().slice(0, 10);
  const amounts = await multiCurrency(tenantId, valueInr, rateDate);
  return { label, value_inr: valueInr, amounts, drilldown_path, ...extras };
};

export const getDrilldown = (section: string, companyId: number) => {
  const map: Record<string, { path: string; filters: Record<string, unknown> }> = {
    finance: { path: '/accounting/profit-and-loss', filters: { company_id: companyId } },
    purchase: { path: '/purchase/orders', filters: { company_id: companyId, status: 'open' } },
    inventory: { path: '/inventory/status', filters: { company_id: companyId } },
    production: { path: '/mfg/work-orders', filters: { company_id: companyId } },
    sales: { path: '/mfg/sales-orders', filters: { company_id: companyId } },
    compliance: { path: '/hq/compliance', filters: { company_id: companyId } },
    approvals: { path: '/hq/approvals', filters: { company_id: companyId, status: 'pending' } },
  };
  return map[section] || { path: '/hq/dashboard', filters: { company_id: companyId } };
};

export const getIntegratedDashboard = async (
  tenantId: number,
  companyId: number,
  user: HqUserLike
) => {
  const today = new Date().toISOString().slice(0, 10);
  const periodYm = today.slice(0, 7);
  const prevYm = (() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();
  const prevYearYm = `${Number(periodYm.slice(0, 4)) - 1}${periodYm.slice(4)}`;

  let kpi = await (MfgKpiDaily as any).findOne({
    where: { tenant_id: tenantId, company_id: companyId, kpi_date: today },
  });
  if (!kpi) kpi = await refreshKpiDaily(tenantId, companyId, today);

  const prevKpi = await (MfgKpiDaily as any).findOne({
    where: { tenant_id: tenantId, company_id: companyId, kpi_date: dateOnlyMonthRange(prevYm) },
    order: [['kpi_date', 'DESC']],
  });
  const yoyKpi = await (MfgKpiDaily as any).findOne({
    where: { tenant_id: tenantId, company_id: companyId, kpi_date: dateOnlyMonthRange(prevYearYm) },
    order: [['kpi_date', 'DESC']],
  });

  const momPct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
  const yoyPct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

  const monthlySales = n(kpi.sales_amount);
  const cogsEst = n(kpi.cogs_amount);
  const grossProfitEst = monthlySales - cogsEst;
  const operatingProfitEst = grossProfitEst * 0.85;

  const bankRows = await (AcBankAccount as any).findAll({
    where: { tenant_id: tenantId, company_id: companyId, is_active: true },
    attributes: ['opening_balance'],
  });
  const cashBank = bankRows.reduce((s: number, r: any) => s + n(r.opening_balance), 0);

  const budgetRows = await (MfgBudgetLine as any).findAll({
    where: { tenant_id: tenantId, company_id: companyId, period_ym: periodYm },
    attributes: ['budget_amount', 'actual_amount'],
  });
  const budgetTotal = budgetRows.reduce((s: number, r: any) => s + n(r.budget_amount), 0);
  const actualTotal = budgetRows.reduce((s: number, r: any) => s + n(r.actual_amount), 0);

  const finance = {
    monthly_sales: await kpiWithFx(tenantId, 'Monthly Sales', monthlySales, '/accounting/profit-and-loss', {
      mom_pct: momPct(monthlySales, n(prevKpi?.sales_amount)),
      yoy_pct: yoyPct(monthlySales, n(yoyKpi?.sales_amount)),
    }),
    gross_profit: await kpiWithFx(tenantId, 'Gross Profit (est)', grossProfitEst, '/accounting/profit-and-loss'),
    operating_profit: await kpiWithFx(tenantId, 'Operating Profit (est)', operatingProfitEst, '/accounting/profit-and-loss'),
    cash_bank: await kpiWithFx(tenantId, 'Cash & Bank', cashBank, '/accounting/chart-of-accounts'),
    ar: await kpiWithFx(tenantId, 'Accounts Receivable', n(kpi.ar_amount), '/accounting/account-ledger'),
    ap: await kpiWithFx(tenantId, 'Accounts Payable', n(kpi.ap_amount), '/accounting/account-ledger'),
    monthly_expense: await kpiWithFx(tenantId, 'Monthly Expense', 0, '/accounting/expense-management'),
    budget_vs_actual: {
      budget: budgetTotal,
      actual: actualTotal,
      variance_pct: budgetTotal > 0 ? ((actualTotal - budgetTotal) / budgetTotal) * 100 : null,
      drilldown_path: '/mfg/budgets',
    },
  };

  const prCount = await (MfgPurchaseRequisition as any).count({
    where: { tenant_id: tenantId, company_id: companyId, is_active: true, status: { [Op.in]: ['draft', 'submitted'] } },
  });
  const poOpen = await (MfgPurchaseOrder as any).count({
    where: { tenant_id: tenantId, company_id: companyId, is_active: true, status: { [Op.in]: ['approved', 'submitted'] } },
  });
  const poPendingApprove = await (HqApprovalRequest as any).count({
    where: { tenant_id: tenantId, company_id: companyId, event_type: 'po_amount', status: 'pending' },
  });
  const poUnreceived = await (MfgPurchaseOrder as any).count({
    where: { tenant_id: tenantId, company_id: companyId, is_active: true, status: 'approved' },
  });

  const ledgerRows = await (MfgStockLedgerEntry as any).findAll({
    where: { tenant_id: tenantId, company_id: companyId },
    attributes: ['product_id', 'qty_in', 'qty_out'],
  });
  const productIds = [...new Set(ledgerRows.map((r: any) => r.product_id).filter(Boolean))];
  const products = productIds.length
    ? await (Product as any).findAll({ where: { id: { [Op.in]: productIds } }, attributes: ['id', 'item_type'] })
    : [];
  const typeMap = new Map(products.map((p: any) => [p.id, p.item_type || 'other']));
  const stockByType: Record<string, number> = {};
  for (const r of ledgerRows) {
    const type = String(typeMap.get(r.product_id) || 'other');
    const delta = n(r.qty_in) - n(r.qty_out);
    stockByType[type] = (stockByType[type] || 0) + delta;
  }

  const scrapAdjust = await (MfgScrapEntry as any).count({
    where: { tenant_id: tenantId, company_id: companyId },
  });

  const purchase_inventory = {
    pr_count: { value: prCount, drilldown_path: '/purchase/requisitions' },
    po_open: { value: poOpen, drilldown_path: '/purchase/orders' },
    po_pending_approve: { value: poPendingApprove, drilldown_path: '/hq/approvals' },
    po_unreceived: { value: poUnreceived, drilldown_path: '/purchase/orders' },
    stock_by_type: { value: stockByType, drilldown_path: '/inventory/status' },
    shortage_count: { value: 0, drilldown_path: '/inventory/status' },
    scrap_adjust: { value: scrapAdjust, drilldown_path: '/mfg/scrap-entries' },
  };

  const woRows = await (MfgWorkOrder as any).findAll({
    where: { tenant_id: tenantId, company_id: companyId, is_active: true },
    attributes: ['status', 'plan_qty', 'completed_qty', 'scrap_qty'],
  });
  const woByStatus: Record<string, number> = {};
  let planTotal = 0;
  let completedTotal = 0;
  let scrapTotal = 0;
  for (const wo of woRows) {
    woByStatus[wo.status] = (woByStatus[wo.status] || 0) + 1;
    planTotal += n(wo.plan_qty);
    completedTotal += n(wo.completed_qty);
    scrapTotal += n(wo.scrap_qty);
  }
  const yieldPct = planTotal > 0 ? (completedTotal / planTotal) * 100 : 0;
  const defectPct = completedTotal > 0 ? (scrapTotal / completedTotal) * 100 : 0;

  const production = {
    plan_vs_actual: { plan: planTotal, actual: completedTotal, drilldown_path: '/mfg/work-orders' },
    wo_by_status: { value: woByStatus, drilldown_path: '/mfg/work-orders' },
    yield_pct: { value: yieldPct, drilldown_path: '/mfg/production-entries' },
    defect_pct: { value: defectPct, drilldown_path: '/mfg/scrap-entries' },
    scrap: { value: scrapTotal, drilldown_path: '/mfg/scrap-entries' },
    wip_est: { value: planTotal - completedTotal, drilldown_path: '/mfg/work-orders' },
    cost_variance: { value: 0, drilldown_path: '/mfg/standard-costs' },
  };

  const soRows = await (MfgSalesOrder as any).findAll({
    where: { tenant_id: tenantId, company_id: companyId, is_active: true },
    attributes: ['status', 'id'],
  });
  const soByStatus: Record<string, number> = {};
  for (const so of soRows) soByStatus[so.status] = (soByStatus[so.status] || 0) + 1;

  const undelivered = soRows.filter((s: any) => ['approved', 'partially_delivered', 'submitted'].includes(s.status)).length;

  const monthInvoices = await (Invoice as any).findAll({
    where: {
      tenant_id: tenantId,
      company_id: companyId,
      is_active: true,
      invoice_date: dateOnlyMonthRange(periodYm),
    },
    attributes: ['total_amount', 'payment_status', 'invoice_date'],
  });
  const monthlyDispatch = monthInvoices.reduce((s: number, r: any) => s + n(r.total_amount), 0);

  const now = new Date();
  const arBuckets = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 };
  for (const inv of monthInvoices) {
    if (inv.payment_status === 'paid') continue;
    const amt = n(inv.total_amount);
    const invDate = inv.invoice_date ? new Date(inv.invoice_date) : now;
    const days = Math.floor((now.getTime() - invDate.getTime()) / 86400000);
    if (days <= 30) arBuckets.current += amt;
    else if (days <= 60) arBuckets.d30 += amt;
    else if (days <= 90) arBuckets.d60 += amt;
    else if (days <= 120) arBuckets.d90 += amt;
    else arBuckets.over90 += amt;
  }

  const sales = {
    so_by_status: { value: soByStatus, drilldown_path: '/mfg/sales-orders' },
    undelivered: { value: undelivered, drilldown_path: '/mfg/sales-orders' },
    monthly_dispatch: await kpiWithFx(tenantId, 'Monthly Dispatch', monthlyDispatch, '/invoice/e-invoice-management'),
    credit_limit_breach: { value: 0, drilldown_path: '/mfg/sales-orders' },
    ar_aging: { value: arBuckets, drilldown_path: '/accounting/account-ledger' },
  };

  const complianceItems = await (HqComplianceItem as any).findAll({
    where: { tenant_id: tenantId, company_id: companyId, is_active: true },
    order: [['due_date', 'ASC']],
    limit: 20,
  });

  const compliance = {
    items: complianceItems,
    gst_summary: {
      gstr1_pending: complianceItems.filter((c: any) => c.item_type === 'gstr1' && c.status !== 'done').length,
      gstr3b_pending: complianceItems.filter((c: any) => c.item_type === 'gstr3b' && c.status !== 'done').length,
      drilldown_path: '/hq/compliance',
    },
  };

  const payload = {
    generated_at: new Date().toISOString(),
    company_id: companyId,
    tenant_id: tenantId,
    finance,
    purchase_inventory,
    production,
    sales,
    compliance,
  };

  return maskSensitive(payload, user);
};

export default { getIntegratedDashboard, getDrilldown };
