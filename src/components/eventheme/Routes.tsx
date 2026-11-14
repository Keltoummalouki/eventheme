import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brand } from "@/data/eventheme";
import { dictionaries } from "@/data/locales";
import { alternatesFor, detailPages, fill, pageFromSlug, pathFor, type Locale, type PageKey } from "@/lib/i18n";
import { siteUrl } from "@/lib/eventheme/locale";
import { getEntries } from "@/lib/eventheme/server";
import {
  breadcrumbs,
  cityService,
  cityTitle,
  detailBreadcrumbs,
  excerpt,
  jsonLd,
  organization,
  service,
  website,
} from "@/lib/eventheme/structured";
import { localizeEntries, localizeEntry } from "@/lib/eventheme/translations";
import type { Entry, Kind } from "@/lib/eventheme/types";
import Home from "./Home";
import InquiryForm from "./InquiryForm";
import { About, Catalog, Detail, Legal, Services } from "./Pages";
import QuoteStudio from "./QuoteStudio";
import { Cities, CityPage, ServiceDetail } from "./ServicePages";
import Shell from "./Shell";

/**
 * Pages du site, partagées par les routes françaises (/…) et anglaises (/en/…).
 * Chaque page déclare son adresse canonique et ses équivalents (hreflang), et
 * ses données structurées (schema.org) quand elle en a.
 */
type Query = Record<string, string | string[] | undefined>;

const alternates = (locale: Locale, key: PageKey, id?: string): Metadata["alternates"] => ({
  canonical: pathFor(locale, key, id),
  languages: { ...alternatesFor(key, id), "x-default": pathFor("fr", key, id) },
});

/** Données structurées d’une page, dans une balise <script type="application/ld+json">. */
function StructuredData({ data }: { data: Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}

export function pageMetadata(locale: Locale, key: PageKey): Metadata {
  if (key === "home") return { alternates: alternates(locale, key) };
  const page = dictionaries[locale].pages[key];
  return {
    title: page.title,
    description: fill(page.description, { brand: brand.name }),
    alternates: alternates(locale, key),
  };
}

/** Accueil : l’entreprise et le site, décrits pour les moteurs de recherche. */
export async function homePage(locale: Locale) {
  const base = await siteUrl();
  const entries = localizeEntries(await getEntries(), locale);
  return (
    <Shell>
      <StructuredData data={[organization(base, locale, entries), website(base, locale)]} />
      <Home />
    </Shell>
  );
}

export function slugMetadata(locale: Locale, slug: string): Metadata {
  const key = pageFromSlug(locale, slug);
  return key ? pageMetadata(locale, key) : {};
}

export async function renderPage(locale: Locale, slug: string, query: Query) {
  const key = pageFromSlug(locale, slug);
  if (!key) notFound();
  const value = (name: string) => (typeof query[name] === "string" ? (query[name] as string) : "");
  // Les zones d’intervention n’existent qu’avec au moins une ville publiée.
  if (key === "cities" && !(await getEntries()).some((entry) => entry.kind === "cities")) notFound();
  const t = dictionaries[locale];
  const base = key === "cities" || key === "services" ? await siteUrl() : "";
  return (
    <Shell>
      {(key === "cities" || key === "services") && (
        <StructuredData
          data={[
            breadcrumbs(base, [
              [t.nav.home, pathFor(locale, "home")],
              [key === "cities" ? t.pages.cities.title : t.nav.services, pathFor(locale, key)],
            ]),
          ]}
        />
      )}
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
        <QuoteStudio as="h1" eventId={value("event")} city={value("ville") || value("city")} />
      ) : key === "cities" ? (
        <Cities />
      ) : (
        <Legal privacy={key === "privacy"} />
      )}
    </Shell>
  );
}

/** Type de contenu de chaque page à fiches. */
const kindOf: Partial<Record<PageKey, Kind>> = {
  equipment: "products",
  projects: "projects",
  services: "services",
  cities: "cities",
};

async function findDetail(locale: Locale, slug: string, id: string) {
  const key = pageFromSlug(locale, slug);
  if (!key || !detailPages.includes(key)) return undefined;
  const entry = (await getEntries()).find((item) => item.id === id && item.kind === kindOf[key]);
  return entry && { key, entry: localizeEntry(entry, locale) };
}

/** Titre d’une fiche : celui de la ville (« Production technique événementielle à … ») ou du contenu. */
const detailTitle = (locale: Locale, key: PageKey, entry: Entry) =>
  key === "cities" ? cityTitle(locale, entry) : entry.title;

export async function detailMetadata(locale: Locale, slug: string, id: string): Promise<Metadata> {
  const found = await findDetail(locale, slug, decodeURIComponent(id));
  if (!found) return { title: dictionaries[locale].notFound.title };
  const title = detailTitle(locale, found.key, found.entry);
  return {
    title,
    description: excerpt(found.entry.description) || undefined,
    alternates: alternates(locale, found.key, found.entry.id),
    openGraph: {
      title: `${title} | ${brand.name}`,
      ...(found.entry.image ? { images: [found.entry.image] } : {}),
    },
    // Exemple de catalogue ou planche d’inspiration : visible sur le site, pas dans les résultats de recherche.
    ...(found.entry.demo ? { robots: { index: false, follow: true } } : {}),
  };
}

export async function renderDetail(locale: Locale, slug: string, id: string) {
  const found = await findDetail(locale, slug, decodeURIComponent(id));
  if (!found) notFound();
  const { key, entry } = found;
  const base = await siteUrl();
  const title = detailTitle(locale, key, entry);
  // Fiches de démonstration : aucun balisage, elles ne décrivent rien de réel.
  const data = entry.demo
    ? []
    : [
        detailBreadcrumbs(base, locale, key, entry, key === "cities" ? entry.title : title),
        ...(key === "services" ? [service(base, locale, entry)] : key === "cities" ? [cityService(base, locale, entry)] : []),
      ];
  return (
    <Shell>
      {data.length > 0 && <StructuredData data={data} />}
      {key === "services" ? (
        <ServiceDetail entry={entry} />
      ) : key === "cities" ? (
        <CityPage entry={entry} />
      ) : (
        <Detail entry={entry} />
      )}
    </Shell>
  );
}
