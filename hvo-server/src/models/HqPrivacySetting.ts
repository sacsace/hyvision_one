import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface HqPrivacySettingAttributes {
  id: number;
  tenant_id: number;
  purpose?: string | null;
  retention_days: number;
  cross_border_allowed: boolean;
  legal_basis?: string | null;
  contact_email?: string | null;
  meta?: object | null;
  created_at?: Date;
  updated_at?: Date;
}

type HqPrivacySettingCreation = Optional<
  HqPrivacySettingAttributes,
  'id' | 'purpose' | 'retention_days' | 'cross_border_allowed' | 'legal_basis' | 'contact_email' | 'meta' | 'created_at' | 'updated_at'
>;

class HqPrivacySetting extends Model<HqPrivacySettingAttributes, HqPrivacySettingCreation>
  implements HqPrivacySettingAttributes
{
  public id!: number;
  public tenant_id!: number;
  public purpose?: string | null;
  public retention_days!: number;
  public cross_border_allowed!: boolean;
  public legal_basis?: string | null;
  public contact_email?: string | null;
  public meta?: object | null;
  public created_at?: Date;
  public updated_at?: Date;
}

HqPrivacySetting.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    purpose: { type: DataTypes.TEXT, allowNull: true },
    retention_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 365 },
    cross_border_allowed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    legal_basis: { type: DataTypes.TEXT, allowNull: true },
    contact_email: { type: DataTypes.STRING(255), allowNull: true },
    meta: { type: DataTypes.JSONB, allowNull: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'hq_privacy_settings', underscored: true, timestamps: true }
);

export default HqPrivacySetting;
