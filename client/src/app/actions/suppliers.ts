"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backendFetch } from "@/lib/backend-fetch";
import { isLocale, type Locale } from "@/i18n/config";
import { getSuppliersFormMessages } from "@/messages/suppliers-form";

export type SupplierFormField = "name" | "url";

export type SupplierFormState = {
  message?: string;
  fieldErrors?: Partial<Record<SupplierFormField, string>>;
} | null;

function messages(locale: string) {
  const l: Locale = isLocale(locale) ? locale : "he";
  return getSuppliersFormMessages(l);
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

export async function submitSupplierFormAction(
  locale: string,
  mode: "create" | "edit",
  supplierId: string | null,
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const m = messages(locale);

  const fieldErrors: Partial<Record<SupplierFormField, string>> = {};
  if (!name) {
    fieldErrors.name = m.errorFieldRequired;
  }
  if (!url) {
    fieldErrors.url = m.errorFieldRequired;
  }
  if (Object.keys(fieldErrors).length) {
    return { fieldErrors };
  }

  if (mode === "create") {
    let res: Response;
    try {
      res = await backendFetch("/suppliers", {
        method: "POST",
        body: JSON.stringify({ name, url }),
      });
    } catch {
      return { message: m.errorServerMisconfigured };
    }
    if (!res.ok) {
      return { message: `${m.errorFromServer} ${await readApiError(res)}` };
    }
    revalidatePath(`/${locale}/suppliers`);
    redirect(`/${locale}/suppliers`);
  }

  if (!supplierId) {
    return { message: m.errorServerMisconfigured };
  }

  let putRes: Response;
  try {
    putRes = await backendFetch(`/suppliers/${supplierId}`, {
      method: "PUT",
      body: JSON.stringify({ name, url }),
    });
  } catch {
    return { message: m.errorServerMisconfigured };
  }
  if (!putRes.ok) {
    return { message: `${m.errorFromServer} ${await readApiError(putRes)}` };
  }

  revalidatePath(`/${locale}/suppliers`);
  redirect(`/${locale}/suppliers`);
}
