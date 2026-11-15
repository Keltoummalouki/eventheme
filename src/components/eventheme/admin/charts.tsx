"use client";

/* ==========================================================================
   Graphiques du tableau de bord

   Une seule teinte de données, l'or ; le gris pour le contexte (période
   précédente, semaines passées) ; une rampe d'or ordonnée pour les étapes
   d'une demande (validée en thème sombre et clair). Chaque graphique a son
   équivalent lisible sans la couleur : libellés, valeurs, tableau de données.
   ========================================================================== */
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { niceTicks, smoothPath } from "@/lib/chart";
import { count } from "@/lib/eventheme/analytics";
import type { ActivityPoint } from "@/lib/eventheme/dashboard";
import { gsap, motionSafe, prefersReducedMotion, useGSAP } from "@/lib/motion";
import s from "./Admin.module.css";

const integer = (value: number) => count(Math.round(value));
const share = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 }).format(value);

/**
 * Chiffre qui défile jusqu'à sa valeur à son entrée dans l'écran. La valeur
 * finale est écrite d'emblée (sans JavaScript, au lecteur d'écran) : le
 * défilement n'est qu'un ornement, absent si le mouvement est réduit.
 */
export function CountUp({
  value,
  format = integer,
  className,
}: {
  value: number;
  format?: (value: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const text = format(value);
  useGSAP(
    () =>
      motionSafe(ref, () => {
        const node = ref.current;
        if (!node || !value) return;
        const state = { value: 0 };
        const tween = gsap.fromTo(
          state,
          { value: 0 },
          {
            value,
            duration: 1.5,
            ease: "power3.out",
            scrollTrigger: { trigger: node, start: "top 95%", once: true },
            onUpdate: () => {
              node.textContent = format(state.value);
            },
          },
        );
        return () => {
          tween.kill();
          node.textContent = format(value);
        };
      }),
    { scope: ref, dependencies: [value], revertOnUpdate: true },
  );
  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true">
        {text}
      </span>
      <span className="visually-hidden">{text}</span>
    </span>
  );
}

/** Fait pousser des marques (barres, points) depuis leur base à l'entrée dans l'écran. */
function useGrow<T extends HTMLElement>(selector: string, axis: "x" | "y", dependencies: unknown[]) {
  const ref = useRef<T>(null);
  useGSAP(
    () =>
      motionSafe(ref, () => {
        const marks = ref.current?.querySelectorAll(selector);
        if (!marks?.length) return;
        gsap.fromTo(
          marks,
          axis === "y" ? { scaleY: 0 } : { scaleX: 0 },
          {
            ...(axis === "y" ? { scaleY: 1 } : { scaleX: 1 }),
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.035,
            scrollTrigger: { trigger: ref.current, start: "top 95%", once: true },
          },
        );
      }),
    { scope: ref, dependencies, revertOnUpdate: true },
  );
  return ref;
}

/**
 * Colonnes miniatures d'une vignette : la période en cours en or, les
 * précédentes en gris (« emphase »), une valeur annoncée par colonne.
 */
export function MiniColumns({
  points,
  label,
  accent = "last",
}: {
  points: { key: string; title: string; value: number }[];
  /** Ce que comptent les colonnes, pour la description lue à voix haute. */
  label: string;
  /** Colonne mise en avant : la dernière (passé) ou la première (à venir). */
  accent?: "first" | "last";
}) {
  const ref = useGrow<HTMLDivElement>(`.${s.miniColumn} > span`, "y", [points]);
  const max = Math.max(...points.map((point) => point.value), 1);
  const accentIndex = accent === "last" ? points.length - 1 : 0;
  return (
    <div
      ref={ref}
      className={s.miniColumns}
      role="img"
      aria-label={`${label} : ${points.map((point) => `${point.title}, ${count(point.value)}`).join(" ; ")}`}
    >
      {points.map((point, index) => (
        <span key={point.key} className={s.miniColumn} title={`${point.title} : ${count(point.value)}`}>
          <span
            data-accent={index === accentIndex ? "" : undefined}
            data-empty={point.value ? undefined : ""}
            style={{ height: point.value ? `${Math.max(12, (point.value / max) * 100)}%` : undefined }}
          />
        </span>
      ))}
    </div>
  );
}

/** Une pastille par demande en attente ; celles à relancer sont pleines. */
export function DotRow({ total, filled, limit = 12, label }: { total: number; filled: number; limit?: number; label: string }) {
  const ref = useGrow<HTMLDivElement>(`.${s.dot}`, "x", [total, filled]);
  const shown = Math.min(total, limit);
  return (
    <div ref={ref} className={s.dotRow} role="img" aria-label={label}>
      {Array.from({ length: shown }, (_, index) => (
        <span key={index} className={s.dot} data-filled={index < filled ? "" : undefined} />
      ))}
      {total > limit && <span className={s.dotMore}>+{count(total - limit)}</span>}
      {!total && <span className={s.dotEmpty} />}
    </div>
  );
}

/** Jauge circulaire : une part (0 à 1) rapportée à son tout. `null` : rien à mesurer encore. */
export function Ring({
  value,
  size = 64,
  label,
  className,
}: {
  value: number | null;
  size?: number;
  label: string;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;
  const filled = value == null ? 0 : Math.min(1, Math.max(0, value));
  useGSAP(
    () =>
      motionSafe(ref as unknown as React.RefObject<HTMLElement>, () => {
        const arc = ref.current?.querySelector(`.${s.ringArc}`);
        if (!arc || !filled) return;
        gsap.fromTo(
          arc,
          { strokeDashoffset: circumference },
          {
            strokeDashoffset: circumference * (1 - filled),
            duration: 1.4,
            ease: "power3.out",
            scrollTrigger: { trigger: ref.current, start: "top 95%", once: true },
          },
        );
      }),
    { scope: ref, dependencies: [filled, circumference], revertOnUpdate: true },
  );
  return (
    <span className={cx(s.ring, className)} style={{ width: size, height: size }}>
      <svg ref={ref} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
        <circle className={s.ringTrack} cx={size / 2} cy={size / 2} r={radius} />
        <circle
          className={s.ringArc}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - filled)}
          data-empty={filled ? undefined : ""}
        />
      </svg>
      <b aria-hidden="true">{value == null ? "—" : share(value)}</b>
    </span>
  );
}

