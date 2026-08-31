import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgPurchaseOrderItemAttributes {
  id: number;
  po_id: number;
  line_no: number;
  product_id?: number | null;
  item_name: string;
  uom: string;
  qty: number;
  received_qty: number;
  unit_price: number;
  tax_rate: number;
  created_at?: Date;
  updated_at?: Date;
}

type MfgPurchaseOrderItemCreation = Optional<
  MfgPurchaseOrderItemAttributes,
  'id' | 'product_id' | 'uom' | 'qty' | 'received_qty' | 'unit_price' | 'tax_rate' | 'created_at' | 'updated_at'
>;

class MfgPurchaseOrderItem
  extends Model<MfgPurchaseOrderItemAttributes, MfgPurchaseOrderItemCreation>
  implements MfgPurchaseOrderItemAttributes
{
  public id!: number;
  public po_id!: number;
  public line_no!: number;
  public product_id?: number | null;
  public item_name!: string;
  public uom!: string;
  public qty!: number;
  public received_qty!: number;
  public unit_price!: number;
  public tax_rate!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MfgPurchaseOrderItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    po_id: { type: DataTypes.INTEGER, allowNull: false },
    line_no: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    item_name: { type: DataTypes.STRING(200), allowNull: false },
    uom: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'EA' },
    qty: { type: DataTypes.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
    received_qty: { type: DataTypes.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
    unit_price: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
    tax_rate: { type: DataTypes.DECIMAL(8, 3), allowNull: false, defaultValue: 0 },
  },
  { sequelize, tableName: 'mfg_purchase_order_items', underscored: true, timestamps: true }
);

export default MfgPurchaseOrderItem;
