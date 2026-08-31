import { Op } from 'sequelize';
import { HqFxRate } from '../models';

export const getRate = async (
  tenantId: number,
  fromCurrency: string,
  toCurrency: string,
  rateDate?: string
): Promise<number | null> => {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) return 1;

  const date = rateDate || new Date().toISOString().slice(0, 10);

  const direct = await (HqFxRate as any).findOne({
    where: { tenant_id: tenantId, rate_date: { [Op.lte]: date }, from_currency: from, to_currency: to },
    order: [['rate_date', 'DESC']],
  });
  if (direct) return Number(direct.rate);

  const inverse = await (HqFxRate as any).findOne({
    where: { tenant_id: tenantId, rate_date: { [Op.lte]: date }, from_currency: to, to_currency: from },
    order: [['rate_date', 'DESC']],
  });
  if (inverse && Number(inverse.rate) !== 0) return 1 / Number(inverse.rate);

  return null;
};

export const convert = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  tenantId: number,
  rateDate?: string
): Promise<{ amount: number; rate: number | null; rate_date: string }> => {
  const date = rateDate || new Date().toISOString().slice(0, 10);
  const rate = await getRate(tenantId, fromCurrency, toCurrency, date);
  if (rate == null) return { amount: 0, rate: null, rate_date: date };
  return { amount: Number(amount) * rate, rate, rate_date: date };
};

export const listRates = async (tenantId: number, opts?: { from?: string; to?: string; limit?: number }) => {
  const where: Record<string, unknown> = { tenant_id: tenantId };
  if (opts?.from) where.from_currency = opts.from.toUpperCase();
  if (opts?.to) where.to_currency = opts.to.toUpperCase();
  return (HqFxRate as any).findAll({
    where,
    order: [['rate_date', 'DESC'], ['from_currency', 'ASC']],
    limit: Math.min(opts?.limit ?? 100, 500),
  });
};

export const upsertRate = async (params: {
  tenantId: number;
  rateDate: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source?: string;
  createdBy?: number;
}) => {
  const from = params.fromCurrency.toUpperCase();
  const to = params.toCurrency.toUpperCase();
  const [row] = await (HqFxRate as any).findOrCreate({
    where: {
      tenant_id: params.tenantId,
      rate_date: params.rateDate,
      from_currency: from,
      to_currency: to,
    },
    defaults: {
      tenant_id: params.tenantId,
      rate_date: params.rateDate,
      from_currency: from,
      to_currency: to,
      rate: params.rate,
      source: params.source ?? 'manual',
      created_by: params.createdBy ?? null,
    },
  });
  await row.update({
    rate: params.rate,
    source: params.source ?? row.source,
    created_by: params.createdBy ?? row.created_by,
  });
  return row;
};

export default { getRate, convert, listRates, upsertRate };
