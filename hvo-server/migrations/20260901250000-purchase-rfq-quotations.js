'use strict';

/**
 * 구매모듈 Step3: RFQ / 공급업체 견적 / 비교선정 테이블
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const tables = await qi.showAllTables();
    const has = (n) =>
      tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name)).includes(n);

    const tenantCompany = {
      tenant_id: { type: Sequelize.INTEGER, allowNull: false },
      company_id: { type: Sequelize.INTEGER, allowNull: false },
    };
    const userRef = { type: Sequelize.INTEGER, allowNull: true };
    const ts = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };

    if (!has('mfg_rfqs')) {
      await qi.createTable('mfg_rfqs', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompany,
        doc_no: { type: Sequelize.STRING(60), allowNull: false },
        branch_id: { type: Sequelize.INTEGER, allowNull: false },
        financial_year_id: { type: Sequelize.INTEGER, allowNull: true },
        requisition_id: { type: Sequelize.INTEGER, allowNull: true },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'draft' },
        title: { type: Sequelize.STRING(200), allowNull: true },
        rfq_date: { type: Sequelize.DATEONLY, allowNull: true },
        due_date: { type: Sequelize.DATEONLY, allowNull: true },
        currency_code: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'INR' },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        selected_quotation_id: { type: Sequelize.INTEGER, allowNull: true },
        selected_partner_id: { type: Sequelize.INTEGER, allowNull: true },
        selected_by: userRef,
        selected_at: { type: Sequelize.DATE, allowNull: true },
        created_by: userRef,
        updated_by: userRef,
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
      await qi.addIndex('mfg_rfqs', ['tenant_id', 'company_id', 'doc_no'], {
        unique: true,
        name: 'mfg_rfq_tenant_company_doc_no_uq',
      });
      await qi.addIndex('mfg_rfqs', ['tenant_id', 'company_id', 'requisition_id'], {
        name: 'mfg_rfq_requisition_idx',
      });
    }

    if (!has('mfg_rfq_items')) {
      await qi.createTable('mfg_rfq_items', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        rfq_id: { type: Sequelize.INTEGER, allowNull: false },
        line_no: { type: Sequelize.INTEGER, allowNull: false },
        requisition_item_id: { type: Sequelize.INTEGER, allowNull: true },
        product_id: { type: Sequelize.INTEGER, allowNull: true },
        item_name: { type: Sequelize.STRING(200), allowNull: false },
        uom: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'EA' },
        qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        specification: { type: Sequelize.TEXT, allowNull: true },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        ...ts,
      });
      await qi.addIndex('mfg_rfq_items', ['rfq_id', 'line_no'], {
        unique: true,
        name: 'mfg_rfq_items_line_uq',
      });
    }

    if (!has('mfg_rfq_vendors')) {
      await qi.createTable('mfg_rfq_vendors', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        rfq_id: { type: Sequelize.INTEGER, allowNull: false },
        partner_id: { type: Sequelize.INTEGER, allowNull: false },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'invited' },
        invited_at: { type: Sequelize.DATE, allowNull: true },
        responded_at: { type: Sequelize.DATE, allowNull: true },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        ...ts,
      });
      await qi.addIndex('mfg_rfq_vendors', ['rfq_id', 'partner_id'], {
        unique: true,
        name: 'mfg_rfq_vendors_partner_uq',
      });
    }

    if (!has('mfg_supplier_quotations')) {
      await qi.createTable('mfg_supplier_quotations', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        ...tenantCompany,
        doc_no: { type: Sequelize.STRING(60), allowNull: false },
        rfq_id: { type: Sequelize.INTEGER, allowNull: false },
        partner_id: { type: Sequelize.INTEGER, allowNull: false },
        revision: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'draft' },
        quote_date: { type: Sequelize.DATEONLY, allowNull: true },
        valid_until: { type: Sequelize.DATEONLY, allowNull: true },
        currency_code: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'INR' },
        payment_terms: { type: Sequelize.STRING(120), allowNull: true },
        delivery_days: { type: Sequelize.INTEGER, allowNull: true },
        freight_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        other_charges: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        tax_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        total_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        is_selected: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_by: userRef,
        updated_by: userRef,
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
      await qi.addIndex('mfg_supplier_quotations', ['tenant_id', 'company_id', 'doc_no'], {
        unique: true,
        name: 'mfg_sq_tenant_company_doc_no_uq',
      });
      await qi.addIndex('mfg_supplier_quotations', ['rfq_id', 'partner_id', 'revision'], {
        unique: true,
        name: 'mfg_sq_rfq_partner_rev_uq',
      });
    }

    if (!has('mfg_supplier_quotation_items')) {
      await qi.createTable('mfg_supplier_quotation_items', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        quotation_id: { type: Sequelize.INTEGER, allowNull: false },
        rfq_item_id: { type: Sequelize.INTEGER, allowNull: true },
        line_no: { type: Sequelize.INTEGER, allowNull: false },
        product_id: { type: Sequelize.INTEGER, allowNull: true },
        item_name: { type: Sequelize.STRING(200), allowNull: false },
        uom: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'EA' },
        qty: { type: Sequelize.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
        unit_price: { type: Sequelize.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
        tax_pct: { type: Sequelize.DECIMAL(8, 3), allowNull: false, defaultValue: 0 },
        line_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        lead_time_days: { type: Sequelize.INTEGER, allowNull: true },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        ...ts,
      });
      await qi.addIndex('mfg_supplier_quotation_items', ['quotation_id', 'line_no'], {
        unique: true,
        name: 'mfg_sq_items_line_uq',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('mfg_supplier_quotation_items').catch(() => null);
    await queryInterface.dropTable('mfg_supplier_quotations').catch(() => null);
    await queryInterface.dropTable('mfg_rfq_vendors').catch(() => null);
    await queryInterface.dropTable('mfg_rfq_items').catch(() => null);
    await queryInterface.dropTable('mfg_rfqs').catch(() => null);
  },
};
