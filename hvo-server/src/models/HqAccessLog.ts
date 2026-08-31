import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type HqAccessAction = 'view' | 'export' | 'approve' | 'login_hq';

interface HqAccessLogAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  user_id: number;
  action: HqAccessAction;
  resource?: string | null;
  resource_id?: string | null;
  ip_address?: string | null;
  country_code?: string | null;
  created_at?: Date;
}

type HqAccessLogCreation = Optional<
  HqAccessLogAttributes,
  'id' | 'resource' | 'resource_id' | 'ip_address' | 'country_code' | 'created_at'
>;

class HqAccessLog extends Model<HqAccessLogAttributes, HqAccessLogCreation> implements HqAccessLogAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public user_id!: number;
  public action!: HqAccessAction;
  public resource?: string | null;
  public resource_id?: string | null;
  public ip_address?: string | null;
  public country_code?: string | null;
  public created_at?: Date;
}

HqAccessLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    action: { type: DataTypes.STRING(30), allowNull: false },
    resource: { type: DataTypes.STRING(80), allowNull: true },
    resource_id: { type: DataTypes.STRING(80), allowNull: true },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
    country_code: { type: DataTypes.CHAR(2), allowNull: true },
    created_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'hq_access_logs', underscored: true, timestamps: false, createdAt: 'created_at', updatedAt: false }
);

export default HqAccessLog;
