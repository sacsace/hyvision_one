import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface Attrs {
  id: number;
  tenant_id: number;
  company_id: number;
  doc_no: string;
  branch_id: number;
  financial_year_id?: number | null;
  requisition_id?: number | null;
  status: string;
  title?: string | null;
  rfq_date?: string | null;
  due_date?: string | null;
  currency_code: string;
  remarks?: string | null;
  selected_quotation_id?: number | null;
  selected_partner_id?: number | null;
  selected_by?: number | null;
  selected_at?: Date | null;
  created_by?: number | null;
  updated_by?: number | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type Creation = Optional<
  Attrs,
  | 'id'
  | 'financial_year_id'
  | 'requisition_id'
  | 'status'
  | 'title'
  | 'rfq_date'
  | 'due_date'
  | 'currency_code'
  | 'remarks'
  | 'selected_quotation_id'
  | 'selected_partner_id'
  | 'selected_by'
  | 'selected_at'
  | 'created_by'
  | 'updated_by'
  | 'is_active'
  | 'created_at'
  | 'updated_at'
>;

class MfgRfq extends Model<Attrs, Creation> implements Attrs {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public doc_no!: string;
  public branch_id!: number;
  public financial_year_id?: number | null;
  public requisition_id?: number | null;
  public status!: string;
  public title?: string | null;
  public rfq_date?: string | null;
  public due_date?: string | null;
  public currency_code!: string;
  public remarks?: string | null;
  public selected_quotation_id?: number | null;
  public selected_partner_id?: number | null;
  public selected_by?: number | null;
  public selected_at?: Date | null;
  public created_by?: number | null;
  public updated_by?: number | null;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MfgRfq.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    doc_no: { type: DataTypes.STRING(60), allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    financial_year_id: { type: DataTypes.INTEGER, allowNull: true },
    requisition_id: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'draft' },
    title: { type: DataTypes.STRING(200), allowNull: true },
    rfq_date: { type: DataTypes.DATEONLY, allowNull: true },
    due_date: { type: DataTypes.DATEONLY, allowNull: true },
    currency_code: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'INR' },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    selected_quotation_id: { type: DataTypes.INTEGER, allowNull: true },
    selected_partner_id: { type: DataTypes.INTEGER, allowNull: true },
    selected_by: { type: DataTypes.INTEGER, allowNull: true },
    selected_at: { type: DataTypes.DATE, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: 'mfg_rfqs', underscored: true, timestamps: true }
);

export default MfgRfq;
