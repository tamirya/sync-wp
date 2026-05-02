import { isLocale, type Locale } from "@/i18n/config";
import { backendFetch } from "@/lib/backend-fetch";
import { getProductFormMessages } from "@/messages/product-form";
import { notFound, redirect } from "next/navigation";
import { ProductEditForm, type ProductFormInitial } from "./product-edit-form";

/* ------------------------------------------------------------------ */
/*  Raw Woo product type                                               */
/* ------------------------------------------------------------------ */
type RawWooProduct = Record<string, unknown>;

type LoadedProduct = {
  name: string;
  sku: string;
  regular_price: string;
  sale_price: string;
  description: string;
  short_description: string;
  status: string;
  manage_stock: boolean;
  stock_status: string;
  stock_quantity: string;
  image_url: string;
};

function str(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseProduct(raw: RawWooProduct): LoadedProduct {
  const product =
    raw.product && typeof raw.product === "object"
      ? { ...(raw.product as RawWooProduct), ...raw }
      : raw;

  return {
    name: decodeEntities(str(product.name)),
    sku: str(product.sku),
    regular_price: str(product.regular_price),
    sale_price: str(product.sale_price),
    description: str(product.description),
    short_description: str(product.short_description),
    status: str(product.status) || "publish",
    manage_stock: product.manage_stock === true,
    stock_status: str(product.stock_status) || "instock",
    stock_quantity:
      product.stock_quantity != null ? str(product.stock_quantity) : "",
    image_url: Array.isArray(product.images)
      ? str((product.images as Array<Record<string, unknown>>)[0]?.src)
      : "",
  };
}

/* ------------------------------------------------------------------ */
/*  Fetcher                                                             */
/* ------------------------------------------------------------------ */
async function fetchWooProduct(
  storeId: string,
  wooProductId: string,
): Promise<
  { ok: true; product: LoadedProduct } | { ok: false; status: number }
> {
  try {
    const res = await backendFetch(
      `/stores/${storeId}/woo-products/${wooProductId}`,
    );
    if (!res.ok) return { ok: false, status: res.status };
    const json = (await res.json()) as { data?: RawWooProduct };
    if (!json.data) return { ok: false, status: 404 };
    return { ok: true, product: parseProduct(json.data) };
  } catch {
    return { ok: false, status: 401 };
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
type Props = {
  params: Promise<{ locale: string; id: string; productId: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { locale: raw, id: storeId, productId } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const messages = getProductFormMessages(locale);

  const loaded = await fetchWooProduct(storeId, productId);

  if (!loaded.ok) {
    if (loaded.status === 401) {
      redirect(
        `/${locale}/login?next=/${locale}/stores/${storeId}/products/${productId}/edit`,
      );
    }
    notFound();
  }

  const initial: ProductFormInitial = loaded.product;

  return (
    <div className="mx-auto max-w-6xl">
      <ProductEditForm
        locale={locale}
        storeId={storeId}
        wooProductId={productId}
        messages={messages}
        initial={initial}
      />
    </div>
  );
}
