import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgRoutingAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  product_id: number;
  code: string;
  name: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type MfgRoutingCreation = Optional<MfgRoutingAttributes, 'id' | 'is_active' | 'created_at' | 'updated_at'>;

class MfgRouting extends Model<MfgRoutingAttributes, MfgRoutingCreation> implements MfgRoutingAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public product_id!: number;
  public code!: string;
  public name!: string;
  public is_active!: boolean;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgRouting.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    code: { type: DataTypes.STRING(30), allowNull: false },
    name: { type: DataTypes.STRING(200), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_routings', underscored: true, timestamps: true }
);

export default MfgRouting;
