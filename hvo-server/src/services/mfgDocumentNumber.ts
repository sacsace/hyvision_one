import { Transaction } from 'sequelize';
import { MfgDocumentSequence, sequelize } from '../models';

export interface NextDocumentNumberOpts {
  branchId?: number | null;
  financialYearId?: number | null;
  prefix?: string;
  padLength?: number;
  transaction?: Transaction;
}

const defaultPrefixFor = (docType: string) => {
  const map: Record<string, string> = {
    RFQ: 'RFQ',
    SQ: 'SQ',
    IQC: 'IQC',
    PINV: 'PINV',
    PRET: 'PRET',
    PAYREQ: 'PAYREQ',
    PR: 'PR',
    PO: 'PO',
    GRN: 'GRN',
    WO: 'WO',
    SO: 'SO',
    DC: 'DC',
    MI: 'MI',
    CN: 'CN',
    INV: 'INV',
  };
  return map[docType] || docType;
};

export const nextDocumentNumber = async (
  tenantId: number,
  companyId: number,
  docType: string,
  opts: NextDocumentNumberOpts = {}
): Promise<string> => {
  const run = async (t: Transaction) => {
    let seq = await (MfgDocumentSequence as any).findOne({
      where: { tenant_id: tenantId, company_id: companyId, doc_type: docType },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!seq) {
      seq = await (MfgDocumentSequence as any).create(
        {
          tenant_id: tenantId,
          company_id: companyId,
          branch_id: opts.branchId ?? null,
          financial_year_id: opts.financialYearId ?? null,
          doc_type: docType,
          prefix: opts.prefix ?? defaultPrefixFor(docType),
          next_number: 1,
          pad_length: opts.padLength ?? 5,
        },
        { transaction: t }
      );
    }

    const num = Number(seq.next_number);
    const padLen = Number(seq.pad_length || opts.padLength || 5);
    const prefix = String(seq.prefix || opts.prefix || defaultPrefixFor(docType));
    const padded = String(num).padStart(padLen, '0');
    const docNo = prefix ? `${prefix}/${padded}` : padded;

    await seq.update({ next_number: num + 1 }, { transaction: t });
    return docNo;
  };

  if (opts.transaction) {
    return run(opts.transaction);
  }
  return sequelize.transaction(run);
};

export default nextDocumentNumber;
