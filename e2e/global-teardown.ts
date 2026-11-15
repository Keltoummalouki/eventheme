import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Le serveur de test réécrit next-env.d.ts vers son dossier `.next-e2e` :
 * on le fait pointer de nouveau vers `.next`, celui de `npm run dev` et de
 * `npm run build`, pour que `npm run typecheck` ne dépende pas des tests.
 */
export default function globalTeardown() {
  const file = path.resolve(__dirname, "..", "next-env.d.ts");
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  if (text.includes(".next-e2e/")) writeFileSync(file, text.replaceAll(".next-e2e/", ".next/"));
}
