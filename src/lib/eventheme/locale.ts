import "server-only";
import { headers } from "next/headers";
import { defaultLocale, isLocale, LOCALE_HEADER, type Locale } from "@/lib/i18n";

/** Langue de la page en cours, posée par le proxy d’après l’adresse. */
export async function requestLocale(): Promise<Locale> {
  const value = (await headers()).get(LOCALE_HEADER);
  return isLocale(value) ? value : defaultLocale;
}
