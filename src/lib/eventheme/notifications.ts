import "server-only";
import { createHash } from "node:crypto";
import { clientEmail, emailList, teamEmail } from "./emails";
import { mailMode, sendEmail } from "./mailer";
import { rateLimit } from "./server";
import { findSocial, referenceOf, type Entry, type Inquiry } from "./types";

/**
 * Destinataires des alertes : EMAIL_TEAM, sinon l'adresse publique du lien
 * « E-mail » de « Contact & réseaux » (modifiable sans code).
 */
export function teamRecipients(entries: Entry[]) {
  const configured = emailList(process.env.EMAIL_TEAM);
  if (configured.length) return configured;
  const link = findSocial(entries, "email")?.url;
  if (!link?.startsWith("mailto:")) return [];
  try {
    return emailList(decodeURIComponent(link.slice("mailto:".length).split("?")[0]));
  } catch {
    return [];
  }
}

/** Un accusé de réception partira-t-il vraiment ? (Fournisseur configuré et e-mail du client connu.) */
export const clientMailExpected = (inquiry: Pick<Inquiry, "email">) => mailMode() === "provider" && Boolean(inquiry.email);

/**
 * Après l'enregistrement d'une demande : alerte à l'équipe et accusé de
 * réception au client. Ne lève jamais : un e-mail en échec n'annule pas une
 * demande déjà enregistrée, il est seulement consigné dans les journaux.
 */
export async function notifyRequest(
  inquiry: Inquiry,
  entries: Entry[],
  options: { completed: boolean; pendingAttachments: number },
) {
  const mode = mailMode();
  if (mode === "off") return;
  const team = teamRecipients(entries);
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  const sends: Promise<unknown>[] = [];
  // En aperçu local, l'alerte est enregistrée même sans destinataire, pour relecture.
  if (team.length || mode === "preview")
    sends.push(
      sendEmail(teamEmail(inquiry, entries, { to: team, adminUrl: appUrl && `${appUrl}/admin`, ...options })),
    );
  else console.warn("Alerte e-mail non envoyée : définissez EMAIL_TEAM ou un lien « E-mail » dans Contact & réseaux.");
  const acknowledgement = clientEmail(inquiry, entries, {
    whatsappUrl: findSocial(entries, "whatsapp")?.url,
    replyTo: team[0],
    completed: options.completed,
  });
  if (acknowledgement) {
    try {
      // Garde-fou : le formulaire ne doit pas servir à inonder une adresse d'e-mails.
      await rateLimit(`ack:${createHash("sha256").update(inquiry.email.trim().toLowerCase()).digest("hex")}`, 3);
      sends.push(sendEmail(acknowledgement));
    } catch {
      console.warn(`Accusé de réception de ${referenceOf(inquiry)} non envoyé : limite d'envois vers cette adresse atteinte.`);
    }
  }
  for (const result of await Promise.allSettled(sends))
    if (result.status === "rejected") console.error("E-mail non envoyé :", result.reason);
}
