import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brand } from "@/data/eventheme";
import { dictionaries } from "@/data/locales";
import { alternatesFor, detailPages, fill, pageFromSlug, pathFor, type Locale, type PageKey } from "@/lib/i18n";
import { getEntries } from "@/lib/eventheme/server";
import { localizeEntry } from "@/lib/eventheme/translations";
import Home from "./Home";
import InquiryForm from "./InquiryForm";
import { About, Catalog, Detail, Legal, Services } from "./Pages";
import QuoteStudio from "./QuoteStudio";
import Shell from "./Shell";

/**
 * Pages du site, partagées par les routes françaises (/…) et anglaises (/en/…).
 * Chaque page déclare son adresse canonique et ses équivalents (hreflang).
 */
type Query = Record<string, string | string[] | undefined>;

const alternates = (locale: Locale, key: PageKey, id?: string): Metadata["alternates"] => ({
  canonical: pathFor(locale, key, id),
  languages: { ...alternatesFor(key, id), "x-default": pathFor("fr", key, id) },
});

export function pageMetadata(locale: Locale, key: PageKey): Metadata {
  if (key === "home") return { alternates: alternates(locale, key) };
  const page = dictionaries[locale].pages[key];
  return {
    title: page.title,
    description: fill(page.description, { brand: brand.name }),
    alternates: alternates(locale, key),
  };
}

export const homePage = () => (
  <Shell>
    <Home />
  </Shell>
);

export function slugMetadata(locale: Locale, slug: string): Metadata {
  const key = pageFromSlug(locale, slug);
  return key ? pageMetadata(locale, key) : {};
}

export function renderPage(locale: Locale, slug: string, query: Query) {
  const key = pageFromSlug(locale, slug);
  if (!key) notFound();
  const value = (name: string) => (typeof query[name] === "string" ? (query[name] as string) : "");
  return (
    <Shell>
      {key === "services" ? (
        <Services />
      ) : key === "equipment" ? (
        <Catalog initialCategory={value("categorie") || value("category")} />
      ) : key === "projects" ? (
        <Catalog projects />
      ) : key === "about" ? (
        <About />
      ) : key === "contact" ? (
        <InquiryForm />
      ) : key === "quote" ? (
        <QuoteStudio as="h1" eventId={value("event")} />
      ) : (
        <Legal privacy={key === "privacy"} />
      )}
    </Shell>
  );
}

async function findDetail(locale: Locale, slug: string, id: string) {
  const key = pageFromSlug(locale, slug);
  if (!key || !detailPages.includes(key)) return undefined;
  const kind = key === "equipment" ? "products" : "projects";
  const entry = (await getEntries()).find((item) => item.id === id && item.kind === kind);
  return entry && { key, entry: localizeEntry(entry, locale) };
}

export async function detailMetadata(locale: Locale, slug: string, id: string): Promise<Metadata> {
  const found = await findDetail(locale, slug, decodeURIComponent(id));
  if (!found) return { title: dictionaries[locale].notFound.title };
  return {
    title: found.entry.title,
    description: found.entry.description,
    alternates: alternates(locale, found.key, found.entry.id),
  };
}

export async function renderDetail(locale: Locale, slug: string, id: string) {
  const found = await findDetail(locale, slug, decodeURIComponent(id));
  if (!found) notFound();
  return (
    <Shell>
      <Detail entry={found.entry} />
    </Shell>
  );
}
