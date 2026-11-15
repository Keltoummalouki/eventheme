"use client";

import { useRef, useState, type CSSProperties } from "react";
import type { Entry } from "@/lib/eventheme/types";
import { gsap, motionSafe, prefersReducedMotion, useGSAP } from "@/lib/motion";
import { ChevronRightIcon, ImageIcon, ShuffleIcon } from "./icons";
import s from "./Admin.module.css";

/** Pose d'une carte selon sa place dans la pile : 0 = devant. */
const POSES = [
  { x: 0, y: 0, rotation: -4, scale: 1, opacity: 1 },
  { x: 28, y: -16, rotation: 3, scale: 0.93, opacity: 0.88 },
  { x: 54, y: -30, rotation: 9, scale: 0.86, opacity: 0.62 },
] as const;

const transformOf = (pose: (typeof POSES)[number]): CSSProperties => ({
  transform: `translate(${pose.x}px, ${pose.y}px) rotate(${pose.rotation}deg) scale(${pose.scale})`,
  opacity: pose.opacity,
});

const statusOf = (entry: Entry) => (entry.demo ? "Exemple" : entry.published ? "Publié" : "Brouillon");

/**
 * « En vitrine » : les réalisations en pile de cartes. « Mélanger » envoie la
 * carte de devant au fond ; la liste dessous, seule partie interactive pour le
 * clavier et les lecteurs d'écran, ouvre la fiche de chaque réalisation.
 */
export default function Showcase({ projects, open }: { projects: Entry[]; open: (entry: Entry) => void }) {
  const items = projects.slice(0, POSES.length);
  const stack = useRef<HTMLDivElement>(null);
  /** Place de chaque carte dans la pile, par indice d'élément. */
  const places = useRef(items.map((_, index) => index));
  const [front, setFront] = useState(0);
  const busy = useRef(false);

  // Inclinaison de la pile vers le pointeur : un ornement, absent si le mouvement est réduit.
  useGSAP(
    () =>
      motionSafe(stack, () => {
        const node = stack.current;
        if (!node) return;
        const tiltX = gsap.quickTo(node, "rotationX", { duration: 0.6, ease: "power3.out" });
        const tiltY = gsap.quickTo(node, "rotationY", { duration: 0.6, ease: "power3.out" });
        const move = (event: PointerEvent) => {
          const rect = node.getBoundingClientRect();
          tiltY(((event.clientX - rect.left) / rect.width - 0.5) * 10);
          tiltX(-((event.clientY - rect.top) / rect.height - 0.5) * 8);
        };
        const leave = () => {
          tiltX(0);
          tiltY(0);
        };
        node.addEventListener("pointermove", move);
        node.addEventListener("pointerleave", leave);
        return () => {
          node.removeEventListener("pointermove", move);
          node.removeEventListener("pointerleave", leave);
        };
      }),
    { scope: stack },
  );

  function shuffle() {
    const node = stack.current;
    if (!node || items.length < 2 || busy.current) return;
    const cards = [...node.querySelectorAll<HTMLElement>("[data-card]")];
    const last = items.length - 1;
    const leaving = places.current.indexOf(0);
    places.current = places.current.map((place) => (place === 0 ? last : place - 1));
    setFront(places.current.indexOf(0));
    const pose = (index: number) => POSES[places.current[index]];
    if (prefersReducedMotion()) {
      cards.forEach((card, index) => {
        gsap.set(card, { ...pose(index), zIndex: POSES.length - places.current[index] });
      });
      return;
    }
    busy.current = true;
    const timeline = gsap.timeline({ onComplete: () => (busy.current = false) });
    timeline.to(cards[leaving], { x: -70, y: 36, rotation: -16, opacity: 0, duration: 0.38, ease: "power2.in" });
    timeline.set(cards[leaving], { zIndex: 0 });
    cards.forEach((card, index) => {
      if (index === leaving) return;
      timeline.to(card, { ...pose(index), zIndex: POSES.length - places.current[index], duration: 0.6, ease: "power3.out" }, 0.12);
    });
    timeline.fromTo(
      cards[leaving],
      { ...POSES[last], x: POSES[last].x + 30, opacity: 0 },
      { ...pose(leaving), duration: 0.55, ease: "power3.out" },
      0.42,
    );
  }

  if (!items.length)
    return (
      <div className={s.emptyState}>
        <ImageIcon />
        <p>Aucune réalisation pour le moment.</p>
      </div>
    );

  return (
    <div className={s.showcase}>
      <div className={s.showcaseHead}>
        <button type="button" className={s.chip} onClick={shuffle} disabled={items.length < 2}>
          <ShuffleIcon /> Mélanger
        </button>
      </div>
      <div className={s.stackFrame} aria-hidden="true">
        <div ref={stack} className={s.stack}>
          {items.map((entry, index) => (
            <div
              key={entry.id}
              data-card=""
              className={s.stackCard}
              style={{ ...transformOf(POSES[index]), zIndex: POSES.length - index }}
            >
              {entry.image ? <img src={entry.image} alt="" loading="lazy" decoding="async" /> : <span className={s.stackPlaceholder} />}
              <span className={s.stackShade} />
              <span className={s.stackTop}>
                <span>EVENTHEMES</span>
                <span className={s.stackBadge}>{statusOf(entry)}</span>
              </span>
              <span className={s.stackBottom}>
                <small>
                  Réalisation {String(index + 1).padStart(2, "0")}
                  {entry.category ? ` · ${entry.category}` : ""}
                </small>
                <strong>{entry.title}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>
      <ol className={s.showcaseList}>
        {items.map((entry, index) => (
          <li key={entry.id}>
            <button type="button" onClick={() => open(entry)} data-active={index === front ? "" : undefined}>
              <span className={s.showcaseIndex}>{String(index + 1).padStart(2, "0")}</span>
              <span className={s.showcaseText}>
                <strong>{entry.title}</strong>
                <small>{[entry.category, entry.location].filter(Boolean).join(" · ") || "Réalisation"}</small>
              </span>
              <span className={s.pill} data-tone={entry.demo ? "muted" : entry.published ? "gold" : "silver"}>
                {statusOf(entry)}
              </span>
              <ChevronRightIcon className={s.rowChevron} />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
