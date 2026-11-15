"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Truss from "@/components/ui/Truss";
import Button from "@/components/ui/Button";
import Eyebrow from "@/components/ui/Eyebrow";
import { Checkbox, Input, PhoneInput } from "@/components/ui/form";
import { contactMethodLabel } from "@/data/locales";
import { cx } from "@/lib/cx";
import { findSocial, type QuoteContact, type QuotePhase } from "@/lib/eventheme/types";
import { gsap, MOTION, prefersReducedMotion, revealSafe, useGSAP } from "@/lib/motion";
import { isMoroccanCity } from "@/data/moroccanCities";
import { track } from "@/lib/eventheme/audience";
import { fill, isolate } from "@/lib/i18n";
import { isValidPhone } from "@/lib/phone";
import { useEventheme, useQuote } from "./Provider";
import QuoteConfigurator from "./QuoteConfigurator";
import QuoteDocument from "./QuoteDocument";
import s from "./QuoteStudio.module.css";
import { ArrowUpRightIcon } from "@/components/ui/icons";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Valeurs enregistrées (en français) ; le libellé suit la langue de la page. */
const CONTACT_METHODS = ["Téléphone", "WhatsApp", "E-mail"];
/** Les trois temps du parcours, tels que le visiteur les perçoit (t.quote.journey). */
const journeyIndex: Record<QuotePhase, number> = { lead: 0, invite: 1, waiting: 1, configure: 1, done: 2 };

/**
 * « Mon devis » : le parcours central du site.
 *
 * 1. Un formulaire court (nom, téléphone, e-mail facultatif, moyen de contact
 *    préféré, occasion) crée
 *    aussitôt une demande de rappel : l'équipe a le contact, même si le
 *    visiteur s'arrête là.
 * 2. On lui propose ensuite d'aller plus loin : composer son événement et voir
 *    son estimation évoluer en direct.
 * 3. Il reçoit enfin son devis estimatif : imprimable, envoyable par WhatsApp,
 *    et enregistré dans l'administration.
 *
 * Le parcours vit dans un contexte partagé : il survit à un détour par le
 * catalogue pour ajouter du matériel.
 */
