/* ==========================================================================
   Tableau de bord de l'administration — calcul pur

   Ce que l'accueil de l'espace administrateur montre en plus des
   statistiques (analytics.ts) : séries par période, agenda, tâches du jour,
   volumes des contenus et santé du catalogue. Rien n'est inventé : tout est
   déduit des demandes et des contenus déjà chargés.

   Les journées se comptent à l'heure de Casablanca. Le serveur lit une fois le
   décalage horaire du moment (`utcOffset`) et le transmet : toutes les dates
   en découlent par simple arithmétique. Le navigateur ne consulte jamais sa
   propre base de fuseaux, qui peut différer de celle du serveur (constaté :
   Chromium et Node en désaccord sur Casablanca) — la page rendue et la page
   hydratée rangent ainsi toujours une demande dans le même jour.
   ========================================================================== */
import { parseIsoDate } from "@/lib/dates";
import { STALE_DAYS, count, type Analytics } from "./analytics";
import type { AdminAccount } from "./auth";
import { kinds, type Entry, type Inquiry, type Kind, type Status } from "./types";

/** Fuseau de l'équipe EVENTHEMES : celui des journées, des semaines et des salutations. */
export const BUSINESS_TIME_ZONE = "Africa/Casablanca";
const DAY = 86_400_000;
const MINUTE = 60_000;

/**
 * Décalage du fuseau sur UTC à l'instant donné, en minutes vers l'est
 * (Casablanca : 60 ou 0). Lu côté serveur, puis transmis tel quel au navigateur.
 */
export function utcOffset(now: Date, timeZone = BUSINESS_TIME_ZONE): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
  const wall = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"));
  return Math.round((wall - Math.floor(now.getTime() / MINUTE) * MINUTE) / MINUTE);
}

/* --- Vues de l'administration ----------------------------------------------- */

/** L'accueil, les statistiques, les demandes, puis un onglet par type de contenu. */
export type AdminView = "dashboard" | "statistics" | "quotes" | "messages" | "clients" | Kind;
const views: readonly string[] = ["dashboard", "statistics", "quotes", "messages", "clients", ...kinds];
export const isAdminView = (value: unknown): value is AdminView =>
  typeof value === "string" && views.includes(value);

/** Nom court de chaque formulaire du site. */
export const inquiryKindLabels: Record<Inquiry["kind"], string> = {
  quote: "Devis",
  callback: "Rappel",
  contact: "Message",
};

/** Les statuts dans l'ordre du parcours d'une demande ; « Refusé », une sortie, en dernier. */
export const pipelineOrder: readonly Status[] = [
  "Nouveau",
  "En cours de traitement",
  "Devis envoyé",
  "Accepté",
  "Terminé",
  "Refusé",
];

/** « 1 demande », « 3 demandes » : en français, 0 et 1 restent au singulier. */
const many = (value: number, one: string, other: string) => `${count(value)} ${value > 1 ? other : one}`;

/* --- Jours calendaires ------------------------------------------------------- */

/** Jour « AAAA-MM-JJ » d'un instant, à `offset` minutes d'UTC (voir `utcOffset`). */
export const dayKey = (date: Date, offset: number) => new Date(date.getTime() + offset * MINUTE).toISOString().slice(0, 10);

/* Arithmétique sur les clés : chaque jour est daté à minuit UTC, sans heure d'été. */
const utc = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};
const keyAt = (time: number) => new Date(time).toISOString().slice(0, 10);
export const shiftDay = (key: string, amount: number) => keyAt(utc(key) + amount * DAY);
/** Lundi de la semaine du jour donné : la semaine française commence le lundi. */
export const mondayOf = (key: string) => shiftDay(key, -((new Date(utc(key)).getUTCDay() + 6) % 7));
const daysBetween = (from: string, to: string) => Math.round((utc(to) - utc(from)) / DAY);
const shiftMonth = (month: string, amount: number) => {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index - 1 + amount, 1)).toISOString().slice(0, 7);
};

const inUtc = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...options });
const shortDay = inUtc({ day: "numeric", month: "short" });
const longDay = inUtc({ weekday: "long", day: "numeric", month: "long" });
const shortMonth = inUtc({ month: "short" });
const longMonth = inUtc({ month: "long", year: "numeric" });
/** « 15 nov. » */
export const dayLabel = (key: string) => shortDay.format(utc(key));
/** « dimanche 15 novembre » */
export const dayTitle = (key: string) => longDay.format(utc(key));

