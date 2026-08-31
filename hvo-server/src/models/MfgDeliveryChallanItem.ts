import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgDeliveryChallanItemAttributes {
  id: number;
  challan_id: number;
  so_item_id: number;
  product_id: number;
  item_name: string;
  uom: string;
  qty: number;
  batch_no: string;
  created_at?: Date;
  updated_at?: Date;
}

type MfgDeliveryChallanItemCreation = Optional<MfgDeliveryChallanItemAttributes, 'id' | 'so_item_id' | 'uom' | 'qty' | 'batch_no' | 'created_at' | 'updated_at'>;

class MfgDeliveryChallanItem extends Model<MfgDeliveryChallanItemAttributes, MfgDeliveryChallanItemCreation> implements MfgDeliveryChallanItemAttributes {
  public id!: number;
  public challan_id!: number;
  public so_item_id!: number;
  public product_id!: number;
  public item_name!: string;
  public uom!: string;
  public qty!: number;
  public batch_no!: string;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgDeliveryChallanItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    challan_id: { type: DataTypes.INTEGER, allowNull: false },
    so_item_id: { type: DataTypes.INTEGER, allowNull: true },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    item_name: { type: DataTypes.STRING(200), allowNull: false },
    uom: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'EA' },
    qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    batch_no: { type: DataTypes.STRING(50), allowNull: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_delivery_challan_items', underscored: true, timestamps: true }
);

export default MfgDeliveryChallanItem;
