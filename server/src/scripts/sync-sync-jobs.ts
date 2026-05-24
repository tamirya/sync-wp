import { sequelize } from '../databases';
import '../models/users.model';
import '../models/syncJob.model';

async function main(): Promise<void> {
  await sequelize.authenticate();
  await sequelize.sync({ alter: false });
  console.log('sync_jobs table synced.');
  await sequelize.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
