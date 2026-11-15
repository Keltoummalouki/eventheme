import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, test } from "node:test";

/**
 * Demandes publiques de bout en bout, côté serveur : formulaire de rappel,
 * devis, message, pièces jointes. Données et aperçus d’e-mails dans un
 * dossier temporaire ; les e-mails partent dans une file vérifiée par le test.
 */
const directory = mkdtempSync(path.join(tmpdir(), "eventhemes-submit-"));
let submitInquiry: typeof import("../src/lib/eventheme/submit").submitInquiry;
let uploadRoute: typeof import("../src/app/api/inquiries/attachments/route").POST;
let server: typeof import("../src/lib/eventheme/server");

before(async () => {
  process.env.EVENTHEME_DATA_DIR = directory;
  ({ submitInquiry } = await import("../src/lib/eventheme/submit"));
  ({ POST: uploadRoute } = await import("../src/app/api/inquiries/attachments/route"));
  server = await import("../src/lib/eventheme/server");
});

const origin = "http://localhost:3000";
let phoneCounter = 0;
const uniquePhone = () => `+212 6${String(10000000 + ++phoneCounter).slice(-8)}`;
const request = (body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${origin}/api/inquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, ...headers },
    body: JSON.stringify(body),
  });
const callback = (over: Record<string, unknown> = {}) => ({
  kind: "callback",
  name: "Client Test",
  company: "",
  phone: uniquePhone(),
  email: "client.test@example.com",
  event: "gala",
  consent: true,
  website: "",
  startedAt: Date.now() - 5000,
  contactMethod: "WhatsApp",
  basket: { services: [], products: [] },
  guests: 0,
  ...over,
});
const quoteFor = (lead: { id: string; token: string }, phone: string) => ({
  ...callback({ phone }),
  kind: "quote",
  date: "2099-06-12",
  city: "Marrakech",
  rentalDays: 2,
  guests: 120,
  basket: { services: ["sonorisation"], products: [{ id: "truss", variant: "Longueur 2 m", quantity: 4 }] },
  attachments: 1,
  callbackId: lead.id,
  token: lead.token,
});
/** File des tâches lancées après la réponse (Next : `after`). */
const queue = () => {
  const tasks: (() => Promise<void>)[] = [];
  return { tasks, schedule: (task: () => Promise<void>) => void tasks.push(task) };
};
const json = async (response: Response) => ({ status: response.status, body: await response.json() });

test("a request from another site is refused, in the visitor's language", async () => {
  const { schedule } = queue();
  const without = (locale?: string) => {
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(locale ? { "X-Locale": locale } : {}) };
    return new Request(`${origin}/api/inquiries`, { method: "POST", headers, body: JSON.stringify(callback()) });
  };
  assert.deepEqual(await json(await submitInquiry(without(), schedule)), { status: 400, body: { error: "Origine non autorisée." } });
  assert.equal((await json(await submitInquiry(without("en"), schedule))).body.error, "Origin not allowed.");
  assert.equal((await json(await submitInquiry(without("ar"), schedule))).body.error, "مصدر غير مسموح به.");
});

test("an invalid form is refused with a translated message", async () => {
  const { schedule, tasks } = queue();
  const answer = await json(await submitInquiry(request(callback({ event: "" }), { "X-Locale": "en" }), schedule));
  assert.deepEqual(answer, { status: 400, body: { error: "Choose the type of your event." } });
  assert.equal(tasks.length, 0, "nothing to notify");
});

test("a callback is recorded with a reference and a token, then notified once", async () => {
  const { schedule, tasks } = queue();
  const answer = await json(await submitInquiry(request(callback(), { "X-Locale": "ar" }), schedule));
  assert.equal(answer.status, 201);
  assert.match(answer.body.id, /^[a-f0-9-]{36}$/);
  assert.match(answer.body.reference, /^EVT-\d{4}-\d{4}$/);
  assert.match(answer.body.token, /^[a-f0-9]{64}$/);
  assert.equal(answer.body.local, true);
  assert.equal(answer.body.emailed, false, "no provider: nothing promised to the client");
  assert.equal(tasks.length, 1);
  assert.equal((await server.getInquiry(answer.body.id))?.locale, "ar", "the request remembers its language");
  await Promise.all(tasks.map((task) => task()));
  const previews = readdirSync(path.join(directory, "emails")).filter((name) => name.includes(answer.body.id));
  assert.equal(previews.length, 2, "team alert and client acknowledgement");
});