/** Jour de réception d'une demande ; `null` si son horodatage est illisible. */
function receivedKey(inquiry: Inquiry, offset: number): string | null {
  const date = new Date(inquiry.createdAt);
  return Number.isNaN(date.getTime()) ? null : dayKey(date, offset);
}

/** Date d'événement valable (« AAAA-MM-JJ » existant) d'une demande non refusée. */
const eventKey = (inquiry: Inquiry) =>
  inquiry.status !== "Refusé" && parseIsoDate(inquiry.date) ? inquiry.date : null;

/** Demandes encore ouvertes : sans réponse définitive. */
const openStatuses: readonly Status[] = ["Nouveau", "En cours de traitement", "Devis envoyé"];

function tally(keys: (string | null)[]) {
  const counts = new Map<string, number>();
  for (const key of keys) if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}
const sumDays = (counts: Map<string, number>, from: string, length: number) =>
  Array.from({ length }, (_, index) => counts.get(shiftDay(from, index)) ?? 0).reduce((a, b) => a + b, 0);

/* --- En-tête ----------------------------------------------------------------- */

/** « Bonjour » de 5 h à 18 h, « Bonsoir » ensuite, à l'heure de l'équipe. */
export function greeting(now: Date, offset: number) {
  const hour = new Date(now.getTime() + offset * MINUTE).getUTCHours();
  return hour >= 5 && hour < 18 ? "Bonjour" : "Bonsoir";
}

/** « dimanche 15 novembre » */
export const todayLabel = (now: Date, offset: number) => dayTitle(dayKey(now, offset));

/** Boîtes partagées : leur nom n'est pas un prénom. */
const MAILBOXES = new Set([
  "admin", "administrateur", "administration", "bonjour", "booking", "commercial", "contact", "devis",
  "direction", "equipe", "eventheme", "eventhemes", "hello", "info", "infos", "mail", "noreply",
  "office", "reservation", "reservations", "sales", "support", "team", "test",
]);

/**
 * Prénom de la salutation : celui du compte s'il est renseigné, sinon celui
 * qu'annonce l'adresse (« keltoum.malouki@… » → « Keltoum »). Une boîte
 * partagée (« contact@… ») ne donne aucun prénom.
 */
export function firstName(account: AdminAccount | null | undefined): string | null {
  const name = account?.name?.trim();
  if (name) return name.split(/\s+/)[0];
  const first = (account?.email ?? "").split("@")[0].toLowerCase().split(/[._+-]/)[0];
  if (!/^\p{L}{2,}$/u.test(first) || MAILBOXES.has(first)) return null;
  return first[0].toUpperCase() + first.slice(1);
}

/** Initiales de l'avatar : « KM » pour Keltoum Malouki, « CE » pour contact@eventhemes.ma. */
export function initials(account: AdminAccount | null | undefined): string {
  const words = (account?.name?.trim() || account?.email || "").split(/[\s._@-]+/).filter(Boolean);
  if (!words.length) return "A";
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
}

/** La phrase d'accueil : la priorité du moment, ou la confirmation que tout est à jour. */
export function headline({
  stale,
  pending,
  closing,
  upcoming,
}: {
  /** Demandes « Nouveau » sans réponse depuis STALE_DAYS jours ou plus. */
  stale: number;
  pending: number;
  /** Événements passés dont la demande est encore ouverte. */
  closing: number;
  /** Événements des 30 prochains jours. */
  upcoming: number;
}): string {
  if (stale) return `${many(stale, "demande attend", "demandes attendent")} une réponse depuis ${STALE_DAYS} jours ou plus.`;
  if (pending) return `${many(pending, "nouvelle demande", "nouvelles demandes")} à rappeler.`;
  if (closing) return `${many(closing, "événement passé", "événements passés")} à clôturer.`;
  if (upcoming) return `${many(upcoming, "événement", "événements")} dans les 30 prochains jours.`;
  return "Tout est à jour. Un bon moment pour enrichir le catalogue.";
}

/* --- Activité par période ------------------------------------------------------ */

export type PeriodId = "7" | "30" | "90" | "12m";
export const periods: readonly { id: PeriodId; label: string; title: string; previous: string }[] = [
  { id: "7", label: "7 j", title: "7 derniers jours", previous: "7 jours précédents" },
  { id: "30", label: "30 j", title: "30 derniers jours", previous: "30 jours précédents" },
  { id: "90", label: "90 j", title: "90 derniers jours", previous: "90 jours précédents" },
  { id: "12m", label: "12 mois", title: "12 derniers mois", previous: "12 mois précédents" },
];

