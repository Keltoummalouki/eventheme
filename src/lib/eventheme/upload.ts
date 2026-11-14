import { dictionaries } from "@/data/locales";
import { fill, type Locale } from "@/lib/i18n";
import { MAX_ATTACHMENT_BYTES, type SentAttachment } from "./types";
import { sizeLabel } from "./requests";

/**
 * Envoi des pièces jointes d’une demande, dans le navigateur.
 *
 * Une photo de téléphone dépasse souvent la limite d’envoi : elle est réduite
 * (JPEG, 2 560 px au plus) avant de partir. Un PDF n’est jamais modifié.
 */

const IMAGE = /^image\/(jpeg|png|webp)$/;

async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    for (const [side, quality] of [[2560, 0.85], [2048, 0.8], [1600, 0.75]] as const) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext("2d");
      if (!context) break;
      // Les zones transparentes d’un PNG deviennent blanches, comme sur papier.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= MAX_ATTACHMENT_BYTES)
        return new File([blob], `${file.name.replace(/\.[^.]*$/, "") || "photo"}.jpg`, { type: "image/jpeg" });
    }
  } finally {
    bitmap.close();
  }
  return file;
}

/** Prépare un fichier pour l’envoi : réduit une photo trop lourde, laisse le reste intact. */
export async function prepareAttachment(file: File): Promise<File> {
  if (file.size <= MAX_ATTACHMENT_BYTES || !IMAGE.test(file.type)) return file;
  try {
    return await shrink(file);
  } catch {
    return file;
  }
}

/**
 * Envoie un fichier pour la demande `id`, avec le jeton remis à la demande de
 * rappel. Les messages d’erreur, y compris ceux du serveur, sont dans la langue de la page.
 */
export async function uploadAttachment(
  file: File,
  request: { id: string; token: string },
  locale: Locale = "fr",
): Promise<SentAttachment> {
  const t = dictionaries[locale].attachments;
  try {
    const prepared = await prepareAttachment(file);
    if (prepared.size > MAX_ATTACHMENT_BYTES)
      return { name: file.name, sent: false, error: fill(t.heavy, { size: sizeLabel(prepared.size, locale) }) };
    const response = await fetch("/api/inquiries/attachments", {
      method: "POST",
      headers: {
        "Content-Type": prepared.type || "application/octet-stream",
        "X-Request-Id": request.id,
        "X-Request-Token": request.token,
        "X-File-Name": encodeURIComponent(prepared.name),
        "X-Locale": locale,
      },
      body: prepared,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return { name: file.name, sent: false, error: result.error || t.failed };
    return { name: file.name, sent: true };
  } catch {
    return { name: file.name, sent: false, error: t.offline };
  }
}
