import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

export type WooRestClient = InstanceType<typeof WooCommerceRestApi>;

export function normalizeStoreBaseUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/wp-json\/.*$/, '');
}

export function createStoreWooClient(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string,
  port?: number | null,
): WooRestClient {
  return new WooCommerceRestApi({
    url: normalizeStoreBaseUrl(storeUrl),
    consumerKey,
    consumerSecret,
    version: 'wc/v3',
    queryStringAuth: true,
    ...(port != null && { port }),
  });
}

export function wooClientErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const res = (err as { response?: { status?: number; data?: unknown } }).response;
    if (res && typeof res.status === 'number') {
      if (typeof res.data === 'object' && res.data !== null && 'message' in res.data) {
        return `${res.status} ${String((res.data as { message: string }).message)}`;
      }
      const raw = typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? '').slice(0, 200);
      return `${res.status} ${raw}`;
    }
  }
  return err instanceof Error ? err.message : String(err);
}

export function wooResponseStatus(err: unknown): number | null {
  if (typeof err !== 'object' || err === null || !('response' in err)) return null;
  const s = (err as { response?: { status?: number } }).response?.status;
  return typeof s === 'number' ? s : null;
}
