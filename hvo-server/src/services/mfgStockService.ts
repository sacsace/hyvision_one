import { Transaction } from 'sequelize';
import { MfgStockLedgerEntry, MfgStockReservation, Product } from '../models';
import { assertNotLocked } from './mfgPeriodLockService';

export interface PostLedgerEntryParams {
  tenantId: number;
  companyId: number;
  financialYearId?: number | null;
  branchId?: number | null;
  productId: number;
  warehouseId: number;
  binId?: number | null;
  batchNo?: string | null;
  txnDate: string;
  txnType: string;
  qtyIn?: number;
  qtyOut?: number;
  unitCost?: number;
  refDocType?: string | null;
  refDocId?: number | null;
  refDocNo?: string | null;
  remarks?: string | null;
  createdBy?: number | null;
  transaction: Transaction;
}

export const getOnHandQty = async (
  tenantId: number,
  companyId: number,
  productId: number,
  warehouseId: number,
  transaction?: Transaction
): Promise<number> => {
  const rows = await (MfgStockLedgerEntry as any).findAll({
    where: { tenant_id: tenantId, company_id: companyId, product_id: productId, warehouse_id: warehouseId },
    attributes: ['qty_in', 'qty_out'],
    transaction,
  });
  return rows.reduce(
    (sum: number, r: any) => sum + Number(r.qty_in || 0) - Number(r.qty_out || 0),
    0
  );
};

export const getReservedQty = async (
  tenantId: number,
  companyId: number,
  productId: number,
  warehouseId?: number | null,
  transaction?: Transaction
): Promise<number> => {
  const where: Record<string, unknown> = {
    tenant_id: tenantId,
    company_id: companyId,
    product_id: productId,
    status: 'active',
    is_active: true,
  };
  if (warehouseId) where.warehouse_id = warehouseId;
  const rows = await (MfgStockReservation as any).findAll({
    where,
    attributes: ['qty'],
    transaction,
  });
  return rows.reduce((sum: number, r: any) => sum + Number(r.qty || 0), 0);
};

export const getAvailableQty = async (
  tenantId: number,
  companyId: number,
  productId: number,
  warehouseId: number,
  transaction?: Transaction
): Promise<number> => {
  const onHand = await getOnHandQty(tenantId, companyId, productId, warehouseId, transaction);
  const reserved = await getReservedQty(tenantId, companyId, productId, warehouseId, transaction);
  return onHand - reserved;
};

/** Post stock ledger entry; rejects if period locked or resulting balance would be negative. */
export const postLedgerEntry = async (params: PostLedgerEntryParams) => {
  const qtyIn = Number(params.qtyIn || 0);
  const qtyOut = Number(params.qtyOut || 0);
  const txnDate = String(params.txnDate || '').slice(0, 10);
  const periodYm = txnDate.length >= 7 ? txnDate.slice(0, 7) : '';
  if (periodYm) {
    await assertNotLocked(params.tenantId, params.companyId, periodYm, 'inventory');
  }

  if (qtyOut > 0) {
    const current = await getOnHandQty(
      params.tenantId,
      params.companyId,
      params.productId,
      params.warehouseId,
      params.transaction
    );
    if (current - qtyOut < 0) {
      throw new Error('NEGATIVE_STOCK');
    }
  }

  const entry = await (MfgStockLedgerEntry as any).create(
    {
      tenant_id: params.tenantId,
      company_id: params.companyId,
      financial_year_id: params.financialYearId ?? null,
      branch_id: params.branchId ?? null,
      product_id: params.productId,
      warehouse_id: params.warehouseId,
      bin_id: params.binId ?? null,
      batch_no: params.batchNo ?? null,
      txn_date: txnDate || params.txnDate,
      txn_type: params.txnType,
      qty_in: qtyIn,
      qty_out: qtyOut,
      unit_cost: params.unitCost ?? 0,
      ref_doc_type: params.refDocType ?? null,
      ref_doc_id: params.refDocId ?? null,
      ref_doc_no: params.refDocNo ?? null,
      remarks: params.remarks ?? null,
      created_by: params.createdBy ?? null,
    },
    { transaction: params.transaction }
  );

  const delta = qtyIn - qtyOut;
  if (delta !== 0) {
    const product = await (Product as any).findOne({
      where: { id: params.productId, tenant_id: params.tenantId, company_id: params.companyId },
      transaction: params.transaction,
      lock: params.transaction.LOCK.UPDATE,
    });
    if (product) {
      await product.update(
        { stock_quantity: Number(product.stock_quantity || 0) + delta },
        { transaction: params.transaction }
      );
    }
  }

  return entry;
};

export default postLedgerEntry;
