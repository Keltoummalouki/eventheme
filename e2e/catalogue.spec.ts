import type { Page } from "@playwright/test";
import { fill, pathFor } from "../src/lib/i18n";
import { escapeRegExp, expect, expectNoHorizontalScroll, t, test } from "./fixtures";

/** Catalogue matériel : recherche, filtres, fiche produit, panier « Mon devis » conservé d’une page à l’autre. */
const fr = t("fr");
const cards = (page: Page) => page.locator("article").filter({ has: page.getByRole("button", { name: fr.common.addToQuote }) });

/** « Mon devis » et son compteur : dans l’en-tête sur ordinateur, dans le menu sur téléphone. */
async function expectQuoteCount(page: Page, isMobile: boolean, count: number) {
  const name = new RegExp(`${escapeRegExp(fr.nav.quote)}\\s*\\(?${count}\\)?`);
  if (!isMobile) return expect(page.getByRole("banner").getByRole("link", { name })).toBeVisible();
  await page.getByRole("button", { name: fr.nav.openMenu }).click();
  await expect(page.locator("#menu-mobile").getByRole("link", { name })).toBeVisible();
  await page.getByRole("button", { name: fr.nav.closeMenu }).click();
}

test("search finds equipment by reference, name or brand, and says when nothing matches", async ({ page }) => {
  await page.goto(pathFor("fr", "equipment"));
  await expect(cards(page)).toHaveCount(10);
  const search = page.getByLabel(fr.catalog.searchEquipment);
  await search.fill("DEMO-LUM-01");
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).getByRole("heading")).toHaveText("Lyre asservie (moving head)");
  await expect(page.getByText(fill(fr.catalog.countEquipment, { count: 1 }))).toBeVisible();
  await search.fill("confettis");
  await expect(cards(page)).toHaveCount(1);
  await search.fill("aucun-materiel-de-ce-nom");
  await expect(page.getByText(fr.catalog.empty)).toBeVisible();
  await page.getByRole("button", { name: fr.catalog.reset }).click();
  await expect(cards(page)).toHaveCount(10);
  await expectNoHorizontalScroll(page);
});

test("categories filter the catalogue, and an address can preselect one", async ({ page }) => {
  await page.goto(`${pathFor("fr", "equipment")}?categorie=cat-son`);
  const filters = page.getByRole("group", { name: fr.catalog.byCategory });
  await expect(filters.getByRole("button", { name: "Sonorisation", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(cards(page)).toHaveCount(2);
  await filters.getByRole("button", { name: "Éclairage", exact: true }).click();
  await expect(filters.getByRole("button", { name: "Éclairage", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(cards(page)).toHaveCount(2);
  await filters.getByRole("button", { name: fr.catalog.allEquipment }).click();
  await expect(cards(page)).toHaveCount(10);
});

test("equipment added to the quote is counted, kept after a reload and on the quote page", async ({ page, isMobile }) => {
  await page.goto(pathFor("fr", "equipment"));
  await cards(page).filter({ hasText: "Canon à confettis" }).getByRole("button", { name: fr.common.addToQuote }).click();
  await expectQuoteCount(page, isMobile, 1);

  await page.goto(pathFor("fr", "equipment", "mur-led"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mur LED modulaire");
  await expect(page.getByText(fr.common.example).first()).toBeVisible();
  await page.getByRole("main").getByRole("button", { name: fr.common.addToQuote }).first().click();
  await expectQuoteCount(page, isMobile, 2);

  await page.reload();
  await expectQuoteCount(page, isMobile, 2);
  await page.goto(pathFor("fr", "quote"));
  await expectQuoteCount(page, isMobile, 2);
});
