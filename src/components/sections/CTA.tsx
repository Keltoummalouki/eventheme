'use client';

import { useRef } from 'react';
import { useEventheme } from '@/components/eventheme/Provider';
import RevealText from '@/components/ui/RevealText';
import { gsap, motionSafe, useGSAP } from '@/lib/motion';
import { findSocial } from '@/lib/eventheme/types';
import { ArrowUpRightIcon } from '@/components/ui/icons';
import { brand } from '@/data/eventheme';
import styles from './CTA.module.css';

export default function CTA() {
  const ref = useRef<HTMLElement>(null);
  const { entries, t } = useEventheme();
  const whatsapp = findSocial(entries, 'whatsapp');
  const instagram = findSocial(entries, 'instagram');

  useGSAP(() => motionSafe(ref, () => {
    gsap.fromTo(ref.current?.querySelector('[data-invitation-orbit]') || [], { rotation: -25, scale: .9 }, {
      rotation: 35, scale: 1.1, ease: 'none',
      scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: .8 },
    });
  }), { scope: ref });

  return (
    <section className={styles.cta} id="contact" ref={ref} aria-labelledby="contact-titre">
      <div className={styles.orbit} data-invitation-orbit aria-hidden="true" />
      <div className={styles.content}>
        <div className={styles.topline}><span>{t.homeCta.topline}</span><span>{brand.name} · {t.brand.market}</span></div>
        <a href="#devis" className={styles.invitation} aria-label={t.homeCta.label}>
          <RevealText as="h2" id="contact-titre" className={styles.title}>{t.homeCta.titleStart}<br />{' '}{t.homeCta.titleEnd}</RevealText>
          <span className={styles.arrow}><ArrowUpRightIcon /></span>
        </a>
        <div className={styles.bottom}>
          <p>{t.homeCta.textStart}<br />{t.homeCta.textEnd}</p>
          <div className={styles.actions}>
            {whatsapp?.url && <a href={whatsapp.url} target="_blank" rel="noreferrer">{t.homeCta.whatsapp} <ArrowUpRightIcon /></a>}
            {instagram?.url && <a href={instagram.url} target="_blank" rel="noreferrer">{t.homeCta.behind} <span>Instagram</span><ArrowUpRightIcon /></a>}
          </div>
        </div>
      </div>
    </section>
  );
}
