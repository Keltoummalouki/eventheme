import path from "node:path";

/**
 * Serveur des tests de bout en bout.
 *
 * Par défaut, Playwright démarre son propre `next dev` sur le port 3100, isolé
 * de tout le reste : dossier de compilation `.next-e2e` (il peut tourner à
 * côté d’un `npm run dev`), données locales dans `.eventheme/e2e` (repartent
 * du contenu de départ à chaque exécution), aucun e-mail envoyé (aperçus
 * seulement), aucune connexion à Supabase, identifiant Analytics factice.
 *
 * Avec E2E_BASE_URL, les tests visent un site déjà en ligne (préproduction) :
 * les vérifications qui lisent les données locales ou demandent l’identifiant
 * Analytics de test sont alors ignorées.
 */
export const port = Number(process.env.E2E_PORT || 3100);
export const external = process.env.E2E_BASE_URL?.replace(/\/$/, "") || "";
export const baseURL = external || `http://localhost:${port}`;
export const isolated = !external;

export const dataDirectory = path.resolve(__dirname, "..", ".eventheme", "e2e");
export const MEASUREMENT_ID = "G-E2ETEST01";

/** Variables du serveur de test : elles priment sur .env.local. */
export const serverEnvironment: Record<string, string> = {
  EVENTHEME_DIST_DIR: ".next-e2e",
  EVENTHEME_DATA_DIR: dataDirectory,
  EVENTHEME_DATA_MODE: "local",
  APP_URL: baseURL,
  // Aucun fournisseur : les e-mails sont enregistrés pour relecture, jamais envoyés.
  EMAIL_PROVIDER: "off",
  EMAIL_API_KEY: "",
  EMAIL_TEAM: "",
  // Aucune connexion au projet Supabase, quel que soit .env.local.
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
  SUPABASE_SECRET_KEY: "",
  NEXT_PUBLIC_GA_MEASUREMENT_ID: MEASUREMENT_ID,
  GOOGLE_SITE_VERIFICATION: "",
  NEXT_TELEMETRY_DISABLED: "1",
};
