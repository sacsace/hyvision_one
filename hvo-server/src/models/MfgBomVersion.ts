import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgBomVersionAttributes {
  id: number;
  bom_id: number;
  version_no: number;
  effective_from: string | null;
  effective_to: string | null;
  status: string;
  yield_pct: number;
  scrap_pct: number;
  approved_by: number;
  approved_at: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

type MfgBomVersionCreation = Optional<MfgBomVersionAttributes, 'id' | 'effective_from' | 'effective_to' | 'status' | 'yield_pct' | 'scrap_pct' | 'approved_by' | 'approved_at' | 'created_at' | 'updated_at'>;

class MfgBomVersion extends Model<MfgBomVersionAttributes, MfgBomVersionCreation> implements MfgBomVersionAttributes {
  public id!: number;
  public bom_id!: number;
  public version_no!: number;
  public effective_from!: string | null;
  public effective_to!: string | null;
  public status!: string;
  public yield_pct!: number;
  public scrap_pct!: number;
  public approved_by!: number;
  public approved_at!: Date | null;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgBomVersion.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    bom_id: { type: DataTypes.INTEGER, allowNull: false },
    version_no: { type: DataTypes.INTEGER, allowNull: false },
    effective_from: { type: DataTypes.DATEONLY, allowNull: true },
    effective_to: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    yield_pct: { type: DataTypes.DECIMAL(8,3), allowNull: false, defaultValue: 100 },
    scrap_pct: { type: DataTypes.DECIMAL(8,3), allowNull: false, defaultValue: 0 },
    approved_by: { type: DataTypes.INTEGER, allowNull: true },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_bom_versions', underscored: true, timestamps: true }
);

export default MfgBomVersion;
