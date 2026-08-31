import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgPeriodLockAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  financial_year_id: number;
  period_ym: string;
  module: string;
  is_locked: boolean;
  locked_by: number;
  locked_at: Date | null;
  reopen_by: number;
  reopen_at: Date | null;
  reopen_reason: string | null;
  created_at?: Date;
  updated_at?: Date;
}

type MfgPeriodLockCreation = Optional<MfgPeriodLockAttributes, 'id' | 'financial_year_id' | 'module' | 'is_locked' | 'locked_by' | 'locked_at' | 'reopen_by' | 'reopen_at' | 'reopen_reason' | 'created_at' | 'updated_at'>;

class MfgPeriodLock extends Model<MfgPeriodLockAttributes, MfgPeriodLockCreation> implements MfgPeriodLockAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public financial_year_id!: number;
  public period_ym!: string;
  public module!: string;
  public is_locked!: boolean;
  public locked_by!: number;
  public locked_at!: Date | null;
  public reopen_by!: number;
  public reopen_at!: Date | null;
  public reopen_reason!: string | null;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgPeriodLock.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    financial_year_id: { type: DataTypes.INTEGER, allowNull: true },
    period_ym: { type: DataTypes.STRING(7), allowNull: false },
    module: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'all' },
    is_locked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    locked_by: { type: DataTypes.INTEGER, allowNull: true },
    locked_at: { type: DataTypes.DATE, allowNull: true },
    reopen_by: { type: DataTypes.INTEGER, allowNull: true },
    reopen_at: { type: DataTypes.DATE, allowNull: true },
    reopen_reason: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_period_locks', underscored: true, timestamps: true }
);

export default MfgPeriodLock;
