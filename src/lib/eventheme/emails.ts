import { brand } from "@/data/eventheme";
import { dictionaries } from "@/data/locales";
import { formatLongDate, parseIsoDate } from "@/lib/dates";
import { fill, intlLocale, localeOf, type Locale } from "@/lib/i18n";
import { localizeEntries } from "./translations";
import {
  daysLabel,
  hoursLabel,
  money,
  participantsLabel,
  referenceOf,
  variantLabel,
  type Entry,
  type Inquiry,
} from "./types";

/**
 * E-mails automatiques des demandes (cahier des charges §05 « Après l'envoi ») :
 * l'alerte à l'équipe (en français) et l'accusé de réception au client, dans
 * la langue de la page d'où il a écrit.
 *
 * Module pur : il compose les messages et les requêtes des fournisseurs, sans
 * rien envoyer. Tout ce que le visiteur a saisi est échappé.
 */

export type EmailMessage = {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Clé d'idempotence : un même e-mail n'est jamais envoyé deux fois. */
  key: string;
};
type Row = readonly [label: string, value: string];

const EMAIL = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/;
export const isEmail = (value: string) => EMAIL.test(value);

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
/** Objet sur une seule ligne, 200 caractères au plus. */
const oneLine = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 200);

/** « EVENTHEMES <devis@exemple.ma> » ou « devis@exemple.ma » → expéditeur. */
export function parseSender(from: string): { name?: string; email: string } | null {
  const match = from.trim().match(/^(?:"?([^"<]*?)"?\s*)?<([^<>\s]+)>$/);
  const email = match ? match[2] : from.trim();
  if (!isEmail(email)) return null;
  const name = match?.[1]?.trim();
  return name ? { name, email } : { email };
}

/** Adresses d'une liste « a@exemple.ma, b@exemple.ma » (virgules, points-virgules ou espaces). */
export const emailList = (value: string | undefined) => [
  ...new Set((value ?? "").split(/[,;\s]+/).map((item) => item.trim().toLowerCase()).filter(isEmail)),
];

/* --- Mise en page ------------------------------------------------------------ */

// Palette de la charte, et ses mélanges : lisibles sur le fond clair que tous les clients de messagerie affichent.
const color = { noir: "#08090b", or: "#c9a24a", label: "#53565b", line: "#e2e4e7", page: "#f3f4f5", foot: "#f7f8f8" };
const font = "Arial, Helvetica, sans-serif";

type Layout = {
  /** Langue du message (attribut lang, ponctuation de la version texte). */
  lang?: Locale;
  preheader: string;
  title: string;
  intro: string[];
  rows: Row[];
  outro?: string[];
  button?: { label: string; href: string };
  footer: string[];
};

const paragraph = (text: string) =>
  `<p style="margin:0 0 12px;font-family:${font};font-size:15px;line-height:1.6;color:${color.noir};">${escapeHtml(text)}</p>`;
const multiline = (text: string) => escapeHtml(text).replace(/\n/g, "<br>");

