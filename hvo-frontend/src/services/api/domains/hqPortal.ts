import { api } from '../client';

export const hqPortalService = {
  dashboard: async () => (await api.get('/hq/dashboard')).data,
  drilldown: async (section: string) => (await api.get(`/hq/drilldown/${section}`)).data,

  listApprovals: async (params?: { status?: string }) =>
    (await api.get('/hq/approvals', { params })).data,
  createApproval: async (data: Record<string, unknown>) =>
    (await api.post('/hq/approvals', data)).data,
  approveRequest: async (id: number, reason?: string) =>
    (await api.post(`/hq/approvals/${id}/approve`, { decision_reason: reason })).data,
  rejectRequest: async (id: number, reason?: string) =>
    (await api.post(`/hq/approvals/${id}/reject`, { decision_reason: reason })).data,

  reportCatalog: async () => (await api.get('/hq/reports/catalog')).data,
  listSnapshots: async () => (await api.get('/hq/reports/snapshots')).data,
  getSnapshot: async (id: number) => (await api.get(`/hq/reports/snapshots/${id}`)).data,
  createSnapshot: async (data: Record<string, unknown>) =>
    (await api.post('/hq/reports/snapshot', data)).data,
  logExport: async (data: Record<string, unknown>) =>
    (await api.post('/hq/reports/export-log', data)).data,

  listFxRates: async () => (await api.get('/hq/fx-rates')).data,
  upsertFxRate: async (data: Record<string, unknown>) =>
    (await api.post('/hq/fx-rates', data)).data,

  listCompliance: async () => (await api.get('/hq/compliance')).data,
  createCompliance: async (data: Record<string, unknown>) =>
    (await api.post('/hq/compliance', data)).data,

  listAccessLogs: async () => (await api.get('/hq/access-logs')).data,
  getPrivacy: async () => (await api.get('/hq/privacy-settings')).data,
  updatePrivacy: async (data: Record<string, unknown>) =>
    (await api.put('/hq/privacy-settings', data)).data,

  listHqUsers: async () => (await api.get('/hq/users-hq')).data,
  updateHqUser: async (id: number, data: Record<string, unknown>) =>
    (await api.put(`/hq/users-hq/${id}`, data)).data,
};
