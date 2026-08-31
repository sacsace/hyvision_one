import { Op } from 'sequelize';
import {
  HqApprovalRequest,
  HqApprovalPolicy,
  HqAccessLog,
  User,
} from '../models';
import { pushNotification } from '../controllers/notificationController';
import { writeMfgAudit } from './mfgAuditLog';
import { convert } from './hqFxService';
import type { HqUserLike } from '../middleware/hqAccess';

export interface CreateApprovalRequestInput {
  tenantId: number;
  companyId: number;
  eventType: string;
  docType: string;
  docId: number;
  docNo?: string;
  partnerName?: string;
  amount?: number;
  currencyCode?: string;
  requesterId?: number;
  requestReason?: string;
  attachmentUrls?: string[];
  deepLink?: string;
  policyId?: number;
}

const num = (v: unknown) => (v == null ? null : Number(v));

export const createRequest = async (input: CreateApprovalRequestInput) => {
  const existing = await (HqApprovalRequest as any).findOne({
    where: {
      tenant_id: input.tenantId,
      company_id: input.companyId,
      doc_type: input.docType,
      doc_id: input.docId,
      status: 'pending',
    },
  });
  if (existing) return { row: existing, deduped: true };

  let policyId = input.policyId ?? null;
  if (!policyId) {
    const policy = await (HqApprovalPolicy as any).findOne({
      where: {
        tenant_id: input.tenantId,
        company_id: input.companyId,
        event_type: input.eventType,
        is_active: true,
      },
    });
    policyId = policy?.id ?? null;
  }

  const currency = (input.currencyCode || 'INR').toUpperCase();
  const amount = num(input.amount) ?? 0;
  const fxDate = new Date().toISOString().slice(0, 10);

  const inrConv = currency === 'INR' ? { amount, rate: 1 } : await convert(amount, currency, 'INR', input.tenantId, fxDate);
  const krwConv = await convert(inrConv.amount, 'INR', 'KRW', input.tenantId, fxDate);
  const usdConv = await convert(inrConv.amount, 'INR', 'USD', input.tenantId, fxDate);

  const row = await (HqApprovalRequest as any).create({
    tenant_id: input.tenantId,
    company_id: input.companyId,
    policy_id: policyId,
    event_type: input.eventType,
    doc_type: input.docType,
    doc_id: input.docId,
    doc_no: input.docNo ?? null,
    partner_name: input.partnerName ?? null,
    amount,
    currency_code: currency,
    amount_inr: inrConv.amount,
    amount_krw: krwConv.amount,
    amount_usd: usdConv.amount,
    fx_rate_date: fxDate,
    requester_id: input.requesterId ?? null,
    request_reason: input.requestReason ?? null,
    status: 'pending',
    attachment_urls: input.attachmentUrls ?? null,
    deep_link: input.deepLink ?? null,
  });

  await writeMfgAudit({
    tenantId: input.tenantId,
    companyId: input.companyId,
    docType: 'hq_approval_request',
    docId: row.id,
    action: 'create',
    actorUserId: input.requesterId ?? null,
    afterJson: { status: 'pending', event_type: input.eventType },
  });

  const hqApprovers = await (User as any).findAll({
    where: {
      tenant_id: input.tenantId,
      hq_can_approve: true,
      status: 'active',
      [Op.or]: [{ hq_role: { [Op.ne]: null } }, { role: 'root' }],
    },
    attributes: ['id'],
    limit: 20,
  });

  for (const approver of hqApprovers) {
    pushNotification({
      title: 'HQ Approval Required',
      message: `${input.eventType}: ${input.docNo || input.docType + '#' + input.docId}`,
      type: 'warning',
      target_type: 'user',
      target_id: approver.id,
      tenant_id: input.tenantId,
      company_id: input.companyId,
      data: { kind: 'hq_approval', request_id: row.id, deep_link: input.deepLink },
    });
  }

  return { row, deduped: false };
};

export const listRequests = async (
  tenantId: number,
  companyId: number,
  opts?: { status?: string; limit?: number }
) => {
  const where: Record<string, unknown> = { tenant_id: tenantId, company_id: companyId };
  if (opts?.status) where.status = opts.status;
  return (HqApprovalRequest as any).findAll({
    where,
    order: [['created_at', 'DESC']],
    limit: Math.min(opts?.limit ?? 50, 200),
  });
};

export const approveRequest = async (
  id: number,
  tenantId: number,
  companyId: number,
  approver: HqUserLike & { id: number },
  reason?: string,
  ipAddress?: string
) => {
  const row = await (HqApprovalRequest as any).findOne({
    where: { id, tenant_id: tenantId, company_id: companyId },
  });
  if (!row) throw new Error('NOT_FOUND');
  if (row.status !== 'pending') throw new Error('NOT_PENDING');

  await row.update({
    status: 'approved',
    hq_approver_id: approver.id,
    decided_at: new Date(),
    decision_reason: reason ?? null,
  });

  await writeMfgAudit({
    tenantId,
    companyId,
    docType: 'hq_approval_request',
    docId: id,
    action: 'approve',
    actorUserId: approver.id,
    beforeJson: { status: 'pending' },
    afterJson: { status: 'approved' },
    ipAddress,
  });

  await (HqAccessLog as any).create({
    tenant_id: tenantId,
    company_id: companyId,
    user_id: approver.id,
    action: 'approve',
    resource: 'hq_approval_request',
    resource_id: String(id),
    ip_address: ipAddress ?? null,
  });

  if (row.requester_id) {
    pushNotification({
      title: 'HQ Approval Approved',
      message: `Request #${id} approved`,
      type: 'success',
      target_type: 'user',
      target_id: row.requester_id,
      tenant_id: tenantId,
      company_id: companyId,
      data: { kind: 'hq_approval_decision', request_id: id, status: 'approved' },
    });
  }

  return row;
};

export const rejectRequest = async (
  id: number,
  tenantId: number,
  companyId: number,
  approver: HqUserLike & { id: number },
  reason?: string,
  ipAddress?: string
) => {
  const row = await (HqApprovalRequest as any).findOne({
    where: { id, tenant_id: tenantId, company_id: companyId },
  });
  if (!row) throw new Error('NOT_FOUND');
  if (row.status !== 'pending') throw new Error('NOT_PENDING');

  await row.update({
    status: 'rejected',
    hq_approver_id: approver.id,
    decided_at: new Date(),
    decision_reason: reason ?? null,
  });

  await writeMfgAudit({
    tenantId,
    companyId,
    docType: 'hq_approval_request',
    docId: id,
    action: 'reject',
    actorUserId: approver.id,
    beforeJson: { status: 'pending' },
    afterJson: { status: 'rejected' },
    ipAddress,
  });

  await (HqAccessLog as any).create({
    tenant_id: tenantId,
    company_id: companyId,
    user_id: approver.id,
    action: 'approve',
    resource: 'hq_approval_request',
    resource_id: String(id),
    ip_address: ipAddress ?? null,
  });

  if (row.requester_id) {
    pushNotification({
      title: 'HQ Approval Rejected',
      message: `Request #${id} rejected`,
      type: 'error',
      target_type: 'user',
      target_id: row.requester_id,
      tenant_id: tenantId,
      company_id: companyId,
      data: { kind: 'hq_approval_decision', request_id: id, status: 'rejected' },
    });
  }

  return row;
};

export default { createRequest, listRequests, approveRequest, rejectRequest };
