"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import { ArrowUpRightIcon, CloseIcon } from "@/components/ui/icons";
import { DatePicker, FileInput, Input, NumberInput, SearchInput, Select, Textarea } from "@/components/ui/form";
import { serviceItems } from "@/data/eventheme";
import { contactMethodLabel, dictionaries } from "@/data/locales";
import { isMoroccanCity, moroccanCities } from "@/data/moroccanCities";
import { cx } from "@/lib/cx";
import { formatLongDate, parseIsoDate, toIsoDate, today } from "@/lib/dates";
import { categoryTrail, inCategory, matchesSearch, topCategories, usedCategories } from "@/lib/eventheme/catalogue";
import { estimate } from "@/lib/eventheme/pricing";
import { ATTACHMENT_ACCEPT, attachmentHint, attachmentProblem, sizeLabel } from "@/lib/eventheme/requests";
import {
  daysLabel,
  hoursLabel,
  lineAmount,
  lineLabel,
  MAX_ATTACHMENTS,
  MAX_DURATION_HOURS,
  MAX_PARTICIPANTS,
  MAX_RENTAL_DAYS,
  money,
  participantsLabel,
  priceLabel,
  variantLabel,
  type Basket,
  type QuoteDetails,
  type SentAttachment,
} from "@/lib/eventheme/types";
import { uploadAttachment } from "@/lib/eventheme/upload";
import { fill, intlLocale } from "@/lib/i18n";
import { gsap, MOTION, prefersReducedMotion } from "@/lib/motion";
import { useEventheme, useQuote } from "./Provider";
import s from "./QuoteStudio.module.css";

const PARTICIPANTS = { min: 10, max: 2000, step: 10 };
const CITY_OPTIONS = moroccanCities.map((city) => ({ value: city, label: city }));

type Errors = Partial<Record<keyof QuoteDetails | "files", string>>;

/**
 * Personnalisation de l'événement, en cinq étapes, avec estimation en direct.
 * Les services et le matériel alimentent le même panier que les boutons
 * « Ajouter au devis » du site : rien n'est saisi deux fois. Seuls l’événement,
 * la date et la ville sont obligatoires.
 */
