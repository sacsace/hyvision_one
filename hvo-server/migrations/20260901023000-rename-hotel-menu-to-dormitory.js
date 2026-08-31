'use strict';

/**
 * 상위 메뉴 표시명: 호텔 / 호텔 관리 → 기숙사 관리
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menus
      SET name_ko = '기숙사 관리',
          name_en = 'Dormitory Management',
          description = CASE
            WHEN description IS NULL OR description = '' OR description ILIKE '%호텔%'
              THEN '기숙사 관리'
            ELSE description
          END,
          updated_at = NOW()
      WHERE route = '/hotel'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menus
      SET name_ko = '호텔 관리',
          name_en = 'Hotel Management',
          description = '호텔 관리',
          updated_at = NOW()
      WHERE route = '/hotel'
    `);
  }
};
