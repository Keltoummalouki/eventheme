import { brand } from "@/data/eventheme";
import { dictionaries } from "@/data/locales";
import { fill, pathFor, type Locale, type PageKey } from "@/lib/i18n";
import type { Entry } from "./types";

/**
 * Données structurées (schema.org, JSON-LD) — cahier des charges §10.
 *
 * Seulement ce que le site affiche déjà et qui est vrai : nom, logo, réseaux,
 * zone desservie, services, fil d’Ariane. Les coordonnées n’apparaissent que si
 * elles figurent dans « Contact & réseaux ». Aucune fiche matériel n’est
 * décrite comme un produit en vente (location, prix sur demande), et aucun
 * contenu de démonstration n’est décrit.
 */

type Thing = Record<string, unknown>;
const CONTEXT = "https://schema.org";

/** JSON prêt pour une balise <script> : « < » échappé, le contenu ne peut pas fermer la balise. */
export const jsonLd = (data: Thing | Thing[]) => JSON.stringify(data).replace(/</g, "\\u003c");

const absolute = (base: string, url: string) => (/^https?:\/\//.test(url) ? url : `${base}${url.startsWith("/") ? "" : "/"}${url}`);
const organizationId = (base: string) => `${base}/#organization`;

/** L’entreprise : nom, logo, description, zone desservie, profils publics et coordonnées connues. */
export function organization(base: string, locale: Locale, entries: Entry[]): Thing {
  const links = entries.filter((entry) => entry.kind === "socials" && entry.url).map((entry) => entry.url!);
  const profiles = links.filter((url) => url.startsWith("https://") && !/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(url));
  const telephone = links.find((url) => url.startsWith("tel:"))?.slice(4);
  const email = links.find((url) => url.startsWith("mailto:"))?.slice(7).split("?")[0];
  const t = dictionaries[locale];
  return {
    "@context": CONTEXT,
    "@type": "Organization",
    "@id": organizationId(base),
    name: brand.name,
    url: `${base}/`,
    logo: `${base}/eventheme_logo_png.webp`,
    description: t.brand.summary,
    slogan: brand.signature,
    areaServed: { "@type": "Country", name: t.brand.market },
    ...(profiles.length ? { sameAs: profiles } : {}),
    ...(telephone || email
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            availableLanguage: ["French", "English"],
            ...(telephone ? { telephone } : {}),
            ...(email ? { email } : {}),
          },
        }
      : {}),
  };
}

/** Le site, dans la langue de la page. */
export const website = (base: string, locale: Locale): Thing => ({
  "@context": CONTEXT,
  "@type": "WebSite",
  "@id": `${base}/#website`,
  url: `${base}${pathFor(locale, "home")}`,
  name: brand.name,
  inLanguage: locale,
  publisher: { "@id": organizationId(base) },
});

/** Fil d’Ariane : [libellé, adresse relative] du plus général au plus précis. */
export const breadcrumbs = (base: string, items: readonly (readonly [name: string, path: string])[]): Thing => ({
  "@context": CONTEXT,
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], index) => ({
    "@type": "ListItem",
    position: index + 1,
    name,
    item: absolute(base, path),
  })),
});

/** Fil d’Ariane d’une fiche : accueil, page de la liste, fiche. */
export function detailBreadcrumbs(base: string, locale: Locale, key: PageKey, entry: Entry, name = entry.title) {
  const t = dictionaries[locale];
  const list = key === "home" ? t.nav.home : key in t.nav ? t.nav[key as keyof typeof t.nav] : t.pages[key as Exclude<PageKey, "home">].title;
  return breadcrumbs(base, [
    [t.nav.home, pathFor(locale, "home")],
    [list, pathFor(locale, key)],
    [name, pathFor(locale, key, entry.id)],
  ]);
}

/** Un service, partout où EVENTHEMES intervient (le Maroc) ou dans une ville. */
export function service(base: string, locale: Locale, entry: Entry, city?: Entry): Thing {
  const t = dictionaries[locale];
  return {
    "@context": CONTEXT,
    "@type": "Service",
    name: entry.title,
    ...(entry.category ? { serviceType: entry.category } : {}),
    description: entry.description,
    url: `${base}${pathFor(locale, "services", entry.id)}`,
    ...(entry.image ? { image: absolute(base, entry.image) } : {}),
    provider: { "@id": organizationId(base) },
    areaServed: city ? { "@type": "City", name: city.title } : { "@type": "Country", name: t.brand.market },
  };
}

/** Titre d’une page ville : celui de l’administration, sinon « Production technique événementielle à … ». */
export const cityTitle = (locale: Locale, city: Entry) =>
  city.subtitle?.trim() || fill(dictionaries[locale].cities.title, { city: city.title });

/** Page ville : la production technique proposée dans cette ville. */
export function cityService(base: string, locale: Locale, city: Entry): Thing {
  const t = dictionaries[locale];
  return {
    "@context": CONTEXT,
    "@type": "Service",
    name: cityTitle(locale, city),
    serviceType: t.brand.baseline,
    description: city.description,
    url: `${base}${pathFor(locale, "cities", city.id)}`,
    ...(city.image ? { image: absolute(base, city.image) } : {}),
    provider: { "@id": organizationId(base) },
    areaServed: { "@type": "City", name: city.title, containedInPlace: { "@type": "Country", name: t.brand.market } },
  };
}

/** Description pour les moteurs de recherche : une phrase complète si possible, 160 caractères au plus. */
export function excerpt(text: string, max = 160) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const sentence = cut.lastIndexOf(". ");
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : cut.length).replace(/[,;:·—-]+$/, "")}…`;
}
