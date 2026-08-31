import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgMaterialIssueAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  doc_no: string;
  work_order_id: number;
  warehouse_id: number;
  status: string;
  issue_date: string | null;
  created_by: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type MfgMaterialIssueCreation = Optional<MfgMaterialIssueAttributes, 'id' | 'status' | 'issue_date' | 'created_by' | 'is_active' | 'created_at' | 'updated_at'>;

class MfgMaterialIssue extends Model<MfgMaterialIssueAttributes, MfgMaterialIssueCreation> implements MfgMaterialIssueAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public doc_no!: string;
  public work_order_id!: number;
  public warehouse_id!: number;
  public status!: string;
  public issue_date!: string | null;
  public created_by!: number;
  public is_active!: boolean;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgMaterialIssue.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    doc_no: { type: DataTypes.STRING(60), allowNull: false },
    work_order_id: { type: DataTypes.INTEGER, allowNull: true },
    warehouse_id: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'draft' },
    issue_date: { type: DataTypes.DATEONLY, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_material_issues', underscored: true, timestamps: true }
);

export default MfgMaterialIssue;
