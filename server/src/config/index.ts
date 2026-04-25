import { config } from 'dotenv';
config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

export const CREDENTIALS = process.env.CREDENTIALS === 'true';

export const {
  NODE_ENV,
  PORT,
  DB_HOST,
  DB_PORT,
  DB_DATABASE,
  DB_USER,
  DB_PASSWORD,
  SECRET_KEY,
  LOG_FORMAT,
  LOG_DIR,
  ORIGIN,
} = process.env;

/**
 * With `credentials: true`, browsers forbid `Access-Control-Allow-Origin: *`.
 * Use an explicit origin (or comma-separated list), or rely on dev defaults below when ORIGIN is * or unset.
 */
function resolveCorsOrigin(): string | string[] | boolean {
  const raw = process.env.ORIGIN?.trim() ?? '';
  if (CREDENTIALS) {
    if (!raw || raw === '*') {
      if (process.env.NODE_ENV === 'production') {
        console.warn(
          '[config] CREDENTIALS=true requires explicit ORIGIN (not *). Using http://localhost:3000 as fallback.',
        );
      } else {
        console.warn(
          '[config] ORIGIN is * or unset but CREDENTIALS=true; using http://localhost:3000 and http://127.0.0.1:3000. Set ORIGIN explicitly.',
        );
      }
      return ['http://localhost:3000', 'http://127.0.0.1:3000'];
    }
    if (raw.includes(',')) {
      return raw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }
    return raw;
  }
  if (!raw || raw === '*') {
    return true;
  }
  if (raw.includes(',')) {
    return raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  return raw;
}

export const CORS_ORIGIN = resolveCorsOrigin();
