"use client";

import { isLocale, type Locale } from "@/i18n/config";
import { getAppMessages } from "@/messages/app";
import { useParams } from "next/navigation";

export default function SuppliersLoading() {
  const params = useParams();
  const raw = params?.locale;
  const locale: Locale = typeof raw === "string" && isLocale(raw) ? raw : "he";
  const m = getAppMessages(locale);

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="h-9 w-48 animate-pulse rounded-lg bg-muted-bg" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-muted-bg" />
      </div>
      <p className="mt-2 h-4 w-64 animate-pulse rounded bg-muted-bg" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-muted-bg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted-bg" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted-bg" />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-3 w-20 animate-pulse rounded bg-muted-bg" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted-bg" />
            </div>
            <div className="mt-auto flex gap-2">
              <div className="h-8 flex-1 animate-pulse rounded-lg bg-muted-bg" />
              <div className="h-8 flex-1 animate-pulse rounded-lg bg-muted-bg" />
            </div>
          </div>
        ))}
      </div>
      <p className="sr-only">{m.supplierPageLoading}</p>
    </div>
  );
}
