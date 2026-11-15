import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { seed } from "@/data/eventheme";
import { localeOf } from "@/lib/i18n";
import {
  MAX_ATTACHMENTS,
  normalizeStatus,
  type Attachment,
  type AttachmentType,
  type Entry,
  type Inquiry,
} from "./types";
import { verifyContinuation } from "./continuation";
import { attachmentPath, moroccanYear, nextReference } from "./requests";
import { adminLogin, authConfigured, hasAdminRole } from "./auth";
export { authConfigured } from "./auth";

export const configured = () =>
  Boolean(
    process.env.EVENTHEME_DATA_MODE === "supabase" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SECRET_KEY,
  );
export const localMode = () =>
  process.env.EVENTHEME_DATA_MODE !== "supabase" && process.env.NODE_ENV !== "production";
export async function authClient() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* The proxy refreshes cookies before Server Component rendering. */
          }
        },
      },
    },
  );
}
function database() {
  if (!configured())
    throw new Error(
      "La base de données doit être configurée avant la mise en ligne.",
    );
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
// Every mode, including local data, requires a Supabase account with the admin role.
// getUser() asks the Auth server, so a deleted or demoted account loses access at once.
export async function isAdmin() {
  if (!authConfigured()) return false;
  const client = await authClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  return !error && hasAdminRole(user);
}
export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("UNAUTHORIZED");
}
// For admin pages: send anyone without an admin session to the login page.
export async function verifyAdmin() {
  if (!(await isAdmin())) redirect(adminLogin);
}

type LocalStore = { entries: Entry[]; inquiries: Inquiry[] };
/** Données locales : `.eventheme/`, ou le dossier de EVENTHEME_DATA_DIR (tests, démonstration isolée). */
const directory = process.env.EVENTHEME_DATA_DIR ? path.resolve(process.env.EVENTHEME_DATA_DIR) : path.join(process.cwd(), ".eventheme");
export const dataDirectory = () => directory;
const file = path.join(directory, "data.json");
async function localRead(): Promise<LocalStore> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return { entries: structuredClone(seed), inquiries: [] };
  }
}
// Share the write queue across route bundles and development hot reloads.
const localState = globalThis as typeof globalThis & { eventhemeWriteQueue?: Promise<void> };
async function localWrite(edit: (data: LocalStore) => void) {
  const next = (localState.eventhemeWriteQueue ?? Promise.resolve()).then(async () => {
    const data = await localRead();
    edit(data);
    await mkdir(directory, { recursive: true });
    const temporary = `${file}.tmp`;
    await writeFile(temporary, JSON.stringify(data, null, 2), "utf8");
    await rename(temporary, file);
  });
  localState.eventhemeWriteQueue = next.catch(() => {});
  await next;
}
export async function getEntries(includeDrafts = false): Promise<Entry[]> {
  let entries: Entry[];
  if (localMode()) entries = (await localRead()).entries;
  else if (!configured())
    entries = seed; // Static preview only; submissions/admin remain closed in production.
  else {
    const { data, error } = await database()
      .from("content")
      .select("data")
      .order("created_at");
    if (error) throw error;
    entries = data.map((row) => row.data as Entry);
  }
  return includeDrafts ? entries : entries.filter((entry) => entry.published);
}
export async function saveEntry(entry: Entry) {
  if (localMode())
    return localWrite((data) => {
      const index = data.entries.findIndex((e) => e.id === entry.id);
      if (index < 0) data.entries.push(entry);
      else data.entries[index] = entry;
    });
  const { error } = await database()
    .from("content")
    .upsert({
      id: entry.id,
      kind: entry.kind,
      published: entry.published,
      data: entry,
    });
  if (error) throw error;
}
export async function deleteEntry(id: string) {
  if (localMode())
    return localWrite((data) => {
      data.entries = data.entries.filter((e) => e.id !== id);
    });
  const { error } = await database().from("content").delete().eq("id", id);
  if (error) throw error;
}
/** Demandes antérieures : statut d’avant le cahier des charges EVENTHEMES, champs absents. */
const normalizeInquiry = (inquiry: Inquiry): Inquiry => ({
  ...inquiry,
  status: normalizeStatus(inquiry.status),
  budget: inquiry.budget || 0,
  locale: localeOf(inquiry.locale),
});
export async function getInquiries(): Promise<Inquiry[]> {
  if (localMode())
    return (await localRead()).inquiries
      .map(normalizeInquiry)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const { data, error } = await database()
    .from("inquiries")
    .select("data")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => normalizeInquiry(row.data as Inquiry));
}
export async function getInquiry(id: string): Promise<Inquiry | undefined> {
  if (localMode()) {
    const inquiry = (await localRead()).inquiries.find((item) => item.id === id);
    return inquiry && normalizeInquiry(inquiry);
  }
  const { data, error } = await database().from("inquiries").select("data").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeInquiry(data.data as Inquiry) : undefined;
}
/**
 * Enregistre une nouvelle demande avec sa référence « EVT-AAAA-NNNN ».
 * En production, la séquence Postgres garantit l’unicité ; si la migration
 * n’est pas encore appliquée, la demande est tout de même enregistrée, avec
 * une référence tirée de son identifiant.
 */
