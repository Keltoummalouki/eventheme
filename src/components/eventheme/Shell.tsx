"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import MobileMenu from "@/components/layout/MobileMenu";
import { brand, navigation } from "@/data/eventheme";
import { dictionaries } from "@/data/locales";
import { measurementId, reopenConsent } from "@/lib/eventheme/audience";
import { siteSettings } from "@/lib/eventheme/types";
import Consent from "./Consent";

/** Mesure d’audience : active seulement si l’identifiant Google Analytics est configuré (au build). */
const audience = measurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
import { fill, locales, routeOf, translatePath } from "@/lib/i18n";
import { useScrolled } from "@/hooks/useScrolled";
import { cx } from "@/lib/cx";
import { findSocial } from "@/lib/eventheme/types";
import { gsap, motionSafe, useGSAP } from "@/lib/motion";
import { useEventheme } from "./Provider";
import Button from "@/components/ui/Button";
import s from "./Eventheme.module.css";
import homeHeader from "./HomeHeader.module.css";
import { ArrowUpRightIcon } from "@/components/ui/icons";
export function Logo({ alt = `${brand.name} — accueil` }: { alt?: string }) {
  return (
    <img
      src="/eventheme_logo_png.webp"
      alt={alt}
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
  const route = routeOf(path);
  const home = route.key === "home";
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled(40);
  const header = useRef<HTMLElement>(null);
  const { entries, basket, notice, locale, t, href } = useEventheme();
  const links = navigation.map((key) => [t.nav[key], href(key)] as const);
  // L’autre langue : un lien simple, pour recharger la page dans sa langue (<html lang>, contenus).
  const other = locales.find((item) => item !== locale) ?? locale;
  const languageLink = (className: string) => (
    <a
      href={translatePath(path, other)}
      hrefLang={other}
      lang={other}
      className={className}
      aria-label={dictionaries[other].languageName}
    >
      {other.toUpperCase()}
    </a>
  );
  const socials = entries.filter((e) => e.kind === "socials");
  const services = entries.filter((e) => e.kind === "services");
  const cities = entries.filter((e) => e.kind === "cities");
  const settings = siteSettings(entries);
  const count =
    basket.services.length +
    basket.products.reduce((n, p) => n + p.quantity, 0);
  // Sur l'accueil, « Mon devis » mène à la section ; ailleurs, à sa page.
  const quoteHref = home ? "#devis" : href("quote");

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
      {t.nav.quote} {count > 0 && <span className={s.count}>{count}</span>}
    </Button>
  );

  return (
    <div className={s.site}>
      <a className={s.skip} href="#main" inert={open}>
        {t.nav.skip}
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
        <Link href={href("home")} onClick={() => setOpen(false)} className={cx(s.brand, home && homeHeader.brand)}>
          <Logo alt={fill(t.nav.logoAlt, { brand: brand.name })} />
        </Link>
        <nav className={cx(s.nav, home && homeHeader.navigation)} aria-label={t.nav.main}>
          {navigation.map((key) => (
            <Link
              key={key}
              href={href(key)}
              className={route.key === key ? s.active : ""}
              aria-current={route.key === key ? "page" : undefined}
            >
              {t.nav[key]}
            </Link>
          ))}
        </nav>
        {settings.english && languageLink(s.language)}
        {quoteButton}
        <button
          id="menu-toggle"
          type="button"
          className={cx(s.menuToggle, open && s.menuToggleOpen, home && homeHeader.toggle)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
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
        links={links}
        current={path}
        socials={socials}
        onNavigate={() => setOpen(false)}
        label={t.nav.mobile}
        language={settings.english ? languageLink(s.menuLanguage) : undefined}
        action={
          <Button href={quoteHref} icon={<ArrowUpRightIcon />} onClick={() => setOpen(false)}>
            {t.nav.quote} {count > 0 && `(${count})`}
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
            {t.common.requestQuote}
          </Button>
        </div>}
        <div className={s.footerTop}>
          <div>
            <Link href={href("home")}>
              <Logo alt={fill(t.nav.logoAlt, { brand: brand.name })} />
            </Link>
            <p>
              {brand.name} — {t.brand.baseline}.
            </p>
            <span className={s.eyebrow}>
              {t.brand.disciplines.join(" · ").toUpperCase()}
            </span>
          </div>
          <div>
            <h3>{t.footer.explore}</h3>
            {links.slice(1).map(([title, target]) => (
              <Link key={target} href={target}>
                {title}
              </Link>
            ))}
          </div>
          <div>
            <h3>{t.footer.services}</h3>
            {services.map((service) => (
              <Link key={service.id} href={href("services", service.id)}>
                {service.title}
              </Link>
            ))}
            <Link href={href("equipment")}>{t.footer.catalogue}</Link>
          </div>
          <div>
            <h3>{t.footer.meet}</h3>
            {settings.address && <address className={s.footerAddress}>{settings.address}</address>}
            <Link href={href("contact")}>{t.footer.talk}</Link>
            {cities.length > 0 && <Link href={href("cities")}>{t.footer.areas}</Link>}
            <Link href={quoteHref}>{t.nav.quote}</Link>
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
            © {new Date().getFullYear()} {brand.name}. {t.footer.rights}
          </span>
          <Link href={href("legal")}>{t.footer.legal}</Link>
          <Link href={href("privacy")}>{t.footer.privacy}</Link>
          {audience && (
            <button type="button" className={s.footerButton} onClick={reopenConsent}>
              {t.footer.cookies}
            </button>
          )}
          <Link href="/admin">
            {t.footer.admin} <ArrowUpRightIcon className="inline-icon" />
          </Link>
        </div>
      </footer>
      {audience && <Consent id={audience} />}
      <div
        className={`${s.toast} ${notice ? s.toastVisible : ""}`}
        role="status"
        inert={open}
      >
        {notice} {notice && <Link href={quoteHref}>{t.nav.viewQuote}</Link>}
      </div>
    </div>
  );
}
export function CTA() {
  const { entries, t, href } = useEventheme();
  const whatsapp = findSocial(entries, "whatsapp");
  return (
    <section className={s.cta}>
      <span className={s.eyebrow}>{t.cta.eyebrow}</span>
      <h2>
        {t.cta.titleStart}
        <br />
        <em>{t.cta.titleEnd}</em>
      </h2>
      <div className={s.actions}>
        <Button href={href("quote")} icon={<ArrowUpRightIcon />} magnetic>
          {t.common.requestQuote}
        </Button>
        {whatsapp?.url && (
          <Button
            variant="link"
            href={whatsapp.url}
            target="_blank"
            rel="noreferrer"
            icon={<ArrowUpRightIcon />}
          >
            {t.cta.whatsapp}
          </Button>
        )}
      </div>
    </section>
  );
}
