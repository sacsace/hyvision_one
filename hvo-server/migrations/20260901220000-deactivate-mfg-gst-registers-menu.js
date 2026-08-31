'use strict';

/**
 * 제조관리 GST 원장 메뉴 비활성
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menus
      SET is_active = false,
          updated_at = NOW()
      WHERE route = '/mfg/gst-registers'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menus
      SET is_active = true,
          updated_at = NOW()
      WHERE route = '/mfg/gst-registers'
    `);
  },
};