export default function QuoteConfigurator() {
  const { entries, basket, setBasket, local, locale, t, href } = useEventheme();
  const { quote, setQuote } = useQuote();
  /** Étapes du cahier des charges (§05) ; les coordonnées et le consentement précèdent, au rappel. */
  const steps = t.configurator.steps;
  const number = (value: number) => new Intl.NumberFormat(intlLocale[locale]).format(value);
  const longDate = (date: Date) => formatLongDate(date, intlLocale[locale]);
  const { details, contact, lead, step, files } = quote;
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [variants, setVariants] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [startedAt] = useState(() => Date.now());
  const panel = useRef<HTMLDivElement>(null);
  const stepTitle = useRef<HTMLHeadingElement>(null);
  const total = useRef<HTMLSpanElement>(null);
  const shownTotal = useRef<number | null>(null);

  const options = (kind: string) => entries.filter((e) => e.kind === kind);
  const label = (id: string) => entries.find((e) => e.id === id)?.title || t.configurator.recap.toDefine;
  /** Nom affiché de la variante choisie pour un matériel. */
  const optionLabel = (id: string, variant: string) => variantLabel(entries.find((e) => e.id === id), variant);
  const calculation = estimate(entries, details, basket, locale);
  const articles = basket.products.reduce((n, p) => n + p.quantity, 0);
  const minDate = toIsoDate(today());
  const products = options("products").filter((p) => p.available !== false);
  const categoryOptions = usedCategories(topCategories(entries), products);
  const shownProducts = products.filter(
    (product) => (!category || inCategory(product, category)) && matchesSearch(entries, product, search),
  );

  const setDetails = (patch: Partial<QuoteDetails>) => setQuote((q) => ({ ...q, details: { ...q.details, ...patch } }));
  const goTo = (next: number) => {
    setErrors({});
    setError("");
    setQuote((q) => ({ ...q, step: next }));
  };

  /* Changement d'étape : le contenu entre de côté, le titre prend le focus.
     Les styles sont retirés à l'arrivée : une transformation laissée sur chaque
     bloc en ferait un contexte d'empilement, et la liste d'un champ passerait
     sous les blocs suivants. */
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    stepTitle.current?.focus({ preventScroll: true });
    const top = panel.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) panel.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    if (!prefersReducedMotion() && panel.current)
      gsap.fromTo(
        panel.current.querySelectorAll(`.${s.stepBody} > *`),
        { autoAlpha: 0, x: 28 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.6,
          ease: MOTION.ease,
          stagger: 0.05,
          clearProps: "transform,opacity,visibility",
        },
      );
  }, [step]);

  /* Montant estimé : le chiffre défile de l'ancienne à la nouvelle valeur.
     Le nœud n'a pas d'enfant React : seul cet effet écrit dedans. */
  useEffect(() => {
    const node = total.current;
    if (!node) return;
    const onRequest = dictionaries[locale].format.onRequest;
    const next = calculation.total;
    const from = shownTotal.current;
    shownTotal.current = next;
    const write = (value: number) => {
      node.textContent = value > 0 ? money(Math.round(value), locale) : onRequest;
    };
    if (from == null || from === 0 || next === 0 || prefersReducedMotion()) {
      write(next);
      return;
    }
    const counter = { value: from };
    const tween = gsap.to(counter, { value: next, duration: 0.9, ease: "power3.out", onUpdate: () => write(counter.value) });
    return () => {
      tween.kill();
      write(next);
    };
  }, [calculation.total, locale]);

  function validate(current: number): Errors {
    const found: Errors = {};
    if (current === 0) {
      if (!details.event) found.event = t.configurator.errors.event;
      if (!parseIsoDate(details.date) || details.date < minDate) found.date = t.configurator.errors.date;
      if (!isMoroccanCity(details.city)) found.city = t.configurator.errors.city;
      if (details.duration < 0 || details.duration > MAX_DURATION_HOURS)
        found.duration = fill(t.configurator.errors.duration, { max: MAX_DURATION_HOURS });
      if (details.guests !== 0 && (!Number.isInteger(details.guests) || details.guests < 1 || details.guests > MAX_PARTICIPANTS))
        found.guests = fill(t.configurator.errors.guests, { max: number(MAX_PARTICIPANTS) });
    }
    if (
      current === 2 &&
      (!Number.isInteger(details.rentalDays) || details.rentalDays < 1 || details.rentalDays > MAX_RENTAL_DAYS)
    )
      found.rentalDays = fill(t.configurator.errors.rentalDays, { max: MAX_RENTAL_DAYS });
    if (current === 3 && (details.budget < 0 || details.budget > 1e9)) found.budget = t.configurator.errors.budget;
    return found;
  }

  async function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(step);
    setErrors(found);
    if (Object.keys(found).length) {
      setError(t.common.missing);
      return;
    }
    setError("");
    if (step < steps.length - 1) return goTo(step + 1);
    // Dernier contrôle de toutes les étapes, au cas où l'on y serait revenu.
    for (const index of [0, 2, 3]) {
      const missing = validate(index);
      if (Object.keys(missing).length) {
        setQuote((q) => ({ ...q, step: index }));
        setErrors(missing);
        setError(t.common.missing);
        return;
      }
    }
    if (!lead) return;
    setBusy(true);
    setProgress("");
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Locale": locale },
        body: JSON.stringify({
          kind: "quote",
          ...details,
          name: contact.name,
          company: contact.company,
          phone: contact.phone,
          email: contact.email,
          contactMethod: contact.contactMethod,
          consent: true,
          website: "",
          startedAt,
          subject: "",
          basket,
          attachments: files.length,
          callbackId: lead.id,
          token: lead.token,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      // La demande est enregistrée : les fichiers suivent, un par un. Un échec
      // n’annule pas la demande, il est signalé sur le devis estimatif.
      const sent: SentAttachment[] = [];
      for (const [index, file] of files.entries()) {
        setProgress(fill(t.configurator.uploading, { index: index + 1, total: files.length }));
        sent.push(await uploadAttachment(file, { id: result.id, token: lead.token }, locale));
      }
      const sentBasket: Basket = basket;
      setQuote((q) => ({
        ...q,
        phase: "done",
        step: 0,
        files: [],
        result: {
          id: result.id,
          reference: result.reference ?? lead.reference,
          sentAt: new Date().toISOString(),
          estimate: result.estimate ?? calculation.total,
          hasUnpriced: result.hasUnpriced ?? calculation.hasUnpriced,
          lines: calculation.lines,
          contact: q.contact,
          details: q.details,
          basket: sentBasket,
          attachments: sent,
          emailed: result.emailed === true,
        },
      }));
      setBasket({ services: [], products: [] });
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : t.configurator.errors.failed);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  /* --- Panier ----------------------------------------------------------- */
  const toggleService = (id: string) =>
    setBasket({
      ...basket,
      services: basket.services.includes(id) ? basket.services.filter((x) => x !== id) : [...basket.services, id],
    });
  const quantity = (id: string, variant: string) =>
    basket.products.find((p) => p.id === id && p.variant === variant)?.quantity ?? 0;
  const setQuantity = (id: string, variant: string, value: number) => {
    const amount = Math.max(0, Math.min(1000, Math.round(value) || 0));
    const exists = basket.products.some((p) => p.id === id && p.variant === variant);
    const products = exists
      ? basket.products
          .map((p) => (p.id === id && p.variant === variant ? { ...p, quantity: amount } : p))
          .filter((p) => p.quantity > 0)
      : amount > 0
        ? [...basket.products, { id, variant, quantity: amount }]
        : basket.products;
    setBasket({ ...basket, products });
  };

  /* --- Pièces jointes ---------------------------------------------------- */
  function addFiles(list: File[]) {
    const problems: string[] = [];
    const accepted = list.filter((file) => {
      const problem = attachmentProblem(file, locale);
      if (problem) problems.push(problem);
      return !problem;
    });
    const room = Math.max(0, MAX_ATTACHMENTS - files.length);
    if (accepted.length > room)
      problems.push(fill(t.configurator.errors.tooMany, { max: MAX_ATTACHMENTS, count: accepted.length - room }));
    setQuote((q) => ({ ...q, files: [...q.files, ...accepted.slice(0, room)] }));
    setErrors((current) => ({ ...current, files: problems.join(" ") || undefined }));
  }
  const removeFile = (index: number) => {
    setQuote((q) => ({ ...q, files: q.files.filter((_, i) => i !== index) }));
    setErrors((current) => ({ ...current, files: undefined }));
  };

  const eventDate = parseIsoDate(details.date);
  // Coordonnées : saisies au premier formulaire, elles ne se modifient pas ici.
  const r = t.configurator.recap;
  const recap: [term: string, value: string, step: number | null][] = [
    [r.event, label(details.event), 0],
    [
      r.date,
      `${eventDate ? longDate(eventDate) : r.toDefine}${details.duration ? ` · ${hoursLabel(details.duration, locale)}` : ""}`,
      0,
    ],
    [r.place, [details.city || r.toDefine, details.address].filter(Boolean).join(", "), 0],
    [r.participants, details.guests ? participantsLabel(details.guests, locale) : r.toSpecify, 0],
    [r.services, basket.services.map(label).join(", ") || r.noServices, 1],
    [
      r.equipment,
      basket.products.length
        ? `${basket.products.map((p) => `${label(p.id)}${p.variant ? ` ${optionLabel(p.id, p.variant)}` : ""} × ${p.quantity}`).join(", ")} · ${daysLabel(details.rentalDays, locale)}`
        : r.noEquipment,
      2,
    ],
    [r.budget, details.budget ? money(details.budget, locale) : r.notSpecified, 3],
    [r.description, details.message || r.noDescription, 3],
    [r.attachments, files.length ? files.map((file) => file.name).join(", ") : r.noAttachments, 3],
    [
      r.contact,
      [
        contact.name,
        contact.company,
        contact.phone,
        contact.email,
        fill(r.contactWay, { method: contactMethodLabel(locale, contact.contactMethod) }),
      ]
        .filter(Boolean)
        .join(" · "),
      null,
    ],
  ];

  const shownParticipants = Math.min(PARTICIPANTS.max, Math.max(PARTICIPANTS.min, details.guests || PARTICIPANTS.min));

  return (
    <div className={s.configurator} ref={panel}>
      <div className={s.main}>
        <ol className={s.steps} style={{ ["--progress" as string]: step / (steps.length - 1) }}>
          {steps.map((title, index) => (
            <li key={title} className={cx(index < step && s.passed, index === step && s.here)}>
              <button
                type="button"
                disabled={index > step}
                onClick={() => goTo(index)}
                aria-current={index === step ? "step" : undefined}
              >
                <span>{index < step ? "✓" : String(index + 1).padStart(2, "0")}</span>
                <b>{title}</b>
              </button>
            </li>
          ))}
        </ol>

        <form className={s.stepForm} onSubmit={next} noValidate>
          <h3 ref={stepTitle} tabIndex={-1} className={s.stepTitle}>
            <small>{fill(t.configurator.step, { step: step + 1, total: steps.length })}</small>
            {steps[step]}
          </h3>

          <div className={s.stepBody} key={step}>
            {step === 0 && (
              <>
                <Select
                  label={t.configurator.event}
                  required
                  searchable
                  options={options("events").map((e) => ({ value: e.id, label: e.title }))}
                  value={details.event}
                  error={errors.event}
                  onChange={(value) => setDetails({ event: value })}
                />
                <div className={s.grid2}>
                  <DatePicker
                    label={t.configurator.date}
                    name="date"
                    required
                    min={minDate}
                    value={details.date}
                    error={errors.date}
                    onChange={(value) => setDetails({ date: value })}
                  />
                  <NumberInput
                    label={t.configurator.duration}
                    name="duration"
                    min={1}
                    max={MAX_DURATION_HOURS}
                    decimals={1}
                    suffix={t.configurator.hours}
                    placeholder={t.configurator.durationPlaceholder}
                    value={details.duration || null}
                    error={errors.duration}
                    onChange={(duration) => setDetails({ duration: duration ?? 0 })}
                  />
                </div>
                <div className={s.grid2}>
                  <Select
                    label={t.configurator.city}
                    name="city"
                    required
                    searchable
                    placeholder={t.configurator.cityPlaceholder}
                    emptyText={t.configurator.cityEmpty}
                    options={CITY_OPTIONS}
                    value={details.city}
                    error={errors.city}
                    onChange={(value) => setDetails({ city: value })}
                  />
                  <Input
                    label={t.configurator.place}
                    maxLength={250}
                    autoComplete="street-address"
                    placeholder={t.configurator.placePlaceholder}
                    value={details.address}
                    onChange={(e) => setDetails({ address: e.target.value })}
                  />
                </div>
                <div className={s.guests}>
                  <div className={s.guestsHead}>
                    <span className={s.guestsLabel}>{t.configurator.participants}</span>
                    <output htmlFor="devis-participants devis-participants-curseur">
                      {details.guests ? number(details.guests) : "—"} <small>{t.configurator.participantsUnit}</small>
                    </output>
                  </div>
                  <input
                    id="devis-participants-curseur"
                    className={s.range}
                    type="range"
                    aria-label={t.configurator.participantsRange}
                    min={PARTICIPANTS.min}
                    max={PARTICIPANTS.max}
                    step={PARTICIPANTS.step}
                    value={shownParticipants}
                    style={{
                      ["--fill" as string]: details.guests
                        ? `${((shownParticipants - PARTICIPANTS.min) / (PARTICIPANTS.max - PARTICIPANTS.min)) * 100}%`
                        : "0%",
                    }}
                    onChange={(e) => setDetails({ guests: Number(e.target.value) })}
                  />
                  <NumberInput
                    id="devis-participants"
                    label={t.configurator.participantsExact}
                    min={1}
                    max={MAX_PARTICIPANTS}
                    value={details.guests || null}
                    error={errors.guests}
                    hint={fill(t.configurator.participantsHint, { max: number(PARTICIPANTS.max) })}
                    onChange={(guests) => setDetails({ guests: guests ?? 0 })}
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <p className={s.stepLede}>{t.configurator.servicesLede}</p>
                <div className={s.services}>
                  {options("services").map((service) => {
                    const on = basket.services.includes(service.id);
                    return (
                      <label key={service.id} className={cx(s.service, on && s.serviceOn)}>
                        <input type="checkbox" checked={on} onChange={() => toggleService(service.id)} />
                        <span className={s.serviceImage}>
                          <img src={service.image || "/eventheme.jpg"} alt="" loading="lazy" />
                        </span>
                        <span className={s.serviceText}>
                          <strong>{service.title}</strong>
                          <small>{serviceItems(service, t.serviceDetails).slice(0, 4).join(" · ")}</small>
                          <em>{priceLabel(service, locale)}</em>
                        </span>
                        <span className={s.tick} aria-hidden="true">
                          {on ? "✓" : "+"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <p className={s.stepLede}>{t.configurator.equipmentLede}</p>
                <div className={s.materialTools}>
                  <SearchInput
                    label={t.configurator.search}
                    placeholder={t.configurator.searchPlaceholder}
                    value={search}
                    onChange={setSearch}
                  />
                  {categoryOptions.length > 1 && (
                    <Select
                      label={t.configurator.category}
                      hideLabel
                      options={[
                        { value: "", label: t.configurator.allCategories },
                        ...categoryOptions.map((item) => ({ value: item.id, label: item.title })),
                      ]}
                      value={category}
                      onChange={setCategory}
                    />
                  )}
                </div>
                <div className={s.products}>
                  {shownProducts.map((product) => {
                    const variant = variants[product.id] ?? product.variants?.[0]?.name ?? "";
                    const count = quantity(product.id, variant);
                    return (
                      <article key={product.id} className={cx(s.product, count > 0 && s.productOn)}>
                        <div className={s.productImage}>
                          <img src={product.image || "/eventheme.jpg"} alt="" loading="lazy" />
                          {product.demo && <span>{t.common.example}</span>}
                        </div>
                        <div className={s.productBody}>
                          <small>{categoryTrail(entries, product)}</small>
                          <strong>{product.title}</strong>
                          <em>
                            {priceLabel(
                              { ...product, price: product.variants?.find((v) => v.name === variant)?.price ?? product.price },
                              locale,
                            )}
                          </em>
                          {!!product.variants?.length && (
                            <div className={s.variants} role="group" aria-label={fill(t.configurator.variant, { title: product.title })}>
                              {product.variants.map((v) => (
                                <button
                                  key={v.name}
                                  type="button"
                                  aria-pressed={variant === v.name}
                                  onClick={() => setVariants((all) => ({ ...all, [product.id]: v.name }))}
                                >
                                  {v.label || v.name}
                                </button>
                              ))}
                            </div>
                          )}
                          <Stepper
                            label={`${product.title}${variant ? ` ${optionLabel(product.id, variant)}` : ""}`}
                            value={count}
                            onChange={(value) => setQuantity(product.id, variant, value)}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
                {!shownProducts.length && (
                  <p className={s.caption}>{t.configurator.noMatch}</p>
                )}
                {basket.products.length > 0 && (
                  <div className={s.selection}>
                    <h4>{fill(t.configurator.selection, { count: articles })}</h4>
                    <ul>
                      {basket.products.map((item) => (
                        <li key={`${item.id}-${item.variant}`}>
                          <span>
                            {label(item.id)}
                            {item.variant && <small> · {optionLabel(item.id, item.variant)}</small>}
                          </span>
                          <Stepper
                            label={`${label(item.id)} ${optionLabel(item.id, item.variant)}`}
                            value={item.quantity}
                            onChange={(value) => setQuantity(item.id, item.variant, value)}
                          />
                          <button
                            type="button"
                            className={s.remove}
                            aria-label={fill(t.configurator.remove, { title: label(item.id) })}
                            onClick={() => setQuantity(item.id, item.variant, 0)}
                          >
                            <CloseIcon />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {basket.products.length > 0 && (
                  <NumberInput
                    label={t.configurator.rentalDays}
                    name="rentalDays"
                    min={1}
                    max={MAX_RENTAL_DAYS}
                    decimals={0}
                    suffix={t.configurator.rentalUnit}
                    value={details.rentalDays}
                    error={errors.rentalDays}
                    hint={t.configurator.rentalHint}
                    onChange={(rentalDays) => setDetails({ rentalDays: rentalDays ?? 1 })}
                  />
                )}
                <Button href={href("equipment")} variant="link" icon={<ArrowUpRightIcon />}>
                  {t.configurator.catalogue}
                </Button>
              </>
            )}

            {step === 3 && (
              <>
                <p className={s.stepLede}>{t.configurator.detailsLede}</p>
                <Textarea
                  label={t.configurator.description}
                  rows={5}
                  maxLength={5000}
                  placeholder={t.configurator.descriptionPlaceholder}
                  value={details.message}
                  onChange={(e) => setDetails({ message: e.target.value })}
                />
                <NumberInput
                  label={t.configurator.budget}
                  name="budget"
                  min={0}
                  step={1000}
                  decimals={0}
                  suffix="MAD"
                  placeholder={t.configurator.budgetPlaceholder}
                  value={details.budget || null}
                  error={errors.budget}
                  hint={t.configurator.budgetHint}
                  onChange={(budget) => setDetails({ budget: budget ?? 0 })}
                />
                <FileInput
                  label={t.configurator.attachments}
                  hint={fill(t.configurator.attachmentsHint, { limits: attachmentHint(locale) })}
                  multiple
                  accept={ATTACHMENT_ACCEPT}
                  error={errors.files}
                  disabled={files.length >= MAX_ATTACHMENTS}
                  onFiles={addFiles}
                />
                {files.length > 0 && (
                  <ul className={s.files} aria-label={t.configurator.selectedFiles}>
                    {files.map((file, index) => (
                      <li key={`${file.name}-${index}`}>
                        <span>
                          {file.name}
                          <small> · {sizeLabel(file.size, locale)}</small>
                        </span>
                        <button
                          type="button"
                          className={s.remove}
                          aria-label={fill(t.configurator.remove, { title: file.name })}
                          onClick={() => removeFile(index)}
                        >
                          <CloseIcon />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {step === 4 && (
              <dl className={s.recap}>
                {recap.map(([term, value, target]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{value}</dd>
                    {target != null && (
                      <button type="button" onClick={() => goTo(target)}>
                        {r.edit}<span className="visually-hidden"> : {term}</span>
                      </button>
                    )}
                  </div>
                ))}
              </dl>
            )}
          </div>

          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}
          <div className={s.stepActions}>
            {step > 0 && (
              <Button variant="link" onClick={() => goTo(step - 1)} disabled={busy}>
                {t.configurator.previous}
              </Button>
            )}
            <Button type="submit" icon={<ArrowUpRightIcon />} loading={busy} magnetic={step === steps.length - 1}>
              {busy ? progress || t.common.sending : step === steps.length - 1 ? t.configurator.send : t.configurator.continue}
            </Button>
          </div>
          {busy && progress && (
            <p className={s.caption} role="status">
              {progress}
            </p>
          )}
          {step === steps.length - 1 && <p className={s.caption}>{t.configurator.terms}</p>}
          {local && <p className={s.demo}>{t.configurator.localNote}</p>}
        </form>
      </div>

      <aside className={s.live} aria-label={t.configurator.live.label}>
        <span className={s.liveKicker}>{t.configurator.live.kicker}</span>
        <h3>{details.event ? label(details.event) : t.configurator.live.yourEvent}</h3>
        <p className={s.liveMeta}>
          {[eventDate && longDate(eventDate), details.city, details.guests > 0 && participantsLabel(details.guests, locale)]
            .filter(Boolean)
            .join(" · ") || t.configurator.live.toSpecify}
        </p>
        <div className={s.total}>
          <small>{calculation.hasUnpriced && calculation.total > 0 ? t.configurator.live.priced : t.configurator.live.indicative}</small>
          <span ref={total} className={s.totalValue} aria-hidden="true" />
          <span className="visually-hidden" aria-live="polite">
            {calculation.total > 0 ? money(calculation.total, locale) : t.format.onRequest}
          </span>
        </div>
        <ul className={s.lines}>
          {calculation.lines.map((line, index) => (
            <li key={`${line.kind}-${line.label}-${index}`}>
              <span>
                {lineLabel(line, locale)}
                {line.quantity > 1 && <small> × {line.quantity}</small>}
              </span>
              <b>{lineAmount(line, locale)}</b>
            </li>
          ))}
          {!calculation.lines.length && <li className={s.linesEmpty}>{t.configurator.live.empty}</li>}
        </ul>
        <p className={s.liveNote}>{calculation.hasUnpriced ? t.configurator.live.onRequestNote : t.configurator.live.note}</p>
        <p className={s.liveCount}>
          {fill(t.configurator.live.count, { services: basket.services.length, articles })}
          {files.length > 0 && fill(t.configurator.live.files, { count: files.length })}
        </p>
      </aside>

      <div className={s.mobileBar} aria-hidden="true">
        <span>{fill(t.configurator.mobileStep, { step: step + 1, total: steps.length })}</span>
        <b>{calculation.total > 0 ? money(calculation.total, locale) : t.format.onRequest}</b>
      </div>
    </div>
  );
}

/** Quantité réglable : −, valeur saisissable, +. */
function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const { t } = useEventheme();
  const name = fill(t.configurator.quantity, { label });
  return (
    <div className={s.stepper} role="group" aria-label={name}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 0} aria-label={t.configurator.removeOne}>
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={1000}
        value={value}
        aria-label={name}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= 1000} aria-label={t.configurator.addOne}>
        +
      </button>
    </div>
  );
}
