'use strict';

/**
 * 매입/매출 — 전자세금계산서(e-invoice) 메뉴 비활성
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menus
      SET is_active = false,
          updated_at = NOW()
      WHERE route = '/accounting/e-invoice'
         OR route LIKE '/accounting/e-invoice/%'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menus
      SET is_active = true,
          updated_at = NOW()
      WHERE route = '/accounting/e-invoice'
         OR route LIKE '/accounting/e-invoice/%'
    `);
  },
};
