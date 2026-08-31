import { Response } from 'express';
import { Transaction } from 'sequelize';
import {
  sequelize,
  MfgWorkCenter,
  MfgBom,
  MfgBomVersion,
  MfgBomItem,
  MfgRouting,
  MfgRoutingOperation,
  MfgProductionPlan,
  MfgMaterialRequirement,
  MfgWorkOrder,
  MfgMaterialIssue,
  MfgMaterialIssueItem,
  MfgProductionEntry,
  MfgStandardCost,
} from '../models';
import { RequestWithUser } from '../types';
import { resolveCompanyScope } from '../utils/companyScope';
import { nextDocumentNumber } from '../services/mfgDocumentNumber';
import { writeMfgAudit } from '../services/mfgAuditLog';
import { postLedgerEntry } from '../services/mfgStockService';
import { computeStandardCostForBom, upsertStandardCost } from '../services/mfgCostingService';
import {
  runMrpForPlan,
  runMrpForWorkOrder,
  createPrDraftFromMrp,
} from '../services/mfgMrpService';
import { decRow, scopeWhere, clientIp, handleError } from './mfgControllerHelpers';

// ── Work Centers ──

export const listWorkCenters = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req);
    if (req.query.active !== 'false') where.is_active = true;
    const rows = await (MfgWorkCenter as any).findAll({ where, order: [['code', 'ASC']] });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listWorkCenters');
  }
};

export const createWorkCenter = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const code = String(req.body?.code || '').trim();
    const name = String(req.body?.name || '').trim();
    if (!code || !name) return res.status(400).json({ success: false, message: 'code and name required' });
    const row = await (MfgWorkCenter as any).create({
      tenant_id: tenantId,
      company_id: companyId,
      code,
      name,
      is_active: true,
      created_by: req.user.id,
      updated_by: req.user.id,
    });
    res.status(201).json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'createWorkCenter');
  }
};

export const updateWorkCenter = async (req: RequestWithUser, res: Response) => {
  try {
    const row = await (MfgWorkCenter as any).findOne({
      where: { ...scopeWhere(req), id: Number(req.params.id) },
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const patch: Record<string, unknown> = { updated_by: req.user.id };
    for (const key of ['code', 'name', 'is_active']) {
      if (req.body?.[key] !== undefined) patch[key] = req.body[key];
    }
    await row.update(patch);
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'updateWorkCenter');
  }
};

// ── BOMs ──

export const listBoms = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req, { is_active: true });
    const rows = await (MfgBom as any).findAll({
      where,
      include: [{ model: MfgBomVersion, as: 'versions', include: [{ model: MfgBomItem, as: 'items' }] }],
      order: [['code', 'ASC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listBoms');
  }
};

export const createBom = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const product_id = Number(req.body?.product_id);
    const code = String(req.body?.code || '').trim();
    const name = String(req.body?.name || '').trim();
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!product_id || !code || !name) {
      return res.status(400).json({ success: false, message: 'product_id, code, name required' });
    }

    const result = await sequelize.transaction(async (t: Transaction) => {
      const bom = await (MfgBom as any).create(
        {
          tenant_id: tenantId,
          company_id: companyId,
          product_id,
          code,
          name,
          status: 'draft',
          is_active: true,
          created_by: req.user.id,
          updated_by: req.user.id,
        },
        { transaction: t }
      );
      const version = await (MfgBomVersion as any).create(
        {
          bom_id: bom.id,
          version_no: 1,
          effective_from: req.body?.effective_from ?? null,
          status: 'draft',
        },
        { transaction: t }
      );
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await (MfgBomItem as any).create(
          {
            bom_version_id: version.id,
            line_no: i + 1,
            component_product_id: Number(it.component_product_id),
            qty: it.qty ?? 0,
            uom: it.uom || 'EA',
            scrap_pct: it.scrap_pct ?? 0,
            is_alternate: it.is_alternate ?? false,
            operation_seq: it.operation_seq ?? 10,
          },
          { transaction: t }
        );
      }
      return bom;
    });

    const full = await (MfgBom as any).findByPk(result.id, {
      include: [{ model: MfgBomVersion, as: 'versions', include: [{ model: MfgBomItem, as: 'items' }] }],
    });
    res.status(201).json({ success: true, data: decRow(full) });
  } catch (error) {
    handleError(res, error, 'createBom');
  }
};

