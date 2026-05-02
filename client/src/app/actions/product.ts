"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendFetch } from "@/lib/backend-fetch";
import { fetchStoreEditData } from "@/lib/store-edit-load";
import { isLocale, type Locale } from "@/i18n/config";
import { getProductFormMessages } from "@/messages/product-form";

export type ProductFormField =
  | "name"
  | "sku"
  | "regular_price"
  | "sale_price"
  | "description"
  | "short_description"
  | "status"
  | "stock_quantity";

export type ProductFormState = {
  message?: string;
  fieldErrors?: Partial<Record<ProductFormField, string>>;
  success?: boolean;
} | null;

function messages(locale: string) {
  const l: Locale = isLocale(locale) ? locale : "he";
  return getProductFormMessages(l);
}

async function readApiError(res: Response): Promise<string> {
  const t = await res.text();
  try {
    const j = JSON.parse(t) as { message?: string };
    return j.message ?? (t || res.statusText);
  } catch {
    return t || res.statusText;
  }
}

/** Direct WooCommerce call — bypasses backend DTO for fields it doesn't expose */
async function updateProductDirect(
  storeId: string,
  wooProductId: string,
  payload: Record<string, unknown>,
) {
  const storeData = await fetchStoreEditData(storeId);
  if (!storeData.ok) return;

  const { url, port, consumerKey, consumerSecret } = storeData.data;

  let wpBase: string;
  try {
    const urlObj = new URL(url.replace(/\/$/, ""));
    if (port && !urlObj.port) urlObj.port = String(port);
    wpBase = urlObj.toString().replace(/\/$/, "");
  } catch {
    wpBase = url.replace(/\/$/, "");
  }

  const wooUrl = `${wpBase}/wp-json/wc/v3/products/${wooProductId}`;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    "base64",
  );

  try {
    await fetch(wooUrl, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    /* best-effort — don't block the redirect */
  }
}

export async function updateProductAction(
  locale: string,
  storeId: string,
  wooProductId: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const m = messages(locale);

  if (!storeId || !wooProductId) {
    return { message: m.errorMissingProductContext };
  }

  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const regular_price = String(formData.get("regular_price") ?? "").trim();
  const sale_price = String(formData.get("sale_price") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const short_description = String(
    formData.get("short_description") ?? "",
  ).trim();
  const status = String(formData.get("status") ?? "publish").trim();
  const manage_stock = formData.get("manage_stock") === "on";
  const stock_status = String(formData.get("stock_status") ?? "instock").trim();
  const stock_quantity_raw = String(
    formData.get("stock_quantity") ?? "",
  ).trim();
  const stock_quantity =
    stock_quantity_raw !== "" ? Number(stock_quantity_raw) : undefined;
  const image_url = String(formData.get("image_url") ?? "").trim();

  if (!name) {
    return { fieldErrors: { name: m.errorFieldRequired } };
  }

  /* Main product update via backend proxy (images excluded — not in DTO) */
  const body: Record<string, unknown> = {
    name,
    ...(sku ? { sku } : {}),
    ...(regular_price ? { regular_price } : {}),
    sale_price: sale_price !== "" ? sale_price : regular_price,
    ...(description ? { description } : {}),
    ...(short_description ? { short_description } : {}),
    status,
    manage_stock,
    ...(manage_stock && stock_quantity !== undefined ? { stock_quantity } : {}),
  };

  let res: Response;
  try {
    res = await backendFetch(
      `/stores/${storeId}/woo-products/${wooProductId}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
    );
  } catch {
    return { message: m.errorServerMisconfigured };
  }

  if (!res.ok) {
    return {
      message: `${m.errorFromServer} ${await readApiError(res)}`,
    };
  }

  /* Direct WooCommerce call — bypasses backend DTO restriction */
  const directPayload: Record<string, unknown> = {
    ...(image_url !== undefined
      ? { images: image_url ? [{ src: image_url }] : [] }
      : {}),
    ...(!manage_stock ? { stock_status } : {}),
  };
  await updateProductDirect(storeId, wooProductId, directPayload);

  revalidatePath(`/${locale}/stores/${storeId}`);
  return { success: true, message: m.successMessage };
}
