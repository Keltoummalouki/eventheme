import assert from "node:assert/strict";
import { test } from "node:test";
import { dictionaries, contactMethodLabel, projectCategoryLabel } from "../src/data/locales";
import { translateServerError } from "../src/data/locales/errors";
import { en } from "../src/data/locales/en";
import { fr } from "../src/data/locales/fr";
import { projectCategories, seed } from "../src/data/eventheme";
import { clientEmail, teamEmail } from "../src/lib/eventheme/emails";
import { estimate } from "../src/lib/eventheme/pricing";
import { attachmentHint, attachmentProblem, sizeLabel } from "../src/lib/eventheme/requests";
import { localizeEntries, localizeEntry } from "../src/lib/eventheme/translations";
import {
  lineAmount,
  money,
  participantsLabel,
  priceLabel,
  translatableFields,
  variantLabel,
  type Entry,
  type Inquiry,
} from "../src/lib/eventheme/types";
import { validateEntry } from "../src/lib/eventheme/validation";
import { quoteMessage } from "../src/lib/eventheme/whatsapp";
import {
  alternatesFor,
  fill,
  localeOf,
  locales,
  pageFromSlug,
  pageKeys,
  pathFor,
  routeOf,
  translatePath,
} from "../src/lib/i18n";

/* --- Adresses ---------------------------------------------------------------- */

test("every page has an address in each language, and reading it back gives the same page", () => {
  for (const locale of locales)
    for (const key of pageKeys) {
      const path = pathFor(locale, key);
      const route = routeOf(path);
      assert.equal(route.locale, locale, path);
      assert.equal(route.key, key, path);
      assert.equal(route.id, undefined, path);
      if (key !== "home") assert.equal(pageFromSlug(locale, path.split("/").pop()!), key);
    }
  assert.equal(pathFor("fr", "home"), "/");
  assert.equal(pathFor("en", "home"), "/en");
  assert.equal(pathFor("fr", "equipment"), "/materiel");
  assert.equal(pathFor("en", "equipment"), "/en/equipment");
  assert.equal(pathFor("en", "privacy"), "/en/privacy-policy");
});

test("product and project sheets keep their identifier across languages", () => {
  assert.equal(pathFor("fr", "equipment", "mur-led"), "/materiel/mur-led");
  assert.equal(pathFor("en", "projects", "inspiration gala"), "/en/projects/inspiration%20gala");
  assert.deepEqual(routeOf("/en/projects/inspiration%20gala"), { locale: "en", key: "projects", id: "inspiration gala" });
  assert.equal(translatePath("/materiel/mur-led", "en"), "/en/equipment/mur-led");
  assert.equal(translatePath("/en/equipment/mur-led?x=1", "fr"), "/materiel/mur-led");
  assert.deepEqual(alternatesFor("projects", "a"), { fr: "/realisations/a", en: "/en/projects/a" });
});

test("addresses outside the site map keep their language but name no page", () => {
  assert.deepEqual(routeOf("/admin"), { locale: "fr" });
  assert.deepEqual(routeOf("/en/materiel"), { locale: "en" }, "a French slug under /en is not an English page");
  assert.deepEqual(routeOf("/contact/equipe"), { locale: "fr" }, "the contact page has no sheet");
  assert.deepEqual(routeOf("/fr/materiel"), { locale: "fr" }, "French has no prefix");
  // The language switcher falls back to the home page of the other language.
  assert.equal(translatePath("/bientot", "en"), "/en");
});

test("an unknown or missing language reads as French", () => {
  assert.equal(localeOf("en"), "en");
  for (const value of [undefined, null, "", "EN", "ar", "fr-FR", 1]) assert.equal(localeOf(value), "fr");
});

/* --- Dictionnaires ----------------------------------------------------------- */

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

