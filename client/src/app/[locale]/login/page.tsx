import { LoginScreen } from "@/components/login-screen";
import { isLocale, type Locale } from "@/i18n/config";
import { getLoginMessages } from "@/messages/login";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const messages = getLoginMessages(locale);
  const sp = await searchParams;
  const nextRaw = sp.next;
  const nextPath =
    typeof nextRaw === "string" && nextRaw.startsWith(`/${locale}/`)
      ? nextRaw
      : null;

  return (
    <LoginScreen
      locale={locale}
      messages={messages}
      redirectAfterLogin={nextPath}
    />
  );
}
