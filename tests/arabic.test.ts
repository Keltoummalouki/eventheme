import assert from "node:assert/strict";
import { test } from "node:test";
import { ar } from "../src/data/locales/ar";
import { translateServerError } from "../src/data/locales/errors";
import { fr } from "../src/data/locales/fr";
import { contactMethodLabel, dictionaries, projectCategoryLabel } from "../src/data/locales";
import { seed } from "../src/data/eventheme";
import { formText, formTextAr } from "../src/data/ui";
import { formatLongDate } from "../src/lib/dates";
import { clientEmail, teamEmail } from "../src/lib/eventheme/emails";
import { estimate } from "../src/lib/eventheme/pricing";
import { attachmentHint, sizeLabel } from "../src/lib/eventheme/requests";
import { localizeEntries, localizeEntry } from "../src/lib/eventheme/translations";
import {
  centimetres,
  daysLabel,
  followersLabel,
  hoursLabel,
  lineAmount,
  money,
  participantsLabel,
  priceLabel,
  translatableFields,
  type Entry,
  type Inquiry,
} from "../src/lib/eventheme/types";
import { validateEntry } from "../src/lib/eventheme/validation";
import { quoteMessage } from "../src/lib/eventheme/whatsapp";
import {
  alternatesFor,
  direction,
  intlLocale,
  isRtl,
  isolate,
  logicalArrow,
  ogLocale,
  pathFor,
  plural,
  routeOf,
  translatePath,
} from "../src/lib/i18n";

/* --- Dictionnaire ------------------------------------------------------------ */

const placeholders = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();
/** Formes arabes où le nombre est sous-entendu (« مشارك واحد » : un participant). */
const impliedCount = new Set(["dictionary.format.participant", "dictionary.format.day"]);

function compare(reference: unknown, translation: unknown, path: string) {
  if (typeof reference === "string") {
    assert.equal(typeof translation, "string", path);
    const text = translation as string;
    assert.notEqual(text.trim(), "", `${path} is empty`);
    const expected = placeholders(reference);
    const actual = placeholders(text);
    for (const name of actual) assert.ok(expected.includes(name), `${path}: unknown placeholder {${name}}`);
    if (!impliedCount.has(path)) assert.deepEqual(actual, expected, `${path}: placeholders differ`);
    // Variantes de pluriel : chaque catégorie est une catégorie Intl connue.
    if (text.includes("|"))
      for (const part of text.split("|"))
        assert.match(part, /^(zero|one|two|few|many|other):/, `${path}: plural variant without category`);
    return;
  }
  if (Array.isArray(reference)) {
    assert.ok(Array.isArray(translation), path);
    assert.equal((translation as unknown[]).length, reference.length, `${path}: list length differs`);
    reference.forEach((item, index) => compare(item, (translation as unknown[])[index], `${path}[${index}]`));
    return;
  }
  const keys = Object.keys(reference as object).sort();
  assert.deepEqual(Object.keys(translation as object).sort(), keys, `${path}: keys differ`);
  for (const key of keys) compare((reference as Record<string, unknown>)[key], (translation as Record<string, unknown>)[key], `${path}.${key}`);
}

test("the Arabic dictionary has every French key, list length and placeholder", () => {
  compare(fr, ar, "dictionary");
  assert.equal(dictionaries.ar, ar);
});

test("Arabic texts are written in Arabic, with arrows pointing the right-to-left way", () => {
  assert.match(ar.nav.home, /[؀-ۿ]/);
  assert.equal(ar.languageShort, "عربي");
  // « Retour » pointe vers la droite, « suite » vers la gauche.
  assert.ok(ar.detail.backEquipment.startsWith("→"));
  assert.ok(ar.configurator.previous.startsWith("→"));
  assert.ok(ar.nav.viewQuote.endsWith("←"));
  assert.ok(ar.error.home.endsWith("←"));
  assert.equal(ar.quote.nameSeparator, "، ");
  assert.equal(projectCategoryLabel("ar", "Concerts"), "الحفلات الموسيقية");
  assert.equal(contactMethodLabel("ar", "WhatsApp"), "واتساب");
});

/* --- Sens d’écriture et adresses --------------------------------------------- */

test("Arabic is written right to left, under /ar, with English addresses", () => {
  assert.equal(direction("ar"), "rtl");
  assert.equal(direction("fr"), "ltr");
  assert.equal(isRtl("ar"), true);
  assert.equal(isRtl("en"), false);
  assert.equal(intlLocale.ar, "ar-MA");
  assert.equal(ogLocale.ar, "ar_AR");
  assert.equal(pathFor("ar", "home"), "/ar");
  assert.equal(pathFor("ar", "equipment", "truss"), "/ar/equipment/truss");
  assert.deepEqual(routeOf("/ar/cities/fes"), { locale: "ar", key: "cities", id: "fes" });
  assert.equal(translatePath("/ar/quote", "fr"), "/devis");
  assert.equal(translatePath("/materiel/truss", "ar"), "/ar/equipment/truss");
  assert.deepEqual(alternatesFor("about"), { fr: "/a-propos", en: "/en/about", ar: "/ar/about" });
});

