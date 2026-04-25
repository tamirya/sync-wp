"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendFetch } from "@/lib/backend-fetch";
import { isLocale, type Locale } from "@/i18n/config";
import { getStoresFormMessages } from "@/messages/stores-form";

export type StoreFormField =
  | "name"
  | "url"
  | "port"
  | "consumerKey"
  | "consumerSecret";

export type StoreFormState = {
  message?: string;
  fieldErrors?: Partial<Record<StoreFormField, string>>;
} | null;

function messages(locale: string) {
  const l: Locale = isLocale(locale) ? locale : "he";
  return getStoresFormMessages(l);
}

function requiredStoreFieldErrors(
  locale: string,
  checks: {
    name: boolean;
    url: boolean;
    consumerKey: boolean;
    consumerSecret: boolean;
  },
): Partial<Record<StoreFormField, string>> | undefined {
  const m = messages(locale);
  const out: Partial<Record<StoreFormField, string>> = {};
  if (!checks.name) out.name = m.errorFieldRequired;
  if (!checks.url) out.url = m.errorFieldRequired;
  if (!checks.consumerKey) out.consumerKey = m.errorFieldRequired;
  if (!checks.consumerSecret) out.consumerSecret = m.errorFieldRequired;
  return Object.keys(out).length ? out : undefined;
}

export async function submitStoreFormAction(
  locale: string,
  mode: "create" | "edit",
  storeId: string | null,
  envRowId: number | null,
  prev: StoreFormState,
  formData: FormData,
): Promise<StoreFormState> {
  if (mode === "create") {
    return createStoreAction(locale, prev, formData);
  }
  if (!storeId) {
    return { message: messages(locale).errorMissingStoreContext };
  }
  return updateStoreAction(locale, storeId, envRowId, prev, formData);
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

export async function createStoreAction(
  locale: string,
  _prev: StoreFormState,
  formData: FormData,
): Promise<StoreFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const portRaw = String(formData.get("port") ?? "").trim();
  const port = portRaw ? Number(portRaw) : undefined;
  const consumerKey = String(formData.get("consumerKey") ?? "").trim();
  const consumerSecret = String(formData.get("consumerSecret") ?? "").trim();

  const fieldErrors = requiredStoreFieldErrors(locale, {
    name: Boolean(name),
    url: Boolean(url),
    consumerKey: Boolean(consumerKey),
    consumerSecret: Boolean(consumerSecret),
  });
  if (fieldErrors) {
    return { fieldErrors };
  }

  let storeRes: Response;
  try {
    storeRes = await backendFetch("/stores", {
      method: "POST",
      body: JSON.stringify({ name, url, ...(port ? { port } : {}) }),
    });
  } catch {
    return { message: messages(locale).errorServerMisconfigured };
  }

  if (!storeRes.ok) {
    return {
      message: `${messages(locale).errorFromServer} ${await readApiError(storeRes)}`,
    };
  }

  let storeId: number;
  try {
    const j = (await storeRes.json()) as { data?: { id?: number } };
    storeId = j.data?.id ?? 0;
  } catch {
    return { message: messages(locale).errorInvalidServerResponse };
  }
  if (!storeId) {
    return { message: messages(locale).errorMissingStoreId };
  }

  const envRes = await backendFetch("/env_to_store", {
    method: "POST",
    body: JSON.stringify({ storeId, consumerKey, consumerSecret }),
  });

  if (!envRes.ok) {
    return {
      message: `${messages(locale).errorStoreCreatedKeysFailed} ${await readApiError(envRes)}`,
    };
  }

  revalidatePath(`/${locale}/stores`);
  redirect(`/${locale}/stores`);
}

export async function updateStoreAction(
  locale: string,
  storeId: string,
  envRowId: number | null,
  _prev: StoreFormState,
  formData: FormData,
): Promise<StoreFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const portRaw = String(formData.get("port") ?? "").trim();
  const port = portRaw ? Number(portRaw) : undefined;
  const consumerKey = String(formData.get("consumerKey") ?? "").trim();
  const consumerSecret = String(formData.get("consumerSecret") ?? "").trim();

  const fieldErrors = requiredStoreFieldErrors(locale, {
    name: Boolean(name),
    url: Boolean(url),
    consumerKey: Boolean(consumerKey),
    consumerSecret: Boolean(consumerSecret),
  });
  if (fieldErrors) {
    return { fieldErrors };
  }

  let putRes: Response;
  try {
    putRes = await backendFetch(`/stores/${storeId}`, {
      method: "PUT",
      body: JSON.stringify({ name, url, ...(port ? { port } : {}) }),
    });
  } catch {
    return { message: messages(locale).errorServerMisconfigured };
  }

  if (!putRes.ok) {
    return {
      message: `${messages(locale).errorFromServer} ${await readApiError(putRes)}`,
    };
  }

  const sid = Number(storeId);
  const envBody = JSON.stringify({ storeId: sid, consumerKey, consumerSecret });

  if (envRowId != null) {
    const envPut = await backendFetch(`/env_to_store/${envRowId}`, {
      method: "PUT",
      body: envBody,
    });
    if (!envPut.ok) {
      return {
        message: `${messages(locale).errorFromServer} ${await readApiError(envPut)}`,
      };
    }
  } else {
    const envPost = await backendFetch("/env_to_store", {
      method: "POST",
      body: envBody,
    });
    if (!envPost.ok) {
      return {
        message: `${messages(locale).errorFromServer} ${await readApiError(envPost)}`,
      };
    }
  }

  revalidatePath(`/${locale}/stores`);
  redirect(`/${locale}/stores`);
}
