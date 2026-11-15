import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, beforeEach, test } from "node:test";
import type { Attachment, Entry, Inquiry } from "../src/lib/eventheme/types";
import { fake } from "./fake-supabase";

/**
 * Mode production de server.ts (EVENTHEME_DATA_MODE=supabase) : chaque lecture
 * et écriture passe par Supabase, ici simulé en mémoire (tests/fake-supabase.ts).
 * On vérifie la logique du site : clés utilisées, ordre, normalisation,
 * références, pièces jointes privées, mises à jour sans écraser l’équipe,
 * limitation des tentatives, accès à l’administration, et propagation des erreurs.
 */
const env = process.env as Record<string, string | undefined>;
let server: typeof import("../src/lib/eventheme/server");
let continuationHash: typeof import("../src/lib/eventheme/continuation").continuationHash;
let attachmentPath: typeof import("../src/lib/eventheme/requests").attachmentPath;

before(async () => {
  Object.assign(env, {
    EVENTHEME_FAKE_SUPABASE: "1",
    EVENTHEME_DATA_DIR: mkdtempSync(path.join(tmpdir(), "eventhemes-supabase-")),
    EVENTHEME_DATA_MODE: "supabase",
    NEXT_PUBLIC_SUPABASE_URL: "https://fake.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    SUPABASE_SECRET_KEY: "secret-key",
  });
  server = await import("../src/lib/eventheme/server");
  ({ continuationHash } = await import("../src/lib/eventheme/continuation"));
  ({ attachmentPath } = await import("../src/lib/eventheme/requests"));
});
beforeEach(() => fake.reset());

const BUCKET = "eventheme-requests";
const STALE = "La demande vient d’être modifiée. Réessayez dans un instant.";
const CLOSED = "La base de données doit être configurée avant la mise en ligne.";

const entry = (id: string, published = true): Entry => ({ id, kind: "products", title: id, description: "", published });
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
const attachment = (name = "Plan du lieu.pdf"): Attachment => ({
  id: randomUUID(),
  name,
  type: "application/pdf",
  size: 10,
  uploadedAt: new Date().toISOString(),
});
const pdf = { name: "plan.pdf", type: "application/pdf" as const, bytes: Buffer.from("%PDF-1.4") };

/** Demande déjà enregistrée dans la base, avec son jeton de personnalisation. */
function stored(over: Partial<Inquiry> = {}) {
  const token = randomBytes(32).toString("hex");
  const row = { ...inquiry({ continuationHash: continuationHash(token), ...over }), reference: "EVT-2026-0001" } as Inquiry;
  fake.rows("inquiries").push({ id: row.id, created_at: ++fake.state.clock, data: JSON.parse(JSON.stringify(row)) });
  return { row, token };
}
const rowOf = (id: string) => fake.rows("inquiries").find((row) => row.id === id)!;
/** Modification faite par l’équipe pendant que le client envoie (statut, note). */
const editByTeam = (id: string, change: Partial<Inquiry>) => {
  const row = rowOf(id);
  row.data = { ...(row.data as Inquiry), ...change };
};
const filesOf = (id: string) => [...fake.state.objects.keys()].filter((key) => key.startsWith(`${BUCKET}/${id}/`));

test("the database is opened with the secret key, without keeping any session", async () => {
  await server.getEntries();
  assert.deepEqual(fake.state.clients[0], {
    url: "https://fake.supabase.co",
    key: "secret-key",
    options: { auth: { persistSession: false, autoRefreshToken: false } },
  });
  assert.equal(server.configured(), true);
  assert.equal(server.localMode(), false);
});

test("visitors read published content in creation order; drafts are for the team", async () => {
  fake.rows("content").push(
    { id: "b", created_at: 2, kind: "products", published: false, data: entry("b", false) },
    { id: "a", created_at: 1, kind: "products", published: true, data: entry("a") },
  );
  assert.deepEqual((await server.getEntries()).map((item) => item.id), ["a"]);
  assert.deepEqual((await server.getEntries(true)).map((item) => item.id), ["a", "b"]);
  fake.fail("content.select", "permission denied for table content");
  await assert.rejects(server.getEntries(), { message: "permission denied for table content" });
});

