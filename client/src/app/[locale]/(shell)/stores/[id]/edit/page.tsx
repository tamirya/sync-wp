import type { Locale } from "@/i18n/config";
import { isLocale } from "@/i18n/config";
import { fetchStoreEditData } from "@/lib/store-edit-load";
import { getStoresFormMessages } from "@/messages/stores-form";
import { notFound, redirect } from "next/navigation";
import { StoreForm } from "../../store-form";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function EditStorePage({ params }: Props) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const messages = getStoresFormMessages(locale);

  const loaded = await fetchStoreEditData(id);
  if (!loaded.ok) {
    if (loaded.status === 401) {
      redirect(`/${locale}/login?next=/${locale}/stores/${id}/edit`);
    }
    notFound();
  }

  const d = loaded.data;

  return (
    <div className="mx-auto max-w-6xl">
      <StoreForm
        locale={locale}
        mode="edit"
        messages={messages}
        storeId={String(d.id)}
        envRowId={d.envRowId}
        initial={{
          name: d.name,
          url: d.url,
          port: d.port != null ? String(d.port) : "",
          consumerKey: d.consumerKey,
          consumerSecret: d.consumerSecret,
        }}
      />
    </div>
  );
}
