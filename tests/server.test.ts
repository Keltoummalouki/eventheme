import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, test } from "node:test";
import type { Entry, Inquiry } from "../src/lib/eventheme/types";

/**
 * Données locales (développement) : contenus, demandes, pièces jointes,
 * limitation des tentatives. Chaque exécution travaille dans un dossier
 * temporaire, jamais dans .eventheme/.
 */
const directory = mkdtempSync(path.join(tmpdir(), "eventhemes-server-"));
let server: typeof import("../src/lib/eventheme/server");
let continuationHash: typeof import("../src/lib/eventheme/continuation").continuationHash;
let moroccanYear: typeof import("../src/lib/eventheme/requests").moroccanYear;

before(async () => {
  process.env.EVENTHEME_DATA_DIR = directory;
  server = await import("../src/lib/eventheme/server");
  ({ continuationHash } = await import("../src/lib/eventheme/continuation"));
  ({ moroccanYear } = await import("../src/lib/eventheme/requests"));
});

const inquiry = (over: Partial<Inquiry> = {}): Omit<Inquiry, "reference"> => ({
  id: randomUUID(),
  kind: "callback",
  name: "Test",
  email: "",
  phone: "+212600000000",
  company: "",
  city: "",
  address: "",
  message: "",
  subject: "",
  event: "gala",
  date: "",
  duration: 0,
  rentalDays: 1,
  guests: 0,
  budget: 0,
  contactMethod: "Téléphone",
  consent: true,
  website: "",
  startedAt: 0,
  basket: { services: [], products: [] },
  createdAt: new Date().toISOString(),
  status: "Nouveau",
  notes: "",
  estimate: 0,
  hasUnpriced: false,
  summary: [],
  ...over,
});

test("the local store starts from the starter content and hides drafts from visitors", async () => {
  assert.equal(server.localMode(), true);
  assert.equal(server.configured(), false);
  assert.equal(server.dataDirectory(), directory);
  const visible = await server.getEntries();
  const all = await server.getEntries(true);
  assert.ok(visible.every((entry) => entry.published));
  assert.ok(all.some((entry) => entry.kind === "cities" && !entry.published), "city drafts exist");
  assert.ok(!visible.some((entry) => entry.kind === "cities"), "but visitors don't see them");
});

test("content is saved, updated and deleted", async () => {
  const item: Entry = { id: "test-lyre", kind: "products", title: "Lyre test", description: "", published: true };
  await server.saveEntry(item);
  assert.equal((await server.getEntries()).find((entry) => entry.id === "test-lyre")?.title, "Lyre test");
  await server.saveEntry({ ...item, title: "Lyre modifiée" });
  assert.equal((await server.getEntries()).find((entry) => entry.id === "test-lyre")?.title, "Lyre modifiée");
  await server.deleteEntry("test-lyre");
  assert.equal((await server.getEntries(true)).some((entry) => entry.id === "test-lyre"), false);
});

test("requests get consecutive references, come back newest first, and older ones are normalised", async () => {
  const year = moroccanYear();
  const first = await server.createInquiry(inquiry({ createdAt: "2026-01-01T10:00:00.000Z" }));
  const second = await server.createInquiry(inquiry({ createdAt: "2026-01-02T10:00:00.000Z" }));
  assert.equal(first.reference, `EVT-${year}-0001`);
  assert.equal(second.reference, `EVT-${year}-0002`);
  const ids = (await server.getInquiries()).map((item) => item.id);
  assert.ok(ids.indexOf(second.id) < ids.indexOf(first.id), "newest first");
  // A request saved before the EVENTHEMES statuses, the budget and the language fields.
  const legacy = { ...first, status: "Confirmé", budget: undefined, locale: undefined } as unknown as Inquiry;
  await server.saveInquiry(legacy);
  const read = await server.getInquiry(first.id);
  assert.equal(read?.status, "Accepté");
  assert.equal(read?.budget, 0);
  assert.equal(read?.locale, "fr");
  assert.equal(await server.getInquiry(randomUUID()), undefined);
});

test("a quote completes its own callback once, with the receipt's token", async () => {
  const token = randomBytes(32).toString("hex");
  const callback = await server.createInquiry(inquiry({ continuationHash: continuationHash(token) }));
  await server.saveInquiry({ ...callback, status: "En cours de traitement", notes: "Rappeler à 18 h" });
  const expired = /session de personnalisation a expiré/;
  await assert.rejects(server.completeCallback(callback.id, randomBytes(32).toString("hex"), inquiry({ kind: "quote" })), expired);
  const quote = inquiry({ kind: "quote", city: "Rabat", date: "2099-06-12", estimate: 1200 });
  const done = await server.completeCallback(callback.id, token, quote);
  assert.equal(done.fresh, true);
  assert.equal(done.inquiry.kind, "quote");
  assert.equal(done.inquiry.id, callback.id);
  assert.equal(done.inquiry.reference, callback.reference, "the reference is kept");
  assert.equal(done.inquiry.createdAt, callback.createdAt);
  assert.equal(done.inquiry.status, "En cours de traitement", "the team's status is kept");
  assert.equal(done.inquiry.notes, "Rappeler à 18 h");
  assert.ok(done.inquiry.completedAt);
  const retry = await server.completeCallback(callback.id, token, quote);
  assert.equal(retry.fresh, false, "a retry is not a new request");
  assert.equal(retry.inquiry.completedAt, done.inquiry.completedAt);
  const contactToken = randomBytes(32).toString("hex");
  const contact = await server.createInquiry(inquiry({ kind: "contact", continuationHash: continuationHash(contactToken) }));
  await assert.rejects(server.completeCallback(contact.id, contactToken, quote), { message: "Demande invalide." });
});

test("attachments are stored privately, three at most, and downloaded by the team", async () => {
  const token = randomBytes(32).toString("hex");
  const request = await server.createInquiry(inquiry({ continuationHash: continuationHash(token) }));
  const file = (name: string) => ({ name, type: "application/pdf" as const, bytes: Buffer.from(`%PDF-1.4 ${name}`) });
  const saved = [];
  for (const name of ["a.pdf", "b.pdf", "c.pdf"]) saved.push(await server.addAttachment(request.id, token, file(name)));
  await assert.rejects(server.addAttachment(request.id, token, file("d.pdf")), { message: "3 pièces jointes au plus par demande." });
  await assert.rejects(server.addAttachment(request.id, "0".repeat(64), file("e.pdf")), /session de personnalisation a expiré/);
  const download = await server.attachmentDownload(request.id, saved[1].id);
  assert.equal(download.attachment.name, "b.pdf");
  assert.equal(download.bytes?.toString("utf8"), "%PDF-1.4 b.pdf");
  await assert.rejects(server.attachmentDownload(request.id, randomUUID()), { message: "Pièce jointe introuvable." });
  const folder = path.join(directory, "attachments", request.id);
  assert.ok(existsSync(folder));
  await server.deleteInquiry(request.id);
  assert.equal(existsSync(folder), false, "the files leave with their request");
  assert.equal(await server.getInquiry(request.id), undefined);
});

test("repeated attempts are limited", async () => {
  for (let attempt = 0; attempt < 5; attempt++) await server.rateLimit("test:limit");
  await assert.rejects(server.rateLimit("test:limit"), { message: "Trop de tentatives. Réessayez dans quinze minutes." });
  await server.rateLimit("test:other");
  await server.rateLimit("test:custom", 1);
  await assert.rejects(server.rateLimit("test:custom", 1), /Trop de tentatives/);
});
