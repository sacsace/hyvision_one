import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgSalesOrderAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  doc_no: string;
  branch_id: number;
  financial_year_id: number;
  partner_id: number;
  status: string;
  order_date: string | null;
  currency_code: string;
  credit_limit_check: boolean;
  remarks: string | null;
  created_by: number;
  updated_by: number;
  approved_by: number;
  approved_at: Date | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type MfgSalesOrderCreation = Optional<MfgSalesOrderAttributes, 'id' | 'branch_id' | 'financial_year_id' | 'status' | 'order_date' | 'currency_code' | 'credit_limit_check' | 'remarks' | 'created_by' | 'updated_by' | 'approved_by' | 'approved_at' | 'is_active' | 'created_at' | 'updated_at'>;

class MfgSalesOrder extends Model<MfgSalesOrderAttributes, MfgSalesOrderCreation> implements MfgSalesOrderAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public doc_no!: string;
  public branch_id!: number;
  public financial_year_id!: number;
  public partner_id!: number;
  public status!: string;
  public order_date!: string | null;
  public currency_code!: string;
  public credit_limit_check!: boolean;
  public remarks!: string | null;
  public created_by!: number;
  public updated_by!: number;
  public approved_by!: number;
  public approved_at!: Date | null;
  public is_active!: boolean;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgSalesOrder.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    doc_no: { type: DataTypes.STRING(60), allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: true },
    financial_year_id: { type: DataTypes.INTEGER, allowNull: true },
    partner_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'draft' },
    order_date: { type: DataTypes.DATEONLY, allowNull: true },
    currency_code: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'INR' },
    credit_limit_check: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    approved_by: { type: DataTypes.INTEGER, allowNull: true },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_sales_orders', underscored: true, timestamps: true }
);

export default MfgSalesOrder;
