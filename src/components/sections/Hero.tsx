'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useEventheme } from '@/components/eventheme/Provider';
import Button from '@/components/ui/Button';
import { ArrowUpRightIcon, SocialIcon } from '@/components/ui/icons';
import { brand, heroSlides, isSignature } from '@/data/eventheme';
import { fill } from '@/lib/i18n';
import { cx } from '@/lib/cx';
import { onCurtainOpen } from '@/lib/intro';
import { gsap, revealSafe, ScrollTrigger, useGSAP } from '@/lib/motion';
import type { HeroSceneState } from './HeroSculpture';
import { findSocial } from '@/lib/eventheme/types';
import styles from './Hero.module.css';

const HeroSculpture = dynamic(() => import('./HeroSculpture'), { ssr: false });

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const scrollScene = useRef<HeroSceneState>({ progress: 0, scrollDriven: false });
  const scrollTrigger = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [settled, setSettled] = useState(false);
  const onSettled = useCallback(() => setSettled(true), []);
  const { entries, t } = useEventheme();
  /** Les trois temps d’un projet, joués par la structure 3D : étude, montage, direct. */
  const worlds = t.hero.worlds;
  const home = entries.find((entry) => entry.id === 'home');
  const whatsapp = findSocial(entries, 'whatsapp');
  const candidates = [home?.image, ...(home?.gallery?.length ? home.gallery : heroSlides)];
  const images = candidates.filter((url, index): url is string => Boolean(url) && candidates.indexOf(url) === index);
  // The admin title is authoritative; the brand signature is the default.
  const title = home?.title?.trim() || 'We engineer\nthe experience.';
  const lines = title.split('\n');
  // The signature is English on a French page: screen readers must pronounce it as such.
  const titleLang = isSignature(title) ? 'en' : undefined;

  useGSAP(() => revealSafe(ref, (full) => {
    if (!full || !ref.current) return;
    const find = gsap.utils.selector(ref);
    const intro = gsap.timeline({ paused: true })
      .fromTo(find('[data-hero-line]'), { yPercent: 110, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.08, ease: 'power4.out' })
      .fromTo(find('[data-hero-reveal]'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.75, stagger: 0.08, ease: 'power3.out' }, 0.18)
      .fromTo(find('[data-hero-stage]'), { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 1.1, ease: 'power3.out' }, 0.08);
    return onCurtainOpen(() => intro.play());
  }), { scope: ref });

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add({
      motion: '(prefers-reduced-motion: no-preference)',
      desktop: '(min-width: 768px)',
      tall: '(min-height: 740px)',
      laptop: '(min-height: 640px)',
    }, (context) => {
      const hero = ref.current;
      if (!hero || !context.conditions?.motion) return;
      const desktop = Boolean(context.conditions.desktop);
      const pin = (desktop ? Boolean(context.conditions.laptop) : Boolean(context.conditions.tall)) && hero.offsetHeight <= window.innerHeight + 1;
      const scene = scrollScene.current;
      const find = gsap.utils.selector(hero);
      scene.scrollDriven = true;
      let lastWorld = -1;
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: pin ? () => `+=${window.innerHeight * (desktop ? 1.7 : 0.8)}` : 'bottom top',
          pin,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: 0.65,
          invalidateOnRefresh: true,
        },
      });
      timeline.fromTo(scene, { progress: 0 }, {
        progress: 1,
        duration: 1,
        onUpdate: () => {
          scene.scrollDriven = true;
          const next = scene.progress < 0.32 ? 0 : scene.progress < 0.7 ? 1 : 2;
          // Only the three scene boundaries enter React; continuous motion stays in refs.
          if (next !== lastWorld) {
            lastWorld = next;
            setActive(next);
            hero.dataset.scrollScene = String(next + 1);
          }
          scene.render?.();
        },
      }, 0)
        .fromTo(find('[data-scroll-meter]'), { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0);
      scrollTrigger.current = timeline.scrollTrigger ?? null;
      return () => {
        scene.scrollDriven = false;
        scene.progress = 0;
        scrollTrigger.current = null;
        delete hero.dataset.scrollScene;
      };
    });
    return () => media.revert();
  }, { scope: ref });

  const chooseWorld = (index: number) => {
    const trigger = scrollTrigger.current;
    if (trigger?.pin) {
      // A direct jump keeps keyboard/touch selection immediate and leaves normal scrolling intact.
      window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * [0, 0.5, 0.94][index], behavior: 'instant' });
    } else {
      scrollScene.current.scrollDriven = false;
    }
    setActive(index);
  };

  // This effect alone owns the scene caption (opacity, y); the entrance timeline animates other layers.
  useEffect(() => {
    const element = worldRef.current;
    if (!element) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let transition: gsap.core.Tween | undefined;
    const run = () => {
      transition?.revert();
      if (!preference.matches && !paused) transition = gsap.fromTo(element, { opacity: 0.3, y: 8 }, { opacity: 1, y: 0, duration: 0.24, ease: 'power3.out' });
    };
    run();
    preference.addEventListener('change', run);
    return () => { transition?.revert(); preference.removeEventListener('change', run); };
  }, [active, paused]);

  return (
    <section ref={ref} className={styles.hero} id="accueil" aria-labelledby="accueil-titre">
      <div className={styles.architecture} aria-hidden="true"><span /><span /><span /></div>
      <div className={styles.topline} data-hero-reveal>
        <span>{home?.subtitle || `${brand.sector} · ${t.brand.market}`}</span>
        <span className={styles.topNote}>{t.brand.disciplines.join(' · ')}</span>
      </div>
      <div className={styles.composition}>
        <div className={styles.content}>
          <h1 id="accueil-titre" lang={titleLang} className={cx(styles.title, lines.length > 2 && styles.customTitle)}>
            {lines.map((line, index) => <span className={styles.lineMask} key={index}>
              {index === lines.length - 1 && lines.length > 1 ? <em data-hero-line>{line}</em> : <span data-hero-line>{line}</span>}
            </span>)}
          </h1>
          <p className={styles.lede} data-hero-reveal>{home?.description || t.brand.summary}</p>
          <div className={styles.actions} data-hero-reveal>
            <Button href="#devis" icon={<ArrowUpRightIcon />} className={styles.primary} magnetic>{t.common.requestQuote}</Button>
            <a href="#services" className={styles.secondary}>{t.hero.expertise} <ArrowUpRightIcon /></a>
          </div>
        </div>
        <div className={styles.stage} data-hero-stage>
          <div className={styles.scenePhotos} aria-hidden="true">
            <div className={styles.photoFrame} />
            <div className={styles.mainPhoto}>
              {images.slice(0, 3).map((src, index) => <img key={src} src={src} alt="" className={cx(styles.photo, active % Math.min(images.length, 3) === index && styles.photoActive)} loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : undefined} decoding="async" />)}
            </div>
            {images[1] && <div className={styles.insetPhoto}><img src={images[1]} alt="" loading="eager" decoding="async" /></div>}
            <span className={styles.photoSignature}>{brand.name} · {brand.sector} · {t.common.illustration}</span>
          </div>
          <div className={styles.sculpture} data-stage-scroll aria-hidden="true">
            {/* Repli tant que WebGL n’a pas rendu : le portique truss au trait. */}
            <div className={styles.fallback}>
              <svg viewBox="-50 -44 100 88" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true" focusable="false">
                <path d="M-40 -34H40M-40 -26H40M-40 -34L-32 -26L-24 -34L-16 -26L-8 -34L0 -26L8 -34L16 -26L24 -34L32 -26L40 -34M-40 -26V40M-32 -26V40M-40 -26L-32 -18L-40 -10L-32 -2L-40 6L-32 14L-40 22L-32 30L-40 38M32 -26V40M40 -26V40M32 -26L40 -18L32 -10L40 -2L32 6L40 14L32 22L40 30L32 38" />
              </svg>
            </div>
            <HeroSculpture active={active} paused={paused} scrollScene={scrollScene} onSettled={onSettled} />
          </div>
          <span className={styles.stageIndex} aria-hidden="true">0{active + 1} / 03</span>
          <div className={styles.sceneMeta} ref={worldRef} aria-live="polite" aria-atomic="true"><span>{worlds[active].caption}</span><span>{worlds[active].detail}</span></div>
          {!settled && <button className={styles.pause} onClick={() => setPaused((value) => !value)} aria-label={paused ? t.hero.resumeLabel : t.hero.pauseLabel} aria-pressed={paused} type="button"><span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span><span>{paused ? t.hero.resume : t.hero.pause}</span></button>}
        </div>
      </div>
      <div className={styles.bottom} data-hero-reveal>
        <a href="#a-propos" className={styles.scroll}><span aria-hidden="true">↓</span><span>{fill(t.hero.discover, { brand: brand.name })}</span></a>
        <div className={styles.worlds} role="group" aria-label={t.hero.worldsLabel}>
          {worlds.map((world, index) => <button key={world.label} type="button" className={cx(styles.world, active === index && styles.selected)} aria-pressed={active === index} onClick={() => chooseWorld(index)}><span className={styles.worldNumber}>0{index + 1}</span><span>{world.label}</span><span className={styles.worldArrow} aria-hidden="true">↗</span></button>)}
        </div>
        {whatsapp?.url && <a href={whatsapp.url} className={styles.whatsapp} target="_blank" rel="noreferrer" aria-label={t.hero.whatsapp}><SocialIcon name="whatsapp" /></a>}
      </div>
      <div className={styles.scrollMeter} aria-hidden="true"><span data-scroll-meter /></div>
      <div className={styles.filmstrip} aria-hidden="true">{images.slice(0, 3).map((src, index) => <img key={src} src={src} alt="" className={cx(styles.filmImage, active === index && styles.filmActive)} loading="lazy" decoding="async" />)}</div>
    </section>
  );
}