test("a phone number or an e-mail keeps its order inside an Arabic sentence", () => {
  assert.equal(isolate("+212 6 61 23 45 67"), "⁦+212 6 61 23 45 67⁩");
});

test("left and right arrow keys swap in a right-to-left grid", () => {
  const style = globalThis.getComputedStyle;
  globalThis.getComputedStyle = ((element: { dir: string }) => ({ direction: element.dir })) as unknown as typeof getComputedStyle;
  try {
    const rtl = { dir: "rtl" } as unknown as Element;
    const ltr = { dir: "ltr" } as unknown as Element;
    assert.equal(logicalArrow("ArrowLeft", rtl), "ArrowRight");
    assert.equal(logicalArrow("ArrowRight", rtl), "ArrowLeft");
    assert.equal(logicalArrow("ArrowLeft", ltr), "ArrowLeft");
    assert.equal(logicalArrow("ArrowUp", rtl), "ArrowUp");
    assert.equal(logicalArrow("ArrowRight", null), "ArrowRight");
  } finally {
    globalThis.getComputedStyle = style;
  }
});

/* --- Pluriels et formats ---------------------------------------------------- */

test("Arabic nouns agree with the number (one, two, a few, many, hundreds)", () => {
  assert.equal(participantsLabel(1, "ar"), "مشارك واحد");
  assert.equal(participantsLabel(2, "ar"), "مشاركان");
  assert.equal(participantsLabel(5, "ar"), "5 مشاركين");
  assert.equal(participantsLabel(11, "ar"), "11 مشاركًا");
  assert.equal(participantsLabel(100, "ar"), "100 مشارك");
  assert.equal(participantsLabel(0, "ar"), ar.format.participantsUnknown);
  assert.equal(daysLabel(1, "ar"), "يوم واحد");
  assert.equal(daysLabel(2, "ar"), "يومان");
  assert.equal(daysLabel(3, "ar"), "3 أيام");
  assert.equal(daysLabel(15, "ar"), "15 يومًا");
  assert.equal(followersLabel(1, "ar"), "متابع واحد");
  assert.equal(followersLabel(2, "ar"), "متابعان");
  // Français et anglais : libellés simples, inchangés par `plural`.
  assert.equal(plural("{count} jours", 3, "fr"), "{count} jours");
  assert.equal(daysLabel(3, "en"), "3 days");
  // Catégorie absente : la forme « other ».
  assert.equal(plural("one:a|other:b", 5, "ar"), "b");
  assert.equal(plural("one:a", 5, "ar"), "one:a");
});

test("Arabic amounts, dates and sizes use Moroccan conventions and Latin digits", () => {
  const amount = money(12000, "ar");
  assert.match(amount, /12\.000/);
  assert.doesNotMatch(amount, /[٠-٩]/, "no Arabic-Indic digits in Morocco");
  assert.equal(priceLabel({ id: "x", kind: "services", title: "", description: "", published: true, price: null }, "ar"), "حسب الطلب");
  assert.match(lineAmount({ kind: "products", label: "", quantity: 1, amount: 500, from: true }, "ar"), /^من /);
  assert.match(formatLongDate(new Date(2099, 5, 12), intlLocale.ar), /يونيو/);
  assert.match(hoursLabel(1.5, "ar"), /^1[,.]5 س$/);
  assert.match(centimetres(100, "ar"), /^100 cm$/);
  assert.equal(sizeLabel(4 * 1024 * 1024, "ar"), "4 ميغابايت");
  assert.match(attachmentHint("ar"), /3 ملفات كحد أقصى/);
  const { lines } = estimate(
    [{ id: "truss", kind: "products", title: "تراس", description: "", published: true, price: 100, pricing: "daily" }],
    { event: "", rentalDays: 3 },
    { services: [], products: [{ id: "truss", variant: "", quantity: 2 }] },
    "ar",
  );
  assert.equal(lines[0].label, "تراس · الكمية 2 × عدد الأيام 3");
});

test("the WhatsApp message and server errors are written in Arabic", () => {
  const message = quoteMessage(
    { event: "حفل", date: "2099-06-12", city: "Rabat", services: [], name: "Salma", phone: "+212600000000", email: "", reference: "EVT-2099-0001" },
    "ar",
  );
  assert.match(message, /^مرحبًا EVENTHEMES، أود طلب عرض سعر/);
  assert.match(message, /مرجع طلبي: EVT-2099-0001\.$/);
  assert.equal(translateServerError("Demande introuvable.", "ar"), "الطلب غير موجود.");
  assert.equal(translateServerError("Indiquez un nombre de participants entre 1 et 100 000.", "ar"), "أدخلوا عدد مشاركين بين 1 و100.000.");
  assert.equal(translateServerError("La durée de l’événement ne peut dépasser 72 heures.", "ar"), "لا يمكن أن تتجاوز مدة الفعالية 72 ساعة.");
  assert.equal(translateServerError("Indiquez entre 1 et 60 jours de location.", "ar"), "أدخلوا عدد أيام كراء بين 1 و60.");
  assert.equal(translateServerError("3 pièces jointes au plus par demande.", "ar"), "3 مرفقات كحد أقصى لكل طلب.");
  assert.equal(translateServerError("Fichier trop lourd : 4 Mo au plus.", "ar"), "الملف كبير جدًا: 4 ميغابايت كحد أقصى.");
  assert.equal(translateServerError("Message inattendu.", "ar"), "Message inattendu.");
});

