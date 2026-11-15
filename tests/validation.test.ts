import assert from "node:assert/strict";
import { test } from "node:test";
import {
  centimetres,
  findSocial,
  followersLabel,
  hoursLabel,
  kinds,
  labels,
  lineAmount,
  lineLabel,
  money,
  normalizeStatus,
  priceLabel,
  referenceOf,
  socialNetworkOf,
  statuses,
  type Entry,
  type InquiryInput,
} from "../src/lib/eventheme/types";
import { safeUrl, validateEntry, validateInquiry } from "../src/lib/eventheme/validation";

/* --- Formats ----------------------------------------------------------------- */

const entry = (over: Partial<Entry> = {}): Entry => ({ id: "x", kind: "products", title: "Lyre", description: "", published: true, ...over });

test("prices read « on request », fixed, « from » or per day, in each language", () => {
  assert.equal(priceLabel(entry({ price: null }), "fr"), "Sur devis");
  assert.equal(priceLabel(entry({ price: 900, pricing: "request" }), "en"), "On request");
  assert.equal(priceLabel(entry({ price: 900, pricing: "fixed" })), money(900));
  assert.equal(priceLabel(entry({ price: 900, pricing: "from" })), `À partir de ${money(900)}`);
  assert.equal(priceLabel(entry({ price: 900, pricing: "daily" }), "en"), `${money(900, "en")} / day`);
  assert.equal(priceLabel(entry({ price: 900 })), money(900), "no pricing mode: a fixed price");
});

test("estimate lines name the event type and show « from » amounts", () => {
  assert.equal(lineLabel({ kind: "events", label: "Gala", quantity: 1, amount: null, from: false }), "Type d’événement — Gala");
  assert.equal(lineLabel({ kind: "products", label: "Lyre", quantity: 2, amount: 10, from: false }, "en"), "Lyre");
  assert.equal(lineAmount({ kind: "products", label: "", quantity: 1, amount: null, from: false }, "en"), "On request");
  assert.equal(lineAmount({ kind: "products", label: "", quantity: 1, amount: 500, from: true }), `Dès ${money(500)}`);
  assert.equal(lineAmount({ kind: "products", label: "", quantity: 1, amount: 500, from: false }, "en"), money(500, "en"));
});

test("lengths, durations and audiences are formatted for the reader", () => {
  assert.equal(centimetres(1234.5, "en"), "1,234.5 cm");
  assert.equal(hoursLabel(6, "fr"), "6 h");
  assert.equal(hoursLabel(1.25, "en"), "1.3 h");
  const compact = (locale: string) => new Intl.NumberFormat(locale, { notation: "compact" }).format(12500);
  assert.equal(followersLabel(12500, "en"), `${compact("en-GB")} followers`);
  assert.equal(followersLabel(12500, "fr"), `${compact("fr-FR")} abonnés`);
});

test("former request statuses map to the specified ones", () => {
  for (const status of statuses) assert.equal(normalizeStatus(status), status);
  assert.equal(normalizeStatus("Nouvelle demande"), "Nouveau");
  assert.equal(normalizeStatus("Confirmé"), "Accepté");
  assert.equal(normalizeStatus("Annulé"), "Refusé");
  assert.equal(normalizeStatus("Inconnu"), "Nouveau");
  assert.equal(referenceOf({ id: "abcdef12-0000", reference: "" }), "ABCDEF12");
  assert.deepEqual(Object.keys(labels).sort(), [...kinds].sort(), "every kind has an admin label");
});

test("contact links are recognised by network, including older entries named after their network", () => {
  const instagram = entry({ id: "instagram", kind: "socials", title: "Instagram", url: "https://instagram.com/x" });
  const whatsapp = entry({ id: "random", kind: "socials", title: "WA", network: "whatsapp", url: "https://wa.me/1" });
  assert.equal(socialNetworkOf(instagram), "instagram");
  assert.equal(socialNetworkOf(whatsapp), "whatsapp");
  assert.equal(socialNetworkOf(entry({ id: "unknown", kind: "socials" })), undefined);
  assert.equal(findSocial([instagram, whatsapp], "whatsapp"), whatsapp);
  assert.equal(findSocial([instagram], "email"), undefined);
});

/* --- Demandes publiques ---------------------------------------------------- */

