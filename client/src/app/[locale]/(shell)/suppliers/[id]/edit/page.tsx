import type { Locale } from "@/i18n/config";
import { isLocale } from "@/i18n/config";
import { fetchSupplierForEdit } from "@/lib/supplier-edit-load";
import { getSuppliersFormMessages } from "@/messages/suppliers-form";
import { notFound, redirect } from "next/navigation";
import { SupplierForm } from "../../supplier-form";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function EditSupplierPage({ params }: Props) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const messages = getSuppliersFormMessages(locale);

  const loaded = await fetchSupplierForEdit(id);
  if (!loaded.ok) {
    if (loaded.status === 401) {
      redirect(`/${locale}/login?next=/${locale}/suppliers/${id}/edit`);
    }
    notFound();
  }

  const d = loaded.data;

  return (
    <div className="mx-auto max-w-6xl">
      <SupplierForm
        locale={locale}
        mode="edit"
        messages={messages}
        supplierId={String(d.id)}
        initial={{ name: d.name, url: d.url }}
      />
    </div>
  );
}
