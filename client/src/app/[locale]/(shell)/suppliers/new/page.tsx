import type { Locale } from "@/i18n/config";
import { isLocale } from "@/i18n/config";
import { getSuppliersFormMessages } from "@/messages/suppliers-form";
import { notFound } from "next/navigation";
import { SupplierForm } from "../supplier-form";

type Props = { params: Promise<{ locale: string }> };

export default async function NewSupplierPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const messages = getSuppliersFormMessages(locale);

  return (
    <div className="mx-auto max-w-6xl">
      <SupplierForm locale={locale} mode="create" messages={messages} />
    </div>
  );
}