export const approveBomVersion = async (req: RequestWithUser, res: Response) => {
  try {
    const versionId = Number(req.params.versionId);
    const { tenantId, companyId } = resolveCompanyScope(req);
    const version = await (MfgBomVersion as any).findByPk(versionId, {
      include: [{ model: MfgBom, as: 'bom' }],
    });
    if (!version?.bom) return res.status(404).json({ success: false, message: 'Not found' });
    const bom = version.bom;
    if (bom.tenant_id !== tenantId || bom.company_id !== companyId) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    await version.update({
      status: 'approved',
      approved_by: req.user.id,
      approved_at: new Date(),
    });
    await bom.update({ status: 'approved', updated_by: req.user.id });
    res.json({ success: true, data: decRow(version) });
  } catch (error) {
    handleError(res, error, 'approveBomVersion');
  }
};

// ── Routings ──

export const listRoutings = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req, { is_active: true });
    const rows = await (MfgRouting as any).findAll({
      where,
      include: [{ model: MfgRoutingOperation, as: 'operations' }],
      order: [['code', 'ASC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listRoutings');
  }
};

export const createRouting = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const product_id = Number(req.body?.product_id);
    const code = String(req.body?.code || '').trim();
    const name = String(req.body?.name || '').trim();
    const operations = Array.isArray(req.body?.operations) ? req.body.operations : [];
    if (!product_id || !code || !name) {
      return res.status(400).json({ success: false, message: 'product_id, code, name required' });
    }

    const result = await sequelize.transaction(async (t: Transaction) => {
      const routing = await (MfgRouting as any).create(
        {
          tenant_id: tenantId,
          company_id: companyId,
          product_id,
          code,
          name,
          is_active: true,
        },
        { transaction: t }
      );
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        await (MfgRoutingOperation as any).create(
          {
            routing_id: routing.id,
            seq: op.seq ?? (i + 1) * 10,
            work_center_id: op.work_center_id ?? null,
            name: String(op.name || `Op ${i + 1}`),
            setup_minutes: op.setup_minutes ?? 0,
            run_minutes_per_unit: op.run_minutes_per_unit ?? 0,
            machine_minutes_per_unit: op.machine_minutes_per_unit ?? 0,
          },
          { transaction: t }
        );
      }
      return routing;
    });

    const full = await (MfgRouting as any).findByPk(result.id, {
      include: [{ model: MfgRoutingOperation, as: 'operations' }],
    });
    res.status(201).json({ success: true, data: decRow(full) });
  } catch (error) {
    handleError(res, error, 'createRouting');
  }
};

// ── Production Plans ──

export const listProductionPlans = async (req: RequestWithUser, res: Response) => {
  try {
    const rows = await (MfgProductionPlan as any).findAll({
      where: scopeWhere(req),
      include: [{ model: MfgMaterialRequirement, as: 'requirements' }],
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listProductionPlans');
  }
};

export const createProductionPlan = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const plan_code = String(req.body?.plan_code || '').trim();
    if (!plan_code) return res.status(400).json({ success: false, message: 'plan_code required' });
    const requirements = Array.isArray(req.body?.requirements) ? req.body.requirements : [];

    const plan = await sequelize.transaction(async (t: Transaction) => {
      const header = await (MfgProductionPlan as any).create(
        {
          tenant_id: tenantId,
          company_id: companyId,
          plan_code,
          plan_date: req.body?.plan_date ?? null,
          horizon: req.body?.horizon ?? 'month',
          status: 'draft',
          remarks: req.body?.remarks ?? null,
          created_by: req.user.id,
        },
        { transaction: t }
      );
      for (const reqLine of requirements) {
        await (MfgMaterialRequirement as any).create(
          {
            plan_id: header.id,
            product_id: Number(reqLine.product_id),
            required_qty: reqLine.required_qty ?? 0,
            available_qty: reqLine.available_qty ?? 0,
            shortage_qty: reqLine.shortage_qty ?? 0,
            suggested_pr: reqLine.suggested_pr ?? false,
          },
          { transaction: t }
        );
      }
      return header;
    });

    const full = await (MfgProductionPlan as any).findByPk(plan.id, {
      include: [{ model: MfgMaterialRequirement, as: 'requirements' }],
    });
    res.status(201).json({ success: true, data: decRow(full) });
  } catch (error) {
    handleError(res, error, 'createProductionPlan');
  }
};

