'use strict';

/**
 * 구매모듈 Step1~2 기초:
 * - PR 헤더/라인 확장 컬럼
 * - 구매 승인금액 설정 테이블
 * - 구매관리 메뉴 트리
 * - 문서번호 타입 시드(RFQ/SQ/…)
 */

const PR_HEADER_COLS = [
  { name: 'request_date', def: { type: 'DATEONLY', allowNull: true } },
  { name: 'purchase_type', def: { type: 'STRING', length: 40, allowNull: true } },
  { name: 'priority', def: { type: 'STRING', length: 20, allowNull: false, defaultValue: 'normal' } },
  { name: 'currency_code', def: { type: 'STRING', length: 3, allowNull: false, defaultValue: 'INR' } },
  { name: 'purpose', def: { type: 'TEXT', allowNull: true } },
  { name: 'urgency_reason', def: { type: 'TEXT', allowNull: true } },
  { name: 'delivery_location', def: { type: 'STRING', length: 255, allowNull: true } },
  { name: 'rejection_reason', def: { type: 'TEXT', allowNull: true } },
];

const PR_ITEM_COLS = [
  { name: 'preferred_partner_id', def: { type: 'INTEGER', allowNull: true } },
  { name: 'required_date', def: { type: 'DATEONLY', allowNull: true } },
  { name: 'ordered_qty', def: { type: 'DECIMAL', precision: 18, scale: 3, allowNull: false, defaultValue: 0 } },
  { name: 'specification', def: { type: 'TEXT', allowNull: true } },
];

const PURCHASE_MENUS = [
  { route: '/purchase/dashboard', name_ko: '구매 대시보드', name_en: 'Purchase Dashboard', icon: 'dashboard', order: 1 },
  { route: '/purchase/requisitions', name_ko: '구매요청', name_en: 'Purchase Requisitions', icon: 'request_quote', order: 2 },
  { route: '/purchase/rfq', name_ko: '견적요청', name_en: 'RFQ', icon: 'mail', order: 3 },
  { route: '/purchase/supplier-quotations', name_ko: '공급업체 견적', name_en: 'Supplier Quotations', icon: 'description', order: 4 },
  { route: '/purchase/quotation-compare', name_ko: '견적비교', name_en: 'Quotation Compare', icon: 'compare', order: 5 },
  { route: '/purchase/orders', name_ko: '구매발주', name_en: 'Purchase Orders', icon: 'shopping_cart', order: 6 },
  { route: '/purchase/goods-receipts', name_ko: '입고관리', name_en: 'Goods Receipts', icon: 'inventory_2', order: 7 },
  { route: '/purchase/quality-inspections', name_ko: '품질검사', name_en: 'Quality Inspection', icon: 'fact_check', order: 8 },
  { route: '/purchase/invoices', name_ko: '매입 인보이스', name_en: 'Purchase Invoices', icon: 'receipt', order: 9 },
  { route: '/purchase/returns', name_ko: '구매반품', name_en: 'Purchase Returns', icon: 'undo', order: 10 },
  { route: '/purchase/payment-requests', name_ko: '지급요청', name_en: 'Payment Requests', icon: 'payments', order: 11 },
  { route: '/purchase/reports', name_ko: '구매현황', name_en: 'Purchase Reports', icon: 'assessment', order: 12 },
  { route: '/purchase/suppliers', name_ko: '공급업체 관리', name_en: 'Suppliers', icon: 'store', order: 13 },
  { route: '/purchase/settings', name_ko: '구매 설정', name_en: 'Purchase Settings', icon: 'settings', order: 14 },
];

