import assert from "node:assert/strict";
import { test } from "node:test";
import {
  brandsOf,
  catalogueProblem,
  categoryInUse,
  categoryTrail,
  inCategory,
  matchesSearch,
  productCategory,
  productIdentity,
  topCategories,
  usedCategories,
} from "../src/lib/eventheme/catalogue";
import type { Entry } from "../src/lib/eventheme/types";

const e = (id: string, kind: Entry["kind"], title: string, extra: Partial<Entry> = {}): Entry => ({
  id,
  kind,
  title,
  description: "",
  published: true,
  ...extra,
});

const entries: Entry[] = [
  e("cat-son", "categories", "Sonorisation"),
  e("cat-son-micros", "categories", "Microphones", { parent: "cat-son" }),
  e("cat-son-diffusion", "categories", "Diffusion", { parent: "cat-son" }),
  e("cat-lumiere", "categories", "Éclairage"),
  e("cat-vide", "categories", "Catégorie sans matériel"),
  e("micro", "products", "Micro sans fil", {
    category: "cat-son",
    subcategory: "cat-son-micros",
    brand: "Shure",
    model: "SLXD24",
    reference: "SON-042",
    description: "Micro main HF",
  }),
  e("lyre", "products", "Lyre asservie", { category: "cat-lumiere", brand: "Robe" }),
  e("ancien", "products", "Chaise", { category: "Mobilier" }),
];
const [micro, lyre, ancien] = entries.filter((entry) => entry.kind === "products");

test("a product shows its category and sub-category titles, a free-text category as it is", () => {
  assert.deepEqual(productCategory(entries, micro), { category: "Sonorisation", subcategory: "Microphones" });
  assert.equal(categoryTrail(entries, micro), "Sonorisation · Microphones");
  assert.equal(categoryTrail(entries, lyre), "Éclairage");
  assert.equal(categoryTrail(entries, ancien), "Mobilier");
  assert.equal(productIdentity(micro), "Shure SLXD24");
  assert.equal(productIdentity(ancien), "");
});

test("a product belongs to its category through its sub-category too", () => {
  assert.ok(inCategory(micro, "cat-son"));
  assert.ok(inCategory(micro, "cat-son-micros"));
  assert.ok(!inCategory(micro, "cat-son-diffusion"));
  assert.deepEqual(
    usedCategories(topCategories(entries), [micro, lyre]).map((c) => c.id),
    ["cat-son", "cat-lumiere"],
  );
});

test("search matches name, brand, model, reference and category, without accents or case", () => {
  assert.ok(matchesSearch(entries, micro, "shure"));
  assert.ok(matchesSearch(entries, micro, "slxd24"));
  assert.ok(matchesSearch(entries, micro, "son-042"));
  assert.ok(matchesSearch(entries, micro, "MICROPHONES"));
  assert.ok(matchesSearch(entries, lyre, "eclairage"));
  assert.ok(matchesSearch(entries, micro, "micro shure"));
  assert.ok(!matchesSearch(entries, micro, "micro robe"));
  assert.ok(matchesSearch(entries, micro, "   "));
});

test("brands are listed once, sorted the French way", () => {
  assert.deepEqual(brandsOf([lyre, micro, { ...lyre, id: "lyre-2" }, ancien]), ["Robe", "Shure"]);
});

test("categories have one parent level at most; a sub-category belongs to the product's category", () => {
  assert.equal(catalogueProblem(entries, e("cat-x", "categories", "X", { parent: "cat-son" })), null);
  assert.match(catalogueProblem(entries, e("cat-x", "categories", "X", { parent: "cat-son-micros" }))!, /ne peut pas en contenir/);
  assert.match(catalogueProblem(entries, e("cat-x", "categories", "X", { parent: "inconnue" }))!, /parente existante/);
  assert.match(catalogueProblem(entries, { ...entries[0], parent: "cat-lumiere" })!, /rester une catégorie principale/);
  assert.equal(catalogueProblem(entries, micro), null);
  assert.match(catalogueProblem(entries, { ...lyre, subcategory: "cat-son-micros" })!, /appartenir à la catégorie/);
});

test("a category still holding products or sub-categories cannot be deleted", () => {
  assert.match(categoryInUse(entries, "cat-son")!, /1 matériel et 2 sous-catégories/);
  assert.match(categoryInUse(entries, "cat-lumiere")!, /1 matériel\b/);
  assert.equal(categoryInUse(entries, "cat-vide"), null);
});