/** Compare the two dictionaries leaf by leaf: same keys, same list lengths, same placeholders. */
function compare(french: unknown, english: unknown, path: string) {
  if (typeof french === "string") {
    assert.equal(typeof english, "string", path);
    assert.notEqual((english as string).trim(), "", `${path} is empty`);
    assert.deepEqual(placeholders(english as string), placeholders(french), `${path}: placeholders differ`);
    return;
  }
  if (Array.isArray(french)) {
    assert.ok(Array.isArray(english), path);
    assert.equal((english as unknown[]).length, french.length, `${path}: list length differs`);
    french.forEach((item, index) => compare(item, (english as unknown[])[index], `${path}[${index}]`));
    return;
  }
  const frenchKeys = Object.keys(french as object).sort();
  assert.deepEqual(Object.keys(english as object).sort(), frenchKeys, `${path}: keys differ`);
  for (const key of frenchKeys)
    compare((french as Record<string, unknown>)[key], (english as Record<string, unknown>)[key], `${path}.${key}`);
}

test("the English dictionary has every French key, list length and placeholder", () => {
  compare(fr, en, "dictionary");
});

test("stored values (contact methods, project types) are the French keys, labelled per language", () => {
  assert.deepEqual(projectCategories, Object.keys(fr.projectCategories));
  for (const value of projectCategories) assert.equal(projectCategoryLabel("fr", value), value);
  assert.equal(projectCategoryLabel("en", "Événements corporate"), "Corporate events");
  assert.equal(projectCategoryLabel("en", "Catégorie libre"), "Catégorie libre", "an unknown value is shown as is");
  assert.equal(projectCategoryLabel("en", undefined), "");
  assert.equal(contactMethodLabel("en", "Téléphone"), "Phone");
  assert.equal(contactMethodLabel("fr", "Téléphone"), "Téléphone");
  assert.deepEqual(Object.keys(fr.email.ways), Object.keys(fr.contactMethods));
});

test("fill replaces known placeholders and leaves unknown ones visible", () => {
  assert.equal(fill("{count} jours · {missing}", { count: 3 }), "3 jours · {missing}");
});

/* --- Contenus traduits --------------------------------------------------------- */

const product: Entry = {
  id: "truss",
  kind: "products",
  title: "Structure truss aluminium",
  description: "Poutres et tours.",
  category: "cat-structures",
  color: "Noir",
  published: true,
  translations: { en: { title: "Aluminium truss structure", description: "  ", category: "Structures", color: "Black" } },
};

test("an English field replaces the French one; an empty one keeps the French text", () => {
  const localized = localizeEntry(product, "en");
  assert.equal(localized.title, "Aluminium truss structure");
  assert.equal(localized.description, "Poutres et tours.");
  assert.equal(localized.color, "Black");
  assert.equal(localized.category, "cat-structures", "a product category is an identifier, never translated");
  assert.equal(localizeEntry(product, "fr"), product);
  assert.equal(localizeEntry({ ...product, translations: undefined }, "en").title, product.title);
  const service: Entry = { ...product, kind: "services", category: "Structure", translations: { en: { category: "Rigging" } } };
  assert.equal(localizeEntry(service, "en").category, "Rigging", "a service discipline is translated");
  assert.equal(localizeEntries([product], "fr")[0], product);
});