const DOC_TYPES = [
  ['RFQ', 'RFQ'],
  ['SQ', 'SQ'],
  ['IQC', 'IQC'],
  ['PINV', 'PINV'],
  ['PRET', 'PRET'],
  ['PAYREQ', 'PAYREQ'],
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const qi = queryInterface;

    const prDesc = await qi.describeTable('mfg_purchase_requisitions').catch(() => null);
    if (prDesc) {
      for (const col of PR_HEADER_COLS) {
        if (!prDesc[col.name]) {
          const opts = { ...col.def };
          if (opts.type === 'DATEONLY') opts.type = Sequelize.DATEONLY;
          else if (opts.type === 'STRING') opts.type = Sequelize.STRING(opts.length || 255);
          else if (opts.type === 'TEXT') opts.type = Sequelize.TEXT;
          else if (opts.type === 'INTEGER') opts.type = Sequelize.INTEGER;
          delete opts.length;
          await qi.addColumn('mfg_purchase_requisitions', col.name, opts);
        }
      }
    }

    const itemDesc = await qi.describeTable('mfg_purchase_requisition_items').catch(() => null);
    if (itemDesc) {
      for (const col of PR_ITEM_COLS) {
        if (!itemDesc[col.name]) {
          let type = Sequelize.STRING(255);
          const opts = { allowNull: col.def.allowNull !== false };
          if (col.def.type === 'INTEGER') type = Sequelize.INTEGER;
          else if (col.def.type === 'DATEONLY') type = Sequelize.DATEONLY;
          else if (col.def.type === 'DECIMAL') {
            type = Sequelize.DECIMAL(col.def.precision || 18, col.def.scale || 3);
            opts.defaultValue = col.def.defaultValue ?? 0;
            opts.allowNull = false;
          } else if (col.def.type === 'TEXT') type = Sequelize.TEXT;
          await qi.addColumn('mfg_purchase_requisition_items', col.name, { type, ...opts });
        }
      }
    }

    const tables = await qi.showAllTables();
    const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name));
    if (!names.includes('purchase_approval_settings')) {
      await qi.createTable('purchase_approval_settings', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.INTEGER, allowNull: false },
        company_id: { type: Sequelize.INTEGER, allowNull: false },
        doc_type: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'PR' },
        min_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        max_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
        approver_role: { type: Sequelize.STRING(60), allowNull: false, defaultValue: 'purchase_manager' },
        step_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await qi.addIndex('purchase_approval_settings', ['tenant_id', 'company_id', 'doc_type'], {
        name: 'purchase_approval_settings_scope_idx',
      });
    }

    const [roots] = await sequelize.query(`
      SELECT id, tenant_id FROM menus
      WHERE route = '/purchase' AND (parent_id IS NULL OR level = 0)
    `);

    for (const root of roots) {
      await sequelize.query(
        `UPDATE menus SET name_ko = '구매관리', name_en = 'Purchase Management', updated_at = NOW() WHERE id = $1`,
        { bind: [root.id] }
      );

      for (const menu of PURCHASE_MENUS) {
        const [existing] = await sequelize.query(
          `SELECT id FROM menus WHERE tenant_id = $1 AND route = $2 LIMIT 1`,
          { bind: [root.tenant_id, menu.route] }
        );
        if (existing.length) {
          await sequelize.query(
            `UPDATE menus
             SET parent_id = $1, name_ko = $2, name_en = $3, icon = $4, "order" = $5,
                 level = 1, is_active = true, updated_at = NOW()
             WHERE id = $6`,
            {
              bind: [root.id, menu.name_ko, menu.name_en, menu.icon, menu.order, existing[0].id],
            }
          );
        } else {
          await sequelize.query(
            `INSERT INTO menus
              (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 1, true, $8, NOW(), NOW())`,
            {
              bind: [
                root.tenant_id,
                root.id,
                menu.name_ko,
                menu.name_en,
                menu.route,
                menu.icon,
                menu.order,
                menu.name_en,
              ],
            }
          );
        }
      }

      for (const [docType, prefix] of DOC_TYPES) {
        await sequelize.query(
          `INSERT INTO mfg_document_sequences
            (tenant_id, company_id, doc_type, prefix, next_number, pad_length, created_at, updated_at)
           SELECT c.tenant_id, c.id, $2::varchar, $3::varchar, 1, 5, NOW(), NOW()
           FROM companies c
           WHERE c.tenant_id = $1
             AND NOT EXISTS (
               SELECT 1 FROM mfg_document_sequences s
               WHERE s.tenant_id = c.tenant_id AND s.company_id = c.id AND s.doc_type = $2::varchar
             )`,
          { bind: [root.tenant_id, docType, prefix] }
        );
      }
    }
  },

  async down(queryInterface) {
    // soft: deactivate new menus only
    await queryInterface.sequelize.query(`
      UPDATE menus SET is_active = false, updated_at = NOW()
      WHERE route IN (
        '/purchase/dashboard','/purchase/rfq','/purchase/supplier-quotations',
        '/purchase/quotation-compare','/purchase/invoices','/purchase/returns',
        '/purchase/payment-requests','/purchase/reports','/purchase/suppliers','/purchase/settings'
      )
    `);
  },
};
