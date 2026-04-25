"use client";

import { syncMappingRulesAction } from "@/app/actions/mapping-rules";
import type { AppMessages } from "@/messages/app";
import type { Locale } from "@/i18n/config";
import { useTransition, useState } from "react";

type Props = {
  locale: Locale;
  messages: AppMessages;
  /** Unique store IDs that have at least one mapping rule */
  storeIds: number[];
};

export function SyncMappingButton({ locale, messages, storeIds }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasRules = storeIds.length > 0;

  const handleSync = () => {
    if (!hasRules) return;
    setStatus("idle");
    setErrorMsg(null);
    startTransition(async () => {
      const result = await syncMappingRulesAction(locale, storeIds);
      if (result.ok) {
        setStatus("success");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setErrorMsg(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={isPending || !hasRules}
        title={!hasRules ? messages.mappingSyncNoRules : undefined}
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z"
              />
            </svg>
            {messages.mappingSyncing}
          </>
        ) : (
          <>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 shrink-0"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clipRule="evenodd"
              />
            </svg>
            {messages.mappingSyncButton}
          </>
        )}
      </button>

      {status === "success" && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden>
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {messages.mappingSyncSuccess}
        </p>
      )}

      {status === "error" && (
        <p className="text-sm text-destructive">
          {messages.mappingSyncFailed}
          {errorMsg ? `: ${errorMsg}` : ""}
        </p>
      )}
    </div>
  );
}
