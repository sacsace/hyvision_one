import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgDeliveryChallanAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  branch_id: number;
  financial_year_id: number;
  doc_no: string;
  so_id: number;
  partner_id: number;
  warehouse_id: number;
  status: string;
  challan_date: string | null;
  remarks: string | null;
  created_by: number;
  updated_by: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type MfgDeliveryChallanCreation = Optional<MfgDeliveryChallanAttributes, 'id' | 'branch_id' | 'financial_year_id' | 'so_id' | 'status' | 'challan_date' | 'remarks' | 'created_by' | 'updated_by' | 'is_active' | 'created_at' | 'updated_at'>;

class MfgDeliveryChallan extends Model<MfgDeliveryChallanAttributes, MfgDeliveryChallanCreation> implements MfgDeliveryChallanAttributes {
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public branch_id!: number;
  public financial_year_id!: number;
  public doc_no!: string;
  public so_id!: number;
  public partner_id!: number;
  public warehouse_id!: number;
  public status!: string;
  public challan_date!: string | null;
  public remarks!: string | null;
  public created_by!: number;
  public updated_by!: number;
  public is_active!: boolean;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgDeliveryChallan.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER, allowNull: true },
    financial_year_id: { type: DataTypes.INTEGER, allowNull: true },
    doc_no: { type: DataTypes.STRING(60), allowNull: false },
    so_id: { type: DataTypes.INTEGER, allowNull: true },
    partner_id: { type: DataTypes.INTEGER, allowNull: false },
    warehouse_id: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'draft' },
    challan_date: { type: DataTypes.DATEONLY, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_delivery_challans', underscored: true, timestamps: true }
);

export default MfgDeliveryChallan;
