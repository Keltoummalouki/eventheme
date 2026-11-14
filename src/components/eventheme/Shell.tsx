"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import MobileMenu from "@/components/layout/MobileMenu";
import { brand, navigation } from "@/data/eventheme";
import { useScrolled } from "@/hooks/useScrolled";
import { cx } from "@/lib/cx";
import { findSocial } from "@/lib/eventheme/types";
import { gsap, motionSafe, useGSAP } from "@/lib/motion";
import { useEventheme } from "./Provider";
import Button from "@/components/ui/Button";
import s from "./Eventheme.module.css";
import homeHeader from "./HomeHeader.module.css";
import { ArrowUpRightIcon } from "@/components/ui/icons";
export function Logo() {
  return (
    <img
      src="/eventheme_logo_png.webp"
      alt={`${brand.name} — accueil`}
      className={s.logo}
      width={150}
      height={68}
    />
  );
}
export function Arrow() {
  return <ArrowUpRightIcon className="inline-icon" />;
}
export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const home = path === "/";
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled(40);
  const header = useRef<HTMLElement>(null);
  const { entries, basket, notice } = useEventheme();
  const socials = entries.filter((e) => e.kind === "socials");
  const services = entries.filter((e) => e.kind === "services");
  const count =
    basket.services.length +
    basket.products.reduce((n, p) => n + p.quantity, 0);
  // Sur l'accueil, « Mon devis » mène à la section ; ailleurs, à sa page.
  const quoteHref = home ? "#devis" : "/devis";

  // Menu ouvert : le focus reste dans la navigation et le reste de la page
  // est inert. Échap et le retour au format bureau referment le menu.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    const menu = document.getElementById("menu-mobile");
    const headerElement = header.current;
    const toggle = document.getElementById("menu-toggle");
    root.style.overflow = "hidden";
    menu?.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true });

    const focusable = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '#menu-mobile a[href], #menu-mobile button:not([disabled]), header a[href], header button:not([disabled])',
        ),
      ).filter((element) => element.getClientRects().length > 0 && !element.closest("[inert]"));

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        toggle?.focus({ preventScroll: true });
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !elements.includes(active as HTMLElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !elements.includes(active as HTMLElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 961px)");
    const onDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onDesktop);
    return () => {
      root.style.overflow = before;
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onDesktop);
      if (menu?.contains(document.activeElement)) {
        const destination = desktop.matches ? headerElement?.querySelector<HTMLElement>('a[href]') : toggle;
        destination?.focus({ preventScroll: true });
      }
    };
  }, [open]);

  // Filet doré de progression de lecture, sous l'en-tête.
  useGSAP(
    () =>
      motionSafe(header, () => {
        gsap.fromTo(
          `.${s.progress}`,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
          },
        );
      }),
    { scope: header, dependencies: [path], revertOnUpdate: true },
  );

  const quoteButton = (
    <Button
      href={quoteHref}
      variant="outline"
      size="sm"
      icon={<ArrowUpRightIcon />}
      className={cx(s.quoteButton, home && homeHeader.quote)}
      onClick={() => setOpen(false)}
    >
      Mon devis {count > 0 && <span className={s.count}>{count}</span>}
    </Button>
  );

  return (
    <div className={s.site}>
      <a className={s.skip} href="#main" inert={open}>
        Aller au contenu
      </a>
      <header
        ref={header}
        className={cx(
          s.header,
          home && s.overlay,
          scrolled && s.scrolled,
          open && s.menuOpen,
          home && homeHeader.header,
        )}
        data-home-header={home || undefined}
        data-scrolled={scrolled}
        data-menu-open={open}
      >
        <Link href="/" onClick={() => setOpen(false)} className={cx(s.brand, home && homeHeader.brand)}>
          <Logo />
        </Link>
        <nav className={cx(s.nav, home && homeHeader.navigation)} aria-label="Navigation principale">
          {navigation.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={path === href ? s.active : ""}
              aria-current={path === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        {quoteButton}
        <button
          id="menu-toggle"
          type="button"
          className={cx(s.menuToggle, open && s.menuToggleOpen, home && homeHeader.toggle)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
        </button>
        <span className={s.progress} aria-hidden="true" />
      </header>
      <MobileMenu
        id="menu-mobile"
        open={open}
        links={navigation}
        current={path}
        socials={socials}
        onNavigate={() => setOpen(false)}
        action={
          <Button href={quoteHref} icon={<ArrowUpRightIcon />} onClick={() => setOpen(false)}>
            Mon devis {count > 0 && `(${count})`}
          </Button>
        }
      />
      <main id="main" inert={open}>{children}</main>
      <footer className={s.footer} inert={open}>
        {home ? <div className={homeHeader.footerMark} aria-hidden="true">{brand.name}</div> : <div className={s.footerSignature}>
          <p lang="en">
            We engineer
            <br />
            <em>the experience.</em>
          </p>
          <Button href={quoteHref} icon={<ArrowUpRightIcon />}>
            Demander un devis
          </Button>
        </div>}
        <div className={s.footerTop}>
          <div>
            <Link href="/">
              <Logo />
            </Link>
            <p>
              {brand.name} — {brand.baseline}.
            </p>
            <span className={s.eyebrow}>
              {brand.disciplines.join(" · ").toUpperCase()}
            </span>
          </div>
          <div>
            <h3>Explorer</h3>
            {navigation.slice(1).map(([title, href]) => (
              <Link key={href} href={href}>
                {title}
              </Link>
            ))}
          </div>
          <div>
            <h3>Services</h3>
            {services.map((service) => (
              <Link key={service.id} href="/services">
                {service.title}
              </Link>
            ))}
            <Link href="/materiel">Catalogue matériel</Link>
          </div>
          <div>
            <h3>Rencontrons-nous</h3>
            <Link href="/contact">Parlons de votre projet</Link>
            <Link href={quoteHref}>Mon devis</Link>
            {socials.map((e) => (
              <a
                key={e.id}
                href={e.url}
                target={e.url?.startsWith("https") ? "_blank" : undefined}
                rel="noreferrer"
              >
                {e.title} <ArrowUpRightIcon className="inline-icon" />
              </a>
            ))}
          </div>
        </div>
        <div className={s.footerBottom}>
          <span>
            © {new Date().getFullYear()} {brand.name}. Tous droits réservés.
          </span>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/politique-de-confidentialite">Confidentialité</Link>
          <Link href="/admin">
            Administration <ArrowUpRightIcon className="inline-icon" />
          </Link>
        </div>
      </footer>
      <div
        className={`${s.toast} ${notice ? s.toastVisible : ""}`}
        role="status"
        inert={open}
      >
        {notice} {notice && <Link href={quoteHref}>Voir mon devis →</Link>}
      </div>
    </div>
  );
}
export function CTA() {
  const { entries } = useEventheme();
  const whatsapp = findSocial(entries, "whatsapp");
  return (
    <section className={s.cta}>
      <span className={s.eyebrow}>VOTRE PROJET, NOTRE TECHNIQUE</span>
      <h2>
        Parlons de votre
        <br />
        <em>prochain événement.</em>
      </h2>
      <div className={s.actions}>
        <Button href="/devis" icon={<ArrowUpRightIcon />} magnetic>
          Demander un devis
        </Button>
        {whatsapp?.url && (
          <Button
            variant="link"
            href={whatsapp.url}
            target="_blank"
            rel="noreferrer"
            icon={<ArrowUpRightIcon />}
          >
            Nous contacter sur WhatsApp
          </Button>
        )}
      </div>
    </section>
  );
}
