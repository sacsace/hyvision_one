'use strict';

const { Sequelize } = require('sequelize');
const cfg = require('../config/config.json').development;

const sequelize = new Sequelize(cfg.database, cfg.username, cfg.password, {
  host: cfg.host,
  port: cfg.port,
  dialect: 'postgres',
  logging: console.log,
});

(async () => {
  for (const col of ['pay_period_start', 'pay_period_end', 'net_pay']) {
    await sequelize.query(`ALTER TABLE payrolls DROP COLUMN IF EXISTS "${col}"`);
  }
  await sequelize.query(`
    INSERT INTO "SequelizeMeta" (name)
    SELECT '20260910130000-drop-legacy-payroll-period-columns.js'
    WHERE NOT EXISTS (
      SELECT 1 FROM "SequelizeMeta"
      WHERE name = '20260910130000-drop-legacy-payroll-period-columns.js'
    )
  `);
  const cols = await sequelize.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='payrolls'
       AND column_name IN ('pay_period_start','pay_period_end','net_pay','payroll_period','net_salary')
     ORDER BY column_name`,
    { type: sequelize.QueryTypes.SELECT }
  );
  console.log('remaining:', cols);
  await sequelize.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
