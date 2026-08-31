import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgStandardCostAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  product_id: number;
  bom_version_id: number;
  material_cost: number;
  labour_cost: number;
  machine_cost: number;
  overhead_cost: number;
  packing_cost: number;
  total_cost: number;
  unit_cost: number;
  effective_from: string | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type MfgStandardCostCreation = Optional<MfgStandardCostAttributes, 'id' | 'bom_version_id' | 'material_cost' | 'labour_cost' | 'machine_cost' | 'overhead_cost' | 'packing_cost' | 'total_cost' | 'unit_cost' | 'effective_from' | 'is_active' | 'created_at' | 'updated_at'>;

class MfgStandardCost extends Model<MfgStandardCostAttributes, MfgStandardCostCreation> implements MfgStandardCostAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public product_id!: number;
  public bom_version_id!: number;
  public material_cost!: number;
  public labour_cost!: number;
  public machine_cost!: number;
  public overhead_cost!: number;
  public packing_cost!: number;
  public total_cost!: number;
  public unit_cost!: number;
  public effective_from!: string | null;
  public is_active!: boolean;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgStandardCost.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    bom_version_id: { type: DataTypes.INTEGER, allowNull: true },
    material_cost: { type: DataTypes.DECIMAL(18,4), allowNull: false, defaultValue: 0 },
    labour_cost: { type: DataTypes.DECIMAL(18,4), allowNull: false, defaultValue: 0 },
    machine_cost: { type: DataTypes.DECIMAL(18,4), allowNull: false, defaultValue: 0 },
    overhead_cost: { type: DataTypes.DECIMAL(18,4), allowNull: false, defaultValue: 0 },
    packing_cost: { type: DataTypes.DECIMAL(18,4), allowNull: false, defaultValue: 0 },
    total_cost: { type: DataTypes.DECIMAL(18,4), allowNull: false, defaultValue: 0 },
    unit_cost: { type: DataTypes.DECIMAL(18,4), allowNull: false, defaultValue: 0 },
    effective_from: { type: DataTypes.DATEONLY, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_standard_costs', underscored: true, timestamps: true }
);

export default MfgStandardCost;
