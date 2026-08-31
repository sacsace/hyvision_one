import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgCreditNoteAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  doc_no: string;
  partner_id: number;
  invoice_id: number;
  so_id: number;
  status: string;
  note_date: string | null;
  amount: number;
  tax_amount: number;
  remarks: string | null;
  created_by: number;
  updated_by: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type MfgCreditNoteCreation = Optional<MfgCreditNoteAttributes, 'id' | 'invoice_id' | 'so_id' | 'status' | 'note_date' | 'amount' | 'tax_amount' | 'remarks' | 'created_by' | 'updated_by' | 'is_active' | 'created_at' | 'updated_at'>;

class MfgCreditNote extends Model<MfgCreditNoteAttributes, MfgCreditNoteCreation> implements MfgCreditNoteAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public doc_no!: string;
  public partner_id!: number;
  public invoice_id!: number;
  public so_id!: number;
  public status!: string;
  public note_date!: string | null;
  public amount!: number;
  public tax_amount!: number;
  public remarks!: string | null;
  public created_by!: number;
  public updated_by!: number;
  public is_active!: boolean;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgCreditNote.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    doc_no: { type: DataTypes.STRING(60), allowNull: false },
    partner_id: { type: DataTypes.INTEGER, allowNull: false },
    invoice_id: { type: DataTypes.INTEGER, allowNull: true },
    so_id: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'draft' },
    note_date: { type: DataTypes.DATEONLY, allowNull: true },
    amount: { type: DataTypes.DECIMAL(18,2), allowNull: false, defaultValue: 0 },
    tax_amount: { type: DataTypes.DECIMAL(18,2), allowNull: false, defaultValue: 0 },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_credit_notes', underscored: true, timestamps: true }
);

export default MfgCreditNote;
