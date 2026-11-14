'use client';

import Link from 'next/link';
import Reveal from '@/components/ui/Reveal';
import RevealText from '@/components/ui/RevealText';
import Truss from '@/components/ui/Truss';
import { ArrowUpRightIcon } from '@/components/ui/icons';
import { brand, reasons } from '@/data/eventheme';
import styles from './WhyUs.module.css';
import studio from './Studio.module.css';

/**
 * « Why EVENTHEMES » (cahier des charges §04 A) : équipements professionnels,
 * expertise technique, solutions adaptées et exécution fiable.
 */
export default function WhyUs() {
  return (
    <section className={styles.root} id="pourquoi" aria-labelledby="pourquoi-titre">
      <Truss className={styles.truss} />
      <div className={styles.head}>
        <p className={studio.eyebrow}>Pourquoi {brand.name}</p>
        <RevealText as="h2" id="pourquoi-titre" className={studio.heading}>
          La technique,<br />{' '}<em>sans compromis.</em>
        </RevealText>
        <div className={styles.intro}>
          <p>Quatre engagements pour que chaque événement se déroule comme prévu, du premier échange au démontage.</p>
          <Link href="/materiel" className={studio.link}>Découvrir le matériel <ArrowUpRightIcon /></Link>
        </div>
      </div>
      <Reveal stagger className={styles.grid}>
        {reasons.map(([title, description], index) => (
          <div key={title} className={styles.reason}>
            <span className={styles.num} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
