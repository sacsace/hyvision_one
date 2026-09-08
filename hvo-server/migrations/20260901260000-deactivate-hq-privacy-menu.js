'use strict';

/**
 * HQ 개인정보·국외접근 설정 메뉴 비활성화 (기능 제거)
 * DB 테이블 hq_privacy_settings 는 유지 (하드 삭제 금지 정책)
 */

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menus
      SET is_active = false, updated_at = NOW()
      WHERE route = '/hq/privacy'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE menus
      SET is_active = true, updated_at = NOW()
      WHERE route = '/hq/privacy'
    `);
  },
};
