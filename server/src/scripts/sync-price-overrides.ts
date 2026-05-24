import { sequelize } from '../databases';
import '../models/users.model';
import '../models/suppliers.model';
import '../models/priceOverride.model';

async function main(): Promise<void> {
  await sequelize.authenticate();
  await sequelize.sync({ alter: false });
  console.log('price_overrides table synced.');
  await sequelize.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
