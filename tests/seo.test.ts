import assert from "node:assert/strict";
import { test } from "node:test";
import { seed } from "../src/data/eventheme";
import { moroccanCities } from "../src/data/moroccanCities";
import {
  CONSENT_KEY,
  contactMethodOf,
  measurementId,
  readConsent,
  track,
  writeConsent,
} from "../src/lib/eventheme/audience";
import {
  breadcrumbs,
  cityService,
  cityTitle,
  detailBreadcrumbs,
  excerpt,
  jsonLd,
  organization,
  service,
  website,
} from "../src/lib/eventheme/structured";
import type { Entry } from "../src/lib/eventheme/types";
import { validateEntry } from "../src/lib/eventheme/validation";
import { pathFor, routeOf, translatePath } from "../src/lib/i18n";
import { isGeneratedId, slugify, uniqueSlug } from "../src/lib/slug";

const base = "https://eventhemes.ma";
const e = (id: string, kind: Entry["kind"], title: string, extra: Partial<Entry> = {}): Entry => ({
  id,
  kind,
  title,
  description: "",
  published: true,
  ...extra,
});

/* --- Adresses ---------------------------------------------------------------- */

test("services and cities have their own pages in both languages", () => {
  assert.equal(pathFor("fr", "services", "sonorisation"), "/services/sonorisation");
  assert.equal(pathFor("en", "services", "sonorisation"), "/en/services/sonorisation");
  assert.equal(pathFor("fr", "cities"), "/villes");
  assert.equal(pathFor("en", "cities", "fes"), "/en/cities/fes");
  assert.deepEqual(routeOf("/villes/marrakech"), { locale: "fr", key: "cities", id: "marrakech" });
  assert.deepEqual(routeOf("/en/services/regie"), { locale: "en", key: "services", id: "regie" });
  assert.equal(translatePath("/villes/tanger", "en"), "/en/cities/tanger");
});

test("titles become readable, unique page addresses", () => {
  assert.equal(slugify("Éclairage & effets"), "eclairage-effets");
  assert.equal(slugify("  Fès  "), "fes");
  assert.equal(slugify("Œuvre d’art — Scène 360°"), "oeuvre-d-art-scene-360");
  assert.equal(slugify("!!!"), "");
  assert.equal(slugify("a".repeat(200)).length, 80);
  assert.equal(uniqueSlug("marrakech", ["marrakech", "marrakech-2"]), "marrakech-3");
  assert.equal(uniqueSlug("rabat", ["marrakech"]), "rabat");
  assert.equal(uniqueSlug("", []), "contenu");
  assert.ok(isGeneratedId("3f2a1b4c-0d5e-4f6a-8b7c-9d0e1f2a3b4c"));
  assert.ok(!isGeneratedId("marrakech"));
  // Every readable identifier satisfies the server rule for content ids.
  for (const title of ["Mur LED 4×3 m", "Régie & coordination", "Ville d’Ifrane"]) assert.match(slugify(title), /^[a-z0-9-]{1,100}$/);
});

/* --- Contenus de départ --------------------------------------------------------- */

test("city drafts stay unpublished and match the quote form's city list", () => {
  const cities = seed.filter((entry) => entry.kind === "cities");
  assert.ok(cities.length > 0);
  for (const city of cities) {
    assert.equal(city.published, false, `${city.id} must wait for EVENTHEMES`);
    assert.ok(moroccanCities.some((name) => slugify(name) === city.id), `${city.id} is not a known city`);
    assert.ok(city.description.length > 80, `${city.id} needs its own text`);
    assert.ok(city.translations?.en?.description, `${city.id} has no English draft`);
  }
  assert.equal(new Set(cities.map((city) => city.description)).size, cities.length, "each city has its own text");
});

test("each service lists catalogue categories that exist", () => {
  const categories = new Set(seed.filter((entry) => entry.kind === "categories" && !entry.parent).map((entry) => entry.id));
  for (const item of seed.filter((entry) => entry.kind === "services")) {
    assert.ok(item.related?.length, `${item.id} has no related equipment`);
    for (const id of item.related!) assert.ok(categories.has(id), `${item.id} → ${id}`);
  }
});

test("related categories are identifiers, without duplicates", () => {
  const item = e("sonorisation", "services", "Sonorisation");
  assert.deepEqual(validateEntry({ ...item, related: ["cat-son", "cat-son", "cat-regie"] }).related, ["cat-son", "cat-regie"]);
  assert.equal(validateEntry({ ...item, related: [] }).related, undefined);
  for (const related of ["cat-son", [1], ["../x"], Array.from({ length: 31 }, (_, i) => `c${i}`)])
    assert.throws(() => validateEntry({ ...item, related }), Error, JSON.stringify(related).slice(0, 30));
});

/* --- Données structurées --------------------------------------------------------- */

const entries: Entry[] = [
  e("instagram", "socials", "Instagram", { url: "https://www.instagram.com/eventhemes/" }),
  e("whatsapp", "socials", "WhatsApp", { url: "https://wa.me/message/AREDMVCCJW5GM1" }),
];

