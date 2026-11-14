/**
 * Langues du site (cahier des charges §11) : le français à la racine, l’anglais
 * sous /en, avec des adresses traduites. L’arabe (RTL) viendra s’ajouter ici.
 */
export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";
export const isLocale = (value: unknown): value is Locale => locales.includes(value as Locale);
/** Langue reçue d’un client (en-tête, champ) : le français si elle est absente ou inconnue. */
export const localeOf = (value: unknown): Locale => (isLocale(value) ? value : defaultLocale);

/** En-tête posé par le proxy : la langue de la page, lue par la mise en page racine (`<html lang>`). */
export const LOCALE_HEADER = "x-eventhemes-locale";

/** Formats Intl (dates, nombres, montants) et Open Graph de chaque langue. */
export const intlLocale: Record<Locale, string> = { fr: "fr-FR", en: "en-GB" };
export const ogLocale: Record<Locale, string> = { fr: "fr_FR", en: "en_GB" };

/** Pages du site et leur adresse dans chaque langue. */
export const pageKeys = [
  "home",
  "about",
  "services",
  "equipment",
  "projects",
  "contact",
  "quote",
  "legal",
  "privacy",
  "cities",
] as const;
export type PageKey = (typeof pageKeys)[number];
const slugs: Record<Locale, Record<PageKey, string>> = {
  fr: {
    home: "",
    about: "a-propos",
    services: "services",
    equipment: "materiel",
    projects: "realisations",
    contact: "contact",
    quote: "devis",
    legal: "mentions-legales",
    privacy: "politique-de-confidentialite",
    cities: "villes",
  },
  en: {
    home: "",
    about: "about",
    services: "services",
    equipment: "equipment",
    projects: "projects",
    contact: "contact",
    quote: "quote",
    legal: "legal-notice",
    privacy: "privacy-policy",
    cities: "cities",
  },
};
/** Pages qui ont des fiches : le matériel, les réalisations, les services et les villes. */
export const detailPages: readonly PageKey[] = ["equipment", "projects", "services", "cities"];

/** Adresse d’une page (et d’une fiche) dans une langue. */
export function pathFor(locale: Locale, key: PageKey, id?: string) {
  const parts = [
    locale === defaultLocale ? "" : locale,
    slugs[locale][key],
    id ? encodeURIComponent(id) : "",
  ].filter(Boolean);
  return `/${parts.join("/")}`;
}

/** Page désignée par une adresse, dans une langue donnée. */
export const pageFromSlug = (locale: Locale, slug: string): PageKey | undefined =>
  pageKeys.find((key) => key !== "home" && slugs[locale][key] === slug);

/**
 * Lecture d’une adresse : langue, page et fiche. `key` est absent pour une
 * adresse hors du plan du site (administration, page d’attente…).
 */
export function routeOf(pathname: string): { locale: Locale; key?: PageKey; id?: string } {
  const parts = pathname.split(/[?#]/)[0].split("/").filter(Boolean);
  const locale: Locale = isLocale(parts[0]) && parts[0] !== defaultLocale ? parts[0] : defaultLocale;
  if (locale !== defaultLocale) parts.shift();
  if (!parts.length) return { locale, key: "home" };
  let slug = parts[0];
  try {
    slug = decodeURIComponent(slug);
  } catch {}
  const key = pageFromSlug(locale, slug);
  if (!key || parts.length > 2 || (parts.length === 2 && !detailPages.includes(key))) return { locale };
  let id = parts[1];
  try {
    id = id && decodeURIComponent(id);
  } catch {}
  return { locale, key, id };
}

/** La même page dans une autre langue (sélecteur de langue) ; l’accueil à défaut. */
export function translatePath(pathname: string, target: Locale) {
  const { key, id } = routeOf(pathname);
  return pathFor(target, key ?? "home", id);
}

/** Adresses d’une page dans toutes les langues (hreflang, plan du site). */
export const alternatesFor = (key: PageKey, id?: string) =>
  Object.fromEntries(locales.map((locale) => [locale, pathFor(locale, key, id)])) as Record<Locale, string>;

/** « {name} » → valeur. Les dictionnaires restent du texte pur, sérialisable. */
export const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
