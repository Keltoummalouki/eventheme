import type { MetadataRoute } from "next";
import { getEntries } from "@/lib/eventheme/server";
import type { Kind } from "@/lib/eventheme/types";
import { alternatesFor, defaultLocale, locales, pageKeys, type PageKey } from "@/lib/i18n";
export const dynamic = "force-dynamic";

/** Page de chaque type de fiche. */
const sheets: Partial<Record<Kind, PageKey>> = {
  products: "equipment",
  projects: "projects",
  services: "services",
  cities: "cities",
};

/**
 * Plan du site : chaque page et chaque fiche publiée (matériel, réalisations,
 * services, villes), sauf les exemples, dans chaque langue, avec leurs équivalents (hreflang).
 * Les zones d’intervention n’y figurent qu’avec au moins une ville publiée.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!process.env.APP_URL) return [];
  const base = process.env.APP_URL.replace(/\/$/, "");
  const entries = (await getEntries()).filter((entry) => entry.published);
  const hasCities = entries.some((entry) => entry.kind === "cities");
  const pages: [key: PageKey, id?: string][] = pageKeys.filter((key) => key !== "cities" || hasCities).map((key) => [key]);
  for (const entry of entries) {
    const key = sheets[entry.kind];
    // Fiches de démonstration : à remplacer, jamais proposées aux moteurs de recherche.
    if (key && !entry.demo) pages.push([key, entry.id]);
  }
  return pages.flatMap(([key, id]) => {
    const paths = alternatesFor(key, id);
    const languages = {
      ...Object.fromEntries(locales.map((locale) => [locale, base + paths[locale]])),
      "x-default": base + paths[defaultLocale],
    };
    return locales.map((locale) => ({
      url: base + paths[locale],
      changeFrequency: "weekly" as const,
      priority: key === "home" ? 1 : 0.7,
      alternates: { languages },
    }));
  });
}