export type KindFilter = "all" | Inquiry["kind"];
export const kindFilters: readonly { id: KindFilter; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "quote", label: "Devis" },
  { id: "callback", label: "Rappels" },
  { id: "contact", label: "Messages" },
];

/** Un point de la série : la période en cours et, au même rang, la période précédente. */
export type ActivityPoint = { key: string; label: string; title: string; value: number; previous: number };
export type Activity = {
  points: ActivityPoint[];
  total: number;
  previous: number;
  /** Variation sur la période précédente ; vide lorsque celle-ci ne compte aucune demande. */
  delta: number | null;
  /** Demandes reçues pendant la période, les plus récentes d'abord. */
  inquiries: Inquiry[];
  byKind: Record<Inquiry["kind"], number>;
};

/**
 * Demandes reçues sur la période choisie, comparées à la période précédente
 * de même durée. 7 et 30 jours : un point par jour ; 90 jours : un point par
 * semaine (la plus ancienne peut être incomplète) ; 12 mois : un point par mois.
 */
export function activity(
  inquiries: Inquiry[],
  now: Date,
  offset: number,
  period: PeriodId,
  kind: KindFilter = "all",
): Activity {
  const today = dayKey(now, offset);
  const received = inquiries
    .filter((inquiry) => kind === "all" || inquiry.kind === kind)
    .map((inquiry) => ({ inquiry, key: receivedKey(inquiry, offset) }))
    .filter((item): item is { inquiry: Inquiry; key: string } => item.key != null);
  let points: ActivityPoint[];
  let first: string;
  if (period === "12m") {
    const month = today.slice(0, 7);
    const perMonth = tally(received.map(({ key }) => key.slice(0, 7)));
    first = `${shiftMonth(month, -11)}-01`;
    points = Array.from({ length: 12 }, (_, index) => {
      const key = shiftMonth(month, index - 11);
      const time = utc(`${key}-01`);
      return {
        key,
        label: shortMonth.format(time),
        title: longMonth.format(time),
        value: perMonth.get(key) ?? 0,
        previous: perMonth.get(shiftMonth(key, -12)) ?? 0,
      };
    });
  } else {
    const days = Number(period);
    const size = days === 90 ? 7 : 1;
    const perDay = tally(received.map(({ key }) => key));
    first = shiftDay(today, -(days - 1));
    // Découpe depuis aujourd'hui : seul le premier groupe peut être plus court.
    const groups: { from: string; length: number }[] = [];
    for (let end = days; end > 0; end -= size) {
      const length = Math.min(size, end);
      groups.unshift({ from: shiftDay(first, end - length), length });
    }
    points = groups.map(({ from, length }) => ({
      key: from,
      label: dayLabel(from),
      title: length === 1 ? dayTitle(from) : `Du ${dayLabel(from)} au ${dayLabel(shiftDay(from, length - 1))}`,
      value: sumDays(perDay, from, length),
      previous: sumDays(perDay, shiftDay(from, -days), length),
    }));
  }
  const within = received
    .filter(({ key }) => key >= first && key <= today)
    .map(({ inquiry }) => inquiry)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const previous = points.reduce((sum, point) => sum + point.previous, 0);
  const byKind: Record<Inquiry["kind"], number> = { quote: 0, callback: 0, contact: 0 };
  within.forEach((inquiry) => (byKind[inquiry.kind] += 1));
  return { points, total, previous, delta: previous ? (total - previous) / previous : null, inquiries: within, byKind };
}

/* --- Semaines, agenda, événements à venir ----------------------------------------- */

export type WeekPoint = { key: string; label: string; title: string; value: number };

/** Demandes reçues par semaine, de la plus ancienne à la semaine en cours. */
export function receivedWeeks(inquiries: Inquiry[], now: Date, offset: number, weeks = 12): WeekPoint[] {
  const monday = mondayOf(dayKey(now, offset));
  const perDay = tally(inquiries.map((inquiry) => receivedKey(inquiry, offset)));
  return Array.from({ length: weeks }, (_, index) => {
    const from = shiftDay(monday, (index - weeks + 1) * 7);
    return { key: from, label: dayLabel(from), title: `Semaine du ${dayLabel(from)}`, value: sumDays(perDay, from, 7) };
  });
}

