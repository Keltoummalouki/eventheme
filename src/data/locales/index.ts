import type { Locale } from "@/lib/i18n";
import { ar } from "./ar";
import { en } from "./en";
import { fr, type Dictionary } from "./fr";

export type { Dictionary };

/** Textes d’interface du site public, par langue. */
export const dictionaries: Record<Locale, Dictionary> = { fr, en, ar };

/** Type d’événement d’une réalisation : enregistré en français, affiché dans la langue de la page. */
export function projectCategoryLabel(locale: Locale, value?: string) {
  const labels: Record<string, string> = dictionaries[locale].projectCategories;
  return (value && labels[value]) || value || "";
}

/** Moyen de contact préféré : enregistré en français (« Téléphone »…), affiché dans la langue de la page. */
export function contactMethodLabel(locale: Locale, value: string) {
  const labels: Record<string, string> = dictionaries[locale].contactMethods;
  return labels[value] || value;
}
