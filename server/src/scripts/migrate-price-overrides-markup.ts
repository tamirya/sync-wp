/**
 * Idempotent migration: price_overrides absolute prices → markupPercent + useSalePrices.
 * Safe to re-run if a previous attempt stopped mid-way.
 *
 * Usage: npm run db:migrate:price-overrides
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

  if (!cols.has('markupPercent')) {
    console.log('Adding column markupPercent…');
    await sequelize.query(
      `ALTER TABLE price_overrides
       ADD COLUMN markupPercent DECIMAL(6, 2) NOT NULL DEFAULT 0 AFTER targetId`,
    );
  } else {
    console.log('Column markupPercent already exists — skipping.');
  }

  if (!cols.has('useSalePrices')) {
    console.log('Adding column useSalePrices…');
    await sequelize.query(
      `ALTER TABLE price_overrides
       ADD COLUMN useSalePrices TINYINT(1) NOT NULL DEFAULT 1 AFTER markupPercent`,
    );
  } else {
    console.log('Column useSalePrices already exists — skipping.');
  }

  const colsAfterAdd = await tableColumns('price_overrides');

  if (colsAfterAdd.has('regularPrice')) {
    console.log('Dropping column regularPrice…');
    await sequelize.query(`ALTER TABLE price_overrides DROP COLUMN regularPrice`);
  } else {
    console.log('Column regularPrice already removed — skipping.');
  }

  if (colsAfterAdd.has('salePrice')) {
    console.log('Dropping column salePrice…');
    await sequelize.query(`ALTER TABLE price_overrides DROP COLUMN salePrice`);
  } else {
    console.log('Column salePrice already removed — skipping.');
  }

  console.log('price_overrides migration completed.');
  await sequelize.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
