import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgWorkOrderAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  branch_id: number;
  financial_year_id: number;
  doc_no: string;
  product_id: number;
  bom_version_id: number;
  routing_id: number;
  plan_qty: number;
  completed_qty: number;
  scrap_qty: number;
  status: string;
  planned_start: string | null;
  planned_end: string | null;
  warehouse_id: number;
  created_by: number;
  updated_by: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type MfgWorkOrderCreation = Optional<MfgWorkOrderAttributes, 'id' | 'branch_id' | 'financial_year_id' | 'bom_version_id' | 'routing_id' | 'plan_qty' | 'completed_qty' | 'scrap_qty' | 'status' | 'planned_start' | 'planned_end' | 'warehouse_id' | 'created_by' | 'updated_by' | 'is_active' | 'created_at' | 'updated_at'>;

class MfgWorkOrder extends Model<MfgWorkOrderAttributes, MfgWorkOrderCreation> implements MfgWorkOrderAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public branch_id!: number;
  public financial_year_id!: number;
  public doc_no!: string;
  public product_id!: number;
  public bom_version_id!: number;
  public routing_id!: number;
  public plan_qty!: number;
  public completed_qty!: number;
  public scrap_qty!: number;
  public status!: string;
  public planned_start!: string | null;
  public planned_end!: string | null;
  public warehouse_id!: number;
  public created_by!: number;
  public updated_by!: number;
  public is_active!: boolean;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgWorkOrder.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: true },
    financial_year_id: { type: DataTypes.INTEGER, allowNull: true },
    doc_no: { type: DataTypes.STRING(60), allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    bom_version_id: { type: DataTypes.INTEGER, allowNull: true },
    routing_id: { type: DataTypes.INTEGER, allowNull: true },
    plan_qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    completed_qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    scrap_qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'draft' },
    planned_start: { type: DataTypes.DATEONLY, allowNull: true },
    planned_end: { type: DataTypes.DATEONLY, allowNull: true },
    warehouse_id: { type: DataTypes.INTEGER, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_work_orders', underscored: true, timestamps: true }
);

export default MfgWorkOrder;
