import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import type { PGlite } from "@electric-sql/pglite";
import { attachmentTypes, kinds, MAX_ATTACHMENT_BYTES, normalizeStatus, type Entry } from "../src/lib/eventheme/types";
import { validateEntry } from "../src/lib/eventheme/validation";

/**
 * Les migrations Supabase, exécutées pour de vrai dans PGlite (PostgreSQL
 * compilé en WebAssembly, sans Docker ni compte Supabase).
 *
 * Avant les migrations, la base est préparée comme un projet Supabase : rôles
 * anon / authenticated / service_role (ce dernier contourne la RLS), droits
 * par défaut généreux sur le schéma public (que les migrations doivent donc
 * retirer elles-mêmes), auth.jwt() lu dans request.jwt.claims, et un schéma
 * storage minimal. Chaque requête est jouée comme PostgREST la joue : dans une
 * transaction, avec le rôle et les « claims » du jeton.
 */
const SUPABASE = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create schema storage;
grant usage on schema storage to anon, authenticated, service_role;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null
);
alter table storage.objects enable row level security;
grant select on storage.buckets to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;
`;

const root = path.join(__dirname, "..", "supabase");
const migrations = readdirSync(path.join(root, "migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort();
const sql = (name: string) => readFileSync(path.join(root, "migrations", name), "utf8");

let PGliteClass: typeof PGlite;
const opened: PGlite[] = [];
/** Base neuve « façon Supabase », avec les migrations demandées (toutes par défaut). */
async function database(files = migrations) {
  const db = new PGliteClass();
  opened.push(db);
  await db.exec(SUPABASE);
  for (const file of files) await db.exec(sql(file));
  return db;
}

type Who = { role: "anon" | "authenticated" | "service_role"; claims: Record<string, unknown> };
const visitor: Who = { role: "anon", claims: { role: "anon" } };
/** Compte connecté sans rôle admin, qui tente de se promouvoir par ses propres métadonnées (modifiables par l’utilisateur). */
const member: Who = {
  role: "authenticated",
  claims: { role: "authenticated", sub: "00000000-0000-4000-8000-000000000001", app_metadata: { provider: "email" }, user_metadata: { role: "admin" } },
};
const admin: Who = {
  role: "authenticated",
  claims: { role: "authenticated", sub: "00000000-0000-4000-8000-000000000002", app_metadata: { provider: "email", role: "admin" } },
};
const serverRole: Who = { role: "service_role", claims: { role: "service_role" } };

/** Une requête, jouée comme PostgREST : transaction, rôle, claims du jeton. */
function as(db: PGlite, who: Who, query: string, params: unknown[] = []) {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('role', $1, true), set_config('request.jwt.claims', $2, true)", [
      who.role,
      JSON.stringify(who.claims),
    ]);
    return tx.query<Record<string, unknown>>(query, params);
  });
}
const ids = (result: { rows: Record<string, unknown>[] }) => result.rows.map((row) => row.id);
const moroccanYear = () => new Intl.DateTimeFormat("en", { timeZone: "Africa/Casablanca", year: "numeric" }).format(new Date());
const RLS = /row-level security/;
/**
 * Refus attendus, avec l’objet qui refuse : chaque couche (droits sur la
 * table, sur la fonction, sur la séquence) est vérifiée pour elle-même, pas
 * seulement « quelque chose a refusé ».
 */
const deny = {
  inquiries: /permission denied for table inquiries/,
  rateLimits: /permission denied for table rate_limits/,
  content: /permission denied for table content/,
  consume: /permission denied for function consume_rate_limit/,
  reference: /permission denied for function next_inquiry_reference/,
  sequence: /permission denied for sequence inquiry_reference_seq/,
};
const counters: [string, RegExp][] = [
  ["select * from public.rate_limits", deny.rateLimits],
  ["delete from public.rate_limits", deny.rateLimits],
  ["select public.consume_rate_limit('x', 5)", deny.consume],
  ["select public.next_inquiry_reference()", deny.reference],
  ["select nextval('public.inquiry_reference_seq')", deny.sequence],
];
const createRequest: [string, RegExp] = ["insert into public.inquiries (id, data) values (gen_random_uuid(), '{}')", deny.inquiries];
async function refused(who: Who, cases: [string, RegExp][]) {
  for (const [query, expected] of cases) await assert.rejects(as(db, who, query), expected, `${who.role}: ${query}`);
}

let db: PGlite;
const INQUIRY = "6f0e2b1a-0000-4000-8000-000000000001";

before(async () => {
  ({ PGlite: PGliteClass } = await import("@electric-sql/pglite"));
  db = await database();
  await db.exec(`
    insert into public.content (id, kind, published, data) values
      ('published-page', 'pages', true, '{"id":"published-page"}'),
      ('draft-page', 'pages', false, '{"id":"draft-page"}');
    insert into public.inquiries (id, data) values ('${INQUIRY}', '{"reference":"EVT-2026-0900","status":"Nouveau","phone":"+212600000000"}');
    insert into public.rate_limits (key, expires_at) values ('phone:existing', now() + interval '15 minutes');
  `);
});
after(async () => {
  for (const instance of opened) await instance.close();
});

test("the migrations apply in order, and row-level security is on for every table", async () => {
  const { rows } = await db.query<{ tablename: string; rowsecurity: boolean }>(
    "select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename",
  );
  assert.deepEqual(rows, [
    { tablename: "content", rowsecurity: true },
    { tablename: "inquiries", rowsecurity: true },
    { tablename: "rate_limits", rowsecurity: true },
  ]);
});

test("the database accepts every kind of content the site uses, and only those", async () => {
  const test = await database();
  for (const kind of kinds)
    await test.query("insert into public.content (id, kind, data) values ($1, $2, '{}')", [`kind-${kind}`, kind]);
  for (const kind of ["levels", "guests", "venues", "inquiries", ""])
    await assert.rejects(
      test.query("insert into public.content (id, kind, data) values ($1, $2, '{}')", [`retired-${kind}`, kind]),
      /content_kind_check/,
      `kind « ${kind} »`,
    );
  await assert.rejects(test.query("insert into public.content (id, kind, data) values ('list', 'pages', '[]')"), /check constraint/);
  await assert.rejects(test.query(`insert into public.inquiries (id, data) values (gen_random_uuid(), '"text"')`), /check constraint/);
});

test("the generated seed loads twice without change, and every row is valid public content", async () => {
  const seeded = await database();
  const seed = readFileSync(path.join(root, "seed.sql"), "utf8");
  await seeded.exec(seed);
  await seeded.exec(seed);
  const { rows } = await seeded.query<{ id: string; kind: string; published: boolean; data: Entry }>(
    "select id, kind, published, data from public.content",
  );
  assert.equal(rows.length, seed.match(/^insert into public\.content /gm)?.length, "one row per statement, none twice");
  for (const row of rows) {
    assert.equal(row.data.id, row.id);
    assert.equal(row.data.kind, row.kind);
    assert.equal(row.data.published, row.published, `${row.id}: the column used by the public policy matches the content`);
    assert.doesNotThrow(() => validateEntry(row.data), `${row.id} passes the admin validation`);
  }
  assert.ok(rows.some((row) => row.id === "settings" && row.kind === "settings"), "the site settings are seeded");
  const visible = await as(seeded, visitor, "select id from public.content");
  assert.equal(visible.rows.length, rows.filter((row) => row.published).length, "visitors see exactly the published rows");
  assert.equal((await seeded.query("select 1 from public.inquiries")).rows.length, 0, "no client request in the seed");
});

test("visitors read published content only, and nothing else", async () => {
  assert.deepEqual(ids(await as(db, visitor, "select id from public.content order by id")), ["published-page"]);
  await refused(visitor, [
    ["select * from public.inquiries", deny.inquiries],
    createRequest,
    ["insert into public.content (id, kind, published, data) values ('x', 'pages', true, '{}')", deny.content],
    ["update public.content set published = false", deny.content],
    ["delete from public.content", deny.content],
    ...counters,
  ]);
});

test("a signed-in account without the admin role sees what visitors see, even after editing its own metadata", async () => {
  assert.deepEqual(ids(await as(db, member, "select id from public.content order by id")), ["published-page"]);
  await assert.rejects(as(db, member, "insert into public.content (id, kind, published, data) values ('x', 'pages', true, '{}')"), RLS);
  assert.equal((await as(db, member, "update public.content set published = false")).affectedRows, 0);
  assert.equal((await as(db, member, "delete from public.content")).affectedRows, 0);
  assert.equal((await as(db, member, "select * from public.inquiries")).rows.length, 0, "client requests stay hidden");
  assert.equal((await as(db, member, "update public.inquiries set data = '{}'")).affectedRows, 0);
  assert.equal((await as(db, member, "delete from public.inquiries")).affectedRows, 0);
  await refused(member, [createRequest, ...counters]);
  const { rows } = await db.query<{ total: number }>("select count(*)::int as total from public.content");
  assert.equal(rows[0].total, 2, "nothing was changed");
});

test("an admin manages all content and every request, but cannot create requests or touch the counters", async () => {
  assert.deepEqual(ids(await as(db, admin, "select id from public.content order by id")), ["draft-page", "published-page"]);
  await as(db, admin, `insert into public.content (id, kind, published, data) values ('admin-page', 'pages', false, '{"id":"admin-page"}')`);
  assert.equal((await as(db, admin, "update public.content set published = true where id = 'admin-page'")).affectedRows, 1);
  assert.equal((await as(db, admin, "delete from public.content where id = 'admin-page'")).affectedRows, 1);

  assert.deepEqual(ids(await as(db, admin, "select id from public.inquiries")), [INQUIRY]);
  const status = `update public.inquiries set data = jsonb_set(data, '{status}', '"Devis envoyé"') where id = '${INQUIRY}'`;
  assert.equal((await as(db, admin, status)).affectedRows, 1);
  const extra = "6f0e2b1a-0000-4000-8000-000000000002";
  await as(db, serverRole, `insert into public.inquiries (id, data) values ('${extra}', '{"reference":"EVT-2026-0901"}')`);
  assert.equal((await as(db, admin, `delete from public.inquiries where id = '${extra}'`)).affectedRows, 1);

  // Requests are created by the server only, after validation; the counters are the server's too.
  await refused(admin, [createRequest, ...counters]);
});

test("storage: admins write the public media; client attachments are reachable by the server only", async () => {
  const { rows } = await db.query<{ id: string; public: boolean; file_size_limit: number | bigint; allowed_mime_types: string[] }>(
    "select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id",
  );
  assert.deepEqual(
    rows.map((row) => ({ ...row, file_size_limit: Number(row.file_size_limit) })),
    [
      { id: "eventheme-media", public: true, file_size_limit: 8 * 1024 * 1024, allowed_mime_types: ["image/jpeg", "image/png", "image/webp"] },
      { id: "eventheme-requests", public: false, file_size_limit: MAX_ATTACHMENT_BYTES, allowed_mime_types: Object.keys(attachmentTypes) },
    ],
    "the private bucket enforces the same formats and size as the server",
  );
  const put = (bucket: string, name: string) => `insert into storage.objects (bucket_id, name) values ('${bucket}', '${name}')`;
  await as(db, admin, put("eventheme-media", "scene.webp"));
  await assert.rejects(as(db, member, put("eventheme-media", "logo.webp")), RLS);
  await assert.rejects(as(db, visitor, put("eventheme-media", "logo.webp")), RLS);
  await assert.rejects(as(db, admin, put("eventheme-requests", `${INQUIRY}/plan.pdf`)), RLS, "not even an admin uploads there directly");
  await as(db, serverRole, put("eventheme-requests", `${INQUIRY}/plan.pdf`));
  for (const who of [visitor, member, admin]) {
    const files = await as(db, who, "select name from storage.objects where bucket_id = 'eventheme-requests'");
    assert.equal(files.rows.length, 0, `${who.role} cannot list client documents (the team uses signed links)`);
    const removed = await as(db, who, "delete from storage.objects where bucket_id = 'eventheme-requests'");
    assert.equal(removed.affectedRows, 0);
  }
  assert.deepEqual(ids(await as(db, admin, "select name as id from storage.objects where bucket_id = 'eventheme-media'")), ["scene.webp"]);
});

test("the server numbers requests from one sequence with the Moroccan year, and a reference is never reused", async () => {
  const next = async () => (await as(db, serverRole, "select public.next_inquiry_reference() as reference")).rows[0].reference;
  const year = moroccanYear();
  assert.equal(await next(), `EVT-${year}-0001`);
  assert.equal(await next(), `EVT-${year}-0002`);
  const insert = "insert into public.inquiries (id, data) values (gen_random_uuid(), $1::text::jsonb)";
  await as(db, serverRole, insert, [JSON.stringify({ reference: `EVT-${year}-0002` })]);
  await assert.rejects(as(db, serverRole, insert, [JSON.stringify({ reference: `EVT-${year}-0002` })]), /inquiries_reference_key/);
});

test("the rate limit counts attempts per key for fifteen minutes, then starts again", async () => {
  const consume = async (key: string, max = 5) =>
    (await as(db, serverRole, "select public.consume_rate_limit($1, $2) as allowed", [key, max])).rows[0].allowed;
  for (let attempt = 0; attempt < 5; attempt++) assert.equal(await consume("phone:a"), true);
  assert.equal(await consume("phone:a"), false);
  assert.equal(await consume("phone:b"), true, "each key has its own count");
  assert.equal(await consume("ack:x", 1), true);
  assert.equal(await consume("ack:x", 1), false);
  const { rows } = await db.query<{ seconds: number }>(
    "select extract(epoch from expires_at - now())::float8 as seconds from public.rate_limits where key = 'phone:a'",
  );
  assert.ok(rows[0].seconds > 880 && rows[0].seconds <= 900, `window of fifteen minutes (${rows[0].seconds} s left)`);
  await db.query("update public.rate_limits set expires_at = now() - interval '1 second' where key = 'phone:a'");
  assert.equal(await consume("phone:a"), true, "an expired window is cleared");
  const attempts = await db.query<{ attempts: number }>("select attempts from public.rate_limits where key = 'phone:a'");
  assert.equal(attempts.rows[0].attempts, 1);
});

test("an older database is upgraded: retired content removed, references in arrival order, statuses renamed", async () => {
  const [initial, retire, ...rest] = migrations;
  const legacy = await database([initial]);
  await legacy.exec(`
    insert into public.content (id, kind, published, data) values
      ('gold', 'levels', true, '{}'), ('vip', 'guests', true, '{}'), ('riad', 'venues', true, '{}'), ('home', 'pages', true, '{}');
  `);
  await legacy.exec(sql(retire));
  assert.deepEqual(ids(await legacy.query("select id from public.content")), ["home"]);

  const before = [
    ["Confirmé", "2026-01-03"],
    ["Nouvelle demande", "2026-01-01"],
    ["Annulé", "2026-01-04"],
    ["En cours de traitement", "2026-01-02"],
  ] as const;
  for (const [index, [status, day]] of before.entries())
    await legacy.query("insert into public.inquiries (id, data, created_at) values ($1, $2::text::jsonb, $3)", [
      `6f0e2b1a-0000-4000-8000-00000000010${index}`,
      JSON.stringify({ status }),
      `${day}T10:00:00Z`,
    ]);
  for (const file of rest) await legacy.exec(sql(file));

  const { rows } = await legacy.query<{ reference: string; status: string }>(
    "select data->>'reference' as reference, data->>'status' as status from public.inquiries order by created_at",
  );
  const year = moroccanYear();
  assert.deepEqual(
    rows.map((row) => row.reference),
    [1, 2, 3, 4].map((number) => `EVT-${year}-000${number}`),
    "references follow the arrival order",
  );
  assert.deepEqual(
    rows.map((row) => row.status),
    ["Nouveau", "En cours de traitement", "Accepté", "Refusé"],
  );
  // The database and the code (normalizeStatus, used when reading) rename the same way.
  for (const [status, day] of before) {
    const renamed = await legacy.query<{ status: string }>(
      "select data->>'status' as status from public.inquiries where created_at = $1",
      [`${day}T10:00:00Z`],
    );
    assert.equal(renamed.rows[0].status, normalizeStatus(status), `« ${status} »`);
  }
  const next = await as(legacy, serverRole, "select public.next_inquiry_reference() as reference");
  assert.equal(next.rows[0].reference, `EVT-${year}-0005`, "numbering continues after the upgraded requests");
});
