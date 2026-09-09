import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import HvoPageHeader from '../../components/Common/HvoPageHeader';
import {
  hvoBodyListTableSx,
  hvoBodyListZoneSx,
  hvoBodyOutlinedBtnSx,
  hvoFilterFieldHeightSx,
  hvoFilterToolbarSx,
  hvoOutlinedLabelProps,
  hvoPageRootSx,
  hvoSearchFieldSx,
  hvoTableBodyRowSx,
  hvoTableHeadHighlightSx,
  hvoTableScrollSx,
} from '../../theme/hvoLayout';
import { useTranslation } from 'react-i18next';
import { payrollService } from '../../services/api';

type MyPayrollRow = {
  id: number;
  payroll_period: string;
  gross_salary?: number | string | null;
  net_salary?: number | string | null;
  status?: string | null;
  payment_date?: string | null;
  created_at?: string;
};

const filterFieldSx = { ...hvoSearchFieldSx, ...hvoFilterFieldHeightSx } as const;

const listStateBoxSx = {
  ...hvoBodyListTableSx,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  py: { xs: 6, sm: 8 },
  px: 3,
  gap: 1.5,
} as const;

/** 내 정보·업무 > 내 급여 목록 */
const MyPayrollList: React.FC = () => {
  const { t } = useTranslation();

  const [rows, setRows] = useState<MyPayrollRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await payrollService.getMyPayrolls({
        period: period.trim() || undefined,
      });
      if (!res?.success) throw new Error(res?.message || 'load failed');
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setRows([]);
      setError(
        e?.response?.data?.message ||
          e?.message ||
          t('myPayrollList.errors.loadFailed')
      );
    } finally {
      setLoading(false);
    }
  }, [period, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatMoney = (value: number | string | null | undefined) => {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return '-';
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const statusLabel = (status?: string | null) => {
    const key = String(status || '').trim().toLowerCase();
    if (!key) return '-';
    return t(`payrollManagement.status.${key}`, {
      defaultValue: status || '-',
    });
  };

  return (
    <Box sx={hvoPageRootSx}>
      <HvoPageHeader
        title={t('myPayrollList.title')}
        description={t('myPayrollList.description')}
      />

      <Box sx={{ ...hvoFilterToolbarSx, mb: 2 }}>
        <TextField
          size="small"
          label={t('myPayrollList.period')}
          placeholder="YYYY-MM"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          {...hvoOutlinedLabelProps}
          sx={{ ...filterFieldSx, minWidth: 140, maxWidth: 180 }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<Search fontSize="small" />}
          onClick={() => void load()}
          disabled={loading}
          sx={hvoBodyOutlinedBtnSx}
        >
          {t('myPayrollList.search')}
        </Button>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 0 }}>
          {error}
        </Alert>
      ) : null}

      <Box sx={hvoBodyListZoneSx}>
        {loading ? (
          <Box sx={listStateBoxSx}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              {t('myPayrollList.empty.loading')}
            </Typography>
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={listStateBoxSx}>
            <Typography variant="body1" fontWeight={600}>
              {t('myPayrollList.empty.noItems')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('myPayrollList.empty.noItemsHint')}
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ ...hvoBodyListTableSx, ...hvoTableScrollSx }}>
            <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={hvoTableHeadHighlightSx}>{t('myPayrollList.columns.period')}</TableCell>
                  <TableCell align="right" sx={hvoTableHeadHighlightSx}>
                    {t('myPayrollList.columns.gross')}
                  </TableCell>
                  <TableCell align="right" sx={hvoTableHeadHighlightSx}>
                    {t('myPayrollList.columns.net')}
                  </TableCell>
                  <TableCell sx={hvoTableHeadHighlightSx}>{t('myPayrollList.columns.status')}</TableCell>
                  <TableCell sx={hvoTableHeadHighlightSx}>
                    {t('myPayrollList.columns.paymentDate')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} sx={hvoTableBodyRowSx}>
                    <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.payroll_period || '-'}
                    </TableCell>
                    <TableCell align="right">{formatMoney(row.gross_salary)}</TableCell>
                    <TableCell align="right">{formatMoney(row.net_salary)}</TableCell>
                    <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {statusLabel(row.status)}
                    </TableCell>
                    <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.payment_date || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};

export default MyPayrollList;
