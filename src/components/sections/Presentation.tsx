'use client';

import { useRef } from 'react';
import Reveal from '@/components/ui/Reveal';
import RevealText from '@/components/ui/RevealText';
import { useEventheme } from '@/components/eventheme/Provider';
import { imagery } from '@/data/eventheme';
import { isRtl } from '@/lib/i18n';
import { gsap, MOTION, motionSafe, revealSafe, useGSAP } from '@/lib/motion';
import styles from './Presentation.module.css';
import studio from './Studio.module.css';

/** Inclinaison de repos de la photographie, en degrés (`.photo`, Presentation.module.css). */
const TILT = -5;
/** Écart, en degrés, d’où la photographie vient se poser. */
const SWING = 7;
/**
 * Annotation écrite : zone visible pendant l’écriture. Les marges négatives
 * laissent passer les paraphes et les jambages du script ; le découpage est
 * retiré une fois la ligne écrite.
 */
const INK = 'inset(-100% -30% -100% -30%)';

/**
 * Introduction de l’accueil : « L’invisible fait la différence. »
 *
 * Au défilement, si le mouvement est accepté :
 * • la photographie se pose (elle pivote et remonte jusqu’à son inclinaison
 *   de repos) et le rideau se lève sur la scène ; l’image glisse dans son
 *   cadre, l’orbite tourne, l’annotation flotte au premier plan ;
 * • l’annotation s’écrit ligne après ligne, dans le sens de lecture ;
 * • chaque métier se construit : le filet se trace, le numéro paraît, le
 *   titre surgit de son masque, puis le texte.
 * Mouvement réduit : tout est affiché d’emblée, immobile.
 */
