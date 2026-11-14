import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clientEmail,
  emailList,
  parseSender,
  providerRequest,
  teamEmail,
} from "../src/lib/eventheme/emails";
import type { Entry, Inquiry } from "../src/lib/eventheme/types";

const e = (id: string, kind: Entry["kind"], title: string): Entry => ({ id, kind, title, description: "", published: true });
const entries: Entry[] = [
  e("gala", "events", "Gala & cérémonie"),
  e("sonorisation", "services", "Sonorisation"),
  e("micros-hf", "products", "Microphones sans fil (HF)"),
];
const inquiry = (over: Partial<Inquiry> = {}): Inquiry => ({
  id: "4f1c2d3e-0000-4000-8000-000000000001",
  reference: "EVT-2026-0042",
  kind: "quote",
  name: "Amina Berrada",
  email: "amina@example.ma",
  phone: "+212 6 61 23 45 67",
  company: "Agence Atlas",
  city: "Casablanca",
  address: "Hôtel du Parc",
  message: "Scène 8 × 6 m\nMise en lumière du jardin",
  subject: "",
  event: "gala",
  date: "2099-06-12",
  duration: 6,
  rentalDays: 2,
  guests: 350,
  budget: 120000,
  contactMethod: "Téléphone",
  consent: true,
  website: "",
  startedAt: 0,
  basket: { services: ["sonorisation"], products: [{ id: "micros-hf", variant: "Micro main", quantity: 4 }] },
  createdAt: "2026-11-14T10:00:00.000Z",
  status: "Nouveau",
  notes: "NOTE INTERNE : client à relancer",
  estimate: 0,
  hasUnpriced: true,
  summary: [],
  ...over,
});

test("the team alert carries everything needed to call the client back", () => {
  const mail = teamEmail(inquiry(), entries, {
    to: ["equipe@eventhemes.ma"],
    adminUrl: "https://eventhemes.ma/admin",
    completed: true,
    pendingAttachments: 2,
  });
  assert.deepEqual(mail.to, ["equipe@eventhemes.ma"]);
  assert.equal(mail.replyTo, "amina@example.ma");
  assert.match(mail.subject, /^Demande de devis · EVT-2026-0042 · Gala & cérémonie · .*2099 · Casablanca$/);
  for (const fragment of ["+212 6 61 23 45 67", "Agence Atlas", "Sonorisation", "Microphones sans fil (HF) (Micro main) × 4", "2 jours", "350 participants", "120", "2 fichier(s) joint(s)", "https://eventhemes.ma/admin"])
    assert.ok(mail.text.includes(fragment), `missing: ${fragment}`);
  assert.ok(mail.html.includes("Scène 8 × 6 m<br>Mise en lumière du jardin"));
  assert.equal(mail.key, `${inquiry().id}/quote/team`);
});

test("visitor input is escaped and subjects stay on one line", () => {
  const hostile = inquiry({ name: "<script>alert(1)</script>", message: "<img src=x onerror=alert(1)>", kind: "contact", subject: "Bonjour\r\nBcc: x@y.z" });
  const mail = teamEmail(hostile, entries, { to: ["equipe@eventhemes.ma"] });
  assert.ok(!mail.html.includes("<script>"));
  assert.ok(!mail.html.includes("<img src=x"));
  assert.ok(mail.html.includes("&lt;script&gt;"));
  assert.ok(!/[\r\n]/.test(mail.subject));
  assert.match(mail.subject, /^Message · EVT-2026-0042 · Bonjour Bcc: x@y\.z$/);
});

