import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgBinLocationAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  warehouse_id: number;
  code: string;
  name: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type MfgBinLocationCreation = Optional<
  MfgBinLocationAttributes,
  'id' | 'is_active' | 'created_at' | 'updated_at'
>;

class MfgBinLocation
  extends Model<MfgBinLocationAttributes, MfgBinLocationCreation>
  implements MfgBinLocationAttributes
{
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public warehouse_id!: number;
  public code!: string;
  public name!: string;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MfgBinLocation.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
    code: { type: DataTypes.STRING(30), allowNull: false },
    name: { type: DataTypes.STRING(200), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: 'mfg_bin_locations', underscored: true, timestamps: true }
);

export default MfgBinLocation;
