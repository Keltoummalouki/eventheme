import { dictionaries } from "@/data/locales";
import { fill, intlLocale, type Locale } from "@/lib/i18n";
import { attachmentTypes, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS, type AttachmentType } from "./types";

/* --- Références ------------------------------------------------------------ */

const REFERENCE = /^EVT-(\d{4})-(\d+)$/;

/** « EVT-2026-0042 » : l’année de réception, puis un compteur sur quatre chiffres au moins. */
export const formatReference = (year: number, sequence: number) =>
  `EVT-${year}-${String(sequence).padStart(4, "0")}`;

/**
 * Prochaine référence du stockage local. Le compteur est unique et ne repart
 * pas à zéro chaque année : même règle que la séquence Postgres en production.
 */
export function nextReference(existing: readonly (string | undefined)[], year: number) {
  const highest = existing.reduce((max, reference) => {
    const match = reference?.match(REFERENCE);
    return match ? Math.max(max, Number(match[2])) : max;
  }, 0);
  return formatReference(year, highest + 1);
}

/** Année en cours au Maroc, comme `next_inquiry_reference()` côté base de données. */
export const moroccanYear = (now = new Date()) =>
  Number(new Intl.DateTimeFormat("en", { timeZone: "Africa/Casablanca", year: "numeric" }).format(now));

/* --- Pièces jointes -------------------------------------------------------- */

export const ATTACHMENT_ACCEPT = Object.keys(attachmentTypes).join(",");
/** « PDF, JPG, PNG ou WebP · 3 fichiers · 4 Mo chacun ». */
export const attachmentHint = (locale: Locale = "fr") =>
  fill(dictionaries[locale].attachments.hint, { count: MAX_ATTACHMENTS, size: sizeLabel(MAX_ATTACHMENT_BYTES, locale) });

/**
 * Type réel d’un fichier, lu dans ses premiers octets. Le nom et le type
 * annoncés par le navigateur ne font pas foi.
 */
export function sniffAttachment(bytes: Uint8Array): AttachmentType | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  // La norme PDF tolère quelques octets avant l’en-tête.
  if (ascii(0, 1024).includes("%PDF-")) return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte)) return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/**
 * Nom d’origine nettoyé pour l’affichage : sans dossier ni caractère de
 * contrôle, 120 caractères au plus, avec l’extension du type réel. Le fichier
 * est toujours enregistré sous un identifiant aléatoire, jamais sous ce nom.
 */
export function attachmentName(raw: string, type: AttachmentType) {
  let name = raw;
  try {
    name = decodeURIComponent(raw);
  } catch {}
  const extension = attachmentTypes[type];
  const printable = [...(name.split(/[\\/]/).pop() ?? "")]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127 && !'<>:"|?*'.includes(character);
    })
    .join("");
  const base = printable.replace(/\.[^.]*$/, "").trim().slice(0, 110);
  return `${base || "piece-jointe"}.${extension}`;
}

/** Chemin de stockage, dans le dossier privé de la demande. */
export const attachmentPath = (inquiryId: string, attachment: { id: string; type: AttachmentType }) =>
  `${inquiryId}/${attachment.id}.${attachmentTypes[attachment.type]}`;

export function sizeLabel(bytes: number, locale: Locale = "fr") {
  const t = dictionaries[locale].attachments;
  return bytes >= 1024 * 1024
    ? fill(t.megabytes, { size: new Intl.NumberFormat(intlLocale[locale], { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024) })
    : fill(t.kilobytes, { size: Math.max(1, Math.round(bytes / 1024)) });
}

/**
 * Premier contrôle, dans le navigateur : type annoncé et poids. Une photo trop
 * lourde est réduite avant l’envoi ; un PDF trop lourd ne peut pas l’être.
 */
export function attachmentProblem(file: { name: string; type: string; size: number }, locale: Locale = "fr"): string | null {
  const t = dictionaries[locale].attachments;
  if (!(file.type in attachmentTypes)) return fill(t.badType, { name: file.name });
  if (file.type === "application/pdf" && file.size > MAX_ATTACHMENT_BYTES)
    return fill(t.tooLarge, { name: file.name, size: sizeLabel(MAX_ATTACHMENT_BYTES, locale) });
  return null;
}
