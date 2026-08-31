'use strict';

/**
 * 고객사 리스트(/work/assignee-list) 메뉴 비활성 — 기능 미사용
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menus
      SET is_active = false,
          updated_at = NOW()
      WHERE route = '/work/assignee-list'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menus
      SET is_active = true,
          updated_at = NOW()
      WHERE route = '/work/assignee-list'
    `);
  }
};