test("the client acknowledgement greets, recaps and never shows internal notes", () => {
  assert.equal(clientEmail(inquiry({ email: "" }), entries, {}), null);
  assert.equal(clientEmail(inquiry({ email: "pas-une-adresse" }), entries, {}), null);

  const callback = clientEmail(inquiry({ kind: "callback", basket: { services: [], products: [] } }), entries, {
    whatsappUrl: "https://wa.me/message/AREDMVCCJW5GM1",
    replyTo: "equipe@eventhemes.ma",
  })!;
  assert.equal(callback.subject, "Nous avons bien reçu votre demande · EVT-2026-0042");
  assert.deepEqual(callback.to, ["amina@example.ma"]);
  assert.equal(callback.replyTo, "equipe@eventhemes.ma");
  assert.ok(callback.text.startsWith("Votre demande est bien reçue.\n\nBonjour Amina,"));
  assert.ok(callback.text.includes("par téléphone"));
  assert.ok(callback.html.includes("https://wa.me/message/AREDMVCCJW5GM1"));

  const quote = clientEmail(inquiry(), entries, { completed: true })!;
  assert.equal(quote.subject, "Récapitulatif de votre demande de devis · EVT-2026-0042");
  assert.ok(quote.text.includes("Estimation indicative : Sur devis"));
  assert.ok(quote.text.includes("non contractuels"));
  assert.equal(quote.key, `${inquiry().id}/quote/client`);
  for (const mail of [callback, quote]) {
    assert.ok(!mail.html.includes("NOTE INTERNE"));
    assert.ok(!mail.text.includes("NOTE INTERNE"));
  }
});

test("senders and recipient lists are parsed strictly", () => {
  assert.deepEqual(parseSender("EVENTHEMES <devis@eventhemes.ma>"), { name: "EVENTHEMES", email: "devis@eventhemes.ma" });
  assert.deepEqual(parseSender('"Équipe EVENTHEMES" <devis@eventhemes.ma>'), { name: "Équipe EVENTHEMES", email: "devis@eventhemes.ma" });
  assert.deepEqual(parseSender("devis@eventhemes.ma"), { email: "devis@eventhemes.ma" });
  assert.equal(parseSender("EVENTHEMES"), null);
  assert.deepEqual(emailList(" A@eventhemes.ma, b@eventhemes.ma;a@eventhemes.ma  nope "), ["a@eventhemes.ma", "b@eventhemes.ma"]);
  assert.deepEqual(emailList(undefined), []);
});

test("provider requests follow each API: Resend with text and idempotency, Brevo with HTML only", () => {
  const mail = teamEmail(inquiry(), entries, { to: ["equipe@eventhemes.ma"] });
  const resend = providerRequest("resend", mail, "EVENTHEMES <devis@eventhemes.ma>", "re_test");
  assert.equal(resend.url, "https://api.resend.com/emails");
  assert.equal(resend.init.headers.Authorization, "Bearer re_test");
  assert.equal(resend.init.headers["Idempotency-Key"], mail.key);
  const resendBody = JSON.parse(resend.init.body);
  assert.equal(resendBody.from, "EVENTHEMES <devis@eventhemes.ma>");
  assert.deepEqual(resendBody.to, ["equipe@eventhemes.ma"]);
  assert.equal(resendBody.reply_to, "amina@example.ma");
  assert.ok(resendBody.html && resendBody.text);

  const brevo = providerRequest("brevo", mail, "EVENTHEMES <devis@eventhemes.ma>", "xkeysib-test");
  assert.equal(brevo.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(brevo.init.headers["api-key"], "xkeysib-test");
  const brevoBody = JSON.parse(brevo.init.body);
  assert.deepEqual(brevoBody.sender, { name: "EVENTHEMES", email: "devis@eventhemes.ma" });
  assert.deepEqual(brevoBody.to, [{ email: "equipe@eventhemes.ma" }]);
  assert.deepEqual(brevoBody.replyTo, { email: "amina@example.ma" });
  assert.ok(brevoBody.htmlContent);
  assert.equal(brevoBody.textContent, undefined);
  assert.throws(() => providerRequest("brevo", mail, "EVENTHEMES", "k"), /EMAIL_FROM invalide/);
});
