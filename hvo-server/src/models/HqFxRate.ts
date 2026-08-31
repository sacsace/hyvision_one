import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface HqFxRateAttributes {
  id: number;
  tenant_id: number;
  rate_date: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  source?: string | null;
  created_by?: number | null;
  created_at?: Date;
  updated_at?: Date;
}

type HqFxRateCreation = Optional<HqFxRateAttributes, 'id' | 'source' | 'created_by' | 'created_at' | 'updated_at'>;

class HqFxRate extends Model<HqFxRateAttributes, HqFxRateCreation> implements HqFxRateAttributes {
  public id!: number;
  public tenant_id!: number;
  public rate_date!: string;
  public from_currency!: string;
  public to_currency!: string;
  public rate!: number;
  public source?: string | null;
  public created_by?: number | null;
  public created_at?: Date;
  public updated_at?: Date;
}

HqFxRate.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    rate_date: { type: DataTypes.DATEONLY, allowNull: false },
    from_currency: { type: DataTypes.CHAR(3), allowNull: false },
    to_currency: { type: DataTypes.CHAR(3), allowNull: false },
    rate: { type: DataTypes.DECIMAL(18, 8), allowNull: false },
    source: { type: DataTypes.STRING(80), allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'hq_fx_rates', underscored: true, timestamps: true }
);

export default HqFxRate;
