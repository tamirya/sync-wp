import { AppShell } from "@/components/app-shell";
import { isLocale, type Locale } from "@/i18n/config";
import { getAppMessages } from "@/messages/app";
import { notFound } from "next/navigation";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function ShellLayout({ children, params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const messages = getAppMessages(locale);

  return (
    <AppShell locale={locale} messages={messages}>
      {children}
    </AppShell>
  );
}
