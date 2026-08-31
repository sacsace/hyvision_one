import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgBudgetLineAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  financial_year_id: number;
  department_id: number;
  gl_account_id: number;
  period_ym: string;
  budget_amount: number;
  actual_amount: number;
  currency_code: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type MfgBudgetLineCreation = Optional<
  MfgBudgetLineAttributes,
  | 'id'
  | 'financial_year_id'
  | 'department_id'
  | 'gl_account_id'
  | 'budget_amount'
  | 'actual_amount'
  | 'currency_code'
  | 'is_active'
  | 'created_at'
  | 'updated_at'
>;

class MfgBudgetLine extends Model<MfgBudgetLineAttributes, MfgBudgetLineCreation> implements MfgBudgetLineAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public financial_year_id!: number;
  public department_id!: number;
  public gl_account_id!: number;
  public period_ym!: string;
  public budget_amount!: number;
  public actual_amount!: number;
  public currency_code!: string;
  public is_active!: boolean;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgBudgetLine.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    financial_year_id: { type: DataTypes.INTEGER, allowNull: true },
    department_id: { type: DataTypes.INTEGER, allowNull: true },
    gl_account_id: { type: DataTypes.INTEGER, allowNull: true },
    period_ym: { type: DataTypes.STRING(7), allowNull: false },
    budget_amount: { type: DataTypes.DECIMAL(18,2), allowNull: false, defaultValue: 0 },
    actual_amount: { type: DataTypes.DECIMAL(18,2), allowNull: false, defaultValue: 0 },
    currency_code: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'INR' },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_budget_lines', underscored: true, timestamps: true }
);

export default MfgBudgetLine;
