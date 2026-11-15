import { pathFor } from "../src/lib/i18n";
import { isolated } from "./environment";
import { atHumanPace, escapeRegExp, expect, storedRequest, t, templateRegExp, test, uniqueEmail, uniquePhone } from "./fixtures";

/** Page Contact : un message envoyé est confirmé avec sa référence et enregistré pour l’équipe. */
test("a message is sent, confirmed with its reference and recorded for the team", async ({ page }) => {
  const c = t("fr").contact;
  const email = uniqueEmail("contact");
  await page.goto(pathFor("fr", "contact"));
  const nameField = page.getByRole("textbox", { name: c.name });
  await nameField.fill("Test Playwright contact");
  // The form is on screen and interactive from here: the anti-spam clock has started.
  const openedAt = Date.now();
  await page.getByRole("textbox", { name: c.email, exact: true }).fill(email);
  await page.getByRole("textbox", { name: c.phone, exact: true }).fill(uniquePhone());
  await page.getByRole("textbox", { name: c.subject }).fill("Disponibilité d’un mur LED");
  await page.getByRole("textbox", { name: c.message }).fill("Bonjour, un mur LED est-il disponible le mois prochain à Rabat ?");
  await page.getByRole("checkbox", { name: new RegExp(escapeRegExp(c.consentStart)) }).check();
  await atHumanPace(page, openedAt);
  await expect(nameField).toHaveValue("Test Playwright contact");
  await page.getByRole("button", { name: c.submit }).click();

  await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(c.sentStart)) })).toBeVisible();
  const confirmation = page.getByText(templateRegExp(c.reference, "reference", "EVT-\\d{4}-\\d{4}"));
  await expect(confirmation).toBeVisible();
  const reference = (await confirmation.textContent())!.match(/EVT-\d{4}-\d{4}/)![0];

  test.skip(!isolated, "the recorded message is read from the test server's local data");
  const stored = await storedRequest(reference);
  expect(stored).toMatchObject({ kind: "contact", email, subject: "Disponibilité d’un mur LED", locale: "fr" });
  expect(stored.message).toContain("mur LED");
});
