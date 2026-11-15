'use client';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useEventheme } from './Provider';
import { dictionaries } from '@/data/locales';
import { translatePath } from '@/lib/i18n';
import { publishedLocales } from '@/lib/eventheme/types';
import styles from './Preferences.module.css';
type Theme = 'system' | 'light' | 'dark';
export default function Preferences() {
  const { locale, entries, t } = useEventheme();
  const path = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<Theme>('system');
  const labels = locale === 'fr' ? ['Apparence','Appareil','Clair','Sombre'] : locale === 'ar' ? ['المظهر','الجهاز','فاتح','داكن'] : ['Appearance','Device','Light','Dark'];
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    let preference: Theme = 'system';
    try { const saved = localStorage.getItem('eventheme-theme'); if (saved === 'dark' || saved === 'light') preference = saved; } catch {}
    const hydration = requestAnimationFrame(() => setTheme(preference));
    const apply = () => { document.documentElement.dataset.theme = preference === 'system' ? media.matches ? 'dark' : 'light' : preference; };
    apply(); media.addEventListener('change',apply);
    const change = (event: Event) => { preference = (event as CustomEvent<Theme>).detail; apply(); };
    window.addEventListener('eventheme-theme',change);
    const close = (event: Event) => { if (event instanceof KeyboardEvent && event.key !== 'Escape') return; if (event instanceof PointerEvent && ref.current?.contains(event.target as Node)) return; ref.current?.querySelectorAll('details[open]').forEach(el => { el.removeAttribute('open'); if (event instanceof KeyboardEvent) el.querySelector('summary')?.focus(); }); };
    document.addEventListener('pointerdown',close); document.addEventListener('keydown',close);
    return () => { cancelAnimationFrame(hydration); media.removeEventListener('change',apply); window.removeEventListener('eventheme-theme',change); document.removeEventListener('pointerdown',close); document.removeEventListener('keydown',close); };
  }, []);
  const choose = (value: Theme) => { setTheme(value); try { localStorage.setItem('eventheme-theme',value); } catch {} window.dispatchEvent(new CustomEvent('eventheme-theme',{detail:value})); };
  return <div ref={ref} className={styles.root}>
    <details><summary aria-label={t.nav.language} title={t.nav.language}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg></summary><div className={styles.panel}>{publishedLocales(entries).map(item => <a key={item} href={translatePath(path,item)} lang={item} hrefLang={item} aria-current={item === locale ? 'true' : undefined}>{dictionaries[item].languageName}</a>)}</div></details>
    <details><summary aria-label={labels[0]} title={labels[0]}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></svg></summary><div className={styles.panel} role="group" aria-label={labels[0]}>{(['system','light','dark'] as const).map((value,index)=><button type="button" key={value} aria-pressed={theme===value} onClick={()=>choose(value)}>{labels[index+1]}</button>)}</div></details>
  </div>;
}
