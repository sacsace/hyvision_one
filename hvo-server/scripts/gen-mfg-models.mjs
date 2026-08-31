import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'src/models');

const models = [
  { name: 'MfgSalesOrder', table: 'mfg_sales_orders', extras: [
    ['doc_no','STRING(60)'],['branch_id','INTEGER|null'],['financial_year_id','INTEGER|null'],
    ['partner_id','INTEGER'],['status','STRING(30)|draft'],['order_date','DATEONLY|null'],
    ['currency_code','STRING(3)|INR'],['credit_limit_check','BOOLEAN|true'],['remarks','TEXT|null'],
    ['created_by','INTEGER|null'],['updated_by','INTEGER|null'],['approved_by','INTEGER|null'],
    ['approved_at','DATE|null'],['is_active','BOOLEAN|true']
  ]},
  { name: 'MfgSalesOrderItem', table: 'mfg_sales_order_items', noTenant: true, extras: [
    ['so_id','INTEGER'],['line_no','INTEGER'],['product_id','INTEGER|null'],['item_name','STRING(200)'],
    ['uom','STRING(20)|EA'],['qty','DECIMAL(18,3)|0'],['delivered_qty','DECIMAL(18,3)|0'],
    ['reserved_qty','DECIMAL(18,3)|0'],['unit_price','DECIMAL(18,4)|0'],['tax_rate','DECIMAL(8,3)|0'],
    ['discount_pct','DECIMAL(8,3)|0']
  ]},
  { name: 'MfgStockReservation', table: 'mfg_stock_reservations', extras: [
    ['product_id','INTEGER'],['warehouse_id','INTEGER|null'],['so_id','INTEGER'],['so_item_id','INTEGER'],
    ['qty','DECIMAL(18,3)|0'],['status','STRING(20)|active'],['created_by','INTEGER|null'],['is_active','BOOLEAN|true']
  ]},
  { name: 'MfgDeliveryChallan', table: 'mfg_delivery_challans', extras: [
    ['branch_id','INTEGER|null'],['financial_year_id','INTEGER|null'],['doc_no','STRING(60)'],['so_id','INTEGER|null'],
    ['partner_id','INTEGER'],['warehouse_id','INTEGER'],['status','STRING(30)|draft'],['challan_date','DATEONLY|null'],
    ['remarks','TEXT|null'],['created_by','INTEGER|null'],['updated_by','INTEGER|null'],['is_active','BOOLEAN|true']
  ]},
  { name: 'MfgDeliveryChallanItem', table: 'mfg_delivery_challan_items', noTenant: true, extras: [
    ['challan_id','INTEGER'],['so_item_id','INTEGER|null'],['product_id','INTEGER'],['item_name','STRING(200)'],
    ['uom','STRING(20)|EA'],['qty','DECIMAL(18,3)|0'],['batch_no','STRING(50)|null']
  ]},
  { name: 'MfgCreditNote', table: 'mfg_credit_notes', extras: [
    ['doc_no','STRING(60)'],['partner_id','INTEGER'],['invoice_id','INTEGER|null'],['so_id','INTEGER|null'],
    ['status','STRING(30)|draft'],['note_date','DATEONLY|null'],['amount','DECIMAL(18,2)|0'],
    ['tax_amount','DECIMAL(18,2)|0'],['remarks','TEXT|null'],['created_by','INTEGER|null'],
    ['updated_by','INTEGER|null'],['is_active','BOOLEAN|true']
  ]},
  { name: 'MfgWorkCenter', table: 'mfg_work_centers', extras: [
    ['code','STRING(30)'],['name','STRING(200)'],['is_active','BOOLEAN|true'],
    ['created_by','INTEGER|null'],['updated_by','INTEGER|null']
  ]},
  { name: 'MfgBom', table: 'mfg_boms', extras: [
    ['product_id','INTEGER'],['code','STRING(30)'],['name','STRING(200)'],['status','STRING(20)|draft'],
    ['is_active','BOOLEAN|true'],['created_by','INTEGER|null'],['updated_by','INTEGER|null']
  ]},
  { name: 'MfgBomVersion', table: 'mfg_bom_versions', noTenant: true, extras: [
    ['bom_id','INTEGER'],['version_no','INTEGER'],['effective_from','DATEONLY|null'],['effective_to','DATEONLY|null'],
    ['status','STRING(20)|draft'],['yield_pct','DECIMAL(8,3)|100'],['scrap_pct','DECIMAL(8,3)|0'],
    ['approved_by','INTEGER|null'],['approved_at','DATE|null']
  ]},
  { name: 'MfgBomItem', table: 'mfg_bom_items', noTenant: true, extras: [
    ['bom_version_id','INTEGER'],['line_no','INTEGER'],['component_product_id','INTEGER'],
    ['qty','DECIMAL(18,6)|0'],['uom','STRING(20)|EA'],['scrap_pct','DECIMAL(8,3)|0'],
    ['is_alternate','BOOLEAN|false'],['operation_seq','INTEGER|10']
  ]},
  { name: 'MfgRouting', table: 'mfg_routings', extras: [
    ['product_id','INTEGER'],['code','STRING(30)'],['name','STRING(200)'],['is_active','BOOLEAN|true']
  ]},
  { name: 'MfgRoutingOperation', table: 'mfg_routing_operations', noTenant: true, extras: [
    ['routing_id','INTEGER'],['seq','INTEGER'],['work_center_id','INTEGER|null'],['name','STRING(200)'],
    ['setup_minutes','INTEGER|0'],['run_minutes_per_unit','DECIMAL(10,3)|0'],['machine_minutes_per_unit','DECIMAL(10,3)|0']
  ]},
  { name: 'MfgProductionPlan', table: 'mfg_production_plans', extras: [
    ['plan_code','STRING(60)'],['plan_date','DATEONLY|null'],['horizon','STRING(10)|month'],
    ['status','STRING(20)|draft'],['remarks','TEXT|null'],['created_by','INTEGER|null']
  ]},
  { name: 'MfgMaterialRequirement', table: 'mfg_material_requirements', noTenant: true, extras: [
    ['plan_id','INTEGER|null'],['product_id','INTEGER'],['required_qty','DECIMAL(18,3)|0'],
    ['available_qty','DECIMAL(18,3)|0'],['shortage_qty','DECIMAL(18,3)|0'],['suggested_pr','BOOLEAN|false']
  ]},
  { name: 'MfgWorkOrder', table: 'mfg_work_orders', extras: [
    ['branch_id','INTEGER|null'],['financial_year_id','INTEGER|null'],['doc_no','STRING(60)'],['product_id','INTEGER'],
    ['bom_version_id','INTEGER|null'],['routing_id','INTEGER|null'],['plan_qty','DECIMAL(18,3)|0'],
    ['completed_qty','DECIMAL(18,3)|0'],['scrap_qty','DECIMAL(18,3)|0'],['status','STRING(30)|draft'],
    ['planned_start','DATEONLY|null'],['planned_end','DATEONLY|null'],['warehouse_id','INTEGER|null'],
    ['created_by','INTEGER|null'],['updated_by','INTEGER|null'],['is_active','BOOLEAN|true']
  ]},
  { name: 'MfgMaterialIssue', table: 'mfg_material_issues', extras: [
    ['doc_no','STRING(60)'],['work_order_id','INTEGER'],['warehouse_id','INTEGER'],['status','STRING(30)|draft'],
    ['issue_date','DATEONLY|null'],['created_by','INTEGER|null'],['is_active','BOOLEAN|true']
  ]},
  { name: 'MfgMaterialIssueItem', table: 'mfg_material_issue_items', noTenant: true, extras: [
    ['issue_id','INTEGER'],['product_id','INTEGER'],['qty','DECIMAL(18,3)|0'],
    ['batch_no','STRING(50)|null'],['unit_cost','DECIMAL(18,4)|0']
  ]},
  { name: 'MfgProductionEntry', table: 'mfg_production_entries', extras: [
    ['work_order_id','INTEGER'],['entry_date','DATEONLY|null'],['good_qty','DECIMAL(18,3)|0'],
    ['reject_qty','DECIMAL(18,3)|0'],['rework_qty','DECIMAL(18,3)|0'],['scrap_qty','DECIMAL(18,3)|0'],
    ['warehouse_id','INTEGER|null'],['batch_no','STRING(50)|null'],['created_by','INTEGER|null'],['status','STRING(20)|draft']
  ]},
  { name: 'MfgScrapEntry', table: 'mfg_scrap_entries', extras: [
    ['work_order_id','INTEGER|null'],['product_id','INTEGER'],['qty','DECIMAL(18,3)|0'],
    ['reason','TEXT|null'],['entry_date','DATEONLY|null'],['created_by','INTEGER|null']
  ]},
  { name: 'MfgStandardCost', table: 'mfg_standard_costs', extras: [
    ['product_id','INTEGER'],['bom_version_id','INTEGER|null'],['material_cost','DECIMAL(18,4)|0'],
    ['labour_cost','DECIMAL(18,4)|0'],['machine_cost','DECIMAL(18,4)|0'],['overhead_cost','DECIMAL(18,4)|0'],
    ['packing_cost','DECIMAL(18,4)|0'],['total_cost','DECIMAL(18,4)|0'],['unit_cost','DECIMAL(18,4)|0'],
    ['effective_from','DATEONLY|null'],['is_active','BOOLEAN|true']
  ]},
  { name: 'MfgTaxConfiguration', table: 'mfg_tax_configurations', extras: [
    ['tax_type','STRING(10)'],['code','STRING(30)'],['name','STRING(200)'],['rate','DECIMAL(8,4)|0'],
    ['threshold_amount','DECIMAL(18,2)|null'],['effective_from','DATEONLY|null'],['effective_to','DATEONLY|null'],
    ['is_active','BOOLEAN|true'],['meta','JSONB|null']
  ]},
  { name: 'MfgPeriodLock', table: 'mfg_period_locks', extras: [
    ['financial_year_id','INTEGER|null'],['period_ym','STRING(7)'],['module','STRING(20)|all'],
    ['is_locked','BOOLEAN|false'],['locked_by','INTEGER|null'],['locked_at','DATE|null'],
    ['reopen_by','INTEGER|null'],['reopen_at','DATE|null'],['reopen_reason','TEXT|null']
  ]},
  { name: 'MfgAutoJournalLink', table: 'mfg_auto_journal_links', extras: [
    ['source_doc_type','STRING(30)'],['source_doc_id','INTEGER'],['gl_voucher_id','INTEGER|null'],
    ['status','STRING(20)|pending'],['message','TEXT|null']
  ]},
  { name: 'MfgBudgetLine', table: 'mfg_budget_lines', extras: [
    ['financial_year_id','INTEGER|null'],['department_id','INTEGER|null'],['gl_account_id','INTEGER|null'],
    ['period_ym','STRING(7)'],['budget_amount','DECIMAL(18,2)|0'],['actual_amount','DECIMAL(18,2)|0'],
    ['currency_code','STRING(3)|INR']
  ]},
  { name: 'MfgHqReportSnapshot', table: 'mfg_hq_report_snapshots', extras: [
    ['report_type','STRING(30)'],['report_period','STRING(20)'],['title','STRING(200)'],
    ['payload','JSONB|null'],['created_by','INTEGER|null']
  ], createdOnly: true },
  { name: 'MfgKpiDaily', table: 'mfg_kpi_daily', extras: [
    ['kpi_date','DATEONLY'],['sales_amount','DECIMAL(18,2)|0'],['cogs_amount','DECIMAL(18,2)|0'],
    ['inventory_value','DECIMAL(18,2)|0'],['production_qty','DECIMAL(18,3)|0'],['scrap_qty','DECIMAL(18,3)|0'],
    ['yield_pct','DECIMAL(8,3)|0'],['open_po_count','INTEGER|0'],['open_so_count','INTEGER|0'],
    ['ar_amount','DECIMAL(18,2)|0'],['ap_amount','DECIMAL(18,2)|0']
  ]},
];

