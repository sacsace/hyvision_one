import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MfgRoutingOperationAttributes {
  id: number;
  routing_id: number;
  seq: number;
  work_center_id: number;
  name: string;
  setup_minutes: number;
  run_minutes_per_unit: number;
  machine_minutes_per_unit: number;
  created_at?: Date;
  updated_at?: Date;
}

type MfgRoutingOperationCreation = Optional<MfgRoutingOperationAttributes, 'id' | 'work_center_id' | 'setup_minutes' | 'run_minutes_per_unit' | 'machine_minutes_per_unit' | 'created_at' | 'updated_at'>;

class MfgRoutingOperation extends Model<MfgRoutingOperationAttributes, MfgRoutingOperationCreation> implements MfgRoutingOperationAttributes {
  public id!: number;
  public routing_id!: number;
  public seq!: number;
  public work_center_id!: number;
  public name!: string;
  public setup_minutes!: number;
  public run_minutes_per_unit!: number;
  public machine_minutes_per_unit!: number;
  public created_at?: Date;
  public updated_at?: Date;
}

MfgRoutingOperation.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    routing_id: { type: DataTypes.INTEGER, allowNull: true },
    seq: { type: DataTypes.INTEGER, allowNull: false },
    work_center_id: { type: DataTypes.INTEGER, allowNull: true },
    name: { type: DataTypes.STRING(200), allowNull: false },
    setup_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    run_minutes_per_unit: { type: DataTypes.DECIMAL(10,3), allowNull: false, defaultValue: 0 },
    machine_minutes_per_unit: { type: DataTypes.DECIMAL(10,3), allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  },
  { sequelize, tableName: 'mfg_routing_operations', underscored: true, timestamps: true }
);

export default MfgRoutingOperation;
