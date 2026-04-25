/**
 * Only creates/updates the `category_rules` table (and its indexes).
 * Use this when `sequelize.sync()` fails on other tables (e.g. ER_TOO_MANY_KEYS on `users`),
 * because Sequelize still reconciles indexes on every model during a full sync, even with alter: false.
 */
import { sequelize } from '../databases';
import CategoryRuleModel from '../models/categoryRules.model';

async function main(): Promise<void> {
  await sequelize.authenticate();
  await CategoryRuleModel.sync({ alter: false });
  console.log('Table `category_rules` is in sync (create + indexes only for this model).');
  await sequelize.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
