import { HqExportLog, HqReportJob, MfgHqReportSnapshot } from '../models';

export interface ReportCatalogEntry {
  key: string;
  title_ko: string;
  title_en: string;
  category: string;
  default_format: 'excel' | 'pdf';
}

export const REPORT_CATALOG: ReportCatalogEntry[] = [
  { key: 'finance_pl', title_ko: '손익 요약', title_en: 'P&L Summary', category: 'finance', default_format: 'excel' },
  { key: 'finance_bs', title_ko: '재무상태', title_en: 'Balance Sheet', category: 'finance', default_format: 'excel' },
  { key: 'finance_cash', title_ko: '현금·은행', title_en: 'Cash & Bank', category: 'finance', default_format: 'excel' },
  { key: 'finance_ar_aging', title_ko: '매출채권 Aging', title_en: 'AR Aging', category: 'finance', default_format: 'excel' },
  { key: 'finance_ap_aging', title_ko: '매입채무 Aging', title_en: 'AP Aging', category: 'finance', default_format: 'excel' },
  { key: 'purchase_po_status', title_ko: 'PO 현황', title_en: 'PO Status', category: 'purchase', default_format: 'excel' },
  { key: 'inventory_stock', title_ko: '재고 현황', title_en: 'Stock Status', category: 'inventory', default_format: 'excel' },
  { key: 'production_wo', title_ko: '작업지시 현황', title_en: 'Work Orders', category: 'production', default_format: 'excel' },
  { key: 'sales_so_status', title_ko: '판매오더 현황', title_en: 'Sales Orders', category: 'sales', default_format: 'excel' },
  { key: 'compliance_gst', title_ko: 'GST 요약', title_en: 'GST Summary', category: 'compliance', default_format: 'pdf' },
  { key: 'hq_kpi_daily', title_ko: '일일 KPI', title_en: 'Daily KPI', category: 'hq', default_format: 'excel' },
];

export const listAvailableReports = (): ReportCatalogEntry[] => REPORT_CATALOG;

export const createSnapshot = async (params: {
  tenantId: number;
  companyId: number;
  reportKey: string;
  period: string;
  payload: object;
  userId: number;
  title?: string;
}) => {
  const catalog = REPORT_CATALOG.find((r) => r.key === params.reportKey);
  const title = params.title || catalog?.title_en || params.reportKey;
  return (MfgHqReportSnapshot as any).create({
    tenant_id: params.tenantId,
    company_id: params.companyId,
    report_type: params.reportKey,
    report_period: params.period,
    title,
    payload: params.payload,
    created_by: params.userId,
  });
};

export const queueReportJob = async (params: {
  tenantId: number;
  companyId: number;
  reportKey: string;
  format?: string;
  params?: object;
  userId: number;
}) => {
  const job = await (HqReportJob as any).create({
    tenant_id: params.tenantId,
    company_id: params.companyId,
    report_key: params.reportKey,
    status: 'queued',
    format: params.format ?? 'excel',
    params: params.params ?? null,
    created_by: params.userId,
  });

  setImmediate(async () => {
    try {
      await job.update({ status: 'running' });
      const snapshot = await createSnapshot({
        tenantId: params.tenantId,
        companyId: params.companyId,
        reportKey: params.reportKey,
        period: new Date().toISOString().slice(0, 7),
        payload: { queued: true, params: params.params ?? {} },
        userId: params.userId,
      });
      await job.update({
        status: 'done',
        result_snapshot_id: snapshot.id,
        finished_at: new Date(),
      });
    } catch (err: any) {
      await job.update({
        status: 'failed',
        error_message: err?.message || 'Report job failed',
        finished_at: new Date(),
      });
    }
  });

  return job;
};

export const logExport = async (params: {
  tenantId: number;
  companyId: number;
  userId: number;
  exportType: string;
  reportKey?: string;
  rowCount?: number;
  format?: 'excel' | 'pdf';
  ipAddress?: string;
  userAgent?: string;
}) => {
  return (HqExportLog as any).create({
    tenant_id: params.tenantId,
    company_id: params.companyId,
    user_id: params.userId,
    export_type: params.exportType,
    report_key: params.reportKey ?? null,
    row_count: params.rowCount ?? null,
    format: params.format ?? 'excel',
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
  });
};

export default { listAvailableReports, createSnapshot, queueReportJob, logExport };
