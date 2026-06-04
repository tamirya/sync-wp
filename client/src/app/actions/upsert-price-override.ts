"use server";

import { backendFetch } from "@/lib/backend-fetch";
import type { PricingMode } from "@/lib/price-utils";

export type PriceOverridePayload = {
  type: "product" | "category";
  targetId: number;
  pricingMode: PricingMode;
  markupPercent: number;
  fixedAmount: number | null;
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

export async function deletePriceOverrideAction(
  supplierId: number,
  payload: Pick<PriceOverridePayload, "type" | "targetId">,
): Promise<UpsertPriceOverrideResult> {
  try {
    const res = await backendFetch(
      `/suppliers/${supplierId}/price-overrides`,
      {
        method: "DELETE",
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
