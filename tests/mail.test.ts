import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, before, test } from "node:test";
import type { EmailMessage } from "../src/lib/eventheme/emails";
import type { Entry, Inquiry } from "../src/lib/eventheme/types";

/**
 * Envoi des e-mails : choix du mode (fournisseur, aperçu, désactivé), appels
 * HTTP à Resend et Brevo (fetch simulé, rien ne part), destinataires, et
 * garde-fous : un e-mail en échec n’annule jamais une demande.
 */
const directory = mkdtempSync(path.join(tmpdir(), "eventhemes-mail-"));
let mailer: typeof import("../src/lib/eventheme/mailer");
let notifications: typeof import("../src/lib/eventheme/notifications");

before(async () => {
  process.env.EVENTHEME_DATA_DIR = directory;
  mailer = await import("../src/lib/eventheme/mailer");
  notifications = await import("../src/lib/eventheme/notifications");
});

const env = process.env as Record<string, string | undefined>;
const MAIL_KEYS = ["EMAIL_PROVIDER", "EMAIL_API_KEY", "EMAIL_FROM", "EMAIL_TEAM", "NODE_ENV", "EVENTHEME_DATA_MODE", "APP_URL"];
const saved = Object.fromEntries(MAIL_KEYS.map((key) => [key, env[key]]));
const realFetch = globalThis.fetch;
const realWarn = console.warn;
const realError = console.error;

/** Variables d’e-mail provisoires ; tout est rétabli après chaque test. */
function configure(values: Record<string, string | undefined>) {
  for (const key of MAIL_KEYS) delete env[key];
  for (const [key, value] of Object.entries(values)) if (value !== undefined) env[key] = value;
}
const provider = (name: "resend" | "brevo", extra: Record<string, string> = {}) =>
  configure({ EMAIL_PROVIDER: name, EMAIL_API_KEY: "test-key", EMAIL_FROM: "EVENTHEMES <devis@eventhemes.ma>", ...extra });

type Call = { url: string; init: RequestInit };
/** Remplace fetch : chaque appel est noté, la réponse vient de `answer`. */
function fakeFetch(answer: (call: Call) => Response = () => new Response("{}", { status: 200 })) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init: RequestInit = {}) => {
    const call = { url: String(url), init };
    calls.push(call);
    return answer(call);
  }) as typeof fetch;
  return calls;
}
/** Capture console.warn / console.error pendant le test. */
function captureLogs() {
  const logs = { warn: [] as string[], error: [] as string[] };
  console.warn = (...args: unknown[]) => void logs.warn.push(args.map(String).join(" "));
  console.error = (...args: unknown[]) => void logs.error.push(args.map(String).join(" "));
  return logs;
}

afterEach(() => {
  configure(saved);
  globalThis.fetch = realFetch;
  console.warn = realWarn;
  console.error = realError;
  rmSync(path.join(directory, "emails"), { recursive: true, force: true });
});

const previews = () => {
  try {
    return readdirSync(path.join(directory, "emails"));
  } catch {
    return [];
  }
};
const message = (over: Partial<EmailMessage> = {}): EmailMessage => ({
  key: "team-EVT-2026-0001",
  to: ["equipe@eventhemes.ma"],
  subject: "Nouvelle demande -- EVT-2026-0001",
  html: "<p>Bonjour</p>",
  text: "Bonjour",
  ...over,
});
const social = (network: string, url: string): Entry => ({
  id: network,
  kind: "socials",
  title: network,
  description: "",
  url,
  published: true,
});
const inquiry = (over: Partial<Inquiry> = {}): Inquiry => ({
  id: "4f1c2d3e-0000-4000-8000-000000000001",
  reference: "EVT-2026-0001",
  kind: "callback",
  name: "Amina Berrada",
  email: "amina@example.ma",
  phone: "+212 6 61 23 45 67",
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
  createdAt: "2026-11-14T10:00:00.000Z",
  status: "Nouveau",
  notes: "",
  estimate: 0,
  hasUnpriced: false,
  summary: [],
  ...over,
});
const options = { completed: false, pendingAttachments: 0 };

