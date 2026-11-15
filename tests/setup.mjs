/**
 * Préparation des tests (chargée par `--import` avant chaque fichier de test).
 *
 * « server-only » refuse d’être importé en dehors de Next.js : les tests le
 * remplacent par un module vide, pour pouvoir vérifier le code serveur (données
 * locales, demandes, e-mails) directement.
 *
 * Avec EVENTHEME_FAKE_SUPABASE=1 (tests du mode production), Supabase et les
 * cookies de Next.js sont remplacés par la doublure en mémoire de
 * tests/fake-supabase.ts.
 */
import { registerHooks } from "node:module";

const faked = new Set(["@supabase/supabase-js", "@supabase/ssr", "next/headers"]);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: new URL("./empty-module.cjs", import.meta.url).href, shortCircuit: true };
    if (process.env.EVENTHEME_FAKE_SUPABASE === "1" && faked.has(specifier))
      return { url: new URL("./fake-supabase.ts", import.meta.url).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