function parseField(spec) {
  const [name, rest] = spec;
  const parts = rest.split('|');
  const typePart = parts[0];
  const def = parts[1];
  let tsType = 'number';
  let seqType = 'DataTypes.INTEGER';
  let allowNull = false;
  if (typePart.includes('null')) allowNull = true;
  if (typePart.startsWith('STRING')) { tsType = 'string'; seqType = `DataTypes.${typePart.replace('|null', '')}`; }
  else if (typePart.startsWith('DECIMAL')) { tsType = 'number'; seqType = `DataTypes.${typePart.replace('|null', '')}`; }
  else if (typePart.startsWith('BOOLEAN')) { tsType = 'boolean'; seqType = 'DataTypes.BOOLEAN'; }
  else if (typePart.startsWith('TEXT')) { tsType = 'string'; seqType = 'DataTypes.TEXT'; allowNull = true; }
  else if (typePart.startsWith('JSONB')) { tsType = 'object | null'; seqType = 'DataTypes.JSONB'; allowNull = true; }
  else if (typePart.startsWith('DATEONLY')) { tsType = 'string | null'; seqType = 'DataTypes.DATEONLY'; allowNull = true; }
  else if (typePart.startsWith('DATE')) { tsType = 'Date | null'; seqType = 'DataTypes.DATE'; allowNull = true; }
  else if (typePart.startsWith('INTEGER')) { tsType = allowNull ? 'number | null' : 'number'; seqType = 'DataTypes.INTEGER'; }
  return { name, tsType, seqType, allowNull, defaultVal: def ?? null };
}