test("the mail mode follows the configuration", () => {
  configure({});
  assert.equal(mailer.mailMode(), "preview", "development without a provider: previews");
  configure({ NODE_ENV: "production" });
  assert.equal(mailer.mailMode(), "off", "production without a provider: nothing");
  configure({ EVENTHEME_DATA_MODE: "supabase" });
  assert.equal(mailer.mailMode(), "off", "Supabase data without a provider: nothing either");
  provider("resend");
  assert.equal(mailer.mailMode(), "provider");
  provider("brevo", { EMAIL_PROVIDER: " Brevo " });
  assert.equal(mailer.mailMode(), "provider", "the provider name is trimmed and case-insensitive");
  configure({ EMAIL_PROVIDER: "mailchimp", EMAIL_API_KEY: "k", EMAIL_FROM: "a@b.ma" });
  assert.equal(mailer.mailMode(), "preview", "an unknown provider is ignored");
  configure({ EMAIL_PROVIDER: "resend", EMAIL_FROM: "a@b.ma" });
  assert.equal(mailer.mailMode(), "preview", "no key, no sending");
});

test("in preview, each e-mail is saved for review with its envelope, and nothing leaves", async () => {
  configure({});
  const calls = fakeFetch();
  assert.equal(await mailer.sendEmail(message({ replyTo: "amina@example.ma" })), "preview");
  assert.equal(await mailer.sendEmail(message({ key: "team/../../x", to: [] })), "preview");
  assert.equal(calls.length, 0);
  const files = previews().sort();
  assert.equal(files.length, 2);
  assert.ok(files.every((name) => /^[\w-]+\.html$/.test(name)), "file names stay inside the folder");
  const contents = files.map((name) => readFileSync(path.join(directory, "emails", name), "utf8"));
  const first = contents.find((text) => text.includes("equipe@eventhemes.ma"))!;
  assert.match(first, /À : equipe@eventhemes\.ma/);
  assert.match(first, /Objet : Nouvelle demande ‑‑ EVT-2026-0001/, "“--” cannot close the HTML comment");
  assert.match(first, /Répondre à : amina@example\.ma/);
  assert.ok(first.endsWith("<p>Bonjour</p>"));
  const second = contents.find((text) => text !== first)!;
  assert.match(second, /À : \(équipe : EMAIL_TEAM à configurer\)/);
  assert.match(second, /Répondre à : —/);
});

test("in production without a provider, nothing is written or sent", async () => {
  configure({ NODE_ENV: "production" });
  const calls = fakeFetch();
  assert.equal(await mailer.sendEmail(message()), "off");
  assert.equal(calls.length, 0);
  assert.equal(previews().length, 0);
});

test("Resend receives the message through its API, with an idempotency key", async () => {
  provider("resend");
  const calls = fakeFetch();
  assert.equal(await mailer.sendEmail(message({ replyTo: "amina@example.ma" })), "provider");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer test-key");
  assert.equal(headers["Idempotency-Key"], "team-EVT-2026-0001");
  const body = JSON.parse(String(calls[0].init.body));
  assert.deepEqual(body.to, ["equipe@eventhemes.ma"]);
  assert.equal(body.reply_to, "amina@example.ma");
  assert.ok(calls[0].init.signal instanceof AbortSignal, "a stuck provider cannot hold the request forever");
  assert.equal(previews().length, 0);
});

test("Brevo receives the message through its API; an e-mail without recipient is not sent", async () => {
  provider("brevo");
  const calls = fakeFetch();
  assert.equal(await mailer.sendEmail(message()), "provider");
  assert.equal(calls[0].url, "https://api.brevo.com/v3/smtp/email");
  assert.equal((calls[0].init.headers as Record<string, string>)["api-key"], "test-key");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)).sender, { name: "EVENTHEMES", email: "devis@eventhemes.ma" });
  assert.equal(await mailer.sendEmail(message({ to: [] })), "off");
  assert.equal(calls.length, 1, "no call without a recipient");
});

