import assert from "node:assert/strict";
import { test } from "node:test";
import { seed } from "../src/data/eventheme";
import { organization } from "../src/lib/eventheme/structured";
import { localizeEntry } from "../src/lib/eventheme/translations";
import { publishedLocales, siteSettings, SETTINGS_ID, type Entry, type SiteSettings } from "../src/lib/eventheme/types";
import { validateEntry } from "../src/lib/eventheme/validation";
import { alternatesFor } from "../src/lib/i18n";

const settingsEntry = (settings: SiteSettings | Record<string, unknown>, id = SETTINGS_ID): Entry =>
  ({ id, kind: "settings", title: "", description: "", published: false, settings }) as Entry;

test("saved settings keep known fields only, trimmed, with safe defaults", () => {
  const saved = validateEntry(
    settingsEntry({
      address: "  12 rue des Studios\nCasablanca  ",
      map: "https://maps.app.goo.gl/abc123",
      hours: "Lundi–vendredi : 9 h – 18 h",
      hoursEn: "  ",
      unknown: "dropped",
    }),
  );
  assert.equal(saved.title, "Paramètres du site");
  assert.equal(saved.published, true, "settings are always readable by the site");
  assert.deepEqual(saved.settings, {
    address: "12 rue des Studios\nCasablanca",
    map: "https://maps.app.goo.gl/abc123",
    hours: "Lundi–vendredi : 9 h – 18 h",
    hoursEn: undefined,
    english: true,
    comingSoon: false,
  });
  assert.equal(validateEntry(settingsEntry({ english: false, comingSoon: true })).settings?.english, false);
  assert.equal(validateEntry(settingsEntry({ comingSoon: "yes" })).settings?.comingSoon, false, "only true closes the site");
});

test("invalid settings are refused", () => {
  for (const map of ["http://maps.example.com", "javascript:alert(1)", "https://a b"])
    assert.throws(() => validateEntry(settingsEntry({ map })), /https/, map);
  assert.throws(() => validateEntry(settingsEntry({ address: "x".repeat(501) })), Error);
  assert.throws(() => validateEntry(settingsEntry({ hours: 12 })), Error);
  assert.throws(() => validateEntry(settingsEntry({}, "other-settings")), /Paramètres/);
});

test("without saved settings the site is open and bilingual", () => {
  assert.deepEqual(siteSettings([]), { english: true, comingSoon: false });
  assert.deepEqual(publishedLocales([]), ["fr", "en"]);
  const french = [settingsEntry({ english: false })];
  assert.deepEqual(publishedLocales(french), ["fr"]);
  assert.deepEqual(alternatesFor("services", "regie", publishedLocales(french)), { fr: "/services/regie" });
});

test("the English site shows the English opening hours when they exist", () => {
  const entry = settingsEntry({ hours: "Lundi–vendredi", hoursEn: "Monday–Friday" });
  assert.equal(localizeEntry(entry, "en").settings?.hours, "Monday–Friday");
  assert.equal(localizeEntry(entry, "fr").settings?.hours, "Lundi–vendredi");
  const frenchOnly = settingsEntry({ hours: "Lundi–vendredi" });
  assert.equal(localizeEntry(frenchOnly, "en").settings?.hours, "Lundi–vendredi");
});

test("the company address and map reach the structured data only when supplied", () => {
  const base = "https://eventhemes.ma";
  assert.equal(organization(base, "fr", []).address, undefined, "no address invented");
  const data = organization(base, "fr", [
    settingsEntry({ address: "12 rue des Studios\n\nCasablanca", map: "https://maps.app.goo.gl/abc123" }),
  ]);
  assert.deepEqual(data.address, { "@type": "PostalAddress", streetAddress: "12 rue des Studios, Casablanca", addressCountry: "MA" });
  assert.equal(data.hasMap, "https://maps.app.goo.gl/abc123");
});

test("the starter content has one settings entry, open, bilingual and without invented details", () => {
  const all = seed.filter((entry) => entry.kind === "settings");
  assert.equal(all.length, 1);
  assert.equal(all[0].id, SETTINGS_ID);
  assert.deepEqual(validateEntry(all[0]).settings, { address: undefined, map: undefined, hours: undefined, hoursEn: undefined, english: true, comingSoon: false });
});
