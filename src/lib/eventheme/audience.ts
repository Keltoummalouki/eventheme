/**
 * Mesure d’audience (cahier des charges §10 : un outil conforme, avec consentement).
 *
 * Rien n’est chargé ni mesuré sans l’accord du visiteur : Google Analytics
 * n’est ajouté à la page qu’après « Accepter », et aucun événement ne part tant
 * qu’il n’est pas chargé. Les événements ne contiennent jamais de donnée
 * personnelle (ni nom, ni téléphone, ni e-mail, ni texte saisi).
 */

export const CONSENT_KEY = "eventhemes-consent";
const REOPEN = "eventhemes:consent";
const CHANGE = "eventhemes:consent-change";
export type ConsentChoice = "granted" | "denied";

/** Identifiant Google Analytics 4 valide (« G-XXXXXXXXXX »), sinon null : la mesure reste désactivée. */
export function measurementId(value: string | null | undefined) {
  const id = value?.trim().toUpperCase();
  return id && /^G-[A-Z0-9]{4,20}$/.test(id) ? id : null;
}

/** Choix enregistré dans ce navigateur ; null s’il n’y en a pas ou si le stockage est indisponible. */
export function readConsent(storage?: Pick<Storage, "getItem"> | null): ConsentChoice | null {
  try {
    const value = storage?.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function writeConsent(storage: Pick<Storage, "setItem"> | null | undefined, choice: ConsentChoice) {
  try {
    storage?.setItem(CONSENT_KEY, choice);
  } catch {}
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE));
}

/** Suit le choix enregistré : dans cet onglet et dans les autres (useSyncExternalStore). */
export function subscribeConsent(listener: () => void) {
  window.addEventListener(CHANGE, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Rouvre le bandeau (lien « Gérer les cookies » du pied de page). */
export const reopenConsent = () => window.dispatchEvent(new Event(REOPEN));
export function onReopenConsent(listener: () => void) {
  window.addEventListener(REOPEN, listener);
  return () => window.removeEventListener(REOPEN, listener);
}

/** Événements mesurés et leurs paramètres. */
export type AudienceEvents = {
  generate_lead: { lead_type: "callback" | "quote" | "contact" };
  add_to_quote: { item_id: string; item_kind: string };
  contact_click: { method: "whatsapp" | "phone" | "email" };
};

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

/** Envoie un événement, seulement si la mesure a été acceptée et chargée. */
export function track<Name extends keyof AudienceEvents>(name: Name, params: AudienceEvents[Name]) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") window.gtag("event", name, params);
}

/** Charge Google Analytics après consentement ; signaux Google et personnalisation publicitaire désactivés. */
export function loadAnalytics(id: string) {
  if (typeof document === "undefined" || document.getElementById("ga-script")) return;
  const layer = (window.dataLayer = window.dataLayer || []);
  // gtag.js attend l’objet « arguments » lui-même, pas un tableau.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    layer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement("script");
  script.id = "ga-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

/** Retrait du consentement : supprime les cookies de mesure (_ga, _ga_…) posés sur ce site. */
export function clearAnalyticsCookies() {
  const names = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0].trim())
    .filter((name) => /^_ga(_|$)/.test(name));
  const host = location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const name of names)
    for (const domain of domains) document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
}

/** Moyen de contact d’un lien (WhatsApp, téléphone, e-mail), sinon null. */
export function contactMethodOf(href: string | null | undefined): AudienceEvents["contact_click"]["method"] | null {
  if (!href) return null;
  if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) return "whatsapp";
  if (href.startsWith("tel:")) return "phone";
  if (href.startsWith("mailto:")) return "email";
  return null;
}
