import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgPurchaseOrderAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  doc_no: string;
  branch_id: number;
  financial_year_id?: number | null;
  partner_id: number;
  requisition_id?: number | null;
  status: string;
  order_date?: string | null;
  expected_date?: string | null;
  currency_code: string;
  over_receive_pct: number;
  remarks?: string | null;
  created_by?: number | null;
  updated_by?: number | null;
  approved_by?: number | null;
  approved_at?: Date | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type MfgPurchaseOrderCreation = Optional<
  MfgPurchaseOrderAttributes,
  | 'id'
  | 'financial_year_id'
  | 'requisition_id'
  | 'status'
  | 'order_date'
  | 'expected_date'
  | 'currency_code'
  | 'over_receive_pct'
  | 'remarks'
  | 'created_by'
  | 'updated_by'
  | 'approved_by'
  | 'approved_at'
  | 'is_active'
  | 'created_at'
  | 'updated_at'
>;

class MfgPurchaseOrder
  extends Model<MfgPurchaseOrderAttributes, MfgPurchaseOrderCreation>
  implements MfgPurchaseOrderAttributes
{
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public doc_no!: string;
  public branch_id!: number;
  public financial_year_id?: number | null;
  public partner_id!: number;
  public requisition_id?: number | null;
  public status!: string;
  public order_date?: string | null;
  public expected_date?: string | null;
  public currency_code!: string;
  public over_receive_pct!: number;
  public remarks?: string | null;
  public created_by?: number | null;
  public updated_by?: number | null;
  public approved_by?: number | null;
  public approved_at?: Date | null;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MfgPurchaseOrder.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    doc_no: { type: DataTypes.STRING(60), allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    financial_year_id: { type: DataTypes.INTEGER, allowNull: true },
    partner_id: { type: DataTypes.INTEGER, allowNull: false },
    requisition_id: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'draft' },
    order_date: { type: DataTypes.DATEONLY, allowNull: true },
    expected_date: { type: DataTypes.DATEONLY, allowNull: true },
    currency_code: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'INR' },
    over_receive_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    approved_by: { type: DataTypes.INTEGER, allowNull: true },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: 'mfg_purchase_orders', underscored: true, timestamps: true }
);

export default MfgPurchaseOrder;
