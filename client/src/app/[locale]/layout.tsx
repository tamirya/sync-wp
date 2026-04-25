import { notFound } from "next/navigation";
import { LocaleHtml } from "@/components/locale-html";
import { isLocale, type Locale } from "@/i18n/config";

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;

  return <LocaleHtml locale={locale}>{children}</LocaleHtml>;
}
