"use client";
import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { formatLongDate, parseIsoDate } from "@/lib/dates";
import {
  daysLabel,
  findSocial,
  hoursLabel,
  lineAmount,
  lineLabel,
  money,
  participantsLabel,
  variantLabel,
  type QuoteResult,
} from "@/lib/eventheme/types";
import { quoteMessage, whatsappLink } from "@/lib/eventheme/whatsapp";
import { fill, intlLocale } from "@/lib/i18n";
import { contactMethodLabel } from "@/data/locales";
import { gsap, revealSafe, useGSAP } from "@/lib/motion";
import { initialQuote, useEventheme, useQuote } from "./Provider";
import { brand } from "@/data/eventheme";
import s from "./QuoteStudio.module.css";
import { ArrowUpRightIcon } from "@/components/ui/icons";

/**
 * Le devis estimatif remis au client en fin de parcours.
 *
 * Une feuille claire, comme un document que l'on garde : références,
 * coordonnées, détail poste par poste, mentions. Elle s'imprime seule
 * (`data-print-root`, voir base.css) et s'envoie sur WhatsApp. Les montants
 * restent indicatifs : le devis définitif vient de l'équipe.
 */
export default function QuoteDocument({ result }: { result: QuoteResult }) {
  const ref = useRef<HTMLDivElement>(null);
  const { entries, locale, t } = useEventheme();
  const d = t.document;
  const { setQuote } = useQuote();
  const [notice, setNotice] = useState("");
  const { contact, details, basket } = result;
  const label = (id: string) => entries.find((e) => e.id === id)?.title || t.configurator.recap.toDefine;
  const longDate = (date: Date) => formatLongDate(date, intlLocale[locale]);
  const reference = result.reference || `EVT-${result.id.slice(0, 8).toUpperCase()}`;
  const attachments = result.attachments ?? [];
  const missing = attachments.filter((file) => !file.sent);
  const eventDate = parseIsoDate(details.date);
  const issued = longDate(new Date(result.sentAt));

  useGSAP(
    () =>
      revealSafe(ref, (full) => {
        const find = gsap.utils.selector(ref);
        const paper = find(`.${s.paper}`);
        const rows = find(`.${s.paper} tbody tr, .${s.paperTotal}`);
        if (!full) {
          gsap.set(paper, { clipPath: "inset(0% 0% 0% 0%)" });
          return;
        }
        gsap
          .timeline({ delay: 0.3 })
          .fromTo(
            paper,
            { clipPath: "inset(0% 0% 100% 0%)", y: 40 },
            { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 1.4, ease: "expo.inOut" },
          )
          .fromTo(rows, { autoAlpha: 0, x: -16 }, { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.06 }, "-=0.5");
      }),
    { scope: ref },
  );

  async function sendOnWhatsApp() {
    const whatsapp = findSocial(entries, "whatsapp");
    if (!whatsapp?.url) return;
    const products = basket.products.map(
      (p) => `${label(p.id)}${p.variant ? ` ${variantLabel(entries.find((e) => e.id === p.id), p.variant)}` : ""} × ${p.quantity}`,
    );
    const message = quoteMessage(
      {
        event: label(details.event),
        date: details.date,
        city: details.city,
        services: [...basket.services.map(label), ...(products.length ? [fill(d.material, { items: products.join(", ") })] : [])],
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        reference,
      },
      locale,
    );
    const link = whatsappLink(whatsapp.url, message);
    if (link) {
      window.open(link, "_blank", "noopener");
      return;
    }
    // Lien court WhatsApp Business : le texte ne peut pas être transmis, on le copie.
    try {
      await navigator.clipboard.writeText(message);
      setNotice(d.copied);
    } catch {
      setNotice(fill(d.mention, { reference }));
    }
    window.open(whatsapp.url, "_blank", "noopener");
  }

  return (
    <div className={s.done} ref={ref}>
      <article className={s.paper} data-print-root aria-label={fill(d.label, { reference })}>
        <header className={s.paperHead}>
          <img src="/eventheme_logo_png.webp" alt={brand.name} className={s.paperLogo} width={180} height={82} />
          <div className={s.paperRef}>
            <span>{d.title}</span>
            <strong>{reference}</strong>
            <small>{fill(d.issued, { date: issued })}</small>
          </div>
        </header>

        <div className={s.paperParties}>
          <section>
            <h4>{d.client}</h4>
            <p>
              <b>{contact.name}</b>
              {contact.company && (
                <>
                  <br />
                  {contact.company}
                </>
              )}
              <br />
              {contact.phone}
              {contact.email && (
                <>
                  <br />
                  {contact.email}
                </>
              )}
              <br />
              {fill(d.contactWay, { method: contactMethodLabel(locale, contact.contactMethod) })}
            </p>
          </section>
          <section>
            <h4>{d.event}</h4>
            <p>
              <b>{label(details.event)}</b>
              <br />
              {eventDate ? longDate(eventDate) : d.noDate}
              {details.duration > 0 && ` · ${hoursLabel(details.duration, locale)}`}
              <br />
              {[details.city, details.address].filter(Boolean).join(", ")}
              <br />
              {participantsLabel(details.guests, locale)}
              {basket.products.length > 0 && (
                <>
                  <br />
                  {fill(d.rental, { days: daysLabel(details.rentalDays, locale) })}
                </>
              )}
            </p>
          </section>
        </div>

        <table className={s.paperTable}>
          <thead>
            <tr>
              <th scope="col">{d.item}</th>
              <th scope="col">{d.quantity}</th>
              <th scope="col">{d.amount}</th>
            </tr>
          </thead>
          <tbody>
            {result.lines.map((line, index) => (
              <tr key={`${line.label}-${index}`}>
                <td>{lineLabel(line, locale)}</td>
                <td>{line.quantity}</td>
                <td>{lineAmount(line, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={s.paperTotal}>
          <span>{result.hasUnpriced && result.estimate > 0 ? d.pricedTotal : d.total}</span>
          <strong>{result.estimate > 0 ? money(result.estimate, locale) : t.format.onRequest}</strong>
        </div>

        {(details.message || details.budget > 0) && (
          <div className={s.paperNote}>
            <h4>{d.notes}</h4>
            {details.budget > 0 && <p>{fill(d.budget, { amount: money(details.budget, locale) })}</p>}
            {details.message && <p>{details.message}</p>}
          </div>
        )}

        {attachments.length > 0 && (
          <div className={s.paperNote}>
            <h4>{d.attachments}</h4>
            <ul className={s.paperFiles}>
              {attachments.map((file, index) => (
                <li key={`${file.name}-${index}`}>
                  {file.sent ? "✓" : "✕"} {file.name}
                  {!file.sent && <small>{fill(d.notReceived, { reason: file.error ? ` (${file.error})` : "" })}</small>}
                </li>
              ))}
            </ul>
            {missing.length > 0 && (
              <p>{fill(d.resend, { files: missing.length > 1 ? d.resendMany : d.resendOne, reference })}</p>
            )}
          </div>
        )}

        <footer className={s.paperFoot}>
          <p>
            {d.disclaimer}
            {result.hasUnpriced && d.unpriced}
            {d.confirmation}
          </p>
          <p className={s.paperSignature} lang="en">{brand.name} — {brand.signature}</p>
        </footer>
      </article>

      <div className={s.docActions}>
        <Button icon="↓" onClick={() => window.print()}>
          {d.print}
        </Button>
        <Button variant="outline" icon={<ArrowUpRightIcon />} onClick={sendOnWhatsApp}>
          {d.whatsapp}
        </Button>
        <Button variant="link" onClick={() => setQuote(initialQuote())}>
          {d.restart}
        </Button>
      </div>
      {result.emailed && contact.email && <p className={s.notice}>{fill(d.emailed, { email: contact.email })}</p>}
      <p className={s.notice} role="status">
        {notice}
      </p>
    </div>
  );
}