test("content is saved with its kind and publication state, updated in place, and deleted", async () => {
  await server.saveEntry(entry("lyre"));
  const [row] = fake.rows("content");
  assert.equal(row.kind, "products");
  assert.equal(row.published, true);
  assert.deepEqual(row.data, entry("lyre"));
  await server.saveEntry({ ...entry("lyre", false), title: "Lyre Beam" });
  assert.equal(fake.rows("content").length, 1, "an update, not a second row");
  assert.equal(fake.rows("content")[0].published, false, "the publication column follows the content");
  await server.deleteEntry("lyre");
  assert.equal(fake.rows("content").length, 0);
  fake.fail("content.upsert", "content_kind_check");
  await assert.rejects(server.saveEntry(entry("x")), { message: "content_kind_check" });
  fake.fail("content.delete", "permission denied");
  await assert.rejects(server.deleteEntry("x"), { message: "permission denied" });
});

test("requests come back newest first and normalised; one request is read by its id", async () => {
  const older = stored({ status: "Confirmé" as Inquiry["status"], budget: undefined });
  const newer = stored();
  const list = await server.getInquiries();
  assert.deepEqual(list.map((item) => item.id), [newer.row.id, older.row.id]);
  assert.equal(list[1].status, "Accepté", "former statuses are mapped when read");
  assert.equal(list[1].budget, 0);
  assert.equal(list[1].locale, "fr");
  assert.equal((await server.getInquiry(older.row.id))?.status, "Accepté");
  assert.equal(await server.getInquiry(randomUUID()), undefined);
  fake.fail("inquiries.select", "timeout");
  await assert.rejects(server.getInquiries(), { message: "timeout" });
  fake.fail("inquiries.select", "timeout");
  await assert.rejects(server.getInquiry(older.row.id), { message: "timeout" });
});

test("each new request takes the next number of the Postgres sequence", async () => {
  const first = await server.createInquiry(inquiry());
  const second = await server.createInquiry(inquiry());
  assert.match(String(first.reference), /^EVT-\d{4}-0001$/);
  assert.match(String(second.reference), /^EVT-\d{4}-0002$/);
  assert.deepEqual(rowOf(first.id).data, first, "saved with its reference");
  fake.fail("inquiries.insert", "duplicate key value");
  await assert.rejects(server.createInquiry(inquiry()), { message: "duplicate key value" });
});

test("without the sequence migration, the request is still saved, with a reference from its id", async () => {
  fake.state.sequenceMissing = true;
  const errors: string[] = [];
  const realError = console.error;
  console.error = (...args: unknown[]) => void errors.push(args.map(String).join(" "));
  try {
    const saved = await server.createInquiry(inquiry({ id: "4f1c2d3e-aaaa-4000-8000-000000000001" }));
    assert.equal(saved.reference, "EVT-4F1C2D3E");
    assert.ok(rowOf(saved.id), "the client's request is not lost");
  } finally {
    console.error = realError;
  }
  assert.match(errors.join("\n"), /appliquez les migrations Supabase/);
});

test("a request saved by the team is updated in place", async () => {
  const { row } = stored();
  await server.saveInquiry({ ...row, status: "Devis envoyé", notes: "Envoyé le 15/11" });
  assert.equal(fake.rows("inquiries").length, 1);
  assert.equal((rowOf(row.id).data as Inquiry).status, "Devis envoyé");
  fake.fail("inquiries.upsert", "permission denied");
  await assert.rejects(server.saveInquiry(row), { message: "permission denied" });
});

test("deleting a request removes its private files first, and never leaves files without a request", async () => {
  const { row } = stored();
  fake.put(BUCKET, `${row.id}/a.pdf`);
  fake.put(BUCKET, `${row.id}/b.jpg`);
  fake.put(BUCKET, "another-request/c.pdf");
  await server.deleteInquiry(row.id);
  assert.deepEqual(filesOf(row.id), []);
  assert.ok(fake.object(BUCKET, "another-request/c.pdf"), "other requests' files are untouched");
  assert.equal(fake.rows("inquiries").length, 0);

  const plain = stored();
  fake.state.calls = [];
  await server.deleteInquiry(plain.row.id);
  assert.ok(!fake.state.calls.includes("storage.remove"), "no files, nothing to remove");

  const kept = stored();
  fake.put(BUCKET, `${kept.row.id}/a.pdf`);
  fake.fail("storage.remove", "storage unavailable");
  await assert.rejects(server.deleteInquiry(kept.row.id), { message: "storage unavailable" });
  assert.ok(rowOf(kept.row.id), "the request stays while its files are still there");
  fake.fail("inquiries.delete", "permission denied");
  await assert.rejects(server.deleteInquiry(kept.row.id), { message: "permission denied" });
});

