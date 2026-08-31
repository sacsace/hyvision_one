'use strict';

/**
 * 제조·구매 메뉴 분리
 * - /mfg → 제조 (생산·판매·마스터·세무)
 * - /purchase → 구매 (PR/PO/GRN/IQC)
 * 권한 유지를 위해 기존 메뉴 row의 route/parent만 갱신
 */
const ROOT_ORDER = [
  ['/my', 1],
  ['/basic-info', 2],
  ['/hr', 3],
  ['/work', 4],
  ['/sales', 5],
  ['/inventory', 6],
  ['/purchase', 7],
  ['/mfg', 8],
  ['/accounting', 9],
  ['/hq', 10],
  ['/hotel', 11],
  ['/communication', 12],
  ['/ai', 13],
  ['/reports', 98],
  ['/system', 99],
];

const PURCHASE_CHILDREN = [
  {
    from: '/mfg/purchase-requisitions',
    to: '/purchase/requisitions',
    name_ko: '구매요청',
    name_en: 'Purchase Requisitions',
    order: 1,
  },
  {
    from: '/mfg/purchase-orders',
    to: '/purchase/orders',
    name_ko: '구매발주',
    name_en: 'Purchase Orders',
    order: 2,
  },
  {
    from: '/mfg/goods-receipts',
    to: '/purchase/goods-receipts',
    name_ko: '입고(GRN)',
    name_en: 'Goods Receipts',
    order: 3,
  },
  {
    from: '/mfg/quality-inspections',
    to: '/purchase/quality-inspections',
    name_ko: '수입검사',
    name_en: 'Incoming QC',
    order: 4,
  },
];

