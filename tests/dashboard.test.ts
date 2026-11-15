import assert from "node:assert/strict";
import { test } from "node:test";
import { analytics } from "../src/lib/eventheme/analytics";
import {
  activity,
  agenda,
  catalogueHealth,
  closingEvents,
  contentVolumes,
  dayKey,
  dayLabel,
  dayTitle,
  eventWeeks,
  firstName,
  focusItems,
  greeting,
  headline,
  initials,
  isAdminView,
  matches,
  mondayOf,
  pipelineOrder,
  receivedWeeks,
  relativeTime,
  requestVolumes,
  shiftDay,
  todayLabel,
  upcomingEvents,
  utcOffset,
} from "../src/lib/eventheme/dashboard";
import { statuses, type Entry, type Inquiry } from "../src/lib/eventheme/types";

/* Dimanche 15 novembre 2026, 22 h 30 à Casablanca (UTC+1) : les journées du
   tableau de bord se comptent dans ce fuseau, quelle que soit la machine. */
const now = new Date("2026-11-15T22:30:00+01:00");
/** Casablanca, UTC+1 : le décalage que le serveur transmet au tableau de bord. */
const OFFSET = 60;
/** Horodatage d'une demande reçue le jour `key`, à l'heure de Casablanca. */
const local = (key: string, time = "12:00") => new Date(`${key}T${time}:00+01:00`).toISOString();
/** Normalise les espaces insécables des formats français. */
const plain = (value: string) => value.replace(/\s/g, " ");

let sequence = 0;
const inquiry = (over: Partial<Inquiry> = {}): Inquiry => ({
  kind: "quote",
  name: "Client",
  email: "client@example.com",
  phone: "+212600000000",
  company: "",
  city: "Casablanca",
  address: "",
  message: "",
  subject: "",
  event: "",
  date: "",
  duration: 0,
  rentalDays: 1,
  guests: 0,
  budget: 0,
  contactMethod: "WhatsApp",
  consent: true,
  website: "",
  startedAt: 0,
  basket: { services: [], products: [] },
  id: `demande-${++sequence}`,
  createdAt: local("2026-11-14"),
  status: "Nouveau",
  notes: "",
  estimate: 0,
  hasUnpriced: false,
  summary: [],
  ...over,
});

const entry = (id: string, kind: Entry["kind"], rest: Partial<Entry> = {}): Entry => ({
  id,
  kind,
  title: id,
  description: "",
  published: true,
  image: "/photo.jpg",
  ...rest,
});

/* Une semaine chargée, la précédente, et quelques demandes plus anciennes. */
const q1 = inquiry({ createdAt: local("2026-11-15", "09:00") });
const q2 = inquiry({ createdAt: local("2026-11-15", "21:00") });
const c1 = inquiry({ kind: "callback", createdAt: local("2026-11-15", "22:00") });
const q3 = inquiry({ createdAt: local("2026-11-14") });
// 00 h 10 à Casablanca, encore le 8 novembre en UTC : la demande compte pour le 9.
const m1 = inquiry({ kind: "contact", createdAt: local("2026-11-09", "00:10") });
const p1 = inquiry({ createdAt: local("2026-11-08") });
const p2 = inquiry({ createdAt: local("2026-11-08", "23:50") });
const p3 = inquiry({ createdAt: local("2026-11-02") });
const old = inquiry({ createdAt: local("2026-11-01") });
const lastYear = inquiry({ createdAt: local("2025-11-20") });
const december = inquiry({ createdAt: local("2025-12-05") });
const broken = inquiry({ createdAt: "pas une date" });
const received = [q1, q2, c1, q3, m1, p1, p2, p3, old, lastYear, december, broken];

test("days are counted in Casablanca time, whatever the machine's time zone", () => {
  assert.equal(dayKey(new Date("2026-11-15T23:30:00Z"), OFFSET), "2026-11-16");
  assert.equal(dayKey(new Date("2026-11-15T23:30:00Z"), 0), "2026-11-15");
  assert.equal(dayKey(new Date("2026-11-16T00:30:00Z"), -60), "2026-11-15");
  assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDay("2026-03-01", -1), "2026-02-28");
  assert.equal(mondayOf("2026-11-15"), "2026-11-09", "the French week starts on Monday");
  assert.equal(mondayOf("2026-11-09"), "2026-11-09");
  assert.equal(plain(dayLabel("2026-11-15")), "15 nov.");
  assert.equal(dayTitle("2026-11-15"), "dimanche 15 novembre");
});

