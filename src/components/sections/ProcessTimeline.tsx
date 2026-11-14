'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import RevealText from '@/components/ui/RevealText';
import { imagery, methodSteps } from '@/data/eventheme';
import { cx } from '@/lib/cx';
import { gsap, motionSafe, ScrollTrigger, useGSAP } from '@/lib/motion';
import { ArrowUpRightIcon } from '@/components/ui/icons';
import styles from './ProcessTimeline.module.css';
import studio from './Studio.module.css';

/** Méthodologie (cahier des charges §04 B) : sept étapes en trois temps. */
const chapters = [
  { title: 'Concevoir.', note: 'L’étude', image: imagery.controlRoom, steps: methodSteps.slice(0, 3) },
  { title: 'Installer.', note: 'Le montage', image: imagery.stageTruss, steps: methodSteps.slice(3, 5) },
  { title: 'Exploiter.', note: 'Le direct', image: imagery.stageGlow, steps: methodSteps.slice(5) },
];

export default function ProcessTimeline() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(() => {
    const sections = gsap.utils.toArray<HTMLElement>('[data-method-chapter]', ref.current);
    let previous = -1;
    const updateChapter = () => {
      let next = 0;
      sections.forEach((chapter, index) => {
        if (chapter.getBoundingClientRect().top <= window.innerHeight * .58) next = index;
      });
      if (next !== previous) { previous = next; setActive(next); }
    };
    ScrollTrigger.create({ trigger: ref.current, start: 'top bottom', end: 'bottom top', onUpdate: updateChapter, onRefresh: updateChapter });
    updateChapter();
    return motionSafe(ref, () => {
      gsap.fromTo('[data-method-orbit]', { rotation: -30 }, {
        rotation: 60, ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: 1 },
      });
    });
  }, { scope: ref });

  return (
    <section className={styles.timeline} id="methode" ref={ref} aria-labelledby="methode-titre">
      <div className={styles.heading}>
        <p className={studio.eyebrow}>Notre méthode</p>
        <RevealText as="h2" id="methode-titre" className={studio.heading}>De l’étude<br />{' '}<em>au direct.</em></RevealText>
        <p className={styles.introduction}>Trois temps, sept étapes, une même exigence : une technique qui sert votre événement sans jamais s’imposer.</p>
      </div>
      <div className={styles.layout}>
        <div className={styles.stage} aria-hidden="true">
          <div className={styles.orbit} data-method-orbit />
          <div className={styles.photographs}>
            {chapters.map((chapter, index) => <img key={chapter.title} src={chapter.image} alt="" loading="lazy" decoding="async" className={cx(styles.photo, active === index && styles.activePhoto)} />)}
          </div>
          <span className={styles.largeNumber}>0{active + 1}</span>
          <div className={styles.stageCaption}><span>{chapters[active].note}</span><span>Photographie d’illustration</span></div>
          <div className={styles.meter}>{chapters.map((chapter, index) => <span key={chapter.title} className={active >= index ? styles.filled : ''} />)}</div>
        </div>
        <div className={styles.chapters}>
          {chapters.map((chapter, index) => (
            <article key={chapter.title} data-method-chapter className={cx(styles.chapter, active === index && styles.activeChapter)}>
              <span className={styles.chapterLabel}>0{index + 1} — {chapter.note}</span>
              <h3>{chapter.title}</h3>
              <dl>{chapter.steps.map(([title, description]) => <div key={title}><dt>{title}</dt><dd>{description}</dd></div>)}</dl>
            </article>
          ))}
          <Link href="/devis" className={studio.link}>Demander un devis <ArrowUpRightIcon /></Link>
        </div>
      </div>
    </section>
  );
}
