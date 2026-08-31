import { Response } from 'express';
import { Transaction } from 'sequelize';
import {
  sequelize,
  MfgSalesOrder,
  MfgSalesOrderItem,
  MfgStockReservation,
  MfgDeliveryChallan,
  MfgDeliveryChallanItem,
  MfgCreditNote,
} from '../models';
import { RequestWithUser } from '../types';
import { resolveCompanyScope } from '../utils/companyScope';
import { nextDocumentNumber } from '../services/mfgDocumentNumber';
import { writeMfgAudit } from '../services/mfgAuditLog';
import { postLedgerEntry } from '../services/mfgStockService';
import { decRow, scopeWhere, clientIp, handleError } from './mfgControllerHelpers';

// ── Sales Orders ──

export const listSalesOrders = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req, { is_active: true });
    if (req.query.status) where.status = String(req.query.status);
    const rows = await (MfgSalesOrder as any).findAll({
      where,
      include: [{ model: MfgSalesOrderItem, as: 'items' }],
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listSalesOrders');
  }
};

export const getSalesOrder = async (req: RequestWithUser, res: Response) => {
  try {
    const row = await (MfgSalesOrder as any).findOne({
      where: { ...scopeWhere(req), id: Number(req.params.id), is_active: true },
      include: [{ model: MfgSalesOrderItem, as: 'items' }],
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'getSalesOrder');
  }
};

export const createSalesOrder = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const partner_id = Number(req.body?.partner_id);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!partner_id || !items.length) {
      return res.status(400).json({ success: false, message: 'partner_id and items required' });
    }

    const result = await sequelize.transaction(async (t: Transaction) => {
      const doc_no = await nextDocumentNumber(tenantId, companyId, 'SO', {
        branchId: req.body?.branch_id ?? null,
        financialYearId: req.body?.financial_year_id ?? null,
        transaction: t,
      });
      const header = await (MfgSalesOrder as any).create(
        {
          tenant_id: tenantId,
          company_id: companyId,
          doc_no,
          branch_id: req.body?.branch_id ?? null,
          financial_year_id: req.body?.financial_year_id ?? null,
          partner_id,
          status: 'draft',
          order_date: req.body?.order_date ?? null,
          currency_code: req.body?.currency_code ?? 'INR',
          credit_limit_check: req.body?.credit_limit_check ?? true,
          remarks: req.body?.remarks ?? null,
          created_by: req.user.id,
          updated_by: req.user.id,
          is_active: true,
        },
        { transaction: t }
      );
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await (MfgSalesOrderItem as any).create(
          {
            so_id: header.id,
            line_no: i + 1,
            product_id: it.product_id ?? null,
            item_name: String(it.item_name || '').trim() || 'Item',
            uom: it.uom || 'EA',
            qty: it.qty ?? 0,
            unit_price: it.unit_price ?? 0,
            tax_rate: it.tax_rate ?? 0,
            discount_pct: it.discount_pct ?? 0,
          },
          { transaction: t }
        );
      }
      await writeMfgAudit({
        tenantId,
        companyId,
        docType: 'SO',
        docId: header.id,
        action: 'create',
        actorUserId: req.user.id,
        afterJson: { doc_no, status: 'draft' },
        ipAddress: clientIp(req),
      });
      return header;
    });

    const full = await (MfgSalesOrder as any).findByPk(result.id, {
      include: [{ model: MfgSalesOrderItem, as: 'items' }],
    });
    res.status(201).json({ success: true, data: decRow(full) });
  } catch (error) {
    handleError(res, error, 'createSalesOrder');
  }
};

export const updateSalesOrder = async (req: RequestWithUser, res: Response) => {
  try {
    const row = await (MfgSalesOrder as any).findOne({
      where: { ...scopeWhere(req), id: Number(req.params.id), is_active: true },
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    if (row.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft orders can be edited' });
    }
    const before = decRow(row);
    const patch: Record<string, unknown> = { updated_by: req.user.id };
    for (const key of ['partner_id', 'branch_id', 'order_date', 'remarks', 'currency_code']) {
      if (req.body?.[key] !== undefined) patch[key] = req.body[key];
    }
    await row.update(patch);
    await writeMfgAudit({
      tenantId: row.tenant_id,
      companyId: row.company_id,
      docType: 'SO',
      docId: row.id,
      action: 'update',
      actorUserId: req.user.id,
      beforeJson: before,
      afterJson: decRow(row),
      ipAddress: clientIp(req),
    });
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'updateSalesOrder');
  }
};

export const approveSalesOrder = async (req: RequestWithUser, res: Response) => {
  try {
    const row = await (MfgSalesOrder as any).findOne({
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
      docType: 'SO',
      docId: row.id,
      action: 'approved',
      actorUserId: req.user.id,
      beforeJson: before,
      afterJson: decRow(row),
      ipAddress: clientIp(req),
    });
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'approveSalesOrder');
  }
};

