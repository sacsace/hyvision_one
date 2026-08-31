#!/usr/bin/env node

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// 데이터베이스 설정
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: 'postgres', // 먼저 postgres 데이터베이스에 연결
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  logging: console.log
});

async function setupDatabase() {
  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL');

    // 데이터베이스 생성
    console.log('\n📊 Creating DATABASE hyvision_one...');
    await sequelize.query('CREATE DATABASE hyvision_one', { raw: true }).catch(err => {
      if (err.message.includes('already exists')) {
        console.log('   DATABASE hyvision_one already exists');
      } else {
        throw err;
      }
    });

    // 사용자 생성
    console.log('\n👤 Creating user hvo_user...');
    await sequelize.query("CREATE USER hvo_user WITH PASSWORD 'Korean@2026'", { raw: true }).catch(err => {
      if (err.message.includes('already exists')) {
        console.log('   User hvo_user already exists');
      } else {
        throw err;
      }
    });

    // 권한 부여
    console.log('\n🔑 Granting privileges...');
    await sequelize.query('GRANT ALL PRIVILEGES ON DATABASE hyvision_one TO hvo_user', { raw: true });
    await sequelize.query('ALTER DATABASE hyvision_one OWNER TO hvo_user', { raw: true }).catch(() => {
      // Ignore if already owned
    });

    console.log('\n✅ Database setup completed!');
    console.log('\n📋 Next step: Run migrations');
    console.log('   npm run db:migrate');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    console.error('\n💡 Manual setup instructions:');
    console.error('   1. Connect to PostgreSQL as superuser');
    console.error('   2. CREATE DATABASE hyvision_one;');
    console.error("   3. CREATE USER hvo_user WITH PASSWORD 'Korean@2026';");
    console.error('   4. GRANT ALL PRIVILEGES ON DATABASE hyvision_one TO hvo_user;');
    process.exit(1);
  }
}

setupDatabase();

