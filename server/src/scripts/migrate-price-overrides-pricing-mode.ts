/**
 * Idempotent migration: add pricingMode + fixedAmount to price_overrides.
 *
 * Usage: npm run db:migrate:price-overrides-pricing-mode
 */
import { QueryTypes } from 'sequelize';
import { sequelize } from '../databases';

type ColumnRow = { COLUMN_NAME: string };

async function tableColumns(tableName: string): Promise<Set<string>> {
  const dbName = sequelize.getDatabaseName();
  const rows = await sequelize.query<ColumnRow>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table`,
    { replacements: { schema: dbName, table: tableName }, type: QueryTypes.SELECT },
  );
  return new Set(rows.map(r => r.COLUMN_NAME));
}

async function main(): Promise<void> {
  await sequelize.authenticate();
  const cols = await tableColumns('price_overrides');

  if (!cols.has('pricingMode')) {
    console.log('Adding column pricingMode…');
    await sequelize.query(
      `ALTER TABLE price_overrides
       ADD COLUMN pricingMode ENUM('percent', 'fixed_amount') NOT NULL DEFAULT 'percent' AFTER useSalePrices`,
    );
  } else {
    console.log('Column pricingMode already exists — skipping.');
  }

  if (!cols.has('fixedAmount')) {
    console.log('Adding column fixedAmount…');
    await sequelize.query(
      `ALTER TABLE price_overrides
       ADD COLUMN fixedAmount DECIMAL(10, 2) NULL DEFAULT NULL AFTER pricingMode`,
    );
  } else {
    console.log('Column fixedAmount already exists — skipping.');
  }

  console.log('price_overrides pricing mode migration completed.');
  await sequelize.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
