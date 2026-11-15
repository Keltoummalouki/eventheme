'use client';

import Link from 'next/link';
import { useRef, type ReactNode } from 'react';
import { gsap, revealSafe, useGSAP } from '@/lib/motion';
import { cx } from '@/lib/cx';
import { ArrowUpRightIcon } from '@/components/ui/icons';
import { brand } from '@/data/eventheme';
import styles from './MobileMenu.module.css';

type MobileMenuProps = {
  id: string;
  open: boolean;
  /** Paires [libellé, adresse] de la navigation principale. */
  links: readonly (readonly [string, string])[];
  current: string;
  /** Action principale, « Mon devis », gardée à portée de pouce. */
  action: ReactNode;
  socials: { id: string; title: string; url?: string }[];
  onNavigate: () => void;
  /** Libellé de la navigation, dans la langue de la page. */
  label: string;
  heading: string;
  languageLabel: string;
  /** Lien vers l’autre langue. */
  language?: ReactNode;
};

/**
 * Navigation plein écran des petits écrans.
 *
 * Compact navigation with a scrollable body and large touch targets.
 * Closed links are inert and hidden from keyboard and screen-reader navigation.
 */
export default function MobileMenu({ id, open, links, current, action, socials, onNavigate, label, heading, languageLabel, language }: MobileMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => revealSafe(ref, (full) => {
    if (!open || !full || document.activeElement?.matches(':focus-visible')) return;
    const find = gsap.utils.selector(ref);
    gsap.fromTo(find('li a'), { opacity: 0, x: document.documentElement.dir === 'rtl' ? -20 : 20 }, { opacity: 1, x: 0, duration: .24, stagger: .035, ease: 'power3.out' });
    gsap.fromTo(find('[data-menu-foot]'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .24, delay: .12, ease: 'power3.out' });
  }), { scope: ref, dependencies: [open], revertOnUpdate: true });
  return (
    <div ref={ref} id={id} className={cx(styles.menu, open && styles.open)} inert={!open} aria-hidden={!open} data-lenis-prevent>
      <div className={styles.topline}><span>{heading}</span><span aria-hidden="true">{brand.name}</span></div>
      <nav aria-label={label}>
        <ol className={styles.links}>
          {links.map(([label, href], index) => (
            <li key={href} style={{ ['--i' as string]: index }}>
              <Link href={href} onClick={onNavigate} aria-current={current === href ? 'page' : undefined}>
                <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.linkLabel}>{label}</span>
                <ArrowUpRightIcon className={styles.arrow} />
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <div className={styles.foot} data-menu-foot>
        {language && <div className={styles.language}><span>{languageLabel}</span>{language}</div>}
        <div className={styles.action}>{action}</div>
        <div className={styles.socials}>
          {socials.map((social) => (
            <a key={social.id} href={social.url} target="_blank" rel="noreferrer" onClick={onNavigate}>
              {social.title} <ArrowUpRightIcon className="inline-icon" />
            </a>
          ))}
        </div>
        <p className={styles.signature} lang="en">{brand.signature}</p>
      </div>
    </div>
  );
}