export async function createInquiry(inquiry: Omit<Inquiry, "reference">): Promise<Inquiry> {
  if (localMode()) {
    let saved: Inquiry | undefined;
    await localWrite((data) => {
      saved = { ...inquiry, reference: nextReference(data.inquiries.map((item) => item.reference), moroccanYear()) };
      data.inquiries.push(saved);
    });
    return saved!;
  }
  const sequence = await database().rpc("next_inquiry_reference");
  if (sequence.error) console.error("next_inquiry_reference indisponible : appliquez les migrations Supabase.", sequence.error);
  const saved: Inquiry = {
    ...inquiry,
    reference: sequence.error ? `EVT-${inquiry.id.slice(0, 8).toUpperCase()}` : String(sequence.data),
  };
  const { error } = await database().from("inquiries").insert({ id: saved.id, data: saved });
  if (error) throw error;
  return saved;
}
export async function saveInquiry(inquiry: Inquiry) {
  if (localMode())
    return localWrite((data) => {
      const index = data.inquiries.findIndex((e) => e.id === inquiry.id);
      if (index < 0) data.inquiries.push(inquiry);
      else data.inquiries[index] = inquiry;
    });
  const { error } = await database()
    .from("inquiries")
    .upsert({ id: inquiry.id, data: inquiry });
  if (error) throw error;
}
// Pièces jointes des demandes : dossier privé, hors de public/, jamais servi directement.
const REQUESTS_BUCKET = "eventheme-requests";
const attachmentsDirectory = path.join(directory, "attachments");
const localAttachment = (relative: string) => path.join(attachmentsDirectory, ...relative.split("/"));
export async function deleteInquiry(id: string) {
  // Les fichiers du client partent avec sa demande.
  if (localMode()) {
    await rm(path.join(attachmentsDirectory, id), { recursive: true, force: true });
    return localWrite((data) => {
      data.inquiries = data.inquiries.filter((e) => e.id !== id);
    });
  }
  const storage = database().storage.from(REQUESTS_BUCKET);
  const { data: files } = await storage.list(id);
  if (files?.length) {
    const removal = await storage.remove(files.map((file) => `${id}/${file.name}`));
    if (removal.error) throw removal.error;
  }
  const { error } = await database().from("inquiries").delete().eq("id", id);
  if (error) throw error;
}
/**
 * Ajoute une pièce jointe à une demande. Le jeton de personnalisation remis au
 * client à sa demande de rappel autorise l’envoi pendant 24 heures, dans la
 * limite de MAX_ATTACHMENTS fichiers.
 */
