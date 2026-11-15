'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap, refreshOnAssetsReady, ScrollTrigger } from '@/lib/motion';

const SMOOTH_SCROLL =
  '(min-width: 960px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab']);

/**
 * Point d'entrée du moteur d'animation, monté une seule fois par page.
 *
 * Il ne rend rien : son rôle est de recalculer les positions de déclenchement
 * quand la page se stabilise. Les visuels viennent de CDN externes et les
 * polices sont substituées en cours de chargement — sans ce rafraîchissement,
 * une section épinglée calculée trop tôt se déclencherait à côté.
 */
export default function MotionRoot() {
  const smooth = useRef<Lenis | null>(null);
  useEffect(refreshOnAssetsReady, []);

  useEffect(() => {
    let frame = 0;
    const navigate = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.composedPath().find((node) => node instanceof HTMLAnchorElement);
      if (!(link instanceof HTMLAnchorElement) || link.target || link.hasAttribute('download')) return;
      if (link.origin !== location.origin || link.pathname !== location.pathname || link.search !== location.search || !link.hash) return;
      let target: HTMLElement | null;
      try { target = document.getElementById(decodeURIComponent(link.hash.slice(1))); } catch { return; }
      if (!target) return;
      event.preventDefault();
      if (location.hash !== link.hash) window.history.pushState(null, '', link.hash);
      window.cancelAnimationFrame(frame);
      // Let menu state settle, then measure with every pin spacer in place.
      // Native smooth anchor scrolling can be interrupted by an image-triggered refresh.
      frame = window.requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        // The floating navigation includes space above it; keep anchors below its bottom edge.
        const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 80;
        const previousTabIndex = target.getAttribute('tabindex');
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        if (previousTabIndex === null) target.removeAttribute('tabindex');
        else target.setAttribute('tabindex', previousTabIndex);
        const top = target.getBoundingClientRect().top + window.scrollY - headerBottom - 16;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        // Focus before scrolling: the keyboard cancellation handler must not cancel this new journey.
        if (smooth.current && !reduced && event.detail > 0) smooth.current.scrollTo(top, { duration: 1.1 });
        else window.scrollTo({ top, behavior: reduced || event.detail === 0 ? 'instant' : 'smooth' });
      });
    };
    document.addEventListener('click', navigate, true);
    return () => { document.removeEventListener('click', navigate, true); window.cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    const media = gsap.matchMedia();

    media.add(SMOOTH_SCROLL, () => {
      const root = document.documentElement;
      let locked = false;
      const lenis = new Lenis({
        autoRaf: false,
        smoothWheel: true,
        syncTouch: false,
        lerp: 0.1,
        anchors: false,
        allowNestedScroll: true,
        // Les menus et dialogues gardent leur défilement natif, même lorsque
        // la page située derrière est arrêtée.
        prevent: (node) => locked || node.matches('dialog[open], [role="dialog"], [role="listbox"]'),
      });
      smooth.current = lenis;

      const syncScrollLock = () => {
        // Shell et les dialogues posent leurs verrous en style inline. Ne pas
        // lire le style calculé : la classe lenis-stopped masque aussi overflow.
        locked = document.body.classList.contains('swal2-shown') || [root, document.body].some((element) =>
          ['hidden', 'clip'].includes(element.style.overflowY || element.style.overflow),
        );
        if (locked) lenis.stop();
        else lenis.start();
      };
      const lockObserver = new MutationObserver(syncScrollLock);
      lockObserver.observe(root, { attributes: true, attributeFilter: ['style'] });
      lockObserver.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
      syncScrollLock();

      // Une seule horloge d'affichage avec GSAP. L'heure réelle évite de
      // modifier le lagSmoothing global des autres animations de la page.
      const tick = () => lenis.raf(performance.now());
      const unsubscribe = lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(tick);

      const cancelInertia = () => {
        if (!locked && lenis.isScrolling === 'smooth') {
          lenis.scrollTo(lenis.actualScroll, { immediate: true });
        }
      };
      const onLink = (event: MouseEvent) => {
        const link = event.composedPath().find((node) => node instanceof HTMLAnchorElement);
        if (link instanceof HTMLAnchorElement && link.origin === window.location.origin) {
          cancelInertia();
        }
      };
      const onKey = (event: KeyboardEvent) => {
        if (SCROLL_KEYS.has(event.key)) cancelInertia();
      };
      const onVisibility = () => {
        if (document.hidden) cancelInertia();
      };

      // On interrompt seulement l'inertie avant que Next ou le navigateur
      // gère le lien, la touche ou le focus, sans détourner leur comportement.
      document.addEventListener('click', onLink, true);
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('focusin', cancelInertia, true);
      document.addEventListener('visibilitychange', onVisibility);

      return () => {
        document.removeEventListener('click', onLink, true);
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('focusin', cancelInertia, true);
        document.removeEventListener('visibilitychange', onVisibility);
        lockObserver.disconnect();
        gsap.ticker.remove(tick);
        unsubscribe();
        lenis.destroy();
        smooth.current = null;
      };
    });

    return () => media.revert();
  }, []);

  return null;
}
