import { MfgDocumentAuditLog } from '../models';

export interface WriteMfgAuditParams {
  tenantId: number;
  companyId: number;
  docType: string;
  docId: number;
  action: string;
  actorUserId?: number | null;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export const writeMfgAudit = async (params: WriteMfgAuditParams) => {
  return (MfgDocumentAuditLog as any).create({
    tenant_id: params.tenantId,
    company_id: params.companyId,
    doc_type: params.docType,
    doc_id: params.docId,
    action: params.action,
    actor_user_id: params.actorUserId ?? null,
    before_json: params.beforeJson ?? null,
    after_json: params.afterJson ?? null,
    ip_address: params.ipAddress ?? null,
  });
};

export default writeMfgAudit;
