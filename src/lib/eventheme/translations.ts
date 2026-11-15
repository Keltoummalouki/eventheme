import type { Locale } from "@/lib/i18n";
import { translatableFields, type Entry } from "./types";

/**
 * Contenus dans la langue de la page : chaque champ traduit remplace le
 * français ; un champ vide garde le français. Appliqué par le serveur avant
 * l’affichage : les composants lisent `entry.title` sans se soucier de la langue.
 *
 * La catégorie n’est traduite que pour un service (sa discipline affichée) :
 * celle d’un matériel est un identifiant, celle d’une réalisation une clé de
 * classement, traduite à l’affichage.
 */
export function localizeEntry(entry: Entry, locale: Locale): Entry {
  if (locale === "fr") return entry;
  // Paramètres du site : les horaires en anglais, s’ils sont renseignés.
  if (entry.kind === "settings")
    return entry.settings?.hoursEn ? { ...entry, settings: { ...entry.settings, hours: entry.settings.hoursEn } } : entry;
  const translation = entry.translations?.[locale];
  if (!translation) return entry;
  const localized = { ...entry };
  for (const field of translatableFields) {
    if (field === "variants" || (field === "category" && entry.kind !== "services")) continue;
    const value = translation[field]?.trim();
    if (value) localized[field] = value;
  }
  // Variantes : un libellé par ligne, dans l’ordre ; le nom reste la clé du panier.
  const labels = translation.variants?.split("\n").map((line) => line.trim());
  if (labels?.length && entry.variants)
    localized.variants = entry.variants.map((variant, index) => (labels[index] ? { ...variant, label: labels[index] } : variant));
  return localized;
}

export const localizeEntries = (entries: Entry[], locale: Locale) =>
  locale === "fr" ? entries : entries.map((entry) => localizeEntry(entry, locale));
