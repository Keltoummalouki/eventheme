import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { adminLogin, adminRedirectPath, authConfigured, hasAdminRole } from "../src/lib/eventheme/auth";
import { continuationHash, verifyContinuation } from "../src/lib/eventheme/continuation";
import { checkOrigin, clientAddress, readBody, readBytes } from "../src/lib/eventheme/http";
import type { Inquiry } from "../src/lib/eventheme/types";

const env = process.env as Record<string, string | undefined>;
/** Exécute `run` avec des variables d’environnement provisoires, puis les rétablit. */
async function withEnv(values: Record<string, string | undefined>, run: () => unknown) {
  const before = Object.fromEntries(Object.keys(values).map((key) => [key, env[key]]));
  Object.assign(env, values);
  for (const [key, value] of Object.entries(values)) if (value === undefined) delete env[key];
  try {
    await run();
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
}

const post = (headers: Record<string, string>, body?: BodyInit) =>
  new Request("http://localhost:3000/api/inquiries", { method: "POST", headers, body });

test("forms are accepted only from the site itself", async () => {
  assert.throws(() => checkOrigin(post({})), { message: "Origine non autorisée." });
  assert.throws(() => checkOrigin(post({ Origin: "https://evil.example" })), { message: "Origine non autorisée." });
  assert.doesNotThrow(() => checkOrigin(post({ Origin: "http://localhost:3000" })));
  // En production, l’origine attendue est APP_URL, quelle que soit l’adresse interne de la requête.
  await withEnv({ NODE_ENV: "production", APP_URL: "https://eventhemes.ma" }, () => {
    assert.doesNotThrow(() => checkOrigin(post({ Origin: "https://eventhemes.ma" })));
    assert.throws(() => checkOrigin(post({ Origin: "http://localhost:3000" })), { message: "Origine non autorisée." });
  });
});

test("the client address comes from the host's forwarding headers", () => {
  assert.equal(clientAddress(post({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })), "203.0.113.7");
  assert.equal(clientAddress(post({ "x-real-ip": " 198.51.100.4 " })), "198.51.100.4");
  assert.equal(clientAddress(post({})), "");
});

test("request bodies are read within a size limit", async () => {
  assert.deepEqual(await readBody(post({ "Content-Type": "application/json" }, JSON.stringify({ a: 1 }))), { a: 1 });
  await assert.rejects(readBody(post({})), { message: "Formulaire vide." });
  await assert.rejects(readBytes(post({ "content-length": "500" }, "x".repeat(500)), 100), { message: "Données trop volumineuses." });
  // Sans en-tête de longueur, la limite s’applique pendant la lecture.
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(60));
      controller.enqueue(new Uint8Array(60));
      controller.close();
    },
  });
  const streamed = new Request("http://localhost:3000/x", { method: "POST", body: stream, duplex: "half" } as RequestInit);
  await assert.rejects(readBytes(streamed, 100), { message: "Données trop volumineuses." });
  assert.equal((await readBytes(post({}, "hello"), 100)).toString("utf8"), "hello");
});

test("a continuation token completes only its own recent request", () => {
  const token = randomBytes(32).toString("hex");
  const request = { createdAt: new Date().toISOString(), continuationHash: continuationHash(token) } as Inquiry;
  const expired = "Cette session de personnalisation a expiré. Votre demande de rappel reste enregistrée.";
  assert.doesNotThrow(() => verifyContinuation(request, token));
  assert.throws(() => verifyContinuation(request, randomBytes(32).toString("hex")), { message: expired });
  assert.throws(() => verifyContinuation(request, "short"), { message: expired });
  assert.throws(() => verifyContinuation(request, 42), { message: expired });
  assert.throws(() => verifyContinuation(undefined, token), { message: expired });
  assert.throws(() => verifyContinuation({ ...request, continuationHash: undefined }, token), { message: expired });
  const yesterday = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
  assert.throws(() => verifyContinuation({ ...request, createdAt: yesterday }, token), { message: expired });
});

test("the back office opens only to admins, and only redirects inside itself", async () => {
  assert.equal(hasAdminRole({ app_metadata: { role: "admin" } }), true);
  assert.equal(hasAdminRole({ app_metadata: { role: "editor" } }), false);
  assert.equal(hasAdminRole(null), false);
  assert.equal(adminRedirectPath("/admin/demandes"), "/admin/demandes");
  assert.equal(adminRedirectPath("/admin"), "/admin");
  assert.equal(adminRedirectPath(adminLogin), "/admin");
  assert.equal(adminRedirectPath("//evil.example/admin"), "/admin");
  assert.equal(adminRedirectPath("https://evil.example"), "/admin");
  assert.equal(adminRedirectPath("/materiel"), "/admin");
  assert.equal(adminRedirectPath(undefined), "/admin");
  await withEnv({ NEXT_PUBLIC_SUPABASE_URL: undefined, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined }, () =>
    assert.equal(authConfigured(), false),
  );
  await withEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "key" }, () =>
    assert.equal(authConfigured(), true),
  );
});
