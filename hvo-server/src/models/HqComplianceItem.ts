import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface HqComplianceItemAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  item_type: string;
  title: string;
  due_date?: string | null;
  status: 'pending' | 'done' | 'overdue';
  notes?: string | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type HqComplianceItemCreation = Optional<
  HqComplianceItemAttributes,
  'id' | 'due_date' | 'status' | 'notes' | 'is_active' | 'created_at' | 'updated_at'
>;

class HqComplianceItem extends Model<HqComplianceItemAttributes, HqComplianceItemCreation>
  implements HqComplianceItemAttributes
{
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public item_type!: string;
  public title!: string;
  public due_date?: string | null;
  public status!: 'pending' | 'done' | 'overdue';
  public notes?: string | null;
  public is_active!: boolean;
  public created_at?: Date;
  public updated_at?: Date;
}

HqComplianceItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    item_type: { type: DataTypes.STRING(30), allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    due_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'hq_compliance_items', underscored: true, timestamps: true }
);

export default HqComplianceItem;
