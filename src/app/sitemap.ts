import type { MetadataRoute } from "next";
import { getEntries } from "@/lib/eventheme/server";
import { alternatesFor, defaultLocale, locales, pageKeys, type PageKey } from "@/lib/i18n";
export const dynamic = "force-dynamic";

/** Plan du site : chaque page et chaque fiche publiée, dans chaque langue, avec leurs équivalents (hreflang). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!process.env.APP_URL) return [];
  const base = process.env.APP_URL.replace(/\/$/, "");
  const pages: [key: PageKey, id?: string][] = pageKeys.map((key) => [key]);
  for (const entry of await getEntries())
    if (entry.published && (entry.kind === "products" || entry.kind === "projects"))
      pages.push([entry.kind === "products" ? "equipment" : "projects", entry.id]);
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
