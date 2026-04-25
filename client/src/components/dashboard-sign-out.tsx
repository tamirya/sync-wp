"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import { apiBackendLogout } from "@/lib/api";

type Props = {
  locale: Locale;
  label: string;
};

export function DashboardSignOut({ locale, label }: Props) {
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await apiBackendLogout().catch(() => {});
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.assign(`/${locale}/login`);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted-bg disabled:opacity-60"
    >
      {label}
    </button>
  );
}
