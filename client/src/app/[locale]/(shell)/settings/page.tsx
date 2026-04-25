import type { Locale } from "@/i18n/config";
import { isLocale } from "@/i18n/config";
import { getAppMessages } from "@/messages/app";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function SettingsPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const m = getAppMessages(locale);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground">{m.settingsTitle}</h1>
      <p className="mt-2 text-muted">{m.settingsSubtitle}</p>
    </div>
  );
}
