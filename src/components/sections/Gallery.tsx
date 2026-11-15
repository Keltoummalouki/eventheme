'use client';

import { useEffect, useRef, useState } from 'react';
import type { FocusEvent as ReactFocusEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';
import { useEventheme } from '@/components/eventheme/Provider';
import Button from '@/components/ui/Button';
import RevealText from '@/components/ui/RevealText';
import { brand } from '@/data/eventheme';
import { projectCategoryLabel } from '@/data/locales';
import { cx } from '@/lib/cx';
import type { Entry } from '@/lib/eventheme/types';
import { fill, isRtl } from '@/lib/i18n';
import { Flip, gsap, MOTION, motionSafe, prefersReducedMotion, revealSafe, ScrollTrigger, useGSAP } from '@/lib/motion';
import styles from './Gallery.module.css';
import studio from './Studio.module.css';
import { ArrowUpRightIcon } from '@/components/ui/icons';

/** Filtre « tous » : aucune réalisation n’a de type vide. */
const ALL = '';
/** Repos sur la dernière image avant que la page ne reprenne, en part du trajet horizontal. */
const HOLD = 0.12;
/** Au-delà de ce déplacement, un appui devient un glisser : le clic est annulé. */
const DRAG_THRESHOLD = 6;
/** Pendant ce délai (ms), un nouveau clic sur une flèche part de la cible du précédent. */
const AIM_MEMORY = 900;

/**
 * Réalisations — galerie horizontale filtrable et visionneuse.
 *
 * • Mouvement accepté, sur ordinateur comme sur téléphone : arrivée sous
 *   l’en-tête, la scène (filtres, galerie, mention) est épinglée et le
 *   défilement vertical fait avancer la galerie jusqu’à la dernière image,
 *   puis la page reprend. Flèches, touche Tab et glisser du doigt font
 *   défiler la page d’autant.
 * • Mouvement réduit : défilement horizontal natif (doigt, pavé tactile,
 *   flèches, clavier).
 * Dans les deux cas, sans barre de défilement.
 *
 * Le changement de filtre est joué avec Flip : les vignettes qui restent
 * glissent vers leur nouvelle place au lieu que la grille se reconstruise d'un
 * coup. Chaque vignette ouvre une visionneuse (nom, type, lieu, date,
 * description) que l'on parcourt au clavier.
 */
export default function Gallery() {
  const { entries, locale, t, href } = useEventheme();
  // De droite à gauche (arabe) : « suivant » défile vers la gauche, et les flèches s’inversent.
  const rtl = isRtl(locale);
  const projects = entries.filter((e) => e.kind === 'projects');
  const categories = [ALL, ...new Set(projects.map((p) => p.category).filter((c): c is string => Boolean(c)))];
  const [category, setCategory] = useState(ALL);
  const [open, setOpen] = useState<number | null>(null);
  const [pinned, setPinned] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const reelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  /** Épinglage en cours (mouvement accepté), sinon `null`. */
  const pinRef = useRef<ScrollTrigger | null>(null);
  const previous = useRef<Flip.FlipState | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const swipe = useRef({ id: -1, x: 0, top: 0, moved: 0 });
  const aim = useRef({ travel: 0, time: 0 });
  const visible = projects.filter((p) => category === ALL || p.category === category);

  /**
   * Vignettes affichées, dans l’ordre de lecture, avec leur distance au début
   * de la galerie (mise en page, hors transformation). La première est alignée
   * sur la colonne de contenu.
   */
  const shownTiles = () => {
    const track = gridRef.current;
    if (!track) return [];
    return Array.from(track.children as HTMLCollectionOf<HTMLElement>)
      .filter((tile) => !tile.classList.contains(styles.hidden))
      .map((tile) => ({ tile, offset: rtl ? track.offsetWidth - tile.offsetLeft - tile.offsetWidth : tile.offsetLeft }));
  };

  /** Épinglée : longueur du trajet horizontal, en pixels de défilement (repos final exclu). */
  const travelOf = (pin: ScrollTrigger) => (pin.end - pin.start) / (1 + HOLD);
  /** Épinglée : position de la page où la galerie a avancé de `travel` pixels. */
  const scrollFor = (pin: ScrollTrigger, travel: number) => pin.start + gsap.utils.clamp(0, travelOf(pin), travel);

  /** `now` : l’horodatage du clic (une même horloge que `performance.now()`). */
  const moveReel = (direction: number, now: number) => {
    const reel = reelRef.current;
    const tiles = shownTiles();
    if (!reel || tiles.length < 2) return;
    const pin = pinRef.current;
    if (!pin) {
      // Défilement natif : une vignette par pas, l’aimantation fait l’alignement.
      const step = tiles[1].offset - tiles[0].offset;
      reel.scrollBy({ left: direction * (rtl ? -1 : 1) * step, behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
      return;
    }
    // Épinglée : la vignette suivante (ou précédente) vient au début de la colonne.
    // Un second clic pendant le trajet part de la cible du premier.
    const origin = tiles[0].offset;
    const from = now - aim.current.time < AIM_MEMORY
      ? aim.current.travel
      : gsap.utils.clamp(0, travelOf(pin), pin.scroll() - pin.start);
    const target = direction > 0
      ? tiles.find(({ offset }) => offset - origin > from + 2)
      : [...tiles].reverse().find(({ offset }) => offset - origin < from - 2);
    const travel = gsap.utils.clamp(0, travelOf(pin), target ? target.offset - origin : direction > 0 ? Infinity : 0);
    aim.current = { travel, time: now };
    window.scrollTo({ top: scrollFor(pin, travel), behavior: 'smooth' });
  };

  /** Clavier : une vignette atteinte hors de l’écran vient au début de la colonne. */
  const onFocus = (event: ReactFocusEvent<HTMLDivElement>) => {
    const pin = pinRef.current;
    const reel = reelRef.current;
    const element = event.target as HTMLElement;
    if (!pin || !reel || !element.matches(':focus-visible')) return;
    const tiles = shownTiles();
    const focused = tiles.find(({ tile }) => tile.contains(element));
    if (!focused) return;
    const view = reel.getBoundingClientRect();
    const box = focused.tile.getBoundingClientRect();
    if (box.left >= view.left && box.right <= view.right) return;
    window.scrollTo({ top: scrollFor(pin, focused.offset - tiles[0].offset), behavior: 'instant' });
  };

  /* Au doigt, pendant l’épinglage : le glisser horizontal fait défiler la page d’autant. */
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pin = pinRef.current;
    swipe.current.moved = 0;
    if (!pin || event.pointerType === 'mouse') return;
    const top = pin.scroll();
    // Avant et après l’épinglage, le doigt fait défiler la page comme d’habitude.
    if (top < pin.start - 1 || top > pin.end + 1) return;
    swipe.current = { id: event.pointerId, x: event.clientX, top, moved: 0 };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pin = pinRef.current;
    const gesture = swipe.current;
    if (!pin || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    gesture.moved = Math.max(gesture.moved, Math.abs(dx));
    // Vers le début de la ligne (la gauche ; la droite en arabe), la galerie avance.
    if (gesture.moved > DRAG_THRESHOLD) pin.scroll(scrollFor(pin, gesture.top - pin.start - dx * (rtl ? -1 : 1)));
  };

  const endSwipe = () => {
    swipe.current.id = -1;
  };

  /** Un glisser qui se termine sur une vignette ne doit pas l’ouvrir. */
  const onClickCapture = (event: ReactMouseEvent) => {
    if (swipe.current.moved > DRAG_THRESHOLD) {
      event.preventDefault();
      event.stopPropagation();
      swipe.current.moved = 0;
    }
  };

  const changeCategory = (next: string) => {
    if (next === category) return;
    // Le relevé précède le rendu : ensuite, les anciennes positions n'existent plus.
    if (gridRef.current) previous.current = Flip.getState(Array.from(gridRef.current.children));
    reelRef.current?.scrollTo({ left: 0, behavior: 'instant' });
    setCategory(next);
  };

  /* Épinglage : le défilement vertical fait avancer la galerie, sur tous les écrans. */
  useGSAP(
    () =>
      motionSafe(sectionRef, () => {
        const stage = stageRef.current;
        const reel = reelRef.current;
        const track = gridRef.current;
        if (!stage || !reel || !track) return;
        setPinned(true);

        // Recalculée à chaque rafraîchissement : elle dépend de l’écran et du filtre choisi.
        const distance = () => Math.max(0, track.scrollWidth - reel.clientWidth);
        const rail = gsap.timeline({
          scrollTrigger: {
            trigger: stage,
            pin: true,
            // Centrée sous l’en-tête flottant ; plus haute que la place disponible,
            // elle s’épingle quand son bas atteint le bas de l’écran.
            start: () => {
              const top = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
              const room = window.innerHeight - top;
              return stage.offsetHeight <= room ? `top ${top + (room - stage.offsetHeight) / 2}px` : 'bottom bottom';
            },
            end: () => `+=${distance() * (1 + HOLD)}`,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        rail
          .fromTo(track, { x: 0 }, { x: () => (rtl ? distance() : -distance()), ease: 'none', duration: 1 })
          .to({}, { duration: HOLD });
        pinRef.current = rail.scrollTrigger ?? null;

        return () => {
          pinRef.current = null;
          setPinned(false);
        };
      }),
    { scope: sectionRef, dependencies: [rtl], revertOnUpdate: true },
  );

  useGSAP(
    () => {
      const state = previous.current;
      previous.current = null;
      if (!state) return;
      const pin = pinRef.current;
      if (pin) {
        // La galerie a changé de longueur avec le filtre : nouvelle mesure,
        // puis retour au début de la sélection.
        ScrollTrigger.refresh();
        if (pin.scroll() > pin.start) pin.scroll(pin.start);
      }
      if (prefersReducedMotion()) return;
      Flip.from(state, {
        duration: 0.75,
        ease: 'power2.inOut',
        absoluteOnLeave: true,
        onEnter: (entering) =>
          gsap.fromTo(entering, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.04 }),
        onLeave: (leaving) => gsap.to(leaving, { autoAlpha: 0, scale: 0.94, duration: 0.35 }),
      });
    },
    { scope: gridRef, dependencies: [category] },
  );

  useGSAP(
    () =>
      revealSafe(gridRef, (full) => {
        const tiles = gsap.utils.toArray<HTMLElement>(`.${styles.inner}`, gridRef.current);
        if (!full) {
          gsap.set(tiles, { clipPath: 'inset(0% 0% 0% 0%)' });
          return;
        }
        gsap.fromTo(
          tiles,
          { clipPath: 'inset(0% 0% 100% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 1.2,
            ease: 'expo.inOut',
            stagger: 0.12,
            scrollTrigger: { trigger: gridRef.current, start: MOTION.start, once: true },
          },
        );
      }),
    { scope: gridRef },
  );

  /** Ferme la visionneuse ; le focus revient à la vignette, sauf si l'on part ailleurs. */
  const close = (restoreFocus = true) => {
    setOpen(null);
    if (restoreFocus) trigger.current?.focus();
  };

  return (
    <section className={styles.root} id="realisations" ref={sectionRef}>
      <div className={styles.heading}>
        <p className={studio.eyebrow}>{t.gallery.eyebrow}</p>
        <RevealText as="h2" className={studio.heading}>{t.gallery.titleStart}<br />{' '}<em>{t.gallery.titleEnd}</em></RevealText>
        <div className={styles.introduction}><p>{t.gallery.introStart}<br />{t.gallery.introEnd}</p><Link href={href('projects')} className={studio.link}>{t.gallery.all} <ArrowUpRightIcon /></Link></div>
      </div>

      <div className={styles.stage} ref={stageRef}>
        <div className={styles.toolbar}>
          {categories.length > 2 && (
            <div className={styles.filters} role="group" aria-label={t.gallery.filterLabel}>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cx(styles.filter, c === category && styles.current)}
                  aria-pressed={c === category}
                  onClick={() => changeCategory(c)}
                >
                  {c === ALL ? t.gallery.allFilter : projectCategoryLabel(locale, c)}
                </button>
              ))}
            </div>
          )}
          <div className={styles.reelControls}>
            <button type="button" disabled={visible.length < 2} onClick={(event) => moveReel(-1, event.timeStamp)} aria-label={t.gallery.previous}>{rtl ? '→' : '←'}</button>
            <button type="button" disabled={visible.length < 2} onClick={(event) => moveReel(1, event.timeStamp)} aria-label={t.gallery.next}>{rtl ? '←' : '→'}</button>
          </div>
        </div>

        <div
          ref={reelRef}
          className={cx(styles.reel, pinned && styles.locked)}
          role="region"
          aria-label={t.gallery.region}
          // Épinglée, la galerie ne défile plus d’elle-même : seules les vignettes reçoivent le focus.
          tabIndex={pinned ? undefined : 0}
          onFocus={onFocus}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endSwipe}
          onPointerCancel={endSwipe}
          onClickCapture={onClickCapture}
        >
          <div className={styles.grid} ref={gridRef}>
            {projects.map((project) => {
              const shown = visible.indexOf(project);
              return (
                <div
                  key={project.id}
                  className={cx(styles.tile, shown < 0 && styles.hidden)}
                  aria-hidden={shown < 0 || undefined}
                >
                  <button
                    type="button"
                    className={styles.inner}
                    aria-label={fill(t.gallery.view, { title: project.title })}
                    onClick={(event) => {
                      trigger.current = event.currentTarget;
                      setOpen(shown);
                    }}
                    tabIndex={shown < 0 ? -1 : undefined}
                  >
                    <span className={styles.imageFrame}><img src={project.image || '/eventheme.jpg'} alt={project.title} loading="lazy" decoding="async" /></span>
                    {project.demo && <span className={styles.tag}>{t.common.inspiration}</span>}
                    <span className={styles.caption}>
                      <span className={styles.cat}>{projectCategoryLabel(locale, project.category)}</span>
                      <span className={styles.title}>{project.title}</span>
                      {(project.location || project.date) && (
                        <span className={styles.where}>{[project.location, project.date].filter(Boolean).join(' · ')}</span>
                      )}
                    </span>
                    <span className={styles.zoom} aria-hidden="true">
                      <ArrowUpRightIcon />
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        {projects.some((p) => p.demo) && (
          <p className={styles.note}>{fill(t.gallery.note, { brand: brand.name })}</p>
        )}
      </div>

      {open !== null && visible[open] && (
        <Lightbox
          projects={visible}
          index={open}
          onIndex={setOpen}
          onClose={close}
        />
      )}
    </section>
  );
}

function Lightbox({
  projects,
  index,
  onIndex,
  onClose,
}: {
  projects: Entry[];
  index: number;
  onIndex: (index: number) => void;
  onClose: (restoreFocus?: boolean) => void;
}) {
  const { locale, t, href } = useEventheme();
  const rtl = isRtl(locale);
  const project = projects[index];
  const dialogRef = useRef<HTMLDivElement>(null);
  const images = [project.image, ...(project.gallery || [])].filter((url): url is string => Boolean(url));
  const [image, setImage] = useState(0);
  const step = (delta: number) => {
    setImage(0);
    onIndex((index + delta + projects.length) % projects.length);
  };

  // Défilement de la page suspendu tant que la visionneuse est ouverte.
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = before;
    };
  }, []);

  return (
    <div
      ref={dialogRef}
      className={styles.lightbox}
      role="dialog"
      aria-modal="true"
      aria-labelledby="visionneuse-titre"
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href]') || []).filter((element) => element.getClientRects().length > 0);
          const first = elements[0];
          const last = elements[elements.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
        if (event.key === 'Escape') onClose();
        // De droite à gauche, le projet suivant est à gauche.
        if (event.key === (rtl ? 'ArrowLeft' : 'ArrowRight') && projects.length > 1) step(1);
        if (event.key === (rtl ? 'ArrowRight' : 'ArrowLeft') && projects.length > 1) step(-1);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.sheet} key={project.id}>
        <div className={styles.viewer}>
          <img src={images[image] || '/eventheme.jpg'} alt={project.title} />
          {images.length > 1 && (
            <div className={styles.thumbs}>
              {images.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  aria-label={fill(t.gallery.photo, { index: i + 1, total: images.length })}
                  aria-current={i === image}
                  onClick={() => setImage(i)}
                >
                  <img src={url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={styles.details}>
          <span className={styles.cat}>
            {projectCategoryLabel(locale, project.category)}
            {project.demo && ` · ${t.common.inspiration}`}
          </span>
          <h3 id="visionneuse-titre">{project.title}</h3>
          {(project.location || project.date) && (
            <p className={styles.where}>{[project.location, project.date].filter(Boolean).join(' · ')}</p>
          )}
          <p>{project.description}</p>
          <div className={styles.detailActions}>
            <Button href={href('projects', project.id)} variant="outline" size="sm" icon={<ArrowUpRightIcon />}>
              {t.gallery.seeProject}
            </Button>
            <Button href="#devis" variant="link" size="sm" icon={<ArrowUpRightIcon />} onClick={() => onClose(false)}>
              {t.common.requestQuote}
            </Button>
          </div>
          {projects.length > 1 && (
            <div className={styles.pager}>
              <button type="button" onClick={() => step(-1)} aria-label={t.gallery.previousProject}>
                {rtl ? '→' : '←'}
              </button>
              <span dir="ltr">
                {String(index + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
              </span>
              <button type="button" onClick={() => step(1)} aria-label={t.gallery.nextProject}>
                {rtl ? '←' : '→'}
              </button>
            </div>
          )}
        </div>
        {/* Le focus entre dans la visionneuse dès son ouverture. */}
        <button type="button" className={styles.close} onClick={() => onClose()} aria-label={t.gallery.close} autoFocus>
          ×
        </button>
      </div>
    </div>
  );
}