test("a refusal from the provider is reported with its status and reason", async () => {
  provider("resend");
  fakeFetch(() => new Response(`{"message":"domain not verified"}${"x".repeat(400)}`, { status: 403 }));
  await assert.rejects(mailer.sendEmail(message()), (error: Error) => {
    assert.match(error.message, /^resend a refusé l'e-mail « Nouvelle demande -- EVT-2026-0001 » \(HTTP 403\) : /);
    assert.match(error.message, /domain not verified/);
    assert.ok(error.message.length < 420, "the provider's answer is shortened");
    return true;
  });
});

test("team alerts go to EMAIL_TEAM, otherwise to the public e-mail link", () => {
  configure({ EMAIL_TEAM: "direction@eventhemes.ma, devis@eventhemes.ma" });
  assert.deepEqual(notifications.teamRecipients([]), ["direction@eventhemes.ma", "devis@eventhemes.ma"]);
  configure({});
  const link = social("email", "mailto:contact%40eventhemes.ma?subject=Devis");
  assert.deepEqual(notifications.teamRecipients([link]), ["contact@eventhemes.ma"]);
  assert.deepEqual(notifications.teamRecipients([social("email", "https://eventhemes.ma/contact")]), []);
  assert.deepEqual(notifications.teamRecipients([social("email", "mailto:%E0%A4%A")]), [], "a malformed link is ignored");
  assert.deepEqual(notifications.teamRecipients([social("instagram", "mailto:x@y.ma")]), []);
  assert.deepEqual(notifications.teamRecipients([]), []);
});

test("an acknowledgement is promised only when it will really leave", () => {
  configure({});
  assert.equal(notifications.clientMailExpected({ email: "amina@example.ma" }), false, "previews only");
  provider("resend");
  assert.equal(notifications.clientMailExpected({ email: "amina@example.ma" }), true);
  assert.equal(notifications.clientMailExpected({ email: "" }), false);
});

test("notifications: nothing at all when e-mail is off", async () => {
  configure({ NODE_ENV: "production" });
  const calls = fakeFetch();
  await notifications.notifyRequest(inquiry(), [], options);
  assert.equal(calls.length, 0);
  assert.equal(previews().length, 0);
});

test("notifications in preview: the team alert is kept even without a recipient, plus the acknowledgement", async () => {
  configure({});
  await notifications.notifyRequest(inquiry({ id: "4f1c2d3e-0000-4000-8000-00000000aaaa" }), [], options);
  const files = previews();
  assert.equal(files.length, 2);
  await notifications.notifyRequest(inquiry({ id: "4f1c2d3e-0000-4000-8000-00000000bbbb", email: "" }), [], options);
  assert.equal(previews().length, 3, "no address, no acknowledgement");
});

test("notifications through a provider: team alert, acknowledgement, and the admin link", async () => {
  provider("resend", { EMAIL_TEAM: "equipe@eventhemes.ma", APP_URL: "https://eventhemes.ma/" });
  const calls = fakeFetch();
  await notifications.notifyRequest(inquiry({ email: "client.one@example.ma" }), [], { completed: true, pendingAttachments: 1 });
  assert.equal(calls.length, 2);
  const bodies = calls.map((call) => JSON.parse(String(call.init.body)));
  const team = bodies.find((body) => body.to[0] === "equipe@eventhemes.ma")!;
  const client = bodies.find((body) => body.to[0] === "client.one@example.ma")!;
  assert.ok(team.html.includes("https://eventhemes.ma/admin"), "the alert links to the back office");
  assert.equal(client.reply_to, "equipe@eventhemes.ma", "the client can answer the team directly");
});

test("without a team address, the alert is skipped with a warning and the client still gets an answer", async () => {
  provider("resend");
  const logs = captureLogs();
  const calls = fakeFetch();
  await notifications.notifyRequest(inquiry({ email: "client.two@example.ma" }), [], options);
  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(String(calls[0].init.body)).to[0], "client.two@example.ma");
  assert.match(logs.warn.join("\n"), /définissez EMAIL_TEAM/);
});

test("one address receives three acknowledgements at most, then the form stops writing to it", async () => {
  provider("resend", { EMAIL_TEAM: "equipe@eventhemes.ma" });
  const logs = captureLogs();
  const calls = fakeFetch();
  // The same address in any letter case counts as one.
  for (const email of ["Flood@Example.ma", "flood@example.ma", "FLOOD@EXAMPLE.MA", "flood@example.ma"])
    await notifications.notifyRequest(inquiry({ email }), [], options);
  const acknowledgements = calls.filter((call) => JSON.parse(String(call.init.body)).to[0] !== "equipe@eventhemes.ma");
  assert.equal(acknowledgements.length, 3);
  assert.equal(calls.length, 7, "the team is still alerted every time");
  assert.match(logs.warn.join("\n"), /EVT-2026-0001 non envoyé : limite d'envois/);
});

test("a failing provider is logged and never breaks the request", async () => {
  provider("brevo", { EMAIL_TEAM: "equipe@eventhemes.ma" });
  const logs = captureLogs();
  fakeFetch(() => new Response("unavailable", { status: 503 }));
  await assert.doesNotReject(notifications.notifyRequest(inquiry({ email: "client.three@example.ma" }), [], options));
  assert.equal(logs.error.filter((line) => line.startsWith("E-mail non envoyé :")).length, 2);
  fakeFetch(() => {
    throw new TypeError("fetch failed");
  });
  await assert.doesNotReject(notifications.notifyRequest(inquiry({ email: "client.four@example.ma" }), [], options));
  assert.match(logs.error.join("\n"), /fetch failed/);
});
