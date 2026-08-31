import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgProductionEntryAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  work_order_id: number;
  entry_date: string | null;
  good_qty: number;
  reject_qty: number;
  rework_qty: number;
  scrap_qty: number;
  warehouse_id: number;
  batch_no: string;
  created_by: number;
  status: string;
  created_at?: Date;
  updated_at?: Date;
}

type MfgProductionEntryCreation = Optional<MfgProductionEntryAttributes, 'id' | 'entry_date' | 'good_qty' | 'reject_qty' | 'rework_qty' | 'scrap_qty' | 'warehouse_id' | 'batch_no' | 'created_by' | 'status' | 'created_at' | 'updated_at'>;

class MfgProductionEntry extends Model<MfgProductionEntryAttributes, MfgProductionEntryCreation> implements MfgProductionEntryAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public work_order_id!: number;
  public entry_date!: string | null;
  public good_qty!: number;
  public reject_qty!: number;
  public rework_qty!: number;
  public scrap_qty!: number;
  public warehouse_id!: number;
  public batch_no!: string;
  public created_by!: number;
  public status!: string;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgProductionEntry.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    work_order_id: { type: DataTypes.INTEGER, allowNull: true },
    entry_date: { type: DataTypes.DATEONLY, allowNull: true },
    good_qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    reject_qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    rework_qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    scrap_qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    warehouse_id: { type: DataTypes.INTEGER, allowNull: true },
    batch_no: { type: DataTypes.STRING(50), allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_production_entries', underscored: true, timestamps: true }
);

export default MfgProductionEntry;