test("the greeting follows the team's clock and names the person when it can", () => {
  assert.equal(greeting(now, OFFSET), "Bonsoir");
  assert.equal(greeting(new Date("2026-11-15T09:00:00+01:00"), OFFSET), "Bonjour");
  assert.equal(greeting(new Date("2026-11-15T17:59:00+01:00"), OFFSET), "Bonjour");
  assert.equal(greeting(new Date("2026-11-15T18:00:00+01:00"), OFFSET), "Bonsoir");
  assert.equal(greeting(new Date("2026-11-15T04:59:00+01:00"), OFFSET), "Bonsoir");
  assert.equal(todayLabel(now, OFFSET), "dimanche 15 novembre");

  assert.equal(firstName({ email: "x@eventhemes.ma", name: "  Salma  Idrissi " }), "Salma");
  assert.equal(firstName({ email: "keltoum.malouki@eventhemes.ma", name: "" }), "Keltoum");
  assert.equal(firstName({ email: "contact@eventhemes.ma", name: "" }), null, "a shared mailbox is no first name");
  assert.equal(firstName({ email: "k@eventhemes.ma", name: "" }), null);
  assert.equal(firstName({ email: "r2d2@eventhemes.ma", name: "" }), null);
  assert.equal(firstName(null), null);

  assert.equal(initials({ email: "k@eventhemes.ma", name: "Keltoum Malouki" }), "KM");
  assert.equal(initials({ email: "contact@eventhemes.ma", name: "" }), "CE");
  assert.equal(initials({ email: "", name: "Salma" }), "SA");
  assert.equal(initials(null), "A");
});

test("the business offset is read once from the time zone data, then only added", () => {
  const instant = new Date("2026-11-15T12:00:00Z");
  assert.equal(utcOffset(instant, "UTC"), 0);
  assert.equal(utcOffset(instant, "Etc/GMT-1"), 60, "a fixed UTC+1 zone");
  assert.equal(utcOffset(instant, "Asia/Kolkata"), 330, "half hours are kept");
  assert.equal(utcOffset(instant, "America/St_Johns"), -210, "west of UTC is negative");
  // Morocco's rules belong to the time zone data of the server: UTC+1, or UTC+0 during Ramadan.
  assert.ok([0, 60].includes(utcOffset(instant)));
});

test("the headline names the most urgent task, or says everything is up to date", () => {
  const say = (counts: Partial<Parameters<typeof headline>[0]>) =>
    headline({ stale: 0, pending: 0, closing: 0, upcoming: 0, ...counts });
  assert.equal(say({ stale: 1, pending: 3 }), "1 demande attend une réponse depuis 3 jours ou plus.");
  assert.equal(say({ stale: 2, pending: 2 }), "2 demandes attendent une réponse depuis 3 jours ou plus.");
  assert.equal(say({ pending: 1, closing: 4 }), "1 nouvelle demande à rappeler.");
  assert.equal(say({ pending: 2 }), "2 nouvelles demandes à rappeler.");
  assert.equal(say({ closing: 1, upcoming: 9 }), "1 événement passé à clôturer.");
  assert.equal(say({ closing: 3 }), "3 événements passés à clôturer.");
  assert.equal(say({ upcoming: 1 }), "1 événement dans les 30 prochains jours.");
  assert.equal(say({}), "Tout est à jour. Un bon moment pour enrichir le catalogue.");
});

test("events whose date has passed while the request is still open are to be closed", () => {
  const open = inquiry({ status: "En cours de traitement", date: "2026-11-01" });
  const sent = inquiry({ status: "Devis envoyé", date: "2026-11-14" });
  const done = inquiry({ status: "Terminé", date: "2026-11-01" });
  const refused = inquiry({ status: "Refusé", date: "2026-11-01" });
  const today = inquiry({ status: "Nouveau", date: "2026-11-15" });
  const undated = inquiry({ status: "Nouveau", date: "" });
  assert.deepEqual(
    closingEvents([open, sent, done, refused, today, undated], now, OFFSET).map((item) => item.id),
    [open.id, sent.id],
  );
});

test("seven days: one point per day, compared day by day with the week before", () => {
  const week = activity(received, now, OFFSET, "7");
  assert.equal(week.points.length, 7);
  assert.deepEqual(
    week.points.map((point) => [point.key, point.value, point.previous]),
    [
      ["2026-11-09", 1, 1],
      ["2026-11-10", 0, 0],
      ["2026-11-11", 0, 0],
      ["2026-11-12", 0, 0],
      ["2026-11-13", 0, 0],
      ["2026-11-14", 1, 0],
      ["2026-11-15", 3, 2],
    ],
  );
  assert.equal(week.points[6].title, "dimanche 15 novembre");
  assert.equal(week.total, 5);
  assert.equal(week.previous, 3);
  assert.equal(Math.round((week.delta ?? 0) * 100), 67);
  assert.deepEqual(week.inquiries.map((item) => item.id), [c1, q2, q1, q3, m1].map((item) => item.id), "newest first");
  assert.deepEqual(week.byKind, { quote: 3, callback: 1, contact: 1 });

  const quotes = activity(received, now, OFFSET, "7", "quote");
  assert.equal(quotes.total, 3);
  assert.equal(quotes.previous, 3);
  assert.equal(quotes.delta, 0);
  assert.deepEqual(quotes.byKind, { quote: 3, callback: 0, contact: 0 });
});