const MFG_CHILD_ORDER = [
  ['/mfg/branches', 1],
  ['/mfg/warehouses', 2],
  ['/mfg/document-sequences', 3],
  ['/mfg/stock-ledger', 4],
  ['/mfg/audit-logs', 5],
  ['/mfg/sales-orders', 6],
  ['/mfg/delivery-challans', 7],
  ['/mfg/stock-reservations', 8],
  ['/mfg/credit-notes', 9],
  ['/mfg/boms', 10],
  ['/mfg/work-centers', 11],
  ['/mfg/routings', 12],
  ['/mfg/production-plans', 13],
  ['/mfg/work-orders', 14],
  ['/mfg/material-issues', 15],
  ['/mfg/production-entries', 16],
  ['/mfg/standard-costs', 17],
  ['/mfg/tax-configurations', 18],
  ['/mfg/period-locks', 19],
  ['/mfg/auto-journals', 20],
  ['/mfg/gst-registers', 21],
  ['/mfg/budgets', 22],
  ['/mfg/kpi', 23],
];

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;

    const [tenants] = await sequelize.query(`
      SELECT DISTINCT tenant_id
      FROM menus
      WHERE route = '/mfg' AND (parent_id IS NULL OR level = 0)
    `);

    for (const t of tenants) {
      const tenantId = t.tenant_id;

      await sequelize.query(
        `UPDATE menus
         SET name_ko = '제조관리',
             name_en = 'Manufacturing Management',
             description = 'Manufacturing management',
             icon = 'precision_manufacturing',
             updated_at = NOW()
         WHERE tenant_id = $1 AND route = '/mfg' AND (parent_id IS NULL OR level = 0)`,
        { bind: [tenantId] }
      );

      const [mfgRows] = await sequelize.query(
        `SELECT id, "order" FROM menus
         WHERE tenant_id = $1 AND route = '/mfg' AND (parent_id IS NULL OR level = 0)
         LIMIT 1`,
        { bind: [tenantId] }
      );
      if (!mfgRows.length) continue;
      const mfgOrder = Number(mfgRows[0].order || 8);

      let [purchaseRows] = await sequelize.query(
        `SELECT id FROM menus
         WHERE tenant_id = $1 AND route = '/purchase' AND (parent_id IS NULL OR level = 0)
         LIMIT 1`,
        { bind: [tenantId] }
      );

      let purchaseId = purchaseRows[0]?.id;
      if (!purchaseId) {
        const purchaseOrder = Math.max(1, mfgOrder);
        await sequelize.query(
          `UPDATE menus SET "order" = "order" + 1, updated_at = NOW()
           WHERE tenant_id = $1 AND (parent_id IS NULL OR level = 0) AND "order" >= $2`,
          { bind: [tenantId, purchaseOrder] }
        );

        const [inserted] = await sequelize.query(
          `INSERT INTO menus
            (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at)
           VALUES ($1, NULL, '구매관리', 'Purchase Management', '/purchase', 'shopping_cart', $2, 0, true, 'Purchase management', NOW(), NOW())
           RETURNING id`,
          { bind: [tenantId, purchaseOrder] }
        );
        purchaseId = inserted[0].id;
      } else {
        await sequelize.query(
          `UPDATE menus
           SET name_ko = '구매관리', name_en = 'Purchase Management', is_active = true,
               description = 'Purchase management', icon = 'shopping_cart', updated_at = NOW()
           WHERE id = $1`,
          { bind: [purchaseId] }
        );
      }

      for (const child of PURCHASE_CHILDREN) {
        const [existingNew] = await sequelize.query(
          `SELECT id FROM menus WHERE tenant_id = $1 AND route = $2 LIMIT 1`,
          { bind: [tenantId, child.to] }
        );
        const [existingOld] = await sequelize.query(
          `SELECT id FROM menus WHERE tenant_id = $1 AND route = $2 LIMIT 1`,
          { bind: [tenantId, child.from] }
        );

        if (existingOld.length && !existingNew.length) {
          await sequelize.query(
            `UPDATE menus
             SET route = $1,
                 parent_id = $2,
                 name_ko = $3,
                 name_en = $4,
                 "order" = $5,
                 level = 1,
                 is_active = true,
                 updated_at = NOW()
             WHERE id = $6`,
            {
              bind: [
                child.to,
                purchaseId,
                child.name_ko,
                child.name_en,
                child.order,
                existingOld[0].id,
              ],
            }
          );
        } else if (existingOld.length && existingNew.length) {
          await sequelize.query(
            `UPDATE menus SET is_active = false, updated_at = NOW() WHERE id = $1`,
            { bind: [existingOld[0].id] }
          );
          await sequelize.query(
            `UPDATE menus
             SET parent_id = $1, name_ko = $2, name_en = $3, "order" = $4, level = 1, is_active = true, updated_at = NOW()
             WHERE id = $5`,
            {
              bind: [purchaseId, child.name_ko, child.name_en, child.order, existingNew[0].id],
            }
          );
        } else if (!existingOld.length && !existingNew.length) {
          await sequelize.query(
            `INSERT INTO menus
              (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'shopping_cart', $6, 1, true, $7, NOW(), NOW())`,
            {
              bind: [
                tenantId,
                purchaseId,
                child.name_ko,
                child.name_en,
                child.to,
                child.order,
                child.name_en,
              ],
            }
          );
        } else if (existingNew.length) {
          await sequelize.query(
            `UPDATE menus
             SET parent_id = $1, name_ko = $2, name_en = $3, "order" = $4, level = 1, is_active = true, updated_at = NOW()
             WHERE id = $5`,
            {
              bind: [purchaseId, child.name_ko, child.name_en, child.order, existingNew[0].id],
            }
          );
        }
      }
    }

    for (const [route, order] of ROOT_ORDER) {
      await sequelize.query(
        `UPDATE menus SET "order" = $1, updated_at = NOW()
         WHERE route = $2 AND (parent_id IS NULL OR level = 0)`,
        { bind: [order, route] }
      );
    }

    for (const [route, order] of MFG_CHILD_ORDER) {
      await sequelize.query(
        `UPDATE menus SET "order" = $1, updated_at = NOW() WHERE route = $2`,
        { bind: [order, route] }
      );
    }
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const reverse = [
      ['/purchase/requisitions', '/mfg/purchase-requisitions', '구매요청', 'Purchase Requisitions', 4],
      ['/purchase/orders', '/mfg/purchase-orders', '구매발주', 'Purchase Orders', 5],
      ['/purchase/goods-receipts', '/mfg/goods-receipts', '입고(GRN)', 'Goods Receipts', 6],
      ['/purchase/quality-inspections', '/mfg/quality-inspections', '품질검사', 'Quality Inspections', 7],
    ];

    const [tenants] = await sequelize.query(`
      SELECT DISTINCT tenant_id FROM menus WHERE route IN ('/mfg', '/purchase')
    `);

    for (const t of tenants) {
      const tenantId = t.tenant_id;
      const [mfgRows] = await sequelize.query(
        `SELECT id FROM menus WHERE tenant_id = $1 AND route = '/mfg' AND (parent_id IS NULL OR level = 0) LIMIT 1`,
        { bind: [tenantId] }
      );
      const mfgId = mfgRows[0]?.id;
      if (!mfgId) continue;

      for (const [from, to, nameKo, nameEn, order] of reverse) {
        await sequelize.query(
          `UPDATE menus
           SET route = $1, parent_id = $2, name_ko = $3, name_en = $4, "order" = $5, level = 1, is_active = true, updated_at = NOW()
           WHERE tenant_id = $6 AND route = $7`,
          { bind: [to, mfgId, nameKo, nameEn, order, tenantId, from] }
        );
      }

      await sequelize.query(
        `UPDATE menus
         SET name_ko = '제조·구매', name_en = 'Manufacturing', description = 'Manufacturing & procurement', updated_at = NOW()
         WHERE id = $1`,
        { bind: [mfgId] }
      );

      await sequelize.query(
        `UPDATE menus SET is_active = false, updated_at = NOW()
         WHERE tenant_id = $1 AND route = '/purchase' AND (parent_id IS NULL OR level = 0)`,
        { bind: [tenantId] }
      );
    }
  },
};
