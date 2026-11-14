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
  const { entries } = useEventheme();
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
        <div className={styles.topline}><span>Et maintenant, à vous.</span><span>{brand.name} · {brand.market}</span></div>
        <a href="#devis" className={styles.invitation} aria-label="Votre scène vous attend : demander un devis">
          <RevealText as="h2" id="contact-titre" className={styles.title}>Votre scène<br />{' '}vous attend.</RevealText>
          <span className={styles.arrow}><ArrowUpRightIcon /></span>
        </a>
        <div className={styles.bottom}>
          <p>Un lieu, une date, un programme.<br />Nous concevons la technique qui va avec.</p>
          <div className={styles.actions}>
            {whatsapp?.url && <a href={whatsapp.url} target="_blank" rel="noreferrer">Parlons sur WhatsApp <ArrowUpRightIcon /></a>}
            {instagram?.url && <a href={instagram.url} target="_blank" rel="noreferrer">Dans les coulisses <span>Instagram</span><ArrowUpRightIcon /></a>}
          </div>
        </div>
      </div>
    </section>
  );
}