test("thirty and ninety days: daily points, then weekly points cut from today", () => {
  const month = activity(received, now, OFFSET, "30");
  assert.equal(month.points.length, 30);
  assert.equal(month.points[0].key, "2026-10-17");
  assert.equal(month.total, 9);

  const quarter = activity(received, now, OFFSET, "90");
  assert.equal(quarter.points.length, 13);
  assert.equal(quarter.points[0].key, "2026-08-18", "the oldest week is the short one");
  assert.equal(plain(quarter.points[0].title), "Du 18 août au 23 août");
  assert.equal(quarter.points[1].key, "2026-08-24");
  assert.equal(plain(quarter.points[12].title), "Du 9 nov. au 15 nov.");
  assert.equal(quarter.points[12].value, 5);
  assert.equal(quarter.total, 9);
  assert.equal(quarter.delta, null, "nothing to compare with: no variation rather than a wrong one");
});

test("twelve months: one point per month, compared with the same month a year earlier", () => {
  const year = activity(received, now, OFFSET, "12m");
  assert.equal(year.points.length, 12);
  assert.equal(year.points[0].key, "2025-12");
  assert.equal(year.points[0].value, 1);
  assert.equal(year.points[11].key, "2026-11");
  assert.equal(year.points[11].title, "novembre 2026");
  assert.equal(plain(year.points[11].label), "nov.");
  assert.equal(year.points[11].value, 9);
  assert.equal(year.points[11].previous, 1);
  assert.equal(year.total, 10);
  assert.equal(year.previous, 1);
  assert.equal(year.delta, 9);
});

test("weekly series: requests received, and events planned in the weeks ahead", () => {
  assert.deepEqual(
    receivedWeeks(received, now, OFFSET, 3).map((week) => [week.key, week.value]),
    [
      ["2026-10-26", 1],
      ["2026-11-02", 3],
      ["2026-11-09", 5],
    ],
  );
  assert.equal(plain(receivedWeeks(received, now, OFFSET, 1)[0].title), "Semaine du 9 nov.");

  const today = inquiry({ date: "2026-11-15" });
  const accepted = inquiry({ date: "2026-11-20", status: "Accepté" });
  const refused = inquiry({ date: "2026-11-20", status: "Refusé" });
  const newYear = inquiry({ date: "2026-12-31" });
  const earlier = inquiry({ date: "2026-11-10" });
  const impossible = inquiry({ date: "2026-02-30" });
  const undated = inquiry({ date: "" });
  const events = [newYear, accepted, refused, today, earlier, impossible, undated];

  assert.deepEqual(
    eventWeeks(events, now, OFFSET, 2).map((week) => [week.key, week.value]),
    [
      ["2026-11-09", 2],
      ["2026-11-16", 1],
    ],
  );
  assert.deepEqual(
    upcomingEvents(events, now, OFFSET).map((item) => [item.inquiry.id, item.days]),
    [
      [today.id, 0],
      [accepted.id, 5],
      [newYear.id, 46],
    ],
  );

  const grid = agenda(events, now, OFFSET);
  assert.equal(grid.length, 35);
  assert.equal(grid[0].key, "2026-11-09");
  assert.equal(grid[34].key, "2026-12-13");
  assert.deepEqual([grid[6].today, grid[6].past, grid[6].day], [true, false, 15]);
  assert.deepEqual([grid[1].past, grid[1].events.map((item) => item.id)], [true, [earlier.id]]);
  assert.deepEqual(grid[11].events.map((item) => item.id), [accepted.id], "a refused request leaves the agenda");
  assert.equal(grid[11].title, "vendredi 20 novembre");
});

test("relative times read naturally, then fall back to the date", () => {
  const before = (ms: number) => new Date(now.getTime() - ms).toISOString();
  assert.equal(relativeTime(before(20_000), now, OFFSET), "à l’instant");
  assert.equal(relativeTime(before(-60_000), now, OFFSET), "à l’instant", "a clock slightly ahead is not the future");
  assert.equal(plain(relativeTime(before(5 * 60_000), now, OFFSET)), "il y a 5 minutes");
  assert.equal(plain(relativeTime(before(3 * 3_600_000), now, OFFSET)), "il y a 3 heures");
  assert.equal(relativeTime(local("2026-11-14", "23:00"), now, OFFSET), "hier", "yesterday by the calendar, not by 24 hours");
  assert.equal(plain(relativeTime(local("2026-11-12"), now, OFFSET)), "il y a 3 jours");
  assert.equal(plain(relativeTime(local("2026-09-18"), now, OFFSET)), "18 sept.");
  assert.equal(plain(relativeTime(local("2025-09-18"), now, OFFSET)), "18 sept. 2025");
  assert.equal(relativeTime("nope", now, OFFSET), "");
});

