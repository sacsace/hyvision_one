import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface Attrs {
  id: number;
  quotation_id: number;
  rfq_item_id?: number | null;
  line_no: number;
  product_id?: number | null;
  item_name: string;
  uom: string;
  qty: number;
  unit_price: number;
  tax_pct: number;
  line_amount: number;
  lead_time_days?: number | null;
  remarks?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

type Creation = Optional<
  Attrs,
  | 'id'
  | 'rfq_item_id'
  | 'product_id'
  | 'uom'
  | 'qty'
  | 'unit_price'
  | 'tax_pct'
  | 'line_amount'
  | 'lead_time_days'
  | 'remarks'
  | 'created_at'
  | 'updated_at'
>;

class MfgSupplierQuotationItem extends Model<Attrs, Creation> implements Attrs {
  public id!: number;
  public quotation_id!: number;
  public rfq_item_id?: number | null;
  public line_no!: number;
  public product_id?: number | null;
  public item_name!: string;
  public uom!: string;
  public qty!: number;
  public unit_price!: number;
  public tax_pct!: number;
  public line_amount!: number;
  public lead_time_days?: number | null;
  public remarks?: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MfgSupplierQuotationItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    quotation_id: { type: DataTypes.INTEGER, allowNull: false },
    rfq_item_id: { type: DataTypes.INTEGER, allowNull: true },
    line_no: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: true },
    item_name: { type: DataTypes.STRING(200), allowNull: false },
    uom: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'EA' },
    qty: { type: DataTypes.DECIMAL(18, 3), allowNull: false, defaultValue: 0 },
    unit_price: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
    tax_pct: { type: DataTypes.DECIMAL(8, 3), allowNull: false, defaultValue: 0 },
    line_amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    lead_time_days: { type: DataTypes.INTEGER, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'mfg_supplier_quotation_items', underscored: true, timestamps: true }
);

export default MfgSupplierQuotationItem;
