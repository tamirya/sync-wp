/**
 * Only creates/updates `supplier_categories` and `store_categories`.
 * Avoids full `sequelize.sync()` (see sync-catalog.ts).
 */
import { sequelize } from '../databases';
import '../models/users.model';
import '../models/stores.model';
import '../models/suppliers.model';
import SupplierCategoryModel from '../models/supplierCategory.model';
import StoreCategoryModel from '../models/storeCategory.model';

async function main(): Promise<void> {
  await sequelize.authenticate();
  const alter = process.env.DB_SYNC_ALTER === 'true';
  await SupplierCategoryModel.sync({ alter });
  await StoreCategoryModel.sync({ alter });
  console.log('Tables `supplier_categories` and `store_categories` are in sync.');
  await sequelize.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
