import { isLocale, type Locale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

/** Legacy path: send users to Stores. */
export default async function DashboardRedirect({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  redirect(`/${locale}/stores`);
}
