import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface Attrs {
  id: number;
  rfq_id: number;
  line_no: number;
  requisition_item_id?: number | null;
  product_id?: number | null;
  item_name: string;
  uom: string;
  qty: number;
  specification?: string | null;
  remarks?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

type Creation = Optional<
  Attrs,
  'id' | 'requisition_item_id' | 'product_id' | 'uom' | 'qty' | 'specification' | 'remarks' | 'created_at' | 'updated_at'
>;

class MfgRfqItem extends Model<Attrs, Creation> implements Attrs {
  public id!: number;
  public rfq_id!: number;
  public line_no!: number;
  public requisition_item_id?: number | null;
  public product_id?: number | null;
  public item_name!: string;
  public uom!: string;
  public qty!: number;
  public specification?: string | null;
  public remarks?: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MfgRfqItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    rfq_id: { type: DataTypes.INTEGER, allowNull: false },
    line_no: { type: DataTypes.INTEGER, allowNull: false },
    requisition_item_id: { type: DataTypes.INTEGER, allowNull: true },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    item_name: { type: DataTypes.STRING(200), allowNull: false },
    uom: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'EA' },
    qty: { type: DataTypes.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
    specification: { type: DataTypes.TEXT, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'mfg_rfq_items', underscored: true, timestamps: true }
);

export default MfgRfqItem;