export const runMrp = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const planId = req.body?.plan_id ? Number(req.body.plan_id) : null;
    const workOrderId = req.body?.work_order_id ? Number(req.body.work_order_id) : null;
    const warehouseId = req.body?.warehouse_id ? Number(req.body.warehouse_id) : null;
    const createPr = req.body?.create_pr === true;
    const branchId = Number(req.body?.branch_id || 0);

    let lines;
    if (workOrderId) lines = await runMrpForWorkOrder(tenantId, companyId, workOrderId);
    else if (planId) lines = await runMrpForPlan(tenantId, companyId, planId, warehouseId);
    else return res.status(400).json({ success: false, message: 'plan_id or work_order_id required' });

    let pr = null;
    if (createPr && branchId && lines.some((l) => l.suggested_pr)) {
      pr = await createPrDraftFromMrp(tenantId, companyId, branchId, lines, req.user.id);
    }

    res.json({ success: true, data: { lines, pr: pr ? decRow(pr) : null } });
  } catch (error) {
    handleError(res, error, 'runMrp');
  }
};

// ── Work Orders ──

export const listWorkOrders = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req, { is_active: true });
    if (req.query.status) where.status = String(req.query.status);
    const rows = await (MfgWorkOrder as any).findAll({ where, order: [['id', 'DESC']] });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listWorkOrders');
  }
};

export const createWorkOrder = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const product_id = Number(req.body?.product_id);
    const plan_qty = Number(req.body?.plan_qty || 0);
    if (!product_id || plan_qty <= 0) {
      return res.status(400).json({ success: false, message: 'product_id and plan_qty required' });
    }

    const doc_no = await nextDocumentNumber(tenantId, companyId, 'WO', {
      branchId: req.body?.branch_id ?? null,
      financialYearId: req.body?.financial_year_id ?? null,
    });
    const row = await (MfgWorkOrder as any).create({
      tenant_id: tenantId,
      company_id: companyId,
      doc_no,
      branch_id: req.body?.branch_id ?? null,
      financial_year_id: req.body?.financial_year_id ?? null,
      product_id,
      bom_version_id: req.body?.bom_version_id ?? null,
      routing_id: req.body?.routing_id ?? null,
      plan_qty,
      status: 'draft',
      planned_start: req.body?.planned_start ?? null,
      planned_end: req.body?.planned_end ?? null,
      warehouse_id: req.body?.warehouse_id ?? null,
      created_by: req.user.id,
      updated_by: req.user.id,
      is_active: true,
    });
    await writeMfgAudit({
      tenantId,
      companyId,
      docType: 'WO',
      docId: row.id,
      action: 'create',
      actorUserId: req.user.id,
      afterJson: decRow(row),
      ipAddress: clientIp(req),
    });
    res.status(201).json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'createWorkOrder');
  }
};

