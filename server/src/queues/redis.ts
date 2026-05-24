import { ConnectionOptions } from 'bullmq';

const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD ?? undefined;

export const redisConnection: ConnectionOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
};
