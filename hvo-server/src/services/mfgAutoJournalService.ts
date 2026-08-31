import { MfgAutoJournalLink, GlVoucher } from '../models';

export interface CreateAutoJournalLinkParams {
  tenantId: number;
  companyId: number;
  sourceDocType: string;
  sourceDocId: number;
  message?: string;
}

export const createAutoJournalLink = async (params: CreateAutoJournalLinkParams) => {
  const [link] = await (MfgAutoJournalLink as any).findOrCreate({
    where: {
      tenant_id: params.tenantId,
      company_id: params.companyId,
      source_doc_type: params.sourceDocType,
      source_doc_id: params.sourceDocId,
    },
    defaults: {
      tenant_id: params.tenantId,
      company_id: params.companyId,
      source_doc_type: params.sourceDocType,
      source_doc_id: params.sourceDocId,
      status: 'pending',
      message: params.message ?? 'Awaiting GL voucher creation',
    },
  });
  return link;
};

export const postPendingAutoJournals = async (tenantId: number, companyId: number, userId: number) => {
  const pending = await (MfgAutoJournalLink as any).findAll({
    where: { tenant_id: tenantId, company_id: companyId, status: 'pending' },
    limit: 50,
  });

  const results = [];
  for (const link of pending) {
    try {
      const voucher = await (GlVoucher as any).create({
        tenant_id: tenantId,
        company_id: companyId,
        voucher_no: `MFG-AJ/${link.source_doc_type}/${link.source_doc_id}`,
        voucher_type: 'journal',
        voucher_date: new Date().toISOString().slice(0, 10),
        narration: `Auto journal for ${link.source_doc_type} #${link.source_doc_id}`,
        status: 'draft',
        source_type: 'api',
        source_id: link.id,
        total_debit: 0,
        total_credit: 0,
        created_by: userId,
        is_active: true,
      });
      await link.update({
        gl_voucher_id: voucher.id,
        status: 'posted',
        message: 'Draft GL voucher created',
      });
      results.push({ id: link.id, status: 'posted', gl_voucher_id: voucher.id });
    } catch (err: any) {
      await link.update({ status: 'failed', message: String(err?.message || err) });
      results.push({ id: link.id, status: 'failed', message: String(err?.message || err) });
    }
  }
  return results;
};

export default createAutoJournalLink;
