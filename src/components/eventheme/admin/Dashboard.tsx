"use client";

/* ==========================================================================
   Tableau de bord — l'accueil de l'administration

   Haut de page : l'état présent (à traiter, événements à venir, portefeuille,
   plateau en volume, agenda, tâches). Section « Activité » : tout ce qui
   dépend de la période choisie, sous une seule rangée de filtres.
   ========================================================================== */
import dynamic from "next/dynamic";
import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ArrowUpRightIcon, CalendarIcon, SearchIcon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";
import { analytics, count, delta, UPCOMING_DAYS, type Analytics } from "@/lib/eventheme/analytics";
import type { AdminAccount } from "@/lib/eventheme/auth";
import {
  activity,
  agenda,
  catalogueHealth,
  closingEvents,
  contentVolumes,
  dayKey,
  dayLabel,
  eventWeeks,
  firstName,
  focusItems,
  greeting,
  headline,
  inquiryKindLabels,
  kindFilters,
  matches,
  periods,
  pipelineOrder,
  receivedWeeks,
  relativeTime,
  requestVolumes,
  todayLabel,
  upcomingEvents,
  type AdminView,
  type KindFilter,
  type PeriodId,
  type Volume,
} from "@/lib/eventheme/dashboard";
import { referenceOf, siteSettings, type Entry, type Inquiry, type Kind, type Status } from "@/lib/eventheme/types";
import { gsap, revealSafe, ScrollTrigger, useGSAP } from "@/lib/motion";
import { AreaChart, CountUp, DotRow, MeterList, MiniColumns, RankBars, Ring, SegmentedBar } from "./charts";
import Showcase from "./Showcase";
import {
  BellIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  DatabaseIcon,
  ExternalIcon,
  GlobeIcon,
  ImageIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
  PlusIcon,
  QuoteIcon,
  SendIcon,
  ServiceIcon,
  SparkIcon,
  TrendIcon,
  WalletIcon,
} from "./icons";
import s from "./Admin.module.css";

const StageVolume = dynamic(() => import("./StageVolume"), {
  ssr: false,
  loading: () => <div className={s.stageLoading} aria-hidden="true" />,
});

export type MailStatus = { mode: "provider" | "preview" | "off"; recipients: string[] };

/** Teinte de chaque statut : la rampe d'or suit le parcours, « Refusé » reste gris. */
const statusTone: Record<Status, string> = {
  Nouveau: "--rampe-1",
  "En cours de traitement": "--rampe-2",
  "Devis envoyé": "--rampe-3",
  Accepté: "--rampe-4",
  Terminé: "--rampe-5",
  Refusé: "--gris",
};

const kindIcon: Record<Inquiry["kind"], ReactNode> = {
  quote: <QuoteIcon />,
  callback: <PhoneIcon />,
  contact: <MailIcon />,
};

const focusIcon: Record<string, ReactNode> = {
  pending: <PhoneIcon />,
  stale: <BellIcon />,
  close: <CalendarIcon />,
  demo: <SparkIcon />,
  photos: <ImageIcon />,
  cities: <PinIcon />,
};

/** Singulier et pluriel de chaque formulaire (« devis » est invariable). */
const kindCount: Record<Inquiry["kind"], [string, string]> = {
  quote: ["devis", "devis"],
  callback: ["rappel", "rappels"],
  contact: ["message", "messages"],
};

/** « 901 k », « 1,2 M » : la devise s'affiche à part, en petit. */
const compactNumber = (value: number) =>
  new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(value);

/** Onglet ouvert par un clic sur une tour du plateau. */
const towerView: Record<string, AdminView> = { quote: "quotes", callback: "clients", contact: "messages" };

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={s.status} style={{ ["--tone" as string]: `var(${statusTone[status]})` }}>
      <i aria-hidden="true" />
      {status}
    </span>
  );
}

function Delta({ value, period }: { value: number | null; period: string }) {
  if (value == null) return <span className={s.pill} data-tone="muted">Sans comparaison</span>;
  const down = value < 0;
  return (
    <span className={s.pill} data-tone={down ? "muted" : "gold"}>
      <TrendIcon down={down} />
      {delta(value)}
      <span className="visually-hidden"> par rapport aux {period}</span>
    </span>
  );
}