/** Événements demandés (hors refus) par semaine, de la semaine en cours aux suivantes. */
export function eventWeeks(inquiries: Inquiry[], now: Date, offset: number, weeks = 8): WeekPoint[] {
  const monday = mondayOf(dayKey(now, offset));
  const perDay = tally(inquiries.map(eventKey));
  return Array.from({ length: weeks }, (_, index) => {
    const from = shiftDay(monday, index * 7);
    return { key: from, label: dayLabel(from), title: `Semaine du ${dayLabel(from)}`, value: sumDays(perDay, from, 7) };
  });
}

export type Upcoming = { inquiry: Inquiry; key: string; /** Jours d'ici à l'événement : 0 = aujourd'hui. */ days: number };

/** Événements datés d'aujourd'hui ou plus tard, hors refus, du plus proche au plus lointain. */
export function upcomingEvents(inquiries: Inquiry[], now: Date, offset: number): Upcoming[] {
  const today = dayKey(now, offset);
  return inquiries
    .map((inquiry) => ({ inquiry, key: eventKey(inquiry) }))
    .filter((item): item is { inquiry: Inquiry; key: string } => item.key != null && item.key >= today)
    .sort((a, b) => a.key.localeCompare(b.key) || a.inquiry.createdAt.localeCompare(b.inquiry.createdAt))
    .map(({ inquiry, key }) => ({ inquiry, key, days: daysBetween(today, key) }));
}

/** Événements dont la date est passée alors que la demande reste ouverte : à clôturer. */
export function closingEvents(inquiries: Inquiry[], now: Date, offset: number): Inquiry[] {
  const today = dayKey(now, offset);
  return inquiries.filter((inquiry) => {
    const key = eventKey(inquiry);
    return key != null && key < today && openStatuses.includes(inquiry.status);
  });
}

export type AgendaDay = {
  key: string;
  day: number;
  title: string;
  events: Inquiry[];
  today: boolean;
  past: boolean;
};

/** Grille de l'agenda : `weeks` semaines complètes à partir du lundi de la semaine en cours. */
export function agenda(inquiries: Inquiry[], now: Date, offset: number, weeks = 5): AgendaDay[] {
  const today = dayKey(now, offset);
  const monday = mondayOf(today);
  const byDay = new Map<string, Inquiry[]>();
  for (const inquiry of inquiries) {
    const key = eventKey(inquiry);
    if (key) byDay.set(key, [...(byDay.get(key) ?? []), inquiry]);
  }
  return Array.from({ length: weeks * 7 }, (_, index) => {
    const key = shiftDay(monday, index);
    return {
      key,
      day: Number(key.slice(8)),
      title: dayTitle(key),
      events: byDay.get(key) ?? [],
      today: key === today,
      past: key < today,
    };
  });
}

const relative = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
const shortDayYear = inUtc({ day: "numeric", month: "short", year: "numeric" });

/** « à l’instant », « il y a 3 heures », « hier », « il y a 4 jours », puis la date (« 18 sept. »). */
export function relativeTime(iso: string, now: Date, offset: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const then = dayKey(date, offset);
  const today = dayKey(now, offset);
  const days = daysBetween(then, today);
  if (days <= 0) {
    const minutes = Math.floor((now.getTime() - date.getTime()) / MINUTE);
    if (minutes < 1) return "à l’instant";
    if (minutes < 60) return relative.format(-minutes, "minute");
    return relative.format(-Math.floor(minutes / 60), "hour");
  }
  if (days < 7) return relative.format(-days, "day");
  return (then.slice(0, 4) === today.slice(0, 4) ? shortDay : shortDayYear).format(utc(then));
}

/* --- Volumes, tâches et santé du catalogue ------------------------------------------ */

/** Une tour du plateau : `total` fiches, dont `core` publiées (ou demandes traitées). */
export type Volume = { id: string; label: string; total: number; core: number; caption: string };

const contentKinds: readonly { kind: Kind; label: string }[] = [
  { kind: "products", label: "Matériel" },
  { kind: "categories", label: "Catégories" },
  { kind: "services", label: "Services" },
  { kind: "projects", label: "Réalisations" },
  { kind: "events", label: "Types d’événement" },
  { kind: "cities", label: "Zones" },
];

export function contentVolumes(entries: Entry[]): Volume[] {
  return contentKinds.map(({ kind, label }) => {
    const list = entries.filter((entry) => entry.kind === kind);
    const published = list.filter((entry) => entry.published).length;
    return {
      id: kind,
      label,
      total: list.length,
      core: published,
      caption: `${many(published, "publié", "publiés")} sur ${count(list.length)}`,
    };
  });
}

