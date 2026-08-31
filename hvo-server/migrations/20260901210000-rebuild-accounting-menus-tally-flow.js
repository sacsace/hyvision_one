'use strict';

/**
 * 회계관리 메뉴를 Tally식 업무 흐름으로 재구성
 * Gateway: 전표입력 → 장부조회 → 계정마스터 → 재무제표 → 세무 → 외부데이터 임포트
 */
const ACCOUNTING_MENUS = [
  {
    route: '/accounting/voucher-entry',
    name_ko: '전표 입력',
    name_en: 'Voucher Entry',
    icon: 'edit_note',
    order: 1,
    description: 'Payment/Receipt/Journal/Sales/Purchase/Contra',
  },
  {
    route: '/accounting/books',
    name_ko: '회계장부',
    name_en: 'Books',
    icon: 'menu_book',
    order: 2,
    description: 'Day book, ledger, trial balance, accounts',
  },
  {
    route: '/accounting/chart-of-accounts',
    name_ko: '계정과목',
    name_en: 'Chart of Accounts',
    icon: 'account_tree',
    order: 3,
    description: 'Ledger masters',
  },
  {
    route: '/accounting/profit-and-loss',
    name_ko: '손익계산서',
    name_en: 'Profit & Loss',
    icon: 'trending_up',
    order: 4,
    description: 'P&L statement',
  },
  {
    route: '/accounting/balance-sheet',
    name_ko: '재무상태표',
    name_en: 'Balance Sheet',
    icon: 'account_balance',
    order: 5,
    description: 'Balance sheet',
  },
  {
    route: '/accounting/assets',
    name_ko: '자산관리',
    name_en: 'Fixed Assets',
    icon: 'business',
    order: 6,
    description: 'Fixed asset register',
  },
  {
    route: '/accounting/corporate-tax',
    name_ko: '법인세 계산',
    name_en: 'Corporate Tax',
    icon: 'calculate',
    order: 7,
    description: 'Corporate tax estimate',
  },
  {
    route: '/accounting/advance-tax',
    name_ko: 'Advance Tax',
    name_en: 'Advance Tax',
    icon: 'payments',
    order: 8,
    description: 'Advance tax schedule',
  },
  {
    route: '/accounting/tally-import',
    name_ko: 'Tally Data 불러오기',
    name_en: 'Tally Import',
    icon: 'upload_file',
    order: 9,
    description: 'Import Tally export',
  },
  {
    route: '/accounting/sap-import',
    name_ko: 'SAP Data 불러오기',
    name_en: 'SAP Import',
    icon: 'upload_file',
    order: 10,
    description: 'Import SAP spreadsheet',
  },
  {
    route: '/accounting/document-voucher',
    name_ko: '증빙 전표',
    name_en: 'Document Voucher',
    icon: 'receipt_long',
    order: 11,
    description: 'Create voucher from documents',
  },
  {
    route: '/accounting/gs-enc-cost',
    name_ko: 'GS E&C 원가분석',
    name_en: 'GS E&C Cost',
    icon: 'analytics',
    order: 12,
    description: 'GS E&C cost analysis',
  },
];

const DEACTIVATE = [
  '/accounting/voucher-list',
  '/accounting/settings/masters',
  '/accounting/budget',
  '/accounting/auto-voucher',
  '/accounting/vouchers',
  '/accounting/ledger',
  '/accounting/trial-balance',
  '/accounting/basic-info',
];

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;

    const [roots] = await sequelize.query(`
      SELECT id, tenant_id
      FROM menus
      WHERE route = '/accounting' AND (parent_id IS NULL OR level = 0)
    `);

    for (const root of roots) {
      const parentId = root.id;
      const tenantId = root.tenant_id;

      await sequelize.query(
        `UPDATE menus
         SET name_ko = '회계관리',
             name_en = 'Accounting',
             description = 'Accounting — vouchers, books, statements',
             updated_at = NOW()
         WHERE id = $1`,
        { bind: [parentId] }
      );

      for (const menu of ACCOUNTING_MENUS) {
        const [existing] = await sequelize.query(
          `SELECT id FROM menus WHERE tenant_id = $1 AND route = $2 LIMIT 1`,
          { bind: [tenantId, menu.route] }
        );

        if (existing.length) {
          await sequelize.query(
            `UPDATE menus
             SET parent_id = $1,
                 name_ko = $2,
                 name_en = $3,
                 icon = $4,
                 "order" = $5,
                 level = 1,
                 is_active = true,
                 description = $6,
                 updated_at = NOW()
             WHERE id = $7`,
            {
              bind: [
                parentId,
                menu.name_ko,
                menu.name_en,
                menu.icon,
                menu.order,
                menu.description,
                existing[0].id,
              ],
            }
          );
        } else {
          await sequelize.query(
            `INSERT INTO menus
              (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 1, true, $8, NOW(), NOW())`,
            {
              bind: [
                tenantId,
                parentId,
                menu.name_ko,
                menu.name_en,
                menu.route,
                menu.icon,
                menu.order,
                menu.description,
              ],
            }
          );
        }
      }

      await sequelize.query(
        `UPDATE menus
         SET is_active = false, updated_at = NOW()
         WHERE tenant_id = $1
           AND route = ANY($2::text[])`,
        { bind: [tenantId, DEACTIVATE] }
      );

      // 지출결의서·통계는 매입/매출(/sales) 하위 유지
      const [salesRoot] = await sequelize.query(
        `SELECT id FROM menus WHERE tenant_id = $1 AND route = '/sales' AND (parent_id IS NULL OR level = 0) LIMIT 1`,
        { bind: [tenantId] }
      );
      if (salesRoot[0]?.id) {
        await sequelize.query(
          `UPDATE menus
           SET parent_id = $1, level = 1, is_active = true, updated_at = NOW()
           WHERE tenant_id = $2 AND route IN ('/accounting/expense', '/accounting/statistics')`,
          { bind: [salesRoot[0].id, tenantId] }
        );
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menus
      SET is_active = false, updated_at = NOW()
      WHERE route IN (
        '/accounting/tally-import',
        '/accounting/sap-import',
        '/accounting/gs-enc-cost',
        '/accounting/balance-sheet'
      )
    `);
  },
};
