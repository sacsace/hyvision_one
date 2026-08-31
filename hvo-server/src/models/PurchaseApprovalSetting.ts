import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PurchaseApprovalSettingAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  doc_type: string;
  min_amount: number;
  max_amount?: number | null;
  approver_role: string;
  step_order: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type Creation = Optional<
  PurchaseApprovalSettingAttributes,
  'id' | 'doc_type' | 'min_amount' | 'max_amount' | 'approver_role' | 'step_order' | 'is_active' | 'created_at' | 'updated_at'
>;

class PurchaseApprovalSetting
  extends Model<PurchaseApprovalSettingAttributes, Creation>
  implements PurchaseApprovalSettingAttributes
{
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public doc_type!: string;
  public min_amount!: number;
  public max_amount?: number | null;
  public approver_role!: string;
  public step_order!: number;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

PurchaseApprovalSetting.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    doc_type: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'PR' },
    min_amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    max_amount: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
    approver_role: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'purchase_manager' },
    step_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: 'purchase_approval_settings', underscored: true, timestamps: true }
);

export default PurchaseApprovalSetting;
