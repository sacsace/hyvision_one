'use strict';

/** Korea HQ Portal — user HQ fields, FX, approvals, compliance, menus */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    const tables = await queryInterface.showAllTables();
    const tableNames = (tables || []).map((x) => (typeof x === 'string' ? x : x.tableName || x.name || x));
    const hasTable = (name) => tableNames.includes(name);

    const ts = {
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    };

    const tenantCompanyRefs = {
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    };

    const userRefNullable = {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    };

    // ── users HQ columns ──
    const usersTable = await queryInterface.describeTable('users');
    const addUserCol = async (name, def) => {
      if (!usersTable[name]) await queryInterface.addColumn('users', name, def);
    };
    await addUserCol('hq_role', { type: Sequelize.STRING(40), allowNull: true });
    await addUserCol('hq_access_level', {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: 'kpi_only',
    });
    await addUserCol('hq_can_approve', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await addUserCol('hq_can_view_cost', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await addUserCol('hq_can_view_hr_pii', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await addUserCol('hq_can_view_bank_detail', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await addUserCol('hq_can_view_tax', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await addUserCol('hq_home_timezone', {
      type: Sequelize.STRING(64),
      allowNull: false,
      defaultValue: 'Asia/Seoul',
    });

    // companies.timezone / company_timezone — skip if either exists
    if (hasTable('companies')) {
      const companiesTable = await queryInterface.describeTable('companies');
      if (!companiesTable.timezone && !companiesTable.company_timezone) {
        await queryInterface.addColumn('companies', 'timezone', {
          type: Sequelize.STRING(64),
          allowNull: false,
          defaultValue: 'Asia/Kolkata',
        });
      }
    }

    // ── hq_fx_rates ──
    if (!hasTable('hq_fx_rates')) {
      await queryInterface.createTable('hq_fx_rates', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'tenants', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        rate_date: { type: Sequelize.DATEONLY, allowNull: false },
        from_currency: { type: Sequelize.CHAR(3), allowNull: false },
        to_currency: { type: Sequelize.CHAR(3), allowNull: false },
        rate: { type: Sequelize.DECIMAL(18, 8), allowNull: false },
        source: { type: Sequelize.STRING(80), allowNull: true },
        created_by: userRefNullable,
        ...ts,
      });
      await queryInterface.addIndex('hq_fx_rates', ['tenant_id', 'rate_date', 'from_currency', 'to_currency'], {
        unique: true,
        name: 'hq_fx_rates_tenant_date_pair_uq',
      });
    }

    // ── hq_approval_policies ──
    if (!hasTable('hq_approval_policies')) {
      await queryInterface.createTable('hq_approval_policies', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        event_type: { type: Sequelize.STRING(60), allowNull: false },
        threshold_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        require_hq_approve: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_by: userRefNullable,
        updated_by: userRefNullable,
        ...ts,
      });
      await queryInterface.addIndex('hq_approval_policies', ['tenant_id', 'company_id', 'event_type'], {
        name: 'hq_approval_policies_tenant_co_event_idx',
      });
    }

    // ── hq_approval_requests ──
    if (!hasTable('hq_approval_requests')) {
      await queryInterface.createTable('hq_approval_requests', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        policy_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'hq_approval_policies', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        event_type: { type: Sequelize.STRING(60), allowNull: false },
        doc_type: { type: Sequelize.STRING(60), allowNull: false },
        doc_id: { type: Sequelize.INTEGER, allowNull: false },
        doc_no: { type: Sequelize.STRING(80), allowNull: true },
        partner_name: { type: Sequelize.STRING(200), allowNull: true },
        amount: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
        currency_code: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'INR' },
        amount_inr: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
        amount_krw: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
        amount_usd: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
        fx_rate_date: { type: Sequelize.DATEONLY, allowNull: true },
        requester_id: userRefNullable,
        request_reason: { type: Sequelize.TEXT, allowNull: true },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
        hq_approver_id: userRefNullable,
        decided_at: { type: Sequelize.DATE, allowNull: true },
        decision_reason: { type: Sequelize.TEXT, allowNull: true },
        attachment_urls: { type: Sequelize.JSONB, allowNull: true },
        deep_link: { type: Sequelize.STRING(300), allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex('hq_approval_requests', ['status'], { name: 'hq_approval_requests_status_idx' });
      await queryInterface.addIndex('hq_approval_requests', ['company_id'], {
        name: 'hq_approval_requests_company_idx',
      });
      await queryInterface.addIndex('hq_approval_requests', ['tenant_id', 'doc_type', 'doc_id', 'status'], {
        name: 'hq_approval_requests_doc_status_idx',
      });
    }

    // ── hq_export_logs ──
    if (!hasTable('hq_export_logs')) {
      await queryInterface.createTable('hq_export_logs', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        export_type: { type: Sequelize.STRING(60), allowNull: false },
        report_key: { type: Sequelize.STRING(80), allowNull: true },
        row_count: { type: Sequelize.INTEGER, allowNull: true },
        format: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'excel' },
        ip_address: { type: Sequelize.STRING(45), allowNull: true },
        user_agent: { type: Sequelize.STRING(500), allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
    }

    // ── hq_access_logs ──
    if (!hasTable('hq_access_logs')) {
      await queryInterface.createTable('hq_access_logs', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        action: { type: Sequelize.STRING(30), allowNull: false },
        resource: { type: Sequelize.STRING(80), allowNull: true },
        resource_id: { type: Sequelize.STRING(80), allowNull: true },
        ip_address: { type: Sequelize.STRING(45), allowNull: true },
        country_code: { type: Sequelize.CHAR(2), allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
    }

    // ── hq_compliance_items ──
    if (!hasTable('hq_compliance_items')) {
      await queryInterface.createTable('hq_compliance_items', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        item_type: { type: Sequelize.STRING(30), allowNull: false },
        title: { type: Sequelize.STRING(200), allowNull: false },
        due_date: { type: Sequelize.DATEONLY, allowNull: true },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
        notes: { type: Sequelize.TEXT, allowNull: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
    }

    // ── hq_privacy_settings (singleton per tenant) ──
    if (!hasTable('hq_privacy_settings')) {
      await queryInterface.createTable('hq_privacy_settings', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'tenants', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        purpose: { type: Sequelize.TEXT, allowNull: true },
        retention_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 365 },
        cross_border_allowed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        legal_basis: { type: Sequelize.TEXT, allowNull: true },
        contact_email: { type: Sequelize.STRING(255), allowNull: true },
        meta: { type: Sequelize.JSONB, allowNull: true },
        ...ts,
      });
    }

    // ── hq_report_jobs ──
    if (!hasTable('hq_report_jobs')) {
      await queryInterface.createTable('hq_report_jobs', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        report_key: { type: Sequelize.STRING(80), allowNull: false },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'queued' },
        format: { type: Sequelize.STRING(10), allowNull: true },
        params: { type: Sequelize.JSONB, allowNull: true },
        result_snapshot_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_hq_report_snapshots', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        error_message: { type: Sequelize.TEXT, allowNull: true },
        created_by: userRefNullable,
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        finished_at: { type: Sequelize.DATE, allowNull: true },
      });
    }

    // ── Seed default approval policies for all companies ──
    const policyDefaults = [
      { event_type: 'po_amount', threshold_amount: 500000 },
      { event_type: 'new_supplier', threshold_amount: null },
      { event_type: 'budget_overrun', threshold_amount: 100000 },
      { event_type: 'special_discount', threshold_amount: 50000 },
      { event_type: 'credit_limit', threshold_amount: 1000000 },
      { event_type: 'stock_adjust', threshold_amount: 100000 },
      { event_type: 'stock_scrap', threshold_amount: 50000 },
      { event_type: 'bom_change', threshold_amount: null },
      { event_type: 'std_cost_change', threshold_amount: null },
      { event_type: 'high_loss', threshold_amount: 100000 },
      { event_type: 'gl_voucher', threshold_amount: 500000 },
      { event_type: 'high_payment', threshold_amount: 500000 },
      { event_type: 'high_credit_note', threshold_amount: 200000 },
      { event_type: 'period_reopen', threshold_amount: null },
    ];

    const [companies] = await sequelize.query(`SELECT id, tenant_id FROM companies ORDER BY id ASC`);
    for (const co of companies || []) {
      for (const p of policyDefaults) {
        await sequelize.query(
          `INSERT INTO hq_approval_policies
            (tenant_id, company_id, event_type, threshold_amount, is_active, require_hq_approve, created_at, updated_at)
           SELECT $1::integer, $2::integer, $3::varchar, $4::numeric, true, true, NOW(), NOW()
           WHERE NOT EXISTS (
             SELECT 1 FROM hq_approval_policies
             WHERE tenant_id = $1::integer AND company_id = $2::integer AND event_type = $3::varchar
           )`,
          { bind: [co.tenant_id, co.id, p.event_type, p.threshold_amount] }
        );
      }
    }

    // ── Seed FX rates (placeholder — manual_seed) ──
    const today = new Date().toISOString().slice(0, 10);
    const [tenants] = await sequelize.query(`SELECT id FROM tenants ORDER BY id ASC`);
    for (const t of tenants || []) {
      const fxPairs = [
        { from: 'INR', to: 'KRW', rate: 16.5 },
        { from: 'INR', to: 'USD', rate: 0.012 },
      ];
      for (const fx of fxPairs) {
        await sequelize.query(
          `INSERT INTO hq_fx_rates
            (tenant_id, rate_date, from_currency, to_currency, rate, source, created_at, updated_at)
           SELECT $1::integer, $2::date, $3::varchar, $4::varchar, $5::numeric, 'manual_seed', NOW(), NOW()
           WHERE NOT EXISTS (
             SELECT 1 FROM hq_fx_rates
             WHERE tenant_id = $1::integer AND rate_date = $2::date AND from_currency = $3::varchar AND to_currency = $4::varchar
           )`,
          { bind: [t.id, today, fx.from, fx.to, fx.rate] }
        );
      }
    }

    // ── HQ sub-menus under /hq ──
    const [tenantRows] = await sequelize.query(`SELECT id FROM tenants ORDER BY id ASC`);
    const hqSubMenus = [
      { route: '/hq/approvals', name_ko: '본사 승인', name_en: 'HQ Approvals', icon: 'fact_check', order: 2 },
      { route: '/hq/reports', name_ko: '본사 리포트', name_en: 'HQ Reports', icon: 'assessment', order: 3 },
      { route: '/hq/compliance', name_ko: '컴플라이언스', name_en: 'Compliance', icon: 'gavel', order: 4 },
      { route: '/hq/fx-rates', name_ko: '환율', name_en: 'FX Rates', icon: 'currency_exchange', order: 5 },
      { route: '/hq/access-logs', name_ko: '접근 로그', name_en: 'Access Logs', icon: 'history', order: 6 },
      { route: '/hq/privacy', name_ko: '개인정보 설정', name_en: 'Privacy Settings', icon: 'privacy_tip', order: 7 },
      { route: '/hq/users', name_ko: '본사 사용자', name_en: 'HQ Users', icon: 'manage_accounts', order: 8 },
    ];

    for (const tenant of tenantRows || []) {
      const tenantId = tenant.id;
      const [hqExists] = await sequelize.query(
        `SELECT id FROM menus WHERE tenant_id = $1 AND route = '/hq' LIMIT 1`,
        { bind: [tenantId] }
      );
      let hqParentId = hqExists[0]?.id;
      if (!hqParentId) {
        const [maxTop] = await sequelize.query(
          `SELECT COALESCE(MAX("order"), 0) + 1 AS next_order FROM menus WHERE tenant_id = $1 AND parent_id IS NULL`,
          { bind: [tenantId] }
        );
        const [inserted] = await sequelize.query(
          `INSERT INTO menus
            (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at)
           VALUES ($1, NULL, '본사 포털', 'HQ Portal', '/hq', 'corporate_fare', $2, 0, true, 'Headquarters portal', NOW(), NOW())
           RETURNING id`,
          { bind: [tenantId, maxTop[0]?.next_order ?? 60] }
        );
        hqParentId = inserted[0].id;
      }

      for (const m of hqSubMenus) {
        const [exists] = await sequelize.query(
          `SELECT id FROM menus WHERE tenant_id = $1 AND route = $2 LIMIT 1`,
          { bind: [tenantId, m.route] }
        );
        if (exists.length > 0) continue;

        await sequelize.query(
          `INSERT INTO menus
            (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at)
           VALUES ($1::integer, $2::integer, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::integer, 1, true, $8::text, NOW(), NOW())`,
          { bind: [tenantId, hqParentId, m.name_ko, m.name_en, m.route, m.icon, m.order, m.name_en] }
        );

        const [menuRow] = await sequelize.query(
          `SELECT id FROM menus WHERE tenant_id = $1 AND route = $2 LIMIT 1`,
          { bind: [tenantId, m.route] }
        );
        const menuId = menuRow[0]?.id;
        if (!menuId) continue;

        await sequelize.query(
          `INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
           SELECT up.user_id, $1, up.can_view, up.can_create, up.can_edit, up.can_delete, NOW(), NOW()
           FROM user_permissions up
           WHERE up.menu_id = $2
           AND NOT EXISTS (SELECT 1 FROM user_permissions p WHERE p.user_id = up.user_id AND p.menu_id = $1)`,
          { bind: [menuId, hqParentId] }
        );
      }
    }
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    const hqRoutes = [
      '/hq/approvals',
      '/hq/reports',
      '/hq/compliance',
      '/hq/fx-rates',
      '/hq/access-logs',
      '/hq/privacy',
      '/hq/users',
    ];

    await sequelize.query(`
      DELETE FROM user_permissions WHERE menu_id IN (
        SELECT id FROM menus WHERE route IN (${hqRoutes.map((r) => `'${r}'`).join(',')})
      )
    `);
    await sequelize.query(`
      DELETE FROM menus WHERE route IN (${hqRoutes.map((r) => `'${r}'`).join(',')})
    `);

    const dropIfExists = async (name) => {
      const tables = await queryInterface.showAllTables();
      const tableNames = (tables || []).map((x) => (typeof x === 'string' ? x : x.tableName || x.name || x));
      if (tableNames.includes(name)) await queryInterface.dropTable(name);
    };

    await dropIfExists('hq_report_jobs');
    await dropIfExists('hq_privacy_settings');
    await dropIfExists('hq_compliance_items');
    await dropIfExists('hq_access_logs');
    await dropIfExists('hq_export_logs');
    await dropIfExists('hq_approval_requests');
    await dropIfExists('hq_approval_policies');
    await dropIfExists('hq_fx_rates');

    const usersTable = await queryInterface.describeTable('users');
    const removeUserCol = async (name) => {
      if (usersTable[name]) await queryInterface.removeColumn('users', name);
    };
    await removeUserCol('hq_role');
    await removeUserCol('hq_access_level');
    await removeUserCol('hq_can_approve');
    await removeUserCol('hq_can_view_cost');
    await removeUserCol('hq_can_view_hr_pii');
    await removeUserCol('hq_can_view_bank_detail');
    await removeUserCol('hq_can_view_tax');
    await removeUserCol('hq_home_timezone');
  },
};
