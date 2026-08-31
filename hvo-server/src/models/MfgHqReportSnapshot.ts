import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgHqReportSnapshotAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  report_type: string;
  report_period: string;
  title: string;
  payload: object | null;
  created_by: number;
  created_at?: Date;
}

type MfgHqReportSnapshotCreation = Optional<MfgHqReportSnapshotAttributes, 'id' | 'payload' | 'created_by' | 'created_at'>;

class MfgHqReportSnapshot extends Model<MfgHqReportSnapshotAttributes, MfgHqReportSnapshotCreation> implements MfgHqReportSnapshotAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public report_type!: string;
  public report_period!: string;
  public title!: string;
  public payload!: object | null;
  public created_by!: number;
  public created_at?: Date;
}

MfgHqReportSnapshot.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    report_type: { type: DataTypes.STRING(30), allowNull: false },
    report_period: { type: DataTypes.STRING(20), allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    payload: { type: DataTypes.JSONB, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_hq_report_snapshots', underscored: true, timestamps: true, updatedAt: false }
);

export default MfgHqReportSnapshot;