export default function QuoteStudio({
  as: Heading = "h2",
  eventId = "",
  city = "",
}: {
  as?: "h1" | "h2";
  eventId?: string;
  /** Ville préremplie (/devis?ville=Marrakech, depuis une page ville). */
  city?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const { entries, local, locale, t, href } = useEventheme();
  const { quote, setQuote, pickEvent } = useQuote();
  const events = entries.filter((e) => e.kind === "events");
  const whatsapp = findSocial(entries, "whatsapp");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof QuoteContact | "event", string>>>({});
  const [website, setWebsite] = useState("");
  const [startedAt] = useState(() => Date.now());
  const { contact, details, lead } = quote;
  // Sans demande de rappel enregistrée, on revient toujours au premier formulaire.
  const phase: QuotePhase =
    quote.phase === "done" ? (quote.result ? "done" : "lead") : quote.phase !== "lead" && !lead ? "lead" : quote.phase;
  const firstName = contact.name.trim().split(/\s+/)[0] || "";

  // Occasion transmise par l'adresse (/devis?event=…) : appliquée une seule fois.
  const applied = useRef("");
  useEffect(() => {
    if (!eventId || applied.current === eventId) return;
    applied.current = eventId;
    if (events.some((e) => e.id === eventId)) pickEvent(eventId);
  }, [eventId, events, pickEvent]);

  // Ville transmise par l’adresse : appliquée une fois, sans remplacer une ville déjà choisie.
  const cityApplied = useRef(false);
  useEffect(() => {
    if (cityApplied.current || !isMoroccanCity(city)) return;
    cityApplied.current = true;
    setQuote((q) => (q.details.city ? q : { ...q, details: { ...q.details, city } }));
  }, [city, setQuote]);

  // À chaque changement d'étape du parcours, le titre reprend le focus et la
  // section revient à l'écran si elle en était sortie.
  const shown = useRef(phase);
  useEffect(() => {
    if (shown.current === phase) return;
    shown.current = phase;
    const top = ref.current?.getBoundingClientRect().top ?? 0;
    if (top < -40 || top > window.innerHeight * 0.4)
      ref.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    heading.current?.focus({ preventScroll: true });
    if (!prefersReducedMotion() && ref.current)
      gsap.fromTo(
        ref.current.querySelectorAll(`.${s.stage} > *`),
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, duration: 0.8, ease: MOTION.ease, stagger: 0.08 },
      );
  }, [phase]);

  /* Première apparition, au défilement. */
  useGSAP(
    () =>
      revealSafe(ref, (full) => {
        const blocks = gsap.utils.toArray<HTMLElement>(`.${s.head} > *, .${s.stage} > *`, ref.current);
        if (!full) {
          gsap.set(blocks, { autoAlpha: 1, y: 0 });
          return;
        }
        gsap.fromTo(
          blocks,
          { autoAlpha: 0, y: 34 },
          {
            autoAlpha: 1,
            y: 0,
            duration: MOTION.duration,
            ease: MOTION.ease,
            stagger: 0.1,
            scrollTrigger: { trigger: ref.current, start: "top 72%", once: true },
          },
        );
      }),
    { scope: ref },
  );

  const setContact = (patch: Partial<QuoteContact>) =>
    setQuote((q) => ({ ...q, contact: { ...q.contact, ...patch } }));
  const go = (next: QuotePhase) => setQuote((q) => ({ ...q, phase: next, step: 0 }));

  async function sendLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const found: typeof errors = {};
    if (!contact.name.trim()) found.name = t.quote.errors.name;
    if (!isValidPhone(contact.phone)) found.phone = t.quote.errors.phone;
    if (contact.email.trim() && !EMAIL.test(contact.email.trim())) found.email = t.quote.errors.email;
    else if (contact.contactMethod === "E-mail" && !contact.email.trim()) found.email = t.quote.errors.emailMethod;
    if (!details.event) found.event = t.quote.errors.event;
    if (!contact.consent) found.consent = t.quote.errors.consent;
    setErrors(found);
    if (Object.keys(found).length) {
      setError(t.common.missing);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Locale": locale },
        body: JSON.stringify({
          kind: "callback",
          name: contact.name,
          company: contact.company,
          phone: contact.phone,
          email: contact.email,
          event: details.event,
          consent: true,
          website,
          startedAt,
          contactMethod: contact.contactMethod,
          basket: { services: [], products: [] },
          guests: 0,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      track("generate_lead", { lead_type: "callback" });
      setQuote((q) => ({
        ...q,
        phase: "invite",
        lead: { id: result.id, reference: result.reference, emailed: result.emailed === true, token: result.token, name: q.contact.name, phone: q.contact.phone, email: q.contact.email, event: q.details.event },
      }));
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : t.quote.errors.failed);
    } finally {
      setBusy(false);
    }
  }

  // « {name} » : le prénom, précédé d’une virgule, s’il est connu.
  const name = firstName ? `${t.quote.nameSeparator}${firstName}` : "";
  const [titleStart, titleEnd] = t.quote.titles[phase];
  const title = (
    <>
      {fill(titleStart, { name })}
      <br />
      <em>{fill(titleEnd, { name })}</em>
    </>
  );
  // Le numéro reste lisible (chiffres dans l’ordre) au milieu d’une phrase arabe.
  const intro = fill(t.quote.intros[phase], { phone: isolate(lead?.phone || contact.phone) });
  const wide = phase === "configure" || phase === "done";

  return (
    <section className={cx(s.studio, wide && s.wide)} id="devis" ref={ref} aria-labelledby="devis-titre">
      <Truss className={s.rig} />
      <div className={s.inner}>
        <div className={s.head}>
          <Eyebrow>{t.quote.eyebrow}</Eyebrow>
          <Heading id="devis-titre" ref={heading} tabIndex={-1} className={s.title}>
            {title}
          </Heading>
          <p className={s.intro}>{intro}</p>
          {/* Pendant la personnalisation, les étapes du configurateur suffisent. */}
          {phase !== "configure" && (
            <ol className={s.journey} style={{ ["--progress" as string]: journeyIndex[phase] / 2 }}>
              {t.quote.journey.map((label, index) => (
                <li
                  key={label}
                  className={cx(index < journeyIndex[phase] && s.passed, index === journeyIndex[phase] && s.here)}
                  aria-current={index === journeyIndex[phase] ? "step" : undefined}
                >
                  <span>{index < journeyIndex[phase] ? "✓" : String(index + 1).padStart(2, "0")}</span>
                  {label}
                </li>
              ))}
            </ol>
          )}
          {!wide && (
            <p className={s.reassurance}>
              {t.quote.reassurance}
              {whatsapp?.url && (
                <>
                  <br />
                  {t.quote.preferWriting}{" "}
                  <a href={whatsapp.url} target="_blank" rel="noreferrer">
                    {t.quote.whatsapp} <ArrowUpRightIcon className="inline-icon" />
                  </a>
                </>
              )}
            </p>
          )}
        </div>

        <div className={s.stage}>
          {phase === "lead" && (
            <form className={s.card} onSubmit={sendLead} noValidate>
              <span className={s.cardKicker}>{t.quote.leadKicker}</span>
              <div className={s.fields}>
                <Input
                  label={t.quote.name}
                  name="name"
                  required
                  autoComplete="name"
                  maxLength={250}
                  value={contact.name}
                  error={errors.name}
                  onChange={(e) => setContact({ name: e.target.value })}
                />
                <Input
                  label={t.quote.company}
                  name="organization"
                  autoComplete="organization"
                  maxLength={250}
                  value={contact.company}
                  onChange={(e) => setContact({ company: e.target.value })}
                />
                <PhoneInput
                  label={t.quote.phone}
                  name="phone"
                  required
                  value={contact.phone}
                  error={errors.phone}
                  onChange={(phone) => setContact({ phone })}
                />
                <Input
                  label={t.quote.email}
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={250}
                  value={contact.email}
                  error={errors.email}
                  onChange={(e) => setContact({ email: e.target.value })}
                />
              </div>
              <fieldset className={s.group}>
                <legend>{t.quote.contactMethod}</legend>
                <div className={s.chips}>
                  {CONTACT_METHODS.map((method) => (
                    <label key={method} className={cx(s.chip, contact.contactMethod === method && s.chipOn)}>
                      <input
                        type="radio"
                        name="contactMethod"
                        value={method}
                        checked={contact.contactMethod === method}
                        onChange={() => setContact({ contactMethod: method })}
                      />
                      {contactMethodLabel(locale, method)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className={s.occasions} aria-describedby={errors.event ? "occasion-erreur" : undefined}>
                <legend>
                  {t.quote.event} <span aria-hidden="true">*</span>
                </legend>
                <div className={s.chips}>
                  {events.map((e) => (
                    <label key={e.id} className={cx(s.chip, details.event === e.id && s.chipOn)}>
                      <input
                        type="radio"
                        name="event"
                        value={e.id}
                        checked={details.event === e.id}
                        onChange={() => pickEvent(e.id)}
                      />
                      {e.title}
                    </label>
                  ))}
                </div>
                {errors.event && (
                  <p id="occasion-erreur" className={s.fieldError}>
                    {errors.event}
                  </p>
                )}
              </fieldset>
              <div className={s.honeypot} aria-hidden="true">
                <label>
                  {t.quote.honeypot}
                  <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </label>
              </div>
              <Checkbox
                className={s.consent}
                required
                checked={contact.consent}
                error={errors.consent}
                onChange={(consent) => setContact({ consent })}
              >
                {t.quote.consentStart}{" "}
                <Link href={href("privacy")} target="_blank">
                  {t.quote.privacyPolicy}
                </Link>
                .
              </Checkbox>
              {error && (
                <p className={s.error} role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" loading={busy} icon={<ArrowUpRightIcon />} block magnetic>
                {busy ? t.common.sending : t.quote.submit}
              </Button>
              <p className={s.caption}>{t.quote.next}</p>
              {local && <p className={s.demo}>{t.quote.localLead}</p>}
            </form>
          )}

          {(phase === "invite" || phase === "waiting") && lead && (
            <div className={cx(s.card, s.invite)}>
              <svg className={s.check} viewBox="0 0 60 60" aria-hidden="true" focusable="false">
                <circle cx="30" cy="30" r="28" />
                <path d="M19 31 l7 7 l15 -16" />
              </svg>
              <span className={s.cardKicker}>
                {fill(t.quote.received, { reference: lead.reference || lead.id.slice(0, 8).toUpperCase() })}
              </span>
              <h3>{phase === "invite" ? t.quote.inviteTitle : t.quote.waitingTitle}</h3>
              {lead.emailed && lead.email && <p className={s.caption}>{fill(t.quote.emailed, { email: lead.email })}</p>}
              <p>{phase === "invite" ? t.quote.inviteText : t.quote.waitingText}</p>
              <ul className={s.perks}>
                {t.quote.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
              <div className={s.inviteActions}>
                <Button icon={<ArrowUpRightIcon />} magnetic onClick={() => go("configure")}>
                  {t.quote.customise}
                </Button>
                {phase === "invite" && (
                  <Button variant="link" onClick={() => go("waiting")}>
                    {t.quote.callMe}
                  </Button>
                )}
              </div>
              {local && <p className={s.demo}>{t.quote.localInvite}</p>}
            </div>
          )}

          {phase === "configure" && lead && <QuoteConfigurator />}
          {phase === "done" && quote.result && <QuoteDocument result={quote.result} />}
        </div>
      </div>
    </section>
  );
}
