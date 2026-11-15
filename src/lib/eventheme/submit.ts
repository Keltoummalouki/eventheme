import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { continuationHash } from "@/lib/eventheme/continuation";
import {
  getEntries,
  localMode,
  configured,
  rateLimit,
  createInquiry,
  completeCallback,
} from "@/lib/eventheme/server";
import { clientMailExpected, notifyRequest } from "@/lib/eventheme/notifications";
import { validateInquiry } from "@/lib/eventheme/validation";
import { estimate } from "@/lib/eventheme/pricing";
import { checkOrigin, clientAddress, readBody } from "@/lib/eventheme/http";
import { translateServerError } from "@/data/locales/errors";
import { localeOf } from "@/lib/i18n";
import { MAX_ATTACHMENTS, referenceOf, type Inquiry } from "@/lib/eventheme/types";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
/** Tâche lancée après la réponse (Next : `after`) : les e-mails ne retardent pas le formulaire. */
export type Schedule = (task: () => Promise<void>) => void;

/**
 * Demande publique (rappel, devis, message) : validée, limitée, enregistrée,
 * puis notifiée par e-mail via `schedule`. Séparée de la route pour être testée.
 */
export async function submitInquiry(request: Request, schedule: Schedule): Promise<Response> {
  // Langue de la page d’origine : celle des messages d’erreur et de l’accusé de réception.
  const locale = localeOf(request.headers.get("x-locale"));
  try {
    checkOrigin(request);
    if (!localMode() && !configured())
      return Response.json(
        {
          error: translateServerError(
            "Les demandes en ligne seront disponibles prochainement. Contactez-nous sur WhatsApp.",
            locale,
          ),
        },
        { status: 503 },
      );
    const entries = await getEntries();
    const body = await readBody(request);
    const input = validateInquiry(body, entries);
    // Two independent limits: per phone number, and per network address (hashed, never stored raw).
    await rateLimit(`submit:${hash(input.phone.replace(/\D/g, ""))}`);
    const address = clientAddress(request);
    if (address) await rateLimit(`submit-ip:${hash(address)}`, 20);
    const calculation = input.kind === "quote" ? estimate(entries, input, input.basket) : { total: 0, hasUnpriced: false, summary: [] as string[] };
    const token = input.kind === "callback" ? randomBytes(32).toString("hex") : undefined;
    const inquiry: Omit<Inquiry, "reference"> = {
      ...input,
      locale,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: "Nouveau",
      notes: "",
      estimate: calculation.total,
      hasUnpriced: calculation.hasUnpriced,
      summary: calculation.summary,
      ...(token ? { continuationHash: continuationHash(token) } : {}),
    };
    const extra = body as { callbackId?: unknown; token?: unknown; attachments?: unknown };
    const completed = extra.callbackId !== undefined;
    let saved: Inquiry;
    let fresh = true;
    if (completed) {
      if (input.kind !== "quote" || typeof extra.callbackId !== "string" || !/^[a-f0-9-]{36}$/.test(extra.callbackId))
        throw new Error("Référence de demande invalide.");
      ({ inquiry: saved, fresh } = await completeCallback(extra.callbackId, extra.token, inquiry));
    } else saved = await createInquiry(inquiry);
    // E-mails après la réponse : ils ne ralentissent ni ne font échouer l'envoi du formulaire.
    if (fresh) {
      const pendingAttachments = Math.max(0, Math.min(MAX_ATTACHMENTS, Math.floor(Number(extra.attachments) || 0)));
      schedule(() => notifyRequest(saved, entries, { completed, pendingAttachments }));
    }
    return Response.json(
      { id: saved.id, reference: referenceOf(saved), local: localMode(), emailed: fresh && clientMailExpected(saved),
        ...(token ? { token } : {}),
        ...(input.kind === "quote" ? { estimate: saved.estimate, hasUnpriced: saved.hasUnpriced, summary: saved.summary } : {}) },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        error: translateServerError(
          error instanceof Error ? error.message : "Impossible d’enregistrer la demande.",
          locale,
        ),
      },
      { status: 400 },
    );
  }
}
