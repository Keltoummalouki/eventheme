export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected =
    process.env.NODE_ENV !== "production" &&
    process.env.EVENTHEME_DATA_MODE !== "supabase"
      ? new URL(request.url).origin
      : process.env.APP_URL || new URL(request.url).origin;
  if (!origin || new URL(origin).origin !== new URL(expected).origin)
    throw new Error("Origine non autorisée.");
}
/**
 * Adresse du client, telle que transmise par l’hébergeur (première entrée de
 * x-forwarded-for). Absente en développement : le contrôle est alors ignoré.
 */
export function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "";
}
export async function readBody(request: Request): Promise<unknown> {
  return JSON.parse((await readBytes(request, 100000)).toString("utf8"));
}
export async function readBytes(request: Request, maximum: number) {
  if (Number(request.headers.get("content-length")) > maximum)
    throw new Error("Données trop volumineuses.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Formulaire vide.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maximum) {
      await reader.cancel();
      throw new Error("Données trop volumineuses.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