export type Part = { id: string; label: string; value: number; tone: string };

/**
 * Barre segmentée fine : un tout découpé en parties, sans texte — la liste
 * voisine porte les noms et les nombres. Une partie nulle ne dessine rien.
 */
export function SegmentedBar({ parts, label }: { parts: Part[]; label: string }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  const ref = useGrow<HTMLDivElement>(`.${s.segment}`, "x", [parts]);
  return (
    <div ref={ref} className={s.segmented} role="img" aria-label={label}>
      {total ? (
        parts
          .filter((part) => part.value > 0)
          .map((part) => (
            <span
              key={part.id}
              className={s.segment}
              style={{ flexGrow: part.value, background: `var(${part.tone})` } as CSSProperties}
              title={`${part.label} : ${count(part.value)} (${share(part.value / total)})`}
            />
          ))
      ) : (
        <span className={s.segmentEmpty} />
      )}
    </div>
  );
}

export type RankItem = { id: string; label: string; value: number; share?: number; caption?: string; icon?: ReactNode };

/** Classement horizontal à une seule teinte : la longueur compare, le texte nomme. */
export function RankBars({
  items,
  format = integer,
  showShare = false,
  empty,
}: {
  items: RankItem[];
  format?: (value: number) => string;
  showShare?: boolean;
  empty: string;
}) {
  const ref = useGrow<HTMLUListElement>(`.${s.rankFill}`, "x", [items]);
  if (!items.length) return <p className={s.chartEmpty}>{empty}</p>;
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul ref={ref} className={s.rankList}>
      {items.map((item) => (
        <li key={item.id} className={s.rankRow}>
          {item.icon && <span className={s.rankIcon}>{item.icon}</span>}
          <span className={s.rankBody}>
            <span className={s.rankHead}>
              <span className={s.rankLabel}>
                {item.label}
                {item.caption && <small>{item.caption}</small>}
              </span>
              <span className={s.rankValue}>
                {format(item.value)}
                {showShare && item.share != null && <small>{share(item.share)}</small>}
              </span>
            </span>
            <span className={s.rankTrack} aria-hidden="true">
              <span className={s.rankFill} style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }} />
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Liste de jauges : un nom, une barre et une fraction par ligne, barres alignées. */
export function MeterList({ meters }: { meters: { id: string; label: string; value: number; total: number }[] }) {
  const ref = useGrow<HTMLUListElement>(`.${s.meterFill}`, "x", [meters]);
  return (
    <ul ref={ref} className={s.meterList}>
      {meters.map((meter) => {
        const ratio = meter.total ? meter.value / meter.total : 0;
        return (
          <li key={meter.id}>
            <span className={s.meterName}>{meter.label}</span>
            <span className={s.meterTrack} aria-hidden="true">
              <span className={s.meterFill} style={{ width: `${ratio * 100}%` }} data-full={ratio === 1 ? "" : undefined} />
            </span>
            <span className={s.meterFigure}>
              {count(meter.value)} <small>/ {count(meter.total)}</small>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* --- Activité : aire de la période, ligne de la période précédente ------------ */

const PAD = { top: 18, right: 14, bottom: 30, left: 34 };
const HEIGHT = 260;

/**
 * Courbe d'activité. Le réticule suit le pointeur et s'aligne sur le point le
 * plus proche ; au clavier, les flèches parcourent les points. L'infobulle
 * donne la valeur des deux périodes ; le tableau de données les donne toutes.
 */
export function AreaChart({
  points,
  current,
  previous,
  unit,
  animationKey,
}: {
  points: ActivityPoint[];
  /** Nom de la période en cours et de la précédente (légende, tableau). */
  current: string;
  previous: string;
  /** Ce que comptent les valeurs : « demandes ». */
  unit: string;
  /** Change avec la période ou le filtre : la courbe se redessine. */
  animationKey: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const gradient = `aire-${useId().replace(/[^\w-]/g, "")}`;

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const geometry = useMemo(() => {
    const plotWidth = Math.max(0, width - PAD.left - PAD.right);
    const plotHeight = HEIGHT - PAD.top - PAD.bottom;
    const ticks = niceTicks(Math.max(...points.map((point) => Math.max(point.value, point.previous)), 0));
    const top = ticks[ticks.length - 1];
    const x = (index: number) =>
      PAD.left + (points.length > 1 ? (index / (points.length - 1)) * plotWidth : plotWidth / 2);
    const y = (value: number) => PAD.top + plotHeight - (value / top) * plotHeight;
    const now = points.map((point, index) => ({ x: x(index), y: y(point.value) }));
    const before = points.map((point, index) => ({ x: x(index), y: y(point.previous) }));
    const line = smoothPath(now);
    const baseline = y(0);
    const area = now.length ? `${line}L${now[now.length - 1].x},${baseline}L${now[0].x},${baseline}Z` : "";
    // Une étiquette d'axe sur deux, trois ou plus : elles ne se chevauchent jamais.
    const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(plotWidth / 64))));
    return { plotWidth, plotHeight, ticks, x, y, now, before, line, previousLine: smoothPath(before), area, baseline, every };
  }, [points, width]);

  useGSAP(
    () => {
      if (!width || prefersReducedMotion()) return;
      const root = svg.current;
      const path = root?.querySelector<SVGPathElement>(`.${s.areaLine}`);
      if (!root || !path) return;
      const length = path.getTotalLength();
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline
        .fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 1.3 })
        .fromTo(root.querySelector(`.${s.areaFill}`), { opacity: 0 }, { opacity: 1, duration: 0.9 }, 0.25)
        .fromTo(root.querySelector(`.${s.areaPrevious}`), { opacity: 0 }, { opacity: 1, duration: 0.8 }, 0.1)
        .fromTo(root.querySelector(`.${s.areaEnd}`), { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.5, transformOrigin: "50% 50%" }, 1.05);
      return () => {
        timeline.kill();
        gsap.set(path, { clearProps: "strokeDasharray,strokeDashoffset" });
      };
    },
    { scope: svg, dependencies: [animationKey, width > 0], revertOnUpdate: true },
  );

  function pick(clientX: number) {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect || !points.length) return;
    const relative = clientX - rect.left - PAD.left;
    const index = points.length > 1 ? Math.round((relative / geometry.plotWidth) * (points.length - 1)) : 0;
    setActive(Math.min(points.length - 1, Math.max(0, index)));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = points.length - 1;
    const moves: Record<string, (index: number) => number> = {
      ArrowRight: (index) => Math.min(last, index + 1),
      ArrowLeft: (index) => Math.max(0, index - 1),
      Home: () => 0,
      End: () => last,
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setKeyboard(true);
    setActive((index) => move(index ?? last));
  }

  const point = active == null ? null : points[active];
  const tooltipLeft = active == null ? 0 : geometry.x(active);
  const flip = tooltipLeft > width * 0.62;

  return (
    <figure className={s.area}>
      <div
        ref={frame}
        className={s.areaFrame}
        tabIndex={0}
        role="group"
        aria-label={`Courbe des ${unit}, ${current}. Flèches gauche et droite pour parcourir les points.`}
        onPointerMove={(event) => {
          setKeyboard(false);
          pick(event.clientX);
        }}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((index) => index ?? points.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
      >
        {width > 0 && (
          <svg ref={svg} width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} aria-hidden="true">
            <defs>
              <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--or)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--or)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {geometry.ticks.map((tick) => (
              <g key={tick} className={s.areaTick}>
                <line x1={PAD.left} x2={width - PAD.right} y1={geometry.y(tick)} y2={geometry.y(tick)} />
                <text x={PAD.left - 10} y={geometry.y(tick)} dy="0.32em" textAnchor="end">
                  {count(tick)}
                </text>
              </g>
            ))}
            {points.map((item, index) =>
              index % geometry.every === (points.length - 1) % geometry.every ? (
                <text
                  key={item.key}
                  className={s.areaAxis}
                  x={geometry.x(index)}
                  y={HEIGHT - 8}
                  textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
                >
                  {item.label}
                </text>
              ) : null,
            )}
            <path className={s.areaPrevious} d={geometry.previousLine} />
            <path className={s.areaFill} d={geometry.area} fill={`url(#${gradient})`} />
            <path className={s.areaLine} d={geometry.line} />
            {geometry.now.length > 0 && (
              <circle
                className={s.areaEnd}
                cx={geometry.now[geometry.now.length - 1].x}
                cy={geometry.now[geometry.now.length - 1].y}
                r="4.5"
              />
            )}
            {point && active != null && (
              <g className={s.areaCursor}>
                <line x1={tooltipLeft} x2={tooltipLeft} y1={PAD.top - 6} y2={geometry.baseline} />
                <circle className={s.areaCursorPrevious} cx={tooltipLeft} cy={geometry.before[active].y} r="4" />
                <circle className={s.areaCursorDot} cx={tooltipLeft} cy={geometry.now[active].y} r="5" />
              </g>
            )}
          </svg>
        )}
        {point && active != null && (
          <div
            className={s.areaTooltip}
            data-flip={flip ? "" : undefined}
            style={{ insetInlineStart: tooltipLeft, top: Math.max(PAD.top, Math.min(geometry.now[active].y, geometry.before[active].y) - 12) }}
          >
            <span className={s.areaTooltipTitle}>{point.title}</span>
            <span className={s.areaTooltipRow}>
              <i className={s.keyCurrent} aria-hidden="true" />
              <b>{count(point.value)}</b> {unit}
            </span>
            <span className={s.areaTooltipRow} data-muted="">
              <i className={s.keyPrevious} aria-hidden="true" />
              <b>{count(point.previous)}</b> {previous}
            </span>
          </div>
        )}
        <p className="visually-hidden" aria-live="polite">
          {keyboard && point ? `${point.title} : ${count(point.value)} ${unit}, ${count(point.previous)} ${previous}.` : ""}
        </p>
      </div>
      <details className={s.dataTable}>
        <summary>Voir les données</summary>
        <div className={s.dataTableScroll}>
          <table>
            <caption className="visually-hidden">
              {unit} — {current} et {previous}
            </caption>
            <thead>
              <tr>
                <th scope="col">Période</th>
                <th scope="col">{current}</th>
                <th scope="col">{previous}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((item) => (
                <tr key={item.key}>
                  <th scope="row">{item.title}</th>
                  <td>{count(item.value)}</td>
                  <td>{count(item.previous)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
