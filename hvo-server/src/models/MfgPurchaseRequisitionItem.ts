import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgPurchaseRequisitionItemAttributes {
  id: number;
  requisition_id: number;
  line_no: number;
  product_id?: number | null;
  item_name: string;
  uom: string;
  qty: number;
  estimated_unit_price: number;
  ordered_qty: number;
  preferred_partner_id?: number | null;
  required_date?: string | null;
  specification?: string | null;
  remarks?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

type MfgPurchaseRequisitionItemCreation = Optional<
  MfgPurchaseRequisitionItemAttributes,
  | 'id'
  | 'product_id'
  | 'uom'
  | 'qty'
  | 'estimated_unit_price'
  | 'ordered_qty'
  | 'preferred_partner_id'
  | 'required_date'
  | 'specification'
  | 'remarks'
  | 'created_at'
  | 'updated_at'
>;

class MfgPurchaseRequisitionItem
  extends Model<MfgPurchaseRequisitionItemAttributes, MfgPurchaseRequisitionItemCreation>
  implements MfgPurchaseRequisitionItemAttributes
{
  public id!: number;
  public requisition_id!: number;
  public line_no!: number;
  public product_id?: number | null;
  public item_name!: string;
  public uom!: string;
  public qty!: number;
  public estimated_unit_price!: number;
  public ordered_qty!: number;
  public preferred_partner_id?: number | null;
  public required_date?: string | null;
  public specification?: string | null;
  public remarks?: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MfgPurchaseRequisitionItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    requisition_id: { type: DataTypes.INTEGER, allowNull: false },
    line_no: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    item_name: { type: DataTypes.STRING(200), allowNull: false },
    uom: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'EA' },
    qty: { type: DataTypes.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
    estimated_unit_price: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
    ordered_qty: { type: DataTypes.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
    preferred_partner_id: { type: DataTypes.INTEGER, allowNull: true },
    required_date: { type: DataTypes.DATEONLY, allowNull: true },
    specification: { type: DataTypes.TEXT, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'mfg_purchase_requisition_items', underscored: true, timestamps: true }
);

export default MfgPurchaseRequisitionItem;
