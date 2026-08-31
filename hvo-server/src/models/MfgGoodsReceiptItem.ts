import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgGoodsReceiptItemAttributes {
  id: number;
  grn_id: number;
  po_item_id?: number | null;
  product_id: number;
  item_name: string;
  uom: string;
  qty: number;
  accepted_qty: number;
  rejected_qty: number;
  batch_no?: string | null;
  unit_cost: number;
  inspection_status: string;
  created_at?: Date;
  updated_at?: Date;
}

type MfgGoodsReceiptItemCreation = Optional<
  MfgGoodsReceiptItemAttributes,
  | 'id'
  | 'po_item_id'
  | 'uom'
  | 'qty'
  | 'accepted_qty'
  | 'rejected_qty'
  | 'batch_no'
  | 'unit_cost'
  | 'inspection_status'
  | 'created_at'
  | 'updated_at'
>;

class MfgGoodsReceiptItem
  extends Model<MfgGoodsReceiptItemAttributes, MfgGoodsReceiptItemCreation>
  implements MfgGoodsReceiptItemAttributes
{
  public id!: number;
  public grn_id!: number;
  public po_item_id?: number | null;
  public product_id!: number;
  public item_name!: string;
  public uom!: string;
  public qty!: number;
  public accepted_qty!: number;
  public rejected_qty!: number;
  public batch_no?: string | null;
  public unit_cost!: number;
  public inspection_status!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MfgGoodsReceiptItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    grn_id: { type: DataTypes.INTEGER, allowNull: false },
    po_item_id: { type: DataTypes.INTEGER, allowNull: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    item_name: { type: DataTypes.STRING(200), allowNull: false },
    uom: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'EA' },
    qty: { type: DataTypes.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
    accepted_qty: { type: DataTypes.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
    rejected_qty: { type: DataTypes.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
    batch_no: { type: DataTypes.STRING(50), allowNull: true },
    unit_cost: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
    inspection_status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
  },
  { sequelize, tableName: 'mfg_goods_receipt_items', underscored: true, timestamps: true }
);

export default MfgGoodsReceiptItem;
