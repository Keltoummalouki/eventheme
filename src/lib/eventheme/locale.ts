import "server-only";
import { headers } from "next/headers";
import { defaultLocale, isLocale, LOCALE_HEADER, type Locale } from "@/lib/i18n";

/** Langue de la page en cours, posée par le proxy d’après l’adresse. */
export async function requestLocale(): Promise<Locale> {
  const value = (await headers()).get(LOCALE_HEADER);
  return isLocale(value) ? value : defaultLocale;
}

/** Vrai pour une page du site public (le proxy y pose la langue), faux pour l’administration. */
export async function isPublicRequest() {
  return (await headers()).has(LOCALE_HEADER);
}

/** Adresse absolue du site (données structurées) : APP_URL, sinon l’hôte de la requête. */
export async function siteUrl() {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const protocol = list.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${protocol}://${host}`;
}
