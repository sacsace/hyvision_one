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
  const [col] = await sequelize.query(
    `SELECT data_type, udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'payrolls' AND column_name = 'status'`,
    { type: sequelize.QueryTypes.SELECT }
  );
  console.log('before:', col);

  if (col && (col.data_type === 'USER-DEFINED' || String(col.udt_name || '').includes('payrolls_status'))) {
    await sequelize.query(`ALTER TABLE payrolls ALTER COLUMN status DROP DEFAULT`);
    await sequelize.query(`
      ALTER TABLE payrolls
        ALTER COLUMN status TYPE VARCHAR(20) USING status::text
    `);
    await sequelize.query(`
      ALTER TABLE payrolls
        ALTER COLUMN status SET DEFAULT 'draft',
        ALTER COLUMN status SET NOT NULL
    `);
    await sequelize.query(`DROP TYPE IF EXISTS enum_payrolls_status`).catch(() => {});
  }

  const [after] = await sequelize.query(
    `SELECT data_type, udt_name, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'payrolls' AND column_name = 'status'`,
    { type: sequelize.QueryTypes.SELECT }
  );
  console.log('after:', after);

  await sequelize.query(
    `INSERT INTO "SequelizeMeta" (name)
     SELECT '20260910120000-fix-payrolls-status-enum.js'
     WHERE NOT EXISTS (
       SELECT 1 FROM "SequelizeMeta"
       WHERE name = '20260910120000-fix-payrolls-status-enum.js'
     )`
  );

  await sequelize.close();
  console.log('done');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
