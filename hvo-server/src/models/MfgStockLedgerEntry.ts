import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgStockLedgerEntryAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  financial_year_id?: number | null;
  branch_id?: number | null;
  product_id: number;
  warehouse_id: number;
  bin_id?: number | null;
  batch_no?: string | null;
  serial_no?: string | null;
  txn_date: string;
  txn_type: string;
  qty_in: number;
  qty_out: number;
  unit_cost: number;
  ref_doc_type?: string | null;
  ref_doc_id?: number | null;
  ref_doc_no?: string | null;
  remarks?: string | null;
  created_by?: number | null;
  created_at?: Date;
}

type MfgStockLedgerEntryCreation = Optional<
  MfgStockLedgerEntryAttributes,
  | 'id'
  | 'financial_year_id'
  | 'branch_id'
  | 'bin_id'
  | 'batch_no'
  | 'serial_no'
  | 'qty_in'
  | 'qty_out'
  | 'unit_cost'
  | 'ref_doc_type'
  | 'ref_doc_id'
  | 'ref_doc_no'
  | 'remarks'
  | 'created_by'
  | 'created_at'
>;

class MfgStockLedgerEntry
  extends Model<MfgStockLedgerEntryAttributes, MfgStockLedgerEntryCreation>
  implements MfgStockLedgerEntryAttributes
{
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public financial_year_id?: number | null;
  public branch_id?: number | null;
  public product_id!: number;
  public warehouse_id!: number;
  public bin_id?: number | null;
  public batch_no?: string | null;
  public serial_no?: string | null;
  public txn_date!: string;
  public txn_type!: string;
  public qty_in!: number;
  public qty_out!: number;
  public unit_cost!: number;
  public ref_doc_type?: string | null;
  public ref_doc_id?: number | null;
  public ref_doc_no?: string | null;
  public remarks?: string | null;
  public created_by?: number | null;
  public readonly created_at!: Date;
}

MfgStockLedgerEntry.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    financial_year_id: { type: DataTypes.INTEGER, allowNull: true },
    branch_id: { type: DataTypes.INTEGER, allowNull: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
    bin_id: { type: DataTypes.INTEGER, allowNull: true },
    batch_no: { type: DataTypes.STRING(50), allowNull: true },
    serial_no: { type: DataTypes.STRING(80), allowNull: true },
    txn_date: { type: DataTypes.DATEONLY, allowNull: false },
    txn_type: { type: DataTypes.STRING(30), allowNull: false },
    qty_in: { type: DataTypes.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
    qty_out: { type: DataTypes.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
    unit_cost: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
    ref_doc_type: { type: DataTypes.STRING(30), allowNull: true },
    ref_doc_id: { type: DataTypes.INTEGER, allowNull: true },
    ref_doc_no: { type: DataTypes.STRING(60), allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'mfg_stock_ledger_entries', underscored: true, timestamps: false, updatedAt: false }
);

export default MfgStockLedgerEntry;
