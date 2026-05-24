import 'reflect-metadata';
import { config } from 'dotenv';
config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

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
import '@models/syncJob.model';

import { initializeDatabase } from '@databases';
import { createSupplierSyncWorker } from '@/workers/supplier-sync.worker';
import { createStoreSyncWorker } from '@/workers/store-sync.worker';

async function bootstrap() {
  await initializeDatabase();
  console.log('[worker] Database connected');

  const supplierWorker = createSupplierSyncWorker();
  const storeWorker = createStoreSyncWorker();

  console.log('[worker] Supplier-sync worker started');
  console.log('[worker] Store-sync worker started');

  async function shutdown() {
    console.log('[worker] Shutting down workers...');
    await supplierWorker.close();
    await storeWorker.close();
    process.exit(0);
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch(err => {
  console.error('[worker] Failed to start:', err);
  process.exit(1);
});