export function layout({ lang = "fr", preheader, title, intro, rows, outro = [], button, footer }: Layout) {
  // Arabe : de droite à gauche, posé sur chaque cellule (les messageries ignorent souvent <html dir>).
  const rtl = lang === "ar";
  const side = rtl ? "direction:rtl;text-align:right;" : "";
  const table = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:22px 0;font-family:${font};font-size:14px;line-height:1.5;">${rows
        .map(
          ([label, value]) =>
            `<tr><td style="${side}padding:${rtl ? "10px 0 10px 12px" : "10px 12px 10px 0"};border-bottom:1px solid ${color.line};color:${color.label};width:36%;vertical-align:top;">${escapeHtml(label)}</td><td style="${side}padding:10px 0;border-bottom:1px solid ${color.line};color:${color.noir};vertical-align:top;">${multiline(value)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const action = button
    ? `<p style="margin:26px 0 6px;"><a href="${escapeHtml(button.href)}" style="display:inline-block;background:${color.or};color:${color.noir};font-family:${font};font-size:14px;font-weight:bold;text-decoration:none;padding:13px 24px;">${escapeHtml(button.label)}</a></p>`
    : "";
  const html = `<!doctype html>
<html lang="${lang}" dir="${rtl ? "rtl" : "ltr"}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${color.page};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${color.page};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" dir="${rtl ? "rtl" : "ltr"}" style="max-width:600px;width:100%;background:#ffffff;border-collapse:collapse;">
<tr><td style="${side}background:${color.noir};padding:22px 32px;font-family:${font};font-size:18px;font-weight:bold;letter-spacing:4px;color:#ffffff;">${escapeHtml(brand.name)}<br><span style="font-size:10px;font-weight:normal;letter-spacing:3px;color:${color.or};">${escapeHtml(brand.sector.toUpperCase())}</span></td></tr>
<tr><td style="height:3px;line-height:3px;font-size:0;background:${color.or};">&nbsp;</td></tr>
<tr><td style="${side}padding:32px;">
<h1 style="margin:0 0 18px;font-family:${font};font-size:22px;line-height:1.3;font-weight:normal;color:${color.noir};">${escapeHtml(title)}</h1>
${intro.map(paragraph).join("\n")}
${table}
${outro.map(paragraph).join("\n")}
${action}
</td></tr>
<tr><td style="${side}padding:20px 32px;background:${color.foot};font-family:${font};font-size:12px;line-height:1.6;color:${color.label};">${footer.map(escapeHtml).join("<br>")}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  // « Libellé : valeur » en français, « Label: value » en anglais.
  const colon = lang === "fr" ? " : " : ": ";
  const text = [
    title,
    "",
    ...intro,
    ...(rows.length ? ["", ...rows.map(([label, value]) => `${label}${colon}${value.replace(/\n/g, "\n  ")}`)] : []),
    ...(outro.length ? ["", ...outro] : []),
    ...(button ? ["", `${button.label}${colon}${button.href}`] : []),
    "",
    "—",
    ...footer,
  ].join("\n");
  return { html, text };
}

/* --- Contenu des demandes ---------------------------------------------------- */

const titleOf = (entries: Entry[], id: string, kind: Entry["kind"]) =>
  entries.find((entry) => entry.id === id && entry.kind === kind)?.title;
const receivedOn = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Casablanca" }).format(new Date(iso));
/** L'événement et la sélection : communs à l'alerte (français) et au récapitulatif du client (sa langue). */
function eventRows(inquiry: Inquiry, entries: Entry[], locale: Locale = "fr"): Row[] {
  const t = dictionaries[locale].email.rows;
  const rows: Row[] = [];
  const event = titleOf(entries, inquiry.event, "events");
  if (event) rows.push([t.event, event]);
  const date = parseIsoDate(inquiry.date);
  if (date)
    rows.push([
      t.date,
      `${formatLongDate(date, intlLocale[locale])}${inquiry.duration ? ` · ${hoursLabel(inquiry.duration, locale)}` : ""}`,
    ]);
  const place = [inquiry.city, inquiry.address].filter(Boolean).join(", ");
  if (place) rows.push([t.place, place]);
  if (inquiry.kind === "quote")
    rows.push([t.participants, inquiry.guests ? participantsLabel(inquiry.guests, locale) : t.toSpecify]);
  const services = inquiry.basket.services.map((id) => titleOf(entries, id, "services") ?? id);
  if (services.length) rows.push([t.services, services.join(", ")]);
  const products = inquiry.basket.products.map(
    (item) => {
      const product = entries.find((entry) => entry.id === item.id && entry.kind === "products");
      return `${product?.title ?? item.id}${item.variant ? ` (${variantLabel(product, item.variant)})` : ""} × ${item.quantity}`;
    },
  );
  if (products.length)
    rows.push([t.equipment, `${products.join("\n")}\n${fill(t.rental, { days: daysLabel(inquiry.rentalDays || 1, locale) })}`]);
  if (inquiry.budget > 0) rows.push([t.budget, money(inquiry.budget, locale)]);
  return rows;
}

const kindLabel = (inquiry: Inquiry) =>
  inquiry.kind === "callback" ? "Rappel demandé" : inquiry.kind === "quote" ? "Demande de devis" : "Message";

/** Alerte à l'équipe : toutes les informations utiles pour rappeler le client. */
export function teamEmail(
  inquiry: Inquiry,
  entries: Entry[],
  options: { to: string[]; adminUrl?: string; completed?: boolean; pendingAttachments?: number },
): EmailMessage {
  const reference = referenceOf(inquiry);
  const clientLanguage = localeOf(inquiry.locale);
  const date = parseIsoDate(inquiry.date);
  const subject = oneLine(
    [
      kindLabel(inquiry),
      reference,
      inquiry.kind === "contact" ? inquiry.subject || "Contact" : titleOf(entries, inquiry.event, "events"),
      inquiry.kind !== "contact" && date && formatLongDate(date),
      inquiry.kind !== "contact" && inquiry.city,
    ]
      .filter(Boolean)
      .join(" · "),
  );
  const rows: Row[] = [
    ["Référence", reference],
    ["Reçue le", receivedOn(inquiry.createdAt)],
    ["Client", [inquiry.name, inquiry.company].filter(Boolean).join(" · ")],
    ["Téléphone", inquiry.phone],
    ...(inquiry.email ? [["E-mail", inquiry.email] as const] : []),
    ["Contact préféré", inquiry.contactMethod || "—"],
    // L'équipe répond dans la langue du client.
    ...(clientLanguage === "en"
      ? [["Langue", "Anglais : répondre en anglais"] as const]
      : clientLanguage === "ar"
        ? [["Langue", "Arabe : répondre en arabe"] as const]
        : []),
    ...eventRows(inquiry, entries),
    ...(inquiry.kind === "quote"
      ? [
          [
            "Montant indicatif",
            inquiry.estimate > 0
              ? `${money(inquiry.estimate)}${inquiry.hasUnpriced ? " (hors postes sur devis)" : ""}`
              : "Sur devis",
          ] as const,
        ]
      : []),
    ...(options.pendingAttachments
      ? [["Pièces jointes", `${options.pendingAttachments} fichier(s) joint(s) : à télécharger dans l'administration`] as const]
      : []),
    ...(inquiry.subject ? [["Objet", inquiry.subject] as const] : []),
    ...(inquiry.message ? [["Message", inquiry.message] as const] : []),
  ];
  const intro = [
    inquiry.kind === "callback"
      ? "Un visiteur demande à être rappelé."
      : inquiry.kind === "quote"
        ? options.completed
          ? "Le client a complété sa demande de rappel par une demande de devis détaillée."
          : "Nouvelle demande de devis reçue sur le site."
        : "Nouveau message reçu sur le site.",
    ...(inquiry.email ? ["Répondez à cet e-mail pour écrire directement au client."] : []),
  ];
  const { html, text } = layout({
    preheader: subject,
    title: `${kindLabel(inquiry)} · ${reference}`,
    intro,
    rows,
    button: options.adminUrl ? { label: "Ouvrir l'administration", href: options.adminUrl } : undefined,
    footer: [`${brand.name} — alerte automatique du site.`],
  });
  return {
    to: options.to,
    subject,
    html,
    text,
    replyTo: inquiry.email || undefined,
    key: `${inquiry.id}/${options.completed ? "quote" : inquiry.kind}/team`,
  };
}

/** Accusé de réception au client, s'il a donné son e-mail, dans la langue de sa demande. */
export function clientEmail(
  inquiry: Inquiry,
  entries: Entry[],
  options: { whatsappUrl?: string; replyTo?: string; completed?: boolean },
): EmailMessage | null {
  if (!inquiry.email || !isEmail(inquiry.email)) return null;
  const locale = localeOf(inquiry.locale);
  const dictionary = dictionaries[locale];
  const t = dictionary.email;
  // Titres des services, du matériel et des événements dans la langue du client.
  const content = localizeEntries(entries, locale);
  const reference = referenceOf(inquiry);
  const firstName = inquiry.name.trim().split(/\s+/)[0] || "";
  const hello = fill(t.hello, { name: firstName ? ` ${firstName}` : "" });
  const ways: Record<string, string> = t.ways;
  const way = ways[inquiry.contactMethod] ?? "";
  let subject: string;
  let title: string;
  let intro: string[];
  let rows: Row[] = [[t.reference, reference]];
  let outro: string[] = [];
  if (inquiry.kind === "contact") {
    subject = fill(t.contact.subject, { reference });
    title = t.contact.title;
    intro = [hello, fill(t.contact.text, { brand: brand.name })];
    if (inquiry.subject) rows = [...rows, [t.subject, inquiry.subject]];
  } else if (inquiry.kind === "callback") {
    subject = fill(t.callback.subject, { reference });
    title = t.callback.title;
    intro = [hello, fill(t.callback.text, { brand: brand.name, way })];
    rows = [...rows, ...eventRows(inquiry, content, locale)];
  } else {
    subject = fill(t.quote.subject, { reference });
    title = t.quote.title;
    intro = [hello, fill(t.quote.text, { way })];
    rows = [
      ...rows,
      ...eventRows(inquiry, content, locale),
      [t.estimate, inquiry.estimate > 0 ? money(inquiry.estimate, locale) : dictionary.format.onRequest],
      ...(inquiry.message ? [[t.notes, inquiry.message] as const] : []),
    ];
    outro = [t.quote.disclaimer];
  }
  const { html, text } = layout({
    lang: locale,
    preheader: intro[1] ?? subject,
    title,
    intro,
    rows,
    outro,
    button: options.whatsappUrl ? { label: t.whatsapp, href: options.whatsappUrl } : undefined,
    footer: [`${brand.name} — ${dictionary.brand.baseline}.`, t.footer],
  });
  return {
    to: [inquiry.email],
    subject: oneLine(subject),
    html,
    text,
    replyTo: options.replyTo,
    key: `${inquiry.id}/${options.completed ? "quote" : inquiry.kind}/client`,
  };
}

/* --- Fournisseurs -------------------------------------------------------------- */

export type EmailProvider = "resend" | "brevo";

/**
 * Requête HTTP du fournisseur choisi (sans SDK). Brevo n'accepte qu'un seul
 * corps de message par requête : la version HTML.
 */
export type ProviderRequest = {
  url: string;
  init: { method: "POST"; headers: Record<string, string>; body: string };
};
export function providerRequest(
  provider: EmailProvider,
  message: EmailMessage,
  from: string,
  apiKey: string,
): ProviderRequest {
  if (provider === "resend")
    return {
      url: "https://api.resend.com/emails",
      init: {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": message.key },
        body: JSON.stringify({
          from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
      },
    };
  const sender = parseSender(from);
  if (!sender) throw new Error("EMAIL_FROM invalide : « Nom <adresse@domaine> » attendu.");
  return {
    url: "https://api.brevo.com/v3/smtp/email",
    init: {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender,
        to: message.to.map((email) => ({ email })),
        subject: message.subject,
        htmlContent: message.html,
        ...(message.replyTo ? { replyTo: { email: message.replyTo } } : {}),
      }),
    },
  };
}
