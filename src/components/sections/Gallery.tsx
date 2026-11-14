'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useEventheme } from '@/components/eventheme/Provider';
import Button from '@/components/ui/Button';
import RevealText from '@/components/ui/RevealText';
import { brand } from '@/data/eventheme';
import { projectCategoryLabel } from '@/data/locales';
import { cx } from '@/lib/cx';
import type { Entry } from '@/lib/eventheme/types';
import { fill } from '@/lib/i18n';
import { Flip, gsap, MOTION, prefersReducedMotion, revealSafe, useGSAP } from '@/lib/motion';
import styles from './Gallery.module.css';
import studio from './Studio.module.css';
import { ArrowUpRightIcon } from '@/components/ui/icons';

/** Filtre « tous » : aucune réalisation n’a de type vide. */
const ALL = '';

/**
 * Réalisations — mosaïque filtrable et visionneuse.
 *
 * Le changement de filtre est joué avec Flip : les vignettes qui restent
 * glissent vers leur nouvelle place au lieu que la grille se reconstruise d'un
 * coup. Chaque vignette ouvre une visionneuse (nom, type, lieu, date,
 * description) que l'on parcourt au clavier.
 */
export default function Gallery() {
  const { entries, locale, t, href } = useEventheme();
  const projects = entries.filter((e) => e.kind === 'projects');
  const categories = [ALL, ...new Set(projects.map((p) => p.category).filter((c): c is string => Boolean(c)))];
  const [category, setCategory] = useState(ALL);
  const [open, setOpen] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const previous = useRef<Flip.FlipState | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const visible = projects.filter((p) => category === ALL || p.category === category);

  const moveReel = (direction: number) => {
    const reel = gridRef.current;
    if (reel) reel.scrollBy({ left: direction * reel.clientWidth * .72, behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
  };

  const changeCategory = (next: string) => {
    if (next === category) return;
    // Le relevé précède le rendu : ensuite, les anciennes positions n'existent plus.
    if (gridRef.current) previous.current = Flip.getState(Array.from(gridRef.current.children));
    gridRef.current?.scrollTo({ left: 0, behavior: 'instant' });
    setCategory(next);
  };

  useGSAP(
    () => {
      const state = previous.current;
      previous.current = null;
      if (!state || prefersReducedMotion()) return;
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
    <section className={styles.root} id="realisations">
      <div className={styles.heading}>
        <p className={studio.eyebrow}>{t.gallery.eyebrow}</p>
        <RevealText as="h2" className={studio.heading}>{t.gallery.titleStart}<br />{' '}<em>{t.gallery.titleEnd}</em></RevealText>
        <div className={styles.introduction}><p>{t.gallery.introStart}<br />{t.gallery.introEnd}</p><Link href={href('projects')} className={studio.link}>{t.gallery.all} <ArrowUpRightIcon /></Link></div>
      </div>

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
          <button type="button" disabled={visible.length < 2} onClick={() => moveReel(-1)} aria-label={t.gallery.previous}>←</button>
          <button type="button" disabled={visible.length < 2} onClick={() => moveReel(1)} aria-label={t.gallery.next}>→</button>
        </div>
      </div>

      <div className={styles.grid} ref={gridRef} role="region" aria-label={t.gallery.region} tabIndex={0}>
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
      {projects.some((p) => p.demo) && (
        <p className={styles.note}>{fill(t.gallery.note, { brand: brand.name })}</p>
      )}

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
        if (event.key === 'ArrowRight' && projects.length > 1) step(1);
        if (event.key === 'ArrowLeft' && projects.length > 1) step(-1);
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
                ←
              </button>
              <span>
                {String(index + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
              </span>
              <button type="button" onClick={() => step(1)} aria-label={t.gallery.nextProject}>
                →
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
