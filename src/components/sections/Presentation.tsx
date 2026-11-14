'use client';

import { useRef } from 'react';
import Reveal from '@/components/ui/Reveal';
import RevealText from '@/components/ui/RevealText';
import { useEventheme } from '@/components/eventheme/Provider';
import { activities, imagery, manifesto } from '@/data/eventheme';
import { gsap, motionSafe, useGSAP } from '@/lib/motion';
import styles from './Presentation.module.css';
import studio from './Studio.module.css';

export default function Presentation() {
  const ref = useRef<HTMLElement>(null);
  const { entries } = useEventheme();
  const about = entries.find((entry) => entry.id === 'about');

  useGSAP(() => motionSafe(ref, () => {
    const find = gsap.utils.selector(ref);
    gsap.fromTo(find('[data-detail-photo]'), { yPercent: -5, scale: 1.12 }, {
      yPercent: 5, scale: 1.03, ease: 'none',
      scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: .8 },
    });
    gsap.fromTo(find('[data-detail-orbit]'), { rotation: -24 }, {
      rotation: 35, ease: 'none',
      scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: .8 },
    });
  }), { scope: ref });

  return (
    <section className={styles.root} id="a-propos" ref={ref} aria-labelledby="esprit-titre">
      <div className={styles.intro}>
        <p className={studio.eyebrow}>Production technique événementielle</p>
        <RevealText as="h2" id="esprit-titre" className={studio.heading}>
          L’invisible fait<br />{' '}<em>la différence.</em>
        </RevealText>
        <Reveal className={styles.manifesto}><p>{manifesto}</p></Reveal>
      </div>
      <div className={styles.composition}>
        <div className={styles.visual}>
          <div className={styles.orbit} data-detail-orbit aria-hidden="true" />
          <figure className={styles.photo}>
            <div className={styles.photoCrop}><img data-detail-photo src={about?.image || imagery.ledStage} alt="Scène équipée d’écrans LED et de projecteurs" loading="lazy" decoding="async" /></div>
            <figcaption><span>Scène, image, lumière.</span><span>Photographie d’illustration</span></figcaption>
          </figure>
          <span className={styles.annotation} aria-hidden="true">Tout se règle<br />en amont.</span>
        </div>
        <div className={styles.pillars}>
          {activities.map(([title, description], index) => (
            <Reveal key={title} className={styles.pillar}>
              <span className={styles.num} aria-hidden="true">0{index + 1}</span>
              <div><h3>{title}</h3><p>{description}</p></div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
