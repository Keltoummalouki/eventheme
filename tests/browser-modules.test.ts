import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { dictionaries } from "../src/data/locales";
import {
  clearAnalyticsCookies,
  loadAnalytics,
  onReopenConsent,
  reopenConsent,
  subscribeConsent,
  track,
  writeConsent,
} from "../src/lib/eventheme/audience";
import { prepareAttachment, uploadAttachment } from "../src/lib/eventheme/upload";

/**
 * Modules qui ne tournent que dans le navigateur : consentement et mesure
 * d’audience, réduction des photos et envoi des pièces jointes. `window`,
 * `document`, le canvas et fetch sont remplacés par des doublures minimales.
 */
const g = globalThis as Record<string, unknown>;
const realFetch = globalThis.fetch;
afterEach(() => {
  for (const key of ["window", "document", "location", "createImageBitmap"]) delete g[key];
  globalThis.fetch = realFetch;
});

/** `window` : un EventTarget, comme dans le navigateur. */
const fakeWindow = () => (g.window = new EventTarget()) as EventTarget & { dataLayer?: unknown[]; gtag?: unknown };

/* --- Consentement et mesure d’audience -------------------------------------------- */

test("the consent choice is followed in this tab and in the others, until unsubscribed", () => {
  const win = fakeWindow();
  let calls = 0;
  const unsubscribe = subscribeConsent(() => calls++);
  writeConsent({ setItem() {} }, "granted");
  assert.equal(calls, 1, "a choice made here");
  win.dispatchEvent(new Event("storage"));
  assert.equal(calls, 2, "a choice made in another tab");
  unsubscribe();
  writeConsent({ setItem() {} }, "denied");
  win.dispatchEvent(new Event("storage"));
  assert.equal(calls, 2);
});

test("the footer link reopens the banner", () => {
  fakeWindow();
  let opened = 0;
  const stop = onReopenConsent(() => opened++);
  reopenConsent();
  assert.equal(opened, 1);
  stop();
  reopenConsent();
  assert.equal(opened, 1);
});

test("Google Analytics loads once, after consent, without signals or ad personalisation", () => {
  assert.doesNotThrow(() => loadAnalytics("G-TEST1234"), "nothing to do during server rendering");
  const win = fakeWindow();
  const appended: { id?: string; async?: boolean; src?: string }[] = [];
  g.document = {
    getElementById: (id: string) => appended.find((element) => element.id === id) ?? null,
    createElement: () => ({}),
    head: { appendChild: (element: (typeof appended)[number]) => void appended.push(element) },
  };
  loadAnalytics("G-TEST1234");
  loadAnalytics("G-TEST1234");
  assert.equal(appended.length, 1, "one script, even if asked twice");
  assert.equal(appended[0].id, "ga-script");
  assert.equal(appended[0].async, true);
  assert.equal(appended[0].src, "https://www.googletagmanager.com/gtag/js?id=G-TEST1234");
  const layer = win.dataLayer!.map((entry) => Array.from(entry as ArrayLike<unknown>));
  assert.equal(layer[0][0], "js");
  assert.ok(layer[0][1] instanceof Date);
  assert.deepEqual(layer[1], ["config", "G-TEST1234", { allow_google_signals: false, allow_ad_personalization_signals: false }]);
  // Each entry is the `arguments` object itself, as gtag.js expects.
  assert.equal(Object.prototype.toString.call(win.dataLayer![0]), "[object Arguments]");
  track("add_to_quote", { item_id: "truss", item_kind: "products" });
  assert.deepEqual(Array.from(win.dataLayer![2] as ArrayLike<unknown>), ["event", "add_to_quote", { item_id: "truss", item_kind: "products" }]);
});

test("withdrawing consent deletes the measurement cookies on every domain they may use", () => {
  const writes: string[] = [];
  g.location = { hostname: "www.eventhemes.ma" };
  g.document = {
    get cookie() {
      return "_ga=GA1.1.123; theme=dark; _ga_ABC123=GS1.1; _gat=1; _gid=GA1";
    },
    set cookie(value: string) {
      writes.push(value);
    },
  };
  clearAnalyticsCookies();
  assert.deepEqual(writes, [
    "_ga=; Max-Age=0; path=/",
    "_ga=; Max-Age=0; path=/; domain=www.eventhemes.ma",
    "_ga=; Max-Age=0; path=/; domain=.www.eventhemes.ma",
    "_ga=; Max-Age=0; path=/; domain=.eventhemes.ma",
    "_ga_ABC123=; Max-Age=0; path=/",
    "_ga_ABC123=; Max-Age=0; path=/; domain=www.eventhemes.ma",
    "_ga_ABC123=; Max-Age=0; path=/; domain=.www.eventhemes.ma",
    "_ga_ABC123=; Max-Age=0; path=/; domain=.eventhemes.ma",
  ]);
});

/* --- Pièces jointes : réduction des photos --------------------------------------- */

const MB = 1024 * 1024;
const file = (name: string, type: string, size: number) => new File([new Uint8Array(size)], name, { type });

/**
 * Photo de `width` × `height` px ; chaque essai de compression rend la taille
 * suivante de `sizes` (null : le navigateur n’a rien produit).
 */
