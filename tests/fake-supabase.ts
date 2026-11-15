import { isDeepStrictEqual } from "node:util";

/**
 * Supabase en mémoire, pour vérifier le mode production de server.ts sans
 * réseau ni base réelle. Seules les opérations que le site utilise sont
 * reproduites, avec la sémantique de PostgREST qui compte ici :
 *
 * - `eq("data", json)` compare le contenu JSON (jsonb), pas le texte ;
 * - ce qui est écrit est une copie JSON (les champs `undefined` disparaissent) ;
 * - chaque opération peut être forcée en erreur (`fake.fail`) ;
 * - `fake.beforeUpdate` simule une modification concurrente avant une mise à jour.
 *
 * tests/setup.mjs fait pointer `@supabase/supabase-js`, `@supabase/ssr` et
 * `next/headers` vers ce module quand EVENTHEME_FAKE_SUPABASE=1.
 */

type Failure = { message: string; code?: string };
type Result = { data: unknown; error: Failure | null };
type Row = { id: string; created_at: number; [column: string]: unknown };
type CookieValue = { name: string; value: string; options?: Record<string, unknown> };
type User = { app_metadata?: Record<string, unknown> } | null;

const createState = () => ({
  tables: {} as Record<string, Row[]>,
  objects: new Map<string, { bytes: Uint8Array; contentType?: string }>(),
  sequence: 0,
  sequenceMissing: false,
  limits: new Map<string, number>(),
  failures: new Map<string, Failure[]>(),
  beforeUpdate: undefined as ((table: string) => void) | undefined,
  calls: [] as string[],
  clients: [] as { url: string; key: string; options: unknown }[],
  user: { data: { user: null as User }, error: null as Failure | null },
  cookies: { jar: [] as CookieValue[], readOnly: false, written: [] as string[] },
  clock: 0,
});
// One state per process, even if the test and server.ts reach this file by different paths.
const shared = globalThis as typeof globalThis & { eventhemeFakeSupabase?: ReturnType<typeof createState> };
const state = (shared.eventhemeFakeSupabase ??= createState());

export const fake = {
  state,
  reset() {
    state.tables = { content: [], inquiries: [] };
    state.objects.clear();
    state.sequence = 0;
    state.sequenceMissing = false;
    state.limits.clear();
    state.failures.clear();
    state.beforeUpdate = undefined;
    state.calls = [];
    state.clients = [];
    state.user = { data: { user: null }, error: null };
    state.cookies = { jar: [], readOnly: false, written: [] };
  },
  /** La prochaine opération `key` (« inquiries.update », « rpc.consume_rate_limit », « storage.upload »…) échoue. */
  fail(key: string, message = `${key} failed`) {
    const queue = state.failures.get(key) ?? [];
    queue.push({ message });
    state.failures.set(key, queue);
  },
  rows: (table: string) => (state.tables[table] ??= []),
  object: (bucket: string, path: string) => state.objects.get(`${bucket}/${path}`),
  put(bucket: string, path: string, bytes = new Uint8Array([1])) {
    state.objects.set(`${bucket}/${path}`, { bytes });
  },
};
fake.reset();

const take = (key: string) => {
  state.calls.push(key);
  return state.failures.get(key)?.shift();
};
/** Copie JSON, comme une colonne jsonb. */
const stored = <T>(value: T): T => JSON.parse(JSON.stringify(value));

class Query implements PromiseLike<Result> {
  private op: "select" | "upsert" | "insert" | "update" | "delete" = "select";
  private columns = "*";
  private filters: [string, unknown][] = [];
  private payload: Record<string, unknown> = {};
  private returning = false;
  private single = false;
  private ordering?: { column: string; ascending: boolean };

  constructor(private readonly table: string) {}

