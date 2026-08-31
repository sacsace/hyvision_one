import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgMaterialIssueItemAttributes {
  id: number;
  issue_id: number;
  product_id: number;
  qty: number;
  batch_no: string;
  unit_cost: number;
  created_at?: Date;
  updated_at?: Date;
}

type MfgMaterialIssueItemCreation = Optional<MfgMaterialIssueItemAttributes, 'id' | 'qty' | 'batch_no' | 'unit_cost' | 'created_at' | 'updated_at'>;

class MfgMaterialIssueItem extends Model<MfgMaterialIssueItemAttributes, MfgMaterialIssueItemCreation> implements MfgMaterialIssueItemAttributes {
  public id!: number;
  public issue_id!: number;
  public product_id!: number;
  public qty!: number;
  public batch_no!: string;
  public unit_cost!: number;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgMaterialIssueItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    issue_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    batch_no: { type: DataTypes.STRING(50), allowNull: true },
    unit_cost: { type: DataTypes.DECIMAL(18,4), allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_material_issue_items', underscored: true, timestamps: true }
);

export default MfgMaterialIssueItem;
