"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useEventheme } from "./Provider";
import { PageIntro } from "./Pages";
import { Arrow } from "./Shell";
import Button from "@/components/ui/Button";
import {
  Checkbox,
  Input,
  PhoneInput,
  Select,
  Textarea,
} from "@/components/ui/form";
import { contactMethodLabel } from "@/data/locales";
import { followersLabel } from "@/lib/eventheme/types";
import { fill } from "@/lib/i18n";
import s from "./Eventheme.module.css";
import { ArrowUpRightIcon } from "@/components/ui/icons";
/** Valeurs enregistrées en français ; le libellé suit la langue de la page. */
const CONTACT_METHODS = ["WhatsApp", "Téléphone", "E-mail"];
/** Formulaire de la page Contact. Les demandes de devis passent par « Mon devis ». */
export default function InquiryForm() {
  const { entries, local, locale, t, href } = useEventheme();
  const c = t.contact;
  const contactMethods = CONTACT_METHODS.map((value) => ({ value, label: contactMethodLabel(locale, value) }));
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    subject: "",
    event: "",
    message: "",
    contactMethod: "WhatsApp",
    consent: false,
    website: "",
  });
  const [startedAt] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [emailed, setEmailed] = useState(false);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Locale": locale },
        body: JSON.stringify({
          ...form,
          kind: "contact",
          basket: { services: [], products: [] },
          startedAt,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSent(result.reference || String(result.id).slice(0, 8).toUpperCase());
      setEmailed(result.emailed === true);
    } catch (error) {
      setError(error instanceof Error && error.message ? error.message : c.failed);
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <section className={s.success}>
        <span className={s.successIcon}>✓</span>
        <span className={s.eyebrow}>{c.sentEyebrow}</span>
        <h1>
          {c.sentStart}
          <br />
          <em>{c.sentEnd}</em>
        </h1>
        <p>{local ? c.sentLocal : `${c.sentText}${emailed ? c.sentEmailed : ""}`}</p>
        <p className={s.caption}>{fill(c.reference, { reference: sent })}</p>
        <Button href={href("home")} icon={<ArrowUpRightIcon />} className={s.successAction}>
          {t.common.backHome}
        </Button>
      </section>
    );
  return (
    <>
      <PageIntro id="contact" eyebrow={c.eyebrow} />
      <section className={`${s.section} ${s.formLayout}`}>
        <form onSubmit={submit} className={s.form}>
          <h2 className={s.stepTitle}>{c.title}</h2>
          <div className={s.honeypot} aria-hidden="true">
            <label>
              {t.quote.honeypot}
              <input
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
              />
            </label>
          </div>
          <div className={s.formGrid}>
            <Input
              label={c.name}
              name="name"
              autoComplete="name"
              required
              maxLength={250}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
            <Input
              label={c.company}
              autoComplete="organization"
              maxLength={250}
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
            />
            <Input
              label={c.email}
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
            <PhoneInput
              label={c.phone}
              name="phone"
              required
              value={form.phone}
              onChange={(phone) => set("phone", phone)}
            />
            <Select
              label={c.contactMethod}
              options={contactMethods}
              value={form.contactMethod}
              onChange={(value) => set("contactMethod", value)}
            />
            <Select
              label={c.eventType}
              searchable
              placeholder={c.toDefine}
              options={[
                { value: "", label: c.toDefine },
                ...entries
                  .filter((e) => e.kind === "events")
                  .map((e) => ({ value: e.id, label: e.title })),
              ]}
              value={form.event}
              onChange={(value) => set("event", value)}
            />
            <Input
              label={c.subject}
              className={s.fullWidth}
              required
              maxLength={250}
              value={form.subject}
              onChange={(e) => set("subject", e.target.value)}
            />
            <Textarea
              label={c.message}
              className={s.fullWidth}
              required
              rows={5}
              maxLength={5000}
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
            />
          </div>
          <Checkbox
            className={s.consent}
            required
            checked={form.consent}
            onChange={(consent) => set("consent", consent)}
          >
            {c.consentStart}{" "}
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
          <div className={s.formActions}>
            <Button type="submit" loading={busy} icon={<ArrowUpRightIcon />}>
              {busy ? t.common.sending : c.submit}
            </Button>
          </div>
        </form>
        <aside className={s.summary}>
          <span className={s.eyebrow}>{c.asideEyebrow}</span>
          <h3>{c.asideTitle}</h3>
          <p>{c.asideText}</p>
          <Button href={href("quote")} variant="link" icon={<ArrowUpRightIcon />}>
            {t.nav.quote}
          </Button>
          {entries
            .filter((e) => e.kind === "socials")
            .map((e) => (
              <a
                className={s.contactLink}
                key={e.id}
                href={e.url}
                target={e.url?.startsWith("https") ? "_blank" : undefined}
                rel="noreferrer"
              >
                <span>
                  {e.title}
                  <small>
                    {[e.description, e.followers && followersLabel(e.followers, locale)]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </span>
                <Arrow />
              </a>
            ))}
          {local && (
            <p className={s.demoNote}>{c.localNote}</p>
          )}
        </aside>
      </section>
    </>
  );
}
