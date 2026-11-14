/**
 * Identifiants lisibles, tirés d’un titre : ils forment l’adresse des pages
 * (« /villes/marrakech », « /services/eclairage-architectural »).
 */

/** « Éclairage & effets » → « eclairage-effets » : minuscules, sans accent ni espace. */
export function slugify(text: string, max = 80) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

/** Premier identifiant libre : « base », puis « base-2 », « base-3 »… (« contenu » si le titre est vide). */
export function uniqueSlug(base: string, taken: Iterable<string>) {
  const used = new Set(taken);
  const root = base || "contenu";
  if (!used.has(root)) return root;
  for (let index = 2; ; index++) {
    const candidate = `${root}-${index}`;
    if (!used.has(candidate)) return candidate;
  }
}

const GENERATED = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Vrai pour un identifiant aléatoire (nouveau contenu pas encore enregistré). */
export const isGeneratedId = (id: string) => GENERATED.test(id);