test("the organisation lists only real public profiles, and contact details only when they exist", () => {
  const data = organization(base, "fr", entries);
  assert.equal(data["@type"], "Organization");
  assert.equal(data.name, "EVENTHEMES");
  assert.deepEqual(data.sameAs, ["https://www.instagram.com/eventhemes/"], "a WhatsApp link is not a profile");
  assert.equal(data.contactPoint, undefined, "no phone or e-mail supplied: none invented");
  assert.deepEqual(data.areaServed, { "@type": "Country", name: "Maroc" });
  const contact = organization(base, "en", [
    ...entries,
    e("phone", "socials", "Téléphone", { url: "tel:+212600000000" }),
    e("mail", "socials", "E-mail", { url: "mailto:contact@eventhemes.ma?subject=Devis" }),
  ]);
  assert.deepEqual(contact.contactPoint, {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: ["French", "English"],
    telephone: "+212600000000",
    email: "contact@eventhemes.ma",
  });
  assert.equal((contact.areaServed as { name: string }).name, "Morocco");
  assert.equal(website(base, "en").url, "https://eventhemes.ma/en");
});

test("breadcrumbs and services carry absolute addresses", () => {
  const item = e("sonorisation", "services", "Sound systems", { category: "Sound", description: "Audio.", image: "/eventheme.jpg" });
  assert.deepEqual(
    (breadcrumbs(base, [["Home", "/en"], ["Services", "/en/services"]]).itemListElement as { item: string; position: number }[]).map(
      (step) => [step.position, step.item],
    ),
    [
      [1, "https://eventhemes.ma/en"],
      [2, "https://eventhemes.ma/en/services"],
    ],
  );
  const trail = detailBreadcrumbs(base, "fr", "cities", e("fes", "cities", "Fès")).itemListElement as { name: string; item: string }[];
  assert.deepEqual(trail.map((step) => step.name), ["Accueil", "Zones d’intervention", "Fès"]);
  assert.equal(trail[2].item, "https://eventhemes.ma/villes/fes");
  const data = service(base, "en", item);
  assert.equal(data.url, "https://eventhemes.ma/en/services/sonorisation");
  assert.equal(data.image, "https://eventhemes.ma/eventheme.jpg");
  assert.deepEqual(data.provider, { "@id": "https://eventhemes.ma/#organization" });
});

test("a city page describes the service in that city, under its default or custom title", () => {
  const city = e("marrakech", "cities", "Marrakech", { description: "Galas et séminaires." });
  assert.equal(cityTitle("fr", city), "Production technique événementielle à Marrakech");
  assert.equal(cityTitle("en", city), "Event technical production in Marrakech");
  assert.equal(cityTitle("fr", { ...city, subtitle: "Location de matériel à Marrakech" }), "Location de matériel à Marrakech");
  const data = cityService(base, "fr", city);
  assert.deepEqual(data.areaServed, { "@type": "City", name: "Marrakech", containedInPlace: { "@type": "Country", name: "Maroc" } });
  assert.equal(data.url, "https://eventhemes.ma/villes/marrakech");
});

test("JSON-LD cannot close its script tag", () => {
  const html = jsonLd({ name: "</script><script>alert(1)</script>" });
  assert.ok(!html.includes("<"));
  assert.equal(JSON.parse(html).name, "</script><script>alert(1)</script>");
});

test("search descriptions stop at a sentence or a word, within 160 characters", () => {
  assert.equal(excerpt("Court."), "Court.");
  const long = `${"Une phrase complète pour décrire le service proposé. ".repeat(2)}Puis une suite beaucoup trop longue pour tenir dans la description affichée par les moteurs.`;
  const cut = excerpt(long);
  assert.ok(cut.length <= 160);
  assert.match(cut, /\.$/);
  const words = excerpt("mot ".repeat(80));
  assert.ok(words.length <= 160 && words.endsWith("…"));
});

/* --- Mesure d’audience ---------------------------------------------------------- */

test("analytics stays off without a valid Google Analytics id", () => {
  assert.equal(measurementId("G-ABC123XYZ9"), "G-ABC123XYZ9");
  assert.equal(measurementId(" g-abc123xyz9 "), "G-ABC123XYZ9");
  for (const value of [undefined, null, "", "UA-12345-1", "G-", "<script>"]) assert.equal(measurementId(value), null);
});

test("the consent choice is read back safely, even when storage is unavailable", () => {
  const memory = new Map<string, string>();
  const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => void memory.set(key, value) };
  assert.equal(readConsent(storage), null);
  writeConsent(storage, "denied");
  assert.equal(memory.get(CONSENT_KEY), "denied");
  assert.equal(readConsent(storage), "denied");
  memory.set(CONSENT_KEY, "maybe");
  assert.equal(readConsent(storage), null);
  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(readConsent(blocked), null);
  assert.doesNotThrow(() => writeConsent(blocked, "granted"));
  // Without consent (no gtag loaded), tracking does nothing.
  assert.doesNotThrow(() => track("generate_lead", { lead_type: "quote" }));
});

test("contact clicks are recognised by their link, never by their content", () => {
  assert.equal(contactMethodOf("https://wa.me/212600000000?text=Bonjour"), "whatsapp");
  assert.equal(contactMethodOf("https://wa.me/message/AREDMVCCJW5GM1"), "whatsapp");
  assert.equal(contactMethodOf("tel:+212600000000"), "phone");
  assert.equal(contactMethodOf("mailto:contact@eventhemes.ma"), "email");
  for (const href of ["/devis", "https://www.instagram.com/eventhemes/", "", null]) assert.equal(contactMethodOf(href), null);
});
