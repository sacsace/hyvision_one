import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgScrapEntryAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  work_order_id: number;
  product_id: number;
  qty: number;
  reason: string | null;
  entry_date: string | null;
  created_by: number;
  created_at?: Date;
  updated_at?: Date;
}

type MfgScrapEntryCreation = Optional<MfgScrapEntryAttributes, 'id' | 'work_order_id' | 'qty' | 'reason' | 'entry_date' | 'created_by' | 'created_at' | 'updated_at'>;

class MfgScrapEntry extends Model<MfgScrapEntryAttributes, MfgScrapEntryCreation> implements MfgScrapEntryAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public work_order_id!: number;
  public product_id!: number;
  public qty!: number;
  public reason!: string | null;
  public entry_date!: string | null;
  public created_by!: number;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgScrapEntry.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    work_order_id: { type: DataTypes.INTEGER, allowNull: true },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    reason: { type: DataTypes.TEXT, allowNull: true },
    entry_date: { type: DataTypes.DATEONLY, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_scrap_entries', underscored: true, timestamps: true }
);

export default MfgScrapEntry;
