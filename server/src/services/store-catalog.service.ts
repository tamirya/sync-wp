import * as http from 'http';
import * as https from 'https';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { URL } from 'url';
import { ImportStoreProductsDto } from '@dtos/import-store-products.dto';
import { HttpException } from '@exceptions/HttpException';
import StoreCatalogModel from '@models/storeCatalog.model';
import SupplierCatalogModel from '@models/supplierCatalog.model';

type WooRestClient = InstanceType<typeof WooCommerceRestApi>;

// --- Types ------------------------------------------------------------------

type StoreApiPrices = {
  price: string;
  regular_price: string;
  sale_price: string;
  currency_minor_unit: number;
};

type StoreApiImage = { src: string };
type StoreApiTerm = { id: number; name: string; slug: string };

export type StoreApiProduct = {
  id: number;
  name: string;
  slug: string;
  type: string;
  sku: string;
  short_description: string;
  description: string;
  on_sale: boolean;
  prices: StoreApiPrices;
  images: StoreApiImage[];
  categories: StoreApiTerm[];
  tags: StoreApiTerm[];
  is_in_stock: boolean;
};

/** WooCommerce REST–like subset returned by `loadSupplierStoreProducts`. */
export type SupplierCatalogWooLikeProduct = {
  name: string;
  type: string;
  regular_price: string;
  description: string;
  short_description: string;
  categories: { id: number }[];
  images: { src: string }[];
};

type WooProduct = { id: number; sku: string };
type WooTerm = { id: number; slug: string; name: string };

export type StoreApiImportResult = {
  /** Sum of supplier rows matching the category filter (if any) across all fetched pages. */
  productsSeen: number;
  created: number;
  updated: number;
  failed: { sku: string; reason: string }[];
  /** Store API pages that returned at least one product. */
  pagesProcessed: number;
  /** Last page number with a non-empty product list. */
  endPage: number;
  /** `per_page` used for Store API requests (WooCommerce typically allows up to 100). */
  perPage: number;
};

/** Optional filter and target category when importing via a saved category rule. */
export type ImportPageCategoryOptions = {
  supplierCategoryId?: number;
  targetStoreCategoryId?: number;
};

/** Maps supplier Store API products to Woo categories: product id wins, then first matching category rule (by rule id order). */
export type ImportRuleResolution = {
  productToStoreCategory: Map<number, number>;
  categoryRulesOrdered: { supplierCategoryId: number; storeCategoryId: number }[];
};

export function resolveImportTargetStoreCategoryId(p: StoreApiProduct, r: ImportRuleResolution): number | undefined {
  const fromProduct = r.productToStoreCategory.get(p.id);
  if (fromProduct != null) return fromProduct;
  const productCatIds = new Set((p.categories || []).map(c => c.id));
  for (const rule of r.categoryRulesOrdered) {
    if (productCatIds.has(rule.supplierCategoryId)) return rule.storeCategoryId;
  }
  return undefined;
}

export type StoreRulesSyncImportResult = {
  storeId: number;
  bySupplier: ({ supplierId: number } & StoreApiImportResult)[];
};

/** When set, each imported product is upserted into `supplier_catalog` and `store_catalog`. */
export type ImportCatalogContext = {
  storeId: number;
  supplierId: number;
};

export type CatalogSyncResult = {
  fetched: number;
  upserted: number;
};

/** WooCommerce Store API category `image` (when present). */
export type StoreApiProductCategoryImage = {
  id?: number;
  src?: string;
  thumbnail?: string;
  srcset?: string;
  sizes?: string;
  name?: string;
  alt?: string;
};

/** WooCommerce Store API `GET /wc/store/v1/products/categories` category object. */
export type StoreApiProductCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent: number;
  count: number;
  image: StoreApiProductCategoryImage | null;
  review_count: number;
  permalink: string;
};

type HttpJsonResult<T> = { status: number; data: T; raw: string };

// --- URL & text --------------------------------------------------------------

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/wp-json\/.*$/, '');
}

function createTargetWooClient(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string,
  port?: number | null,
): WooRestClient {
  return new WooCommerceRestApi({
    url: storeUrl,
    consumerKey,
    consumerSecret,
    version: 'wc/v3',
    queryStringAuth: true,
    ...(port != null && { port }),
  });
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8362;/g, '\u20AA');
}

function safeDecodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function storePriceToWoo(
  prices: StoreApiPrices,
  onSale: boolean,
): { regular_price: string; sale_price?: string } {
  const minor = Number.isFinite(prices.currency_minor_unit) ? prices.currency_minor_unit : 0;
  const div = 10 ** minor;
  const toMajor = (s: string): string => {
    const n = Number(s);
    if (!Number.isFinite(n)) return minor > 0 ? '0.' + '0'.repeat(minor) : '0';
    const major = n / div;
    if (minor > 0) return major.toFixed(minor);
    return String(Math.round(major));
  };

  const regular = toMajor(prices.regular_price || prices.price || '0');
  if (onSale && prices.sale_price && prices.sale_price !== prices.regular_price) {
    return { regular_price: regular, sale_price: toMajor(prices.sale_price) };
  }
  return { regular_price: regular };
}

function mapStoreApiProductToWooLike(p: StoreApiProduct): SupplierCatalogWooLikeProduct {
  const { regular_price } = storePriceToWoo(p.prices, Boolean(p.on_sale));
  return {
    name: p.name ?? '',
    type: p.type ?? 'simple',
    regular_price,
    description: decodeHtmlEntities(p.description ?? ''),
    short_description: decodeHtmlEntities(p.short_description ?? ''),
    categories: (p.categories ?? []).map(c => ({ id: c.id })),
    images: (p.images ?? [])
      .map(img => ({ src: img.src }))
      .filter((i): i is { src: string } => Boolean(i.src)),
  };
}

// --- Supplier HTTP: headers, proxy, errors -----------------------------------

const SUPPLIER_BROWSER_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'identity',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

function explainNonJsonBody(statusCode: number, raw: string): Error {
  const lower = raw.slice(0, 800).toLowerCase();
  const looksLikeChallenge =
    raw.trimStart().startsWith('<!') ||
    lower.includes('just a moment') ||
    lower.includes('cf-challenge') ||
    lower.includes('cloudflare') ||
    lower.includes('checking your browser') ||
    lower.includes('enable javascript');

  if (looksLikeChallenge) {
    return new Error(
      `Catalog site returned HTTP ${statusCode} with a browser challenge (often Cloudflare) instead of JSON. ` +
        `Mitigations: (1) WAF allowlist / exempt GET /wp-json/wc/store/*. (2) SUPPLIER_FETCH_PROXY / SUPPLIER_FETCH_COOKIES. ` +
        `(3) Playwright: npx playwright install chromium; optional SUPPLIER_FETCH_PLAYWRIGHT_CHANNEL=chrome or msedge. ` +
        `(4) SUPPLIER_FETCH_PLAYWRIGHT_HEADED=true. (5) SUPPLIER_FETCH_PLAYWRIGHT_HOME_WAIT_MS=8000. ` +
        `(6) SUPPLIER_FETCH_PLAYWRIGHT_EXECUTABLE=C:/Path/to/chrome.exe`,
    );
  }

  return new Error(`Expected JSON but got HTTP ${statusCode}: ${raw.slice(0, 280).replace(/\s+/g, ' ')}`);
}

function isCloudflareChallengeMessage(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('cloudflare') || m.includes('challenge') || m.includes('just a moment');
}

let cachedProxyUrl: string | undefined;
let cachedHttpsAgent: HttpsProxyAgent<string> | undefined;
let cachedHttpAgent: HttpProxyAgent<string> | undefined;

function supplierProxyAgent(url: URL): http.Agent | undefined {
  const raw =
    process.env.SUPPLIER_FETCH_PROXY?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim();
  if (!raw) return undefined;
  if (cachedProxyUrl !== raw) {
    cachedProxyUrl = raw;
    cachedHttpsAgent = new HttpsProxyAgent(raw);
    cachedHttpAgent = new HttpProxyAgent(raw);
  }
  return url.protocol === 'https:' ? cachedHttpsAgent : cachedHttpAgent;
}

function supplierCatalogExtraHeaders(catalogRefererBase?: string): Record<string, string> {
  const h: Record<string, string> = {};
  const cookies = process.env.SUPPLIER_FETCH_COOKIES?.trim();
  if (cookies) h.Cookie = cookies;
  if (catalogRefererBase) {
    h.Referer = `${catalogRefererBase.replace(/\/+$/, '')}/`;
  }
  return h;
}

type CatalogRequestOptions = {
  supplierCatalog?: boolean;
  catalogRefererBase?: string;
};

