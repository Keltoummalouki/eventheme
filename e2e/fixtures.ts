import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test as base, type Locator, type Page } from "@playwright/test";
import { dictionaries } from "../src/data/locales";
import { seed } from "../src/data/eventheme";
import type { Locale } from "../src/lib/i18n";
import type { Inquiry } from "../src/lib/eventheme/types";
import { dataDirectory } from "./environment";

/** Image de 1 × 1 px servie à la place des photographies distantes : les tests ne dépendent pas des CDN. */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

type Options = {
  /** Choix de mesure d’audience déjà fait (« denied », par défaut) ou bandeau à afficher (« unset »). */
  consent: "denied" | "unset";
};
type Fixtures = {
  /** Requêtes vers Google Analytics : interceptées, jamais envoyées, notées ici. */
  analytics: string[];
};

export const test = base.extend<Options & Fixtures>({
  consent: ["denied", { option: true }],
  context: async ({ context, consent }, provide) => {
    await context.route(/images\.unsplash\.com|picsum\.photos/, (route) =>
      route.fulfill({ status: 200, contentType: "image/png", body: PIXEL }),
    );
    if (consent === "denied")
      await context.addInitScript(() => {
        try {
          if (!localStorage.getItem("eventhemes-consent")) localStorage.setItem("eventhemes-consent", "denied");
        } catch {}
      });
    await provide(context);
  },
  analytics: [
    async ({ context }, provide) => {
      const hits: string[] = [];
      await context.route(/googletagmanager\.com|google-analytics\.com/, (route) => {
        hits.push(route.request().url());
        return route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
      });
      await provide(hits);
    },
    { auto: true },
  ],
});
export { expect };

export const t = (locale: Locale) => dictionaries[locale];

/** Titre d’un contenu de départ dans une langue (traduction, sinon le français). */
export function titleOf(id: string, locale: Locale) {
  const entry = seed.find((item) => item.id === id);
  if (!entry) throw new Error(`Contenu de départ inconnu : ${id}`);
  return (locale !== "fr" && entry.translations?.[locale]?.title) || entry.title;
}

export const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Expression d’un texte d’interface dont un {paramètre} prend la forme `pattern`. */
export function templateRegExp(template: string, name: string, pattern: string) {
  return new RegExp(template.split(`{${name}}`).map(escapeRegExp).join(pattern));
}

/** Case ou bouton radio visuellement masqué : on clique son libellé, comme un visiteur. */
export const labelOf = (page: Page, input: Locator) => page.locator("label").filter({ has: input });

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "no horizontal scroll").toBeLessThanOrEqual(1);
}

/**
 * Anti-spam : le serveur refuse un formulaire envoyé moins de 1,5 s après son
 * affichage (validateInquiry), ce qu’aucun visiteur ne fait. Le test attend
 * donc ce délai minimum depuis `openedAt` avant d’envoyer.
 */
export async function atHumanPace(page: Page, openedAt: number) {
  const elapsed = Date.now() - openedAt;
  if (elapsed < 1600) await page.waitForTimeout(1600 - elapsed);
}

/** Numéro marocain valide et unique : les limites d’envoi comptent par numéro. */
export const uniquePhone = () => `06${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
/** Adresse unique dans un domaine réservé aux exemples : rien ne peut y être distribué. */
export const uniqueEmail = (tag: string) => `playwright+${tag}-${Date.now().toString(36)}@example.com`;

/* --- Données du serveur de test (.eventheme/e2e) ------------------------------------ */

export function storedInquiries(): Inquiry[] {
  try {
    return JSON.parse(readFileSync(path.join(dataDirectory, "data.json"), "utf8")).inquiries;
  } catch {
    return [];
  }
}
/** La demande `reference`, telle qu’enregistrée par le serveur. */
export async function storedRequest(reference: string, until: (inquiry: Inquiry) => boolean = () => true) {
  let found: Inquiry | undefined;
  await expect
    .poll(() => {
      found = storedInquiries().find((item) => item.reference === reference);
      return Boolean(found && until(found));
    }, { message: `request ${reference} recorded`, timeout: 20_000 })
    .toBe(true);
  return found!;
}
/** Aperçus d’e-mails écrits pour une demande (alerte équipe, accusé de réception). */
export function previewsFor(id: string) {
  try {
    return readdirSync(path.join(dataDirectory, "emails")).filter((name) => name.includes(id));
  } catch {
    return [];
  }
}
