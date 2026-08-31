import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgDocumentSequenceAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  branch_id?: number | null;
  financial_year_id?: number | null;
  doc_type: string;
  prefix: string;
  next_number: number;
  pad_length: number;
  created_at?: Date;
  updated_at?: Date;
}

type MfgDocumentSequenceCreation = Optional<
  MfgDocumentSequenceAttributes,
  'id' | 'branch_id' | 'financial_year_id' | 'prefix' | 'next_number' | 'pad_length' | 'created_at' | 'updated_at'
>;

class MfgDocumentSequence
  extends Model<MfgDocumentSequenceAttributes, MfgDocumentSequenceCreation>
  implements MfgDocumentSequenceAttributes
{
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public branch_id?: number | null;
  public financial_year_id?: number | null;
  public doc_type!: string;
  public prefix!: string;
  public next_number!: number;
  public pad_length!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MfgDocumentSequence.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: true },
    financial_year_id: { type: DataTypes.INTEGER, allowNull: true },
    doc_type: { type: DataTypes.STRING(30), allowNull: false },
    prefix: { type: DataTypes.STRING(40), allowNull: false, defaultValue: '' },
    next_number: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    pad_length: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
  },
  { sequelize, tableName: 'mfg_document_sequences', underscored: true, timestamps: true }
);

export default MfgDocumentSequence;