export async function addAttachment(
  id: string,
  token: unknown,
  file: { name: string; type: AttachmentType; bytes: Buffer },
): Promise<Attachment> {
  const attachment: Attachment = {
    id: randomUUID(),
    name: file.name,
    type: file.type,
    size: file.bytes.length,
    uploadedAt: new Date().toISOString(),
  };
  const append = (previous: Inquiry | undefined): Inquiry => {
    verifyContinuation(previous, token);
    if (!previous) throw new Error("Demande introuvable.");
    if ((previous.attachments?.length ?? 0) >= MAX_ATTACHMENTS)
      throw new Error(`${MAX_ATTACHMENTS} pièces jointes au plus par demande.`);
    return { ...previous, attachments: [...(previous.attachments ?? []), attachment] };
  };
  const target = attachmentPath(id, attachment);
  if (localMode()) {
    append((await localRead()).inquiries.find((item) => item.id === id));
    const location = localAttachment(target);
    await mkdir(path.dirname(location), { recursive: true });
    await writeFile(location, file.bytes);
    try {
      await localWrite((data) => {
        const index = data.inquiries.findIndex((item) => item.id === id);
        data.inquiries[index] = append(data.inquiries[index]);
      });
    } catch (error) {
      await rm(location, { force: true });
      throw error;
    }
    return attachment;
  }
  const read = async () => {
    const { data, error } = await database().from("inquiries").select("data").eq("id", id).maybeSingle();
    if (error) throw error;
    return data?.data as Inquiry | undefined;
  };
  append(await read());
  const storage = database().storage.from(REQUESTS_BUCKET);
  const upload = await storage.upload(target, file.bytes, { contentType: file.type, upsert: false });
  if (upload.error) throw upload.error;
  try {
    // Compare-and-swap: a status or note changed meanwhile by the team is kept.
    for (let attempt = 0; attempt < 3; attempt++) {
      const previous = await read();
      const next = append(previous);
      const update = await database().from("inquiries").update({ data: next })
        .eq("id", id).eq("data", JSON.stringify(previous)).select("id");
      if (update.error) throw update.error;
      if (update.data?.length) return attachment;
    }
    throw new Error("La demande vient d’être modifiée. Réessayez dans un instant.");
  } catch (error) {
    await storage.remove([target]);
    throw error;
  }
}
/** Contenu d’une pièce jointe pour l’administration : lien signé d’une minute, ou fichier local. */
export async function attachmentDownload(inquiryId: string, fileId: string) {
  const inquiry = await getInquiry(inquiryId);
  const attachment = inquiry?.attachments?.find((item) => item.id === fileId);
  if (!inquiry || !attachment) throw new Error("Pièce jointe introuvable.");
  const target = attachmentPath(inquiry.id, attachment);
  if (localMode()) return { attachment, bytes: await readFile(localAttachment(target)) };
  const { data, error } = await database().storage
    .from(REQUESTS_BUCKET)
    .createSignedUrl(target, 60, { download: attachment.name });
  if (error) throw error;
  return { attachment, url: data.signedUrl };
}
// Compare-and-swap preserves any admin status/notes changed during customization.
// `fresh` is false when a retry finds the request already completed: no second notification.
export async function completeCallback(
  id: string,
  token: unknown,
  quote: Omit<Inquiry, "reference">,
): Promise<{ inquiry: Inquiry; fresh: boolean }> {
  const merge = (previous: Inquiry | undefined): Inquiry => {
    verifyContinuation(previous, token);
    if (!previous) throw new Error("Demande introuvable.");
    if (previous.kind === "quote") return previous; // A retry returns the first accepted result.
    if (previous.kind !== "callback") throw new Error("Demande invalide.");
    return { ...quote, id, reference: previous.reference, createdAt: previous.createdAt, status: previous.status,
      notes: previous.notes, attachments: previous.attachments, continuationHash: previous.continuationHash,
      completedAt: new Date().toISOString() };
  };
  if (localMode()) {
    let saved: Inquiry | undefined;
    let fresh = false;
    await localWrite(data => {
      const index = data.inquiries.findIndex(item => item.id === id);
      const previous = data.inquiries[index];
      saved = merge(previous);
      fresh = saved !== previous;
      data.inquiries[index] = saved;
    });
    return { inquiry: saved!, fresh };
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await database().from("inquiries").select("data").eq("id", id).maybeSingle();
    if (error) throw error;
    const previous = data?.data as Inquiry | undefined;
    const next = merge(previous);
    if (previous?.kind === "quote") return { inquiry: next, fresh: false };
    const update = await database().from("inquiries").update({ data: next })
      .eq("id", id).eq("data", JSON.stringify(previous)).select("id");
    if (update.error) throw update.error;
    if (update.data?.length) return { inquiry: next, fresh: true };
  }
  throw new Error("La demande vient d’être modifiée. Réessayez dans un instant.");
}
// Atomic DB rate limiting works across production instances. Local limits are development-only.
const attempts = new Map<string, { count: number; until: number }>();
export async function rateLimit(key: string, limit = 5) {
  if (configured()) {
    const { data, error } = await database().rpc("consume_rate_limit", {
      bucket_key: key,
      max_attempts: limit,
    });
    if (error) throw error;
    if (!data)
      throw new Error("Trop de tentatives. Réessayez dans quinze minutes.");
    return;
  }
  const now = Date.now();
  for (const [id, bucket] of attempts)
    if (bucket.until < now) attempts.delete(id);
  const bucket = attempts.get(key) ?? { count: 0, until: now + 15 * 60000 };
  if (++bucket.count > limit)
    throw new Error("Trop de tentatives. Réessayez dans quinze minutes.");
  attempts.set(key, bucket);
}
/**
 * Instant de référence des statistiques, daté par le serveur : la page rendue
 * et la page hydratée comptent ainsi les mêmes journées. Asynchrone à dessein,
 * pour rester hors du rendu des composants.
 */
export async function serverNow() {
  return Date.now();
}
