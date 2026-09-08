import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import HvoPageHeader from '../../components/Common/HvoPageHeader';
import {
  hvoBodyCardSx,
  hvoBodyListTableSx,
  hvoBodyPrimaryBtnSx,
  hvoPageRootSx,
  hvoTableHeadHighlightSx,
} from '../../theme/hvoLayout';
import { hqPortalService } from '../../services/api';

const fmtAmt = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const KpiCard: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: string;
  onClick?: () => void;
}> = ({ label, value, sub, onClick }) => (
  <Card
    elevation={0}
    onClick={onClick}
    sx={{
      ...hvoBodyCardSx,
      border: '1px solid #B4B4B4',
      borderRadius: 0,
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick ? { bgcolor: '#F8FAFC' } : undefined,
    }}
  >
    <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
      <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.3 }}>{value}</Typography>
      {sub ? (
        <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', mt: 0.35 }}>{sub}</Typography>
      ) : null}
    </CardContent>
  </Card>
);

export const HqIntegratedDashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [tzNow, setTzNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setTzNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const clocks = useMemo(() => {
    const locale = i18n.language?.startsWith('en') ? 'en-IN' : 'ko-KR';
    return {
      india: tzNow.toLocaleString(locale, { timeZone: 'Asia/Kolkata', hour12: false }),
      korea: tzNow.toLocaleString(locale, { timeZone: 'Asia/Seoul', hour12: false }),
    };
  }, [tzNow, i18n.language]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await hqPortalService.dashboard();
      setData(res?.data || res);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || t('hqPortal.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const goDrill = async (section: string, fallbackPath?: string) => {
    try {
      const res = await hqPortalService.drilldown(section);
      const path = res?.data?.path || fallbackPath;
      if (path) navigate(path);
    } catch {
      if (fallbackPath) navigate(fallbackPath);
    }
  };

  const finance = data?.finance || {};
  const purchase = data?.purchase_inventory || data?.purchase || {};
  const production = data?.production || {};
  const sales = data?.sales || {};
  const compliance = data?.compliance || {};

  const toKpiList = (section: any): any[] => {
    if (!section || typeof section !== 'object') return [];
    if (Array.isArray(section.kpis)) return section.kpis;
    if (Array.isArray(section.items) && section.items[0] && (section.items[0].label || section.items[0].value_inr != null)) {
      return section.items;
    }
    return Object.entries(section)
      .filter(([key]) => !['items', 'gst_summary', 'kpis'].includes(key))
      .map(([key, raw]) => {
        const v: any = raw || {};
        if (v && typeof v === 'object' && !Array.isArray(v) && (v.label || v.value_inr != null || v.value != null || v.amounts)) {
          return {
            label: v.label || key,
            value_inr: v.value_inr ?? (typeof v.value === 'number' ? v.value : undefined),
            value: typeof v.value === 'number' || typeof v.value === 'string' ? v.value : undefined,
            amounts: v.amounts,
            drilldown_path: v.drilldown_path,
          };
        }
        if (typeof v === 'number' || typeof v === 'string') {
          return { label: key, value: v };
        }
        return { label: key, value: JSON.stringify(v) };
      });
  };

  const renderKpiList = (section: any, sectionKey: string, fallback: string) => {
    const list = toKpiList(section);
    if (!list.length) {
      return (
        <Grid size={{ xs: 12 }}>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>—</Typography>
        </Grid>
      );
    }
    return list.map((item: any, idx: number) => (
      <Grid size={{ xs: 6, sm: 4, md: 3 }} key={`${sectionKey}-${idx}`}>
        <KpiCard
          label={item.label || item.name || sectionKey}
          value={
            item.amounts
              ? `₹${fmtAmt(item.amounts.inr)}`
              : fmtAmt(item.value_inr ?? item.value ?? item.count)
          }
          sub={
            item.amounts
              ? `₩${fmtAmt(item.amounts.krw)} · $${fmtAmt(item.amounts.usd)}`
              : item.drilldown_path || undefined
          }
          onClick={() => void goDrill(sectionKey, item.drilldown_path || fallback)}
        />
      </Grid>
    ));
  };

  return (
    <Box sx={hvoPageRootSx}>
      <HvoPageHeader
        title={t('hqPortal.dashboardTitle')}
        description={t('hqPortal.dashboardDesc')}
        actions={
          <Button variant="contained" sx={hvoBodyPrimaryBtnSx} onClick={() => void load()}>
            {t('hqPortal.refresh')}
          </Button>
        }
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          India (IST): {clocks.india}
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          Korea (KST): {clocks.korea}
        </Typography>
      </Box>

      {error ? (
        <Typography color="error" sx={{ mb: 1, fontSize: '0.8125rem' }}>
          {error}
        </Typography>
      ) : null}

      {loading ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{t('hqPortal.finance')}</Typography>
          <Grid container spacing={1}>
            {renderKpiList(finance, 'finance', '/accounting/profit-and-loss')}
          </Grid>

          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{t('hqPortal.purchaseInventory')}</Typography>
          <Grid container spacing={1}>
            {renderKpiList(purchase, 'purchase', '/purchase/orders')}
          </Grid>

          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{t('hqPortal.production')}</Typography>
          <Grid container spacing={1}>
            {renderKpiList(production, 'production', '/mfg/work-orders')}
          </Grid>

          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{t('hqPortal.sales')}</Typography>
          <Grid container spacing={1}>
            {renderKpiList(sales, 'sales', '/mfg/sales-orders')}
          </Grid>

          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{t('hqPortal.compliance')}</Typography>
          <Grid container spacing={1}>
            {renderKpiList(
              {
                ...compliance.gst_summary,
                items_count: { label: 'Compliance items', value: (compliance.items || []).length, drilldown_path: '/hq/compliance' },
              },
              'compliance',
              '/hq/compliance'
            )}
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <KpiCard
                label={t('hqPortal.pendingApprovals')}
                value={fmtAmt(data?.pending_approvals ?? compliance.pending_approvals)}
                onClick={() => navigate('/hq/approvals')}
              />
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

const SimpleHqTablePage: React.FC<{
  title: string;
  description: string;
  columns: { key: string; label: string }[];
  load: () => Promise<any>;
  mapRows?: (res: any) => any[];
  actions?: React.ReactNode;
  onRowAction?: (row: any) => React.ReactNode;
}> = ({ title, description, columns, load, mapRows, actions, onRowAction }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await load();
      setRows(mapRows ? mapRows(res) : res?.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Load failed');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [load, mapRows]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <Box sx={hvoPageRootSx}>
      <HvoPageHeader title={title} description={description} actions={actions} />
      {error ? (
        <Typography color="error" sx={{ mb: 1, fontSize: '0.8125rem' }}>
          {error}
        </Typography>
      ) : null}
      {loading ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Table size="small" sx={hvoBodyListTableSx}>
          <TableHead sx={hvoTableHeadHighlightSx}>
            <TableRow>
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  sx={{ bgcolor: '#C6EFCE', borderColor: '#B4B4B4', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  {c.label}
                </TableCell>
              ))}
              {onRowAction ? (
                <TableCell sx={{ bgcolor: '#C6EFCE', borderColor: '#B4B4B4', fontSize: '0.75rem', fontWeight: 700 }}>
                  Action
                </TableCell>
              ) : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (onRowAction ? 1 : 0)} sx={{ fontSize: '0.8125rem' }}>
                  —
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow key={row.id ?? idx} hover>
                  {columns.map((c) => (
                    <TableCell key={c.key} sx={{ fontSize: '0.75rem', borderColor: '#B4B4B4' }}>
                      {row[c.key] == null || row[c.key] === '' ? '—' : String(row[c.key])}
                    </TableCell>
                  ))}
                  {onRowAction ? (
                    <TableCell sx={{ fontSize: '0.75rem', borderColor: '#B4B4B4' }}>{onRowAction(row)}</TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

export const HqApprovalsPage: React.FC = () => {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);
  return (
    <SimpleHqTablePage
      key={tick}
      title={t('hqPortal.approvalsTitle')}
      description={t('hqPortal.approvalsDesc')}
      columns={[
        { key: 'doc_type', label: t('hqPortal.docType') },
        { key: 'doc_no', label: t('hqPortal.docNo') },
        { key: 'partner_name', label: t('hqPortal.partner') },
        { key: 'amount', label: t('hqPortal.amount') },
        { key: 'status', label: t('hqPortal.status') },
        { key: 'created_at', label: t('hqPortal.requestedAt') },
      ]}
      load={() => hqPortalService.listApprovals({ status: 'pending' })}
      mapRows={(r) => r?.data || []}
      onRowAction={(row) =>
        row.status === 'pending' ? (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button
              size="small"
              variant="contained"
              onClick={async () => {
                await hqPortalService.approveRequest(row.id);
                setTick((x) => x + 1);
              }}
            >
              {t('hqPortal.approve')}
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={async () => {
                await hqPortalService.rejectRequest(row.id);
                setTick((x) => x + 1);
              }}
            >
              {t('hqPortal.reject')}
            </Button>
          </Box>
        ) : null
      }
    />
  );
};

export const HqReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    void hqPortalService.reportCatalog().then((r) => setCatalog(r?.data || [])).catch(() => setCatalog([]));
  }, []);

  const createSnap = async (reportKey: string) => {
    setMsg('');
    try {
      const period = new Date().toISOString().slice(0, 7);
      await hqPortalService.createSnapshot({
        report_key: reportKey,
        report_type: reportKey,
        report_period: period,
        title: `${reportKey} ${period}`,
        payload: { generated_at: new Date().toISOString(), note: 'HQ snapshot' },
      });
      await hqPortalService.logExport({
        export_type: 'snapshot',
        report_key: reportKey,
        format: 'excel',
        row_count: 0,
      });
      setMsg(t('hqPortal.snapshotSaved'));
    } catch (e: any) {
      setMsg(e?.response?.data?.message || e?.message || 'Failed');
    }
  };

  return (
    <Box sx={hvoPageRootSx}>
      <HvoPageHeader title={t('hqPortal.reportsTitle')} description={t('hqPortal.reportsDesc')} />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1.5, minHeight: 36 }}>
        <Tab label={t('hqPortal.catalog')} sx={{ minHeight: 36, textTransform: 'none' }} />
        <Tab label={t('hqPortal.snapshots')} sx={{ minHeight: 36, textTransform: 'none' }} />
      </Tabs>
      {msg ? (
        <Typography sx={{ mb: 1, fontSize: '0.8125rem' }}>{msg}</Typography>
      ) : null}
      {tab === 0 ? (
        <Table size="small" sx={hvoBodyListTableSx}>
          <TableHead sx={hvoTableHeadHighlightSx}>
            <TableRow>
              <TableCell sx={{ bgcolor: '#C6EFCE', borderColor: '#B4B4B4' }}>{t('hqPortal.reportKey')}</TableCell>
              <TableCell sx={{ bgcolor: '#C6EFCE', borderColor: '#B4B4B4' }}>{t('hqPortal.reportName')}</TableCell>
              <TableCell sx={{ bgcolor: '#C6EFCE', borderColor: '#B4B4B4' }}>Snapshot</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(catalog.length ? catalog : [{ key: 'monthly_pnl', name: 'Monthly P&L' }]).map((r: any) => (
              <TableRow key={r.key || r.report_key} hover>
                <TableCell sx={{ fontSize: '0.75rem', borderColor: '#B4B4B4' }}>
                  {r.key || r.report_key}
                </TableCell>
                <TableCell sx={{ fontSize: '0.75rem', borderColor: '#B4B4B4' }}>
                  {r.name || r.title || r.key}
                </TableCell>
                <TableCell sx={{ borderColor: '#B4B4B4' }}>
                  <Button size="small" onClick={() => void createSnap(r.key || r.report_key)}>
                    Snapshot
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <SimpleHqTablePage
          title=""
          description=""
          columns={[
            { key: 'report_type', label: t('hqPortal.reportKey') },
            { key: 'report_period', label: t('hqPortal.period') },
            { key: 'title', label: t('hqPortal.reportName') },
            { key: 'created_at', label: t('hqPortal.createdAt') },
          ]}
          load={() => hqPortalService.listSnapshots()}
          mapRows={(r) => r?.data || []}
        />
      )}
    </Box>
  );
};

export const HqCompliancePage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <SimpleHqTablePage
      title={t('hqPortal.complianceTitle')}
      description={t('hqPortal.complianceDesc')}
      columns={[
        { key: 'item_type', label: t('hqPortal.type') },
        { key: 'title', label: t('hqPortal.reportName') },
        { key: 'due_date', label: t('hqPortal.dueDate') },
        { key: 'status', label: t('hqPortal.status') },
      ]}
      load={() => hqPortalService.listCompliance()}
      mapRows={(r) => r?.data || []}
    />
  );
};

export const HqFxRatesPage: React.FC = () => {
  const { t } = useTranslation();
  const [from, setFrom] = useState('INR');
  const [to, setTo] = useState('KRW');
  const [rate, setRate] = useState('16.5');
  const [tick, setTick] = useState(0);

  return (
    <SimpleHqTablePage
      key={tick}
      title={t('hqPortal.fxTitle')}
      description={t('hqPortal.fxDesc')}
      columns={[
        { key: 'rate_date', label: t('hqPortal.rateDate') },
        { key: 'from_currency', label: 'From' },
        { key: 'to_currency', label: 'To' },
        { key: 'rate', label: t('hqPortal.rate') },
        { key: 'source', label: t('hqPortal.source') },
      ]}
      load={() => hqPortalService.listFxRates()}
      mapRows={(r) => r?.data || []}
      actions={
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField size="small" label="From" value={from} onChange={(e) => setFrom(e.target.value)} sx={{ width: 80 }} />
          <TextField size="small" label="To" value={to} onChange={(e) => setTo(e.target.value)} sx={{ width: 80 }} />
          <TextField size="small" label="Rate" value={rate} onChange={(e) => setRate(e.target.value)} sx={{ width: 100 }} />
          <Button
            variant="contained"
            sx={hvoBodyPrimaryBtnSx}
            onClick={async () => {
              await hqPortalService.upsertFxRate({
                rate_date: new Date().toISOString().slice(0, 10),
                from_currency: from,
                to_currency: to,
                rate: Number(rate),
                source: 'manual',
              });
              setTick((x) => x + 1);
            }}
          >
            {t('hqPortal.saveRate')}
          </Button>
        </Box>
      }
    />
  );
};

export const HqAccessLogsPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <SimpleHqTablePage
      title={t('hqPortal.accessLogsTitle')}
      description={t('hqPortal.accessLogsDesc')}
      columns={[
        { key: 'created_at', label: t('hqPortal.createdAt') },
        { key: 'user_id', label: 'User' },
        { key: 'action', label: 'Action' },
        { key: 'resource', label: 'Resource' },
        { key: 'ip_address', label: 'IP' },
        { key: 'country_code', label: 'Country' },
      ]}
      load={() => hqPortalService.listAccessLogs()}
      mapRows={(r) => r?.data || []}
    />
  );
};

export const HqUsersPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <SimpleHqTablePage
      title={t('hqPortal.usersTitle')}
      description={t('hqPortal.usersDesc')}
      columns={[
        { key: 'userid', label: 'ID' },
        { key: 'username', label: 'Name' },
        { key: 'hq_role', label: 'HQ Role' },
        { key: 'hq_access_level', label: 'Access Level' },
        { key: 'hq_can_approve', label: 'Approve' },
        { key: 'hq_can_view_cost', label: 'View Cost' },
        { key: 'hq_can_view_hr_pii', label: 'HR PII' },
      ]}
      load={() => hqPortalService.listHqUsers()}
      mapRows={(r) => r?.data || []}
    />
  );
};

export default HqIntegratedDashboardPage;
