import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgProductionPlanAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  plan_code: string;
  plan_date: string | null;
  horizon: string;
  status: string;
  remarks: string | null;
  created_by: number;
  created_at?: Date;
  updated_at?: Date;
}

type MfgProductionPlanCreation = Optional<MfgProductionPlanAttributes, 'id' | 'plan_date' | 'horizon' | 'status' | 'remarks' | 'created_by' | 'created_at' | 'updated_at'>;

class MfgProductionPlan extends Model<MfgProductionPlanAttributes, MfgProductionPlanCreation> implements MfgProductionPlanAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public plan_code!: string;
  public plan_date!: string | null;
  public horizon!: string;
  public status!: string;
  public remarks!: string | null;
  public created_by!: number;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgProductionPlan.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    plan_code: { type: DataTypes.STRING(60), allowNull: false },
    plan_date: { type: DataTypes.DATEONLY, allowNull: true },
    horizon: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'month' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_production_plans', underscored: true, timestamps: true }
);

export default MfgProductionPlan;