function fakeImage(width: number, height: number, sizes: (number | null)[], { context = true } = {}) {
  const state = { closed: 0, attempts: [] as { width: number; height: number; type: string; quality: number }[] };
  g.createImageBitmap = async () => ({ width, height, close: () => void state.closed++ });
  g.document = {
    createElement: () => {
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => (context ? { fillStyle: "", fillRect() {}, drawImage() {} } : null),
        toBlob(callback: (blob: Blob | null) => void, type: string, quality: number) {
          const size = sizes[state.attempts.length];
          state.attempts.push({ width: canvas.width, height: canvas.height, type, quality });
          callback(size == null ? null : new Blob([new Uint8Array(size)], { type }));
        },
      };
      return canvas;
    },
  };
  return state;
}

test("small files and PDFs are sent as they are", async () => {
  g.createImageBitmap = async () => assert.fail("nothing to shrink");
  const photo = file("scene.jpg", "image/jpeg", 2 * MB);
  assert.equal(await prepareAttachment(photo), photo);
  const plan = file("plan.pdf", "application/pdf", 6 * MB);
  assert.equal(await prepareAttachment(plan), plan, "a PDF is never modified");
});

test("a heavy phone photo is shrunk to a JPEG of 2,560 px at most", async () => {
  const image = fakeImage(6000, 4000, [3 * MB]);
  const result = await prepareAttachment(file("IMG_0001.png", "image/png", 9 * MB));
  assert.equal(result.name, "IMG_0001.jpg");
  assert.equal(result.type, "image/jpeg");
  assert.equal(result.size, 3 * MB);
  assert.deepEqual(image.attempts, [{ width: 2560, height: 1707, type: "image/jpeg", quality: 0.85 }]);
  assert.equal(image.closed, 1, "the decoded image is released");
});

test("if needed, the photo is shrunk further, step by step", async () => {
  const image = fakeImage(4000, 6000, [5 * MB, null, 2 * MB]);
  const result = await prepareAttachment(file(".webp", "image/webp", 8 * MB));
  assert.equal(result.name, "photo.jpg", "a name made only of an extension still gets one");
  assert.deepEqual(
    image.attempts.map(({ width, height, quality }) => [width, height, quality]),
    [
      [1707, 2560, 0.85],
      [1365, 2048, 0.8],
      [1067, 1600, 0.75],
    ],
  );
});

test("when shrinking cannot help, the original file is kept and the server decides", async () => {
  const heavy = file("panorama.jpg", "image/jpeg", 12 * MB);
  const image = fakeImage(20000, 3000, [6 * MB, 5 * MB, 4.5 * MB]);
  assert.equal(await prepareAttachment(heavy), heavy);
  assert.equal(image.attempts.length, 3);
  assert.equal(image.closed, 1);
  fakeImage(6000, 4000, [1 * MB], { context: false });
  assert.equal(await prepareAttachment(heavy), heavy, "no 2D canvas available");
  g.createImageBitmap = async () => {
    throw new Error("unsupported image");
  };
  assert.equal(await prepareAttachment(heavy), heavy, "an image the browser cannot decode");
});

/* --- Pièces jointes : envoi -------------------------------------------------------- */

type Call = { url: string; init: RequestInit };
function fakeFetch(answer: () => Response | Promise<Response>) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return answer();
  }) as typeof fetch;
  return calls;
}
const lead = { id: "4f1c2d3e-0000-4000-8000-000000000001", token: "a".repeat(64) };

test("a file is sent with its request, its token, its name and the page language", async () => {
  const calls = fakeFetch(() => new Response(JSON.stringify({ attachment: { id: "x" } }), { status: 201 }));
  const plan = file("Plan du lieu é.pdf", "application/pdf", 1000);
  assert.deepEqual(await uploadAttachment(plan, lead, "en"), { name: "Plan du lieu é.pdf", sent: true });
  assert.equal(calls[0].url, "/api/inquiries/attachments");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.body, plan);
  assert.deepEqual(calls[0].init.headers, {
    "Content-Type": "application/pdf",
    "X-Request-Id": lead.id,
    "X-Request-Token": lead.token,
    "X-File-Name": "Plan%20du%20lieu%20%C3%A9.pdf",
    "X-Locale": "en",
  });
  await uploadAttachment(file("scan", "", 10), lead);
  const headers = calls[1].init.headers as Record<string, string>;
  assert.equal(headers["Content-Type"], "application/octet-stream", "an unknown type is left to the server's check");
  assert.equal(headers["X-Locale"], "fr", "French by default");
});

test("refusals and failures come back as messages in the page language", async () => {
  fakeFetch(() => new Response(JSON.stringify({ error: "Fichier vide." }), { status: 400 }));
  assert.deepEqual(await uploadAttachment(file("vide.pdf", "application/pdf", 1), lead), {
    name: "vide.pdf",
    sent: false,
    error: "Fichier vide.",
  });
  fakeFetch(() => new Response("<html>Bad gateway</html>", { status: 502 }));
  assert.equal((await uploadAttachment(file("a.pdf", "application/pdf", 1), lead, "en")).error, dictionaries.en.attachments.failed);
  fakeFetch(() => {
    throw new TypeError("Failed to fetch");
  });
  assert.equal((await uploadAttachment(file("a.pdf", "application/pdf", 1), lead, "ar")).error, dictionaries.ar.attachments.offline);
});

test("a file still too heavy is refused before leaving the browser", async () => {
  const calls = fakeFetch(() => assert.fail("nothing is sent"));
  const result = await uploadAttachment(file("dossier.pdf", "application/pdf", 5 * MB), lead);
  assert.deepEqual(result, { name: "dossier.pdf", sent: false, error: "Fichier trop lourd (5 Mo)." });
  assert.equal(calls.length, 0);
});
