import type { Locale } from "@/i18n/config";
import { isLocale } from "@/i18n/config";
import { getStoresFormMessages } from "@/messages/stores-form";
import { notFound } from "next/navigation";
import { StoreForm } from "../store-form";

type Props = { params: Promise<{ locale: string }> };

export default async function NewStorePage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const messages = getStoresFormMessages(locale);

  return (
    <div className="mx-auto max-w-6xl">
      <StoreForm locale={locale} mode="create" messages={messages} />
    </div>
  );
}
