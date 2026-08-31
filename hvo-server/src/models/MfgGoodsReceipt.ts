import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgGoodsReceiptAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  doc_no: string;
  branch_id: number;
  financial_year_id?: number | null;
  po_id?: number | null;
  partner_id: number;
  warehouse_id: number;
  status: string;
  receipt_date?: string | null;
  remarks?: string | null;
  created_by?: number | null;
  updated_by?: number | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type MfgGoodsReceiptCreation = Optional<
  MfgGoodsReceiptAttributes,
  | 'id'
  | 'financial_year_id'
  | 'po_id'
  | 'status'
  | 'receipt_date'
  | 'remarks'
  | 'created_by'
  | 'updated_by'
  | 'is_active'
  | 'created_at'
  | 'updated_at'
>;

class MfgGoodsReceipt
  extends Model<MfgGoodsReceiptAttributes, MfgGoodsReceiptCreation>
  implements MfgGoodsReceiptAttributes
{
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public doc_no!: string;
  public branch_id!: number;
  public financial_year_id?: number | null;
  public po_id?: number | null;
  public partner_id!: number;
  public warehouse_id!: number;
  public status!: string;
  public receipt_date?: string | null;
  public remarks?: string | null;
  public created_by?: number | null;
  public updated_by?: number | null;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MfgGoodsReceipt.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    doc_no: { type: DataTypes.STRING(60), allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    financial_year_id: { type: DataTypes.INTEGER, allowNull: true },
    po_id: { type: DataTypes.INTEGER, allowNull: true },
    partner_id: { type: DataTypes.INTEGER, allowNull: false },
    warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'draft' },
    receipt_date: { type: DataTypes.DATEONLY, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: 'mfg_goods_receipts', underscored: true, timestamps: true }
);

export default MfgGoodsReceipt;
