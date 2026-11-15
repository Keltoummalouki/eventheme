"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";
import MotionRoot from "@/components/layout/MotionRoot";
import { SearchIcon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";
import type { AdminAccount } from "@/lib/eventheme/auth";
import { initials, type AdminView } from "@/lib/eventheme/dashboard";
import { labels } from "@/lib/eventheme/types";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import CommandPalette, { type PaletteItem } from "./CommandPalette";
import {
  ChartIcon,
  DashboardIcon,
  ExternalIcon,
  GearIcon,
  ImageIcon,
  LayersIcon,
  LogoutIcon,
  MailIcon,
  MenuIcon,
  MoonIcon,
  PageIcon,
  PinIcon,
  QuoteIcon,
  ShareIcon,
  SidebarIcon,
  SpeakerIcon,
  StageIcon,
  SunIcon,
  TicketIcon,
  UsersIcon,
} from "./icons";
import legacy from "../Eventheme.module.css";
import s from "./Admin.module.css";

type Icon = ComponentType<{ className?: string }>;

/** Le menu de l'administration : cinq rubriques, chaque onglet avec son pictogramme. */
export const navigation: readonly { title: string; items: readonly { view: AdminView; label: string; icon: Icon }[] }[] = [
  {
    title: "Pilotage",
    items: [
      { view: "dashboard", label: "Tableau de bord", icon: DashboardIcon },
      { view: "statistics", label: "Statistiques", icon: ChartIcon },
    ],
  },
  {
    title: "Relation client",
    items: [
      { view: "quotes", label: "Demandes de devis", icon: QuoteIcon },
      { view: "messages", label: "Messages", icon: MailIcon },
      { view: "clients", label: "Clients & contacts", icon: UsersIcon },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { view: "products", label: labels.products, icon: SpeakerIcon },
      { view: "categories", label: labels.categories, icon: LayersIcon },
      { view: "services", label: labels.services, icon: StageIcon },
      { view: "events", label: labels.events, icon: TicketIcon },
    ],
  },
  {
    title: "Vitrine",
    items: [
      { view: "projects", label: labels.projects, icon: ImageIcon },
      { view: "pages", label: labels.pages, icon: PageIcon },
      { view: "cities", label: labels.cities, icon: PinIcon },
      { view: "socials", label: labels.socials, icon: ShareIcon },
    ],
  },
  { title: "Système", items: [{ view: "settings", label: labels.settings, icon: GearIcon }] },
];

/** Rubrique et intitulé d'un onglet (fil d'Ariane, palette de commandes). */
export function locate(view: AdminView) {
  for (const group of navigation) {
    const item = group.items.find((entry) => entry.view === view);
    if (item) return { group: group.title, ...item };
  }
  return { group: "Pilotage", ...navigation[0].items[0] };
}

const RAIL_KEY = "eventheme-admin-menu";
const THEME_KEY = "eventheme-theme";

/* Thème courant, lu sur <html data-theme> (posé avant l'affichage par le layout). */
const subscribeTheme = (callback: () => void) => {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};
const themeSnapshot = () => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
/* Raccourci affiché : ⌘ sur Mac, Ctrl ailleurs. */
const noSubscription = () => () => {};
const shortcutSnapshot = () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl");

export default function AdminShell({
  view,
  navigate,
  counts,
  account,
  local,
  onLogout,
  paletteItems,
  notice,
  onNoticeShown,
  children,
}: {
  view: AdminView;
  navigate: (view: AdminView) => void;
  /** Pastilles du menu : demandes au statut « Nouveau ». */
  counts: Partial<Record<AdminView, number>>;
  account: AdminAccount;
  local: boolean;
  onLogout: () => void;
  paletteItems: PaletteItem[];
  /** Confirmation à afficher brièvement (« Modifications enregistrées. »). */
  notice: string;
  onNoticeShown: () => void;
  children: ReactNode;
}) {
  const [rail, setRail] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const theme = useSyncExternalStore(subscribeTheme, themeSnapshot, () => "dark");
  const shortcut = useSyncExternalStore(noSubscription, shortcutSnapshot, () => "Ctrl");
  const nav = useRef<HTMLElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const here = locate(view);

  // Préférence du menu replié, mémorisée sur cet ordinateur.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(RAIL_KEY);
    } catch {}
    if (stored === "rail") {
      const frame = requestAnimationFrame(() => setRail(true));
      return () => cancelAnimationFrame(frame);
    }
  }, []);

  function toggleRail() {
    setRail((current) => {
      try {
        localStorage.setItem(RAIL_KEY, current ? "full" : "rail");
      } catch {}
      return !current;
    });
  }

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }

  // L'indicateur doré glisse jusqu'à l'onglet actif.
  const placeIndicator = useCallback((animate: boolean) => {
    const list = nav.current;
    const mark = indicator.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !mark) return;
    if (!active) {
      gsap.set(mark, { opacity: 0 });
      return;
    }
    const target = { y: active.offsetTop, height: active.offsetHeight, opacity: 1 };
    if (animate && !prefersReducedMotion()) gsap.to(mark, { ...target, duration: 0.5, ease: "power3.out", overwrite: true });
    else gsap.set(mark, target);
  }, []);
  const placed = useRef(false);
  useEffect(() => {
    placeIndicator(placed.current);
    placed.current = true;
  }, [view, rail, placeIndicator]);
  useEffect(() => {
    const list = nav.current;
    if (!list) return;
    const observer = new ResizeObserver(() => placeIndicator(false));
    observer.observe(list);
    return () => observer.disconnect();
  }, [placeIndicator]);

  // Ctrl K / ⌘ K ouvre ou ferme la palette, partout dans l'administration.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setDrawer(false);
        setPalette((open) => !open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Tiroir du menu (téléphone, tablette) : page figée, Échap pour fermer, focus rendu au bouton.
  useEffect(() => {
    if (!drawer) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    nav.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawer(false);
    };
    document.addEventListener("keydown", onKey);
    const button = menuButton.current;
    return () => {
      root.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      button?.focus();
    };
  }, [drawer]);

  // Confirmation éphémère.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(onNoticeShown, 3600);
    return () => window.clearTimeout(timer);
  }, [notice, onNoticeShown]);

  function go(next: AdminView) {
    setDrawer(false);
    navigate(next);
  }

  return (
    <div className={cx(legacy.admin, s.shell)} data-rail={rail ? "" : undefined}>
      <a className="skip-link" href="#contenu-admin">
        Aller au contenu
      </a>
      <MotionRoot />
      <aside id="menu-admin" className={s.sidebar} data-open={drawer ? "" : undefined} aria-label="Menu de l’administration">
        <div className={s.brandRow}>
          <a href="/" className={s.brand} target="_blank" rel="noreferrer" title="Voir le site (nouvel onglet)">
            <img src="/eventheme_logo_png.webp" alt="EVENTHEMES — voir le site" width={150} height={68} />
          </a>
          <button
            type="button"
            className={cx(s.iconButton, s.railToggle)}
            onClick={toggleRail}
            aria-pressed={rail}
            aria-label={rail ? "Déplier le menu" : "Replier le menu"}
            title={rail ? "Déplier le menu" : "Replier le menu"}
          >
            <SidebarIcon />
          </button>
        </div>
        <nav ref={nav} className={s.nav} aria-label="Administration">
          <span ref={indicator} className={s.navIndicator} aria-hidden="true" />
          {navigation.map((group) => (
            <div key={group.title} className={s.navGroup}>
              <span className={s.navTitle}>{group.title}</span>
              {group.items.map(({ view: target, label, icon: ItemIcon }) => {
                const badge = counts[target] ?? 0;
                return (
                  <button
                    key={target}
                    type="button"
                    className={s.navItem}
                    aria-current={view === target ? "page" : undefined}
                    onClick={() => go(target)}
                    title={rail ? label : undefined}
                  >
                    <ItemIcon className={s.navIcon} />
                    <span className={s.navLabel}>{label}</span>
                    {badge > 0 && (
                      <b className={s.navCount}>
                        <span aria-hidden="true">{badge > 99 ? "99+" : badge}</span>
                        <span className="visually-hidden">, {badge} nouvelle{badge > 1 ? "s" : ""}</span>
                      </b>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className={s.account}>
          <span className={s.avatar} aria-hidden="true">
            {initials(account)}
          </span>
          <span className={s.accountText}>
            <b>{account.name || account.email || "Administrateur"}</b>
            <small>{account.name && account.email ? account.email : "Administrateur"}</small>
          </span>
          <button type="button" className={s.iconButton} onClick={onLogout} aria-label="Se déconnecter" title="Se déconnecter">
            <LogoutIcon />
          </button>
        </div>
      </aside>
      <button
        type="button"
        className={s.scrim}
        data-open={drawer ? "" : undefined}
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => setDrawer(false)}
      />
      <div className={s.workspace}>
        <header className={s.topbar}>
          <button
            ref={menuButton}
            type="button"
            className={cx(s.iconButton, s.menuButton)}
            onClick={() => setDrawer(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={drawer}
            aria-controls="menu-admin"
          >
            <MenuIcon />
          </button>
          <nav className={s.crumbs} aria-label="Fil d’Ariane">
            <ol>
              <li>EVENTHEMES</li>
              <li>{here.group}</li>
              <li aria-current="page">{here.label}</li>
            </ol>
          </nav>
          <div className={s.topActions}>
            <button
              type="button"
              className={s.searchTrigger}
              onClick={() => setPalette(true)}
              aria-haspopup="dialog"
              aria-keyshortcuts="Control+K Meta+K"
            >
              <SearchIcon />
              <span>Rechercher ou aller à…</span>
              <kbd>{shortcut} K</kbd>
            </button>
            <span className={s.modeChip} data-local={local ? "" : undefined} title={local ? "Données conservées sur cet ordinateur" : "Données en ligne (Supabase)"}>
              <i aria-hidden="true" />
              {local ? "Aperçu local" : "En ligne"}
            </span>
            <button
              type="button"
              className={s.iconButton}
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Passer au thème sombre" : "Passer au thème clair"}
              title={theme === "light" ? "Thème sombre" : "Thème clair"}
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
            <a className={s.iconButton} href="/" target="_blank" rel="noreferrer" aria-label="Voir le site (nouvel onglet)" title="Voir le site">
              <ExternalIcon />
            </a>
          </div>
        </header>
        <main id="contenu-admin" className={s.main} tabIndex={-1}>
          {children}
        </main>
      </div>
      <button type="button" className={s.quick} onClick={() => setPalette(true)} aria-haspopup="dialog">
        <span className={s.orb} aria-hidden="true" />
        <span className={s.quickLabel}>Actions rapides</span>
        <kbd>{shortcut} K</kbd>
      </button>
      <CommandPalette open={palette} onClose={() => setPalette(false)} items={paletteItems} />
      <div className={s.toastZone} aria-live="polite">
        {notice && (
          <p className={s.toast} role="status">
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}
