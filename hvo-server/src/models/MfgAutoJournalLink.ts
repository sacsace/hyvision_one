import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgAutoJournalLinkAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  source_doc_type: string;
  source_doc_id: number;
  gl_voucher_id: number;
  status: string;
  message: string | null;
  created_at?: Date;
  updated_at?: Date;
}

type MfgAutoJournalLinkCreation = Optional<MfgAutoJournalLinkAttributes, 'id' | 'gl_voucher_id' | 'status' | 'message' | 'created_at' | 'updated_at'>;

class MfgAutoJournalLink extends Model<MfgAutoJournalLinkAttributes, MfgAutoJournalLinkCreation> implements MfgAutoJournalLinkAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public source_doc_type!: string;
  public source_doc_id!: number;
  public gl_voucher_id!: number;
  public status!: string;
  public message!: string | null;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgAutoJournalLink.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    source_doc_type: { type: DataTypes.STRING(30), allowNull: false },
    source_doc_id: { type: DataTypes.INTEGER, allowNull: false },
    gl_voucher_id: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    message: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_auto_journal_links', underscored: true, timestamps: true }
);

export default MfgAutoJournalLink;
