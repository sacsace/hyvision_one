import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HistoryIcon from '@mui/icons-material/History';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useTranslation } from 'react-i18next';
import HvoPageHeader from '../../components/Common/HvoPageHeader';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import {
  hvoBodyOutlinedBtnSx,
  hvoBodyPrimaryBtnSx,
  hvoPageRootSx,
} from '../../theme/hvoLayout';
import {
  companyPolicyService,
  type CompanyPolicyItem,
  type CompanyPolicyRevisionDetail,
  type CompanyPolicyRevisionSummary,
} from '../../services/api';
import { showErrorPopup, showSuccessPopup } from '../../utils/errorHandler';

const sheetBorder = '1px solid #B4B4B4';

const MyCompanyPolicies: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language?.startsWith('en'));
  const { dialogState: confirmDialogState, showConfirm, handleConfirm, handleCancel } =
    useConfirmDialog();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [policies, setPolicies] = useState<CompanyPolicyItem[]>([]);
  const [tab, setTab] = useState<string>('');
  const [draft, setDraft] = useState({
    title_ko: '',
    title_en: '',
    content_ko: '',
    content_en: '',
    change_summary: '',
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<CompanyPolicyRevisionSummary[]>([]);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revision, setRevision] = useState<CompanyPolicyRevisionDetail | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState({ title_ko: '', title_en: '' });

  const current = useMemo(
    () => policies.find((row) => row.policy_key === tab) || null,
    [policies, tab]
  );

  const tabLabel = (row: CompanyPolicyItem) =>
    isEn ? row.title_en || row.title_ko : row.title_ko || row.title_en;

  const titleText = isEn
    ? current?.title_en || current?.title_ko || ''
    : current?.title_ko || current?.title_en || '';
  const bodyText = isEn
    ? current?.content_en || current?.content_ko || ''
    : current?.content_ko || current?.content_en || '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await companyPolicyService.list();
      const rows = (res?.data || []) as CompanyPolicyItem[];
      setPolicies(rows);
      setCanEdit(Boolean(res?.meta?.can_edit));
      setTab((prev) => {
        if (prev && rows.some((row) => row.policy_key === prev)) return prev;
        return String(rows[0]?.policy_key || '');
      });
    } catch (error: any) {
      showErrorPopup(error, t('companyPolicies.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setEditing(false);
    setDraft({
      title_ko: current?.title_ko || '',
      title_en: current?.title_en || '',
      content_ko: current?.content_ko || '',
      content_en: current?.content_en || '',
      change_summary: '',
    });
  }, [current]);

  const handleSave = async () => {
    if (!current || !canEdit) return;
    setSaving(true);
    try {
      const res = await companyPolicyService.update(String(current.policy_key), {
        title_ko: draft.title_ko.trim(),
        title_en: draft.title_en.trim(),
        content_ko: draft.content_ko,
        content_en: draft.content_en,
        change_summary: draft.change_summary.trim(),
      });
      if (!res?.success) {
        throw new Error(res?.message || t('companyPolicies.errors.saveFailed'));
      }
      showSuccessPopup(t('companyPolicies.success.saved'));
      setEditing(false);
      await load();
    } catch (error: any) {
      showErrorPopup(error, t('companyPolicies.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddTab = async () => {
    if (!canEdit) return;
    const title_ko = addDraft.title_ko.trim();
    const title_en = addDraft.title_en.trim();
    if (!title_ko || !title_en) {
      showErrorPopup(
        { response: { data: { message: t('companyPolicies.errors.titleRequired') } } },
        t('companyPolicies.errors.createFailed')
      );
      return;
    }
    setAdding(true);
    try {
      const res = await companyPolicyService.create({
        title_ko,
        title_en,
        content_ko: '',
        content_en: '',
      });
      if (!res?.success) {
        throw new Error(res?.message || t('companyPolicies.errors.createFailed'));
      }
      showSuccessPopup(t('companyPolicies.success.created'));
      setAddOpen(false);
      setAddDraft({ title_ko: '', title_en: '' });
      await load();
      if (res?.data?.policy_key) {
        setTab(String(res.data.policy_key));
      }
    } catch (error: any) {
      showErrorPopup(error, t('companyPolicies.errors.createFailed'));
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteTab = () => {
    if (!current || !canEdit) return;
    showConfirm(
      t('companyPolicies.confirmDeleteTab', {
        name: tabLabel(current),
      }),
      async () => {
        try {
          const res = await companyPolicyService.remove(String(current.policy_key));
          if (!res?.success) {
            throw new Error(res?.message || t('companyPolicies.errors.deleteFailed'));
          }
          showSuccessPopup(t('companyPolicies.success.deleted'));
          setEditing(false);
          await load();
        } catch (error: any) {
          showErrorPopup(error, t('companyPolicies.errors.deleteFailed'));
        }
      },
      {
        title: t('companyPolicies.actions.deleteTab'),
        confirmText: t('common.delete'),
        cancelText: t('common.cancel'),
        confirmColor: 'error',
      }
    );
  };

  const handleOpenHistory = async () => {
    if (!current) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await companyPolicyService.history(String(current.policy_key));
      setHistoryRows((res?.data || []) as CompanyPolicyRevisionSummary[]);
    } catch (error: any) {
      showErrorPopup(error, t('companyPolicies.errors.historyFailed'));
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenRevision = async (version: number) => {
    if (!current) return;
    try {
      const res = await companyPolicyService.revision(String(current.policy_key), version);
      setRevision((res?.data || null) as CompanyPolicyRevisionDetail | null);
      setRevisionOpen(true);
    } catch (error: any) {
      showErrorPopup(error, t('companyPolicies.errors.historyFailed'));
    }
  };

  return (
    <Box sx={hvoPageRootSx}>
      <HvoPageHeader
        title={t('companyPolicies.title')}
        description={t('companyPolicies.subtitle')}
      />

      <Box
        sx={{
          border: sheetBorder,
          bgcolor: '#fff',
          p: { xs: 1.25, sm: 1.5 },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{ borderBottom: sheetBorder, mb: 1.5 }}
        >
          <Tabs
            value={tab || false}
            onChange={(_, next: string) => setTab(next)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              flex: 1,
              minHeight: 36,
              '& .MuiTab-root': {
                minHeight: 36,
                textTransform: 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
                px: 1.25,
                borderRadius: 0,
              },
              '& .MuiTabs-indicator': {
                height: 2,
                bgcolor: '#217346',
              },
            }}
          >
            {policies.map((row) => (
              <Tab key={row.policy_key} value={row.policy_key} label={tabLabel(row)} />
            ))}
          </Tabs>
          {canEdit ? (
            <Tooltip title={t('companyPolicies.actions.addTab')}>
              <IconButton
                size="small"
                onClick={() => {
                  setAddDraft({ title_ko: '', title_en: '' });
                  setAddOpen(true);
                }}
                sx={{ borderRadius: 0, border: sheetBorder, width: 32, height: 32 }}
                aria-label={t('companyPolicies.actions.addTab')}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : !current ? (
          <Alert severity="info" sx={{ borderRadius: 0 }}>
            {t('companyPolicies.empty')}
          </Alert>
        ) : (
          <Stack spacing={1.25}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ sm: 'center' }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h6" sx={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                  {editing
                    ? isEn
                      ? draft.title_en || draft.title_ko
                      : draft.title_ko || draft.title_en
                    : titleText}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('companyPolicies.version', { version: current.version })}
                  {current.updated_by_name
                    ? ` · ${t('companyPolicies.updatedBy', { name: current.updated_by_name })}`
                    : ''}
                  {current.updated_at
                    ? ` · ${new Date(current.updated_at).toLocaleString()}`
                    : ''}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  size="small"
                  startIcon={<HistoryIcon />}
                  onClick={() => void handleOpenHistory()}
                  sx={hvoBodyOutlinedBtnSx}
                >
                  {t('companyPolicies.actions.history')}
                </Button>
                {canEdit && !editing ? (
                  <>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteOutlineIcon />}
                      onClick={handleDeleteTab}
                      sx={hvoBodyOutlinedBtnSx}
                      disabled={policies.length <= 1}
                    >
                      {t('companyPolicies.actions.deleteTab')}
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<EditOutlinedIcon />}
                      onClick={() => setEditing(true)}
                      sx={hvoBodyPrimaryBtnSx}
                    >
                      {t('companyPolicies.actions.edit')}
                    </Button>
                  </>
                ) : null}
                {canEdit && editing ? (
                  <>
                    <Button
                      size="small"
                      onClick={() => setEditing(false)}
                      disabled={saving}
                      sx={hvoBodyOutlinedBtnSx}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<SaveOutlinedIcon />}
                      onClick={() => void handleSave()}
                      disabled={saving}
                      sx={hvoBodyPrimaryBtnSx}
                    >
                      {t('companyPolicies.actions.save')}
                    </Button>
                  </>
                ) : null}
              </Stack>
            </Stack>

            {!canEdit ? (
              <Alert severity="info" sx={{ py: 0.5, borderRadius: 0 }}>
                {t('companyPolicies.readOnlyHint')}
              </Alert>
            ) : null}

            {editing ? (
              <Stack spacing={1.25}>
                <TextField
                  label={t('companyPolicies.fields.titleKo')}
                  size="small"
                  fullWidth
                  value={draft.title_ko}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title_ko: e.target.value }))}
                />
                <TextField
                  label={t('companyPolicies.fields.titleEn')}
                  size="small"
                  fullWidth
                  value={draft.title_en}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title_en: e.target.value }))}
                />
                <TextField
                  label={t('companyPolicies.fields.contentKo')}
                  size="small"
                  fullWidth
                  multiline
                  minRows={10}
                  value={draft.content_ko}
                  onChange={(e) => setDraft((prev) => ({ ...prev, content_ko: e.target.value }))}
                />
                <TextField
                  label={t('companyPolicies.fields.contentEn')}
                  size="small"
                  fullWidth
                  multiline
                  minRows={10}
                  value={draft.content_en}
                  onChange={(e) => setDraft((prev) => ({ ...prev, content_en: e.target.value }))}
                />
                <TextField
                  label={t('companyPolicies.fields.changeSummary')}
                  size="small"
                  fullWidth
                  value={draft.change_summary}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, change_summary: e.target.value }))
                  }
                  placeholder={t('companyPolicies.fields.changeSummaryPlaceholder')}
                />
              </Stack>
            ) : (
              <Box
                sx={{
                  border: sheetBorder,
                  bgcolor: '#FAFAFA',
                  p: 1.25,
                  minHeight: 280,
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.875rem',
                  lineHeight: 1.55,
                }}
              >
                {bodyText || t('companyPolicies.emptyContent')}
              </Box>
            )}
          </Stack>
        )}
      </Box>

      <Dialog open={addOpen} onClose={() => !adding && setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('companyPolicies.actions.addTab')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            <TextField
              label={t('companyPolicies.fields.titleKo')}
              size="small"
              fullWidth
              required
              value={addDraft.title_ko}
              onChange={(e) => setAddDraft((prev) => ({ ...prev, title_ko: e.target.value }))}
            />
            <TextField
              label={t('companyPolicies.fields.titleEn')}
              size="small"
              fullWidth
              required
              value={addDraft.title_en}
              onChange={(e) => setAddDraft((prev) => ({ ...prev, title_en: e.target.value }))}
            />
            <Typography variant="caption" color="text.secondary">
              {t('companyPolicies.addTabHint')}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={adding}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleAddTab()}
            disabled={adding}
            sx={hvoBodyPrimaryBtnSx}
          >
            {t('companyPolicies.actions.addTab')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('companyPolicies.historyTitle')}</DialogTitle>
        <DialogContent dividers>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : historyRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('companyPolicies.historyEmpty')}
            </Typography>
          ) : (
            <Stack spacing={1} divider={<Divider flexItem />}>
              {historyRows.map((row) => (
                <Box
                  key={row.id}
                  sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.5 }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      v{row.version}
                      {row.change_summary ? ` — ${row.change_summary}` : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.changed_by_name || '-'}
                      {row.created_at ? ` · ${new Date(row.created_at).toLocaleString()}` : ''}
                    </Typography>
                  </Box>
                  <Button size="small" onClick={() => void handleOpenRevision(row.version)}>
                    {t('companyPolicies.actions.viewRevision')}
                  </Button>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={revisionOpen} onClose={() => setRevisionOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>
          {t('companyPolicies.revisionTitle', { version: revision?.version || '-' })}
        </DialogTitle>
        <DialogContent dividers>
          {revision ? (
            <Stack spacing={1.25}>
              <Typography variant="subtitle1" fontWeight={700}>
                {isEn
                  ? revision.title_en || revision.title_ko
                  : revision.title_ko || revision.title_en}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {revision.changed_by_name || '-'}
                {revision.created_at ? ` · ${new Date(revision.created_at).toLocaleString()}` : ''}
                {revision.change_summary ? ` · ${revision.change_summary}` : ''}
              </Typography>
              <Box
                sx={{
                  border: sheetBorder,
                  p: 1.25,
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.875rem',
                  bgcolor: '#FAFAFA',
                }}
              >
                {isEn
                  ? revision.content_en || revision.content_ko
                  : revision.content_ko || revision.content_en}
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevisionOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDialogState.open}
        title={confirmDialogState.title}
        titleKey={confirmDialogState.titleKey}
        message={confirmDialogState.message}
        messageKey={confirmDialogState.messageKey}
        confirmText={confirmDialogState.confirmText}
        confirmTextKey={confirmDialogState.confirmTextKey}
        cancelText={confirmDialogState.cancelText}
        cancelTextKey={confirmDialogState.cancelTextKey}
        confirmColor={confirmDialogState.confirmColor}
        messageTone={confirmDialogState.messageTone}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
};

export default MyCompanyPolicies;
