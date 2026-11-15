import { direction, locales, pathFor, type PageKey } from "../src/lib/i18n";
import { escapeRegExp, expect, expectNoHorizontalScroll, t, test } from "./fixtures";

/**
 * Le site public dans les trois langues : chaque page répond, dans sa langue
 * et son sens d’écriture, avec ses adresses alternatives, sans défilement
 * horizontal, sur ordinateur comme sur téléphone.
 */
const pages: PageKey[] = ["about", "services", "equipment", "projects", "contact", "quote", "legal", "privacy"];
const sections = ["about", "services", "equipment", "projects", "contact"] as const;

for (const locale of locales) {
  const text = t(locale);

  test.describe(text.languageName, () => {
    test("home: language, direction, main navigation, no horizontal scroll", async ({ page, isMobile }) => {
      const response = await page.goto(pathFor(locale, "home"));
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute("dir", direction(locale));
      await expect(page).toHaveTitle(/EVENTHEMES/);
      await expect(page.locator("h1").first()).toBeVisible();
      if (isMobile) {
        await page.getByRole("button", { name: text.nav.openMenu }).click();
        const menu = page.getByRole("navigation", { name: text.nav.mobile });
        await expect(menu.getByRole("link")).toHaveCount(6);
        for (const key of sections) await expect(menu.getByRole("link", { name: new RegExp(escapeRegExp(text.nav[key])) })).toBeVisible();
        await expect(page.locator("#menu-mobile").getByRole("link", { name: new RegExp(escapeRegExp(text.nav.quote)) })).toBeVisible();
        await page.getByRole("button", { name: text.nav.closeMenu }).click();
        await expect(menu).toBeHidden();
      } else {
        const nav = page.getByRole("navigation", { name: text.nav.main });
        await expect(nav.getByRole("link")).toHaveCount(6);
        for (const key of sections) await expect(nav.getByRole("link", { name: text.nav[key], exact: true })).toBeVisible();
        await expect(page.getByRole("banner").getByRole("link", { name: new RegExp(escapeRegExp(text.nav.quote)) })).toBeVisible();
      }
      await expectNoHorizontalScroll(page);
    });

    for (const key of pages) {
      test(`${key}: answers in its language, with its canonical and alternate addresses`, async ({ page }) => {
        const address = pathFor(locale, key);
        const response = await page.goto(address);
        expect(response?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator("html")).toHaveAttribute("dir", direction(locale));
        await expect(page.locator("h1").first()).toBeVisible();
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${escapeRegExp(address)}$`));
        for (const other of locales)
          await expect(page.locator(`link[rel="alternate"][hreflang="${other}"]`)).toHaveAttribute(
            "href",
            new RegExp(`${escapeRegExp(pathFor(other, key))}$`),
          );
        await expectNoHorizontalScroll(page);
      });
    }
  });
}

test("the language links open the same page in each language", async ({ page, isMobile }) => {
  await page.goto(pathFor("fr", "equipment"));
  const go = async (from: "fr" | "en" | "ar", to: "fr" | "en" | "ar") => {
    if (isMobile) {
      await page.getByRole("button", { name: t(from).nav.openMenu }).click();
      await page.locator("#menu-mobile").getByRole("link", { name: t(to).languageName, exact: true }).click();
    } else {
      // Direct links, or a « Langue » menu to open first.
      const banner = page.getByRole("banner");
      const link = banner.getByRole("link", { name: t(to).languageName, exact: true });
      if (!(await link.isVisible())) await banner.getByTitle(t(from).nav.language, { exact: true }).click();
      await link.click();
    }
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(pathFor(to, "equipment"))}$`));
    await expect(page.locator("html")).toHaveAttribute("lang", to);
    await expect(page.locator("html")).toHaveAttribute("dir", direction(to));
  };
  await go("fr", "en");
  await go("en", "ar");
  await go("ar", "fr");
});

test.describe("addresses and access", () => {
  test.skip(({ isMobile }) => isMobile, "the same on every screen");
  const fr = t("fr");

  test("former addresses redirect permanently to their replacements", async ({ request }) => {
    for (const [from, to] of [
      ["/location", "/materiel"],
      ["/location/truss", "/materiel/truss"],
      ["/evenements", "/realisations"],
    ]) {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status(), from).toBe(308);
      expect(new URL(response.headers().location, "http://site").pathname).toBe(to);
    }
  });

  test("an unknown address answers 404, in its language, with a way back", async ({ page }) => {
    for (const [address, locale] of [
      ["/cette-page-n-existe-pas", "fr"],
      ["/en/this-page-does-not-exist", "en"],
    ] as const) {
      const response = await page.goto(address);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1, name: t(locale).notFound.title })).toBeVisible();
      await expect(page.getByRole("main").getByRole("link", { name: new RegExp(escapeRegExp(t(locale).common.backHome)) })).toBeVisible();
    }
  });

  test("robots.txt keeps the back office out, and the sitemap lists every language", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/admin/);
    expect(robots).toMatch(/Disallow: \/api\//);
    expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const locale of locales) {
      expect(sitemap).toContain(`${pathFor(locale, "equipment")}</loc>`);
      expect(sitemap).toContain(`${pathFor(locale, "services", "sonorisation")}</loc>`);
    }
    expect(sitemap, "demonstration sheets are never proposed to search engines").not.toContain(pathFor("fr", "equipment", "truss"));
  });

  test("the first Tab reaches the skip link, which leads to the content", async ({ page }) => {
    await page.goto(pathFor("fr", "services"));
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: fr.nav.skip });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("the back office is closed to visitors and stays out of search engines", async ({ page, request }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/connexion$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect((await request.get("/api/admin")).status()).toBe(401);
  });
});
