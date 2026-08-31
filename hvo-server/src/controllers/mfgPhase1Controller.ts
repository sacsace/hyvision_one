import { Response } from 'express';
import { Op, Transaction } from 'sequelize';
import {
  sequelize,
  MfgBranch,
  MfgBinLocation,
  InventoryLocation,
  MfgDocumentSequence,
  MfgPurchaseRequisition,
  MfgPurchaseRequisitionItem,
  MfgPurchaseOrder,
  MfgPurchaseOrderItem,
  MfgGoodsReceipt,
  MfgGoodsReceiptItem,
  MfgStockLedgerEntry,
  MfgQualityInspection,
  MfgDocumentAuditLog,
} from '../models';
import { RequestWithUser } from '../types';
import { resolveCompanyScope } from '../utils/companyScope';
import { nextDocumentNumber } from '../services/mfgDocumentNumber';
import { writeMfgAudit } from '../services/mfgAuditLog';
import { postLedgerEntry } from '../services/mfgStockService';

const decRow = (row: any) => {
  if (!row) return row;
  const plain = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
  for (const key of Object.keys(plain)) {
    if (plain[key] != null && typeof plain[key] === 'object' && typeof plain[key].toFixed === 'function') {
      plain[key] = String(plain[key]);
    }
  }
  return plain;
};

const scopeWhere = (req: RequestWithUser, extra: Record<string, unknown> = {}) => {
  const { tenantId, companyId } = resolveCompanyScope(req);
  return { tenant_id: tenantId, company_id: companyId, ...extra };
};

const clientIp = (req: RequestWithUser) =>
  String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || null;

// ── Branches ──

