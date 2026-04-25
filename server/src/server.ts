import 'reflect-metadata';

import '@models/users.model';
import '@models/stores.model';
import '@models/suppliers.model';
import '@models/envToStore.model';
import '@models/categoryRules.model';
import '@models/productCategoryRules.model';
import '@models/supplierCatalog.model';
import '@models/storeCatalog.model';
import '@models/supplierCategory.model';
import '@models/storeCategory.model';

import App from '@/app';
import AuthRoute from '@routes/auth.route';
import CategoryRulesRoute from '@routes/category-rules.route';
import ProductCategoryRulesRoute from '@routes/product-category-rules.route';
import EnvToStoreRoute from '@routes/envToStore.route';
import IndexRoute from '@routes/index.route';
import StoresRoute from '@routes/stores.route';
import SuppliersRoute from '@routes/suppliers.route';
import UsersRoute from '@routes/users.route';
import { initializeDatabase } from '@databases';
import validateEnv from '@utils/validateEnv';

validateEnv();

async function bootstrap() {
  await initializeDatabase();
  const app = new App([
    new IndexRoute(),
    new UsersRoute(),
    new StoresRoute(),
    new EnvToStoreRoute(),
    new SuppliersRoute(),
    new CategoryRulesRoute(),
    new ProductCategoryRulesRoute(),
    new AuthRoute(),
  ]);
  await app.listen();
}

bootstrap().catch(err => {
  console.error('Failed to start server:', err);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
