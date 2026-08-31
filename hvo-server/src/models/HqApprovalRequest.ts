import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type HqApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface HqApprovalRequestAttributes {
  id: number;
  tenant_id: number;
  company_id: number;
  policy_id?: number | null;
  event_type: string;
  doc_type: string;
  doc_id: number;
  doc_no?: string | null;
  partner_name?: string | null;
  amount?: number | null;
  currency_code: string;
  amount_inr?: number | null;
  amount_krw?: number | null;
  amount_usd?: number | null;
  fx_rate_date?: string | null;
  requester_id?: number | null;
  request_reason?: string | null;
  status: HqApprovalStatus;
  hq_approver_id?: number | null;
  decided_at?: Date | null;
  decision_reason?: string | null;
  attachment_urls?: string[] | null;
  deep_link?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

type HqApprovalRequestCreation = Optional<
  HqApprovalRequestAttributes,
  | 'id'
  | 'policy_id'
  | 'doc_no'
  | 'partner_name'
  | 'amount'
  | 'currency_code'
  | 'amount_inr'
  | 'amount_krw'
  | 'amount_usd'
  | 'fx_rate_date'
  | 'requester_id'
  | 'request_reason'
  | 'status'
  | 'hq_approver_id'
  | 'decided_at'
  | 'decision_reason'
  | 'attachment_urls'
  | 'deep_link'
  | 'created_at'
  | 'updated_at'
>;

class HqApprovalRequest extends Model<HqApprovalRequestAttributes, HqApprovalRequestCreation>
  implements HqApprovalRequestAttributes
{
  public id!: number;
  public tenant_id!: number;
  public company_id!: number;
  public policy_id?: number | null;
  public event_type!: string;
  public doc_type!: string;
  public doc_id!: number;
  public doc_no?: string | null;
  public partner_name?: string | null;
  public amount?: number | null;
  public currency_code!: string;
  public amount_inr?: number | null;
  public amount_krw?: number | null;
  public amount_usd?: number | null;
  public fx_rate_date?: string | null;
  public requester_id?: number | null;
  public request_reason?: string | null;
  public status!: HqApprovalStatus;
  public hq_approver_id?: number | null;
  public decided_at?: Date | null;
  public decision_reason?: string | null;
  public attachment_urls?: string[] | null;
  public deep_link?: string | null;
  public created_at?: Date;
  public updated_at?: Date;
}

HqApprovalRequest.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    company_id: { type: DataTypes.INTEGER, allowNull: false },
    policy_id: { type: DataTypes.INTEGER, allowNull: true },
    event_type: { type: DataTypes.STRING(60), allowNull: false },
    doc_type: { type: DataTypes.STRING(60), allowNull: false },
    doc_id: { type: DataTypes.INTEGER, allowNull: false },
    doc_no: { type: DataTypes.STRING(80), allowNull: true },
    partner_name: { type: DataTypes.STRING(200), allowNull: true },
    amount: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
    currency_code: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'INR' },
    amount_inr: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
    amount_krw: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
    amount_usd: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
    fx_rate_date: { type: DataTypes.DATEONLY, allowNull: true },
    requester_id: { type: DataTypes.INTEGER, allowNull: true },
    request_reason: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    hq_approver_id: { type: DataTypes.INTEGER, allowNull: true },
    decided_at: { type: DataTypes.DATE, allowNull: true },
    decision_reason: { type: DataTypes.TEXT, allowNull: true },
    attachment_urls: { type: DataTypes.JSONB, allowNull: true },
    deep_link: { type: DataTypes.STRING(300), allowNull: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  { sequelize, tableName: 'hq_approval_requests', underscored: true, timestamps: true }
);

export default HqApprovalRequest;
