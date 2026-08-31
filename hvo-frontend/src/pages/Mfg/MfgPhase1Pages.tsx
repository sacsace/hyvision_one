import React, { useCallback, useEffect, useState } from 'react';
import {
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
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import HvoPageHeader from '../../components/Common/HvoPageHeader';
import {
  hvoBodyCardSx,
  hvoBodyListTableSx,
  hvoBodyListZoneSx,
  hvoBodyPrimaryBtnSx,
  hvoPageRootSx,
  hvoTableHeadHighlightSx,
  hvoTableScrollSx,
} from '../../theme/hvoLayout';
import { mfgService } from '../../services/api';
import { useMenuRoutePermissionFlags } from '../../hooks/useMenuRoutePermissionFlags';

type Col = { key: string; label: string; width?: number };

type Props = {
  title: string;
  description: string;
  menuRoutes: readonly string[];
  columns: Col[];
  load: () => Promise<any>;
  mapRows?: (data: any) => any[];
  createFields?: { key: string; label: string; required?: boolean }[];
  onCreate?: (form: Record<string, string>) => Promise<void>;
  createLabel?: string;
};

export const MfgSimpleListPage: React.FC<Props> = ({
  title,
  description,
  menuRoutes,
  columns,
  load,
  mapRows,
  createFields,
  onCreate,
  createLabel = '추가',
}) => {
  const flags = useMenuRoutePermissionFlags(menuRoutes);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await load();
      const list = mapRows ? mapRows(res) : res?.data || res?.rows || [];
      setRows(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || '목록을 불러오지 못했습니다.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [load, mapRows]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!onCreate) return;
    setSaving(true);
    try {
      await onCreate(form);
      setOpen(false);
      setForm({});
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={hvoPageRootSx}>
      <HvoPageHeader
        title={title}
        description={description}
        actions={
          onCreate && flags.canCreate ? (
            <Button
              variant="contained"
              sx={hvoBodyPrimaryBtnSx}
              onClick={() => setOpen(true)}
            >
              {createLabel}
            </Button>
          ) : null
        }
      />

      {error ? (
        <Typography color="error" sx={{ mb: 1, fontSize: '0.8125rem' }}>
          {error}
        </Typography>
      ) : null}

      <Box sx={{ ...hvoBodyCardSx, ...hvoBodyListZoneSx }}>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Box sx={hvoTableScrollSx}>
            <Table size="small" sx={hvoBodyListTableSx}>
              <TableHead sx={hvoTableHeadHighlightSx}>
                <TableRow>
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      sx={{
                        whiteSpace: 'nowrap',
                        width: c.width,
                        borderColor: '#B4B4B4',
                        bgcolor: '#C6EFCE',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                      }}
                    >
                      {c.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} sx={{ fontSize: '0.8125rem' }}>
                      데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, idx) => (
                    <TableRow key={row.id ?? idx} hover>
                      {columns.map((c) => (
                        <TableCell
                          key={c.key}
                          sx={{
                            fontSize: '0.75rem',
                            borderColor: '#B4B4B4',
                            whiteSpace: 'nowrap',
                            maxWidth: 240,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {row[c.key] == null || row[c.key] === '' ? '—' : String(row[c.key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>

      {createFields && onCreate ? (
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ fontSize: '0.9375rem', fontWeight: 700 }}>{createLabel}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
            {createFields.map((f) => (
              <TextField
                key={f.key}
                label={f.label}
                required={f.required}
                size="small"
                value={form[f.key] || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>취소</Button>
            <Button variant="contained" disabled={saving} onClick={() => void handleCreate()}>
              저장
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Box>
  );
};

export const MfgBranchesPage: React.FC = () => (
  <MfgSimpleListPage
    title="사업장"
    description="제조·구매 문서에 사용할 사업장(Branch) 마스터입니다."
    menuRoutes={['/mfg/branches', '/mfg']}
    columns={[
      { key: 'code', label: '코드' },
      { key: 'name', label: '명칭' },
      { key: 'gstin', label: 'GSTIN' },
      { key: 'state_code', label: 'State' },
      { key: 'is_active', label: '활성' },
    ]}
    load={() => mfgService.listBranches()}
    mapRows={(res) => res?.data || []}
    createLabel="사업장 추가"
    createFields={[
      { key: 'code', label: '코드', required: true },
      { key: 'name', label: '명칭', required: true },
      { key: 'gstin', label: 'GSTIN' },
      { key: 'state_code', label: 'State Code' },
      { key: 'address', label: '주소' },
    ]}
    onCreate={async (form) => {
      await mfgService.createBranch({
        code: form.code,
        name: form.name,
        gstin: form.gstin || null,
        state_code: form.state_code || null,
        address: form.address || null,
      });
    }}
  />
);

export const MfgWarehousesPage: React.FC = () => (
  <MfgSimpleListPage
    title="창고"
    description="재고 창고 목록입니다. (inventory_locations 확장)"
    menuRoutes={['/mfg/warehouses', '/mfg']}
    columns={[
      { key: 'code', label: '코드' },
      { key: 'name', label: '창고명' },
      { key: 'branch_id', label: '사업장ID' },
      { key: 'is_active', label: '활성' },
    ]}
    load={() => mfgService.listWarehouses()}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgPurchaseRequisitionsPage: React.FC = () => (
  <MfgSimpleListPage
    title="구매요청 (PR)"
    description="Purchase Requisition 목록입니다. Draft → Submit → Approve."
    menuRoutes={['/purchase/requisitions', '/purchase']}
    columns={[
      { key: 'doc_no', label: '문서번호' },
      { key: 'status', label: '상태' },
      { key: 'required_date', label: '요청일' },
      { key: 'remarks', label: '비고' },
    ]}
    load={() => mfgService.listPurchaseRequisitions()}
    mapRows={(res) => res?.data || []}
    createLabel="PR 작성"
    createFields={[
      { key: 'branch_id', label: '사업장ID', required: true },
      { key: 'item_name', label: '품목명', required: true },
      { key: 'qty', label: '수량', required: true },
      { key: 'uom', label: '단위' },
      { key: 'remarks', label: '비고' },
    ]}
    onCreate={async (form) => {
      await mfgService.createPurchaseRequisition({
        branch_id: Number(form.branch_id),
        remarks: form.remarks || null,
        items: [
          {
            line_no: 1,
            item_name: form.item_name,
            qty: form.qty,
            uom: form.uom || 'EA',
          },
        ],
      });
    }}
  />
);

export const MfgPurchaseOrdersPage: React.FC = () => (
  <MfgSimpleListPage
    title="발주 (PO)"
    description="Purchase Order 목록입니다."
    menuRoutes={['/purchase/orders', '/purchase']}
    columns={[
      { key: 'doc_no', label: '문서번호' },
      { key: 'partner_id', label: '공급업체ID' },
      { key: 'status', label: '상태' },
      { key: 'order_date', label: '발주일' },
    ]}
    load={() => mfgService.listPurchaseOrders()}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgGoodsReceiptsPage: React.FC = () => (
  <MfgSimpleListPage
    title="입고 (GRN)"
    description="Goods Receipt Note. 승인 시 재고원장에 반영됩니다."
    menuRoutes={['/purchase/goods-receipts', '/purchase']}
    columns={[
      { key: 'doc_no', label: '문서번호' },
      { key: 'po_id', label: 'PO' },
      { key: 'status', label: '상태' },
      { key: 'receipt_date', label: '입고일' },
    ]}
    load={() => mfgService.listGoodsReceipts()}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgStockLedgerPage: React.FC = () => (
  <MfgSimpleListPage
    title="재고원장"
    description="품목·창고별 재고 입출고 원장입니다. 스냅샷이 아닌 원장 합산 방식입니다."
    menuRoutes={['/mfg/stock-ledger', '/mfg']}
    columns={[
      { key: 'txn_date', label: '일자' },
      { key: 'txn_type', label: '유형' },
      { key: 'product_id', label: '품목ID' },
      { key: 'warehouse_id', label: '창고ID' },
      { key: 'qty_in', label: '입고' },
      { key: 'qty_out', label: '출고' },
      { key: 'ref_doc_no', label: '참조문서' },
    ]}
    load={() => mfgService.listStockLedger()}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgDocumentSequencesPage: React.FC = () => (
  <MfgSimpleListPage
    title="문서번호"
    description="회사·문서유형별 채번 설정입니다."
    menuRoutes={['/mfg/document-sequences', '/mfg']}
    columns={[
      { key: 'doc_type', label: '유형' },
      { key: 'prefix', label: '접두어' },
      { key: 'next_number', label: '다음번호' },
      { key: 'pad_length', label: '자릿수' },
    ]}
    load={() => mfgService.listDocumentSequences()}
    mapRows={(res) => res?.data || []}
    createLabel="채번 설정"
    createFields={[
      { key: 'doc_type', label: '유형 (PR/PO/GRN…)', required: true },
      { key: 'prefix', label: '접두어', required: true },
      { key: 'next_number', label: '시작번호' },
      { key: 'pad_length', label: '자릿수' },
    ]}
    onCreate={async (form) => {
      await mfgService.upsertDocumentSequence({
        doc_type: form.doc_type,
        prefix: form.prefix,
        next_number: Number(form.next_number || 1),
        pad_length: Number(form.pad_length || 5),
      });
    }}
  />
);

export const MfgQualityInspectionsPage: React.FC = () => (
  <MfgSimpleListPage
    title="품질검사 (IQC)"
    description="입고 품질검사 기록입니다. 목록 API는 audit/GRN 연계로 확장 예정입니다."
    menuRoutes={['/purchase/quality-inspections', '/purchase']}
    columns={[
      { key: 'id', label: 'ID' },
      { key: 'status', label: '상태' },
      { key: 'remarks', label: '비고' },
    ]}
    load={async () => ({ data: [] })}
    mapRows={(res) => res?.data || []}
  />
);

export const MfgAuditLogsPage: React.FC = () => (
  <MfgSimpleListPage
    title="Audit Log"
    description="제조·구매 문서의 등록·승인·취소 이력입니다."
    menuRoutes={['/mfg/audit-logs', '/mfg']}
    columns={[
      { key: 'created_at', label: '시각' },
      { key: 'doc_type', label: '문서유형' },
      { key: 'doc_id', label: '문서ID' },
      { key: 'action', label: '액션' },
      { key: 'actor_user_id', label: '사용자' },
    ]}
    load={() => mfgService.listAuditLogs()}
    mapRows={(res) => res?.data || []}
  />
);

export default MfgBranchesPage;
