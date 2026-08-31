'use strict';

/**
 * 메뉴 정리:
 * - /mfg/hq-dashboard: /hq/dashboard 와 중복 → 비활성
 * - /mfg/report-snapshots: /hq/reports 와 중복 → 비활성
 * - /accounting/budget: 레거시(이미 제거 대상이었으나 활성 잔존) → 비활성
 * - /reports/* 자식: 부모가 비활성인데 자식만 활성 → 비활성
 * - 루트 순서: 제조·회계 다음에 본사 포털
 * - 제조 하위 순서 정리 + 예산/KPI 라벨 명확화
 */
const ROOT_ORDER = [
  ['/my', 1],
  ['/basic-info', 2],
  ['/hr', 3],
  ['/work', 4],
  ['/sales', 5],
  ['/inventory', 6],
  ['/mfg', 7],
  ['/accounting', 8],
  ['/hq', 9],
  ['/hotel', 10],
  ['/communication', 11],
  ['/ai', 12],
  ['/reports', 98],
  ['/system', 99],
];

const MFG_CHILD_ORDER = [
  ['/mfg/branches', 1],
  ['/mfg/warehouses', 2],
  ['/mfg/document-sequences', 3],
  ['/mfg/purchase-requisitions', 4],
  ['/mfg/purchase-orders', 5],
  ['/mfg/goods-receipts', 6],
  ['/mfg/quality-inspections', 7],
  ['/mfg/stock-ledger', 8],
  ['/mfg/audit-logs', 9],
  ['/mfg/sales-orders', 10],
  ['/mfg/delivery-challans', 11],
  ['/mfg/stock-reservations', 12],
  ['/mfg/credit-notes', 13],
  ['/mfg/boms', 14],
  ['/mfg/work-centers', 15],
  ['/mfg/routings', 16],
  ['/mfg/production-plans', 17],
  ['/mfg/work-orders', 18],
  ['/mfg/material-issues', 19],
  ['/mfg/production-entries', 20],
  ['/mfg/standard-costs', 21],
  ['/mfg/tax-configurations', 22],
  ['/mfg/period-locks', 23],
  ['/mfg/auto-journals', 24],
  ['/mfg/gst-registers', 25],
  ['/mfg/budgets', 26],
  ['/mfg/kpi', 27],
];

const HQ_CHILD_ORDER = [
  ['/hq/dashboard', 1],
  ['/hq/approvals', 2],
  ['/hq/reports', 3],
  ['/hq/compliance', 4],
  ['/hq/fx-rates', 5],
  ['/hq/access-logs', 6],
  ['/hq/privacy', 7],
  ['/hq/users', 8],
];

const DEACTIVATE_ROUTES = [
  '/mfg/hq-dashboard',
  '/mfg/report-snapshots',
  '/accounting/budget',
];

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;

    await sequelize.query(
      `UPDATE menus
       SET is_active = false, updated_at = NOW()
       WHERE route = ANY($1::text[])`,
      { bind: [DEACTIVATE_ROUTES] }
    );

    await sequelize.query(`
      UPDATE menus
      SET is_active = false, updated_at = NOW()
      WHERE route LIKE '/reports/%'
         OR route = '/reports'
    `);

    for (const [route, order] of ROOT_ORDER) {
      await sequelize.query(
        `UPDATE menus SET "order" = $1, updated_at = NOW() WHERE route = $2 AND (parent_id IS NULL OR level = 0)`,
        { bind: [order, route] }
      );
    }

    for (const [route, order] of MFG_CHILD_ORDER) {
      await sequelize.query(
        `UPDATE menus SET "order" = $1, updated_at = NOW() WHERE route = $2`,
        { bind: [order, route] }
      );
    }

    for (const [route, order] of HQ_CHILD_ORDER) {
      await sequelize.query(
        `UPDATE menus SET "order" = $1, updated_at = NOW() WHERE route = $2`,
        { bind: [order, route] }
      );
    }

    await sequelize.query(`
      UPDATE menus
      SET name_ko = '공장 예산',
          name_en = 'Plant Budgets',
          description = 'Plant budget lines',
          updated_at = NOW()
      WHERE route = '/mfg/budgets'
    `);

    await sequelize.query(`
      UPDATE menus
      SET name_ko = '일일 KPI',
          name_en = 'Daily KPI',
          description = 'Plant daily KPI',
          updated_at = NOW()
      WHERE route = '/mfg/kpi'
    `);
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;

    await sequelize.query(
      `UPDATE menus
       SET is_active = true, updated_at = NOW()
       WHERE route = ANY($1::text[])`,
      { bind: [DEACTIVATE_ROUTES] }
    );

    await sequelize.query(`
      UPDATE menus
      SET name_ko = '예산', name_en = 'Budgets', updated_at = NOW()
      WHERE route = '/mfg/budgets'
    `);
    await sequelize.query(`
      UPDATE menus
      SET name_ko = 'KPI', name_en = 'KPI', updated_at = NOW()
      WHERE route = '/mfg/kpi'
    `);
  },
};
