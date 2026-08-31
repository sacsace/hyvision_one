import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgMaterialRequirementAttributes {
  id: number;
  plan_id: number;
  product_id: number;
  required_qty: number;
  available_qty: number;
  shortage_qty: number;
  suggested_pr: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type MfgMaterialRequirementCreation = Optional<MfgMaterialRequirementAttributes, 'id' | 'plan_id' | 'required_qty' | 'available_qty' | 'shortage_qty' | 'suggested_pr' | 'created_at' | 'updated_at'>;

class MfgMaterialRequirement extends Model<MfgMaterialRequirementAttributes, MfgMaterialRequirementCreation> implements MfgMaterialRequirementAttributes {
  public id!: number;
  public plan_id!: number;
  public product_id!: number;
  public required_qty!: number;
  public available_qty!: number;
  public shortage_qty!: number;
  public suggested_pr!: boolean;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgMaterialRequirement.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    plan_id: { type: DataTypes.INTEGER, allowNull: true },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    required_qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    available_qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    shortage_qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    suggested_pr: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_material_requirements', underscored: true, timestamps: true }
);

export default MfgMaterialRequirement;
