import { Op } from 'sequelize';
import { MfgPeriodLock } from '../models';

export const assertNotLocked = async (
  tenantId: number,
  companyId: number,
  periodYm: string,
  module: string = 'all'
) => {
  const lock = await (MfgPeriodLock as any).findOne({
    where: {
      tenant_id: tenantId,
      company_id: companyId,
      period_ym: periodYm,
      module: { [Op.in]: [module, 'all'] },
      is_locked: true,
    },
  });
  if (lock) throw new Error('PERIOD_LOCKED');
};

export const lockPeriod = async (
  tenantId: number,
  companyId: number,
  periodYm: string,
  module: string,
  userId: number,
  financialYearId?: number | null
) => {
  const [row] = await (MfgPeriodLock as any).findOrCreate({
    where: { tenant_id: tenantId, company_id: companyId, period_ym: periodYm, module },
    defaults: {
      tenant_id: tenantId,
      company_id: companyId,
      financial_year_id: financialYearId ?? null,
      period_ym: periodYm,
      module,
      is_locked: true,
      locked_by: userId,
      locked_at: new Date(),
    },
  });
  if (!row.is_locked) {
    await row.update({
      is_locked: true,
      locked_by: userId,
      locked_at: new Date(),
      reopen_by: null,
      reopen_at: null,
      reopen_reason: null,
    });
  }
  return row;
};

export const unlockPeriod = async (
  tenantId: number,
  companyId: number,
  periodYm: string,
  module: string,
  userId: number,
  reason?: string
) => {
  const row = await (MfgPeriodLock as any).findOne({
    where: { tenant_id: tenantId, company_id: companyId, period_ym: periodYm, module },
  });
  if (!row) throw new Error('NOT_FOUND');
  await row.update({
    is_locked: false,
    reopen_by: userId,
    reopen_at: new Date(),
    reopen_reason: reason ?? null,
  });
  return row;
};

export default assertNotLocked;
