import { formText, formTextAr, formTextEn } from "../src/data/ui";
import { fill, pathFor, type Locale } from "../src/lib/i18n";
import { isolated } from "./environment";
import {
  atHumanPace,
  escapeRegExp,
  expect,
  expectNoHorizontalScroll,
  labelOf,
  previewsFor,
  storedRequest,
  t,
  templateRegExp,
  test,
  titleOf,
  uniqueEmail,
  uniquePhone,
} from "./fixtures";

/**
 * « Mon devis », le parcours central : demande de rappel, puis configuration
 * en cinq étapes avec pièce jointe, jusqu’au devis estimatif. On vérifie aussi
 * ce que le serveur enregistre (référence, langue, contenu, pièce jointe) et
 * les e-mails préparés.
 */
const forms = { fr: formText, en: formTextEn, ar: formTextAr };

test("nothing is sent until the required fields are filled, and each error says what is missing", async ({ page }) => {
  const fr = t("fr");
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/inquiries")) posts.push(request.url());
  });
  await page.goto(pathFor("fr", "quote"));
  await page.getByRole("button", { name: fr.quote.submit }).click();
  await expect(page.getByRole("alert").filter({ hasText: fr.common.missing })).toBeVisible();
  for (const message of [fr.quote.errors.name, fr.quote.errors.phone, fr.quote.errors.event, fr.quote.errors.consent])
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: fr.quote.name })).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("textbox", { name: fr.quote.email }).fill("adresse-incomplete@");
  await page.getByRole("button", { name: fr.quote.submit }).click();
  await expect(page.getByText(fr.quote.errors.email, { exact: true })).toBeVisible();
  expect(posts, "no request leaves the browser").toHaveLength(0);
});

for (const locale of ["fr", "en", "ar"] as Locale[]) {
  const text = t(locale);
  const c = text.configurator;

  test(`${text.languageName}: callback, then a full quote with an attachment, recorded in its language`, async ({ page, isMobile }) => {
    test.skip(isMobile && locale !== "fr", "one language is enough to check the phone layout");
    const name = `Test Playwright ${locale}`;
    const email = uniqueEmail(locale);
    await page.goto(pathFor(locale, "quote"));

    // 1. The callback request: the team has the contact, even if the visitor stops here.
    const nameField = page.getByRole("textbox", { name: text.quote.name });
    await nameField.fill(name);
    // The form is on screen and interactive from here: the anti-spam clock has started.
    const openedAt = Date.now();
    await page.getByRole("textbox", { name: text.quote.phone, exact: true }).fill(uniquePhone());
    await page.getByRole("textbox", { name: text.quote.email }).fill(email);
    await labelOf(page, page.getByRole("radio", { name: titleOf("gala", locale) })).click();
    await page.getByRole("checkbox", { name: new RegExp(escapeRegExp(text.quote.consentStart)) }).check();
    await atHumanPace(page, openedAt);
    await expect(nameField).toHaveValue(name);
    await page.getByRole("button", { name: text.quote.submit }).click();
    const receipt = page.getByText(templateRegExp(text.quote.received, "reference", "EVT-\\d{4}-\\d{4}"));
    await expect(receipt).toBeVisible();
    const reference = (await receipt.textContent())!.match(/EVT-\d{4}-\d{4}/)![0];
    await expectNoHorizontalScroll(page);

    // 2. The configurator, step by step.
    await page.getByRole("button", { name: text.quote.customise }).click();
    const step = (number: number) => page.getByRole("heading", { name: new RegExp(escapeRegExp(fill(c.step, { step: number, total: 5 }))) });
    await expect(step(1)).toBeVisible();
    const configuratorOpenedAt = Date.now();
    await page.getByRole("button", { name: c.continue }).click();
    await expect(page.getByText(c.errors.date, { exact: true })).toBeVisible();
    await expect(page.getByText(c.errors.city, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: new RegExp(escapeRegExp(c.date)) }).click();
    const calendar = page.getByRole("dialog", { name: forms[locale].dateDialog });
    await calendar.getByRole("button", { name: forms[locale].nextMonth }).click();
    await calendar.getByRole("grid").locator("button:not([aria-disabled])").first().click();
    await page.getByRole("combobox", { name: c.city }).fill("Marrakech");
    await page.getByRole("option", { name: "Marrakech", exact: true }).click();
    await page.getByRole("button", { name: c.continue }).click();

    await expect(step(2)).toBeVisible();
    await labelOf(page, page.getByRole("checkbox", { name: new RegExp(escapeRegExp(titleOf("sonorisation", locale))) })).click();
    await page.getByRole("button", { name: c.continue }).click();

    await expect(step(3)).toBeVisible();
    await page.locator("article").filter({ hasText: titleOf("confettis", locale) }).getByRole("button", { name: c.addOne }).click();
    await page.getByRole("button", { name: c.continue }).click();

    await expect(step(4)).toBeVisible();
    await page.getByRole("textbox", { name: c.description }).fill("Gala de fin d’année, scène en extérieur.");
    await page.locator('input[type="file"]').setInputFiles({
      name: "plan-du-lieu.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n% plan de test Playwright\n"),
    });
    await expect(page.getByRole("list", { name: c.selectedFiles })).toContainText("plan-du-lieu.pdf");
    await page.getByRole("button", { name: c.continue }).click();

    await expect(step(5)).toBeVisible();
    const recap = page.locator("dl");
    await expect(recap).toContainText("Marrakech");
    await expect(recap).toContainText(titleOf("sonorisation", locale));
    await expect(recap).toContainText(titleOf("confettis", locale));
    await expect(recap).toContainText("plan-du-lieu.pdf");
    await atHumanPace(page, configuratorOpenedAt);
    await page.getByRole("button", { name: c.send }).click();

    // 3. The estimate: the visitor's quote is ready.
    await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(text.quote.titles.done[0])) })).toBeVisible({ timeout: 30_000 });
    await expectNoHorizontalScroll(page);

    // What the server recorded, in the visitor's language.
    test.skip(!isolated, "the recorded request is read from the test server's local data");
    const stored = await storedRequest(reference, (item) => item.kind === "quote" && (item.attachments?.length ?? 0) === 1);
    expect(stored).toMatchObject({ name, email, city: "Marrakech", event: "gala", locale });
    expect(stored.basket.services).toEqual(["sonorisation"]);
    expect(stored.basket.products).toEqual([expect.objectContaining({ id: "confettis", quantity: 1 })]);
    expect(stored.attachments![0]).toMatchObject({ name: "plan-du-lieu.pdf", type: "application/pdf" });
    expect(stored.message).toContain("Gala de fin d’année");
    // Team alert and acknowledgement, for the callback and again for the completed quote.
    await expect.poll(() => previewsFor(stored.id).length).toBe(4);
  });
}