export const deactivateSalesOrder = async (req: RequestWithUser, res: Response) => {
  try {
    const row = await (MfgSalesOrder as any).findOne({
      where: { ...scopeWhere(req), id: Number(req.params.id), is_active: true },
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    await row.update({ is_active: false, updated_by: req.user.id });
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'deactivateSalesOrder');
  }
};

// ── Stock Reservations ──

export const listStockReservations = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req, { is_active: true });
    if (req.query.so_id) where.so_id = Number(req.query.so_id);
    if (req.query.status) where.status = String(req.query.status);
    const rows = await (MfgStockReservation as any).findAll({ where, order: [['id', 'DESC']] });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listStockReservations');
  }
};

export const createStockReservation = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const so_id = Number(req.body?.so_id);
    const so_item_id = Number(req.body?.so_item_id);
    const product_id = Number(req.body?.product_id);
    const qty = Number(req.body?.qty || 0);
    if (!so_id || !so_item_id || !product_id || qty <= 0) {
      return res.status(400).json({ success: false, message: 'so_id, so_item_id, product_id, qty required' });
    }

    const row = await sequelize.transaction(async (t: Transaction) => {
      const reservation = await (MfgStockReservation as any).create(
        {
          tenant_id: tenantId,
          company_id: companyId,
          product_id,
          warehouse_id: req.body?.warehouse_id ?? null,
          so_id,
          so_item_id,
          qty,
          status: 'active',
          created_by: req.user.id,
          is_active: true,
        },
        { transaction: t }
      );
      const soItem = await (MfgSalesOrderItem as any).findByPk(so_item_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (soItem) {
        await soItem.update(
          { reserved_qty: Number(soItem.reserved_qty || 0) + qty },
          { transaction: t }
        );
      }
      return reservation;
    });
    res.status(201).json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'createStockReservation');
  }
};

// ── Delivery Challans ──

export const listDeliveryChallans = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req, { is_active: true });
    if (req.query.status) where.status = String(req.query.status);
    const rows = await (MfgDeliveryChallan as any).findAll({
      where,
      include: [{ model: MfgDeliveryChallanItem, as: 'items' }],
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listDeliveryChallans');
  }
};

export const getDeliveryChallan = async (req: RequestWithUser, res: Response) => {
  try {
    const row = await (MfgDeliveryChallan as any).findOne({
      where: { ...scopeWhere(req), id: Number(req.params.id), is_active: true },
      include: [{ model: MfgDeliveryChallanItem, as: 'items' }],
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'getDeliveryChallan');
  }
};

export const createDeliveryChallan = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const partner_id = Number(req.body?.partner_id);
    const warehouse_id = Number(req.body?.warehouse_id);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!partner_id || !warehouse_id || !items.length) {
      return res.status(400).json({ success: false, message: 'partner_id, warehouse_id, items required' });
    }

    const result = await sequelize.transaction(async (t: Transaction) => {
      const doc_no = await nextDocumentNumber(tenantId, companyId, 'DC', {
        branchId: req.body?.branch_id ?? null,
        financialYearId: req.body?.financial_year_id ?? null,
        transaction: t,
      });
      const header = await (MfgDeliveryChallan as any).create(
        {
          tenant_id: tenantId,
          company_id: companyId,
          doc_no,
          branch_id: req.body?.branch_id ?? null,
          financial_year_id: req.body?.financial_year_id ?? null,
          so_id: req.body?.so_id ?? null,
          partner_id,
          warehouse_id,
          status: 'draft',
          challan_date: req.body?.challan_date ?? null,
          remarks: req.body?.remarks ?? null,
          created_by: req.user.id,
          updated_by: req.user.id,
          is_active: true,
        },
        { transaction: t }
      );
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await (MfgDeliveryChallanItem as any).create(
          {
            challan_id: header.id,
            so_item_id: it.so_item_id ?? null,
            product_id: Number(it.product_id),
            item_name: String(it.item_name || '').trim() || 'Item',
            uom: it.uom || 'EA',
            qty: it.qty ?? 0,
            batch_no: it.batch_no ?? null,
          },
          { transaction: t }
        );
      }
      await writeMfgAudit({
        tenantId,
        companyId,
        docType: 'DC',
        docId: header.id,
        action: 'create',
        actorUserId: req.user.id,
        afterJson: { doc_no, status: 'draft' },
        ipAddress: clientIp(req),
      });
      return header;
    });

    const full = await (MfgDeliveryChallan as any).findByPk(result.id, {
      include: [{ model: MfgDeliveryChallanItem, as: 'items' }],
    });
    res.status(201).json({ success: true, data: decRow(full) });
  } catch (error) {
    handleError(res, error, 'createDeliveryChallan');
  }
};

