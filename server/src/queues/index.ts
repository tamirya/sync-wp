import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export const SUPPLIER_SYNC_QUEUE = 'supplier-sync';
export const STORE_SYNC_QUEUE = 'store-sync';

export const supplierSyncQueue = new Queue(SUPPLIER_SYNC_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

export const storeSyncQueue = new Queue(STORE_SYNC_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});
