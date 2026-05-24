import { Worker, Job } from 'bullmq';
import { redisConnection } from '@/queues/redis';
import { SUPPLIER_SYNC_QUEUE } from '@/queues';
import SupplierService from '@services/suppliers.service';
import JobsService from '@services/jobs.service';

export interface SupplierSyncJobData {
  jobId: string;
  supplierId: string;
  userId: number;
  skipProducts?: boolean;
}

export type SupplierSyncJobName = 'categories' | 'catalog' | 'scraper';

const supplierService = new SupplierService();
const jobsService = new JobsService();

async function processSupplierSyncJob(job: Job<SupplierSyncJobData, unknown, SupplierSyncJobName>): Promise<unknown> {
  const { jobId, supplierId, userId, skipProducts } = job.data;

  await jobsService.updateJob(jobId, { status: 'running', progress: 5 });
  await job.updateProgress(5);

  try {
    let result: unknown;

    if (job.name === 'categories') {
      await job.updateProgress(10);
      result = await supplierService.syncSupplierCategories(supplierId, userId);
      await job.updateProgress(100);
    } else if (job.name === 'catalog') {
      await job.updateProgress(10);
      result = await supplierService.syncSupplierCatalog(supplierId, userId);
      await job.updateProgress(100);
    } else if (job.name === 'scraper') {
      await job.updateProgress(10);
      result = await supplierService.syncSupplierViaScraper(supplierId, userId, skipProducts ?? false);
      await job.updateProgress(100);
    } else {
      throw new Error(`Unknown supplier sync job name: ${job.name}`);
    }

    await jobsService.updateJob(jobId, { status: 'done', progress: 100, result: result as object });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await jobsService.updateJob(jobId, { status: 'failed', error: message });
    throw err;
  }
}

export function createSupplierSyncWorker() {
  const worker = new Worker<SupplierSyncJobData, unknown, SupplierSyncJobName>(SUPPLIER_SYNC_QUEUE, processSupplierSyncJob, {
    connection: redisConnection,
    concurrency: 2,
  });

  worker.on('completed', job => {
    console.log(`[supplier-sync] job ${job.id} (${job.name}) completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[supplier-sync] job ${job?.id} (${job?.name}) failed: ${err.message}`);
  });

  worker.on('progress', (job, progress) => {
    console.log(`[supplier-sync] job ${job.id} progress: ${progress}%`);
  });

  return worker;
}
