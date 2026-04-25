import { Sequelize } from 'sequelize';
import { DB_DATABASE, DB_HOST, DB_PASSWORD, DB_PORT, DB_USER, NODE_ENV } from '@config';

const logging = NODE_ENV !== 'production' ? console.log : false;

export const sequelize = new Sequelize(DB_DATABASE ?? '', DB_USER ?? '', DB_PASSWORD ?? '', {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: 'mysql',
  logging,
  // Use utf8mb4 for new tables; existing utf8mb3 columns still need CONVERT (see scripts/sql/convert_schema_utf8mb4.sql).
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  dialectOptions: {
    charset: 'utf8mb4',
  },
});

export async function initializeDatabase(): Promise<void> {
  await sequelize.authenticate();
  // Avoid `sequelize.sync()` on every dev boot: it adds missing indexes and will fail with
  // ER_TOO_MANY_KEYS if the table already hit InnoDB's 64-index limit (common after repeated sync+alter).
  // Set DB_SYNC=true when creating tables or applying model index changes; repair `users` indexes in MySQL first if needed.
  if (NODE_ENV !== 'production' && process.env.DB_SYNC === 'true') {
    await sequelize.sync({ alter: process.env.DB_SYNC_ALTER === 'true' });
  }
}

export async function closeDatabase(): Promise<void> {
  await sequelize.close();
}
