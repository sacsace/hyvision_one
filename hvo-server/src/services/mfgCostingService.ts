import {
  MfgBomItem,
  MfgBomVersion,
  MfgStandardCost,
  MfgBom,
  Product,
} from '../models';

export const computeBomMaterialCost = async (
  tenantId: number,
  companyId: number,
  bomVersionId: number
): Promise<number> => {
  const items = await (MfgBomItem as any).findAll({
    where: { bom_version_id: bomVersionId },
  });
  let total = 0;
  for (const item of items) {
    const scrapFactor = 1 + Number(item.scrap_pct || 0) / 100;
    const lineQty = Number(item.qty || 0) * scrapFactor;
    const product = await (Product as any).findOne({
      where: { id: item.component_product_id, tenant_id: tenantId, company_id: companyId },
    });
    const unitCost = Number(product?.cost_price || product?.selling_price || 0);
    total += lineQty * unitCost;
  }
  return total;
};

export interface UpsertStandardCostParams {
  tenantId: number;
  companyId: number;
  productId: number;
  bomVersionId?: number | null;
  labourCost?: number;
  machineCost?: number;
  overheadCost?: number;
  packingCost?: number;
  effectiveFrom?: string | null;
}

export const upsertStandardCost = async (params: UpsertStandardCostParams) => {
  let materialCost = 0;
  if (params.bomVersionId) {
    materialCost = await computeBomMaterialCost(params.tenantId, params.companyId, params.bomVersionId);
  }
  const labourCost = Number(params.labourCost || 0);
  const machineCost = Number(params.machineCost || 0);
  const overheadCost = Number(params.overheadCost || 0);
  const packingCost = Number(params.packingCost || 0);
  const totalCost = materialCost + labourCost + machineCost + overheadCost + packingCost;

  const existing = await (MfgStandardCost as any).findOne({
    where: {
      tenant_id: params.tenantId,
      company_id: params.companyId,
      product_id: params.productId,
      is_active: true,
    },
  });

  const payload = {
    tenant_id: params.tenantId,
    company_id: params.companyId,
    product_id: params.productId,
    bom_version_id: params.bomVersionId ?? null,
    material_cost: materialCost,
    labour_cost: labourCost,
    machine_cost: machineCost,
    overhead_cost: overheadCost,
    packing_cost: packingCost,
    total_cost: totalCost,
    unit_cost: totalCost,
    effective_from: params.effectiveFrom ?? new Date().toISOString().slice(0, 10),
    is_active: true,
  };

  if (existing) {
    await existing.update(payload);
    return existing;
  }
  return (MfgStandardCost as any).create(payload);
};

export const computeStandardCostForBom = async (
  tenantId: number,
  companyId: number,
  bomId: number,
  versionNo?: number
) => {
  const bom = await (MfgBom as any).findOne({
    where: { id: bomId, tenant_id: tenantId, company_id: companyId, is_active: true },
  });
  if (!bom) throw new Error('NOT_FOUND');

  const versionWhere: Record<string, unknown> = { bom_id: bomId };
  if (versionNo != null) versionWhere.version_no = versionNo;
  else versionWhere.status = 'approved';

  const version = await (MfgBomVersion as any).findOne({
    where: versionWhere,
    order: [['version_no', 'DESC']],
  });
  if (!version) throw new Error('NOT_FOUND');

  return upsertStandardCost({
    tenantId,
    companyId,
    productId: bom.product_id,
    bomVersionId: version.id,
  });
};

export default upsertStandardCost;
