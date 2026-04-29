import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.AIVEN_DB_HOST ?? 'mysql-1516c072-isolation2026.b.aivencloud.com',
  port: Number(process.env.AIVEN_DB_PORT ?? 15124),
  user: process.env.AIVEN_DB_USER ?? 'avnadmin',
  password: process.env.AIVEN_DB_PASSWORD ?? '',
  database: process.env.AIVEN_DB_NAME ?? 'defaultdb',
  ssl: {
    rejectUnauthorized: process.env.AIVEN_DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  },
};

const dbPool = mysql.createPool(dbConfig);

export { dbConfig, dbPool };
