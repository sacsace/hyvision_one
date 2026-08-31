import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import HvoPageHeader from '../../components/Common/HvoPageHeader';
import {
  hvoBodyCardSx,
  hvoBodyListTableSx,
  hvoBodyListZoneSx,
  hvoBodyOutlinedBtnSx,
  hvoBodyPrimaryBtnSx,
  hvoPageRootSx,
  hvoTableHeadHighlightSx,
  hvoTableScrollSx,
} from '../../theme/hvoLayout';
import { mfgService } from '../../services/api';
import { useMenuRoutePermissionFlags } from '../../hooks/useMenuRoutePermissionFlags';

const statusColor = (s: string) => {
  if (s === 'approved') return 'success';
  if (s === 'rejected' || s === 'cancelled') return 'error';
  if (s === 'submitted') return 'warning';
  return 'default';
};

export const PurchaseDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const flags = useMenuRoutePermissionFlags(['/purchase/dashboard', '/purchase']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await mfgService.purchaseDashboard();
      setData(res?.data || res || null);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || '대시보드 로드 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (flags.canRead) void load();
  }, [flags.canRead, load]);

  const cards = [
    { key: 'pr_total', label: 'PR 총건', path: '/purchase/requisitions' },
    { key: 'pr_pending_approval', label: '승인대기 PR', path: '/purchase/requisitions' },
    { key: 'pr_approved', label: '승인된 PR', path: '/purchase/requisitions' },
    { key: 'po_open', label: '미완료 PO', path: '/purchase/orders' },
    { key: 'grn_pending', label: '미완료 GRN', path: '/purchase/goods-receipts' },
  ];

  return (
    <Box sx={hvoPageRootSx}>
      <HvoPageHeader
        title="구매 대시보드"
        description="구매요청·발주·입고 현황 요약입니다. 카드를 클릭하면 해당 목록으로 이동합니다."
        actions={
          <Button variant="contained" sx={hvoBodyPrimaryBtnSx} onClick={() => void load()}>
            새로고침
          </Button>
        }
      />
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 1 }}>
          {cards.map((c) => (
            <Box
              key={c.key}
              onClick={() => navigate(c.path)}
              sx={{
                ...hvoBodyCardSx,
                border: '1px solid #B4B4B4',
                borderRadius: 0,
                p: 1.5,
                cursor: 'pointer',
                '&:hover': { bgcolor: '#F8FAFC' },
              }}
            >
              <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>{c.label}</Typography>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {data?.[c.key] ?? 0}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export const PurchaseRequisitionsPage: React.FC = () => {
  const flags = useMenuRoutePermissionFlags(['/purchase/requisitions', '/purchase']);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    branch_id: '',
    item_name: '',
    qty: '1',
    uom: 'EA',
    estimated_unit_price: '0',
    purchase_type: 'raw_material',
    priority: 'normal',
    urgency_reason: '',
    required_date: '',
    remarks: '',
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await mfgService.listPurchaseRequisitions(
        statusFilter ? { status: statusFilter } : undefined
      );
      setRows(res?.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || '목록 로드 실패');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (flags.canRead) void refresh();
  }, [flags.canRead, refresh]);

  const openDetail = async (id: number) => {
    try {
      const res = await mfgService.getPurchaseRequisition(id);
      setDetail(res?.data || null);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || '상세 로드 실패');
    }
  };

  const runAction = async (action: 'submit' | 'approve' | 'reject' | 'cancel') => {
    if (!detail?.id) return;
    setSaving(true);
    try {
      if (action === 'submit') await mfgService.submitPurchaseRequisition(detail.id);
      if (action === 'approve') await mfgService.approvePurchaseRequisition(detail.id);
      if (action === 'reject') {
        const reason = window.prompt('반려 사유') || '';
        await mfgService.rejectPurchaseRequisition(detail.id, reason);
      }
      if (action === 'cancel') {
        const reason = window.prompt('취소 사유') || '';
        await mfgService.cancelPurchaseRequisition(detail.id, reason);
      }
      await openDetail(detail.id);
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || '처리 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await mfgService.createPurchaseRequisition({
        branch_id: Number(form.branch_id),
        purchase_type: form.purchase_type,
        priority: form.priority,
        urgency_reason: form.urgency_reason || null,
        required_date: form.required_date || null,
        remarks: form.remarks || null,
        items: [
          {
            item_name: form.item_name,
            qty: Number(form.qty),
            uom: form.uom || 'EA',
            estimated_unit_price: Number(form.estimated_unit_price || 0),
          },
        ],
      });
      setOpenCreate(false);
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={hvoPageRootSx}>
      <HvoPageHeader
        title="구매요청 (PR)"
        description="Draft → Submit → Approve. 승인된 PR만 RFQ/PO로 전환할 수 있습니다."
        actions={
          flags.canCreate ? (
            <Button variant="contained" sx={hvoBodyPrimaryBtnSx} onClick={() => setOpenCreate(true)}>
              PR 작성
            </Button>
          ) : null
        }
      />
      {error ? (
        <Typography color="error" sx={{ mb: 1, fontSize: '0.8125rem' }}>
          {error}
        </Typography>
      ) : null}
      <Box sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          select
          size="small"
          label="상태"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">전체</MenuItem>
          <MenuItem value="draft">draft</MenuItem>
          <MenuItem value="submitted">submitted</MenuItem>
          <MenuItem value="approved">approved</MenuItem>
          <MenuItem value="rejected">rejected</MenuItem>
          <MenuItem value="cancelled">cancelled</MenuItem>
        </TextField>
        <Button size="small" variant="outlined" sx={hvoBodyOutlinedBtnSx} onClick={() => void refresh()}>
          조회
        </Button>
      </Box>
      <Box sx={hvoBodyListZoneSx}>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Box sx={hvoTableScrollSx}>
            <Table size="small" sx={hvoBodyListTableSx}>
              <TableHead>
                <TableRow>
                  {['문서번호', '상태', '유형', '우선순위', '요청일', '필요일', '비고'].map((h) => (
                    <TableCell key={h} sx={hvoTableHeadHighlightSx}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => void openDetail(r.id)}
                  >
                    <TableCell>{r.doc_no}</TableCell>
                    <TableCell>
                      <Chip size="small" label={r.status} color={statusColor(r.status) as any} />
                    </TableCell>
                    <TableCell>{r.purchase_type || '—'}</TableCell>
                    <TableCell>{r.priority || '—'}</TableCell>
                    <TableCell>{r.request_date || '—'}</TableCell>
                    <TableCell>{r.required_date || '—'}</TableCell>
                    <TableCell>{r.remarks || '—'}</TableCell>
                  </TableRow>
                ))}
                {!rows.length ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                        데이터가 없습니다.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>PR 작성</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
          <TextField
            size="small"
            required
            label="사업장ID"
            value={form.branch_id}
            onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
          />
          <TextField
            select
            size="small"
            label="구매유형"
            value={form.purchase_type}
            onChange={(e) => setForm((f) => ({ ...f, purchase_type: e.target.value }))}
          >
            {[
              'raw_material',
              'consumable',
              'asset',
              'service',
              'subcontracting',
              'import',
              'other',
            ].map((v) => (
              <MenuItem key={v} value={v}>
                {v}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="우선순위"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
          >
            <MenuItem value="normal">normal</MenuItem>
            <MenuItem value="urgent">urgent</MenuItem>
          </TextField>
          {form.priority === 'urgent' ? (
            <TextField
              size="small"
              required
              label="긴급사유"
              value={form.urgency_reason}
              onChange={(e) => setForm((f) => ({ ...f, urgency_reason: e.target.value }))}
            />
          ) : null}
          <TextField
            size="small"
            type="date"
            label="필요일"
            InputLabelProps={{ shrink: true }}
            value={form.required_date}
            onChange={(e) => setForm((f) => ({ ...f, required_date: e.target.value }))}
          />
          <TextField
            size="small"
            required
            label="품목명"
            value={form.item_name}
            onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
          />
          <TextField
            size="small"
            required
            label="수량"
            value={form.qty}
            onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
          />
          <TextField
            size="small"
            label="예상단가"
            value={form.estimated_unit_price}
            onChange={(e) => setForm((f) => ({ ...f, estimated_unit_price: e.target.value }))}
          />
          <TextField
            size="small"
            label="비고"
            value={form.remarks}
            onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>취소</Button>
          <Button variant="contained" disabled={saving} onClick={() => void handleCreate()}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        <DialogTitle>PR 상세 — {detail?.doc_no}</DialogTitle>
        <DialogContent>
          {detail ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography sx={{ fontSize: '0.8125rem' }}>
                상태: <Chip size="small" label={detail.status} color={statusColor(detail.status) as any} />
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem' }}>
                유형: {detail.purchase_type || '—'} / 우선순위: {detail.priority || '—'}
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem' }}>비고: {detail.remarks || '—'}</Typography>
              <Table size="small" sx={hvoBodyListTableSx}>
                <TableHead>
                  <TableRow>
                    {['#', '품목', '수량', '단위', '예상단가', '발주누적'].map((h) => (
                      <TableCell key={h} sx={hvoTableHeadHighlightSx}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(detail.items || []).map((it: any) => (
                    <TableRow key={it.id || it.line_no}>
                      <TableCell>{it.line_no}</TableCell>
                      <TableCell>{it.item_name}</TableCell>
                      <TableCell>{it.qty}</TableCell>
                      <TableCell>{it.uom}</TableCell>
                      <TableCell>{it.estimated_unit_price}</TableCell>
                      <TableCell>{it.ordered_qty ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          {flags.canEdit && detail?.status === 'draft' ? (
            <Button disabled={saving} onClick={() => void runAction('submit')}>
              제출
            </Button>
          ) : null}
          {flags.canEdit && (detail?.status === 'submitted' || detail?.status === 'draft') ? (
            <>
              <Button disabled={saving} color="success" onClick={() => void runAction('approve')}>
                승인
              </Button>
              <Button disabled={saving} color="error" onClick={() => void runAction('reject')}>
                반려
              </Button>
            </>
          ) : null}
          {flags.canEdit && ['draft', 'submitted', 'approved'].includes(detail?.status) ? (
            <Button disabled={saving} onClick={() => void runAction('cancel')}>
              취소
            </Button>
          ) : null}
          <Button onClick={() => setDetail(null)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const COMING_SOON_BY_PATH: Record<string, { title: string; description: string }> = {
  '/purchase/rfq': {
    title: '견적요청 (RFQ)',
    description: '승인된 PR을 기준으로 복수 공급업체에 견적을 요청합니다.',
  },
  '/purchase/supplier-quotations': {
    title: '공급업체 견적',
    description: '공급업체 제출 견적 등록 및 Revision 관리입니다.',
  },
  '/purchase/quotation-compare': {
    title: '견적비교',
    description: '공급업체 견적 비교 및 업체선정 승인입니다.',
  },
  '/purchase/invoices': {
    title: '매입 인보이스',
    description: 'PO/GRN 3-Way Matching 및 매입계산서입니다.',
  },
  '/purchase/returns': {
    title: '구매반품',
    description: 'GRN/품질검사 기반 공급업체 반품입니다.',
  },
  '/purchase/payment-requests': {
    title: '지급요청',
    description: '승인된 매입 인보이스 기반 지급요청입니다.',
  },
  '/purchase/reports': {
    title: '구매현황',
    description: '구매 보고서·엑셀/PDF 출력입니다.',
  },
};

export const PurchaseComingSoonPage: React.FC = () => {
  const { pathname } = useLocation();
  const meta = COMING_SOON_BY_PATH[pathname] || {
    title: '구매',
    description: '준비 중인 구매 기능입니다.',
  };
  return (
    <Box sx={hvoPageRootSx}>
      <HvoPageHeader title={meta.title} description={meta.description} />
      <Box sx={{ ...hvoBodyCardSx, border: '1px solid #B4B4B4', borderRadius: 0, p: 2 }}>
        <Typography sx={{ fontSize: '0.875rem' }}>
          다음 단계에서 구현 예정입니다. 메뉴·권한·문서번호 체계는 준비되어 있습니다.
        </Typography>
      </Box>
    </Box>
  );
};

export const PurchaseSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Box sx={hvoPageRootSx}>
      <HvoPageHeader
        title="구매 설정"
        description="문서번호·승인금액 구간 등 구매 기준정보입니다."
        actions={
          <Button
            variant="outlined"
            sx={hvoBodyOutlinedBtnSx}
            onClick={() => navigate('/mfg/document-sequences')}
          >
            문서번호 설정
          </Button>
        }
      />
      <Box sx={{ ...hvoBodyCardSx, border: '1px solid #B4B4B4', borderRadius: 0, p: 2 }}>
        <Typography sx={{ fontSize: '0.875rem', mb: 1 }}>
          문서번호 타입: PR / RFQ / SQ / PO / GRN / IQC / PINV / PRET / PAYREQ
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
          승인금액 구간 설정 UI는 Step 3에서 확장합니다. 현재 DB 테이블
          purchase_approval_settings 가 생성되어 있습니다.
        </Typography>
      </Box>
    </Box>
  );
};
