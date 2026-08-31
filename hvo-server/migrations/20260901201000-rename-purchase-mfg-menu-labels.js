'use strict';

/**
 * 루트 메뉴명: 구매 → 구매관리, 제조 → 제조관리
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menus
      SET name_ko = '구매관리',
          name_en = 'Purchase Management',
          description = 'Purchase management',
          updated_at = NOW()
      WHERE route = '/purchase'
        AND (parent_id IS NULL OR level = 0)
    `);

    await queryInterface.sequelize.query(`
      UPDATE menus
      SET name_ko = '제조관리',
          name_en = 'Manufacturing Management',
          description = 'Manufacturing management',
          updated_at = NOW()
      WHERE route = '/mfg'
        AND (parent_id IS NULL OR level = 0)
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menus
      SET name_ko = '구매',
          name_en = 'Purchase',
          description = 'Purchase requisition to GRN',
          updated_at = NOW()
      WHERE route = '/purchase'
        AND (parent_id IS NULL OR level = 0)
    `);

    await queryInterface.sequelize.query(`
      UPDATE menus
      SET name_ko = '제조',
          name_en = 'Manufacturing',
          description = 'Manufacturing, sales & plant control',
          updated_at = NOW()
      WHERE route = '/mfg'
        AND (parent_id IS NULL OR level = 0)
    `);
  },
};
