import { rmSync } from "node:fs";
import { dataDirectory, isolated } from "./environment";

/** Chaque exécution repart du contenu de départ : aucune demande ni aperçu d’e-mail d’une exécution précédente. */
export default function globalSetup() {
  if (isolated) rmSync(dataDirectory, { recursive: true, force: true });
}
