import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface Attrs {
  id: number;
  tenant_id: number;
  company_id: number;
  doc_no: string;
  rfq_id: number;
  partner_id: number;
  revision: number;
  status: string;
  quote_date?: string | null;
  valid_until?: string | null;
  currency_code: string;
  payment_terms?: string | null;
  delivery_days?: number | null;
  freight_amount: number;
  other_charges: number;
  tax_amount: number;
  total_amount: number;
  remarks?: string | null;
  is_selected: boolean;
  created_by?: number | null;
  updated_by?: number | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type Creation = Optional<
  Attrs,
  | 'id'
  | 'revision'
  | 'status'
  | 'quote_date'
  | 'valid_until'
  | 'currency_code'
  | 'payment_terms'
  | 'delivery_days'
  | 'freight_amount'
  | 'other_charges'
  | 'tax_amount'
  | 'total_amount'
  | 'remarks'
  | 'is_selected'
  | 'created_by'
  | 'updated_by'
  | 'is_active'
  | 'created_at'
  | 'updated_at'
>;

class MfgSupplierQuotation extends Model<Attrs, Creation> implements Attrs {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public doc_no!: string;
  public rfq_id!: number;
  public partner_id!: number;
  public revision!: number;
  public status!: string;
  public quote_date?: string | null;
  public valid_until?: string | null;
  public currency_code!: string;
  public payment_terms?: string | null;
  public delivery_days?: number | null;
  public freight_amount!: number;
  public other_charges!: number;
  public tax_amount!: number;
  public total_amount!: number;
  public remarks?: string | null;
  public is_selected!: boolean;
  public created_by?: number | null;
  public updated_by?: number | null;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MfgSupplierQuotation.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    doc_no: { type: DataTypes.STRING(60), allowNull: false },
    rfq_id: { type: DataTypes.INTEGER, allowNull: false },
    partner_id: { type: DataTypes.INTEGER, allowNull: false },
    revision: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'draft' },
    quote_date: { type: DataTypes.DATEONLY, allowNull: true },
    valid_until: { type: DataTypes.DATEONLY, allowNull: true },
    currency_code: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'INR' },
    payment_terms: { type: DataTypes.STRING(120), allowNull: true },
    delivery_days: { type: DataTypes.INTEGER, allowNull: true },
    freight_amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    other_charges: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    tax_amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    total_amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    is_selected: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: 'mfg_supplier_quotations', underscored: true, timestamps: true }
);

export default MfgSupplierQuotation;
