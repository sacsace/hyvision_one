import { Op } from 'sequelize';
import {
  MfgKpiDaily,
  MfgPurchaseOrder,
  MfgSalesOrder,
  MfgStockLedgerEntry,
  MfgWorkOrder,
  MfgPurchaseRequisition,
  Invoice,
} from '../models';

export const dateOnlyMonthRange = (periodYm: string) => {
  const [ys, ms] = periodYm.split('-');
  const y = Number(ys);
  const m = Number(ms);
  if (!y || !m) {
    return { [Op.eq]: periodYm };
  }
  const start = `${periodYm}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${periodYm}-${String(lastDay).padStart(2, '0')}`;
  return { [Op.between]: [start, end] };
};

export const refreshKpiDaily = async (tenantId: number, companyId: number, kpiDate?: string) => {
  const date = kpiDate || new Date().toISOString().slice(0, 10);
  const periodYm = date.slice(0, 7);

  const openSoCount = await (MfgSalesOrder as any).count({
    where: {
      tenant_id: tenantId,
      company_id: companyId,
      is_active: true,
      status: { [Op.in]: ['approved', 'partially_delivered', 'submitted'] },
    },
  });
  const openPoCount = await (MfgPurchaseOrder as any).count({
    where: {
      tenant_id: tenantId,
      company_id: companyId,
      is_active: true,
      status: { [Op.in]: ['approved', 'submitted'] },
    },
  });

  const ledgerRows = await (MfgStockLedgerEntry as any).findAll({
    where: { tenant_id: tenantId, company_id: companyId },
    attributes: ['product_id', 'qty_in', 'qty_out', 'unit_cost'],
  });
  const stockMap = new Map<number, { qty: number; value: number }>();
  for (const r of ledgerRows) {
    const pid = r.product_id;
    const cur = stockMap.get(pid) || { qty: 0, value: 0 };
    const delta = Number(r.qty_in || 0) - Number(r.qty_out || 0);
    cur.qty += delta;
    cur.value += delta * Number(r.unit_cost || 0);
    stockMap.set(pid, cur);
  }
  const inventoryValue = Array.from(stockMap.values()).reduce((s, v) => s + v.value, 0);

  const productionRows = await (MfgWorkOrder as any).findAll({
    where: {
      tenant_id: tenantId,
      company_id: companyId,
      is_active: true,
      updated_at: { [Op.gte]: new Date(`${date}T00:00:00`) },
    },
    attributes: ['completed_qty', 'scrap_qty', 'plan_qty'],
  });
  const productionQty = productionRows.reduce((s: number, r: any) => s + Number(r.completed_qty || 0), 0);
  const scrapQty = productionRows.reduce((s: number, r: any) => s + Number(r.scrap_qty || 0), 0);
  const totalPlan = productionRows.reduce((s: number, r: any) => s + Number(r.plan_qty || 0), 0);
  const yieldPct = totalPlan > 0 ? (productionQty / totalPlan) * 100 : 0;

  const monthInvoices = await (Invoice as any).findAll({
    where: {
      tenant_id: tenantId,
      company_id: companyId,
      is_active: true,
      invoice_date: dateOnlyMonthRange(periodYm),
    },
    attributes: ['total_amount', 'payment_status'],
  });
  const salesAmount = monthInvoices.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
  const arAmount = monthInvoices
    .filter((r: any) => r.payment_status !== 'paid')
    .reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);

  const payload = {
    tenant_id: tenantId,
    company_id: companyId,
    kpi_date: date,
    sales_amount: salesAmount,
    cogs_amount: 0,
    inventory_value: inventoryValue,
    production_qty: productionQty,
    scrap_qty: scrapQty,
    yield_pct: yieldPct,
    open_po_count: openPoCount,
    open_so_count: openSoCount,
    ar_amount: arAmount,
    ap_amount: 0,
  };

  const [row] = await (MfgKpiDaily as any).findOrCreate({
    where: { tenant_id: tenantId, company_id: companyId, kpi_date: date },
    defaults: payload,
  });
  await row.update(payload);
  return row;
};

export const getHqDashboard = async (tenantId: number, companyId: number) => {
  const today = new Date().toISOString().slice(0, 10);
  let kpi = await (MfgKpiDaily as any).findOne({
    where: { tenant_id: tenantId, company_id: companyId, kpi_date: today },
  });
  if (!kpi) kpi = await refreshKpiDaily(tenantId, companyId, today);

  const openPrCount = await (MfgPurchaseRequisition as any).count({
    where: {
      tenant_id: tenantId,
      company_id: companyId,
      is_active: true,
      status: { [Op.in]: ['draft', 'submitted', 'approved'] },
    },
  });

  const activeWoCount = await (MfgWorkOrder as any).count({
    where: {
      tenant_id: tenantId,
      company_id: companyId,
      is_active: true,
      status: { [Op.in]: ['released', 'in_progress'] },
    },
  });

  const plain = typeof kpi.toJSON === 'function' ? kpi.toJSON() : kpi;
  return {
    kpi: plain,
    summary: {
      open_pr_count: openPrCount,
      active_wo_count: activeWoCount,
      open_po_count: plain.open_po_count,
      open_so_count: plain.open_so_count,
      inventory_value: plain.inventory_value,
      sales_amount_mtd: plain.sales_amount,
    },
  };
};

export default getHqDashboard;