const catalogue: Entry[] = [
  entry({ id: "gala", kind: "events", title: "Gala" }),
  entry({ id: "son", kind: "services", title: "Son" }),
  entry({ id: "lyre", kind: "products", title: "Lyre" }),
  entry({ id: "truss", kind: "products", title: "Truss", variants: [{ name: "1 m", price: null }] }),
  entry({ id: "out", kind: "products", title: "Rupture", available: false }),
];
const base = (over: Record<string, unknown> = {}) =>
  ({
    kind: "contact",
    name: "Amina",
    email: "amina@example.ma",
    phone: "+212 600 000 000",
    message: "Bonjour",
    consent: true,
    website: "",
    startedAt: Date.now() - 5000,
    basket: { services: [], products: [] },
    ...over,
  }) as unknown as InquiryInput;
const quote = (over: Record<string, unknown> = {}) =>
  base({ kind: "quote", message: "", event: "gala", city: "Rabat", date: "2099-06-12", ...over });
const refuses = (value: unknown, message: string | RegExp) =>
  assert.throws(() => validateInquiry(value, catalogue), { message });

test("only a real, consented, human submission is accepted", () => {
  refuses(null, "Demande invalide.");
  refuses("text", "Demande invalide.");
  const human = "Veuillez vérifier le formulaire et le consentement.";
  refuses(base({ kind: "order" }), human);
  refuses(base({ consent: false }), human);
  refuses(base({ website: "https://spam.example" }), human);
  refuses(base({ startedAt: Number.NaN }), human);
  refuses(base({ startedAt: Date.now() }), human);
});

test("names, e-mails and phone numbers are checked", () => {
  const identity = "Vérifiez votre nom, votre e-mail et votre téléphone.";
  refuses(base({ name: "  " }), identity);
  refuses(base({ email: "" }), identity);
  refuses(base({ email: "amina@" }), identity);
  refuses(base({ phone: "12" }), identity);
  refuses(base({ name: 42 }), "Un champ est invalide ou trop long.");
  refuses(base({ name: "x".repeat(251) }), "Un champ est invalide ou trop long.");
  refuses(base({ kind: "callback", email: "", contactMethod: "E-mail", event: "gala" }), "Ajoutez votre e-mail ou choisissez un contact par téléphone.");
  refuses(base({ kind: "callback", event: "inconnu" }), "Choisissez le type de votre événement.");
  refuses(base({ message: "" }), "Votre message est obligatoire.");
});

test("audience, budget, duration and rental days stay within bounds", () => {
  refuses(base({ guests: -1 }), /^Indiquez un nombre de participants entre 1 et 100\s000\.$/);
  refuses(base({ guests: 2.5 }), /participants/);
  refuses(base({ guests: 100001 }), /participants/);
  refuses(base({ budget: -5 }), "Budget estimatif invalide.");
  refuses(base({ budget: 2e9 }), "Budget estimatif invalide.");
  refuses(base({ duration: 100 }), "La durée de l’événement ne peut dépasser 72 heures.");
  refuses(base({ rentalDays: 61 }), "Indiquez entre 1 et 60 jours de location.");
  refuses(base({ rentalDays: 1.5 }), "Indiquez entre 1 et 60 jours de location.");
  const accepted = validateInquiry(base({ guests: "", budget: "12000.6", duration: "", rentalDays: 0 }), catalogue);
  assert.deepEqual([accepted.guests, accepted.budget, accepted.duration, accepted.rentalDays], [0, 12001, 0, 1]);
});

test("a quote needs a known event, an upcoming date and a Moroccan city", () => {
  const where = "Précisez une date à venir et la ville de l’événement.";
  refuses(quote({ city: "Paris" }), where);
  refuses(quote({ date: "2020-01-01" }), where);
  refuses(quote({ date: "2099-02-30" }), where);
  refuses(quote({ event: "inconnu" }), "Une option sélectionnée n’est plus disponible. Actualisez la page.");
});

