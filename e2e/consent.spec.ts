import { pathFor } from "../src/lib/i18n";
import { isolated, MEASUREMENT_ID } from "./environment";
import { expect, t, test } from "./fixtures";

/**
 * Mesure d’audience avec consentement (loi 09-08, cahier des charges §10) :
 * rien n’est chargé avant « Accepter », le refus est aussi simple et retenu,
 * le choix se modifie depuis le pied de page, et le retrait coupe la mesure.
 * Les requêtes vers Google sont interceptées : rien ne part réellement.
 */
test.use({ consent: "unset" });
test.skip(!isolated, "needs the test server's Analytics id");

test("analytics waits for consent; refusing is remembered; the choice can be changed and withdrawn", async ({ page, analytics }) => {
  const fr = t("fr");
  const loaded = () => analytics.filter((url) => url.includes(`gtag/js?id=${MEASUREMENT_ID}`)).length;
  await page.goto(pathFor("fr", "services"));
  const banner = page.getByRole("region", { name: fr.consent.label });
  await expect(banner).toBeVisible();
  expect(analytics, "nothing is loaded before a choice").toHaveLength(0);

  await banner.getByRole("button", { name: fr.consent.refuse }).click();
  await expect(banner).toBeHidden();
  await page.reload();
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(banner).toBeHidden();
  expect(analytics, "a refusal is remembered and nothing is loaded").toHaveLength(0);

  await page.getByRole("button", { name: fr.footer.cookies }).click();
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: fr.consent.accept }).click();
  await expect(banner).toBeHidden();
  await expect.poll(loaded, { message: "Google Analytics loads after consent" }).toBe(1);

  // Withdrawal: the page reloads without measurement.
  await page.getByRole("button", { name: fr.footer.cookies }).click();
  await Promise.all([page.waitForEvent("load"), banner.getByRole("button", { name: fr.consent.refuse }).click()]);
  await expect(page.locator("h1").first()).toBeVisible();
  const before = analytics.length;
  await page.reload();
  await expect(page.locator("h1").first()).toBeVisible();
  expect(analytics.length, "no measurement after withdrawal").toBe(before);
  await expect(banner).toBeHidden();
});
