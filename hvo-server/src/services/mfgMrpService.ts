import { Transaction } from 'sequelize';
import {
  MfgBomItem,
  MfgBomVersion,
  MfgBom,
  MfgMaterialRequirement,
  MfgProductionPlan,
  MfgPurchaseRequisition,
  MfgPurchaseRequisitionItem,
  MfgWorkOrder,
  sequelize,
} from '../models';
import { getAvailableQty } from './mfgStockService';
import { nextDocumentNumber } from './mfgDocumentNumber';

export interface MrpLine {
  product_id: number;
  required_qty: number;
  available_qty: number;
  shortage_qty: number;
  suggested_pr: boolean;
}

export const computeMrpForBomVersion = async (
  tenantId: number,
  companyId: number,
  bomVersionId: number,
  planQty: number,
  warehouseId?: number | null
): Promise<MrpLine[]> => {
  const items = await (MfgBomItem as any).findAll({ where: { bom_version_id: bomVersionId } });
  const lines: MrpLine[] = [];
  for (const item of items) {
    const scrapFactor = 1 + Number(item.scrap_pct || 0) / 100;
    const required = Number(item.qty || 0) * scrapFactor * planQty;
    const available = warehouseId
      ? await getAvailableQty(tenantId, companyId, item.component_product_id, warehouseId)
      : 0;
    const shortage = Math.max(0, required - available);
    lines.push({
      product_id: item.component_product_id,
      required_qty: required,
      available_qty: available,
      shortage_qty: shortage,
      suggested_pr: shortage > 0,
    });
  }
  return lines;
};

export const runMrpForWorkOrder = async (
  tenantId: number,
  companyId: number,
  workOrderId: number
): Promise<MrpLine[]> => {
  const wo = await (MfgWorkOrder as any).findOne({
    where: { id: workOrderId, tenant_id: tenantId, company_id: companyId, is_active: true },
  });
  if (!wo) throw new Error('NOT_FOUND');
  if (!wo.bom_version_id) return [];
  const remaining = Math.max(0, Number(wo.plan_qty || 0) - Number(wo.completed_qty || 0));
  return computeMrpForBomVersion(tenantId, companyId, wo.bom_version_id, remaining, wo.warehouse_id);
};

export const runMrpForPlan = async (
  tenantId: number,
  companyId: number,
  planId: number,
  warehouseId?: number | null
) => {
  const plan = await (MfgProductionPlan as any).findOne({
    where: { id: planId, tenant_id: tenantId, company_id: companyId },
  });
  if (!plan) throw new Error('NOT_FOUND');

  const requirements = await (MfgMaterialRequirement as any).findAll({ where: { plan_id: planId } });
  const aggregated = new Map<number, MrpLine>();

  for (const req of requirements) {
    const available = warehouseId
      ? await getAvailableQty(tenantId, companyId, req.product_id, warehouseId)
      : Number(req.available_qty || 0);
    const required = Number(req.required_qty || 0);
    const shortage = Math.max(0, required - available);
    aggregated.set(req.product_id, {
      product_id: req.product_id,
      required_qty: required,
      available_qty: available,
      shortage_qty: shortage,
      suggested_pr: shortage > 0,
    });
    await req.update({ available_qty: available, shortage_qty: shortage, suggested_pr: shortage > 0 });
  }

  return Array.from(aggregated.values());
};

export const createPrDraftFromMrp = async (
  tenantId: number,
  companyId: number,
  branchId: number,
  lines: MrpLine[],
  userId: number,
  transaction?: Transaction
) => {
  const shortageLines = lines.filter((l) => l.suggested_pr && l.shortage_qty > 0);
  if (!shortageLines.length) return null;

  const run = async (t: Transaction) => {
    const doc_no = await nextDocumentNumber(tenantId, companyId, 'PR', { branchId, transaction: t });
    const header = await (MfgPurchaseRequisition as any).create(
      {
        tenant_id: tenantId,
        company_id: companyId,
        doc_no,
        branch_id: branchId,
        status: 'draft',
        requester_id: userId,
        created_by: userId,
        updated_by: userId,
        remarks: 'Auto-generated from MRP',
        is_active: true,
      },
      { transaction: t }
    );
    for (let i = 0; i < shortageLines.length; i++) {
      const line = shortageLines[i];
      await (MfgPurchaseRequisitionItem as any).create(
        {
          requisition_id: header.id,
          line_no: i + 1,
          product_id: line.product_id,
          item_name: `MRP shortage product ${line.product_id}`,
          qty: line.shortage_qty,
        },
        { transaction: t }
      );
    }
    return header;
  };

  if (transaction) return run(transaction);
  return sequelize.transaction(run);
};

export const runMrpForBom = async (
  tenantId: number,
  companyId: number,
  bomId: number,
  planQty: number,
  warehouseId?: number | null
) => {
  const version = await (MfgBomVersion as any).findOne({
    where: { bom_id: bomId, status: 'approved' },
    order: [['version_no', 'DESC']],
  });
  if (!version) {
    const bom = await (MfgBom as any).findByPk(bomId);
    if (!bom) throw new Error('NOT_FOUND');
    const draftVer = await (MfgBomVersion as any).findOne({
      where: { bom_id: bomId },
      order: [['version_no', 'DESC']],
    });
    if (!draftVer) throw new Error('NOT_FOUND');
    return computeMrpForBomVersion(tenantId, companyId, draftVer.id, planQty, warehouseId);
  }
  return computeMrpForBomVersion(tenantId, companyId, version.id, planQty, warehouseId);
};

export default runMrpForWorkOrder;
