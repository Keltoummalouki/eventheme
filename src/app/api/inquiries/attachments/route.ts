import { createHash } from "node:crypto";
import { addAttachment, configured, localMode, rateLimit } from "@/lib/eventheme/server";
import { checkOrigin, clientAddress, readBytes } from "@/lib/eventheme/http";
import { attachmentName, sizeLabel, sniffAttachment } from "@/lib/eventheme/requests";
import { MAX_ATTACHMENT_BYTES } from "@/lib/eventheme/types";
import { translateServerError } from "@/data/locales/errors";
import { localeOf } from "@/lib/i18n";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

/**
 * Pièce jointe d’une demande de devis (plans, photos, documents).
 *
 * Un fichier par requête, envoyé brut : en-têtes `x-request-id` (demande),
 * `x-request-token` (jeton remis à la demande de rappel) et `x-file-name`
 * (nom d’origine, encodé), `x-locale` (langue des messages d’erreur). Le type est déterminé par le contenu, jamais par
 * l’en-tête ; le fichier est rangé sous un identifiant aléatoire, dans un
 * stockage privé.
 */
export async function POST(request: Request) {
  const locale = localeOf(request.headers.get("x-locale"));
  try {
    checkOrigin(request);
    if (!localMode() && !configured())
      return Response.json(
        { error: translateServerError("L’envoi de fichiers n’est pas encore disponible.", locale) },
        { status: 503 },
      );
    const id = request.headers.get("x-request-id") ?? "";
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Référence de demande invalide.");
    await rateLimit(`attach:${id}`, 10);
    const address = clientAddress(request);
    if (address) await rateLimit(`attach-ip:${hash(address)}`, 30);
    const bytes = await readBytes(request, MAX_ATTACHMENT_BYTES).catch((error: Error) => {
      throw /volumineuses/.test(error.message)
        ? new Error(`Fichier trop lourd : ${sizeLabel(MAX_ATTACHMENT_BYTES)} au plus.`)
        : error;
    });
    if (!bytes.length) throw new Error("Fichier vide.");
    const type = sniffAttachment(bytes);
    if (!type) throw new Error("Format non reconnu : envoyez un PDF, un JPG, un PNG ou un WebP.");
    const attachment = await addAttachment(id, request.headers.get("x-request-token"), {
      name: attachmentName(request.headers.get("x-file-name") ?? "", type),
      type,
      bytes,
    });
    return Response.json({ attachment }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: translateServerError(error instanceof Error ? error.message : "Envoi du fichier impossible.", locale) },
      { status: 400 },
    );
  }
}
