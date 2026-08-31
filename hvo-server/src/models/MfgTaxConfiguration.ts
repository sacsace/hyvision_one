import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgTaxConfigurationAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  tax_type: string;
  code: string;
  name: string;
  rate: number;
  threshold_amount: number;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  meta: object | null;
  created_at?: Date;
  updated_at?: Date;
}

type MfgTaxConfigurationCreation = Optional<MfgTaxConfigurationAttributes, 'id' | 'rate' | 'threshold_amount' | 'effective_from' | 'effective_to' | 'is_active' | 'meta' | 'created_at' | 'updated_at'>;

class MfgTaxConfiguration extends Model<MfgTaxConfigurationAttributes, MfgTaxConfigurationCreation> implements MfgTaxConfigurationAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public tax_type!: string;
  public code!: string;
  public name!: string;
  public rate!: number;
  public threshold_amount!: number;
  public effective_from!: string | null;
  public effective_to!: string | null;
  public is_active!: boolean;
  public meta!: object | null;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgTaxConfiguration.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    tax_type: { type: DataTypes.STRING(10), allowNull: false },
    code: { type: DataTypes.STRING(30), allowNull: false },
    name: { type: DataTypes.STRING(200), allowNull: false },
    rate: { type: DataTypes.DECIMAL(8,4), allowNull: false, defaultValue: 0 },
    threshold_amount: { type: DataTypes.DECIMAL(18,2), allowNull: false },
    effective_from: { type: DataTypes.DATEONLY, allowNull: true },
    effective_to: { type: DataTypes.DATEONLY, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    meta: { type: DataTypes.JSONB, allowNull: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_tax_configurations', underscored: true, timestamps: true }
);

export default MfgTaxConfiguration;
