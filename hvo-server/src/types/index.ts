import { Request } from 'express';
import { User } from '../models';
import { Model } from 'sequelize';

export interface AuthRequest extends Request {
  user: User;
}

export interface RequestWithUser extends Request {
  user: {
    id: number;
    tenant_id: number;
    company_id: number;
    userid: string;
    username: string;
    email: string;
    role: 'root' | 'audit' | 'admin' | 'user';
    hq_role?: 'hq_admin' | 'hq_management' | 'hq_finance' | 'hq_production' | 'hq_auditor' | 'hq_readonly' | null;
    hq_access_level?: 'kpi_only' | 'reports' | 'txn_detail' | 'attachments' | 'export' | 'approve' | 'modify' | 'admin';
    hq_can_approve?: boolean;
    hq_can_view_cost?: boolean;
    hq_can_view_hr_pii?: boolean;
    hq_can_view_bank_detail?: boolean;
    hq_can_view_tax?: boolean;
    hq_home_timezone?: string;
    department?: string;
    position?: string;
    status: 'active' | 'inactive' | 'suspended';
    is_payment_officer?: boolean;
    last_login?: Date;
    session_version?: number;
    created_at?: Date;
    updated_at?: Date;
  };
  query: any;
  params: any;
  body: any;
}

// Sequelize 모델 타입 확장
export type SequelizeModel<T = any> = typeof Model & {
  findAll(): Promise<T[]>;
  findOne(): Promise<T | null>;
  create(values?: any): Promise<T>;
  bulkCreate(records: any[]): Promise<T[]>;
  findAndCountAll(options?: any): Promise<{ rows: T[]; count: number }>;
  destroy(options?: any): Promise<number>;
  update(values: any, options?: any): Promise<[number, T[]]>;
  upsert(values: any): Promise<T>;
};