export function requestVolumes(inquiries: Inquiry[]): Volume[] {
  const names: Record<Inquiry["kind"], string> = { quote: "Devis", callback: "Rappels", contact: "Messages" };
  return (["quote", "callback", "contact"] as const).map((kind) => {
    const list = inquiries.filter((inquiry) => inquiry.kind === kind);
    const handled = list.filter((inquiry) => inquiry.status !== "Nouveau").length;
    return {
      id: kind,
      label: names[kind],
      total: list.length,
      core: handled,
      caption: `${many(handled, "traitée", "traitées")} sur ${count(list.length)}`,
    };
  });
}

export type FocusItem = { id: string; label: string; hint: string; count: number; view: AdminView };

/** L'onglet où se trouvent le plus d'éléments de la liste, ou `fallback` si elle est vide. */
function busiest(list: Entry[], fallback: AdminView): AdminView {
  const counts = tally(list.map((entry) => entry.kind));
  return ([...counts].sort((a, b) => b[1] - a[1])[0]?.[0] as Kind | undefined) ?? fallback;
}

/**
 * Les tâches du moment, chacune avec l'onglet qui permet de la traiter ; les
 * tâches à faire d'abord. `closing` : événements passés à clôturer (`closingEvents`).
 */
export function focusItems(stats: Analytics, entries: Entry[], closing: number): FocusItem[] {
  const demo = entries.filter((entry) => entry.demo);
  const missing = entries.filter(
    (entry) => ["products", "services", "projects", "events"].includes(entry.kind) && !entry.image,
  );
  const items: FocusItem[] = [
    {
      id: "pending",
      label: "Rappeler les nouvelles demandes",
      hint: "Demandes au statut « Nouveau »",
      count: stats.handling.pending,
      view: "clients",
    },
    {
      id: "stale",
      label: "Relancer les demandes en attente",
      hint: `Sans réponse depuis ${STALE_DAYS} jours ou plus`,
      count: stats.handling.stale.length,
      view: "clients",
    },
    {
      id: "close",
      label: "Clôturer les événements passés",
      hint: "Date passée, demande encore ouverte",
      count: closing,
      view: "quotes",
    },
    {
      id: "demo",
      label: "Remplacer le contenu d’exemple",
      hint: "Fiches marquées « Exemple » sur le site",
      count: demo.length,
      view: busiest(demo, "projects"),
    },
    {
      id: "photos",
      label: "Ajouter les photos manquantes",
      hint: "Services, matériel, événements et réalisations",
      count: missing.length,
      view: busiest(missing, "products"),
    },
    {
      id: "cities",
      label: "Publier les zones d’intervention",
      hint: "Villes encore en brouillon",
      count: entries.filter((entry) => entry.kind === "cities" && !entry.published).length,
      view: "cities",
    },
  ];
  return [...items.filter((item) => item.count > 0), ...items.filter((item) => item.count === 0)];
}

export type Meter = { id: string; label: string; value: number; total: number };

/** Qualité des fiches matériel : ce qui rend une fiche complète et utile au devis. */
export function catalogueHealth(entries: Entry[], stats: Analytics): Meter[] {
  const products = entries.filter((entry) => entry.kind === "products");
  const requested = new Set(stats.demand.products.map((rank) => rank.id));
  const meter = (id: string, label: string, test: (product: Entry) => boolean): Meter => ({
    id,
    label,
    value: products.filter(test).length,
    total: products.length,
  });
  return [
    meter("published", "Publiés sur le site", (product) => product.published),
    meter("photo", "Avec photo", (product) => Boolean(product.image)),
    meter("identity", "Marque et modèle renseignés", (product) => Boolean(product.brand?.trim() && product.model?.trim())),
    meter("price", "Avec tarif indicatif", (product) => (product.price ?? 0) > 0 && product.pricing !== "request"),
    meter("available", "Disponibles", (product) => product.available !== false),
    meter("requested", "Déjà demandés", (product) => requested.has(product.id)),
  ];
}

/* --- Recherche ---------------------------------------------------------------------- */

/** Minuscules sans accents : « Événement » et « evenement » se retrouvent. */
export const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Chaque mot de la recherche figure dans l'un des champs (« dupont casa »). */
export function matches(query: string, ...fields: Array<string | number | null | undefined>): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = normalize(fields.filter((field) => field != null && field !== "").join(" "));
  return words.every((word) => haystack.includes(word));
}
