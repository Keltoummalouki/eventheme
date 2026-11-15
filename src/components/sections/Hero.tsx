'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useEventheme } from '@/components/eventheme/Provider';
import Button from '@/components/ui/Button';
import { ArrowUpRightIcon, SocialIcon } from '@/components/ui/icons';
import { brand, heroSlides, isSignature } from '@/data/eventheme';
import { cx } from '@/lib/cx';
import { gsap, motionSafe, revealSafe, useGSAP } from '@/lib/motion';
import { findSocial } from '@/lib/eventheme/types';
import styles from './Hero.module.css';

const LiveStage = dynamic(() => import('./LiveStage'), { ssr: false });

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const scrollPose = useRef({ progress: 0 });
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const { entries, t } = useEventheme();
  const worlds = t.hero.worlds;
  const home = entries.find((entry) => entry.id === 'home');
  const whatsapp = findSocial(entries, 'whatsapp');
  const candidates = [home?.image, ...(home?.gallery?.length ? home.gallery : heroSlides)];
  const images = candidates.filter((url, index): url is string => Boolean(url) && candidates.indexOf(url) === index);
  // Preserve CMS copy and the signature's English pronunciation in every locale.
  const title = home?.title?.trim() || 'We engineer\nthe experience.';
  const lines = title.split('\n');
  const titleLang = isSignature(title) ? 'en' : undefined;

  useGSAP(() => revealSafe(ref, (full) => {
    if (!full || !ref.current) return;
    const find = gsap.utils.selector(ref);
    gsap.timeline()
      .fromTo(find('[data-hero-line]'), { yPercent: 105 }, { yPercent: 0, duration: .8, stagger: .08, ease: 'power4.out' })
      .fromTo(find('[data-hero-reveal]'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .5, stagger: .06, ease: 'power3.out' }, .12)
      .fromTo(find('[data-stage]'), { opacity: 0, scale: .94, rotate: -4 }, { opacity: 1, scale: 1, rotate: 0, duration: 1.2, ease: 'power3.out' }, .15);
  }), { scope: ref });

  useGSAP(() => motionSafe(ref, () => {
    if (paused) return;
    const find = gsap.utils.selector(ref);
    gsap.to(find('[data-orbit]'), { rotation: 360, duration: 55, repeat: -1, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', toggleActions: 'play pause resume pause' } });
    gsap.to(find('[data-parallax]'), { yPercent: 12, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: .8 } });
    gsap.fromTo(scrollPose.current, { progress: 0 }, { progress: 1, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: .6 } });
    gsap.fromTo(find('[data-scroll-cue]'), { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: .6 } });
  }), { scope: ref, dependencies: [paused], revertOnUpdate: true });

  useGSAP(() => revealSafe(ref, (full) => {
    if (!full || paused) return;
    gsap.fromTo('#hero-scene > div', { y: 10, opacity: .2 }, { y: 0, opacity: 1, duration: .25, ease: 'power3.out' });
  }), { scope: ref, dependencies: [active, paused], revertOnUpdate: true });

  return (
    <section ref={ref} className={styles.hero} id="accueil" aria-labelledby="accueil-titre">
      <div className={styles.backdrop} data-parallax aria-hidden="true">
        {images.slice(0, 3).map((src, index) => <img key={src} src={src} alt="" className={cx(styles.photo, active % Math.min(images.length, 3) === index && styles.photoActive)} loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : undefined} decoding="async" />)}
      </div>
      <div className={styles.topline} data-hero-reveal>
        <span className={styles.eyebrow}>{home?.subtitle || `${brand.sector} · ${t.brand.market}`}</span>
        <span className={styles.disciplines}>{t.brand.disciplines.join(' / ')}</span>
      </div>
      <div className={styles.composition}>
        <div className={styles.content}>
          <h1 id="accueil-titre" lang={titleLang} className={cx(styles.title, !isSignature(title) && styles.customTitle)}>
            {lines.map((line, index) => <span className={styles.lineMask} key={index}>
              {index === lines.length - 1 && lines.length > 1 ? <em data-hero-line><bdi>{line}</bdi></em> : <span data-hero-line><bdi>{line}</bdi></span>}
            </span>)}
          </h1>
          <p className={styles.lede} data-hero-reveal>{home?.description || t.brand.summary}</p>
          <div className={styles.actions} data-hero-reveal>
            <Button href="#devis" icon={<ArrowUpRightIcon />} className={styles.primary} magnetic>{t.common.requestQuote}</Button>
            <a href="#services" className={styles.secondary}>{t.hero.expertise}<ArrowUpRightIcon /></a>
          </div>
        </div>
        <div className={styles.stage} data-stage>
          <div className={styles.stageOrbit} data-orbit aria-hidden="true"><span /><span /></div>
          <div className={styles.stageTop}><span>{worlds[active].label}</span><span aria-hidden="true">0{active + 1} / 03</span></div>
          <div className={styles.stageCanvas}>
            <div className={styles.stageFallback} aria-hidden="true"><span /><span /><span /></div>
            <LiveStage active={active} paused={paused} scrollPose={scrollPose} />
          </div>
          <div className={styles.stageBottom}>
            <a href="#realisations" className={styles.stageProjects}>{t.nav.projects}<ArrowUpRightIcon /></a>
            <button type="button" className={styles.pause} aria-pressed={paused} aria-label={paused ? t.hero.resumeLabel : t.hero.pauseLabel} onClick={() => setPaused(value => !value)}><span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span>{paused ? t.hero.resume : t.hero.pause}</button>
          </div>
          <div className={styles.stageProgress} aria-hidden="true"><span data-scroll-cue /></div>
        </div>
      </div>
      <div className={styles.console} data-hero-reveal>
        <div className={styles.sceneMeta} id="hero-scene" aria-live="polite" aria-atomic="true">
          <span className={styles.sceneNumber} aria-hidden="true">0{active + 1}</span>
          <div><strong>{worlds[active].caption}</strong><span>{worlds[active].detail}</span></div>
        </div>
        <div className={styles.worlds} role="group" aria-label={t.hero.worldsLabel}>
          {worlds.map((world, index) => <button key={world.label} type="button" className={cx(styles.world, active === index && styles.selected)} aria-pressed={active === index} aria-controls="hero-scene" onClick={() => setActive(index)}>
            <span className={styles.worldNumber}>0{index + 1}</span><span>{world.label}</span>
          </button>)}
        </div>
        {whatsapp?.url && <a href={whatsapp.url} className={styles.whatsapp} target="_blank" rel="noreferrer" aria-label={t.hero.whatsapp}><SocialIcon name="whatsapp" /><span>WhatsApp</span></a>}
      </div>
      <span className={styles.photoCredit}>{t.common.illustration}</span>
    </section>
  );
}
