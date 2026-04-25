/**
 * Only creates/updates `supplier_catalog` and `store_catalog`.
 * Do not use `sequelize.sync()` here: it runs `Model.sync` on every registered model and will
 * try to add indexes on `users` (ER_TOO_MANY_KEYS when that table is already at InnoDB's limit).
 */
import { sequelize } from '../databases';
import '../models/users.model';
import '../models/stores.model';
import '../models/suppliers.model';
import SupplierCatalogModel from '../models/supplierCatalog.model';
import StoreCatalogModel from '../models/storeCatalog.model';

async function main(): Promise<void> {
  await sequelize.authenticate();
  const alter = process.env.DB_SYNC_ALTER === 'true';
  await SupplierCatalogModel.sync({ alter });
  await StoreCatalogModel.sync({ alter });
  console.log('Catalog tables `supplier_catalog` and `store_catalog` are in sync.');
  await sequelize.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
