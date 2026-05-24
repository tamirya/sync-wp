"use server";

import { backendFetch } from "@/lib/backend-fetch";

export type PriceOverridePayload = {
  type: "product" | "category";
  targetId: number;
  markupPercent: number;
  useSalePrices: boolean;
};

export type UpsertPriceOverrideResult =
  | { ok: true }
  | { ok: false; message: string };

export async function upsertPriceOverrideAction(
  supplierId: number,
  payload: PriceOverridePayload,
): Promise<UpsertPriceOverrideResult> {
  try {
    const res = await backendFetch(
      `/suppliers/${supplierId}/price-overrides`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      let message = res.statusText;
      try {
        message = (JSON.parse(text) as { message?: string }).message ?? message;
      } catch {}
      return { ok: false, message };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