export const listBranches = async (req: RequestWithUser, res: Response) => {
  try {
    const activeOnly = req.query.active !== 'false';
    const rows = await (MfgBranch as any).findAll({
      where: scopeWhere(req, activeOnly ? { is_active: true } : {}),
      order: [['code', 'ASC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    console.error('listBranches:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createBranch = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const code = String(req.body?.code || '').trim();
    const name = String(req.body?.name || '').trim();
    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'code and name are required' });
    }
    const row = await (MfgBranch as any).create({
      tenant_id: tenantId,
      company_id: companyId,
      code,
      name,
      gstin: req.body?.gstin || null,
      address: req.body?.address || null,
      state_code: req.body?.state_code || null,
      is_active: true,
      created_by: req.user.id,
      updated_by: req.user.id,
    });
    await writeMfgAudit({
      tenantId,
      companyId,
      docType: 'BRANCH',
      docId: row.id,
      action: 'create',
      actorUserId: req.user.id,
      afterJson: decRow(row),
      ipAddress: clientIp(req),
    });
    res.status(201).json({ success: true, data: decRow(row) });
  } catch (error: any) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Branch code already exists' });
    }
    console.error('createBranch:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateBranch = async (req: RequestWithUser, res: Response) => {
  try {
    const id = Number(req.params.id);
    const row = await (MfgBranch as any).findOne({ where: { ...scopeWhere(req), id } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const before = decRow(row);
    const patch: Record<string, unknown> = { updated_by: req.user.id };
    for (const key of ['code', 'name', 'gstin', 'address', 'state_code', 'is_active']) {
      if (req.body?.[key] !== undefined) patch[key] = req.body[key];
    }
    await row.update(patch);
    await writeMfgAudit({
      tenantId: row.tenant_id,
      companyId: row.company_id,
      docType: 'BRANCH',
      docId: row.id,
      action: 'update',
      actorUserId: req.user.id,
      beforeJson: before,
      afterJson: decRow(row),
      ipAddress: clientIp(req),
    });
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    console.error('updateBranch:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Warehouses (inventory_locations) ──

export const listWarehouses = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req);
    if (req.query.active !== 'false') where.is_active = true;
    if (req.query.branch_id) where.branch_id = Number(req.query.branch_id);
    const rows = await (InventoryLocation as any).findAll({
      where,
      order: [['name', 'ASC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    console.error('listWarehouses:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateWarehouse = async (req: RequestWithUser, res: Response) => {
  try {
    const id = Number(req.params.id);
    const row = await (InventoryLocation as any).findOne({ where: { ...scopeWhere(req), id } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const patch: Record<string, unknown> = {};
    for (const key of ['name', 'code', 'address', 'branch_id', 'is_active']) {
      if (req.body?.[key] !== undefined) patch[key] = req.body[key];
    }
    await row.update(patch);
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    console.error('updateWarehouse:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Bin locations ──

export const listBinLocations = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req);
    if (req.query.active !== 'false') where.is_active = true;
    if (req.query.warehouse_id) where.warehouse_id = Number(req.query.warehouse_id);
    const rows = await (MfgBinLocation as any).findAll({
      where,
      order: [['code', 'ASC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    console.error('listBinLocations:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createBinLocation = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const warehouse_id = Number(req.body?.warehouse_id);
    const code = String(req.body?.code || '').trim();
    const name = String(req.body?.name || '').trim();
    if (!warehouse_id || !code || !name) {
      return res.status(400).json({ success: false, message: 'warehouse_id, code, name required' });
    }
    const row = await (MfgBinLocation as any).create({
      tenant_id: tenantId,
      company_id: companyId,
      warehouse_id,
      code,
      name,
      is_active: true,
    });
    res.status(201).json({ success: true, data: decRow(row) });
  } catch (error: any) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Bin code already exists for warehouse' });
    }
    console.error('createBinLocation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateBinLocation = async (req: RequestWithUser, res: Response) => {
  try {
    const id = Number(req.params.id);
    const row = await (MfgBinLocation as any).findOne({ where: { ...scopeWhere(req), id } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    const patch: Record<string, unknown> = {};
    for (const key of ['code', 'name', 'warehouse_id', 'is_active']) {
      if (req.body?.[key] !== undefined) patch[key] = req.body[key];
    }
    await row.update(patch);
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    console.error('updateBinLocation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Document sequences ──

export const listDocumentSequences = async (req: RequestWithUser, res: Response) => {
  try {
    const rows = await (MfgDocumentSequence as any).findAll({
      where: scopeWhere(req),
      order: [['doc_type', 'ASC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    console.error('listDocumentSequences:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const upsertDocumentSequence = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const doc_type = String(req.body?.doc_type || '').trim();
    if (!doc_type) return res.status(400).json({ success: false, message: 'doc_type required' });

    const [row] = await (MfgDocumentSequence as any).findOrCreate({
      where: { tenant_id: tenantId, company_id: companyId, doc_type },
      defaults: {
        tenant_id: tenantId,
        company_id: companyId,
        doc_type,
        prefix: req.body?.prefix ?? doc_type,
        next_number: req.body?.next_number ?? 1,
        pad_length: req.body?.pad_length ?? 5,
        branch_id: req.body?.branch_id ?? null,
        financial_year_id: req.body?.financial_year_id ?? null,
      },
    });

    const patch: Record<string, unknown> = {};
    for (const key of ['prefix', 'next_number', 'pad_length', 'branch_id', 'financial_year_id']) {
      if (req.body?.[key] !== undefined) patch[key] = req.body[key];
    }
    if (Object.keys(patch).length) await row.update(patch);

    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    console.error('upsertDocumentSequence:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Purchase requisitions ──

export const listPurchaseRequisitions = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req, { is_active: true });
    if (req.query.status) where.status = String(req.query.status);
    const rows = await (MfgPurchaseRequisition as any).findAll({
      where,
      include: [{ model: MfgPurchaseRequisitionItem, as: 'items' }],
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    console.error('listPurchaseRequisitions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getPurchaseRequisition = async (req: RequestWithUser, res: Response) => {
  try {
    const row = await (MfgPurchaseRequisition as any).findOne({
      where: { ...scopeWhere(req), id: Number(req.params.id), is_active: true },
      include: [{ model: MfgPurchaseRequisitionItem, as: 'items' }],
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    console.error('getPurchaseRequisition:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createPurchaseRequisition = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const branch_id = Number(req.body?.branch_id);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!branch_id || !items.length) {
      return res.status(400).json({ success: false, message: 'branch_id and items required' });
    }
    for (const it of items) {
      if (Number(it.qty || 0) <= 0) {
        return res.status(400).json({ success: false, message: 'Item qty must be greater than 0' });
      }
    }
    const priority = String(req.body?.priority || 'normal');
    if (priority === 'urgent' && !String(req.body?.urgency_reason || '').trim()) {
      return res.status(400).json({ success: false, message: 'urgency_reason required for urgent PR' });
    }
    const request_date = req.body?.request_date || new Date().toISOString().slice(0, 10);
    const required_date = req.body?.required_date || null;
    if (required_date && request_date && String(required_date) < String(request_date)) {
      return res.status(400).json({ success: false, message: 'required_date cannot be before request_date' });
    }

    const result = await sequelize.transaction(async (t: Transaction) => {
      const doc_no = await nextDocumentNumber(tenantId, companyId, 'PR', {
        branchId: branch_id,
        financialYearId: req.body?.financial_year_id ?? null,
        transaction: t,
      });
      const header = await (MfgPurchaseRequisition as any).create(
        {
          tenant_id: tenantId,
          company_id: companyId,
          doc_no,
          branch_id,
          financial_year_id: req.body?.financial_year_id ?? null,
          department_id: req.body?.department_id ?? null,
          requester_id: req.body?.requester_id ?? req.user.id,
          status: 'draft',
          request_date,
          required_date,
          purchase_type: req.body?.purchase_type ?? null,
          priority,
          currency_code: req.body?.currency_code || 'INR',
          purpose: req.body?.purpose ?? null,
          urgency_reason: req.body?.urgency_reason ?? null,
          delivery_location: req.body?.delivery_location ?? null,
          remarks: req.body?.remarks ?? null,
          created_by: req.user.id,
          updated_by: req.user.id,
          is_active: true,
        },
        { transaction: t }
      );
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await (MfgPurchaseRequisitionItem as any).create(
          {
            requisition_id: header.id,
            line_no: i + 1,
            product_id: it.product_id ?? null,
            item_name: String(it.item_name || '').trim() || 'Item',
            uom: it.uom || 'EA',
            qty: it.qty ?? 0,
            estimated_unit_price: it.estimated_unit_price ?? 0,
            ordered_qty: 0,
            preferred_partner_id: it.preferred_partner_id ?? null,
            required_date: it.required_date ?? required_date,
            specification: it.specification ?? null,
            remarks: it.remarks ?? null,
          },
          { transaction: t }
        );
      }
      await writeMfgAudit({
        tenantId,
        companyId,
        docType: 'PR',
        docId: header.id,
        action: 'create',
        actorUserId: req.user.id,
        afterJson: { doc_no, status: 'draft' },
        ipAddress: clientIp(req),
      });
      return header;
    });

    const full = await (MfgPurchaseRequisition as any).findByPk(result.id, {
      include: [{ model: MfgPurchaseRequisitionItem, as: 'items' }],
    });
    res.status(201).json({ success: true, data: decRow(full) });
  } catch (error) {
    console.error('createPurchaseRequisition:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const transitionPr = async (
  req: RequestWithUser,
  res: Response,
  targetStatus: string,
  allowedFrom: string[]
) => {
  try {
    const row = await (MfgPurchaseRequisition as any).findOne({
      where: { ...scopeWhere(req), id: Number(req.params.id), is_active: true },
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    if (!allowedFrom.includes(row.status)) {
      return res.status(400).json({ success: false, message: `Cannot transition from ${row.status}` });
    }
    if (
      (targetStatus === 'approved' || targetStatus === 'rejected') &&
      req.user.role !== 'root' &&
      Number(row.requester_id) === Number(req.user.id)
    ) {
      return res.status(403).json({ success: false, message: 'Cannot approve/reject your own PR' });
    }
    const before = decRow(row);
    const patch: Record<string, unknown> = { status: targetStatus, updated_by: req.user.id };
    if (targetStatus === 'approved' || targetStatus === 'rejected') {
      patch.approved_by = req.user.id;
      patch.approved_at = new Date();
      if (targetStatus === 'rejected') {
        patch.rejection_reason = req.body?.reason || req.body?.rejection_reason || null;
      }
    }
    if (targetStatus === 'cancelled') {
      patch.rejection_reason = req.body?.reason || req.body?.rejection_reason || 'cancelled';
    }
    await row.update(patch);
    await writeMfgAudit({
      tenantId: row.tenant_id,
      companyId: row.company_id,
      docType: 'PR',
      docId: row.id,
      action: targetStatus,
      actorUserId: req.user.id,
      beforeJson: before,
      afterJson: decRow(row),
      ipAddress: clientIp(req),
    });
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    console.error('transitionPr:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const submitPurchaseRequisition = (req: RequestWithUser, res: Response) =>
  transitionPr(req, res, 'submitted', ['draft']);
export const approvePurchaseRequisition = (req: RequestWithUser, res: Response) =>
  transitionPr(req, res, 'approved', ['submitted', 'draft']);
export const rejectPurchaseRequisition = (req: RequestWithUser, res: Response) =>
  transitionPr(req, res, 'rejected', ['submitted', 'draft']);
export const cancelPurchaseRequisition = (req: RequestWithUser, res: Response) =>
  transitionPr(req, res, 'cancelled', ['draft', 'submitted', 'approved']);

export const purchaseDashboardStats = async (req: RequestWithUser, res: Response) => {
  try {
    const base = scopeWhere(req, { is_active: true });
    const [prTotal, prPending, prApproved, poOpen, grnDraft] = await Promise.all([
      (MfgPurchaseRequisition as any).count({ where: base }),
      (MfgPurchaseRequisition as any).count({
        where: { ...base, status: { [Op.in]: ['submitted', 'draft'] } },
      }),
      (MfgPurchaseRequisition as any).count({ where: { ...base, status: 'approved' } }),
      (MfgPurchaseOrder as any).count({
        where: {
          ...scopeWhere(req, { is_active: true }),
          status: { [Op.in]: ['draft', 'submitted', 'approved'] },
        },
      }),
      (MfgGoodsReceipt as any).count({
        where: { ...scopeWhere(req, { is_active: true }), status: { [Op.in]: ['draft', 'submitted'] } },
      }),
    ]);
    res.json({
      success: true,
      data: {
        pr_total: prTotal,
        pr_pending_approval: prPending,
        pr_approved: prApproved,
        po_open: poOpen,
        grn_pending: grnDraft,
      },
    });
  } catch (error) {
    console.error('purchaseDashboardStats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Purchase orders ──

export const listPurchaseOrders = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req, { is_active: true });
    if (req.query.status) where.status = String(req.query.status);
    const rows = await (MfgPurchaseOrder as any).findAll({
      where,
      include: [{ model: MfgPurchaseOrderItem, as: 'items' }],
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    console.error('listPurchaseOrders:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getPurchaseOrder = async (req: RequestWithUser, res: Response) => {
  try {
    const row = await (MfgPurchaseOrder as any).findOne({
      where: { ...scopeWhere(req), id: Number(req.params.id), is_active: true },
      include: [{ model: MfgPurchaseOrderItem, as: 'items' }],
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    console.error('getPurchaseOrder:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createPurchaseOrder = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const branch_id = Number(req.body?.branch_id);
    const partner_id = Number(req.body?.partner_id);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!branch_id || !partner_id || !items.length) {
      return res.status(400).json({ success: false, message: 'branch_id, partner_id, items required' });
    }

    const result = await sequelize.transaction(async (t: Transaction) => {
      const doc_no = await nextDocumentNumber(tenantId, companyId, 'PO', {
        branchId: branch_id,
        financialYearId: req.body?.financial_year_id ?? null,
        transaction: t,
      });
      const header = await (MfgPurchaseOrder as any).create(
        {
          tenant_id: tenantId,
          company_id: companyId,
          doc_no,
          branch_id,
          financial_year_id: req.body?.financial_year_id ?? null,
          partner_id,
          requisition_id: req.body?.requisition_id ?? null,
          status: 'draft',
          order_date: req.body?.order_date ?? null,
          expected_date: req.body?.expected_date ?? null,
          currency_code: req.body?.currency_code ?? 'INR',
          over_receive_pct: req.body?.over_receive_pct ?? 0,
          remarks: req.body?.remarks ?? null,
          created_by: req.user.id,
          updated_by: req.user.id,
          is_active: true,
        },
        { transaction: t }
      );
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await (MfgPurchaseOrderItem as any).create(
          {
            po_id: header.id,
            line_no: i + 1,
            product_id: it.product_id ?? null,
            item_name: String(it.item_name || '').trim() || 'Item',
            uom: it.uom || 'EA',
            qty: it.qty ?? 0,
            received_qty: 0,
            unit_price: it.unit_price ?? 0,
            tax_rate: it.tax_rate ?? 0,
          },
          { transaction: t }
        );
      }
      await writeMfgAudit({
        tenantId,
        companyId,
        docType: 'PO',
        docId: header.id,
        action: 'create',
        actorUserId: req.user.id,
        afterJson: { doc_no, status: 'draft' },
        ipAddress: clientIp(req),
      });
      return header;
    });

    const full = await (MfgPurchaseOrder as any).findByPk(result.id, {
      include: [{ model: MfgPurchaseOrderItem, as: 'items' }],
    });
    res.status(201).json({ success: true, data: decRow(full) });
  } catch (error) {
    console.error('createPurchaseOrder:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const approvePurchaseOrder = async (req: RequestWithUser, res: Response) => {
  try {
    const row = await (MfgPurchaseOrder as any).findOne({
      where: { ...scopeWhere(req), id: Number(req.params.id), is_active: true },
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    if (!['draft', 'submitted'].includes(row.status)) {
      return res.status(400).json({ success: false, message: `Cannot approve from ${row.status}` });
    }
    const before = decRow(row);
    await row.update({
      status: 'approved',
      approved_by: req.user.id,
      approved_at: new Date(),
      updated_by: req.user.id,
    });
    await writeMfgAudit({
      tenantId: row.tenant_id,
      companyId: row.company_id,
      docType: 'PO',
      docId: row.id,
      action: 'approved',
      actorUserId: req.user.id,
      beforeJson: before,
      afterJson: decRow(row),
      ipAddress: clientIp(req),
    });
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    console.error('approvePurchaseOrder:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Goods receipts ──

export const listGoodsReceipts = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req, { is_active: true });
    if (req.query.status) where.status = String(req.query.status);
    const rows = await (MfgGoodsReceipt as any).findAll({
      where,
      include: [{ model: MfgGoodsReceiptItem, as: 'items' }],
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    console.error('listGoodsReceipts:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getGoodsReceipt = async (req: RequestWithUser, res: Response) => {
  try {
    const row = await (MfgGoodsReceipt as any).findOne({
      where: { ...scopeWhere(req), id: Number(req.params.id), is_active: true },
      include: [{ model: MfgGoodsReceiptItem, as: 'items' }],
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    console.error('getGoodsReceipt:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createGoodsReceipt = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const branch_id = Number(req.body?.branch_id);
    const partner_id = Number(req.body?.partner_id);
    const warehouse_id = Number(req.body?.warehouse_id);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!branch_id || !partner_id || !warehouse_id || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'branch_id, partner_id, warehouse_id, items required',
      });
    }

    const result = await sequelize.transaction(async (t: Transaction) => {
      const doc_no = await nextDocumentNumber(tenantId, companyId, 'GRN', {
        branchId: branch_id,
        financialYearId: req.body?.financial_year_id ?? null,
        transaction: t,
      });
      const header = await (MfgGoodsReceipt as any).create(
        {
          tenant_id: tenantId,
          company_id: companyId,
          doc_no,
          branch_id,
          financial_year_id: req.body?.financial_year_id ?? null,
          po_id: req.body?.po_id ?? null,
          partner_id,
          warehouse_id,
          status: 'draft',
          receipt_date: req.body?.receipt_date ?? null,
          remarks: req.body?.remarks ?? null,
          created_by: req.user.id,
          updated_by: req.user.id,
          is_active: true,
        },
        { transaction: t }
      );
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await (MfgGoodsReceiptItem as any).create(
          {
            grn_id: header.id,
            po_item_id: it.po_item_id ?? null,
            product_id: Number(it.product_id),
            item_name: String(it.item_name || '').trim() || 'Item',
            uom: it.uom || 'EA',
            qty: it.qty ?? 0,
            accepted_qty: it.accepted_qty ?? it.qty ?? 0,
            rejected_qty: it.rejected_qty ?? 0,
            batch_no: it.batch_no ?? null,
            unit_cost: it.unit_cost ?? 0,
            inspection_status: it.inspection_status ?? 'pending',
          },
          { transaction: t }
        );
      }
      await writeMfgAudit({
        tenantId,
        companyId,
        docType: 'GRN',
        docId: header.id,
        action: 'create',
        actorUserId: req.user.id,
        afterJson: { doc_no, status: 'draft' },
        ipAddress: clientIp(req),
      });
      return header;
    });

    const full = await (MfgGoodsReceipt as any).findByPk(result.id, {
      include: [{ model: MfgGoodsReceiptItem, as: 'items' }],
    });
    res.status(201).json({ success: true, data: decRow(full) });
  } catch (error) {
    console.error('createGoodsReceipt:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const approveGoodsReceipt = async (req: RequestWithUser, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { tenantId, companyId } = resolveCompanyScope(req);

    await sequelize.transaction(async (t: Transaction) => {
      const grn = await (MfgGoodsReceipt as any).findOne({
        where: { tenant_id: tenantId, company_id: companyId, id, is_active: true },
        include: [{ model: MfgGoodsReceiptItem, as: 'items' }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!grn) throw new Error('NOT_FOUND');
      if (!['draft', 'submitted', 'inspection_pending'].includes(grn.status)) {
        throw new Error(`INVALID_STATUS:${grn.status}`);
      }

      const before = decRow(grn);
      const receiptDate = grn.receipt_date || new Date().toISOString().slice(0, 10);

      for (const item of grn.items || []) {
        const qtyIn = Number(item.accepted_qty || 0);
        if (qtyIn <= 0) continue;

        await postLedgerEntry({
          tenantId,
          companyId,
          financialYearId: grn.financial_year_id,
          branchId: grn.branch_id,
          productId: item.product_id,
          warehouseId: grn.warehouse_id,
          batchNo: item.batch_no,
          txnDate: receiptDate,
          txnType: 'grn_in',
          qtyIn,
          qtyOut: 0,
          unitCost: item.unit_cost ?? 0,
          refDocType: 'GRN',
          refDocId: grn.id,
          refDocNo: grn.doc_no,
          createdBy: req.user.id,
          transaction: t,
        });

        if (item.po_item_id) {
          const poItem = await (MfgPurchaseOrderItem as any).findByPk(item.po_item_id, {
            transaction: t,
            lock: t.LOCK.UPDATE,
          });
          if (poItem) {
            const recv = Number(poItem.received_qty || 0) + qtyIn;
            await poItem.update({ received_qty: recv }, { transaction: t });
          }
        }
      }

      await grn.update({ status: 'completed', updated_by: req.user.id }, { transaction: t });

      await writeMfgAudit({
        tenantId,
        companyId,
        docType: 'GRN',
        docId: grn.id,
        action: 'approved',
        actorUserId: req.user.id,
        beforeJson: before,
        afterJson: decRow(grn),
        ipAddress: clientIp(req),
      });
    });

    const full = await (MfgGoodsReceipt as any).findByPk(id, {
      include: [{ model: MfgGoodsReceiptItem, as: 'items' }],
    });
    res.json({ success: true, data: decRow(full) });
  } catch (error: any) {
    if (error?.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    if (error?.message === 'PERIOD_LOCKED') {
      return res.status(409).json({ success: false, message: 'Period is locked' });
    }
    if (error?.message === 'NEGATIVE_STOCK') {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }
    if (String(error?.message || '').startsWith('INVALID_STATUS:')) {
      return res.status(400).json({ success: false, message: 'Invalid status for approval' });
    }
    console.error('approveGoodsReceipt:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Stock ledger ──

export const listStockLedger = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req);
    if (req.query.product_id) where.product_id = Number(req.query.product_id);
    if (req.query.warehouse_id) where.warehouse_id = Number(req.query.warehouse_id);
    if (req.query.txn_type) where.txn_type = String(req.query.txn_type);
    const rows = await (MfgStockLedgerEntry as any).findAll({
      where,
      order: [['txn_date', 'DESC'], ['id', 'DESC']],
      limit: Math.min(Number(req.query.limit) || 200, 500),
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    console.error('listStockLedger:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Quality inspections ──

export const createQualityInspection = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const grn_id = Number(req.body?.grn_id);
    if (!grn_id) return res.status(400).json({ success: false, message: 'grn_id required' });

    const row = await (MfgQualityInspection as any).create({
      tenant_id: tenantId,
      company_id: companyId,
      grn_id,
      grn_item_id: req.body?.grn_item_id ?? null,
      inspection_type: req.body?.inspection_type ?? 'incoming',
      status: req.body?.status ?? 'pending',
      remarks: req.body?.remarks ?? null,
      created_by: req.user.id,
      updated_by: req.user.id,
    });
    res.status(201).json({ success: true, data: decRow(row) });
  } catch (error) {
    console.error('createQualityInspection:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateQualityInspectionStatus = async (req: RequestWithUser, res: Response) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || '').trim();
    if (!status) return res.status(400).json({ success: false, message: 'status required' });

    const row = await (MfgQualityInspection as any).findOne({ where: { ...scopeWhere(req), id } });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });

    await row.update({
      status,
      inspected_by: req.user.id,
      inspected_at: new Date(),
      remarks: req.body?.remarks ?? row.remarks,
      updated_by: req.user.id,
    });

    if (row.grn_item_id) {
      await (MfgGoodsReceiptItem as any).update(
        { inspection_status: status },
        { where: { id: row.grn_item_id } }
      );
    }

    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    console.error('updateQualityInspectionStatus:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Audit logs ──

export const listAuditLogs = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req);
    if (req.query.doc_type) where.doc_type = String(req.query.doc_type);
    if (req.query.doc_id) where.doc_id = Number(req.query.doc_id);
    const rows = await (MfgDocumentAuditLog as any).findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Math.min(Number(req.query.limit) || 100, 500),
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    console.error('listAuditLogs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