export const releaseWorkOrder = async (req: RequestWithUser, res: Response) => {
  try {
    const row = await (MfgWorkOrder as any).findOne({
      where: { ...scopeWhere(req), id: Number(req.params.id), is_active: true },
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    if (row.status !== 'draft') {
      return res.status(400).json({ success: false, message: `Cannot release from ${row.status}` });
    }
    const before = decRow(row);
    await row.update({ status: 'released', updated_by: req.user.id });
    await writeMfgAudit({
      tenantId: row.tenant_id,
      companyId: row.company_id,
      docType: 'WO',
      docId: row.id,
      action: 'released',
      actorUserId: req.user.id,
      beforeJson: before,
      afterJson: decRow(row),
      ipAddress: clientIp(req),
    });
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'releaseWorkOrder');
  }
};

// ── Material Issues ──

export const listMaterialIssues = async (req: RequestWithUser, res: Response) => {
  try {
    const rows = await (MfgMaterialIssue as any).findAll({
      where: scopeWhere(req, { is_active: true }),
      include: [{ model: MfgMaterialIssueItem, as: 'items' }],
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listMaterialIssues');
  }
};

export const createMaterialIssue = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const work_order_id = Number(req.body?.work_order_id);
    const warehouse_id = Number(req.body?.warehouse_id);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!work_order_id || !warehouse_id || !items.length) {
      return res.status(400).json({ success: false, message: 'work_order_id, warehouse_id, items required' });
    }

    const result = await sequelize.transaction(async (t: Transaction) => {
      const doc_no = await nextDocumentNumber(tenantId, companyId, 'MI', { transaction: t });
      const header = await (MfgMaterialIssue as any).create(
        {
          tenant_id: tenantId,
          company_id: companyId,
          doc_no,
          work_order_id,
          warehouse_id,
          status: 'draft',
          issue_date: req.body?.issue_date ?? null,
          created_by: req.user.id,
          is_active: true,
        },
        { transaction: t }
      );
      for (const it of items) {
        await (MfgMaterialIssueItem as any).create(
          {
            issue_id: header.id,
            product_id: Number(it.product_id),
            qty: it.qty ?? 0,
            batch_no: it.batch_no ?? null,
            unit_cost: it.unit_cost ?? 0,
          },
          { transaction: t }
        );
      }
      return header;
    });

    const full = await (MfgMaterialIssue as any).findByPk(result.id, {
      include: [{ model: MfgMaterialIssueItem, as: 'items' }],
    });
    res.status(201).json({ success: true, data: decRow(full) });
  } catch (error) {
    handleError(res, error, 'createMaterialIssue');
  }
};

