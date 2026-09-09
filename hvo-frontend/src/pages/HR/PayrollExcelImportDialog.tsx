import React, { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { FileUpload as FileUploadIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  hvoBodyOutlinedBtnSx,
  hvoBodyPrimaryBtnSx,
  hvoTableBodyRowSx,
  hvoTableHeadHighlightSx,
} from '../../theme/hvoLayout';
import { payrollService } from '../../services/api';
import {
  parsePayrollExcelFile,
  type PayrollExcelDraftRow,
} from './payroll/parsePayrollExcelFile';

type Props = {
  open: boolean;
  onClose: () => void;
  payrollPeriod: string;
  companyId?: number | null;
  onSuccess?: () => void;
};

type ImportResultSummary = {
  created: number;
  replaced: number;
  matched: number;
  skipped: Array<{ row: number; email: string; reason: string }>;
};

const PayrollExcelImportDialog: React.FC<Props> = ({
  open,
  onClose,
  payrollPeriod,
  companyId,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [draftRows, setDraftRows] = useState<PayrollExcelDraftRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResultSummary | null>(null);

  const resetState = () => {
    setFileName('');
    setDraftRows([]);
    setParsing(false);
    setImporting(false);
    setError('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (importing) return;
    resetState();
    onClose();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setError('');
    setResult(null);
    setFileName(file.name);
    try {
      const parsed = await parsePayrollExcelFile(file, {
        payrollPeriod,
        companyId: companyId ?? null,
      });
      if (!parsed.rows.length) {
        setDraftRows([]);
        setError(t('payrollManagement.excelImport.noRows'));
        return;
      }
      setDraftRows(parsed.rows);
    } catch (e: any) {
      setDraftRows([]);
      setError(
        e?.message === 'NO_SHEET'
          ? t('payrollManagement.excelImport.noSheet')
          : e?.message || t('payrollManagement.excelImport.parseFailed')
      );
    } finally {
      setParsing(false);
      event.target.value = '';
    }
  };

  const handleImport = async () => {
    if (!draftRows.length || !payrollPeriod) return;
    setImporting(true);
    setError('');
    setResult(null);
    try {
      const rows = draftRows.map((row) => ({
        employee_email: row.employee_email,
        emp_id: row.emp_id || undefined,
        employee_name: row.employee_name || undefined,
        department: row.department || undefined,
        position: row.position || undefined,
        basic_salary: row.basic_salary,
        overtime_pay: row.overtime_pay,
        bonus: row.bonus,
        allowances: row.allowances,
        deductions: row.deductions,
        gross_salary: row.gross_salary,
        net_salary: row.net_salary,
        tax_amount: row.tax_amount,
        extra_fields: row.extra_fields,
      }));
      const res = await payrollService.bulkImportPayrolls({
        payroll_period: payrollPeriod,
        replace_matched: true,
        rows,
      });
      if (!res?.success) {
        throw new Error(res?.message || t('payrollManagement.excelImport.importFailed'));
      }
      const data = (res.data || {}) as ImportResultSummary;
      setResult({
        created: Number(data.created) || 0,
        replaced: Number(data.replaced) || 0,
        matched: Number(data.matched) || 0,
        skipped: Array.isArray(data.skipped) ? data.skipped : [],
      });
      onSuccess?.();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          t('payrollManagement.excelImport.importFailed')
      );
    } finally {
      setImporting(false);
    }
  };

  const formatMoney = (n: number) =>
    Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem', py: 1.5 }}>
        {t('payrollManagement.excelImport.title')}
      </DialogTitle>
      <DialogContent dividers sx={{ px: 2, py: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t('payrollManagement.excelImport.hint', { period: payrollPeriod || '-' })}
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            hidden
            onChange={handleFileChange}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={parsing ? <CircularProgress size={14} /> : <FileUploadIcon fontSize="small" />}
            disabled={parsing || importing}
            onClick={() => fileInputRef.current?.click()}
            sx={hvoBodyOutlinedBtnSx}
          >
            {t('payrollManagement.excelImport.selectFile')}
          </Button>
          {fileName ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {fileName}
            </Typography>
          ) : null}
        </Box>

        {error ? (
          <Alert severity="error" sx={{ mb: 1.5, borderRadius: 0 }}>
            {error}
          </Alert>
        ) : null}

        {result ? (
          <Alert severity="success" sx={{ mb: 1.5, borderRadius: 0 }}>
            {t('payrollManagement.excelImport.resultSummary', {
              created: result.created,
              replaced: result.replaced,
              skipped: result.skipped.length,
            })}
          </Alert>
        ) : null}

        {result && result.skipped.length > 0 ? (
          <Box sx={{ mb: 1.5, maxHeight: 140, overflow: 'auto', border: '1px solid #B4B4B4' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...hvoTableHeadHighlightSx, py: 0.5 }}>
                    {t('payrollManagement.excelImport.colRow')}
                  </TableCell>
                  <TableCell sx={{ ...hvoTableHeadHighlightSx, py: 0.5 }}>
                    {t('payrollManagement.excelImport.colEmail')}
                  </TableCell>
                  <TableCell sx={{ ...hvoTableHeadHighlightSx, py: 0.5 }}>
                    {t('payrollManagement.excelImport.colReason')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.skipped.map((s) => (
                  <TableRow key={`${s.row}-${s.email}-${s.reason}`} sx={hvoTableBodyRowSx}>
                    <TableCell sx={{ py: 0.5 }}>{s.row}</TableCell>
                    <TableCell sx={{ py: 0.5, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.email || '-'}
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      {t(`payrollManagement.excelImport.skipReasons.${s.reason}`, {
                        defaultValue: s.reason,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        ) : null}

        {!result && draftRows.length > 0 ? (
          <TableContainer
            sx={{
              maxHeight: 360,
              border: '1px solid #B4B4B4',
              borderRadius: 0,
            }}
          >
            <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...hvoTableHeadHighlightSx, width: 48, py: 0.5 }}>
                    {t('payrollManagement.excelImport.colRow')}
                  </TableCell>
                  <TableCell sx={{ ...hvoTableHeadHighlightSx, py: 0.5 }}>
                    {t('payrollManagement.excelImport.colName')}
                  </TableCell>
                  <TableCell sx={{ ...hvoTableHeadHighlightSx, py: 0.5 }}>
                    {t('payrollManagement.excelImport.colEmail')}
                  </TableCell>
                  <TableCell sx={{ ...hvoTableHeadHighlightSx, py: 0.5 }}>
                    {t('payrollManagement.excelImport.colMatch')}
                  </TableCell>
                  <TableCell align="right" sx={{ ...hvoTableHeadHighlightSx, width: 110, py: 0.5 }}>
                    {t('payrollManagement.excelImport.colNet')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {draftRows.map((row) => (
                  <TableRow key={row.row_no} sx={hvoTableBodyRowSx}>
                    <TableCell sx={{ py: 0.5 }}>{row.row_no}</TableCell>
                    <TableCell
                      sx={{
                        py: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.employee_name || '-'}
                    </TableCell>
                    <TableCell
                      sx={{
                        py: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.employee_email || '-'}
                    </TableCell>
                    <TableCell
                      sx={{
                        py: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                      }}
                    >
                      {row.match_hint}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5 }}>
                      {formatMoney(row.net_salary)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}

        {!result && !parsing && !draftRows.length && !error ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            {t('payrollManagement.excelImport.emptyHint')}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button onClick={handleClose} disabled={importing} sx={hvoBodyOutlinedBtnSx}>
          {result ? t('common.close') : t('common.cancel')}
        </Button>
        {!result ? (
          <Button
            variant="contained"
            disableElevation
            disabled={!draftRows.length || importing || parsing || !payrollPeriod}
            onClick={() => void handleImport()}
            startIcon={importing ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={hvoBodyPrimaryBtnSx}
          >
            {t('payrollManagement.excelImport.confirm')}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
};

export default PayrollExcelImportDialog;
