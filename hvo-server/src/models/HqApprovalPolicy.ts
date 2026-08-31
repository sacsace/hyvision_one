import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface HqApprovalPolicyAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  event_type: string;
  threshold_amount?: number | null;
  is_active: boolean;
  require_hq_approve: boolean;
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: Date;
  updated_at?: Date;
}

type HqApprovalPolicyCreation = Optional<
  HqApprovalPolicyAttributes,
  'id' | 'threshold_amount' | 'is_active' | 'require_hq_approve' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at'
>;

class HqApprovalPolicy extends Model<HqApprovalPolicyAttributes, HqApprovalPolicyCreation> implements HqApprovalPolicyAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public event_type!: string;
  public threshold_amount?: number | null;
  public is_active!: boolean;
  public require_hq_approve!: boolean;
  public created_by?: number | null;
  public updated_by?: number | null;
  public created_at?: Date;
  public updated_at?: Date;
}

HqApprovalPolicy.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    event_type: { type: DataTypes.STRING(60), allowNull: false },
    threshold_amount: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    require_hq_approve: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'hq_approval_policies', underscored: true, timestamps: true }
);

export default HqApprovalPolicy;