export const approveDispatchDeliveryChallan = async (req: RequestWithUser, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { tenantId, companyId } = resolveCompanyScope(req);

    await sequelize.transaction(async (t: Transaction) => {
      const dc = await (MfgDeliveryChallan as any).findOne({
        where: { tenant_id: tenantId, company_id: companyId, id, is_active: true },
        include: [{ model: MfgDeliveryChallanItem, as: 'items' }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!dc) throw new Error('NOT_FOUND');
      if (!['draft', 'submitted', 'approved'].includes(dc.status)) {
        throw new Error(`INVALID_STATUS:${dc.status}`);
      }

      const before = decRow(dc);
      const txnDate = dc.challan_date || new Date().toISOString().slice(0, 10);

      for (const item of dc.items || []) {
        const qtyOut = Number(item.qty || 0);
        if (qtyOut <= 0) continue;

        await postLedgerEntry({
          tenantId,
          companyId,
          financialYearId: dc.financial_year_id,
          branchId: dc.branch_id,
          productId: item.product_id,
          warehouseId: dc.warehouse_id,
          batchNo: item.batch_no,
          txnDate,
          txnType: 'dc_out',
          qtyOut,
          refDocType: 'DC',
          refDocId: dc.id,
          refDocNo: dc.doc_no,
          createdBy: req.user.id,
          transaction: t,
        });

        if (item.so_item_id) {
          const soItem = await (MfgSalesOrderItem as any).findByPk(item.so_item_id, {
            transaction: t,
            lock: t.LOCK.UPDATE,
          });
          if (soItem) {
            const delivered = Number(soItem.delivered_qty || 0) + qtyOut;
            await soItem.update({ delivered_qty: delivered }, { transaction: t });
            const reserved = Math.max(0, Number(soItem.reserved_qty || 0) - qtyOut);
            await soItem.update({ reserved_qty: reserved }, { transaction: t });
          }

          const reservations = await (MfgStockReservation as any).findAll({
            where: {
              tenant_id: tenantId,
              company_id: companyId,
              so_item_id: item.so_item_id,
              status: 'active',
              is_active: true,
            },
            transaction: t,
            lock: t.LOCK.UPDATE,
          });
          let remaining = qtyOut;
          for (const resv of reservations) {
            if (remaining <= 0) break;
            const consume = Math.min(Number(resv.qty || 0), remaining);
            remaining -= consume;
            if (consume >= Number(resv.qty || 0)) {
              await resv.update({ status: 'consumed' }, { transaction: t });
            } else {
              await resv.update({ qty: Number(resv.qty) - consume }, { transaction: t });
            }
          }
        }
      }

      if (dc.so_id) {
        const so = await (MfgSalesOrder as any).findByPk(dc.so_id, {
          include: [{ model: MfgSalesOrderItem, as: 'items' }],
          transaction: t,
        });
        if (so) {
          const allDelivered = (so.items || []).every(
            (it: any) => Number(it.delivered_qty || 0) >= Number(it.qty || 0)
          );
          const anyDelivered = (so.items || []).some((it: any) => Number(it.delivered_qty || 0) > 0);
          let soStatus = so.status;
          if (allDelivered) soStatus = 'completed';
          else if (anyDelivered) soStatus = 'partially_delivered';
          await so.update({ status: soStatus, updated_by: req.user.id }, { transaction: t });
        }
      }

      await dc.update({ status: 'dispatched', updated_by: req.user.id }, { transaction: t });
      await writeMfgAudit({
        tenantId,
        companyId,
        docType: 'DC',
        docId: dc.id,
        action: 'dispatched',
        actorUserId: req.user.id,
        beforeJson: before,
        afterJson: decRow(dc),
        ipAddress: clientIp(req),
      });
    });

    const full = await (MfgDeliveryChallan as any).findByPk(id, {
      include: [{ model: MfgDeliveryChallanItem, as: 'items' }],
    });
    res.json({ success: true, data: decRow(full) });
  } catch (error) {
    handleError(res, error, 'approveDispatchDeliveryChallan');
  }
};

// ── Credit Notes ──

export const listCreditNotes = async (req: RequestWithUser, res: Response) => {
  try {
    const where: Record<string, unknown> = scopeWhere(req, { is_active: true });
    if (req.query.status) where.status = String(req.query.status);
    const rows = await (MfgCreditNote as any).findAll({ where, order: [['id', 'DESC']] });
    res.json({ success: true, data: rows.map(decRow) });
  } catch (error) {
    handleError(res, error, 'listCreditNotes');
  }
};

export const createCreditNote = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const partner_id = Number(req.body?.partner_id);
    if (!partner_id) return res.status(400).json({ success: false, message: 'partner_id required' });

    const doc_no = await nextDocumentNumber(tenantId, companyId, 'CN');
    const row = await (MfgCreditNote as any).create({
      tenant_id: tenantId,
      company_id: companyId,
      doc_no,
      partner_id,
      invoice_id: req.body?.invoice_id ?? null,
      so_id: req.body?.so_id ?? null,
      status: 'draft',
      note_date: req.body?.note_date ?? null,
      amount: req.body?.amount ?? 0,
      tax_amount: req.body?.tax_amount ?? 0,
      remarks: req.body?.remarks ?? null,
      created_by: req.user.id,
      updated_by: req.user.id,
      is_active: true,
    });
    await writeMfgAudit({
      tenantId,
      companyId,
      docType: 'CN',
      docId: row.id,
      action: 'create',
      actorUserId: req.user.id,
      afterJson: decRow(row),
      ipAddress: clientIp(req),
    });
    res.status(201).json({ success: true, data: decRow(row) });
  } catch (error) {
    handleError(res, error, 'createCreditNote');
  }
};
