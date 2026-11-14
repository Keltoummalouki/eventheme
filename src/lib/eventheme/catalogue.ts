import { normalizeText } from "@/lib/listNavigation";
import type { Entry } from "./types";

/**
 * Catalogue du matériel (cahier des charges §04 D et §06) : catégories et
 * sous-catégories gérées dans l’administration, marque, modèle et référence.
 *
 * Un matériel désigne sa catégorie et sa sous-catégorie par leur identifiant :
 * renommer une catégorie ne demande donc aucune reprise des fiches. Une
 * catégorie saisie en texte libre (contenus antérieurs) s’affiche telle quelle.
 */

export const categoriesOf = (entries: Entry[]) => entries.filter((entry) => entry.kind === "categories");

/** Catégories principales, dans l’ordre de l’administration. */
export const topCategories = (entries: Entry[]) => categoriesOf(entries).filter((category) => !category.parent);

/** Sous-catégories d’une catégorie principale. */
export const childCategories = (entries: Entry[], parentId: string) =>
  categoriesOf(entries).filter((category) => category.parent === parentId);

const findCategory = (entries: Entry[], id?: string) =>
  id ? entries.find((entry) => entry.kind === "categories" && entry.id === id) : undefined;

/** Libellés de la catégorie et de la sous-catégorie d’un matériel. */
export function productCategory(entries: Entry[], product: Entry) {
  return {
    category: findCategory(entries, product.category)?.title ?? product.category ?? "",
    subcategory: findCategory(entries, product.subcategory)?.title ?? "",
  };
}

/** « Sonorisation · Microphones » : la catégorie, puis la sous-catégorie s’il y en a une. */
export function categoryTrail(entries: Entry[], product: Entry) {
  const { category, subcategory } = productCategory(entries, product);
  return [category, subcategory].filter(Boolean).join(" · ");
}

/** « Marque Modèle », lorsqu’ils sont renseignés. */
export const productIdentity = (product: Entry) => [product.brand, product.model].filter(Boolean).join(" ");

/** Le matériel relève-t-il de cette catégorie, directement ou par sa sous-catégorie ? */
export const inCategory = (product: Entry, categoryId: string) =>
  product.category === categoryId || product.subcategory === categoryId;

/** Recherche par nom, marque, modèle, référence, description ou catégorie, sans accents ni casse. */
export function matchesSearch(entries: Entry[], product: Entry, query: string) {
  const wanted = normalizeText(query.trim());
  if (!wanted) return true;
  const haystack = normalizeText(
    [
      product.title,
      product.brand,
      product.model,
      product.reference,
      product.description,
      categoryTrail(entries, product),
    ]
      .filter(Boolean)
      .join(" "),
  );
  return wanted.split(/\s+/).every((word) => haystack.includes(word));
}

/** Marques présentes dans une liste de matériel, triées à la française. */
export const brandsOf = (products: Entry[]) =>
  [...new Set(products.map((product) => product.brand?.trim()).filter((brand): brand is string => Boolean(brand)))].sort(
    (a, b) => a.localeCompare(b, "fr"),
  );

/** Catégories utiles au filtre : celles qui contiennent au moins un matériel. */
export const usedCategories = (categories: Entry[], products: Entry[]) =>
  categories.filter((category) => products.some((product) => inCategory(product, category.id)));

/**
 * Contrôles d’intégrité avant enregistrement : une catégorie a au plus un
 * niveau de parent ; un matériel range sa sous-catégorie sous sa catégorie.
 * Renvoie le message d’erreur à afficher, ou `null`.
 */
export function catalogueProblem(entries: Entry[], entry: Entry): string | null {
  if (entry.kind === "categories" && entry.parent) {
    const parent = findCategory(entries, entry.parent);
    if (!parent || parent.id === entry.id) return "Choisissez une catégorie parente existante.";
    if (parent.parent) return "Une sous-catégorie ne peut pas en contenir une autre : choisissez une catégorie principale.";
    if (childCategories(entries, entry.id).length)
      return "Cette catégorie a déjà des sous-catégories : elle doit rester une catégorie principale.";
  }
  if (entry.kind === "products" && entry.subcategory) {
    const sub = findCategory(entries, entry.subcategory);
    if (!sub || sub.parent !== entry.category) return "La sous-catégorie doit appartenir à la catégorie choisie.";
  }
  return null;
}

/** Une catégorie ne se supprime pas tant qu’elle range du matériel ou des sous-catégories. */
export function categoryInUse(entries: Entry[], categoryId: string): string | null {
  const products = entries.filter((entry) => entry.kind === "products" && inCategory(entry, categoryId)).length;
  const children = childCategories(entries, categoryId).length;
  if (!products && !children) return null;
  const parts = [
    products && `${products} matériel${products > 1 ? "s" : ""}`,
    children && `${children} sous-catégorie${children > 1 ? "s" : ""}`,
  ].filter(Boolean);
  return `Cette catégorie contient encore ${parts.join(" et ")}. Déplacez-les avant de la supprimer.`;
}