function Kpi({
  icon,
  label,
  action,
  onAction,
  value,
  unit,
  visual,
  badge,
  note,
  featured = false,
}: {
  icon: ReactNode;
  label: string;
  /** Intitulé du lien qui couvre la carte. */
  action: string;
  onAction: () => void;
  value: ReactNode;
  unit?: string;
  visual: ReactNode;
  badge?: ReactNode;
  note: ReactNode;
  featured?: boolean;
}) {
  return (
    <article className={s.kpi} data-featured={featured ? "" : undefined} data-spotlight="" data-reveal="">
      {/* <div> et non <header> : le thème clair peint tout <header> (tokens.css). */}
      <div className={s.kpiHead}>
        <span className={s.kpiIcon}>{icon}</span>
        <h3>{label}</h3>
        <button type="button" className={s.kpiLink} onClick={onAction} aria-label={action} title={action}>
          <ArrowUpRightIcon />
        </button>
      </div>
      <div className={s.kpiBody}>
        <p className={s.kpiValue}>
          {value}
          {unit && <small>{unit}</small>}
        </p>
        <div className={s.kpiVisual}>{visual}</div>
      </div>
      <div className={s.kpiFoot}>
        {badge}
        <span>{note}</span>
      </div>
    </article>
  );
}

function CardHead({ eyebrow, title, id, text, children }: { eyebrow: string; title: string; id: string; text?: ReactNode; children?: ReactNode }) {
  return (
    <div className={s.cardHead}>
      <div>
        <p className={s.eyebrow}>{eyebrow}</p>
        <h2 id={id}>{title}</h2>
        {text && <p className={s.cardText}>{text}</p>}
      </div>
      {children && <div className={s.cardTools}>{children}</div>}
    </div>
  );
}

/** Version à plat du plateau, si WebGL n'est pas disponible. */
function FlatStage({ volumes }: { volumes: Volume[] }) {
  const most = Math.max(...volumes.map((volume) => volume.total), 1);
  return (
    <div className={s.flatStage} aria-hidden="true">
      {volumes.map((volume) => (
        <span key={volume.id} className={s.flatTower}>
          <b>{count(volume.total)}</b>
          <span className={s.flatFrame} style={{ height: `${(volume.total / most) * 100}%` }}>
            <span className={s.flatCore} style={{ height: volume.total ? `${(volume.core / volume.total) * 100}%` : 0 }} />
          </span>
          <small>{volume.label}</small>
        </span>
      ))}
    </div>
  );
}