test("option names get an English label while the French name stays the basket key", () => {
  const options: Entry = {
    ...product,
    price: 50,
    pricing: "fixed",
    variants: [
      { name: "Intérieur", price: null },
      { name: "Extérieur", price: 80 },
      { name: "Sur mesure", price: null },
    ],
    translations: { en: { variants: "Indoor\n Outdoor \n" } },
  };
  const localized = localizeEntry(options, "en");
  assert.deepEqual(
    localized.variants?.map((variant) => [variant.name, variant.label]),
    [["Intérieur", "Indoor"], ["Extérieur", "Outdoor"], ["Sur mesure", undefined]],
  );
  assert.equal(variantLabel(localized, "Extérieur"), "Outdoor");
  assert.equal(variantLabel(localized, "Sur mesure"), "Sur mesure", "a missing line keeps the French name");
  assert.equal(variantLabel(options, "Extérieur"), "Extérieur");
  const basket = { services: [], products: [{ id: "truss", variant: "Extérieur", quantity: 2 }] };
  // No English title in this fixture: the French one is kept.
  assert.equal(estimate([localized], { event: "", rentalDays: 1 }, basket, "en").lines[0].label, "Structure truss aluminium · Outdoor");
  assert.equal(estimate([options], { event: "", rentalDays: 1 }, basket).total, 160, "the server prices by name");
  // A label never reaches the stored content.
  assert.deepEqual(validateEntry(localized).variants?.map((variant) => Object.keys(variant).includes("label")), [false, false, false]);
});

test("the admin keeps a trimmed English version and drops empty fields", () => {
  const saved = validateEntry({
    ...product,
    translations: { en: { title: "  Aluminium truss  ", description: "", unknown: "x", specifications: "Load: 500 kg" } },
  });
  assert.deepEqual(saved.translations, { en: { title: "Aluminium truss", specifications: "Load: 500 kg" } });
  assert.equal(validateEntry({ ...product, translations: { en: { title: " " } } }).translations, undefined);
  assert.equal(validateEntry({ ...product, translations: undefined }).translations, undefined);
  for (const translations of ["x", ["x"], { en: "x" }, { en: ["x"] }, { en: { title: 3 } }, { en: { title: "x".repeat(251) } }])
    assert.throws(() => validateEntry({ ...product, translations }), Error, JSON.stringify(translations).slice(0, 40));
});

test("every starter entry with text has an English draft, limited to translatable fields", () => {
  for (const entry of seed) {
    if (entry.kind === "socials" && entry.network !== "whatsapp") continue;
    const english = entry.translations?.en;
    assert.ok(english && Object.keys(english).length, `${entry.id} has no English version`);
    for (const field of Object.keys(english)) assert.ok((translatableFields as readonly string[]).includes(field), `${entry.id}.${field}`);
    assert.doesNotThrow(() => validateEntry(entry), entry.id);
  }
});

/* --- Formats ----------------------------------------------------------------- */

test("prices, quantities and sizes read naturally in English", () => {
  assert.equal(priceLabel({ ...product, price: null, pricing: "request" }, "en"), "On request");
  assert.equal(priceLabel({ ...product, price: null, pricing: "request" }), "Sur devis");
  assert.equal(participantsLabel(350, "en"), "350 attendees");
  assert.equal(participantsLabel(1, "en"), "1 attendee");
  assert.equal(participantsLabel(0, "en"), dictionaries.en.format.participantsUnknown);
  assert.match(money(12000, "en"), /12,000/);
  assert.match(money(12000), /^12\.000\sMAD$/, "French amounts keep the Moroccan grouping");
  assert.equal(sizeLabel(4 * 1024 * 1024, "en"), "4 MB");
  assert.equal(sizeLabel(1536 * 1024), "1,5 Mo");
  assert.equal(sizeLabel(2048, "en"), "2 KB");
  assert.equal(attachmentHint("en"), "PDF, JPG, PNG or WebP · 3 files · 4 MB each");
  assert.match(attachmentProblem({ name: "plan.docx", type: "application/msword", size: 10 }, "en") ?? "", /format not accepted/);
});

