import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgQualityInspectionAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  grn_id: number;
  grn_item_id?: number | null;
  inspection_type: string;
  status: string;
  inspected_by?: number | null;
  inspected_at?: Date | null;
  remarks?: string | null;
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: Date;
  updated_at?: Date;
}

type MfgQualityInspectionCreation = Optional<
  MfgQualityInspectionAttributes,
  | 'id'
  | 'grn_item_id'
  | 'inspection_type'
  | 'status'
  | 'inspected_by'
  | 'inspected_at'
  | 'remarks'
  | 'created_by'
  | 'updated_by'
  | 'created_at'
  | 'updated_at'
>;

class MfgQualityInspection
  extends Model<MfgQualityInspectionAttributes, MfgQualityInspectionCreation>
  implements MfgQualityInspectionAttributes
{
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public grn_id!: number;
  public grn_item_id?: number | null;
  public inspection_type!: string;
  public status!: string;
  public inspected_by?: number | null;
  public inspected_at?: Date | null;
  public remarks?: string | null;
  public created_by?: number | null;
  public updated_by?: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MfgQualityInspection.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    grn_id: { type: DataTypes.INTEGER, allowNull: false },
    grn_item_id: { type: DataTypes.INTEGER, allowNull: true },
    inspection_type: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'incoming' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    inspected_by: { type: DataTypes.INTEGER, allowNull: true },
    inspected_at: { type: DataTypes.DATE, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, tableName: 'mfg_quality_inspections', underscored: true, timestamps: true }
);

export default MfgQualityInspection;
