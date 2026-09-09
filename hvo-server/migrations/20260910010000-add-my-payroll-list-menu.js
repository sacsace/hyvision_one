'use strict';

/**
 * 「내 정보·업무」에 /my/payroll-list 메뉴 추가
 * - 급여 명세서(5)와 계약서 사이에 배치 (order 6)
 * - 이후 메뉴 order 재정렬
 * - 기존 셀프서비스 메뉴 권한 보유자에게 보기 권한 부여
 */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const [tenants] = await sequelize.query(`SELECT id FROM tenants`);

    for (const t of tenants || []) {
      const tenantId = Number(t.id);
      const [myParents] = await sequelize.query(
        `SELECT id FROM menus
         WHERE tenant_id = $1 AND route = '/my' AND parent_id IS NULL AND is_active = true
         ORDER BY id ASC LIMIT 1`,
        { bind: [tenantId] }
      );
      if (!myParents.length) continue;
      const myParentId = Number(myParents[0].id);

      // 기존 하위 메뉴 order 재배치 (payroll-list 삽입 공간)
      const orderUpdates = [
        ['/my/contracts', 7],
        ['/my/notices', 8],
        ['/my/work-list', 9],
        ['/my/company-policies', 10],
        ['/my/mail-settings', 11],
      ];
      for (const [route, order] of orderUpdates) {
        await sequelize.query(
          `UPDATE menus
           SET "order" = $1, updated_at = NOW()
           WHERE tenant_id = $2 AND route = $3 AND is_active = true`,
          { bind: [order, tenantId, route] }
        );
      }

      const [existing] = await sequelize.query(
        `SELECT id FROM menus WHERE tenant_id = $1 AND route = '/my/payroll-list' LIMIT 1`,
        { bind: [tenantId] }
      );

      let menuId;
      if (existing.length) {
        menuId = Number(existing[0].id);
        await sequelize.query(
          `UPDATE menus
           SET name_ko = '내 급여 목록', name_en = 'My Payroll', icon = 'receipt_long',
               parent_id = $1, level = 1, "order" = 6, is_active = true,
               description = '내 급여 목록', updated_at = NOW()
           WHERE id = $2`,
          { bind: [myParentId, menuId] }
        );
      } else {
        const [ins] = await sequelize.query(
          `INSERT INTO menus
            (tenant_id, parent_id, level, name_ko, name_en, route, icon, "order", is_active, description, created_at, updated_at)
           VALUES ($1,$2,1,'내 급여 목록','My Payroll','/my/payroll-list','receipt_long',6,true,'내 급여 목록',NOW(),NOW())
           RETURNING id`,
          { bind: [tenantId, myParentId] }
        );
        menuId = Number(ins[0].id);
      }

      await sequelize.query(
        `INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
         SELECT DISTINCT up.user_id, $1::integer, true, false, false, false, NOW(), NOW()
         FROM user_permissions up
         JOIN menus m ON m.id = up.menu_id
         JOIN users u ON u.id = up.user_id
         WHERE u.tenant_id = $2::integer
           AND m.route IN (
             '/my', '/dashboard', '/my/personal-info', '/my/attendance', '/my/leave',
             '/my/payslips', '/my/contracts', '/my/notices', '/my/work-list',
             '/my/company-policies', '/my/mail-settings'
           )
           AND up.can_view = true
           AND NOT EXISTS (
             SELECT 1 FROM user_permissions x WHERE x.user_id = up.user_id AND x.menu_id = $1::integer
           )`,
        { bind: [menuId, tenantId] }
      );
    }
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    await sequelize.query(`
      UPDATE menus SET is_active = false, updated_at = NOW()
      WHERE route = '/my/payroll-list'
    `);
    await sequelize.query(`
      UPDATE menus SET "order" = 6, updated_at = NOW()
      WHERE route = '/my/contracts' AND is_active = true
    `);
    await sequelize.query(`
      UPDATE menus SET "order" = 7, updated_at = NOW()
      WHERE route = '/my/notices' AND is_active = true
    `);
    await sequelize.query(`
      UPDATE menus SET "order" = 8, updated_at = NOW()
      WHERE route = '/my/work-list' AND is_active = true
    `);
    await sequelize.query(`
      UPDATE menus SET "order" = 9, updated_at = NOW()
      WHERE route = '/my/company-policies' AND is_active = true
    `);
    await sequelize.query(`
      UPDATE menus SET "order" = 10, updated_at = NOW()
      WHERE route = '/my/mail-settings' AND is_active = true
    `);
  },
};
