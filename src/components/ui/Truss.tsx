'use client';

import { useId, useRef } from 'react';
import { cx } from '@/lib/cx';
import { gsap, motionSafe, useGSAP } from '@/lib/motion';
import styles from './Truss.module.css';

type TrussProps = {
  /** « vertical » pour une tour le long d’un bord ; horizontal par défaut. */
  orientation?: 'horizontal' | 'vertical';
  /** Épaisseur de la poutre en pixels ; les travées sont carrées. */
  size?: number;
  className?: string;
};

/**
 * Poutre truss — l’ornement de la charte EVENTHEMES (« grilles géométriques
 * inspirées des structures Truss », cahier des charges §02).
 *
 * Un motif SVG répété (membrures, diagonales, nœuds) couvre toute la longueur
 * du cadre sans se déformer. Décor pur : invisible aux lecteurs d’écran. En
 * mouvement accepté, la poutre se déploie en entrant à l’écran ; sinon elle
 * est simplement tracée.
 */
export default function Truss({ orientation = 'horizontal', size = 28, className }: TrussProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pattern = `truss-${useId().replace(/[^\w-]/g, '')}`;
  const vertical = orientation === 'vertical';

  useGSAP(
    () =>
      motionSafe(ref, () => {
        gsap.fromTo(
          ref.current,
          { clipPath: vertical ? 'inset(0% 0% 100% 0%)' : 'inset(0% 100% 0% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 1.6,
            ease: 'expo.inOut',
            scrollTrigger: { trigger: ref.current, start: 'top 92%', once: true },
          },
        );
      }),
    { scope: ref },
  );

  // Une tuile = deux travées : la diagonale descend puis remonte (poutre Warren).
  const s = size;
  const inset = 0.5;
  const tile = vertical
    ? { width: s, height: 2 * s, d: `M${inset} 0V${2 * s}M${s - inset} 0V${2 * s}M${inset} 0L${s - inset} ${s}L${inset} ${2 * s}` }
    : { width: 2 * s, height: s, d: `M0 ${inset}H${2 * s}M0 ${s - inset}H${2 * s}M0 ${inset}L${s} ${s - inset}L${2 * s} ${inset}` };
  const nodes = vertical
    ? [[inset, 0], [s - inset, s], [inset, 2 * s]]
    : [[0, inset], [s, s - inset], [2 * s, inset]];

  return (
    <div
      ref={ref}
      className={cx(styles.truss, vertical && styles.vertical, className)}
      style={{ ['--truss-size' as string]: `${s}px` }}
      aria-hidden="true"
    >
      <svg width="100%" height="100%" focusable="false">
        <defs>
          <pattern id={pattern} width={tile.width} height={tile.height} patternUnits="userSpaceOnUse">
            <path className={styles.frame} d={tile.d} />
            {nodes.map(([x, y]) => (
              <circle key={`${x}-${y}`} className={styles.node} cx={x} cy={y} r={2} />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${pattern})`} />
      </svg>
    </div>
  );
}