test("attachments: checked token, private storage, and the team's changes are kept", async () => {
  const { row, token } = stored();
  await assert.rejects(server.addAttachment(row.id, "0".repeat(64), pdf), /session de personnalisation a expiré/);
  await assert.rejects(server.addAttachment(randomUUID(), token, pdf), /session de personnalisation a expiré/);
  assert.equal(fake.state.objects.size, 0, "nothing stored without the right token");

  const first = await server.addAttachment(row.id, token, pdf);
  assert.equal(fake.object(BUCKET, attachmentPath(row.id, first))?.contentType, "application/pdf");
  assert.deepEqual((await server.getInquiry(row.id))?.attachments, [first]);

  // The team changes the status while the client uploads a photo: both changes survive.
  let once = true;
  fake.state.beforeUpdate = () => {
    if (once) editByTeam(row.id, { status: "En cours de traitement" });
    once = false;
  };
  const second = await server.addAttachment(row.id, token, { ...pdf, name: "photo.jpg", type: "image/jpeg" });
  const after = await server.getInquiry(row.id);
  assert.equal(after?.status, "En cours de traitement");
  assert.deepEqual(after?.attachments?.map((item) => item.id), [first.id, second.id]);
});

test("attachments: three at most, failed uploads and updates leave no orphan file", async () => {
  const full = stored({ attachments: [attachment(), attachment(), attachment()] });
  await assert.rejects(server.addAttachment(full.row.id, full.token, pdf), { message: "3 pièces jointes au plus par demande." });

  const { row, token } = stored();
  fake.fail("storage.upload", "Bucket not found");
  await assert.rejects(server.addAttachment(row.id, token, pdf), { message: "Bucket not found" });
  assert.equal((await server.getInquiry(row.id))?.attachments, undefined);

  fake.state.beforeUpdate = () => editByTeam(row.id, { notes: randomUUID() });
  await assert.rejects(server.addAttachment(row.id, token, pdf), { message: STALE });
  assert.deepEqual(filesOf(row.id), [], "after three conflicting attempts, the uploaded file is removed");
  fake.state.beforeUpdate = undefined;

  fake.fail("inquiries.update", "update refused");
  await assert.rejects(server.addAttachment(row.id, token, pdf), { message: "update refused" });
  assert.deepEqual(filesOf(row.id), []);

  fake.fail("inquiries.select", "read failed");
  await assert.rejects(server.addAttachment(row.id, token, pdf), { message: "read failed" });
});

test("the team downloads an attachment through a one-minute signed link", async () => {
  const file = attachment();
  const { row } = stored({ attachments: [file] });
  const target = attachmentPath(row.id, file);
  fake.put(BUCKET, target);
  const download = await server.attachmentDownload(row.id, file.id);
  assert.ok("url" in download);
  assert.equal(download.url, `https://fake.supabase.co/storage/v1/object/sign/${BUCKET}/${target}?expires=60&download=Plan%20du%20lieu.pdf`);
  assert.deepEqual(download.attachment, file);
  await assert.rejects(server.attachmentDownload(row.id, randomUUID()), { message: "Pièce jointe introuvable." });
  await assert.rejects(server.attachmentDownload(randomUUID(), file.id), { message: "Pièce jointe introuvable." });
  fake.fail("storage.sign", "Object not found");
  await assert.rejects(server.attachmentDownload(row.id, file.id), { message: "Object not found" });
});

test("a quote completes its callback in place; a retry is recognised and not counted twice", async () => {
  const { row, token } = stored({ status: "En cours de traitement", notes: "Rappeler à 18 h" });
  const quote = inquiry({ kind: "quote", city: "Rabat", date: "2099-06-12", estimate: 1200 });
  const done = await server.completeCallback(row.id, token, quote);
  assert.equal(done.fresh, true);
  assert.equal(done.inquiry.id, row.id);
  assert.equal(done.inquiry.reference, row.reference);
  assert.equal(done.inquiry.createdAt, row.createdAt);
  assert.equal(done.inquiry.status, "En cours de traitement");
  assert.equal(done.inquiry.notes, "Rappeler à 18 h");
  assert.equal((rowOf(row.id).data as Inquiry).kind, "quote");
  const retry = await server.completeCallback(row.id, token, quote);
  assert.equal(retry.fresh, false);
  assert.equal(retry.inquiry.completedAt, done.inquiry.completedAt);
  assert.equal(fake.rows("inquiries").length, 1);
});

