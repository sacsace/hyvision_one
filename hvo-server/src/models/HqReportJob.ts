import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type HqReportJobStatus = 'queued' | 'running' | 'done' | 'failed';

interface HqReportJobAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  report_key: string;
  status: HqReportJobStatus;
  format?: string | null;
  params?: object | null;
  result_snapshot_id?: number | null;
  error_message?: string | null;
  created_by?: number | null;
  created_at?: Date;
  finished_at?: Date | null;
}

type HqReportJobCreation = Optional<
  HqReportJobAttributes,
  'id' | 'status' | 'format' | 'params' | 'result_snapshot_id' | 'error_message' | 'created_by' | 'created_at' | 'finished_at'
>;

class HqReportJob extends Model<HqReportJobAttributes, HqReportJobCreation> implements HqReportJobAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public report_key!: string;
  public status!: HqReportJobStatus;
  public format?: string | null;
  public params?: object | null;
  public result_snapshot_id?: number | null;
  public error_message?: string | null;
  public created_by?: number | null;
  public created_at?: Date;
  public finished_at?: Date | null;
}

HqReportJob.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    report_key: { type: DataTypes.STRING(80), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'queued' },
    format: { type: DataTypes.STRING(10), allowNull: true },
    params: { type: DataTypes.JSONB, allowNull: true },
    result_snapshot_id: { type: DataTypes.INTEGER, allowNull: true },
    error_message: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE },
    finished_at: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'hq_report_jobs', underscored: true, timestamps: false, createdAt: 'created_at', updatedAt: false }
);

export default HqReportJob;
