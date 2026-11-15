import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { providerRequest, type EmailMessage, type EmailProvider } from "./emails";
import { dataDirectory, localMode } from "./server";

/**
 * Envoi des e-mails. Le fournisseur se choisit par configuration, sans
 * dépendance : EMAIL_PROVIDER (resend ou brevo), EMAIL_API_KEY, EMAIL_FROM.
 *
 * - provider : les e-mails partent par l'API du fournisseur ;
 * - preview  : développement sans fournisseur, chaque e-mail est enregistré
 *              dans .eventheme/emails/ pour relecture, rien ne part ;
 * - off      : production sans fournisseur, aucun e-mail.
 */
export type MailMode = "provider" | "preview" | "off";

const provider = (): EmailProvider | null => {
  const value = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  return value === "resend" || value === "brevo" ? value : null;
};

export function mailMode(): MailMode {
  if (provider() && process.env.EMAIL_API_KEY && process.env.EMAIL_FROM) return "provider";
  return localMode() ? "preview" : "off";
}

export async function sendEmail(message: EmailMessage): Promise<MailMode> {
  const mode = mailMode();
  if (mode === "off" || (mode === "provider" && !message.to.length)) return "off";
  if (mode === "preview") {
    const directory = path.join(dataDirectory(), "emails");
    await mkdir(directory, { recursive: true });
    const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${message.key.replace(/[^a-z0-9-]+/gi, "-")}.html`;
    const comment = (value: string) => value.replace(/--/g, "‑‑");
    const header = `<!--\n  À : ${comment(message.to.join(", ") || "(équipe : EMAIL_TEAM à configurer)")}\n  Objet : ${comment(message.subject)}\n  Répondre à : ${comment(message.replyTo ?? "—")}\n-->\n`;
    await writeFile(path.join(directory, name), header + message.html, "utf8");
    return "preview";
  }
  const { url, init } = providerRequest(provider()!, message, process.env.EMAIL_FROM!, process.env.EMAIL_API_KEY!);
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
  if (!response.ok)
    throw new Error(
      `${provider()} a refusé l'e-mail « ${message.subject} » (HTTP ${response.status}) : ${(await response.text()).slice(0, 300)}`,
    );
  return "provider";
}