export default function Presentation() {
  const ref = useRef<HTMLElement>(null);
  const { entries, locale, t } = useEventheme();
  const about = entries.find((entry) => entry.id === 'about');
  // De droite à gauche (arabe), l’annotation s’écrit vers la gauche.
  const rtl = isRtl(locale);

  useGSAP(() => {
    const find = gsap.utils.selector(ref);
    const [visual] = find('[data-detail-visual]');
    // Chaque métier se déclenche sur son titre, comme le dévoilement de <RevealText>.
    const pillars = gsap.utils.toArray<HTMLElement>('[data-pillar]', ref.current).map((pillar) => ({
      title: pillar.querySelector('h3'),
      rule: pillar.querySelector('[data-pillar-rule]'),
      num: pillar.querySelector('[data-pillar-num]'),
      text: pillar.querySelector('[data-pillar-text]'),
    }));
    /** Une seule fois, à l’entrée de `trigger` dans le champ. */
    const enter = (trigger: Element, start: string = MOTION.start) => ({ trigger, start, once: true });
    /** Lié au défilement, pendant toute la traversée de la section. */
    const across = () => ({ trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: .8 });

    const ornament = motionSafe(ref, () => {
      gsap.fromTo(find('[data-production-label]'), { opacity: 0, x: rtl ? 24 : -24 }, {
        opacity: 1, x: 0, duration: .8, ease: MOTION.ease,
        scrollTrigger: { trigger: ref.current, start: 'top 80%', toggleActions: 'play none none reverse' },
      });
      gsap.fromTo(find('[data-production-line]'), { scaleX: 0 }, {
        scaleX: 1, ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top 75%', end: 'bottom 70%', scrub: .6 },
      });
      gsap.utils.toArray<HTMLElement>('[data-pillar]', ref.current).forEach((pillar) => {
        const accent = pillar.querySelector('[data-pillar-accent]');
        const progress = pillar.querySelector('[data-pillar-progress]');
        gsap.fromTo(progress, { scaleY: 0 }, { scaleY: 1, ease: 'none',
          scrollTrigger: { trigger: pillar, start: 'top 75%', end: 'bottom 45%', scrub: .5 },
        });
        gsap.timeline({ scrollTrigger: { trigger: pillar, start: 'top 80%', end: 'bottom 25%', scrub: .5 } })
          .fromTo(accent, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'none' })
          .to(accent, { opacity: 0, duration: 1, ease: 'none' });
      });
      gsap.fromTo(find('[data-detail-photo]'), { yPercent: -5, scale: 1.12 }, { yPercent: 5, scale: 1.03, ease: 'none', scrollTrigger: across() });
      gsap.fromTo(find('[data-detail-orbit]'), { rotation: -24 }, { rotation: 35, ease: 'none', scrollTrigger: across() });
      gsap.fromTo(find('[data-detail-note]'), { y: 60 }, { y: -30, ease: 'none', scrollTrigger: across() });

      gsap.fromTo(find('[data-detail-frame]'), { rotation: TILT - SWING, y: 90 }, {
        rotation: TILT, y: 0, ease: 'none',
        scrollTrigger: { trigger: visual, start: 'top bottom', end: 'center 60%', scrub: .8 },
      });
      gsap.fromTo(find('[data-detail-crop]'), { clipPath: 'inset(100% 0% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: visual, start: 'top 90%', end: 'top 35%', scrub: .6 },
      });

      const lines = find('[data-note-line]');
      gsap.fromTo(lines, { clipPath: rtl ? 'inset(-100% -30% -100% 130%)' : 'inset(-100% 130% -100% -30%)' }, {
        clipPath: INK, duration: 1, ease: 'none', stagger: .6,
        scrollTrigger: { trigger: visual, start: 'top 55%', end: 'bottom 80%', scrub: .6 },
      });

      for (const { title, rule } of pillars) {
        if (title && rule) gsap.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'expo.inOut', scrollTrigger: enter(title) });
      }
    });

    const content = revealSafe(ref, (full) => {
      // Mouvement réduit : rien n’a été masqué, le contenu reste tel quel.
      if (!full) return;
      gsap.fromTo(find('[data-detail-caption]'), { opacity: 0, y: 12 }, {
        opacity: 1, y: 0, duration: MOTION.duration, ease: MOTION.ease, delay: .8, scrollTrigger: enter(visual, 'top 75%'),
      });
      for (const { title, num, text } of pillars) {
        if (!title || !num || !text) continue;
        gsap.fromTo(num, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .8, ease: MOTION.ease, delay: .1, scrollTrigger: enter(title) });
        gsap.fromTo(text, { opacity: 0, y: MOTION.rise / 2 }, {
          opacity: 1, y: 0, duration: MOTION.duration, ease: MOTION.ease, delay: .35, scrollTrigger: enter(title),
        });
      }
    });

    return () => { ornament(); content(); };
  }, { scope: ref, dependencies: [rtl], revertOnUpdate: true });

  return (
    <section className={styles.root} id="a-propos" ref={ref} aria-labelledby="esprit-titre">
      <div className={styles.intro}>
        <p className={`${studio.eyebrow} ${styles.productionLabel}`} data-production-label>{t.intro.eyebrow}<span className={styles.productionLine} data-production-line aria-hidden="true" /></p>
        <RevealText as="h2" id="esprit-titre" className={studio.heading}>
          {t.intro.titleStart}<br />{' '}<em>{t.intro.titleEnd}</em>
        </RevealText>
        <Reveal className={styles.manifesto}><p>{t.intro.manifesto}</p></Reveal>
      </div>
      <div className={styles.composition}>
        <div className={styles.visual} data-detail-visual>
          <div className={styles.orbit} data-detail-orbit aria-hidden="true" />
          <figure className={styles.photo} data-detail-frame>
            <div className={styles.photoCrop} data-detail-crop><img data-detail-photo src={about?.image || imagery.ledStage} alt={t.common.stageAlt} loading="lazy" decoding="async" /></div>
            <figcaption data-detail-caption><span>{t.intro.caption}</span><span>{t.common.illustration}</span></figcaption>
          </figure>
          <span className={styles.annotation} data-detail-note aria-hidden="true">
            <span className={styles.noteLine} data-note-line>{t.intro.annotationStart}</span>
            <span className={styles.noteLine} data-note-line>{t.intro.annotationEnd}</span>
          </span>
        </div>
        <div className={styles.pillars}>
          {t.activities.map(([title, description], index) => (
            <div key={title} className={styles.pillar} data-pillar>
              <span className={styles.pillarAccent} data-pillar-accent aria-hidden="true" />
              <span className={styles.pillarProgress} data-pillar-progress aria-hidden="true" />
              {index > 0 && <span className={styles.rule} data-pillar-rule aria-hidden="true" />}
              <span className={styles.num} data-pillar-num aria-hidden="true">0{index + 1}</span>
              <div>
                <RevealText as="h3" delay={.15}>{title}</RevealText>
                <p data-pillar-text>{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
