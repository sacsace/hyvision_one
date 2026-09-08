'use strict';

/**
 * 빈 DB에서 mfg/purchase/hq 메뉴 마이그레이션이 스킵된 경우를 보정.
 * tenants 테이블 기준으로 구매/제조/본사 메뉴 트리를 upsert.
 */

const PURCHASE_CHILDREN = [
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

const MFG_CHILDREN = [
  { route: '/mfg/branches', name_ko: '사업장', name_en: 'Branches', icon: 'business', order: 1 },
  { route: '/mfg/warehouses', name_ko: '창고', name_en: 'Warehouses', icon: 'warehouse', order: 2 },
  { route: '/mfg/document-sequences', name_ko: '문서번호', name_en: 'Document Sequences', icon: 'tag', order: 3 },
  { route: '/mfg/stock-ledger', name_ko: '재고원장', name_en: 'Stock Ledger', icon: 'receipt_long', order: 4 },
  { route: '/mfg/audit-logs', name_ko: '감사로그', name_en: 'Audit Logs', icon: 'history', order: 5 },
  { route: '/mfg/sales-orders', name_ko: '판매주문', name_en: 'Sales Orders', icon: 'shopping_bag', order: 6 },
  { route: '/mfg/delivery-challans', name_ko: '출고전표', name_en: 'Delivery Challans', icon: 'local_shipping', order: 7 },
  { route: '/mfg/stock-reservations', name_ko: '재고예약', name_en: 'Stock Reservations', icon: 'lock', order: 8 },
  { route: '/mfg/credit-notes', name_ko: '대변메모', name_en: 'Credit Notes', icon: 'note_alt', order: 9 },
  { route: '/mfg/boms', name_ko: 'BOM', name_en: 'BOMs', icon: 'account_tree', order: 10 },
  { route: '/mfg/work-centers', name_ko: '작업장', name_en: 'Work Centers', icon: 'factory', order: 11 },
  { route: '/mfg/routings', name_ko: '라우팅', name_en: 'Routings', icon: 'route', order: 12 },
  { route: '/mfg/production-plans', name_ko: '생산계획', name_en: 'Production Plans', icon: 'event_note', order: 13 },
  { route: '/mfg/work-orders', name_ko: '작업지시', name_en: 'Work Orders', icon: 'build', order: 14 },
  { route: '/mfg/material-issues', name_ko: '자재출고', name_en: 'Material Issues', icon: 'output', order: 15 },
  { route: '/mfg/production-entries', name_ko: '생산실적', name_en: 'Production Entries', icon: 'precision_manufacturing', order: 16 },
  { route: '/mfg/standard-costs', name_ko: '표준원가', name_en: 'Standard Costs', icon: 'calculate', order: 17 },
  { route: '/mfg/tax-configurations', name_ko: '세금설정', name_en: 'Tax Configurations', icon: 'percent', order: 18 },
  { route: '/mfg/period-locks', name_ko: '기간잠금', name_en: 'Period Locks', icon: 'lock_clock', order: 19 },
  { route: '/mfg/auto-journals', name_ko: '자동전표', name_en: 'Auto Journals', icon: 'sync_alt', order: 20 },
  { route: '/mfg/budgets', name_ko: '예산', name_en: 'Budgets', icon: 'savings', order: 21 },
  { route: '/mfg/kpi', name_ko: 'KPI', name_en: 'KPI', icon: 'analytics', order: 22 },
  { route: '/mfg/report-snapshots', name_ko: '리포트스냅샷', name_en: 'Report Snapshots', icon: 'photo_camera', order: 23 },
];

const HQ_CHILDREN = [
  { route: '/hq/dashboard', name_ko: '본사 대시보드', name_en: 'HQ Dashboard', icon: 'dashboard', order: 1 },
  { route: '/hq/approvals', name_ko: '본사 승인', name_en: 'HQ Approvals', icon: 'fact_check', order: 2 },
  { route: '/hq/reports', name_ko: '본사 리포트', name_en: 'HQ Reports', icon: 'assessment', order: 3 },
  { route: '/hq/compliance', name_ko: '컴플라이언스', name_en: 'Compliance', icon: 'gavel', order: 4 },
  { route: '/hq/fx-rates', name_ko: '환율', name_en: 'FX Rates', icon: 'currency_exchange', order: 5 },
  { route: '/hq/access-logs', name_ko: '접근 로그', name_en: 'Access Logs', icon: 'history', order: 6 },
  { route: '/hq/users', name_ko: '본사 사용자', name_en: 'HQ Users', icon: 'manage_accounts', order: 8 },
];

const ROOTS = [
  { route: '/purchase', name_ko: '구매관리', name_en: 'Purchase Management', icon: 'shopping_cart', order: 7, children: PURCHASE_CHILDREN },
  { route: '/mfg', name_ko: '제조관리', name_en: 'Manufacturing Management', icon: 'precision_manufacturing', order: 8, children: MFG_CHILDREN },
  { route: '/hq', name_ko: '본사 포털', name_en: 'HQ Portal', icon: 'corporate_fare', order: 10, children: HQ_CHILDREN },
];

async function ensureRoot(sequelize, tenantId, root) {
  const [existing] = await sequelize.query(
    `SELECT id FROM menus WHERE tenant_id = $1 AND route = $2 LIMIT 1`,
    { bind: [tenantId, root.route] }
  );
  if (existing.length) {
    await sequelize.query(
      `UPDATE menus
       SET name_ko = $2, name_en = $3, icon = $4, "order" = $5, level = 0, parent_id = NULL,
           is_active = true, updated_at = NOW()
       WHERE id = $1`,
      { bind: [existing[0].id, root.name_ko, root.name_en, root.icon, root.order] }
    );
    return existing[0].id;
  }
  const [inserted] = await sequelize.query(
    `INSERT INTO menus
      (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at)
     VALUES ($1, NULL, $2, $3, $4, $5, $6, 0, true, $7, NOW(), NOW())
     RETURNING id`,
    { bind: [tenantId, root.name_ko, root.name_en, root.route, root.icon, root.order, root.name_en] }
  );
  return inserted[0].id;
}

async function ensureChild(sequelize, tenantId, parentId, child) {
  const [existing] = await sequelize.query(
    `SELECT id FROM menus WHERE tenant_id = $1 AND route = $2 LIMIT 1`,
    { bind: [tenantId, child.route] }
  );
  if (existing.length) {
    await sequelize.query(
      `UPDATE menus
       SET parent_id = $2, name_ko = $3, name_en = $4, icon = $5, "order" = $6,
           level = 1, is_active = true, updated_at = NOW()
       WHERE id = $1`,
      {
        bind: [existing[0].id, parentId, child.name_ko, child.name_en, child.icon, child.order],
      }
    );
    return existing[0].id;
  }
  const [inserted] = await sequelize.query(
    `INSERT INTO menus
      (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 1, true, $8, NOW(), NOW())
     RETURNING id`,
    {
      bind: [
        tenantId,
        parentId,
        child.name_ko,
        child.name_en,
        child.route,
        child.icon,
        child.order,
        child.name_en,
      ],
    }
  );
  return inserted[0].id;
}

async function grantToPrivileged(sequelize, tenantId, menuId) {
  await sequelize.query(
    `INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
     SELECT u.id, $1, true, true, true, true, NOW(), NOW()
     FROM users u
     WHERE u.tenant_id = $2 AND u.role IN ('root', 'admin') AND u.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM user_permissions p WHERE p.user_id = u.id AND p.menu_id = $1
       )`,
    { bind: [menuId, tenantId] }
  );
}

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const [tenants] = await sequelize.query(`SELECT id FROM tenants ORDER BY id`);
    if (!tenants.length) {
      const [fromMenus] = await sequelize.query(
        `SELECT DISTINCT tenant_id AS id FROM menus ORDER BY tenant_id`
      );
      tenants.push(...fromMenus);
    }

    for (const t of tenants) {
      const tenantId = t.id;
      for (const root of ROOTS) {
        const parentId = await ensureRoot(sequelize, tenantId, root);
        await grantToPrivileged(sequelize, tenantId, parentId);
        for (const child of root.children) {
          const childId = await ensureChild(sequelize, tenantId, parentId, child);
          await grantToPrivileged(sequelize, tenantId, childId);
        }
      }

      // keep privacy deactivated if present
      await sequelize.query(
        `UPDATE menus SET is_active = false, updated_at = NOW()
         WHERE tenant_id = $1 AND route = '/hq/privacy'`,
        { bind: [tenantId] }
      );
      await sequelize.query(
        `UPDATE menus SET is_active = false, updated_at = NOW()
         WHERE tenant_id = $1 AND route = '/mfg/gst-registers'`,
        { bind: [tenantId] }
      );
    }
  },

  async down() {
    // no-op: menus are soft-managed
  },
};
