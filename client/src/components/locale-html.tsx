"use client";

import { useLayoutEffect } from "react";
import type { Locale } from "@/i18n/config";

type Props = {
  locale: Locale;
  children: React.ReactNode;
};

export function LocaleHtml({ locale, children }: Props) {
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "he" ? "rtl" : "ltr";
  }, [locale]);

  return children;
}
