import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgBranchAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  code: string;
  name: string;
  gstin?: string | null;
  address?: string | null;
  state_code?: string | null;
  is_active: boolean;
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: Date;
  updated_at?: Date;
}

type MfgBranchCreation = Optional<
  MfgBranchAttributes,
  'id' | 'gstin' | 'address' | 'state_code' | 'is_active' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at'
>;

class MfgBranch extends Model<MfgBranchAttributes, MfgBranchCreation> implements MfgBranchAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public code!: string;
  public name!: string;
  public gstin?: string | null;
  public address?: string | null;
  public state_code?: string | null;
  public is_active!: boolean;
  public created_by?: number | null;
  public updated_by?: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MfgBranch.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    code: { type: DataTypes.STRING(30), allowNull: false },
    name: { type: DataTypes.STRING(200), allowNull: false },
    gstin: { type: DataTypes.STRING(20), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    state_code: { type: DataTypes.STRING(5), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, tableName: 'mfg_branches', underscored: true, timestamps: true }
);

export default MfgBranch;