const entries: Entry[] = [
  entry("console", "products", { brand: "Yamaha", model: "CL5", price: 1200, pricing: "daily" }),
  entry("lyre", "products", { published: false, image: undefined, price: null, pricing: "request", available: false }),
  entry("ecran", "products", { brand: "Absen", model: " ", price: 900, pricing: "request" }),
  entry("son", "categories"),
  entry("gala", "projects", { demo: true }),
  entry("concert", "projects", { demo: true, image: undefined }),
  entry("mariage", "events", { image: undefined }),
  entry("rabat", "cities", { published: false }),
  entry("tanger", "cities", { published: false }),
  entry("settings", "settings"),
];

test("the stage towers count every record and how many are published or handled", () => {
  const towers = contentVolumes(entries);
  assert.deepEqual(towers.map((tower) => tower.id), ["products", "categories", "services", "projects", "events", "cities"]);
  const byId = Object.fromEntries(towers.map((tower) => [tower.id, tower]));
  assert.deepEqual([byId.products.total, byId.products.core, byId.products.caption], [3, 2, "2 publiés sur 3"]);
  assert.deepEqual([byId.services.total, byId.services.caption], [0, "0 publié sur 0"]);
  assert.equal(byId.cities.caption, "0 publié sur 2");
  assert.equal(byId.categories.caption, "1 publié sur 1");

  const requests = requestVolumes([q1, inquiry({ status: "Devis envoyé" }), c1, m1]);
  assert.deepEqual(
    requests.map((tower) => [tower.id, tower.label, tower.total, tower.core, tower.caption]),
    [
      ["quote", "Devis", 2, 1, "1 traitée sur 2"],
      ["callback", "Rappels", 1, 0, "0 traitée sur 1"],
      ["contact", "Messages", 1, 0, "0 traitée sur 1"],
    ],
  );
});

test("the focus list puts the tasks to do first, each with the tab that solves it", () => {
  const ago = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
  const stats = analytics(entries, [inquiry({ createdAt: ago(5) }), inquiry({ createdAt: ago(0.2) })], now);
  const items = focusItems(stats, entries, 0);
  assert.deepEqual(
    items.map((item) => [item.id, item.count, item.view]),
    [
      ["pending", 2, "clients"],
      ["stale", 1, "clients"],
      ["demo", 2, "projects"],
      ["photos", 3, "products"],
      ["cities", 2, "cities"],
      ["close", 0, "quotes"],
    ],
  );
  const quiet = focusItems(analytics([], [], now), [], 0);
  assert.ok(quiet.every((item) => item.count === 0));
  assert.deepEqual(
    quiet.filter((item) => ["demo", "photos"].includes(item.id)).map((item) => item.view),
    ["projects", "products"],
    "with nothing to fix, each task still opens a sensible tab",
  );
});

test("catalogue health measures how complete the equipment sheets are", () => {
  const stats = analytics(entries, [inquiry({ basket: { services: [], products: [{ id: "ecran", quantity: 2, variant: "" }] } })], now);
  assert.deepEqual(
    catalogueHealth(entries, stats).map((meter) => [meter.id, meter.value, meter.total]),
    [
      ["published", 2, 3],
      ["photo", 2, 3],
      ["identity", 1, 3],
      ["price", 1, 3],
      ["available", 2, 3],
      ["requested", 1, 3],
    ],
  );
});

test("search ignores case and accents and needs every word somewhere", () => {
  assert.equal(matches("dupont casa", "Jean Dupont", "Casablanca"), true);
  assert.equal(matches("événement", "EVENEMENT"), true);
  assert.equal(matches("evt-2026", "EVT-2026-0001", null, undefined, ""), true);
  assert.equal(matches("rabat", "Casablanca"), false);
  assert.equal(matches("   ", "anything"), true, "an empty search keeps everything");
  assert.equal(matches("120", 120), true);
});

test("admin views and the pipeline order are closed lists", () => {
  for (const view of ["dashboard", "statistics", "quotes", "messages", "clients", "products", "settings"])
    assert.equal(isAdminView(view), true, view);
  for (const value of ["", "admin", "Products", undefined, 3]) assert.equal(isAdminView(value), false, String(value));
  assert.deepEqual([...pipelineOrder].sort(), [...statuses].sort(), "every status, once");
  assert.equal(pipelineOrder.at(-1), "Refusé", "the exit comes last");
});