test("the quote completes the callback; a retry is neither duplicated nor notified again", async () => {
  const phone = uniquePhone();
  const { schedule, tasks } = queue();
  const lead = (await json(await submitInquiry(request(callback({ phone })), schedule))).body;
  const first = await json(await submitInquiry(request(quoteFor(lead, phone)), schedule));
  assert.equal(first.status, 201);
  assert.equal(first.body.reference, lead.reference, "the callback's reference is kept");
  assert.equal(first.body.hasUnpriced, true);
  assert.ok(Array.isArray(first.body.summary));
  assert.equal(tasks.length, 2);
  const retry = await json(await submitInquiry(request(quoteFor(lead, phone)), schedule));
  assert.equal(retry.status, 201);
  assert.equal(retry.body.reference, lead.reference);
  assert.equal(tasks.length, 2, "no second notification");
  const stored = await server.getInquiries();
  assert.equal(stored.filter((item) => item.reference === lead.reference).length, 1, "one request, not two");
});

test("a malformed callback reference is refused", async () => {
  const phone = uniquePhone();
  const { schedule } = queue();
  const answer = await json(await submitInquiry(request(quoteFor({ id: "123", token: "x" }, phone)), schedule));
  assert.deepEqual(answer, { status: 400, body: { error: "Référence de demande invalide." } });
  const contact = await json(
    await submitInquiry(request({ ...callback({ phone }), kind: "contact", message: "Bonjour", callbackId: "x".repeat(36) }), schedule),
  );
  assert.equal(contact.body.error, "Référence de demande invalide.", "only a quote completes a callback");
});

test("one phone number, or one network address, cannot submit endlessly", async () => {
  const phone = uniquePhone();
  const { schedule } = queue();
  for (let attempt = 0; attempt < 5; attempt++)
    assert.equal((await submitInquiry(request(callback({ phone })), schedule)).status, 201);
  const blocked = await json(await submitInquiry(request(callback({ phone }), { "X-Locale": "en" }), schedule));
  assert.deepEqual(blocked, { status: 400, body: { error: "Too many attempts. Please try again in fifteen minutes." } });
  const address = { "x-forwarded-for": "203.0.113.50" };
  for (let attempt = 0; attempt < 20; attempt++)
    assert.equal((await submitInquiry(request(callback(), address), schedule)).status, 201);
  assert.equal((await submitInquiry(request(callback(), address), schedule)).status, 400);
});

test("online requests stay closed in production until Supabase is configured", async () => {
  const env = process.env as Record<string, string | undefined>;
  const before = env.NODE_ENV;
  env.NODE_ENV = "production";
  try {
    const answer = await json(await submitInquiry(request(callback(), { "X-Locale": "en" }), queue().schedule));
    assert.deepEqual(answer, { status: 503, body: { error: "Online requests will be available soon. Contact us on WhatsApp." } });
  } finally {
    if (before === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = before;
  }
});

/* --- Pièces jointes -------------------------------------------------------- */

const pdf = new TextEncoder().encode("%PDF-1.4\n% plan\n");
const upload = (lead: { id: string; token: string }, body: BodyInit | null, headers: Record<string, string> = {}) =>
  new Request(`${origin}/api/inquiries/attachments`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/pdf",
      "X-Request-Id": lead.id,
      "X-Request-Token": lead.token,
      "X-File-Name": encodeURIComponent("Plan du lieu.pdf"),
      ...headers,
    },
    body,
  });

test("attachments: right request, right token, real documents, three at most", async () => {
  const lead = (await json(await submitInquiry(request(callback()), queue().schedule))).body as { id: string; token: string };
  const answer = async (...args: Parameters<typeof upload>) => json(await uploadRoute(upload(...args)));
  assert.deepEqual(await answer({ ...lead, id: "x" }, pdf, { "X-Locale": "ar" }), { status: 400, body: { error: "مرجع الطلب غير صالح." } });
  assert.match((await answer({ ...lead, token: "0".repeat(64) }, pdf)).body.error, /session de personnalisation a expiré/);
  assert.equal((await answer(lead, new Uint8Array())).body.error, "Fichier vide.");
  assert.equal(
    (await answer(lead, new TextEncoder().encode("MZ not a document"))).body.error,
    "Format non reconnu : envoyez un PDF, un JPG, un PNG ou un WebP.",
  );
  assert.equal((await answer(lead, new Uint8Array(4 * 1024 * 1024 + 1))).body.error, "Fichier trop lourd : 4 Mo au plus.");
  const sent = await answer(lead, pdf);
  assert.equal(sent.status, 201);
  assert.equal(sent.body.attachment.name, "Plan du lieu.pdf");
  assert.equal(sent.body.attachment.type, "application/pdf");
  await answer(lead, pdf);
  await answer(lead, pdf);
  assert.equal((await answer(lead, pdf, { "X-Locale": "en" })).body.error, "3 attachments at most per request.");
  assert.ok(existsSync(path.join(directory, "attachments", lead.id)));
  const foreign = new Request(`${origin}/api/inquiries/attachments`, { method: "POST", body: pdf });
  assert.equal((await json(await uploadRoute(foreign))).body.error, "Origine non autorisée.");
});
