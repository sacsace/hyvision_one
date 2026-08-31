import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface HqExportLogAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  user_id: number;
  export_type: string;
  report_key?: string | null;
  row_count?: number | null;
  format: 'excel' | 'pdf';
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: Date;
}

type HqExportLogCreation = Optional<
  HqExportLogAttributes,
  'id' | 'report_key' | 'row_count' | 'format' | 'ip_address' | 'user_agent' | 'created_at'
>;

class HqExportLog extends Model<HqExportLogAttributes, HqExportLogCreation> implements HqExportLogAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public user_id!: number;
  public export_type!: string;
  public report_key?: string | null;
  public row_count?: number | null;
  public format!: 'excel' | 'pdf';
  public ip_address?: string | null;
  public user_agent?: string | null;
  public created_at?: Date;
}

HqExportLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    export_type: { type: DataTypes.STRING(60), allowNull: false },
    report_key: { type: DataTypes.STRING(80), allowNull: true },
    row_count: { type: DataTypes.INTEGER, allowNull: true },
    format: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'excel' },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
    user_agent: { type: DataTypes.STRING(500), allowNull: true },
    created_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'hq_export_logs', underscored: true, timestamps: false, createdAt: 'created_at', updatedAt: false }
);

export default HqExportLog;
