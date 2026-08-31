import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgStockReservationAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  product_id: number;
  warehouse_id: number;
  so_id: number;
  so_item_id: number;
  qty: number;
  status: string;
  created_by: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type MfgStockReservationCreation = Optional<MfgStockReservationAttributes, 'id' | 'warehouse_id' | 'qty' | 'status' | 'created_by' | 'is_active' | 'created_at' | 'updated_at'>;

class MfgStockReservation extends Model<MfgStockReservationAttributes, MfgStockReservationCreation> implements MfgStockReservationAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public product_id!: number;
  public warehouse_id!: number;
  public so_id!: number;
  public so_item_id!: number;
  public qty!: number;
  public status!: string;
  public created_by!: number;
  public is_active!: boolean;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgStockReservation.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    warehouse_id: { type: DataTypes.INTEGER, allowNull: true },
    so_id: { type: DataTypes.INTEGER, allowNull: true },
    so_item_id: { type: DataTypes.INTEGER, allowNull: true },
    qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_stock_reservations', underscored: true, timestamps: true }
);

export default MfgStockReservation;
