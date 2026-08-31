'use strict';

/**
 * 일반세금계산서 → 전자세금계산서 메뉴명 변경 (/accounting/invoice)
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menus
      SET name_ko = '전자세금계산서',
          name_en = 'E-Invoice',
          description = 'Tax invoice (e-invoice)',
          updated_at = NOW()
      WHERE route = '/accounting/invoice'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menus
      SET name_ko = '일반세금계산서',
          name_en = 'Invoice',
          description = 'Regular tax invoice',
          updated_at = NOW()
      WHERE route = '/accounting/invoice'
    `);
  },
};
