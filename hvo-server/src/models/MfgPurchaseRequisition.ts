import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgPurchaseRequisitionAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  doc_no: string;
  branch_id: number;
  financial_year_id?: number | null;
  department_id?: number | null;
  requester_id?: number | null;
  status: string;
  request_date?: string | null;
  required_date?: string | null;
  purchase_type?: string | null;
  priority: string;
  currency_code: string;
  purpose?: string | null;
  urgency_reason?: string | null;
  delivery_location?: string | null;
  rejection_reason?: string | null;
  remarks?: string | null;
  created_by?: number | null;
  updated_by?: number | null;
  approved_by?: number | null;
  approved_at?: Date | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type MfgPurchaseRequisitionCreation = Optional<
  MfgPurchaseRequisitionAttributes,
  | 'id'
  | 'financial_year_id'
  | 'department_id'
  | 'requester_id'
  | 'status'
  | 'request_date'
  | 'required_date'
  | 'purchase_type'
  | 'priority'
  | 'currency_code'
  | 'purpose'
  | 'urgency_reason'
  | 'delivery_location'
  | 'rejection_reason'
  | 'remarks'
  | 'created_by'
  | 'updated_by'
  | 'approved_by'
  | 'approved_at'
  | 'is_active'
  | 'created_at'
  | 'updated_at'
>;

class MfgPurchaseRequisition
  extends Model<MfgPurchaseRequisitionAttributes, MfgPurchaseRequisitionCreation>
  implements MfgPurchaseRequisitionAttributes
{
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public doc_no!: string;
  public branch_id!: number;
  public financial_year_id?: number | null;
  public department_id?: number | null;
  public requester_id?: number | null;
  public status!: string;
  public request_date?: string | null;
  public required_date?: string | null;
  public purchase_type?: string | null;
  public priority!: string;
  public currency_code!: string;
  public purpose?: string | null;
  public urgency_reason?: string | null;
  public delivery_location?: string | null;
  public rejection_reason?: string | null;
  public remarks?: string | null;
  public created_by?: number | null;
  public updated_by?: number | null;
  public approved_by?: number | null;
  public approved_at?: Date | null;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MfgPurchaseRequisition.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    doc_no: { type: DataTypes.STRING(60), allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    financial_year_id: { type: DataTypes.INTEGER, allowNull: true },
    department_id: { type: DataTypes.INTEGER, allowNull: true },
    requester_id: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'draft' },
    request_date: { type: DataTypes.DATEONLY, allowNull: true },
    required_date: { type: DataTypes.DATEONLY, allowNull: true },
    purchase_type: { type: DataTypes.STRING(40), allowNull: true },
    priority: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'normal' },
    currency_code: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'INR' },
    purpose: { type: DataTypes.TEXT, allowNull: true },
    urgency_reason: { type: DataTypes.TEXT, allowNull: true },
    delivery_location: { type: DataTypes.STRING(255), allowNull: true },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    approved_by: { type: DataTypes.INTEGER, allowNull: true },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: 'mfg_purchase_requisitions', underscored: true, timestamps: true }
);

export default MfgPurchaseRequisition;