test("estimate lines, the WhatsApp message and server errors follow the visitor's language", () => {
  const daily: Entry = { ...product, price: 100, pricing: "daily", translations: undefined };
  const { lines } = estimate([daily], { event: "", rentalDays: 3 }, { services: [], products: [{ id: "truss", variant: "", quantity: 2 }] }, "en");
  assert.match(lines[0].label, /2 unit\(s\) × 3 day\(s\)$/);
  assert.match(lineAmount(lines[0], "en"), /600/);
  const message = quoteMessage({ event: "Gala", date: "2099-06-12", city: "Rabat", services: [], name: "Sam", phone: "+212600000000", email: "", reference: "EVT-2099-0001" }, "en");
  assert.match(message, /^Hello EVENTHEMES, I would like to request a quote/);
  assert.match(message, /12 June 2099/);
  assert.match(message, /EVT-2099-0001/);
  assert.doesNotMatch(message, /\{\w+\}/);
  assert.equal(translateServerError("Demande introuvable.", "en"), "Request not found.");
  assert.equal(translateServerError("Demande introuvable.", "fr"), "Demande introuvable.");
  assert.equal(translateServerError("Indiquez entre 1 et 30 jours de location.", "en"), "Enter between 1 and 30 rental days.");
  assert.equal(translateServerError("Fichier trop lourd : 4 Mo au plus.", "en"), "File too large: 4 MB at most.");
  assert.equal(translateServerError("Message inattendu.", "en"), "Message inattendu.", "an unknown message is passed through");
});

/* --- E-mails ----------------------------------------------------------------- */

const entries: Entry[] = [
  { id: "gala", kind: "events", title: "Gala & cérémonie", description: "", published: true, translations: { en: { title: "Gala & ceremony" } } },
  { id: "sonorisation", kind: "services", title: "Sonorisation", description: "", published: true, translations: { en: { title: "Sound systems" } } },
];
const request = (over: Partial<Inquiry> = {}): Inquiry => ({
  id: "4f1c2d3e-0000-4000-8000-000000000009",
  reference: "EVT-2026-0050",
  kind: "quote",
  name: "Sam Taylor",
  email: "sam@example.com",
  phone: "+212 6 61 23 45 67",
  company: "",
  city: "Marrakech",
  address: "",
  message: "",
  subject: "",
  event: "gala",
  date: "2099-06-12",
  duration: 0,
  rentalDays: 1,
  guests: 120,
  budget: 0,
  contactMethod: "WhatsApp",
  consent: true,
  website: "",
  startedAt: 0,
  basket: { services: ["sonorisation"], products: [] },
  createdAt: "2026-11-14T10:00:00.000Z",
  status: "Nouveau",
  notes: "",
  estimate: 0,
  hasUnpriced: true,
  summary: [],
  locale: "en",
  ...over,
});

test("a visitor from the English site receives an English acknowledgement", () => {
  const mail = clientEmail(request(), entries, { whatsappUrl: "https://wa.me/212600000000" })!;
  assert.equal(mail.subject, "Summary of your quote request · EVT-2026-0050");
  assert.match(mail.html, /<html lang="en">/);
  for (const fragment of ["Hello Sam,", "on WhatsApp to prepare", "Gala &amp; ceremony", "Sound systems", "12 June 2099", "120 attendees", "On request", "Message us on WhatsApp", "Event technical production"])
    assert.ok(mail.html.includes(fragment), fragment);
  assert.match(mail.text, /^Event: Gala & ceremony$/m);
  assert.doesNotMatch(mail.html, /Bonjour|Récapitulatif|Sur devis/);
});

test("without a language, the acknowledgement stays French; the team alert is always French", () => {
  const french = clientEmail(request({ locale: undefined }), entries, {})!;
  assert.match(french.subject, /^Récapitulatif de votre demande de devis/);
  assert.match(french.html, /<html lang="fr">/);
  assert.match(french.text, /^Événement : Gala & cérémonie$/m);
  const team = teamEmail(request(), entries, { to: ["equipe@eventhemes.ma"] });
  assert.match(team.subject, /^Demande de devis · EVT-2026-0050 · Gala & cérémonie/);
  assert.ok(team.text.includes("Langue : Anglais"), "the team knows to answer in English");
  assert.ok(!teamEmail(request({ locale: "fr" }), entries, { to: [] }).text.includes("Langue :"));
});