test("form controls have Arabic labels for every French one", () => {
  assert.deepEqual(Object.keys(formTextAr).sort(), Object.keys(formText).sort());
  for (const [key, value] of Object.entries(formTextAr)) assert.match(value, /[؀-ۿ]/, key);
});

/* --- Contenus ---------------------------------------------------------------- */

test("every starter entry with text has an Arabic draft, limited to translatable fields", () => {
  for (const entry of seed) {
    if (entry.kind === "settings" || (entry.kind === "socials" && entry.network !== "whatsapp")) continue;
    const arabic = entry.translations?.ar;
    assert.ok(arabic && Object.keys(arabic).length, `${entry.id} has no Arabic version`);
    for (const field of Object.keys(arabic)) assert.ok((translatableFields as readonly string[]).includes(field), `${entry.id}.${field}`);
    assert.doesNotThrow(() => validateEntry(entry), entry.id);
  }
  const truss = localizeEntry(seed.find((entry) => entry.id === "truss")!, "ar");
  assert.equal(truss.title, "هيكل تراس من الألومنيوم");
  assert.deepEqual(truss.variants?.map((variant) => variant.label), ["طول 1 م", "طول 2 م", "طول 3 م"]);
  assert.equal(localizeEntries(seed, "ar").find((entry) => entry.id === "home")?.title, "We engineer\nthe experience.");
});

test("the admin keeps an Arabic version next to the English one", () => {
  const saved = validateEntry({
    id: "x",
    kind: "services",
    title: "Son",
    description: "",
    published: true,
    translations: { en: { title: " Sound " }, ar: { title: " الصوت ", description: "" }, de: { title: "Ton" } },
  });
  assert.deepEqual(saved.translations, { en: { title: "Sound" }, ar: { title: "الصوت" } }, "unknown languages are dropped");
});

/* --- E-mails ------------------------------------------------------------------- */

const entries: Entry[] = [
  { id: "gala", kind: "events", title: "Gala & cérémonie", description: "", published: true, translations: { ar: { title: "حفل رسمي ومراسم" } } },
];
const inquiry: Inquiry = {
  id: "4f1c2d3e-0000-4000-8000-0000000000aa",
  reference: "EVT-2026-0099",
  kind: "callback",
  name: "Salma Bennani",
  email: "salma@example.com",
  phone: "+212 6 61 23 45 67",
  company: "",
  city: "Rabat",
  address: "",
  message: "",
  subject: "",
  event: "gala",
  date: "2099-06-12",
  duration: 0,
  rentalDays: 1,
  guests: 0,
  budget: 0,
  contactMethod: "Téléphone",
  consent: true,
  website: "",
  startedAt: 0,
  basket: { services: [], products: [] },
  createdAt: "2026-11-15T10:00:00.000Z",
  status: "Nouveau",
  notes: "",
  estimate: 0,
  hasUnpriced: false,
  summary: [],
  locale: "ar",
};

test("a visitor from the Arabic site receives a right-to-left acknowledgement in Arabic", () => {
  const mail = clientEmail(inquiry, entries, { whatsappUrl: "https://wa.me/212600000000" })!;
  assert.equal(mail.subject, "استلمنا طلبكم · EVT-2026-0099");
  assert.match(mail.html, /<html lang="ar" dir="rtl">/);
  assert.match(mail.html, /<table role="presentation" width="600" cellpadding="0" cellspacing="0" dir="rtl"/);
  assert.match(mail.html, /direction:rtl;text-align:right;padding:10px 0 10px 12px/);
  for (const fragment of ["مرحبًا Salma،", "عبر الهاتف", "حفل رسمي ومراسم", "راسلونا على واتساب"]) assert.ok(mail.html.includes(fragment), fragment);
  assert.match(mail.text, /^الفعالية: حفل رسمي ومراسم$/m);
  const team = teamEmail(inquiry, entries, { to: ["equipe@eventhemes.ma"] });
  assert.match(team.subject, /^Rappel demandé · EVT-2026-0099 · Gala & cérémonie/);
  assert.ok(team.text.includes("Langue : Arabe : répondre en arabe"));
  assert.match(team.html, /<html lang="fr" dir="ltr">/);
});