export const approveMaterialIssue = async (req: RequestWithUser, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { tenantId, companyId } = resolveCompanyScope(req);

    await sequelize.transaction(async (t: Transaction) => {
      const issue = await (MfgMaterialIssue as any).findOne({
        where: { tenant_id: tenantId, company_id: companyId, id, is_active: true },
        include: [{ model: MfgMaterialIssueItem, as: 'items' }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!issue) throw new Error('NOT_FOUND');
      if (issue.status !== 'draft') throw new Error(`INVALID_STATUS:${issue.status}`);

      const txnDate = issue.issue_date || new Date().toISOString().slice(0, 10);
      for (const item of issue.items || []) {
        const qtyOut = Number(item.qty || 0);
        if (qtyOut <= 0) continue;
        await postLedgerEntry({
          tenantId,
          companyId,
          productId: item.product_id,
          warehouseId: issue.warehouse_id,
          batchNo: item.batch_no,
          txnDate,
          txnType: 'mi_out',
          qtyOut,
          unitCost: item.unit_cost ?? 0,
          refDocType: 'MI',
          refDocId: issue.id,
          refDocNo: issue.doc_no,
          createdBy: req.user.id,
          transaction: t,
        });
      }
      await issue.update({ status: 'approved' }, { transaction: t });
      await writeMfgAudit({
        tenantId,
        companyId,
        docType: 'MI',
        docId: issue.id,
        action: 'approved',
        actorUserId: req.user.id,
        afterJson: decRow(issue),
        ipAddress: clientIp(req),
      });
    });

    const full = await (MfgMaterialIssue as any).findByPk(id, {
      include: [{ model: MfgMaterialIssueItem, as: 'items' }],
    });
    res.json({ success: true, data: decRow(full) });
  } catch (error) {
    handleError(res, error, 'approveMaterialIssue');
  }
};

// ── Production Entries ──

export const listProductionEntries = async (req: RequestWithUser, res: Response) => {
  try {
    const rows = await (MfgProductionEntry as any).findAll({
      where: scopeWhere(req),
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listProductionEntries');
  }
};

export const createProductionEntry = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const work_order_id = Number(req.body?.work_order_id);
    const good_qty = Number(req.body?.good_qty || 0);
    const warehouse_id = Number(req.body?.warehouse_id);
    if (!work_order_id || good_qty <= 0 || !warehouse_id) {
      return res.status(400).json({ success: false, message: 'work_order_id, good_qty, warehouse_id required' });
    }

    const row = await sequelize.transaction(async (t: Transaction) => {
      const wo = await (MfgWorkOrder as any).findOne({
        where: { id: work_order_id, tenant_id: tenantId, company_id: companyId, is_active: true },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!wo) throw new Error('NOT_FOUND');

      const entry = await (MfgProductionEntry as any).create(
        {
          tenant_id: tenantId,
          company_id: companyId,
          work_order_id,
          entry_date: req.body?.entry_date ?? new Date().toISOString().slice(0, 10),
          good_qty,
          reject_qty: req.body?.reject_qty ?? 0,
          rework_qty: req.body?.rework_qty ?? 0,
          scrap_qty: req.body?.scrap_qty ?? 0,
          warehouse_id,
          batch_no: req.body?.batch_no ?? null,
          created_by: req.user.id,
          status: 'posted',
        },
        { transaction: t }
      );

      await postLedgerEntry({
        tenantId,
        companyId,
        financialYearId: wo.financial_year_id,
        branchId: wo.branch_id,
        productId: wo.product_id,
        warehouseId: warehouse_id,
        batchNo: req.body?.batch_no ?? null,
        txnDate: entry.entry_date || new Date().toISOString().slice(0, 10),
        txnType: 'prod_in',
        qtyIn: good_qty,
        refDocType: 'PE',
        refDocId: entry.id,
        createdBy: req.user.id,
        transaction: t,
      });

      const completed = Number(wo.completed_qty || 0) + good_qty;
      const scrap = Number(wo.scrap_qty || 0) + Number(req.body?.scrap_qty || 0);
      let status = wo.status;
      if (completed >= Number(wo.plan_qty || 0)) status = 'completed';
      else if (completed > 0) status = 'in_progress';
      await wo.update({ completed_qty: completed, scrap_qty: scrap, status, updated_by: req.user.id }, { transaction: t });

      await writeMfgAudit({
        tenantId,
        companyId,
        docType: 'PE',
        docId: entry.id,
        action: 'posted',
        actorUserId: req.user.id,
        afterJson: decRow(entry),
        ipAddress: clientIp(req),
      });
      return entry;
    });

    res.status(201).json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'createProductionEntry');
  }
};

// ── Standard Costs ──

export const listStandardCosts = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req, { is_active: true });
    if (req.query.product_id) where.product_id = Number(req.query.product_id);
    const rows = await (MfgStandardCost as any).findAll({ where, order: [['id', 'DESC']] });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listStandardCosts');
  }
};

export const computeStandardCost = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const bomId = req.body?.bom_id ? Number(req.body.bom_id) : null;
    const productId = req.body?.product_id ? Number(req.body.product_id) : null;

    let row;
    if (bomId) {
      row = await computeStandardCostForBom(tenantId, companyId, bomId, req.body?.version_no);
    } else if (productId) {
      row = await upsertStandardCost({
        tenantId,
        companyId,
        productId,
        bomVersionId: req.body?.bom_version_id ?? null,
        labourCost: req.body?.labour_cost,
        machineCost: req.body?.machine_cost,
        overheadCost: req.body?.overhead_cost,
        packingCost: req.body?.packing_cost,
      });
    } else {
      return res.status(400).json({ success: false, message: 'bom_id or product_id required' });
    }
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'computeStandardCost');
  }
};