test("the selection must be made of available services, products, variants and quantities", () => {
  refuses(quote({ basket: undefined }), "Sélection invalide.");
  refuses(quote({ basket: { services: "son", products: [] } }), "Sélection invalide.");
  refuses(quote({ basket: { services: Array(51).fill("son"), products: [] } }), "Sélection invalide.");
  refuses(quote({ basket: { services: ["inconnu"], products: [] } }), "Un service n’est plus disponible.");
  const products = "Vérifiez les produits, les variantes et les quantités.";
  for (const item of [
    { id: "inconnu", variant: "", quantity: 1 },
    { id: "out", variant: "", quantity: 1 },
    { id: "lyre", variant: "", quantity: 0 },
    { id: "lyre", variant: "", quantity: 1.5 },
    { id: "lyre", variant: "", quantity: 1001 },
    { id: "truss", variant: "2 m", quantity: 1 },
  ])
    refuses(quote({ basket: { services: [], products: [item] } }), products);
  const accepted = validateInquiry(
    quote({ basket: { services: ["son", "son"], products: [{ id: "truss", variant: "1 m", quantity: 2 }] } }),
    catalogue,
  );
  assert.deepEqual(accepted.basket, { services: ["son"], products: [{ id: "truss", variant: "1 m", quantity: 2 }] });
  assert.equal(accepted.message, "");
});

/* --- Contenus de l’administration -------------------------------------------- */

const content = (over: Record<string, unknown> = {}) => ({ id: "lyre", kind: "products", title: "Lyre", description: "", published: true, ...over });
const rejects = (over: Record<string, unknown>, message: string) => assert.throws(() => validateEntry(content(over)), { message });

test("content keeps only valid fields", () => {
  assert.throws(() => validateEntry(null), { message: "Contenu invalide." });
  rejects({ kind: "articles" }, "Type ou identifiant invalide.");
  rejects({ id: "../x" }, "Type ou identifiant invalide.");
  rejects({ title: " " }, "Le titre est obligatoire.");
  rejects({ subcategory: "../x" }, "Catégorie invalide.");
  rejects({ swatch: "red" }, "Teinte invalide.");
  rejects({ url: "javascript:alert(1)" }, "Utilisez une URL https, mailto ou tel valide.");
  rejects({ image: "//evil.example/x.jpg" }, "Utilisez une URL https, mailto ou tel valide.");
  rejects({ gallery: "x" }, "Galerie invalide.");
  rejects({ gallery: ["http://insecure.example/x.jpg"] }, "Galerie invalide.");
  rejects({ price: -1 }, "Les montants doivent être positifs.");
  rejects({ price: "12" }, "Les montants doivent être positifs.");
  rejects({ length: 0 }, "La longueur et la largeur doivent être supérieures à zéro.");
  rejects({ pricing: "monthly" }, "Mode de prix invalide.");
  rejects({ variants: "x" }, "Variantes invalides.");
  rejects({ variants: [{ name: " ", price: null }] }, "Variante invalide.");
  rejects({ variants: [{ name: "A", price: -2 }] }, "Variante invalide.");
  rejects({ variants: [{ name: "A", price: 1 }, { name: "A", price: 2 }] }, "Les noms des variantes doivent être uniques.");
  rejects({ kind: "socials", network: "myspace" }, "Réseau inconnu.");
  rejects({ kind: "socials", followers: -3 }, "Le nombre d’abonnés doit être un entier positif.");
});

test("valid content is normalised", () => {
  const saved = validateEntry(
    content({
      swatch: "#C9A24A",
      image: "/uploads/lyre.webp",
      url: "tel:+212600000000",
      gallery: ["https://example.com/a.jpg"],
      price: 900,
      pricing: "daily",
      length: 120,
      width: 40,
      brand: "  ",
      model: "Pro 200",
      variants: [{ name: " Noir ", price: null, length: 100 }],
      demo: "yes",
      available: false,
      published: "yes",
    }),
  );
  assert.equal(saved.swatch, "#c9a24a");
  assert.equal(saved.brand, undefined, "an empty brand is dropped");
  assert.equal(saved.model, "Pro 200");
  assert.deepEqual(saved.variants, [{ name: "Noir", price: null, length: 100, width: undefined }]);
  assert.equal(saved.demo, false, "only true marks demo content");
  assert.equal(saved.available, false);
  assert.equal(saved.published, false, "only true publishes");
  assert.equal(validateEntry(content({ kind: "categories", published: false })).published, true, "categories are always visible");
  assert.equal(validateEntry(content({ kind: "socials", network: "instagram", followers: 1200 })).followers, 1200);
  assert.ok(safeUrl("/uploads/x.webp", true));
  assert.ok(!safeUrl("/uploads/x.webp"));
  assert.ok(safeUrl("mailto:a@b.c"));
});
