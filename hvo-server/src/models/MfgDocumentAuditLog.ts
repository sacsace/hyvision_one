import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgDocumentAuditLogAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  doc_type: string;
  doc_id: number;
  action: string;
  actor_user_id?: number | null;
  before_json?: Record<string, unknown> | null;
  after_json?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at?: Date;
}

type MfgDocumentAuditLogCreation = Optional<
  MfgDocumentAuditLogAttributes,
  'id' | 'actor_user_id' | 'before_json' | 'after_json' | 'ip_address' | 'created_at'
>;

class MfgDocumentAuditLog
  extends Model<MfgDocumentAuditLogAttributes, MfgDocumentAuditLogCreation>
  implements MfgDocumentAuditLogAttributes
{
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public doc_type!: string;
  public doc_id!: number;
  public action!: string;
  public actor_user_id?: number | null;
  public before_json?: Record<string, unknown> | null;
  public after_json?: Record<string, unknown> | null;
  public ip_address?: string | null;
  public readonly created_at!: Date;
}

MfgDocumentAuditLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    doc_type: { type: DataTypes.STRING(30), allowNull: false },
    doc_id: { type: DataTypes.INTEGER, allowNull: false },
    action: { type: DataTypes.STRING(40), allowNull: false },
    actor_user_id: { type: DataTypes.INTEGER, allowNull: true },
    before_json: { type: DataTypes.JSONB, allowNull: true },
    after_json: { type: DataTypes.JSONB, allowNull: true },
    ip_address: { type: DataTypes.STRING(64), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'mfg_document_audit_logs', underscored: true, timestamps: false, updatedAt: false }
);

export default MfgDocumentAuditLog;