export default function Dashboard({
  entries,
  inquiries,
  stats,
  now,
  offset,
  account,
  local,
  mail,
  navigate,
  openInquiry,
  editEntry,
  createEntry,
}: {
  entries: Entry[];
  inquiries: Inquiry[];
  stats: Analytics;
  now: number;
  /** Décalage de Casablanca sur UTC, lu par le serveur (voir `utcOffset`). */
  offset: number;
  account: AdminAccount;
  local: boolean;
  mail: MailStatus;
  navigate: (view: AdminView) => void;
  openInquiry: (inquiry: Inquiry) => void;
  editEntry: (entry: Entry) => void;
  createEntry: (kind: Kind) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const date = useMemo(() => new Date(now), [now]);
  const [period, setPeriod] = useState<PeriodId>("30");
  const [kind, setKind] = useState<KindFilter>("all");
  const [dataset, setDataset] = useState<"contents" | "requests">("contents");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [stageFailed, setStageFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [day, setDay] = useState<string | null>(null);

  const name = firstName(account);
  const month = useMemo(() => activity(inquiries, date, offset, "30"), [inquiries, date, offset]);
  const weeks = useMemo(() => receivedWeeks(inquiries, date, offset), [inquiries, date, offset]);
  const ahead = useMemo(() => eventWeeks(inquiries, date, offset), [inquiries, date, offset]);
  const upcoming = useMemo(() => upcomingEvents(inquiries, date, offset), [inquiries, date, offset]);
  const closing = useMemo(() => closingEvents(inquiries, date, offset), [inquiries, date, offset]);
  const grid = useMemo(() => agenda(inquiries, date, offset), [inquiries, date, offset]);
  const series = useMemo(() => activity(inquiries, date, offset, period, kind), [inquiries, date, offset, period, kind]);
  const slice = useMemo(() => analytics(entries, series.inquiries, date), [entries, series, date]);
  const volumes = useMemo(
    () => (dataset === "contents" ? contentVolumes(entries) : requestVolumes(inquiries)),
    [dataset, entries, inquiries],
  );
  const focus = useMemo(() => focusItems(stats, entries, closing.length), [stats, entries, closing]);
  const health = useMemo(() => catalogueHealth(entries, stats), [entries, stats]);
  const projects = useMemo(() => entries.filter((entry) => entry.kind === "projects"), [entries]);
  const settings = siteSettings(entries);
  const periodInfo = periods.find((item) => item.id === period) ?? periods[1];
  const today = dayKey(date, offset);
  const soon = upcoming.filter((item) => item.days <= UPCOMING_DAYS);
  const eventTitle = (id: string) => entries.find((entry) => entry.kind === "events" && entry.id === id)?.title ?? "";
  const todo = focus.filter((item) => item.count > 0).length;
  const published = entries.filter((entry) => entry.published && entry.kind !== "settings").length;
  const recent = series.inquiries
    .filter((inquiry) =>
      matches(search, referenceOf(inquiry), inquiry.name, inquiry.company, inquiry.email, inquiry.phone, inquiry.city, inquiry.status),
    )
    .slice(0, 7);
  const selected = day ? grid.find((item) => item.key === day) : null;
  const agendaList = selected ? selected.events.map((inquiry) => ({ inquiry, key: selected.key })) : upcoming.slice(0, 5);
  const mostEvents = Math.max(...grid.map((item) => item.events.length), 0);

  /*
   * Apparitions. Ce qui est à l'écran au chargement entre par une animation CSS,
   * jouée dès le premier affichage (le cacher à l'hydratation le ferait
   * clignoter). Ce qui est plus bas est confié à GSAP : caché tant qu'on ne l'a
   * pas vu, il monte à son entrée dans l'écran.
   */
  useGSAP(
    () =>
      revealSafe(root, (full) => {
        const node = root.current;
        if (!full || !node) return;
        const below = [...node.querySelectorAll<HTMLElement>("[data-reveal]")].filter(
          (item) => item.getBoundingClientRect().top > window.innerHeight,
        );
        if (!below.length) return;
        below.forEach((item) => (item.style.animation = "none"));
        gsap.set(below, { opacity: 0, y: 30 });
        const batches = ScrollTrigger.batch(below, {
          start: "top 94%",
          once: true,
          onEnter: (elements) =>
            gsap.fromTo(
              elements,
              { opacity: 0, y: 30 },
              { opacity: 1, y: 0, duration: 0.85, ease: "power3.out", stagger: 0.08, overwrite: true, clearProps: "opacity,transform" },
            ),
        });
        return () => {
          batches.forEach((trigger) => trigger.kill());
          below.forEach((item) => (item.style.animation = ""));
        };
      }),
    { scope: root },
  );

  /** Halo doré qui suit le pointeur sur les cartes. */
  function spotlight(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const card = (event.target as HTMLElement).closest<HTMLElement>("[data-spotlight]");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    card.style.setProperty("--my", `${event.clientY - rect.top}px`);
  }

  const selectTower = (id: string) => navigate(towerView[id] ?? (id as AdminView));

  const mailLine =
    mail.mode === "off"
      ? { title: "E-mails automatiques non configurés", detail: "Les nouvelles demandes n’arrivent que dans cette administration." }
      : mail.mode === "preview"
        ? { title: "E-mails en aperçu local", detail: "Alertes et accusés de réception enregistrés dans .eventheme/emails/, pas envoyés." }
        : mail.recipients.length
          ? { title: "Alertes e-mail actives", detail: `Envoyées à ${mail.recipients.join(", ")}. Les clients reçoivent un accusé de réception.` }
          : { title: "Aucune adresse ne reçoit les alertes", detail: "Ajoutez un lien « E-mail » dans Contact & réseaux, ou définissez EMAIL_TEAM." };

  const pipelineParts = pipelineOrder.map((status) => ({
    id: status,
    label: status,
    value: slice.pipeline.find((line) => line.status === status)?.count ?? 0,
    tone: statusTone[status],
  }));
  const pipelineTotal = pipelineParts.reduce((sum, part) => sum + part.value, 0);

  return (
    <div ref={root} className={s.dashboard} onPointerMove={spotlight}>
      {/* --- En-tête -------------------------------------------------------- */}
      <section className={s.hello} aria-labelledby="bonjour">
        <div>
          <p className={s.today}>
            <i aria-hidden="true" />
            {todayLabel(date, offset)}
            {local && <span> · Aperçu local</span>}
          </p>
          <h1 id="bonjour" className={s.helloTitle}>
            {greeting(date, offset)}
            {name ? (
              <>
                , <span className={s.gold}>{name}</span>
              </>
            ) : (
              "."
            )}
          </h1>
          <p className={s.helloText}>
            {headline({
              stale: stats.handling.stale.length,
              pending: stats.handling.pending,
              closing: closing.length,
              upcoming: soon.length,
            })}
          </p>
        </div>
        <div className={s.helloActions}>
          <button type="button" className={s.buttonGhost} onClick={() => createEntry("projects")}>
            <PlusIcon /> Nouvelle réalisation
          </button>
          <button type="button" className={s.buttonGold} onClick={() => createEntry("products")}>
            <PlusIcon /> Ajouter du matériel
          </button>
        </div>
      </section>

      {/* --- Indicateurs du moment ------------------------------------------ */}
      <div className={s.kpis}>
        <Kpi
          icon={<BellIcon />}
          label="À traiter"
          action="Ouvrir les demandes à traiter"
          onAction={() => navigate("clients")}
          value={<CountUp value={stats.handling.pending} />}
          unit={stats.handling.pending > 1 ? "demandes" : "demande"}
          visual={
            <DotRow
              total={stats.handling.pending}
              filled={stats.handling.stale.length}
              label={`${count(stats.handling.pending)} demandes au statut « Nouveau », dont ${count(stats.handling.stale.length)} à relancer`}
            />
          }
          badge={
            stats.handling.stale.length ? (
              <span className={s.pill} data-tone="gold">
                {count(stats.handling.stale.length)} à relancer
              </span>
            ) : (
              <span className={s.pill} data-tone="muted">
                À jour
              </span>
            )
          }
          note={
            stats.handling.oldestPendingDays != null
              ? `Plus ancienne : ${count(stats.handling.oldestPendingDays)} j`
              : "Aucune en attente"
          }
        />
        <Kpi
          icon={<QuoteIcon />}
          label="Demandes · 30 jours"
          action="Voir les statistiques"
          onAction={() => navigate("statistics")}
          value={<CountUp value={month.total} />}
          unit="reçues"
          visual={<MiniColumns points={weeks} label="Demandes reçues par semaine" />}
          badge={<Delta value={month.delta} period="30 jours précédents" />}
          note={`${count(month.points[month.points.length - 1]?.value ?? 0)} aujourd’hui`}
        />
        <Kpi
          icon={<CalendarIcon />}
          label={`Événements · ${UPCOMING_DAYS} j`}
          action="Voir l’agenda"
          onAction={() => document.getElementById("agenda")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          value={<CountUp value={soon.length} />}
          unit="à venir"
          visual={<MiniColumns points={ahead} label="Événements demandés par semaine, à partir de cette semaine" accent="first" />}
          badge={
            <span className={s.pill} data-tone={soon.length ? "gold" : "muted"}>
              {count(soon.filter((item) => item.key.slice(0, 7) === today.slice(0, 7)).length)} ce mois-ci
            </span>
          }
          note={upcoming[0] ? `Prochain : ${dayLabel(upcoming[0].key)}` : "Aucun événement daté"}
        />
        <Kpi
          featured
          icon={<WalletIcon />}
          label="Portefeuille ouvert"
          action="Voir la valeur estimée dans les statistiques"
          onAction={() => navigate("statistics")}
          value={<CountUp value={stats.value.pipeline} format={compactNumber} />}
          unit="MAD"
          visual={
            <Ring
              value={stats.conversion.winRate}
              label={`Taux de concrétisation : ${stats.conversion.winRate == null ? "pas encore de demande décidée" : `${Math.round(stats.conversion.winRate * 100)} %`}`}
            />
          }
          badge={<span className={s.pill} data-tone="ink">Concrétisation</span>}
          note={`Indicatif · ${count(stats.handling.open)} ouverte${stats.handling.open > 1 ? "s" : ""}`}
        />
      </div>

      {/* --- Plateau en volume et site public -------------------------------- */}
      <div className={s.grid}>
        <section className={cx(s.card, s.span8, s.stageCard)} aria-labelledby="plateau" data-reveal="">
          <CardHead
            eyebrow="En volume"
            title="Le plateau d’un coup d’œil"
            id="plateau"
            text={
              dataset === "contents"
                ? "Chaque tour grandit avec ses fiches ; son cœur doré, ce sont les fiches publiées."
                : "Chaque tour grandit avec les demandes reçues ; son cœur doré, celles déjà traitées."
            }
          >
            <div className={s.segmentedControl} role="group" aria-label="Données du plateau">
              <button type="button" aria-pressed={dataset === "contents"} onClick={() => setDataset("contents")}>
                Contenus
              </button>
              <button type="button" aria-pressed={dataset === "requests"} onClick={() => setDataset("requests")}>
                Demandes
              </button>
            </div>
          </CardHead>
          <div className={s.stage}>
            {stageFailed ? (
              <FlatStage volumes={volumes} />
            ) : (
              <StageVolume
                volumes={volumes}
                highlight={highlight}
                onHighlight={setHighlight}
                onSelect={selectTower}
                onFail={() => setStageFailed(true)}
              />
            )}
          </div>
          <ul className={s.stageLegend} aria-label="Détail du plateau">
            {volumes.map((volume) => (
              <li key={volume.id}>
                <button
                  type="button"
                  data-active={highlight === volume.id ? "" : undefined}
                  onPointerEnter={() => setHighlight(volume.id)}
                  onPointerLeave={() => setHighlight(null)}
                  onFocus={() => setHighlight(volume.id)}
                  onBlur={() => setHighlight(null)}
                  onClick={() => selectTower(volume.id)}
                >
                  <i className={s.legendSwatch} aria-hidden="true" />
                  <span>
                    <b>{volume.label}</b>
                    <small>{volume.caption}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className={cx(s.card, s.span4, s.siteCard)} aria-labelledby="site" data-reveal="" data-spotlight="">
          <div className={s.siteLogo}>
            <img src="/eventheme_logo_png.webp" alt="" width={150} height={68} />
          </div>
          <h2 id="site" className={s.siteName}>
            EVENTHEMES
          </h2>
          <p className={s.cardText}>Site vitrine · Catalogue · Devis</p>
          <p className={s.siteStatus} data-closed={settings.comingSoon ? "" : undefined}>
            <i aria-hidden="true" />
            {settings.comingSoon ? "Page d’attente affichée" : "Site public en ligne"}
          </p>
          <ul className={s.langs} aria-label="Langues du site">
            <li data-on="">FR</li>
            <li data-on={settings.english ? "" : undefined}>
              EN<span className="visually-hidden">{settings.english ? " publiée" : " masquée"}</span>
            </li>
            <li data-on={settings.arabic ? "" : undefined}>
              AR<span className="visually-hidden">{settings.arabic ? " publiée" : " masquée"}</span>
            </li>
          </ul>
          <dl className={s.siteStats}>
            <div>
              <dt>Fiches publiées</dt>
              <dd>{count(published)}</dd>
            </div>
            <div>
              <dt>Demandes</dt>
              <dd>{count(inquiries.length)}</dd>
            </div>
            <div>
              <dt>Acceptées</dt>
              <dd>{count(stats.conversion.won)}</dd>
            </div>
          </dl>
          <div className={s.siteActions}>
            <a className={s.buttonLight} href="/" target="_blank" rel="noreferrer">
              Voir le site <ExternalIcon />
            </a>
            <button type="button" className={s.buttonGhost} onClick={() => navigate("settings")}>
              Paramètres
            </button>
          </div>
          <ul className={s.system}>
            <li>
              <DatabaseIcon />
              <span>
                <b>{local ? "Données locales" : "Base de données en ligne"}</b>
                <small>{local ? "Aperçu sur cet ordinateur : les formulaires alimentent cette administration." : "Supabase, sauvegardée et sécurisée."}</small>
              </span>
            </li>
            <li>
              <SendIcon />
              <span>
                <b>{mailLine.title}</b>
                <small>{mailLine.detail}</small>
              </span>
            </li>
            <li>
              <GlobeIcon />
              <span>
                <b>{[settings.english && "Anglais", settings.arabic && "Arabe"].filter(Boolean).join(" et ") || "Français seul"}</b>
                <small>{settings.english || settings.arabic ? "Versions publiées en plus du français." : "Les versions traduites sont masquées."}</small>
              </span>
            </li>
          </ul>
        </section>
      </div>

      {/* --- Agenda et tâches ------------------------------------------------- */}
      <div className={s.grid}>
        <section id="agenda" className={cx(s.card, s.span8)} aria-labelledby="agenda-titre" data-reveal="">
          <CardHead eyebrow="Agenda" title="Les cinq prochaines semaines" id="agenda-titre" text="Dates d’événement des demandes, hors refus. Choisissez un jour pour voir ses événements.">
            <span className={s.scale} aria-hidden="true">
              Moins <i data-level="0" />
              <i data-level="1" />
              <i data-level="2" />
              <i data-level="3" /> Plus
            </span>
          </CardHead>
          <div className={s.agenda}>
            <div className={s.calendar}>
              {["L", "M", "M", "J", "V", "S", "D"].map((letter, index) => (
                <span key={index} className={s.weekday} aria-hidden="true">
                  {letter}
                </span>
              ))}
              {grid.map((item) => {
                const level = !item.events.length ? 0 : mostEvents <= 1 ? 3 : Math.min(3, Math.ceil((item.events.length / mostEvents) * 3));
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={s.dayCell}
                    data-level={level}
                    data-today={item.today ? "" : undefined}
                    data-past={item.past ? "" : undefined}
                    aria-pressed={day === item.key}
                    aria-label={`${item.title}${item.today ? " (aujourd’hui)" : ""} : ${item.events.length ? `${count(item.events.length)} événement${item.events.length > 1 ? "s" : ""}` : "aucun événement"}`}
                    title={`${item.title} : ${count(item.events.length)}`}
                    onClick={() => setDay((current) => (current === item.key ? null : item.key))}
                  >
                    {item.day === 1 ? dayLabel(item.key) : item.day}
                  </button>
                );
              })}
            </div>
            <div className={s.agendaList}>
              <p className={s.agendaTitle}>
                {selected ? selected.title : "Prochains événements"}
                {selected && (
                  <button type="button" className={s.linkButton} onClick={() => setDay(null)}>
                    Tout voir
                  </button>
                )}
              </p>
              {agendaList.length ? (
                <ul className={s.rows}>
                  {agendaList.map(({ inquiry, key }) => (
                    <li key={inquiry.id}>
                      <button type="button" className={s.row} onClick={() => openInquiry(inquiry)}>
                        <span className={s.dateBlock} aria-hidden="true">
                          <b>{Number(key.slice(8))}</b>
                          <small>{dayLabel(key).replace(/^\d+\s/, "")}</small>
                        </span>
                        <span className={s.rowText}>
                          <strong>{inquiry.name}</strong>
                          <small className={s.twoLines}>
                            <span className="visually-hidden">{dayLabel(key)} · </span>
                            {[inquiry.company, eventTitle(inquiry.event), inquiry.city, inquiry.guests ? `${count(inquiry.guests)} pers.` : ""]
                              .filter(Boolean)
                              .join(" · ") || "Détails à préciser"}
                          </small>
                        </span>
                        <StatusPill status={inquiry.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={s.emptyState}>
                  <CalendarIcon />
                  <p>{selected ? "Aucun événement ce jour-là." : "Aucun événement daté à venir."}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={cx(s.card, s.span4)} aria-labelledby="focus" data-reveal="">
          <CardHead eyebrow="À faire" title="Votre focus" id="focus">
            <span className={s.counter} aria-label={`${todo} tâche${todo > 1 ? "s" : ""} en attente`}>
              {todo}
            </span>
          </CardHead>
          <ul className={s.focusList}>
            {focus.map((item) => (
              <li key={item.id}>
                <button type="button" className={s.focusItem} data-done={item.count ? undefined : ""} onClick={() => navigate(item.view)}>
                  <span className={s.focusIcon}>{item.count ? focusIcon[item.id] : <CheckCircleIcon />}</span>
                  <span className={s.focusText}>
                    <b>{item.label}</b>
                    <small>{item.count ? item.hint : "À jour"}</small>
                  </span>
                  <span className={s.focusCount}>{count(item.count)}</span>
                  <ChevronRightIcon className={s.rowChevron} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* --- Activité : une rangée de filtres pour tout ce qui suit ---------- */}
      <section className={s.activity} aria-labelledby="activite">
        <div className={s.sectionHead} data-reveal="">
          <div>
            <p className={s.eyebrow}>Activité</p>
            <h2 id="activite">Le rythme des demandes</h2>
          </div>
          <div className={s.filters}>
            <div className={s.segmentedControl} role="group" aria-label="Période">
              {periods.map((item) => (
                <button key={item.id} type="button" aria-pressed={period === item.id} onClick={() => setPeriod(item.id)} title={item.title}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className={s.segmentedControl} role="group" aria-label="Formulaire">
              {kindFilters.map((item) => (
                <button key={item.id} type="button" aria-pressed={kind === item.id} onClick={() => setKind(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={s.grid}>
          <article className={cx(s.card, s.span8)} aria-labelledby="courbe" data-reveal="">
            <CardHead eyebrow="Vue d’ensemble" title="Demandes reçues" id="courbe" />
            <div className={s.summary}>
              <p className={s.hero}>
                <CountUp key={`${period}-${kind}`} value={series.total} />
                <small>{series.total > 1 ? "demandes" : "demande"}</small>
              </p>
              <Delta value={series.delta} period={periodInfo.previous} />
              {kind === "all" && series.total > 0 && (
                <p className={s.split}>
                  {(["quote", "callback", "contact"] as const)
                    .filter((item) => series.byKind[item])
                    .map((item) => `${count(series.byKind[item])} ${kindCount[item][series.byKind[item] > 1 ? 1 : 0]}`)
                    .join(" · ")}
                </p>
              )}
              <ul className={s.legend}>
                <li>
                  <i className={s.keyCurrent} aria-hidden="true" />
                  {periodInfo.title}
                </li>
                <li>
                  <i className={s.keyPrevious} aria-hidden="true" />
                  {periodInfo.previous}
                </li>
              </ul>
            </div>
            <AreaChart
              points={series.points}
              current={periodInfo.title}
              previous={periodInfo.previous}
              unit="demandes"
              animationKey={`${period}-${kind}`}
            />
          </article>

          <article className={cx(s.card, s.span4)} aria-labelledby="suivi" data-reveal="">
            <CardHead eyebrow="Suivi" title="Où en sont les demandes" id="suivi" text={`Demandes reçues sur les ${periodInfo.title}, par statut.`} />
            <SegmentedBar
              parts={pipelineParts}
              label={pipelineParts.map((part) => `${part.label} : ${count(part.value)}`).join(", ")}
            />
            <ul className={s.pipeline}>
              {pipelineParts.map((part) => (
                <li key={part.id} data-zero={part.value ? undefined : ""}>
                  <i style={{ background: `var(${part.tone})` }} aria-hidden="true" />
                  <span>{part.label}</span>
                  <b>{count(part.value)}</b>
                  <small>{pipelineTotal ? `${Math.round((part.value / pipelineTotal) * 100)} %` : "—"}</small>
                </li>
              ))}
            </ul>
            <div className={s.conversion}>
              <Ring
                value={slice.conversion.winRate}
                size={72}
                label={`Concrétisation sur la période : ${slice.conversion.winRate == null ? "aucune demande décidée" : `${Math.round(slice.conversion.winRate * 100)} %`}`}
              />
              <p>
                <b>Concrétisation</b>
                <small>
                  {slice.conversion.decided
                    ? `${count(slice.conversion.won)} acceptée${slice.conversion.won > 1 ? "s" : ""} ou terminée${slice.conversion.won > 1 ? "s" : ""} sur ${count(slice.conversion.decided)} décidée${slice.conversion.decided > 1 ? "s" : ""}.`
                    : "Aucune demande décidée sur la période."}
                </small>
              </p>
            </div>
          </article>
        </div>

        <div className={cx(s.grid, s.trio)}>
          <article className={s.card} aria-labelledby="types" data-reveal="">
            <CardHead eyebrow="Ce que demandent les clients" title="Types d’événement" id="types" />
            <RankBars
              showShare
              items={slice.demand.eventTypes.slice(0, 6)}
              empty="Aucun type d’événement précisé sur la période."
            />
          </article>
          <article className={s.card} aria-labelledby="prestations" data-reveal="">
            <CardHead eyebrow="Ce que demandent les clients" title="Prestations" id="prestations" />
            <RankBars
              showShare
              items={slice.demand.services.slice(0, 6).map((item) => ({ ...item, icon: <ServiceIcon id={item.id} title={item.label} /> }))}
              empty="Aucune prestation choisie sur la période."
            />
          </article>
          <article className={s.card} aria-labelledby="villes" data-reveal="">
            <CardHead eyebrow="Ce que demandent les clients" title="Villes" id="villes" />
            <RankBars showShare items={slice.demand.cities.slice(0, 6)} empty="Aucune ville précisée sur la période." />
          </article>
        </div>

        <article className={s.card} aria-labelledby="recentes" data-reveal="">
          <CardHead eyebrow="Fraîchement reçues" title="Dernières demandes" id="recentes">
            <span className={s.counter} data-wide="">
              {count(series.inquiries.length)} sur la période
            </span>
          </CardHead>
          <label className={s.find}>
            <SearchIcon />
            <span className="visually-hidden">Rechercher parmi les demandes de la période</span>
            <input
              type="search"
              placeholder="Nom, référence, ville, statut…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {recent.length ? (
            <ul className={s.rows}>
              {recent.map((inquiry) => (
                <li key={inquiry.id}>
                  <button type="button" className={s.row} onClick={() => openInquiry(inquiry)}>
                    <span className={s.rowIcon} title={inquiryKindLabels[inquiry.kind]}>
                      {kindIcon[inquiry.kind]}
                    </span>
                    <span className={s.rowText}>
                      <strong>
                        {inquiry.name}
                        {inquiry.company && <small> · {inquiry.company}</small>}
                      </strong>
                      <small>
                        {[inquiryKindLabels[inquiry.kind], referenceOf(inquiry), eventTitle(inquiry.event), inquiry.city].filter(Boolean).join(" · ")}
                      </small>
                    </span>
                    <StatusPill status={inquiry.status} />
                    <time className={s.rowTime} dateTime={inquiry.createdAt}>
                      {relativeTime(inquiry.createdAt, date, offset)}
                    </time>
                    <ChevronRightIcon className={s.rowChevron} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className={s.emptyState}>
              <QuoteIcon />
              <p>{search ? `Aucune demande ne correspond à « ${search} ».` : "Aucune demande reçue sur la période."}</p>
            </div>
          )}
          <div className={s.cardFoot}>
            <button type="button" className={s.linkButton} onClick={() => navigate("clients")}>
              Toutes les demandes <ChevronRightIcon />
            </button>
          </div>
        </article>
      </section>

      {/* --- Vitrine et catalogue ---------------------------------------------- */}
      <div className={s.grid}>
        <section className={cx(s.card, s.span5)} aria-labelledby="vitrine" data-reveal="">
          <CardHead eyebrow="En vitrine" title="Vos réalisations" id="vitrine">
            <button type="button" className={s.linkButton} onClick={() => navigate("projects")}>
              Gérer <ChevronRightIcon />
            </button>
          </CardHead>
          <Showcase key={projects.map((project) => project.id).join("|")} projects={projects} open={editEntry} />
        </section>
        <section className={cx(s.card, s.span7)} aria-labelledby="sante" data-reveal="">
          <CardHead
            eyebrow="Catalogue"
            title="Santé du matériel"
            id="sante"
            text="Une fiche complète (photo, marque, modèle, tarif) rend le devis plus précis."
          >
            <button type="button" className={s.linkButton} onClick={() => navigate("products")}>
              Ouvrir le matériel <ChevronRightIcon />
            </button>
          </CardHead>
          {health[0].total ? (
            <MeterList meters={health} />
          ) : (
            <div className={s.emptyState}>
              <SparkIcon />
              <p>Aucun matériel au catalogue pour le moment.</p>
            </div>
          )}
          {stats.catalogue.dormant.length > 0 && (
            <div className={s.dormant}>
              <p>
                <b>Jamais demandés</b> · {count(stats.catalogue.dormant.length)} article{stats.catalogue.dormant.length > 1 ? "s" : ""} publié
                {stats.catalogue.dormant.length > 1 ? "s" : ""}
              </p>
              <ul className={s.tags}>
                {stats.catalogue.dormant.slice(0, 8).map((product) => (
                  <li key={product.id}>{product.label}</li>
                ))}
                {stats.catalogue.dormant.length > 8 && <li>+ {count(stats.catalogue.dormant.length - 8)}</li>}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
