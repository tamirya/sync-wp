/**
 * Only creates/updates `product_category_rules`.
 */
import { sequelize } from '../databases';
import '../models/users.model';
import '../models/stores.model';
import '../models/suppliers.model';
import ProductCategoryRuleModel from '../models/productCategoryRules.model';

async function main(): Promise<void> {
  await sequelize.authenticate();
  const alter = process.env.DB_SYNC_ALTER === 'true';
  await ProductCategoryRuleModel.sync({ alter });
  console.log('Table `product_category_rules` is in sync.');
  await sequelize.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
