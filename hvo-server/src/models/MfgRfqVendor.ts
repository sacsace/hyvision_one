import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface Attrs {
  id: number;
  rfq_id: number;
  partner_id: number;
  status: string;
  invited_at?: Date | null;
  responded_at?: Date | null;
  remarks?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

type Creation = Optional<
  Attrs,
  'id' | 'status' | 'invited_at' | 'responded_at' | 'remarks' | 'created_at' | 'updated_at'
>;

class MfgRfqVendor extends Model<Attrs, Creation> implements Attrs {
  public id!: number;
  public rfq_id!: number;
  public partner_id!: number;
  public status!: string;
  public invited_at?: Date | null;
  public responded_at?: Date | null;
  public remarks?: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MfgRfqVendor.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    rfq_id: { type: DataTypes.INTEGER, allowNull: false },
    partner_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'invited' },
    invited_at: { type: DataTypes.DATE, allowNull: true },
    responded_at: { type: DataTypes.DATE, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'mfg_rfq_vendors', underscored: true, timestamps: true }
);

export default MfgRfqVendor;
