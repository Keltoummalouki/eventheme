import { attachmentDownload, requireAdmin } from "@/lib/eventheme/server";
export const dynamic = "force-dynamic";

/**
 * Téléchargement d’une pièce jointe par l’équipe. Le proxy refuse déjà
 * /api/admin sans session ; le compte est revérifié ici. En production, le
 * fichier est servi par un lien signé valable une minute.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const query = new URL(request.url).searchParams;
    const { attachment, url, bytes } = await attachmentDownload(query.get("demande") ?? "", query.get("fichier") ?? "");
    if (url) return Response.redirect(url, 302);
    return new Response(new Uint8Array(bytes!), {
      headers: {
        "Content-Type": attachment.type,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Téléchargement impossible.";
    return Response.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : 404 });
  }
}
