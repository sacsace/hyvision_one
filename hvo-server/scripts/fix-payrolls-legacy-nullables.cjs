'use strict';

/**
 * 레거시 payrolls.pay_period_start/end, net_pay 가 NOT NULL로 남아
 * 신규 모델(payroll_period 만 채움) INSERT 가 실패하는 경우를 보정.
 */
const { Sequelize } = require('sequelize');
const cfg = require('../config/config.json').development;

const sequelize = new Sequelize(cfg.database, cfg.username, cfg.password, {
  host: cfg.host,
  port: cfg.port,
  dialect: 'postgres',
  logging: console.log,
});

(async () => {
  const cols = await sequelize.query(
    `SELECT column_name, is_nullable, data_type, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'payrolls'
       AND column_name IN ('pay_period_start','pay_period_end','net_pay','payroll_period','net_salary')
     ORDER BY column_name`,
    { type: sequelize.QueryTypes.SELECT }
  );
  console.log('columns before:', cols);

  const names = new Set(cols.map((c) => c.column_name));

  if (names.has('pay_period_start') && names.has('payroll_period')) {
    await sequelize.query(`
      UPDATE payrolls
      SET pay_period_start = COALESCE(
        pay_period_start,
        CASE
          WHEN payroll_period ~ '^\\d{4}-\\d{2}$'
          THEN (payroll_period || '-01')::date
          ELSE CURRENT_DATE
        END
      )
      WHERE pay_period_start IS NULL
    `);
    await sequelize.query(`ALTER TABLE payrolls ALTER COLUMN pay_period_start DROP NOT NULL`);
  }

  if (names.has('pay_period_end') && names.has('payroll_period')) {
    await sequelize.query(`
      UPDATE payrolls
      SET pay_period_end = COALESCE(
        pay_period_end,
        CASE
          WHEN payroll_period ~ '^\\d{4}-\\d{2}$'
          THEN (date_trunc('month', (payroll_period || '-01')::date) + interval '1 month - 1 day')::date
          ELSE CURRENT_DATE
        END
      )
      WHERE pay_period_end IS NULL
    `);
    await sequelize.query(`ALTER TABLE payrolls ALTER COLUMN pay_period_end DROP NOT NULL`);
  }

  if (names.has('net_pay') && names.has('net_salary')) {
    await sequelize.query(`
      UPDATE payrolls
      SET net_pay = COALESCE(net_pay, net_salary, 0)
      WHERE net_pay IS NULL
    `);
    await sequelize.query(`ALTER TABLE payrolls ALTER COLUMN net_pay DROP NOT NULL`);
  }

  // Also drop defaults that force legacy path if any
  for (const col of ['pay_period_start', 'pay_period_end', 'net_pay']) {
    if (!names.has(col)) continue;
    await sequelize.query(`ALTER TABLE payrolls ALTER COLUMN ${col} DROP DEFAULT`).catch(() => {});
  }

  const after = await sequelize.query(
    `SELECT column_name, is_nullable, data_type, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'payrolls'
       AND column_name IN ('pay_period_start','pay_period_end','net_pay','payroll_period','net_salary')
     ORDER BY column_name`,
    { type: sequelize.QueryTypes.SELECT }
  );
  console.log('columns after:', after);
  await sequelize.close();
  console.log('done');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
