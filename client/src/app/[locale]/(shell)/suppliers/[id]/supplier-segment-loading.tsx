"use client";

import { MappingTreesLoadingIndicator } from "../../mapping/mapping-loading-indicator";
import { isLocale, type Locale } from "@/i18n/config";
import { getAppMessages } from "@/messages/app";
import { useParams } from "next/navigation";

export function SupplierSegmentLoading() {
  const params = useParams();
  const raw = params?.locale;
  const locale: Locale = typeof raw === "string" && isLocale(raw) ? raw : "he";
  const m = getAppMessages(locale);

  return (
    <div className="mx-auto pb-12">
      <div className="h-4 w-32 animate-pulse rounded bg-muted-bg" />
      <div className="mt-6 flex flex-wrap items-start gap-4">
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-muted-bg" />
        <div className="space-y-2">
          <div className="h-2 w-24 animate-pulse rounded bg-muted-bg" />
          <div className="h-8 w-48 max-w-full animate-pulse rounded-lg bg-muted-bg" />
          <div className="h-4 w-40 max-w-full animate-pulse rounded bg-muted-bg" />
        </div>
      </div>
      <MappingTreesLoadingIndicator
        label={m.supplierPageLoading}
        minHeightClass="min-h-[35vh]"
      />
    </div>
  );
}
