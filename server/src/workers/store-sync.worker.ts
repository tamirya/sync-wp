import { Worker, Job } from 'bullmq';
import { redisConnection } from '@/queues/redis';
import { STORE_SYNC_QUEUE } from '@/queues';
import StoreService from '@services/stores.service';
import JobsService from '@services/jobs.service';
import { SyncStoreRulesImportDto } from '@dtos/sync-store-rules-import.dto';
import { SyncSingleRuleImportDto } from '@dtos/sync-single-rule-import.dto';
import { ImportStoreProductsDto } from '@dtos/import-store-products.dto';

export interface StoreSyncJobData {
  jobId: string;
  storeId: string;
  userId: number;
  /** for import_rules */
  syncRulesDto?: SyncStoreRulesImportDto;
  /** for import_single_rule */
  syncSingleRuleDto?: SyncSingleRuleImportDto;
  /** for import_store_api */
  importStoreApiDto?: ImportStoreProductsDto;
}

export type StoreSyncJobName = 'categories' | 'catalog' | 'import_rules' | 'import_single_rule' | 'import_store_api';

const storeService = new StoreService();
const jobsService = new JobsService();

async function processStoreSyncJob(job: Job<StoreSyncJobData, unknown, StoreSyncJobName>): Promise<unknown> {
  const { jobId, storeId, userId } = job.data;

  await jobsService.updateJob(jobId, { status: 'running', progress: 5 });
  await job.updateProgress(5);

  try {
    let result: unknown;

    if (job.name === 'categories') {
      await job.updateProgress(10);
      result = await storeService.syncStoreCategories(storeId, userId);
      await job.updateProgress(100);
    } else if (job.name === 'catalog') {
      await job.updateProgress(10);
      result = await storeService.syncStoreCatalog(storeId, userId);
      await job.updateProgress(100);
    } else if (job.name === 'import_rules') {
      await job.updateProgress(10);
      result = await storeService.importProductsSyncAllRules(storeId, userId, job.data.syncRulesDto ?? {});
      await job.updateProgress(100);
    } else if (job.name === 'import_single_rule') {
      await job.updateProgress(10);
      result = await storeService.importProductsSyncSingleRule(storeId, userId, job.data.syncSingleRuleDto ?? {});
      await job.updateProgress(100);
    } else if (job.name === 'import_store_api') {
      await job.updateProgress(10);
      result = await storeService.importProductsFromStoreApi(storeId, userId, job.data.importStoreApiDto ?? {});
      await job.updateProgress(100);
    } else {
      throw new Error(`Unknown store sync job name: ${job.name}`);
    }

    await jobsService.updateJob(jobId, { status: 'done', progress: 100, result: result as object });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await jobsService.updateJob(jobId, { status: 'failed', error: message });
    throw err;
  }
}

export function createStoreSyncWorker() {
  const worker = new Worker<StoreSyncJobData, unknown, StoreSyncJobName>(STORE_SYNC_QUEUE, processStoreSyncJob, {
    connection: redisConnection,
    concurrency: 2,
  });

  worker.on('completed', job => {
    console.log(`[store-sync] job ${job.id} (${job.name}) completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[store-sync] job ${job?.id} (${job?.name}) failed: ${err.message}`);
  });

  worker.on('progress', (job, progress) => {
    console.log(`[store-sync] job ${job.id} progress: ${progress}%`);
  });

  return worker;
}
