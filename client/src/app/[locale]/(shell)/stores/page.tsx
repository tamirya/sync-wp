import type { Locale } from "@/i18n/config";
import { isLocale } from "@/i18n/config";
import { fetchStoresForUser } from "@/lib/stores-api";
import { getAppMessages } from "@/messages/app";
import { notFound, redirect } from "next/navigation";
import { StoreGrid } from "./store-grid";

type Props = { params: Promise<{ locale: string }> };

export default async function StoresPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const messages = getAppMessages(locale);

  const result = await fetchStoresForUser();

  if (!result.ok) {
    if (result.status === 401) {
      redirect(`/${locale}/login?next=/${locale}/stores`);
    }
  }

  const stores = result.ok ? result.stores : [];
  const loadFailed = !result.ok && result.status !== 401;

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
        {messages.storesBreadcrumb}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {messages.storesTitle}
      </h1>
      <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted">
        {messages.storesSubtitle}
      </p>

      {loadFailed ? (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive">
          {messages.storesLoadError}
        </p>
      ) : null}

      <StoreGrid locale={locale} messages={messages} stores={stores} />
    </div>
  );
}
