import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgSalesOrderItemAttributes {
  id: number;
  so_id: number;
  line_no: number;
  product_id: number;
  item_name: string;
  uom: string;
  qty: number;
  delivered_qty: number;
  reserved_qty: number;
  unit_price: number;
  tax_rate: number;
  discount_pct: number;
  created_at?: Date;
  updated_at?: Date;
}

type MfgSalesOrderItemCreation = Optional<MfgSalesOrderItemAttributes, 'id' | 'product_id' | 'uom' | 'qty' | 'delivered_qty' | 'reserved_qty' | 'unit_price' | 'tax_rate' | 'discount_pct' | 'created_at' | 'updated_at'>;

class MfgSalesOrderItem extends Model<MfgSalesOrderItemAttributes, MfgSalesOrderItemCreation> implements MfgSalesOrderItemAttributes {
  public id!: number;
  public so_id!: number;
  public line_no!: number;
  public product_id!: number;
  public item_name!: string;
  public uom!: string;
  public qty!: number;
  public delivered_qty!: number;
  public reserved_qty!: number;
  public unit_price!: number;
  public tax_rate!: number;
  public discount_pct!: number;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgSalesOrderItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    so_id: { type: DataTypes.INTEGER, allowNull: true },
    line_no: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    item_name: { type: DataTypes.STRING(200), allowNull: false },
    uom: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'EA' },
    qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    delivered_qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    reserved_qty: { type: DataTypes.DECIMAL(18,3), allowNull: false, defaultValue: 0 },
    unit_price: { type: DataTypes.DECIMAL(18,4), allowNull: false, defaultValue: 0 },
    tax_rate: { type: DataTypes.DECIMAL(8,3), allowNull: false, defaultValue: 0 },
    discount_pct: { type: DataTypes.DECIMAL(8,3), allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_sales_order_items', underscored: true, timestamps: true }
);

export default MfgSalesOrderItem;