for (const m of models) {
  const fields = [{ name: 'id', tsType: 'number', seqType: 'DataTypes.INTEGER', pk: true }];
  if (!m.noTenant) {
    fields.push({ name: 'tenant_id', tsType: 'number', seqType: 'DataTypes.INTEGER' });
    fields.push({ name: 'company_id', tsType: 'number', seqType: 'DataTypes.INTEGER' });
  }
  for (const spec of m.extras) fields.push(parseField(spec));
  if (!m.createdOnly) {
    fields.push({ name: 'created_at', tsType: 'Date', seqType: 'DataTypes.DATE', optional: true });
    fields.push({ name: 'updated_at', tsType: 'Date', seqType: 'DataTypes.DATE', optional: true });
  } else {
    fields.push({ name: 'created_at', tsType: 'Date', seqType: 'DataTypes.DATE', optional: true });
  }

  const attrIface = fields.filter((f) => !f.pk).map((f) => {
    const opt = f.optional ? '?' : '';
    const base = f.tsType.replace(' | null', '');
    const nullSuffix = f.allowNull && !f.optional ? ' | null' : '';
    return `  ${f.name}${opt}: ${base}${nullSuffix};`;
  }).join('\n');

  const classAttrs = fields.filter((f) => !f.pk).map((f) => {
    const opt = f.optional ? '?' : '!';
    const base = f.tsType.replace(' | null', '');
    const nullSuffix = f.allowNull && !f.optional ? ' | null' : '';
    return `  public ${f.name}${opt}: ${base}${nullSuffix};`;
  }).join('\n');

  const initBody = fields.map((f) => {
    let line = `    ${f.name}: { type: ${f.seqType}`;
    if (f.pk) {
      line += ', autoIncrement: true, primaryKey: true';
    } else if (!f.optional) {
      line += `, allowNull: ${f.allowNull === true}`;
    }
    if (f.defaultVal != null && !f.pk && !f.optional) {
      if (f.defaultVal === 'true' || f.defaultVal === 'false') line += `, defaultValue: ${f.defaultVal}`;
      else if (!Number.isNaN(Number(f.defaultVal))) line += `, defaultValue: ${f.defaultVal}`;
      else line += `, defaultValue: '${f.defaultVal}'`;
    }
    line += ' }';
    return line;
  }).join(',\n');

  const optionalKeys = fields.filter((f) => f.optional || (f.defaultVal != null && !f.pk)).map((f) => `'${f.name}'`).join(' | ');
  const timestamps = m.createdOnly ? 'timestamps: true, updatedAt: false' : 'timestamps: true';

  const content = `import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ${m.name}Attributes {
  id: number;
${attrIface}
}

type ${m.name}Creation = Optional<${m.name}Attributes, 'id'${optionalKeys ? ` | ${optionalKeys}` : ''}>;

class ${m.name} extends Model<${m.name}Attributes, ${m.name}Creation> implements ${m.name}Attributes {
  public id!: number;
${classAttrs}
}

${m.name}.init(
  {
${initBody}
  },
  { sequelize, tableName: '${m.table}', underscored: true, ${timestamps} }
);

export default ${m.name};
`;

  fs.writeFileSync(path.join(dir, `${m.name}.ts`), content);
}
console.log('Generated', models.length, 'models');
