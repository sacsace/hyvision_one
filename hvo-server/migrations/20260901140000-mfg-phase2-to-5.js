'use strict';

/** Manufacturing ERP Phase 2–5 — sales, production, tax/period locks, HQ KPI */
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

    // ── Phase 2: Sales orders ──
    if (!hasTable('mfg_sales_orders')) {
      await queryInterface.createTable('mfg_sales_orders', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        branch_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_branches', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        financial_year_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'ac_financial_years', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        doc_no: { type: Sequelize.STRING(60), allowNull: false },
        partner_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'partners', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'draft' },
        order_date: { type: Sequelize.DATEONLY, allowNull: true },
        currency_code: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'INR' },
        credit_limit_check: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        created_by: userRefNullable,
        updated_by: userRefNullable,
        approved_by: userRefNullable,
        approved_at: { type: Sequelize.DATE, allowNull: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
      await queryInterface.addIndex('mfg_sales_orders', ['tenant_id', 'company_id', 'doc_no'], {
        unique: true,
        name: 'mfg_so_tenant_company_doc_no_uq',
      });
    }

    if (!hasTable('mfg_sales_order_items')) {
      await queryInterface.createTable('mfg_sales_order_items', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        so_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_sales_orders', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        line_no: { type: Sequelize.INTEGER, allowNull: false },
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        item_name: { type: Sequelize.STRING(200), allowNull: false },
        uom: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'EA' },
        qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        delivered_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        reserved_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        unit_price: { type: Sequelize.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
        tax_rate: { type: Sequelize.DECIMAL(8, 3), allowNull: false, defaultValue: 0 },
        discount_pct: { type: Sequelize.DECIMAL(8, 3), allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex('mfg_sales_order_items', ['so_id', 'line_no'], {
        unique: true,
        name: 'mfg_so_items_so_line_uq',
      });
    }

    if (!hasTable('mfg_stock_reservations')) {
      await queryInterface.createTable('mfg_stock_reservations', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        warehouse_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'inventory_locations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        so_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_sales_orders', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        so_item_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_sales_order_items', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'active' },
        created_by: userRefNullable,
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
    }

    if (!hasTable('mfg_delivery_challans')) {
      await queryInterface.createTable('mfg_delivery_challans', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        branch_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_branches', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        financial_year_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'ac_financial_years', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        doc_no: { type: Sequelize.STRING(60), allowNull: false },
        so_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_sales_orders', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        partner_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'partners', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        warehouse_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'inventory_locations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'draft' },
        challan_date: { type: Sequelize.DATEONLY, allowNull: true },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        created_by: userRefNullable,
        updated_by: userRefNullable,
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
      await queryInterface.addIndex('mfg_delivery_challans', ['tenant_id', 'company_id', 'doc_no'], {
        unique: true,
        name: 'mfg_dc_tenant_company_doc_no_uq',
      });
    }

    if (!hasTable('mfg_delivery_challan_items')) {
      await queryInterface.createTable('mfg_delivery_challan_items', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        challan_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_delivery_challans', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        so_item_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_sales_order_items', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        item_name: { type: Sequelize.STRING(200), allowNull: false },
        uom: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'EA' },
        qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        batch_no: { type: Sequelize.STRING(50), allowNull: true },
        ...ts,
      });
    }

    if (!hasTable('mfg_credit_notes')) {
      await queryInterface.createTable('mfg_credit_notes', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        doc_no: { type: Sequelize.STRING(60), allowNull: false },
        partner_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'partners', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        invoice_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'invoices', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        so_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_sales_orders', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'draft' },
        note_date: { type: Sequelize.DATEONLY, allowNull: true },
        amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        tax_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        created_by: userRefNullable,
        updated_by: userRefNullable,
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
      await queryInterface.addIndex('mfg_credit_notes', ['tenant_id', 'company_id', 'doc_no'], {
        unique: true,
        name: 'mfg_cn_tenant_company_doc_no_uq',
      });
    }

    // ── Phase 3: Production ──
    if (!hasTable('mfg_work_centers')) {
      await queryInterface.createTable('mfg_work_centers', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        code: { type: Sequelize.STRING(30), allowNull: false },
        name: { type: Sequelize.STRING(200), allowNull: false },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_by: userRefNullable,
        updated_by: userRefNullable,
        ...ts,
      });
      await queryInterface.addIndex('mfg_work_centers', ['tenant_id', 'company_id', 'code'], {
        unique: true,
        name: 'mfg_wc_tenant_company_code_uq',
      });
    }

    if (!hasTable('mfg_boms')) {
      await queryInterface.createTable('mfg_boms', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        code: { type: Sequelize.STRING(30), allowNull: false },
        name: { type: Sequelize.STRING(200), allowNull: false },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'draft' },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_by: userRefNullable,
        updated_by: userRefNullable,
        ...ts,
      });
      await queryInterface.addIndex('mfg_boms', ['tenant_id', 'company_id', 'code'], {
        unique: true,
        name: 'mfg_bom_tenant_company_code_uq',
      });
    }

    if (!hasTable('mfg_bom_versions')) {
      await queryInterface.createTable('mfg_bom_versions', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        bom_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_boms', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        version_no: { type: Sequelize.INTEGER, allowNull: false },
        effective_from: { type: Sequelize.DATEONLY, allowNull: true },
        effective_to: { type: Sequelize.DATEONLY, allowNull: true },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'draft' },
        yield_pct: { type: Sequelize.DECIMAL(8, 3), allowNull: false, defaultValue: 100 },
        scrap_pct: { type: Sequelize.DECIMAL(8, 3), allowNull: false, defaultValue: 0 },
        approved_by: userRefNullable,
        approved_at: { type: Sequelize.DATE, allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex('mfg_bom_versions', ['bom_id', 'version_no'], {
        unique: true,
        name: 'mfg_bom_ver_bom_version_uq',
      });
    }

    if (!hasTable('mfg_bom_items')) {
      await queryInterface.createTable('mfg_bom_items', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        bom_version_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_bom_versions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        line_no: { type: Sequelize.INTEGER, allowNull: false },
        component_product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        qty: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
        uom: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'EA' },
        scrap_pct: { type: Sequelize.DECIMAL(8, 3), allowNull: false, defaultValue: 0 },
        is_alternate: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        operation_seq: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 10 },
        ...ts,
      });
      await queryInterface.addIndex('mfg_bom_items', ['bom_version_id', 'line_no'], {
        unique: true,
        name: 'mfg_bom_items_ver_line_uq',
      });
    }

    if (!hasTable('mfg_routings')) {
      await queryInterface.createTable('mfg_routings', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        code: { type: Sequelize.STRING(30), allowNull: false },
        name: { type: Sequelize.STRING(200), allowNull: false },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
      await queryInterface.addIndex('mfg_routings', ['tenant_id', 'company_id', 'code'], {
        unique: true,
        name: 'mfg_routing_tenant_company_code_uq',
      });
    }

    if (!hasTable('mfg_routing_operations')) {
      await queryInterface.createTable('mfg_routing_operations', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        routing_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_routings', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        seq: { type: Sequelize.INTEGER, allowNull: false },
        work_center_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_work_centers', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        name: { type: Sequelize.STRING(200), allowNull: false },
        setup_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        run_minutes_per_unit: { type: Sequelize.DECIMAL(10, 3), allowNull: false, defaultValue: 0 },
        machine_minutes_per_unit: { type: Sequelize.DECIMAL(10, 3), allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex('mfg_routing_operations', ['routing_id', 'seq'], {
        unique: true,
        name: 'mfg_routing_ops_routing_seq_uq',
      });
    }

    if (!hasTable('mfg_production_plans')) {
      await queryInterface.createTable('mfg_production_plans', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        plan_code: { type: Sequelize.STRING(60), allowNull: false },
        plan_date: { type: Sequelize.DATEONLY, allowNull: true },
        horizon: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'month' },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'draft' },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        created_by: userRefNullable,
        ...ts,
      });
    }

    if (!hasTable('mfg_material_requirements')) {
      await queryInterface.createTable('mfg_material_requirements', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        plan_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_production_plans', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        required_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        available_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        shortage_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        suggested_pr: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        ...ts,
      });
    }

    if (!hasTable('mfg_work_orders')) {
      await queryInterface.createTable('mfg_work_orders', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        branch_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_branches', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        financial_year_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'ac_financial_years', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        doc_no: { type: Sequelize.STRING(60), allowNull: false },
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        bom_version_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_bom_versions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        routing_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_routings', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        plan_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        completed_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        scrap_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'draft' },
        planned_start: { type: Sequelize.DATEONLY, allowNull: true },
        planned_end: { type: Sequelize.DATEONLY, allowNull: true },
        warehouse_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'inventory_locations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        created_by: userRefNullable,
        updated_by: userRefNullable,
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
      await queryInterface.addIndex('mfg_work_orders', ['tenant_id', 'company_id', 'doc_no'], {
        unique: true,
        name: 'mfg_wo_tenant_company_doc_no_uq',
      });
    }

    if (!hasTable('mfg_material_issues')) {
      await queryInterface.createTable('mfg_material_issues', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        doc_no: { type: Sequelize.STRING(60), allowNull: false },
        work_order_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_work_orders', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        warehouse_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'inventory_locations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'draft' },
        issue_date: { type: Sequelize.DATEONLY, allowNull: true },
        created_by: userRefNullable,
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
      await queryInterface.addIndex('mfg_material_issues', ['tenant_id', 'company_id', 'doc_no'], {
        unique: true,
        name: 'mfg_mi_tenant_company_doc_no_uq',
      });
    }

    if (!hasTable('mfg_material_issue_items')) {
      await queryInterface.createTable('mfg_material_issue_items', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        issue_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_material_issues', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        batch_no: { type: Sequelize.STRING(50), allowNull: true },
        unit_cost: { type: Sequelize.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
        ...ts,
      });
    }

    if (!hasTable('mfg_production_entries')) {
      await queryInterface.createTable('mfg_production_entries', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        work_order_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_work_orders', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        entry_date: { type: Sequelize.DATEONLY, allowNull: true },
        good_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        reject_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        rework_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        scrap_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        warehouse_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'inventory_locations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        batch_no: { type: Sequelize.STRING(50), allowNull: true },
        created_by: userRefNullable,
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'draft' },
        ...ts,
      });
    }

    if (!hasTable('mfg_scrap_entries')) {
      await queryInterface.createTable('mfg_scrap_entries', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        work_order_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_work_orders', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        reason: { type: Sequelize.TEXT, allowNull: true },
        entry_date: { type: Sequelize.DATEONLY, allowNull: true },
        created_by: userRefNullable,
        ...ts,
      });
    }

    if (!hasTable('mfg_standard_costs')) {
      await queryInterface.createTable('mfg_standard_costs', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        bom_version_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_bom_versions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        material_cost: { type: Sequelize.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
        labour_cost: { type: Sequelize.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
        machine_cost: { type: Sequelize.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
        overhead_cost: { type: Sequelize.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
        packing_cost: { type: Sequelize.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
        total_cost: { type: Sequelize.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
        unit_cost: { type: Sequelize.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
        effective_from: { type: Sequelize.DATEONLY, allowNull: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
    }

    // ── Phase 4: Tax, period locks, auto journals ──
    if (!hasTable('mfg_tax_configurations')) {
      await queryInterface.createTable('mfg_tax_configurations', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        tax_type: { type: Sequelize.STRING(10), allowNull: false },
        code: { type: Sequelize.STRING(30), allowNull: false },
        name: { type: Sequelize.STRING(200), allowNull: false },
        rate: { type: Sequelize.DECIMAL(8, 4), allowNull: false, defaultValue: 0 },
        threshold_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
        effective_from: { type: Sequelize.DATEONLY, allowNull: true },
        effective_to: { type: Sequelize.DATEONLY, allowNull: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        meta: { type: Sequelize.JSONB, allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex('mfg_tax_configurations', ['tenant_id', 'company_id', 'code'], {
        unique: true,
        name: 'mfg_tax_cfg_tenant_company_code_uq',
      });
    }

    if (!hasTable('mfg_period_locks')) {
      await queryInterface.createTable('mfg_period_locks', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        financial_year_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'ac_financial_years', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        period_ym: { type: Sequelize.STRING(7), allowNull: false },
        module: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'all' },
        is_locked: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        locked_by: userRefNullable,
        locked_at: { type: Sequelize.DATE, allowNull: true },
        reopen_by: userRefNullable,
        reopen_at: { type: Sequelize.DATE, allowNull: true },
        reopen_reason: { type: Sequelize.TEXT, allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex('mfg_period_locks', ['tenant_id', 'company_id', 'period_ym', 'module'], {
        unique: true,
        name: 'mfg_period_locks_tenant_co_ym_mod_uq',
      });
    }

    if (!hasTable('mfg_auto_journal_links')) {
      await queryInterface.createTable('mfg_auto_journal_links', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        source_doc_type: { type: Sequelize.STRING(30), allowNull: false },
        source_doc_id: { type: Sequelize.INTEGER, allowNull: false },
        gl_voucher_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'gl_vouchers', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
        message: { type: Sequelize.TEXT, allowNull: true },
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
      });
      await queryInterface.addIndex('mfg_auto_journal_links', ['tenant_id', 'company_id', 'source_doc_type', 'source_doc_id'], {
        unique: true,
        name: 'mfg_auto_journal_src_uq',
      });
    }

    // ── Phase 5: Budget, HQ snapshots, KPI ──
    if (!hasTable('mfg_budget_lines')) {
      await queryInterface.createTable('mfg_budget_lines', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        financial_year_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'ac_financial_years', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        department_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'departments', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        gl_account_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'gl_accounts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        period_ym: { type: Sequelize.STRING(7), allowNull: false },
        budget_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        actual_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        currency_code: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'INR' },
        ...ts,
      });
    }

    if (!hasTable('mfg_hq_report_snapshots')) {
      await queryInterface.createTable('mfg_hq_report_snapshots', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        report_type: { type: Sequelize.STRING(30), allowNull: false },
        report_period: { type: Sequelize.STRING(20), allowNull: false },
        title: { type: Sequelize.STRING(200), allowNull: false },
        payload: { type: Sequelize.JSONB, allowNull: true },
        created_by: userRefNullable,
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
    }

    if (!hasTable('mfg_kpi_daily')) {
      await queryInterface.createTable('mfg_kpi_daily', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        kpi_date: { type: Sequelize.DATEONLY, allowNull: false },
        sales_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        cogs_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        inventory_value: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        production_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        scrap_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        yield_pct: { type: Sequelize.DECIMAL(8, 3), allowNull: false, defaultValue: 0 },
        open_po_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        open_so_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        ar_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        ap_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex('mfg_kpi_daily', ['tenant_id', 'company_id', 'kpi_date'], {
        unique: true,
        name: 'mfg_kpi_daily_tenant_co_date_uq',
      });
    }

    // ── Menus ──
    const [tenantRows] = await sequelize.query(`
      SELECT DISTINCT tenant_id FROM menus WHERE route = '/mfg' AND is_active = true
    `);

    const phase2Menus = [
      { route: '/mfg/sales-orders', name_ko: '판매주문', name_en: 'Sales Orders', icon: 'shopping_bag', description: 'Sales orders' },
      { route: '/mfg/delivery-challans', name_ko: '출고전표', name_en: 'Delivery Challans', icon: 'local_shipping', description: 'Delivery challans' },
      { route: '/mfg/stock-reservations', name_ko: '재고예약', name_en: 'Stock Reservations', icon: 'lock', description: 'Stock reservations' },
      { route: '/mfg/credit-notes', name_ko: '대변메모', name_en: 'Credit Notes', icon: 'note_alt', description: 'Credit notes' },
    ];
    const phase3Menus = [
      { route: '/mfg/boms', name_ko: 'BOM', name_en: 'BOMs', icon: 'account_tree', description: 'Bill of materials' },
      { route: '/mfg/work-centers', name_ko: '작업장', name_en: 'Work Centers', icon: 'factory', description: 'Work centers' },
      { route: '/mfg/routings', name_ko: '라우팅', name_en: 'Routings', icon: 'route', description: 'Production routings' },
      { route: '/mfg/production-plans', name_ko: '생산계획', name_en: 'Production Plans', icon: 'event_note', description: 'Production plans' },
      { route: '/mfg/work-orders', name_ko: '작업지시', name_en: 'Work Orders', icon: 'build', description: 'Work orders' },
      { route: '/mfg/material-issues', name_ko: '자재출고', name_en: 'Material Issues', icon: 'output', description: 'Material issues' },
      { route: '/mfg/production-entries', name_ko: '생산실적', name_en: 'Production Entries', icon: 'precision_manufacturing', description: 'Production entries' },
      { route: '/mfg/standard-costs', name_ko: '표준원가', name_en: 'Standard Costs', icon: 'calculate', description: 'Standard costs' },
    ];
    const phase4Menus = [
      { route: '/mfg/tax-configurations', name_ko: '세금설정', name_en: 'Tax Configurations', icon: 'percent', description: 'Tax configurations' },
      { route: '/mfg/period-locks', name_ko: '기간잠금', name_en: 'Period Locks', icon: 'lock_clock', description: 'Period locks' },
      { route: '/mfg/auto-journals', name_ko: '자동전표', name_en: 'Auto Journals', icon: 'sync_alt', description: 'Auto journal links' },
      { route: '/mfg/gst-registers', name_ko: 'GST원장', name_en: 'GST Registers', icon: 'receipt', description: 'GST register summary' },
    ];
    const phase5Menus = [
      { route: '/mfg/hq-dashboard', name_ko: '본사대시보드', name_en: 'HQ Dashboard', icon: 'dashboard', description: 'HQ dashboard' },
      { route: '/mfg/budgets', name_ko: '예산', name_en: 'Budgets', icon: 'savings', description: 'Budget lines' },
      { route: '/mfg/kpi', name_ko: 'KPI', name_en: 'KPI', icon: 'analytics', description: 'Daily KPI' },
      { route: '/mfg/report-snapshots', name_ko: '리포트스냅샷', name_en: 'Report Snapshots', icon: 'photo_camera', description: 'HQ report snapshots' },
    ];
    const allNewMenus = [...phase2Menus, ...phase3Menus, ...phase4Menus, ...phase5Menus];

    for (const row of tenantRows) {
      const tenantId = row.tenant_id;
      const [parentRow] = await sequelize.query(
        `SELECT id FROM menus WHERE tenant_id = $1 AND route = '/mfg' LIMIT 1`,
        { bind: [tenantId] }
      );
      const parentId = parentRow[0]?.id;
      if (!parentId) continue;

      const [maxOrderRow] = await sequelize.query(
        `SELECT COALESCE(MAX("order"), 0) AS max_order FROM menus WHERE tenant_id = $1 AND parent_id = $2`,
        { bind: [tenantId, parentId] }
      );
      let orderBase = Number(maxOrderRow[0]?.max_order ?? 0);

      for (const menu of allNewMenus) {
        const [exists] = await sequelize.query(
          `SELECT id FROM menus WHERE tenant_id = $1 AND route = $2 LIMIT 1`,
          { bind: [tenantId, menu.route] }
        );
        if (exists.length > 0) continue;
        orderBase += 1;
        await sequelize.query(
          `INSERT INTO menus
            (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 1, true, $8, NOW(), NOW())`,
          { bind: [tenantId, parentId, menu.name_ko, menu.name_en, menu.route, menu.icon, orderBase, menu.description] }
        );
      }

      const [childIds] = await sequelize.query(
        `SELECT id FROM menus WHERE tenant_id = $1 AND route = ANY($2::text[])`,
        { bind: [tenantId, allNewMenus.map((m) => m.route)] }
      );

      for (const m of childIds) {
        await sequelize.query(
          `INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
           SELECT up.user_id, $1, up.can_view, up.can_create, up.can_edit, up.can_delete, NOW(), NOW()
           FROM user_permissions up
           WHERE up.menu_id = $2
           AND NOT EXISTS (SELECT 1 FROM user_permissions p WHERE p.user_id = up.user_id AND p.menu_id = $1)`,
          { bind: [m.id, parentId] }
        );
        await sequelize.query(
          `INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
           SELECT u.id, $1, true, true, true, false, NOW(), NOW()
           FROM users u
           WHERE u.tenant_id = $2 AND u.role = 'admin'
           AND NOT EXISTS (SELECT 1 FROM user_permissions p WHERE p.user_id = u.id AND p.menu_id = $1)`,
          { bind: [m.id, tenantId] }
        );
      }

      // HQ top-level portal
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

      const [hqDashExists] = await sequelize.query(
        `SELECT id FROM menus WHERE tenant_id = $1 AND route = '/hq/dashboard' LIMIT 1`,
        { bind: [tenantId] }
      );
      if (hqDashExists.length === 0) {
        await sequelize.query(
          `INSERT INTO menus
            (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at)
           VALUES ($1, $2, '본사 대시보드', 'HQ Dashboard', '/hq/dashboard', 'dashboard', 1, 1, true, 'HQ dashboard', NOW(), NOW())`,
          { bind: [tenantId, hqParentId] }
        );
        const [hqDash] = await sequelize.query(
          `SELECT id FROM menus WHERE tenant_id = $1 AND route = '/hq/dashboard' LIMIT 1`,
          { bind: [tenantId] }
        );
        if (hqDash[0]?.id) {
          await sequelize.query(
            `INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
             SELECT up.user_id, $1, up.can_view, up.can_create, up.can_edit, up.can_delete, NOW(), NOW()
             FROM user_permissions up WHERE up.menu_id = $2
             AND NOT EXISTS (SELECT 1 FROM user_permissions p WHERE p.user_id = up.user_id AND p.menu_id = $1)`,
            { bind: [hqDash[0].id, parentId] }
          );
        }
      }
    }
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.query(`
      DELETE FROM user_permissions WHERE menu_id IN (
        SELECT id FROM menus WHERE route IN ('/hq', '/hq/dashboard')
          OR route IN (
            '/mfg/sales-orders','/mfg/delivery-challans','/mfg/stock-reservations','/mfg/credit-notes',
            '/mfg/boms','/mfg/work-centers','/mfg/routings','/mfg/production-plans','/mfg/work-orders',
            '/mfg/material-issues','/mfg/production-entries','/mfg/standard-costs',
            '/mfg/tax-configurations','/mfg/period-locks','/mfg/auto-journals','/mfg/gst-registers',
            '/mfg/hq-dashboard','/mfg/budgets','/mfg/kpi','/mfg/report-snapshots'
          )
      )
    `);
    await sequelize.query(`
      DELETE FROM menus WHERE route IN ('/hq/dashboard','/hq')
        OR route IN (
          '/mfg/sales-orders','/mfg/delivery-challans','/mfg/stock-reservations','/mfg/credit-notes',
          '/mfg/boms','/mfg/work-centers','/mfg/routings','/mfg/production-plans','/mfg/work-orders',
          '/mfg/material-issues','/mfg/production-entries','/mfg/standard-costs',
          '/mfg/tax-configurations','/mfg/period-locks','/mfg/auto-journals','/mfg/gst-registers',
          '/mfg/hq-dashboard','/mfg/budgets','/mfg/kpi','/mfg/report-snapshots'
        )
    `);

    const dropIfExists = async (name) => {
      const tables = await queryInterface.showAllTables();
      const tableNames = (tables || []).map((x) => (typeof x === 'string' ? x : x.tableName || x.name || x));
      if (tableNames.includes(name)) await queryInterface.dropTable(name);
    };

    await dropIfExists('mfg_kpi_daily');
    await dropIfExists('mfg_hq_report_snapshots');
    await dropIfExists('mfg_budget_lines');
    await dropIfExists('mfg_auto_journal_links');
    await dropIfExists('mfg_period_locks');
    await dropIfExists('mfg_tax_configurations');
    await dropIfExists('mfg_standard_costs');
    await dropIfExists('mfg_scrap_entries');
    await dropIfExists('mfg_production_entries');
    await dropIfExists('mfg_material_issue_items');
    await dropIfExists('mfg_material_issues');
    await dropIfExists('mfg_work_orders');
    await dropIfExists('mfg_material_requirements');
    await dropIfExists('mfg_production_plans');
    await dropIfExists('mfg_routing_operations');
    await dropIfExists('mfg_routings');
    await dropIfExists('mfg_bom_items');
    await dropIfExists('mfg_bom_versions');
    await dropIfExists('mfg_boms');
    await dropIfExists('mfg_work_centers');
    await dropIfExists('mfg_credit_notes');
    await dropIfExists('mfg_delivery_challan_items');
    await dropIfExists('mfg_delivery_challans');
    await dropIfExists('mfg_stock_reservations');
    await dropIfExists('mfg_sales_order_items');
    await dropIfExists('mfg_sales_orders');
  },
};
