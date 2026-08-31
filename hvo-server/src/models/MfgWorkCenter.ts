import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgWorkCenterAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  code: string;
  name: string;
  is_active: boolean;
  created_by: number;
  updated_by: number;
  created_at?: Date;
  updated_at?: Date;
}

type MfgWorkCenterCreation = Optional<MfgWorkCenterAttributes, 'id' | 'is_active' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at'>;

class MfgWorkCenter extends Model<MfgWorkCenterAttributes, MfgWorkCenterCreation> implements MfgWorkCenterAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public code!: string;
  public name!: string;
  public is_active!: boolean;
  public created_by!: number;
  public updated_by!: number;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgWorkCenter.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    code: { type: DataTypes.STRING(30), allowNull: false },
    name: { type: DataTypes.STRING(200), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_work_centers', underscored: true, timestamps: true }
);

export default MfgWorkCenter;
