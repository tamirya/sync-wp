import type { Locale } from "@/i18n/config";
import { isLocale } from "@/i18n/config";
import { fetchSuppliersForUser } from "@/lib/suppliers-api";
import { getAppMessages } from "@/messages/app";
import { notFound, redirect } from "next/navigation";
import { SupplierGrid } from "./supplier-grid";

type Props = { params: Promise<{ locale: string }> };

export default async function SuppliersPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const messages = getAppMessages(locale);

  const result = await fetchSuppliersForUser();

  if (!result.ok) {
    if (result.status === 401) {
      redirect(`/${locale}/login?next=/${locale}/suppliers`);
    }
  }

  const suppliers = result.ok ? result.suppliers : [];
  const loadFailed = !result.ok && result.status !== 401;

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
        {messages.suppliersBreadcrumb}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {messages.suppliersTitle}
      </h1>
      <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted">
        {messages.suppliersSubtitle}
      </p>

      {loadFailed ? (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive">
          {messages.suppliersLoadError}
        </p>
      ) : null}

      <SupplierGrid locale={locale} messages={messages} suppliers={suppliers} />
    </div>
  );
}
