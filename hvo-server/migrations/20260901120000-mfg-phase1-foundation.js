'use strict';

/** Manufacturing ERP Phase 1 — branches, bins, PR/PO/GRN, stock ledger, document sequences */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    const tables = await queryInterface.showAllTables();
    const tableNames = (tables || []).map((x) => (typeof x === 'string' ? x : x.tableName || x.name || x));

    const hasTable = (name) => tableNames.includes(name);

    const addColumnIfMissing = async (table, column, definition) => {
      if (!hasTable(table)) return;
      const desc = await queryInterface.describeTable(table).catch(() => ({}));
      if (desc[column]) return;
      await queryInterface.addColumn(table, column, definition);
    };

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

    // ── 1. mfg_branches ──
    if (!hasTable('mfg_branches')) {
      await queryInterface.createTable('mfg_branches', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        code: { type: Sequelize.STRING(30), allowNull: false },
        name: { type: Sequelize.STRING(200), allowNull: false },
        gstin: { type: Sequelize.STRING(20), allowNull: true },
        address: { type: Sequelize.TEXT, allowNull: true },
        state_code: { type: Sequelize.STRING(5), allowNull: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        updated_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        ...ts,
      });
      await queryInterface.addIndex('mfg_branches', ['tenant_id', 'company_id', 'code'], {
        unique: true,
        name: 'mfg_branches_tenant_company_code_uq',
      });
    }

    // ── 2. Extend inventory_locations ──
    if (hasTable('inventory_locations')) {
      await addColumnIfMissing('inventory_locations', 'code', {
        type: Sequelize.STRING(30),
        allowNull: true,
      });
      await addColumnIfMissing('inventory_locations', 'is_active', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
      await addColumnIfMissing('inventory_locations', 'branch_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'mfg_branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      await addColumnIfMissing('inventory_locations', 'address', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    // ── 3. mfg_bin_locations ──
    if (!hasTable('mfg_bin_locations')) {
      await queryInterface.createTable('mfg_bin_locations', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        warehouse_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'inventory_locations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        code: { type: Sequelize.STRING(30), allowNull: false },
        name: { type: Sequelize.STRING(200), allowNull: false },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
      await queryInterface.addIndex('mfg_bin_locations', ['warehouse_id', 'code'], {
        unique: true,
        name: 'mfg_bin_locations_warehouse_code_uq',
      });
    }

    // ── 4. Extend products ──
    if (hasTable('products')) {
      await addColumnIfMissing('products', 'item_type', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'finished_goods',
      });
      await addColumnIfMissing('products', 'hsn_sac', {
        type: Sequelize.STRING(20),
        allowNull: true,
      });
      await addColumnIfMissing('products', 'reorder_level', {
        type: Sequelize.DECIMAL(15, 3),
        allowNull: false,
        defaultValue: 0,
      });
      await addColumnIfMissing('products', 'safety_stock', {
        type: Sequelize.DECIMAL(15, 3),
        allowNull: false,
        defaultValue: 0,
      });
      await addColumnIfMissing('products', 'valuation_method', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'weighted_average',
      });
      await addColumnIfMissing('products', 'track_batch', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      await addColumnIfMissing('products', 'track_serial', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    // ── 5. Extend partners ──
    if (hasTable('partners')) {
      await addColumnIfMissing('partners', 'legal_name', { type: Sequelize.STRING(200), allowNull: true });
      await addColumnIfMissing('partners', 'trade_name', { type: Sequelize.STRING(200), allowNull: true });
      await addColumnIfMissing('partners', 'tan_number', { type: Sequelize.STRING(20), allowNull: true });
      await addColumnIfMissing('partners', 'state_code', { type: Sequelize.STRING(5), allowNull: true });
      await addColumnIfMissing('partners', 'partner_category', { type: Sequelize.STRING(30), allowNull: true });
      await addColumnIfMissing('partners', 'msme_udyam', { type: Sequelize.STRING(50), allowNull: true });
      await addColumnIfMissing('partners', 'payment_terms', { type: Sequelize.STRING(100), allowNull: true });
      await addColumnIfMissing('partners', 'currency_code', {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'INR',
      });
      await addColumnIfMissing('partners', 'tds_applicable', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    // ── 6. mfg_document_sequences ──
    if (!hasTable('mfg_document_sequences')) {
      await queryInterface.createTable('mfg_document_sequences', {
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
        doc_type: { type: Sequelize.STRING(30), allowNull: false },
        prefix: { type: Sequelize.STRING(40), allowNull: false, defaultValue: '' },
        next_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        pad_length: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
        ...ts,
      });
      await queryInterface.addIndex('mfg_document_sequences', ['tenant_id', 'company_id', 'doc_type'], {
        unique: true,
        name: 'mfg_doc_seq_tenant_company_doctype_uq',
      });
    }

    // ── 7. mfg_stock_ledger_entries ──
    if (!hasTable('mfg_stock_ledger_entries')) {
      await queryInterface.createTable('mfg_stock_ledger_entries', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        financial_year_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'ac_financial_years', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        branch_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_branches', key: 'id' },
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
        warehouse_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'inventory_locations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        bin_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_bin_locations', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        batch_no: { type: Sequelize.STRING(50), allowNull: true },
        serial_no: { type: Sequelize.STRING(80), allowNull: true },
        txn_date: { type: Sequelize.DATEONLY, allowNull: false },
        txn_type: { type: Sequelize.STRING(30), allowNull: false },
        qty_in: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        qty_out: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        unit_cost: { type: Sequelize.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
        ref_doc_type: { type: Sequelize.STRING(30), allowNull: true },
        ref_doc_id: { type: Sequelize.INTEGER, allowNull: true },
        ref_doc_no: { type: Sequelize.STRING(60), allowNull: true },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
      await queryInterface.addIndex('mfg_stock_ledger_entries', ['tenant_id', 'company_id', 'product_id'], {
        name: 'mfg_stock_ledger_tenant_company_product_idx',
      });
      await queryInterface.addIndex('mfg_stock_ledger_entries', ['warehouse_id'], {
        name: 'mfg_stock_ledger_warehouse_idx',
      });
      await queryInterface.addIndex('mfg_stock_ledger_entries', ['txn_date'], {
        name: 'mfg_stock_ledger_txn_date_idx',
      });
      await queryInterface.addIndex('mfg_stock_ledger_entries', ['ref_doc_type', 'ref_doc_id'], {
        name: 'mfg_stock_ledger_ref_doc_idx',
      });
    }

    const userRefNullable = {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    };

    // ── 8. mfg_purchase_requisitions + items ──
    if (!hasTable('mfg_purchase_requisitions')) {
      await queryInterface.createTable('mfg_purchase_requisitions', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        doc_no: { type: Sequelize.STRING(60), allowNull: false },
        branch_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_branches', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
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
        requester_id: userRefNullable,
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'draft' },
        required_date: { type: Sequelize.DATEONLY, allowNull: true },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        created_by: userRefNullable,
        updated_by: userRefNullable,
        approved_by: userRefNullable,
        approved_at: { type: Sequelize.DATE, allowNull: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
      await queryInterface.addIndex('mfg_purchase_requisitions', ['tenant_id', 'company_id', 'doc_no'], {
        unique: true,
        name: 'mfg_pr_tenant_company_doc_no_uq',
      });
    }

    if (!hasTable('mfg_purchase_requisition_items')) {
      await queryInterface.createTable('mfg_purchase_requisition_items', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        requisition_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_purchase_requisitions', key: 'id' },
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
        estimated_unit_price: { type: Sequelize.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex('mfg_purchase_requisition_items', ['requisition_id', 'line_no'], {
        unique: true,
        name: 'mfg_pr_items_req_line_uq',
      });
    }

    // ── 9. mfg_purchase_orders + items ──
    if (!hasTable('mfg_purchase_orders')) {
      await queryInterface.createTable('mfg_purchase_orders', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        doc_no: { type: Sequelize.STRING(60), allowNull: false },
        branch_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_branches', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        financial_year_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'ac_financial_years', key: 'id' },
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
        requisition_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_purchase_requisitions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'draft' },
        order_date: { type: Sequelize.DATEONLY, allowNull: true },
        expected_date: { type: Sequelize.DATEONLY, allowNull: true },
        currency_code: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'INR' },
        over_receive_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        created_by: userRefNullable,
        updated_by: userRefNullable,
        approved_by: userRefNullable,
        approved_at: { type: Sequelize.DATE, allowNull: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
      await queryInterface.addIndex('mfg_purchase_orders', ['tenant_id', 'company_id', 'doc_no'], {
        unique: true,
        name: 'mfg_po_tenant_company_doc_no_uq',
      });
    }

    if (!hasTable('mfg_purchase_order_items')) {
      await queryInterface.createTable('mfg_purchase_order_items', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        po_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_purchase_orders', key: 'id' },
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
        received_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        unit_price: { type: Sequelize.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
        tax_rate: { type: Sequelize.DECIMAL(8, 3), allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex('mfg_purchase_order_items', ['po_id', 'line_no'], {
        unique: true,
        name: 'mfg_po_items_po_line_uq',
      });
    }

    // ── 10. mfg_goods_receipts + items ──
    if (!hasTable('mfg_goods_receipts')) {
      await queryInterface.createTable('mfg_goods_receipts', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        doc_no: { type: Sequelize.STRING(60), allowNull: false },
        branch_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_branches', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        financial_year_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'ac_financial_years', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        po_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_purchase_orders', key: 'id' },
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
        receipt_date: { type: Sequelize.DATEONLY, allowNull: true },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        created_by: userRefNullable,
        updated_by: userRefNullable,
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
      await queryInterface.addIndex('mfg_goods_receipts', ['tenant_id', 'company_id', 'doc_no'], {
        unique: true,
        name: 'mfg_grn_tenant_company_doc_no_uq',
      });
    }

    if (!hasTable('mfg_goods_receipt_items')) {
      await queryInterface.createTable('mfg_goods_receipt_items', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        grn_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_goods_receipts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        po_item_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_purchase_order_items', key: 'id' },
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
        accepted_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        rejected_qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        batch_no: { type: Sequelize.STRING(50), allowNull: true },
        unit_cost: { type: Sequelize.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
        inspection_status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
        ...ts,
      });
    }

    // ── 11. mfg_quality_inspections ──
    if (!hasTable('mfg_quality_inspections')) {
      await queryInterface.createTable('mfg_quality_inspections', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        grn_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'mfg_goods_receipts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        grn_item_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'mfg_goods_receipt_items', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        inspection_type: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'incoming' },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
        inspected_by: userRefNullable,
        inspected_at: { type: Sequelize.DATE, allowNull: true },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        created_by: userRefNullable,
        updated_by: userRefNullable,
        ...ts,
      });
    }

    // ── 12. mfg_document_audit_logs ──
    if (!hasTable('mfg_document_audit_logs')) {
      await queryInterface.createTable('mfg_document_audit_logs', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompanyRefs,
        doc_type: { type: Sequelize.STRING(30), allowNull: false },
        doc_id: { type: Sequelize.INTEGER, allowNull: false },
        action: { type: Sequelize.STRING(40), allowNull: false },
        actor_user_id: userRefNullable,
        before_json: { type: Sequelize.JSONB, allowNull: true },
        after_json: { type: Sequelize.JSONB, allowNull: true },
        ip_address: { type: Sequelize.STRING(64), allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
      await queryInterface.addIndex('mfg_document_audit_logs', ['tenant_id', 'company_id', 'doc_type', 'doc_id'], {
        name: 'mfg_audit_log_doc_idx',
      });
    }

    // ── Menus ──
    const [tenantRows] = await sequelize.query(`
      SELECT DISTINCT tenant_id
      FROM menus
      WHERE parent_id IS NULL
        AND route IN ('/inventory', '/work')
        AND is_active = true
    `);

    const childMenus = [
      { route: '/mfg/branches', name_ko: '사업장', name_en: 'Branches', icon: 'business', description: 'Manufacturing branches' },
      { route: '/mfg/warehouses', name_ko: '창고', name_en: 'Warehouses', icon: 'warehouse', description: 'Warehouse locations' },
      { route: '/mfg/document-sequences', name_ko: '문서번호', name_en: 'Document Sequences', icon: 'tag', description: 'Document number sequences' },
      { route: '/mfg/purchase-requisitions', name_ko: '구매요청', name_en: 'Purchase Requisitions', icon: 'request_quote', description: 'Purchase requisitions' },
      { route: '/mfg/purchase-orders', name_ko: '구매발주', name_en: 'Purchase Orders', icon: 'shopping_cart', description: 'Purchase orders' },
      { route: '/mfg/goods-receipts', name_ko: '입고(GRN)', name_en: 'Goods Receipts', icon: 'inventory_2', description: 'Goods receipt notes' },
      { route: '/mfg/quality-inspections', name_ko: '품질검사', name_en: 'Quality Inspections', icon: 'fact_check', description: 'Incoming quality inspections' },
      { route: '/mfg/stock-ledger', name_ko: '재고원장', name_en: 'Stock Ledger', icon: 'receipt_long', description: 'Manufacturing stock ledger' },
      { route: '/mfg/audit-logs', name_ko: '감사로그', name_en: 'Audit Logs', icon: 'history', description: 'Document audit trail' },
    ];

    for (const row of tenantRows) {
      const tenantId = row.tenant_id;

      const [existingTop] = await sequelize.query(
        `SELECT id FROM menus WHERE tenant_id = $1 AND route = '/mfg' LIMIT 1`,
        { bind: [tenantId] }
      );

      let parentId = existingTop[0]?.id;

      if (!parentId) {
        const [invMenu] = await sequelize.query(
          `SELECT "order" FROM menus WHERE tenant_id = $1 AND route = '/inventory' AND parent_id IS NULL LIMIT 1`,
          { bind: [tenantId] }
        );
        const invOrder = Number(invMenu[0]?.order ?? 0);
        const mfgOrder = invOrder > 0 ? invOrder + 1 : 50;

        await sequelize.query(
          `UPDATE menus SET "order" = "order" + 1, updated_at = NOW()
           WHERE tenant_id = $1 AND parent_id IS NULL AND "order" >= $2 AND route != '/mfg'`,
          { bind: [tenantId, mfgOrder] }
        );

        const [inserted] = await sequelize.query(
          `INSERT INTO menus
            (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at)
           VALUES ($1, NULL, '제조·구매', 'Manufacturing', '/mfg', 'precision_manufacturing', $2, 0, true, 'Manufacturing & procurement', NOW(), NOW())
           RETURNING id`,
          { bind: [tenantId, mfgOrder] }
        );
        parentId = inserted[0].id;
      }

      for (let i = 0; i < childMenus.length; i++) {
        const menu = childMenus[i];
        const [exists] = await sequelize.query(
          `SELECT id FROM menus WHERE tenant_id = $1 AND route = $2 LIMIT 1`,
          { bind: [tenantId, menu.route] }
        );
        if (exists.length > 0) continue;

        await sequelize.query(
          `INSERT INTO menus
            (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 1, true, $8, NOW(), NOW())`,
          {
            bind: [tenantId, parentId, menu.name_ko, menu.name_en, menu.route, menu.icon, i + 1, menu.description],
          }
        );
      }

      const [childIds] = await sequelize.query(
        `SELECT id FROM menus WHERE tenant_id = $1 AND route LIKE '/mfg/%'`,
        { bind: [tenantId] }
      );
      const [invParent] = await sequelize.query(
        `SELECT id FROM menus WHERE tenant_id = $1 AND route = '/inventory' AND parent_id IS NULL LIMIT 1`,
        { bind: [tenantId] }
      );
      const copyFromMenuId = invParent[0]?.id || parentId;

      for (const m of childIds) {
        await sequelize.query(
          `INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
           SELECT up.user_id, $1, up.can_view, up.can_create, up.can_edit, up.can_delete, NOW(), NOW()
           FROM user_permissions up
           WHERE up.menu_id = $2
           AND NOT EXISTS (SELECT 1 FROM user_permissions p WHERE p.user_id = up.user_id AND p.menu_id = $1)`,
          { bind: [m.id, copyFromMenuId] }
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
    }
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;

    await sequelize.query(`
      DELETE FROM user_permissions WHERE menu_id IN (
        SELECT id FROM menus WHERE route = '/mfg' OR route LIKE '/mfg/%'
      )
    `);
    await sequelize.query(`DELETE FROM menus WHERE route LIKE '/mfg/%' OR route = '/mfg'`);

    const dropIfExists = async (name) => {
      const tables = await queryInterface.showAllTables();
      const tableNames = (tables || []).map((x) => (typeof x === 'string' ? x : x.tableName || x.name || x));
      if (tableNames.includes(name)) {
        await queryInterface.dropTable(name);
      }
    };

    await dropIfExists('mfg_document_audit_logs');
    await dropIfExists('mfg_quality_inspections');
    await dropIfExists('mfg_goods_receipt_items');
    await dropIfExists('mfg_goods_receipts');
    await dropIfExists('mfg_purchase_order_items');
    await dropIfExists('mfg_purchase_orders');
    await dropIfExists('mfg_purchase_requisition_items');
    await dropIfExists('mfg_purchase_requisitions');
    await dropIfExists('mfg_stock_ledger_entries');
    await dropIfExists('mfg_document_sequences');
    await dropIfExists('mfg_bin_locations');
    await dropIfExists('mfg_branches');

    const removeCol = async (table, col) => {
      const desc = await queryInterface.describeTable(table).catch(() => ({}));
      if (desc[col]) await queryInterface.removeColumn(table, col);
    };

    for (const col of [
      'code', 'is_active', 'branch_id', 'address',
    ]) {
      await removeCol('inventory_locations', col);
    }
    for (const col of [
      'item_type', 'hsn_sac', 'reorder_level', 'safety_stock',
      'valuation_method', 'track_batch', 'track_serial',
    ]) {
      await removeCol('products', col);
    }
    for (const col of [
      'legal_name', 'trade_name', 'tan_number', 'state_code', 'partner_category',
      'msme_udyam', 'payment_terms', 'currency_code', 'tds_applicable',
    ]) {
      await removeCol('partners', col);
    }
  },
};
