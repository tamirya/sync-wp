import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { isAuthenticatedFromCookies } from "@/lib/auth-session";

type Props = { params: Promise<{ locale: string }> };

export default async function LocaleHome({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const jar = await cookies();
  if (isAuthenticatedFromCookies(jar)) {
    redirect(`/${locale}/stores`);
  }
  redirect(`/${locale}/login`);
}
