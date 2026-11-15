import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

/**
 * Charge chaque module de src/lib et src/data. Le rapport de couverture ne
 * compte que les fichiers chargés : sans ce test, un module jamais testé
 * n’apparaîtrait pas, au lieu d’apparaître à 0 %.
 */
const root = path.resolve(import.meta.dirname, "..", "src");
// Animations et intro : modules du navigateur (GSAP, fenêtre), vérifiés par les tests de bout en bout.
const browserOnly = new Set(["lib/motion.ts", "lib/intro.ts"]);

const modules = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const full = path.join(directory, name);
    if (statSync(full).isDirectory()) return modules(full);
    return /\.tsx?$/.test(name) && !name.endsWith(".d.ts") ? [full] : [];
  });

test("every library and data module loads outside the browser", async () => {
  process.env.EVENTHEME_DATA_DIR ??= mkdtempSync(path.join(tmpdir(), "eventhemes-modules-"));
  const files = [...modules(path.join(root, "lib")), ...modules(path.join(root, "data"))].filter(
    (file) => !browserOnly.has(path.relative(root, file).replaceAll(path.sep, "/")),
  );
  assert.ok(files.length > 30);
  for (const file of files) {
    const loaded = await import(pathToFileURL(file).href);
    assert.ok(Object.keys(loaded).length > 0, `${path.relative(root, file)} exports nothing`);
  }
});
