'use client';

import Link from 'next/link';
import { useEventheme } from '@/components/eventheme/Provider';
import Reveal from '@/components/ui/Reveal';
import RevealText from '@/components/ui/RevealText';
import Truss from '@/components/ui/Truss';
import { ArrowUpRightIcon } from '@/components/ui/icons';
import { brand } from '@/data/eventheme';
import { fill } from '@/lib/i18n';
import styles from './WhyUs.module.css';
import studio from './Studio.module.css';

/**
 * « Why EVENTHEMES » (cahier des charges §04 A) : équipements professionnels,
 * expertise technique, solutions adaptées et exécution fiable.
 */
export default function WhyUs() {
  const { t, href } = useEventheme();
  return (
    <section className={styles.root} id="pourquoi" aria-labelledby="pourquoi-titre">
      <Truss className={styles.truss} />
      <div className={styles.head}>
        <p className={studio.eyebrow}>{fill(t.why.eyebrow, { brand: brand.name })}</p>
        <RevealText as="h2" id="pourquoi-titre" className={studio.heading}>
          {t.why.titleStart}<br />{' '}<em>{t.why.titleEnd}</em>
        </RevealText>
        <div className={styles.intro}>
          <p>{t.why.intro}</p>
          <Link href={href('equipment')} className={studio.link}>{t.why.link} <ArrowUpRightIcon /></Link>
        </div>
      </div>
      <Reveal stagger className={styles.grid}>
        {t.reasons.map(([title, description], index) => (
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
