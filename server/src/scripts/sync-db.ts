import { sequelize } from '../databases';
import '../models/users.model';
import '../models/stores.model';
import '../models/suppliers.model';
import '../models/envToStore.model';
import '../models/categoryRules.model';
import '../models/productCategoryRules.model';
import '../models/supplierCatalog.model';
import '../models/storeCatalog.model';
import '../models/supplierCategory.model';
import '../models/storeCategory.model';

async function main(): Promise<void> {
  await sequelize.authenticate();
  const alter = process.env.DB_SYNC_ALTER === 'true';
  if (alter) {
    console.warn(
      '[sync-db] DB_SYNC_ALTER=true will ALTER columns on existing tables. ER_TOO_MANY_KEYS on `users` usually means ' +
        'that table already has 64 InnoDB indexes.',
    );
  } else {
    console.warn(
      '[sync-db] Sequelize still adds missing named indexes on every model during sync, even when alter is false. ' +
        'If sync fails on `users` with ER_TOO_MANY_KEYS, run `npm run db:sync:category-rules` or scripts/sql/create_category_rules.sql instead.',
    );
  }
  await sequelize.sync({ alter });
  console.log('Database sync finished.');
  await sequelize.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