function httpRequestJson<T>(
  method: string,
  urlStr: string,
  body?: object,
  opts?: CatalogRequestOptions,
): Promise<HttpJsonResult<T>> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const forCatalog = opts?.supplierCatalog === true;
    const agent = forCatalog ? supplierProxyAgent(url) : undefined;

    const reqOptions: https.RequestOptions = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      headers: {
        ...SUPPLIER_BROWSER_HEADERS,
        ...(forCatalog ? supplierCatalogExtraHeaders(opts?.catalogRefererBase) : {}),
        ...(payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            }
          : {}),
      },
      ...(agent ? { agent } : {}),
    };

    const req = lib.request(reqOptions, res => {
      let raw = '';
      res.on('data', c => {
        raw += c;
      });
      res.on('end', () => {
        if (!raw) {
          resolve({ status: res.statusCode || 0, data: {} as T, raw: '' });
          return;
        }
        try {
          resolve({ status: res.statusCode || 0, data: JSON.parse(raw) as T, raw });
        } catch {
          reject(explainNonJsonBody(res.statusCode || 0, raw));
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// --- Playwright (supplier catalog only) -------------------------------------

function envFlagTrue(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function playwrightForced(): boolean {
  return envFlagTrue('SUPPLIER_FETCH_PLAYWRIGHT');
}

function playwrightAutoRetry(): boolean {
  const v = process.env.SUPPLIER_FETCH_PLAYWRIGHT_AUTO?.trim().toLowerCase();
  if (v === '0' || v === 'false' || v === 'no') return false;
  return true;
}

function playwrightHeaded(): boolean {
  return envFlagTrue('SUPPLIER_FETCH_PLAYWRIGHT_HEADED');
}

const PLAYWRIGHT_CHANNELS = new Set([
  'chromium',
  'chrome',
  'chrome-beta',
  'msedge',
  'msedge-beta',
  'msedge-dev',
]);

function playwrightLaunchOptions(): { channel?: string; executablePath?: string } {
  const exe = process.env.SUPPLIER_FETCH_PLAYWRIGHT_EXECUTABLE?.trim();
  if (exe) return { executablePath: exe };
  const ch = process.env.SUPPLIER_FETCH_PLAYWRIGHT_CHANNEL?.trim();
  if (ch && PLAYWRIGHT_CHANNELS.has(ch)) return { channel: ch };
  return {};
}

function playwrightBrowserProxy(): { server: string } | undefined {
  const raw =
    process.env.SUPPLIER_FETCH_PROXY?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim();
  return raw ? { server: raw } : undefined;
}

let cachedChromium: import('playwright').BrowserType | null = null;

async function getStealthChromium(): Promise<import('playwright').BrowserType> {
  if (cachedChromium) return cachedChromium;
  try {
    const { addExtra } = await import('playwright-extra');
    const playwright = await import('playwright');
    const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
    const chromium = addExtra(playwright.chromium);
    chromium.use(StealthPlugin());
    cachedChromium = chromium as unknown as import('playwright').BrowserType;
  } catch {
    const { chromium } = await import('playwright');
    cachedChromium = chromium;
  }
  return cachedChromium;
}

function parseProductArray(raw: string): StoreApiProduct[] | null {
  try {
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? (data as StoreApiProduct[]) : null;
  } catch {
    return null;
  }
}

function parseProductCategoryArray(raw: string): StoreApiProductCategory[] | null {
  try {
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? (data as StoreApiProductCategory[]) : null;
  } catch {
    return null;
  }
}

async function fetchCatalogViaPlaywright<T>(
  listUrl: string,
  catalogOrigin: string,
  parseArray: (raw: string) => T[] | null,
): Promise<HttpJsonResult<T[]>> {
  let chromium: import('playwright').BrowserType;
  try {
    chromium = await getStealthChromium();
  } catch {
    throw new Error(
      'Playwright failed to load. Run: npm install playwright && npx playwright install chromium',
    );
  }

  const proxy = playwrightBrowserProxy();
  const browser = await chromium.launch({
    headless: !playwrightHeaded(),
    args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-blink-features=AutomationControlled'],
    ...(proxy ? { proxy } : {}),
    ...playwrightLaunchOptions(),
  });

  try {
    const extraHeaders: Record<string, string> = { ...SUPPLIER_BROWSER_HEADERS };
    const cookies = process.env.SUPPLIER_FETCH_COOKIES?.trim();
    if (cookies) extraHeaders.Cookie = cookies;

    const context = await browser.newContext({
      userAgent: SUPPLIER_BROWSER_HEADERS['User-Agent'],
      extraHTTPHeaders: extraHeaders,
      locale: 'en-US',
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();
    const homeUrl = `${catalogOrigin.replace(/\/+$/, '')}/`;
    const referer = homeUrl;

    await page.goto(homeUrl, { waitUntil: 'networkidle', timeout: 120_000 });

    const homeWaitMs = Math.min(
      Math.max(0, Number(process.env.SUPPLIER_FETCH_PLAYWRIGHT_HOME_WAIT_MS ?? '2500') || 0),
      60_000,
    );
    if (homeWaitMs > 0) {
      await new Promise<void>(r => setTimeout(r, homeWaitMs));
    }

    const apiHeaders = {
      Accept: SUPPLIER_BROWSER_HEADERS['Accept'],
      'Accept-Language': SUPPLIER_BROWSER_HEADERS['Accept-Language'],
      Referer: referer,
    };

    let status = 0;
    let raw = '';

    const tryReturn = (data: T[] | null): HttpJsonResult<T[]> | null => {
      if (!data) return null;
      return { status, data, raw };
    };

    const r1 = await context.request.get(listUrl, { headers: apiHeaders, timeout: 120_000 });
    status = r1.status();
    raw = await r1.text();
    const out1 = tryReturn(parseArray(raw));
    if (out1) return out1;

    const r2 = await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 120_000 });
    status = r2?.status() ?? 0;
    raw = r2 ? await r2.text() : '';
    const out2 = tryReturn(parseArray(raw));
    if (out2) return out2;

    const r3 = await page.evaluate(
      async (opts: { url: string; ref: string }) => {
        const g = globalThis as unknown as {
          fetch: (
            input: string,
            init?: { credentials?: string; headers?: Record<string, string> },
          ) => Promise<{ status: number; text: () => Promise<string> }>;
        };
        const res = await g.fetch(opts.url, {
          credentials: 'include',
          headers: { Accept: 'application/json, text/plain, */*', Referer: opts.ref },
        });
        return { status: res.status, text: await res.text() };
      },
      { url: listUrl, ref: referer },
    );
    status = r3.status;
    raw = r3.text;
    const out3 = tryReturn(parseArray(raw));
    if (out3) return out3;

    throw new Error(
      `Supplier still returned a block page (HTTP ${status}) after Playwright (request, navigate, in-page fetch). ` +
        `Strict Cloudflare often blocks datacenter IPs and automation. ` +
        `Try allowlisting your IP for /wp-json/wc/store/*, SUPPLIER_FETCH_PLAYWRIGHT_CHANNEL=chrome, or a residential proxy. ` +
        `Detail: ${explainNonJsonBody(status, raw).message}`,
    );
  } finally {
    await browser.close();
  }
}

/** Load Store API JSON array: HTTP first (unless Playwright forced), optional auto Playwright retry. */
async function loadStoreApiArray<T>(
  listUrl: string,
  catalogOrigin: string,
  parseArray: (raw: string) => T[] | null,
): Promise<HttpJsonResult<T[]>> {
  if (playwrightForced()) {
    return fetchCatalogViaPlaywright(listUrl, catalogOrigin, parseArray);
  }
  try {
    return await httpRequestJson<T[]>('GET', listUrl, undefined, {
      supplierCatalog: true,
      catalogRefererBase: catalogOrigin,
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (playwrightAutoRetry() && isCloudflareChallengeMessage(msg)) {
      return fetchCatalogViaPlaywright(listUrl, catalogOrigin, parseArray);
    }
    throw e;
  }
}

async function loadStoreApiProductList(
  listUrl: string,
  catalogOrigin: string,
): Promise<HttpJsonResult<StoreApiProduct[]>> {
  return loadStoreApiArray(listUrl, catalogOrigin, parseProductArray);
}

/** Public: supplier catalog product categories (Store API v1). */
export async function loadSupplierStoreProductCategories(catalogBaseUrl: string): Promise<StoreApiProductCategory[]> {
  const sourceBase = normalizeBaseUrl(catalogBaseUrl);
  const listUrl = `${sourceBase}/wp-json/wc/store/v1/products/categories`;

  let listRes: HttpJsonResult<StoreApiProductCategory[]>;
  try {
    listRes = await loadStoreApiArray(listUrl, sourceBase, parseProductCategoryArray);
  } catch (e) {
    throw new HttpException(502, `Failed to fetch Store API categories: ${(e as Error).message}`);
  }

  if (listRes.status >= 400) {
    throw new HttpException(502, `Store API categories returned ${listRes.status}: ${listRes.raw.slice(0, 200)}`);
  }
  if (!Array.isArray(listRes.data)) {
    throw new HttpException(502, 'Store API categories returned unexpected payload (expected array)');
  }
  return listRes.data;
}

const STORE_API_CATEGORY_PER_PAGE = 100;
const STORE_API_CATEGORY_MAX_PAGES = 100;

/** Store API `products/categories`: all pages until empty or short page. */
export async function fetchAllSupplierStoreApiProductCategories(catalogBaseUrl: string): Promise<StoreApiProductCategory[]> {
  const sourceBase = normalizeBaseUrl(catalogBaseUrl);
  const all: StoreApiProductCategory[] = [];

  for (let page = 1; page <= STORE_API_CATEGORY_MAX_PAGES; page += 1) {
    const listUrl = `${sourceBase}/wp-json/wc/store/v1/products/categories?page=${page}&per_page=${STORE_API_CATEGORY_PER_PAGE}`;
    let listRes: HttpJsonResult<StoreApiProductCategory[]>;
    try {
      listRes = await loadStoreApiArray(listUrl, sourceBase, parseProductCategoryArray);
    } catch (e) {
      throw new HttpException(502, `Failed to fetch Store API categories: ${(e as Error).message}`);
    }

    if (listRes.status >= 400) {
      throw new HttpException(502, `Store API categories returned ${listRes.status}: ${listRes.raw.slice(0, 200)}`);
    }
    if (!Array.isArray(listRes.data)) {
      throw new HttpException(502, 'Store API categories returned unexpected payload (expected array)');
    }
    if (listRes.data.length === 0) break;

    all.push(...listRes.data);
    if (listRes.data.length < STORE_API_CATEGORY_PER_PAGE) break;
  }

  return all;
}

/** Public: supplier catalog products (Store API), all pages until exhausted (capped). */
export async function loadSupplierStoreProducts(catalogBaseUrl: string): Promise<SupplierCatalogWooLikeProduct[]> {
  const sourceBase = normalizeBaseUrl(catalogBaseUrl);
  const perPage = 100;
  const maxPages = 100;
  const all: SupplierCatalogWooLikeProduct[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const listUrl = `${sourceBase}/wp-json/wc/store/products?page=${page}&per_page=${perPage}`;
    let listRes: HttpJsonResult<StoreApiProduct[]>;
    try {
      listRes = await loadStoreApiProductList(listUrl, sourceBase);
    } catch (e) {
      throw new HttpException(502, `Failed to fetch Store API products: ${(e as Error).message}`);
    }

    if (listRes.status >= 400) {
      throw new HttpException(502, `Store API products returned ${listRes.status}: ${listRes.raw.slice(0, 200)}`);
    }
    if (!Array.isArray(listRes.data)) {
      throw new HttpException(502, 'Store API products returned unexpected payload (expected array)');
    }
    if (listRes.data.length === 0) break;

    all.push(...listRes.data.map(mapStoreApiProductToWooLike));
    if (listRes.data.length < perPage) break;
  }

  return all;
}

// --- Woo REST error helper ---------------------------------------------------

function wooErrorDetail(data: unknown, raw: string): string {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    return String((data as { message: string }).message);
  }
  return raw.slice(0, 200);
}

function wooHttpErrorDetail(err: unknown): string {
  const nonAxiosMessage = (): string =>
    err instanceof Error ? err.message : typeof err === 'string' ? err : String(err);

  if (typeof err !== 'object' || err === null || !('response' in err)) {
    return nonAxiosMessage();
  }
  const res = (err as { response?: { status?: number; data?: unknown } }).response;
  if (!res || typeof res.status !== 'number') {
    return nonAxiosMessage();
  }
  const raw =
    typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? '').slice(0, 200);
  return `${res.status} ${wooErrorDetail(res.data, raw)}`;
}

// --- Store API → WooCommerce REST import --------------------------------------

export const STORE_API_IMPORT_PER_PAGE = 100;

export function supplierProductSkusFromStoreApi(p: StoreApiProduct): { skuOriginal: string | null; sku: string } {
  const raw = p.sku != null ? String(p.sku).trim() : '';
  const skuOriginal = raw.length > 0 ? raw : null;
  const sku = skuOriginal ?? `import-${p.id}`;
  return { skuOriginal, sku };
}

const STORE_API_PRODUCT_DEFAULTS: Omit<StoreApiProduct, 'id' | 'name' | 'sku'> = {
  slug: '',
  type: 'simple',
  short_description: '',
  description: '',
  on_sale: false,
  prices: { price: '0', regular_price: '0', sale_price: '0', currency_minor_unit: 0 },
  images: [],
  categories: [],
  tags: [],
  is_in_stock: true,
};

/** Build a `StoreApiProduct` from a `supplier_catalog` row (payload JSON + columns). */
export function storeApiProductFromSupplierCatalogRow(row: {
  sourceProductId: number;
  name: string | null;
  sku: string;
  payload: object | null;
}): StoreApiProduct {
  const id = row.sourceProductId;
  if (row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)) {
    const p = row.payload as Record<string, unknown>;
    const pricesRaw = p.prices;
    const prices: StoreApiPrices =
      pricesRaw && typeof pricesRaw === 'object' && !Array.isArray(pricesRaw)
        ? {
            ...STORE_API_PRODUCT_DEFAULTS.prices,
            ...(pricesRaw as StoreApiPrices),
          }
        : STORE_API_PRODUCT_DEFAULTS.prices;
    return {
      ...STORE_API_PRODUCT_DEFAULTS,
      ...(p as Partial<StoreApiProduct>),
      id,
      name: typeof p.name === 'string' ? p.name : row.name ?? '',
      sku: typeof p.sku === 'string' && String(p.sku).trim() ? p.sku : row.sku,
      prices,
      images: Array.isArray(p.images) ? (p.images as StoreApiImage[]) : [],
      categories: Array.isArray(p.categories) ? (p.categories as StoreApiTerm[]) : [],
      tags: Array.isArray(p.tags) ? (p.tags as StoreApiTerm[]) : [],
    };
  }
  return {
    ...STORE_API_PRODUCT_DEFAULTS,
    id,
    name: row.name ?? '',
    sku: row.sku,
  };
}

/** All Store API product pages until empty or short page. */
export async function fetchAllSupplierStoreApiProducts(catalogBaseUrl: string): Promise<StoreApiProduct[]> {
  const sourceBase = normalizeBaseUrl(catalogBaseUrl);
  const perPage = STORE_API_IMPORT_PER_PAGE;
  const all: StoreApiProduct[] = [];
  let pageNum = 1;
  while (true) {
    const listUrl = `${sourceBase}/wp-json/wc/store/products?page=${pageNum}&per_page=${perPage}`;
    let listRes: HttpJsonResult<StoreApiProduct[]>;
    try {
      listRes = await loadStoreApiProductList(listUrl, sourceBase);
    } catch (e) {
      throw new HttpException(502, `Failed to fetch Store API: ${(e as Error).message}`);
    }
    if (listRes.status >= 400) {
      throw new HttpException(502, `Store API returned ${listRes.status}: ${listRes.raw.slice(0, 200)}`);
    }
    if (!Array.isArray(listRes.data)) {
      throw new HttpException(502, 'Store API returned unexpected payload (expected array)');
    }
    if (listRes.data.length === 0) break;
    all.push(...listRes.data);
    if (listRes.data.length < perPage) break;
    pageNum += 1;
  }
  return all;
}

async function persistCatalogAfterImport(
  catalog: ImportCatalogContext,
  p: StoreApiProduct,
  wooProductId: number,
  wooPayload: Record<string, unknown>,
): Promise<void> {
  const { skuOriginal, sku } = supplierProductSkusFromStoreApi(p);
  await SupplierCatalogModel.upsert({
    supplierId: catalog.supplierId,
    sourceProductId: p.id,
    skuOriginal,
    sku,
    name: p.name ?? null,
    payload: p as object,
  });
  await StoreCatalogModel.upsert({
    storeId: catalog.storeId,
    wooProductId,
    sku,
    name: p.name ?? null,
    sourceSupplierId: catalog.supplierId,
    sourceProductId: p.id,
    payload: { ...wooPayload, id: wooProductId } as object,
  });
}

async function importStoreApiProductRows(
  pageProducts: StoreApiProduct[],
  woo: WooRestClient,
  importTags: boolean,
  getTargetStoreCategoryId: (p: StoreApiProduct) => number | undefined,
  catalog?: ImportCatalogContext,
): Promise<{ created: number; updated: number; failed: { sku: string; reason: string }[] }> {
  const failed: { sku: string; reason: string }[] = [];
  let created = 0;
  let updated = 0;
  for (const p of pageProducts) {
    const { sku } = supplierProductSkusFromStoreApi(p);
    try {
      const targetStoreCategoryId = getTargetStoreCategoryId(p);
      const payload = await buildWooProductPayload(
        p,
        woo,
        importTags,
        targetStoreCategoryId,
        catalog?.supplierId,
      );
      const upsert = await upsertWooProduct(woo, sku, payload);
      if (catalog) {
        await persistCatalogAfterImport(catalog, p, upsert.id, payload);
      }
      if (upsert.action === 'created') created += 1;
      else updated += 1;
    } catch (err) {
      failed.push({ sku, reason: (err as Error).message });
    }
  }
  return { created, updated, failed };
}

/**
 * Paginates Store API `GET /wc/store/products` until an empty page or a short page (fewer than `per_page` rows),
 * then imports every matching product into Woo REST (one Woo client for the whole run).
 */
export async function importPage(
  targetBaseUrl: string,
  sourceBaseUrl: string,
  consumerKey: string,
  consumerSecret: string,
  dto: ImportStoreProductsDto,
  categoryOpts?: ImportPageCategoryOptions,
  catalog?: ImportCatalogContext,
  port?: number | null,
): Promise<StoreApiImportResult> {
  const targetBase = normalizeBaseUrl(targetBaseUrl);
  const sourceBase = normalizeBaseUrl(sourceBaseUrl);
  const importTags = dto.importTags ?? false;
  const perPage = STORE_API_IMPORT_PER_PAGE;

  const woo = createTargetWooClient(targetBase, consumerKey, consumerSecret, port);
  const result: StoreApiImportResult = {
    productsSeen: 0,
    created: 0,
    updated: 0,
    failed: [],
    pagesProcessed: 0,
    endPage: 0,
    perPage,
  };

  let pageNum = 1;
  while (true) {
    const listUrl = `${sourceBase}/wp-json/wc/store/products?page=${pageNum}&per_page=${perPage}`;
    let listRes: HttpJsonResult<StoreApiProduct[]>;
    try {
      listRes = await loadStoreApiProductList(listUrl, sourceBase);
    } catch (e) {
      throw new HttpException(502, `Failed to fetch Store API: ${(e as Error).message}`);
    }

    if (listRes.status >= 400) {
      throw new HttpException(502, `Store API returned ${listRes.status}: ${listRes.raw.slice(0, 200)}`);
    }
    if (!Array.isArray(listRes.data)) {
      throw new HttpException(502, 'Store API returned unexpected payload (expected array)');
    }

    const rawRows = listRes.data;
    if (rawRows.length === 0) break;

    result.pagesProcessed += 1;
    result.endPage = pageNum;

    let pageProducts = rawRows;
    if (categoryOpts?.supplierCategoryId != null) {
      const cid = categoryOpts.supplierCategoryId;
      pageProducts = pageProducts.filter(p => (p.categories || []).some(c => c.id === cid));
    }
    result.productsSeen += pageProducts.length;

    if (pageProducts.length > 0) {
      const getTargetStoreCategoryId =
        categoryOpts?.supplierCategoryId != null
          ? () => categoryOpts.targetStoreCategoryId
          : () => undefined;
      const batch = await importStoreApiProductRows(pageProducts, woo, importTags, getTargetStoreCategoryId, catalog);
      result.created += batch.created;
      result.updated += batch.updated;
      result.failed.push(...batch.failed);
    }

    if (rawRows.length < perPage) break;
    pageNum += 1;
  }

  return result;
}

/**
 * Import all supplier Store API products for one supplier, assigning each row’s Woo category from
 * {@link ImportRuleResolution} (product rules, then category rules), or default mapping when unresolved.
 */
export async function importPageWithRuleResolution(
  targetBaseUrl: string,
  sourceBaseUrl: string,
  consumerKey: string,
  consumerSecret: string,
  dto: ImportStoreProductsDto,
  resolution: ImportRuleResolution,
  catalog?: ImportCatalogContext,
  port?: number | null,
): Promise<StoreApiImportResult> {
  const targetBase = normalizeBaseUrl(targetBaseUrl);
  const sourceBase = normalizeBaseUrl(sourceBaseUrl);
  const importTags = dto.importTags ?? false;
  const perPage = STORE_API_IMPORT_PER_PAGE;

  const woo = createTargetWooClient(targetBase, consumerKey, consumerSecret, port);
  const result: StoreApiImportResult = {
    productsSeen: 0,
    created: 0,
    updated: 0,
    failed: [],
    pagesProcessed: 0,
    endPage: 0,
    perPage,
  };

  const getTargetStoreCategoryId = (p: StoreApiProduct) => resolveImportTargetStoreCategoryId(p, resolution);

  let pageNum = 1;
  while (true) {
    const listUrl = `${sourceBase}/wp-json/wc/store/products?page=${pageNum}&per_page=${perPage}`;
    let listRes: HttpJsonResult<StoreApiProduct[]>;
    try {
      listRes = await loadStoreApiProductList(listUrl, sourceBase);
    } catch (e) {
      throw new HttpException(502, `Failed to fetch Store API: ${(e as Error).message}`);
    }

    if (listRes.status >= 400) {
      throw new HttpException(502, `Store API returned ${listRes.status}: ${listRes.raw.slice(0, 200)}`);
    }
    if (!Array.isArray(listRes.data)) {
      throw new HttpException(502, 'Store API returned unexpected payload (expected array)');
    }

    const rawRows = listRes.data;
    if (rawRows.length === 0) break;

    result.pagesProcessed += 1;
    result.endPage = pageNum;
    result.productsSeen += rawRows.length;

    const batch = await importStoreApiProductRows(rawRows, woo, importTags, getTargetStoreCategoryId, catalog);
    result.created += batch.created;
    result.updated += batch.updated;
    result.failed.push(...batch.failed);

    if (rawRows.length < perPage) break;
    pageNum += 1;
  }

  return result;
}

/**
 * Same category resolution as {@link importPageWithRuleResolution}, but products come from
 * `supplier_catalog` rows (no live Store API list fetch).
 */
export async function importFromSupplierCatalogWithRuleResolution(
  targetBaseUrl: string,
  consumerKey: string,
  consumerSecret: string,
  products: StoreApiProduct[],
  dto: ImportStoreProductsDto,
  resolution: ImportRuleResolution,
  catalog?: ImportCatalogContext,
  port?: number | null,
): Promise<StoreApiImportResult> {
  const targetBase = normalizeBaseUrl(targetBaseUrl);
  const importTags = dto.importTags ?? false;
  const perPage = STORE_API_IMPORT_PER_PAGE;

  const woo = createTargetWooClient(targetBase, consumerKey, consumerSecret, port);
  const getTargetStoreCategoryId = (p: StoreApiProduct) => resolveImportTargetStoreCategoryId(p, resolution);

  const batch = await importStoreApiProductRows(products, woo, importTags, getTargetStoreCategoryId, catalog);

  return {
    productsSeen: products.length,
    created: batch.created,
    updated: batch.updated,
    failed: batch.failed,
    pagesProcessed: products.length > 0 ? 1 : 0,
    endPage: products.length > 0 ? 1 : 0,
    perPage,
  };
}

async function buildWooProductPayload(
  p: StoreApiProduct,
  woo: WooRestClient,
  importTags: boolean,
  targetStoreCategoryId?: number,
  sourceSupplierId?: number,
): Promise<Record<string, unknown>> {
  const { regular_price, sale_price } = storePriceToWoo(p.prices, Boolean(p.on_sale));

  let categoryIds: number[];
  if (targetStoreCategoryId != null) {
    categoryIds = [targetStoreCategoryId];
  } else {
    categoryIds = [];
    for (const c of p.categories || []) {
      const id = await ensureProductTerm(woo, 'categories', safeDecodeSlug(c.slug), decodeHtmlEntities(c.name));
      categoryIds.push(id);
    }
  }

  const tagIds: number[] = [];
  if (importTags) {
    for (const t of p.tags || []) {
      const id = await ensureProductTerm(woo, 'tags', safeDecodeSlug(t.slug), decodeHtmlEntities(t.name));
      tagIds.push(id);
    }
  }

  const sku = (p.sku && String(p.sku).trim()) || `import-${p.id}`;
  const meta_data: { key: string; value: string }[] = [
    { key: '_source_store_product_id', value: String(p.id) },
  ];
  if (sourceSupplierId != null) {
    meta_data.push({ key: '_source_supplier_id', value: String(sourceSupplierId) });
  }
  return {
    name: p.name,
    slug: safeDecodeSlug(p.slug),
    type: p.type || 'simple',
    sku,
    short_description: p.short_description || '',
    description: p.description || '',
    regular_price,
    ...(sale_price ? { sale_price } : {}),
    stock_status: p.is_in_stock ? 'instock' : 'outofstock',
    manage_stock: false,
    images: (p.images || []).map(img => ({ src: img.src })),
    categories: categoryIds.map(id => ({ id })),
    ...(tagIds.length ? { tags: tagIds.map(id => ({ id })) } : {}),
    meta_data,
  };
}

async function ensureProductTerm(
  woo: WooRestClient,
  kind: 'categories' | 'tags',
  slug: string,
  name: string,
): Promise<number> {
  const endpoint = kind === 'categories' ? 'products/categories' : 'products/tags';
  let existing: WooTerm[];
  try {
    const res = await woo.get(endpoint, { slug });
    existing = res.data as WooTerm[];
  } catch (err) {
    throw new Error(`WooCommerce ${kind} search failed: ${wooHttpErrorDetail(err)}`);
  }
  if (Array.isArray(existing) && existing.length) return existing[0].id;

  try {
    const res = await woo.post(endpoint, { name, slug });
    return (res.data as WooTerm).id;
  } catch (err) {
    throw new Error(`WooCommerce create ${kind} failed: ${wooHttpErrorDetail(err)}`);
  }
}

async function upsertWooProduct(
  woo: WooRestClient,
  sku: string,
  payload: Record<string, unknown>,
): Promise<{ action: 'created' | 'updated'; id: number }> {
  let foundRows: WooProduct[];
  try {
    const res = await woo.get('products', { sku });
    foundRows = res.data as WooProduct[];
  } catch (err) {
    throw new Error(`WooCommerce product search failed: ${wooHttpErrorDetail(err)}`);
  }

  if (Array.isArray(foundRows) && foundRows.length > 0) {
    const id = foundRows[0].id;
    try {
      await woo.put(`products/${id}`, payload);
    } catch (err) {
      throw new Error(`WooCommerce product update failed: ${wooHttpErrorDetail(err)}`);
    }
    return { action: 'updated', id };
  }

  try {
    const res = await woo.post('products', payload);
    const data = res.data as WooProduct;
    return { action: 'created', id: data.id };
  } catch (err) {
    throw new Error(`WooCommerce product create failed: ${wooHttpErrorDetail(err)}`);
  }
}
