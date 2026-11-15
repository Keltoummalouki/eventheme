import type { Metadata } from "next";
import ComingSoon from "@/components/eventheme/ComingSoon";
import { dictionaries } from "@/data/locales";
import { requestLocale } from "@/lib/eventheme/locale";
import { getEntries } from "@/lib/eventheme/server";
import { localizeEntries } from "@/lib/eventheme/translations";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  return { title: dictionaries[locale].comingSoon.title, robots: { index: false } };
}

export default async function Page() {
  const locale = await requestLocale();
  return <ComingSoon locale={locale} entries={localizeEntries(await getEntries(), locale)} />;
}
