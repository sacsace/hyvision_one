import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgBomItemAttributes {
  id: number;
  bom_version_id: number;
  line_no: number;
  component_product_id: number;
  qty: number;
  uom: string;
  scrap_pct: number;
  is_alternate: boolean;
  operation_seq: number;
  created_at?: Date;
  updated_at?: Date;
}

type MfgBomItemCreation = Optional<MfgBomItemAttributes, 'id' | 'qty' | 'uom' | 'scrap_pct' | 'is_alternate' | 'operation_seq' | 'created_at' | 'updated_at'>;

class MfgBomItem extends Model<MfgBomItemAttributes, MfgBomItemCreation> implements MfgBomItemAttributes {
  public id!: number;
  public bom_version_id!: number;
  public line_no!: number;
  public component_product_id!: number;
  public qty!: number;
  public uom!: string;
  public scrap_pct!: number;
  public is_alternate!: boolean;
  public operation_seq!: number;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgBomItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    bom_version_id: { type: DataTypes.INTEGER, allowNull: true },
    line_no: { type: DataTypes.INTEGER, allowNull: false },
    component_product_id: { type: DataTypes.INTEGER, allowNull: true },
    qty: { type: DataTypes.DECIMAL(18,6), allowNull: false, defaultValue: 0 },
    uom: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'EA' },
    scrap_pct: { type: DataTypes.DECIMAL(8,3), allowNull: false, defaultValue: 0 },
    is_alternate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    operation_seq: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_bom_items', underscored: true, timestamps: true }
);

export default MfgBomItem;
