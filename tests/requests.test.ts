import assert from "node:assert/strict";
import { test } from "node:test";
import {
  attachmentName,
  attachmentPath,
  attachmentProblem,
  formatReference,
  moroccanYear,
  nextReference,
  sniffAttachment,
} from "../src/lib/eventheme/requests";
import { normalizeStatus, participantsLabel, referenceOf, MAX_ATTACHMENT_BYTES } from "../src/lib/eventheme/types";
import { validateEntry, validateInquiry } from "../src/lib/eventheme/validation";
import type { Entry, InquiryInput } from "../src/lib/eventheme/types";

test("references are EVT-year-number, with one counter that never restarts", () => {
  assert.equal(formatReference(2026, 7), "EVT-2026-0007");
  assert.equal(formatReference(2027, 12345), "EVT-2027-12345");
  assert.equal(nextReference([], 2026), "EVT-2026-0001");
  assert.equal(nextReference(["EVT-2026-0004", undefined, "EVT-2025-0009", "ABC"], 2026), "EVT-2026-0010");
  assert.equal(nextReference(["EVT-2026-0010"], 2027), "EVT-2027-0011");
  // The year turns at midnight in Morocco (UTC+1), not at midnight UTC.
  assert.equal(moroccanYear(new Date("2026-12-31T22:30:00Z")), 2026);
  assert.equal(moroccanYear(new Date("2026-12-31T23:30:00Z")), 2027);
});

test("an old request without a number keeps a readable reference", () => {
  assert.equal(referenceOf({ id: "a1b2c3d4-0000-0000-0000-000000000000" }), "A1B2C3D4");
  assert.equal(referenceOf({ id: "a1b2c3d4-0000", reference: "EVT-2026-0001" }), "EVT-2026-0001");
});

test("the spec statuses replace the former ones", () => {
  assert.equal(normalizeStatus("Nouvelle demande"), "Nouveau");
  assert.equal(normalizeStatus("Confirmé"), "Accepté");
  assert.equal(normalizeStatus("Annulé"), "Refusé");
  assert.equal(normalizeStatus("Devis envoyé"), "Devis envoyé");
  assert.equal(normalizeStatus("inconnu"), "Nouveau");
});

test("an attachment's type is read from its content, not its name", () => {
  const bytes = (...values: number[]) => Uint8Array.from(values);
  const text = (value: string) => new TextEncoder().encode(value);
  assert.equal(sniffAttachment(text("%PDF-1.7\n…")), "application/pdf");
  assert.equal(sniffAttachment(text("\r\n%PDF-1.4")), "application/pdf");
  assert.equal(sniffAttachment(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
  assert.equal(sniffAttachment(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)), "image/png");
  assert.equal(sniffAttachment(text("RIFF\0\0\0\0WEBPVP8 ")), "image/webp");
  assert.equal(sniffAttachment(text("<html><script>")), null);
  assert.equal(sniffAttachment(text("MZ\x90\0")), null);
});

test("attachment names lose folders and control characters and take the real extension", () => {
  assert.equal(attachmentName("plan%20salle.pdf", "application/pdf"), "plan salle.pdf");
  assert.equal(attachmentName("..%2F..%2Fetc%2Fpasswd", "image/png"), "passwd.png");
  assert.equal(attachmentName("C:\\Users\\photo.JPG", "image/jpeg"), "photo.jpg");
  assert.equal(attachmentName("a\u0000b\u0007c<d>.exe", "application/pdf"), "abcd.pdf");
  assert.equal(attachmentName("", "image/webp"), "piece-jointe.webp");
  assert.equal(attachmentName(`${"x".repeat(300)}.pdf`, "application/pdf").length, 114);
  assert.equal(
    attachmentPath("4f1c0000-0000-0000-0000-000000000000", { id: "f00", type: "application/pdf" }),
    "4f1c0000-0000-0000-0000-000000000000/f00.pdf",
  );
});

test("the browser refuses formats outside the list, and PDFs it cannot shrink", () => {
  assert.equal(attachmentProblem({ name: "plan.pdf", type: "application/pdf", size: 1000 }), null);
  assert.match(attachmentProblem({ name: "plan.pdf", type: "application/pdf", size: MAX_ATTACHMENT_BYTES + 1 })!, /WhatsApp/);
  // A heavy photo is accepted: it is reduced before sending.
  assert.equal(attachmentProblem({ name: "salle.jpg", type: "image/jpeg", size: MAX_ATTACHMENT_BYTES * 3 }), null);
  assert.match(attachmentProblem({ name: "plan.docx", type: "application/msword", size: 10 })!, /format non accepté/);
});

const events: Entry[] = [{ id: "gala", kind: "events", title: "Gala", description: "", published: true }];
const quote = (over: Partial<InquiryInput> = {}): InquiryInput => ({
  kind: "quote",
  name: "Client",
  email: "",
  phone: "+212600000000",
  company: "Agence",
  city: "Casablanca",
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
  startedAt: Date.now() - 5000,
  basket: { services: [], products: [] },
  ...over,
});

test("only the event, the date and the city are required for a quote", () => {
  const result = validateInquiry(quote(), events);
  assert.equal(result.guests, 0);
  assert.equal(result.budget, 0);
  assert.equal(validateInquiry(quote({ guests: 25000, budget: 150000.4 }), events).budget, 150000);
  assert.throws(() => validateInquiry(quote({ guests: 100001 }), events), /participants/);
  assert.throws(() => validateInquiry(quote({ guests: 12.5 }), events), /participants/);
  assert.throws(() => validateInquiry(quote({ budget: -1 }), events), /Budget/);
  assert.throws(() => validateInquiry(quote({ city: "" }), events), /ville/);
});

test("catalogue fields are kept, category references must be identifiers", () => {
  const product = validateEntry({
    id: "micro",
    kind: "products",
    title: "Micro",
    description: "",
    published: true,
    category: "cat-son",
    subcategory: "cat-son-micros",
    brand: " Shure ",
    model: "SLXD24",
    reference: "",
  });
  assert.equal(product.brand, "Shure");
  assert.equal(product.model, "SLXD24");
  assert.equal(product.reference, undefined);
  assert.equal(product.subcategory, "cat-son-micros");
  assert.throws(
    () => validateEntry({ id: "x", kind: "products", title: "X", description: "", published: true, subcategory: "../x" }),
    /Catégorie invalide/,
  );
  const category = validateEntry({ id: "cat-x", kind: "categories", title: "X", description: "", published: false, parent: "cat-son" });
  assert.equal(category.published, true);
  assert.equal(category.parent, "cat-son");
});

test("participants read naturally", () => {
  assert.equal(participantsLabel(0), "Participants à préciser");
  assert.equal(participantsLabel(1), "1 participant");
  assert.match(participantsLabel(1500), /^1\s500 participants$/);
});
