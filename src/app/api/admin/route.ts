import {
  requireAdmin,
  getEntries,
  getInquiries,
  getInquiry,
  saveEntry,
  deleteEntry,
  saveInquiry,
  deleteInquiry,
} from "@/lib/eventheme/server";
import { catalogueProblem, categoryInUse } from "@/lib/eventheme/catalogue";
import { validateEntry } from "@/lib/eventheme/validation";
import { checkOrigin, readBody } from "@/lib/eventheme/http";
import { statuses, type Status } from "@/lib/eventheme/types";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireAdmin();
    return Response.json(
      { entries: await getEntries(true), inquiries: await getInquiries() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Connexion administrateur requise." },
      { status: 401 },
    );
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireAdmin();
    const body = (await readBody(request)) as {
      action: string;
      value: unknown;
      id: string;
      status: Status;
      notes: string;
    };
    if (body.action === "save") {
      const entry = validateEntry(body.value);
      const problem = catalogueProblem(await getEntries(true), entry);
      if (problem) throw new Error(problem);
      await saveEntry(entry);
    } else if (body.action === "delete") {
      const entries = await getEntries(true);
      const target = entries.find((entry) => entry.id === String(body.id));
      const inUse = target?.kind === "categories" ? categoryInUse(entries, target.id) : null;
      if (inUse) throw new Error(inUse);
      await deleteEntry(String(body.id));
    } else if (body.action === "deleteInquiry")
      await deleteInquiry(String(body.id));
    else if (body.action === "inquiry") {
      const inquiry = await getInquiry(String(body.id));
      if (
        !inquiry ||
        !statuses.includes(body.status) ||
        typeof body.notes !== "string" ||
        body.notes.length > 10000
      )
        throw new Error("Demande invalide.");
      await saveInquiry({ ...inquiry, status: body.status, notes: body.notes });
    } else throw new Error("Action inconnue.");
    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Enregistrement impossible.";
    return Response.json(
      { error: message },
      { status: message === "UNAUTHORIZED" ? 401 : 400 },
    );
  }
}