  select(columns = "*") {
    if (this.op === "select") this.columns = columns;
    else {
      this.returning = true;
      this.columns = columns;
    }
    return this;
  }
  order(column: string, options: { ascending?: boolean } = {}) {
    this.ordering = { column, ascending: options.ascending ?? true };
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }
  maybeSingle() {
    this.single = true;
    return this;
  }
  upsert(row: Record<string, unknown>) {
    this.op = "upsert";
    this.payload = row;
    return this;
  }
  insert(row: Record<string, unknown>) {
    this.op = "insert";
    this.payload = row;
    return this;
  }
  update(values: Record<string, unknown>) {
    this.op = "update";
    this.payload = values;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  then<A = Result, B = never>(
    resolve?: ((value: Result) => A | PromiseLike<A>) | null,
    reject?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve()
      .then(() => this.run())
      .then(resolve, reject);
  }

  private matches(row: Row) {
    return this.filters.every(([column, value]) =>
      column === "data" && typeof value === "string" ? isDeepStrictEqual(row.data, JSON.parse(value)) : row[column] === value,
    );
  }
  private project(row: Row) {
    if (this.columns === "*") return { ...row };
    return Object.fromEntries(this.columns.split(",").map((column) => [column.trim(), row[column.trim()]]));
  }
  private run(): Result {
    const failure = take(`${this.table}.${this.op}`);
    if (failure) return { data: null, error: failure };
    const rows = fake.rows(this.table);
    switch (this.op) {
      case "select": {
        const found = rows.filter((row) => this.matches(row));
        if (this.ordering) {
          const { column, ascending } = this.ordering;
          found.sort((a, b) => (Number(a[column]) - Number(b[column])) * (ascending ? 1 : -1));
        }
        const projected = found.map((row) => this.project(row));
        if (!this.single) return { data: projected, error: null };
        if (projected.length > 1) return { data: null, error: { message: "JSON object requested, multiple rows returned" } };
        return { data: projected[0] ?? null, error: null };
      }
      case "insert": {
        const row = stored(this.payload) as Row;
        if (rows.some((item) => item.id === row.id))
          return { data: null, error: { message: "duplicate key value violates unique constraint", code: "23505" } };
        rows.push({ ...row, created_at: ++state.clock });
        return { data: null, error: null };
      }
      case "upsert": {
        const row = stored(this.payload) as Row;
        const index = rows.findIndex((item) => item.id === row.id);
        if (index < 0) rows.push({ ...row, created_at: ++state.clock });
        else rows[index] = { ...rows[index], ...row };
        return { data: null, error: null };
      }
      case "update": {
        state.beforeUpdate?.(this.table);
        const changed = rows.filter((row) => this.matches(row));
        for (const row of changed) Object.assign(row, stored(this.payload));
        return { data: this.returning ? changed.map((row) => this.project(row)) : null, error: null };
      }
      case "delete": {
        state.tables[this.table] = rows.filter((row) => !this.matches(row));
        return { data: null, error: null };
      }
    }
  }
}

function rpc(name: string, args: Record<string, unknown> = {}): PromiseLike<Result> {
  return Promise.resolve().then((): Result => {
    const failure = take(`rpc.${name}`);
    if (failure) return { data: null, error: failure };
    if (name === "next_inquiry_reference") {
      if (state.sequenceMissing)
        return { data: null, error: { message: "Could not find the function public.next_inquiry_reference", code: "PGRST202" } };
      return { data: `EVT-${new Date().getFullYear()}-${String(++state.sequence).padStart(4, "0")}`, error: null };
    }
    if (name === "consume_rate_limit") {
      const key = String(args.bucket_key);
      const count = (state.limits.get(key) ?? 0) + 1;
      state.limits.set(key, count);
      return { data: count <= Number(args.max_attempts), error: null };
    }
    return { data: null, error: { message: `Unknown function ${name}`, code: "PGRST202" } };
  });
}

/** Opération de stockage : enregistrée, éventuellement forcée en erreur. */
async function storageOp(key: string, run: () => unknown): Promise<Result> {
  const failure = take(key);
  if (failure) return { data: null, error: failure };
  try {
    return { data: run(), error: null };
  } catch (error) {
    return { data: null, error: { message: (error as Error).message } };
  }
}

const bucket = (name: string) => ({
  list: (prefix: string) =>
    storageOp("storage.list", () =>
      [...state.objects.keys()]
        .filter((key) => key.startsWith(`${name}/${prefix}/`))
        .map((key) => ({ name: key.slice(`${name}/${prefix}/`.length) })),
    ),
  remove: (paths: string[]) =>
    storageOp("storage.remove", () => {
      for (const path of paths) state.objects.delete(`${name}/${path}`);
      return paths.map((path) => ({ name: path }));
    }),
  upload: (path: string, bytes: Uint8Array, options: { contentType?: string; upsert?: boolean } = {}) =>
    storageOp("storage.upload", () => {
      if (state.objects.has(`${name}/${path}`) && !options.upsert) throw new Error("The resource already exists");
      state.objects.set(`${name}/${path}`, { bytes, contentType: options.contentType });
      return { path };
    }),
  createSignedUrl: (path: string, expiresIn: number, options: { download?: string } = {}) =>
    storageOp("storage.sign", () => {
      if (!state.objects.has(`${name}/${path}`)) throw new Error("Object not found");
      const download = encodeURIComponent(options.download ?? "");
      return { signedUrl: `https://fake.supabase.co/storage/v1/object/sign/${name}/${path}?expires=${expiresIn}&download=${download}` };
    }),
});

/** `@supabase/supabase-js` */
export function createClient(url: string, key: string, options?: unknown) {
  state.clients.push({ url, key, options });
  return { from: (table: string) => new Query(table), rpc, storage: { from: bucket } };
}

type CookieMethods = { getAll: () => CookieValue[]; setAll: (values: CookieValue[]) => void };
/** `@supabase/ssr` : la session est lue dans les cookies, puis rafraîchie. */
export function createServerClient(url: string, key: string, options: { cookies: CookieMethods }) {
  state.clients.push({ url, key, options });
  return {
    auth: {
      async getUser() {
        options.cookies.getAll();
        options.cookies.setAll([{ name: "sb-session", value: "refreshed", options: { path: "/" } }]);
        return state.user;
      },
    },
  };
}

/** `next/headers` : en rendu de page, les cookies sont en lecture seule. */
export async function cookies() {
  return {
    getAll: () => state.cookies.jar,
    set(name: string, value: string) {
      if (state.cookies.readOnly) throw new Error("Cookies can only be modified in a Server Action or Route Handler.");
      state.cookies.written.push(`${name}=${value}`);
    },
  };
}
