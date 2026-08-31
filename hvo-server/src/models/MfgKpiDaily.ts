import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgKpiDailyAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  kpi_date: string | null;
  sales_amount: number;
  cogs_amount: number;
  inventory_value: number;
  production_qty: number;
  scrap_qty: number;
  yield_pct: number;
  open_po_count: number;
  open_so_count: number;
  ar_amount: number;
  ap_amount: number;
  created_at?: Date;
  updated_at?: Date;
}

type MfgKpiDailyCreation = Optional<MfgKpiDailyAttributes, 'id' | 'sales_amount' | 'cogs_amount' | 'inventory_value' | 'production_qty' | 'scrap_qty' | 'yield_pct' | 'open_po_count' | 'open_so_count' | 'ar_amount' | 'ap_amount' | 'created_at' | 'updated_at'>;

class MfgKpiDaily extends Model<MfgKpiDailyAttributes, MfgKpiDailyCreation> implements MfgKpiDailyAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public kpi_date!: string | null;
  public sales_amount!: number;
  public cogs_amount!: number;
  public inventory_value!: number;
  public production_qty!: number;
  public scrap_qty!: number;
  public yield_pct!: number;
  public open_po_count!: number;
  public open_so_count!: number;
  public ar_amount!: number;
  public ap_amount!: number;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgKpiDaily.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    kpi_date: { type: DataTypes.DATEONLY, allowNull: true },
    sales_amount: { type: DataTypes.DECIMAL(18,2), allowNull: false, defaultValue: 0 },
    cogs_amount: { type: DataTypes.DECIMAL(18,2), allowNull: false, defaultValue: 0 },
    inventory_value: { type: DataTypes.DECIMAL(18,2), allowNull: false, defaultValue: 0 },
    production_qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    scrap_qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    yield_pct: { type: DataTypes.DECIMAL(8,3), allowNull: false, defaultValue: 0 },
    open_po_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    open_so_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ar_amount: { type: DataTypes.DECIMAL(18,2), allowNull: false, defaultValue: 0 },
    ap_amount: { type: DataTypes.DECIMAL(18,2), allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_kpi_daily', underscored: true, timestamps: true }
);

export default MfgKpiDaily;