test("completion survives one concurrent change, gives up after three, and only completes callbacks", async () => {
  const quote = inquiry({ kind: "quote", city: "Rabat", date: "2099-06-12" });
  const first = stored();
  let once = true;
  fake.state.beforeUpdate = () => {
    if (once) editByTeam(first.row.id, { status: "En cours de traitement" });
    once = false;
  };
  assert.equal((await server.completeCallback(first.row.id, first.token, quote)).inquiry.status, "En cours de traitement");

  const busy = stored();
  fake.state.beforeUpdate = () => editByTeam(busy.row.id, { notes: randomUUID() });
  await assert.rejects(server.completeCallback(busy.row.id, busy.token, quote), { message: STALE });
  fake.state.beforeUpdate = undefined;

  const contact = stored({ kind: "contact" });
  await assert.rejects(server.completeCallback(contact.row.id, contact.token, quote), { message: "Demande invalide." });
  await assert.rejects(server.completeCallback(busy.row.id, "0".repeat(64), quote), /session de personnalisation a expiré/);
  fake.fail("inquiries.select", "read failed");
  await assert.rejects(server.completeCallback(busy.row.id, busy.token, quote), { message: "read failed" });
  fake.fail("inquiries.update", "update failed");
  await assert.rejects(server.completeCallback(busy.row.id, busy.token, quote), { message: "update failed" });
});

test("attempts are counted by the database, so the limit holds across server instances", async () => {
  for (let attempt = 0; attempt < 3; attempt++) await server.rateLimit("phone:abc", 3);
  await assert.rejects(server.rateLimit("phone:abc", 3), { message: "Trop de tentatives. Réessayez dans quinze minutes." });
  assert.equal(fake.state.limits.get("phone:abc"), 4);
  await server.rateLimit("phone:def");
  fake.fail("rpc.consume_rate_limit", "function consume_rate_limit does not exist");
  await assert.rejects(server.rateLimit("phone:ghi"), { message: "function consume_rate_limit does not exist" });
});

test("without the secret key, the site shows its starter content and every write stays closed", async () => {
  delete env.SUPABASE_SECRET_KEY;
  try {
    assert.equal(server.configured(), false);
    assert.equal(server.localMode(), false);
    const entries = await server.getEntries();
    assert.ok(entries.length > 0 && entries.every((item) => item.published));
    assert.equal(fake.state.clients.length, 0, "no database call");
    await assert.rejects(server.saveEntry(entry("x")), { message: CLOSED });
    await assert.rejects(server.createInquiry(inquiry()), { message: CLOSED });
    await assert.rejects(server.getInquiries(), { message: CLOSED });
  } finally {
    env.SUPABASE_SECRET_KEY = "secret-key";
  }
});

test("only an admin account opens the back office; its session cookie is refreshed when allowed", async () => {
  fake.state.user = { data: { user: { app_metadata: { role: "admin" } } }, error: null };
  assert.equal(await server.isAdmin(), true);
  assert.equal(fake.state.clients.at(-1)?.key, "publishable-key", "sessions use the public key, never the secret one");
  assert.deepEqual(fake.state.cookies.written, ["sb-session=refreshed"]);
  await assert.doesNotReject(server.requireAdmin());
  assert.deepEqual(await server.verifyAdmin(), { email: "", name: "" }, "an account without e-mail or name");
  fake.state.user = {
    data: {
      user: { email: "k@eventhemes.ma", app_metadata: { role: "admin" }, user_metadata: { full_name: "Keltoum Malouki" } },
    },
    error: null,
  };
  assert.deepEqual(
    await server.verifyAdmin(),
    { email: "k@eventhemes.ma", name: "Keltoum Malouki" },
    "the back office greets the signed-in account",
  );
  fake.state.cookies.readOnly = true;
  assert.equal(await server.isAdmin(), true, "while a page renders, cookies are read-only: the proxy refreshes them");

  fake.state.user = { data: { user: { app_metadata: { role: "editor" } } }, error: null };
  assert.equal(await server.isAdmin(), false);
  await assert.rejects(server.requireAdmin(), { message: "UNAUTHORIZED" });
  await assert.rejects(server.verifyAdmin(), (error: Error & { digest?: string }) => {
    assert.match(String(error.digest), /\/admin\/connexion/);
    return true;
  });
  fake.state.user = { data: { user: { app_metadata: { role: "admin" } } }, error: { message: "JWT expired" } };
  assert.equal(await server.isAdmin(), false, "an expired session is no session");

  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    assert.equal(await server.isAdmin(), false, "no authentication configured, no admin");
  } finally {
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;
  }
});
