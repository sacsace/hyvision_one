import {
  compareHqAccessLevel,
  HQ_ACCESS_LEVEL_ORDER,
  maskSensitive,
  isHqUser,
} from '../middleware/hqAccess';
import { convert, getRate } from '../services/hqFxService';
import { HqApprovalRequest } from '../models';

jest.mock('../models', () => ({
  HqFxRate: {
    findOne: jest.fn(),
    findOrCreate: jest.fn(),
  },
  HqApprovalRequest: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  HqApprovalPolicy: { findOne: jest.fn() },
  HqAccessLog: { create: jest.fn() },
  User: { findAll: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../controllers/notificationController', () => ({
  pushNotification: jest.fn(),
}));

jest.mock('../services/mfgAuditLog', () => ({
  writeMfgAudit: jest.fn(),
}));

describe('HQ Portal — hqAccess', () => {
  it('orders access levels correctly', () => {
    expect(HQ_ACCESS_LEVEL_ORDER.indexOf('kpi_only')).toBeLessThan(HQ_ACCESS_LEVEL_ORDER.indexOf('reports'));
    expect(HQ_ACCESS_LEVEL_ORDER.indexOf('reports')).toBeLessThan(HQ_ACCESS_LEVEL_ORDER.indexOf('approve'));
    expect(HQ_ACCESS_LEVEL_ORDER.indexOf('approve')).toBeLessThan(HQ_ACCESS_LEVEL_ORDER.indexOf('admin'));

    expect(compareHqAccessLevel('admin', 'kpi_only')).toBe(true);
    expect(compareHqAccessLevel('kpi_only', 'admin')).toBe(false);
    expect(compareHqAccessLevel('approve', 'approve')).toBe(true);
    expect(compareHqAccessLevel('export', 'approve')).toBe(false);
  });

  it('isHqUser accepts root or hq_role', () => {
    expect(isHqUser({ role: 'root' })).toBe(true);
    expect(isHqUser({ role: 'user', hq_role: 'hq_finance' })).toBe(true);
    expect(isHqUser({ role: 'user' })).toBe(false);
  });

  it('maskSensitive strips salary when no pii flag', () => {
    const payload = { employee: { name: 'Kim', salary: 50000, bank_account: '1234' } };
    const masked = maskSensitive(payload, { role: 'user', hq_role: 'hq_readonly' }) as any;
    expect(masked.employee.salary).toBeNull();
    expect(masked.employee.bank_account).toBeNull();
    expect(masked.employee.name).toBe('Kim');
  });

  it('maskSensitive keeps salary with pii flag', () => {
    const payload = { employee: { name: 'Kim', salary: 50000 } };
    const masked = maskSensitive(payload, {
      role: 'user',
      hq_role: 'hq_finance',
      hq_can_view_hr_pii: true,
    }) as any;
    expect(masked.employee.salary).toBe(50000);
  });
});

describe('HQ Portal — fx convert', () => {
  const { HqFxRate } = jest.requireMock('../models');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns same currency rate of 1', async () => {
    const rate = await getRate(1, 'INR', 'INR');
    expect(rate).toBe(1);
  });

  it('convert multiplies by direct rate', async () => {
    HqFxRate.findOne.mockResolvedValueOnce({ rate: '16.5' });
    const result = await convert(100, 'INR', 'KRW', 1);
    expect(result.rate).toBe(16.5);
    expect(result.amount).toBe(1650);
  });
});

describe('HQ Portal — approval dedupe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns existing pending request without creating duplicate', async () => {
    const existing = { id: 99, status: 'pending' };
    (HqApprovalRequest as any).findOne.mockResolvedValue(existing);

    const { createRequest } = await import('../services/hqApprovalService');
    const result = await createRequest({
      tenantId: 1,
      companyId: 1,
      eventType: 'po_amount',
      docType: 'mfg_purchase_order',
      docId: 42,
    });

    expect(result.deduped).toBe(true);
    expect(result.row).toBe(existing);
    expect(HqApprovalRequest.create).not.toHaveBeenCalled();
  });
});
