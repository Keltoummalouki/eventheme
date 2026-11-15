"use client";
import Link from "next/link";
import { useState } from "react";
import { useEventheme } from "./Provider";
import { CTA } from "./Shell";
import Button from "@/components/ui/Button";
import {
  Checkbox,
  NumberInput,
  SearchInput,
  Select,
} from "@/components/ui/form";
import { ArrowUpRightIcon, CheckIcon } from "@/components/ui/icons";
import ProcessTimeline from "@/components/sections/ProcessTimeline";
import { brand, serviceItems } from "@/data/eventheme";
import { projectCategoryLabel } from "@/data/locales";
import { fill } from "@/lib/i18n";
import { cx } from "@/lib/cx";
import {
  brandsOf,
  categoryTrail,
  childCategories,
  inCategory,
  matchesSearch,
  productIdentity,
  topCategories,
  usedCategories,
} from "@/lib/eventheme/catalogue";
import {
  centimetres,
  findSocial,
  priceLabel,
  type Entry,
} from "@/lib/eventheme/types";
import s from "./Eventheme.module.css";
export function PageIntro({ id, eyebrow }: { id: string; eyebrow: string }) {
  const { entries } = useEventheme();
  const entry = entries.find((e) => e.id === id);
  return (
    <section className={s.pageIntro}>
      <span className={s.eyebrow}>{eyebrow}</span>
      <h1>{entry?.title}</h1>
      <p>{entry?.description}</p>
    </section>
  );
}
export function Catalog({
  projects = false,
  initialCategory = "",
}: {
  projects?: boolean;
  /** Catégorie présélectionnée par l’adresse : /materiel?categorie=… */
  initialCategory?: string;
}) {
  const { entries, add, locale, t, href } = useEventheme();
  const items = entries.filter(
    (e) => e.kind === (projects ? "projects" : "products"),
  );
  const projectLabel = (value?: string) => projectCategoryLabel(locale, value);
  // Matériel : catégories gérées dans l’administration. Réalisations : classement par type d’événement.
  const categories = projects
    ? [...new Set(items.map((e) => e.category).filter((c): c is string => Boolean(c)))].map((title) => ({
        value: title,
        label: projectLabel(title),
      }))
    : usedCategories(topCategories(entries), items).map((c) => ({ value: c.id, label: c.title }));
  const [category, setCategory] = useState(() =>
    categories.some((c) => c.value === initialCategory) ? initialCategory : "",
  );
  const [subcategory, setSubcategory] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [search, setSearch] = useState("");
  const [color, setColor] = useState("");
  const [available, setAvailable] = useState(false);
  const [max, setMax] = useState<number | null>(null);
  const subcategories =
    !projects && category ? usedCategories(childCategories(entries, category), items) : [];
  const brands = projects ? [] : brandsOf(items);
  const colors = projects
    ? []
    : [...new Set(items.map((e) => e.color).filter((c): c is string => Boolean(c)))];
  const priced = !projects && items.some((e) => e.price != null && e.pricing !== "request");
  const filtered = items.filter(
    (e) =>
      (!category || (projects ? e.category === category : inCategory(e, category))) &&
      (!subcategory || e.subcategory === subcategory) &&
      (!brandFilter || e.brand === brandFilter) &&
      matchesSearch(entries, e, search) &&
      (!color || e.color === color) &&
      (!available || e.available !== false) &&
      (max === null || (e.price != null && e.price <= max)),
  );
  const chooseCategory = (value: string) => {
    setCategory(value);
    setSubcategory("");
  };
  const reset = () => {
    chooseCategory("");
    setBrandFilter("");
    setColor("");
    setSearch("");
    setMax(null);
    setAvailable(false);
  };
  const page = projects ? "projects" : "equipment";
  return (
    <>
      <PageIntro
        id={projects ? "projects-page" : "location-page"}
        eyebrow={projects ? t.catalog.projectsEyebrow : t.catalog.equipmentEyebrow}
      />
      <section className={s.section}>
        {categories.length > 1 && (
          <div
            className={s.filters}
            role="group"
            aria-label={projects ? t.catalog.byEventType : t.catalog.byCategory}
          >
            {[{ value: "", label: projects ? t.catalog.allProjects : t.catalog.allEquipment }, ...categories].map((c) => (
              <Button
                key={c.value || "tous"}
                variant="ghost"
                size="sm"
                aria-pressed={category === c.value}
                onClick={() => chooseCategory(c.value)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        )}
        {subcategories.length > 0 && (
          <div className={cx(s.filters, s.subfilters)} role="group" aria-label={t.catalog.byType}>
            {[{ id: "", title: t.catalog.allTypes }, ...subcategories].map((c) => (
              <Button
                key={c.id || "tous"}
                variant="ghost"
                size="sm"
                aria-pressed={subcategory === c.id}
                onClick={() => setSubcategory(c.id)}
              >
                {c.title}
              </Button>
            ))}
          </div>
        )}
        <div className={s.catalogTools}>
          <SearchInput
            label={projects ? t.catalog.searchProjects : t.catalog.searchEquipment}
            className={s.toolSearch}
            placeholder={projects ? t.catalog.searchProjectsPlaceholder : t.catalog.searchEquipmentPlaceholder}
            value={search}
            onChange={setSearch}
          />
          {brands.length > 0 && (
            <Select
              label={t.catalog.byBrand}
              hideLabel
              className={s.toolField}
              options={[
                { value: "", label: t.catalog.allBrands },
                ...brands.map((b) => ({ value: b, label: b })),
              ]}
              value={brandFilter}
              onChange={setBrandFilter}
            />
          )}
          {colors.length > 1 && (
            <Select
              label={t.catalog.byColor}
              hideLabel
              className={s.toolField}
              options={[
                { value: "", label: t.catalog.allColors },
                ...colors.map((c) => ({ value: c, label: c })),
              ]}
              value={color}
              onChange={setColor}
            />
          )}
          {priced && (
            <NumberInput
              label={t.catalog.maxPrice}
              hideLabel
              className={s.toolField}
              min={0}
              step={100}
              controls={false}
              placeholder={t.catalog.maxPricePlaceholder}
              suffix="MAD"
              value={max}
              onChange={setMax}
            />
          )}
          {!projects && (
            <Checkbox
              className={s.check}
              checked={available}
              onChange={setAvailable}
            >
              {t.catalog.available}
            </Checkbox>
          )}
        </div>
        <p className={s.caption}>
          {fill(projects ? t.catalog.countProjects : t.catalog.countEquipment, { count: filtered.length })} ·{" "}
          {fill(t.catalog.demoNote, { brand: brand.name })}
        </p>
        <div className={s.catalogGrid}>
          {filtered.map((item) => (
            <article key={item.id} className={s.productCard}>
              <Link href={href(page, item.id)} className={s.productImage}>
                <img
                  src={item.image || "/eventheme.jpg"}
                  alt={item.title}
                  loading="lazy"
                />
                {item.demo && (
                  <span className={s.imageTag}>
                    {projects ? t.catalog.inspirationTag : t.catalog.exampleTag}
                  </span>
                )}
              </Link>
              <div className={s.productBody}>
                <span className={s.eyebrow}>
                  {projects ? projectLabel(item.category) : categoryTrail(entries, item)}
                </span>
                <Link href={href(page, item.id)}>
                  <h3>{item.title}</h3>
                </Link>
                {!projects && (productIdentity(item) || item.reference) && (
                  <span className={s.identity}>
                    {[productIdentity(item), item.reference && fill(t.catalog.reference, { reference: item.reference })]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
                <p>{item.description}</p>
                <div className={s.productActions}>
                  {!projects && (
                    <>
                      <span>{priceLabel(item, locale)}</span>
                      <Button
                        variant="link"
                        size="sm"
                        icon="+"
                        disabled={item.available === false}
                        onClick={() => add(item)}
                      >
                        {item.available === false
                          ? t.common.unavailable
                          : t.common.addToQuote}
                      </Button>
                    </>
                  )}
                  {projects && (
                    <Button
                      href={href("projects", item.id)}
                      variant="link"
                      size="sm"
                      icon={<ArrowUpRightIcon />}
                    >
                      {t.common.discover}
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
        {!filtered.length && (
          <div className={s.empty}>
            {t.catalog.empty}
            <Button variant="link" icon="→" onClick={reset}>
              {t.catalog.reset}
            </Button>
          </div>
        )}
      </section>
      <CTA />
    </>
  );
}
export function Services() {
  const { entries, add, basket, setBasket, locale, t, href } = useEventheme();
  return (
    <>
      <PageIntro id="services-page" eyebrow={t.servicesPage.eyebrow} />
      <section className={s.section}>
        {entries
          .filter((e) => e.kind === "services")
          .map((e, i) => {
            const chosen = basket.services.includes(e.id);
            return (
              <article className={s.serviceRow} key={e.id}>
                <img
                  src={e.image || "/eventheme.jpg"}
                  alt={e.title}
                  loading="lazy"
                />
                <div>
                  <span className={s.eyebrow}>
                    0{i + 1} — {e.category}
                  </span>
                  <h2>
                    <Link href={href("services", e.id)}>{e.title}</Link>
                  </h2>
                  <p>{e.description}</p>
                  {serviceItems(e, t.serviceDetails).length > 0 && (
                    <ul className={s.specList}>
                      {serviceItems(e, t.serviceDetails).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  <span className={s.price}>{priceLabel(e, locale)}</span>
                  <Button
                    variant={chosen ? "outline" : "fill"}
                    icon={chosen ? <CheckIcon /> : "+"}
                    aria-pressed={chosen}
                    className={s.addButton}
                    onClick={() =>
                      chosen
                        ? setBasket({
                            ...basket,
                            services: basket.services.filter(
                              (id) => id !== e.id,
                            ),
                          })
                        : add(e)
                    }
                  >
                    {chosen ? t.common.inQuote : t.common.addToQuote}
                  </Button>
                  <Button href={href("services", e.id)} variant="link" icon={<ArrowUpRightIcon />}>
                    {t.service.more}
                  </Button>
                </div>
              </article>
            );
          })}
      </section>
      <CTA />
    </>
  );
}
/**
 * À propos (cahier des charges §04 B) : présentation, valeurs, expertise
 * technique et méthodologie. Vision, mission et équipe attendent les textes et
 * visuels d’EVENTHEMES.
 */
export function About() {
  const { entries, t } = useEventheme();
  const about = entries.find((e) => e.id === "about");
  const values = entries.find((e) => e.id === "values");
  return (
    <>
      <PageIntro id="about" eyebrow={fill(t.about.eyebrow, { brand: brand.name })} />
      <section className={`${s.section} ${s.aboutSplit}`}>
        <img
          src={about?.image || "/eventheme.jpg"}
          alt={t.about.imageAlt}
        />
        <div>
          <span className={s.eyebrow}>{t.about.values}</span>
          <h2>{values?.title}</h2>
          <p>{values?.description}</p>
        </div>
      </section>
      <section className={s.section}>
        <span className={s.eyebrow}>{t.about.expertise}</span>
        <h2>{t.about.expertiseTitle}</h2>
        <div className={s.process}>
          {t.activities.map(([title, description], i) => (
            <div key={title}>
              <span>0{i + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>
      <ProcessTimeline />
      <CTA />
    </>
  );
}
/** « Puissance : 1 000 W » → ligne de tableau ; sinon, simple ligne de liste. */
function specRows(text?: string) {
  const lines = (text || "").split("\n").map((line) => line.trim()).filter(Boolean);
  const pairs = lines.map((line) => {
    const at = line.indexOf(":");
    return at > 0 && at < 60 ? [line.slice(0, at).trim(), line.slice(at + 1).trim()] as const : null;
  });
  return { lines, pairs: pairs.every(Boolean) ? (pairs as (readonly [string, string])[]) : null };
}
export function Detail({ entry }: { entry: Entry }) {
  const { add, entries, locale, t, href } = useEventheme();
  const [variant, setVariant] = useState(entry.variants?.[0]?.name || "");
  const [quantity, setQuantity] = useState<number | null>(1);
  const [zoom, setZoom] = useState(false);
  const [image, setImage] = useState(entry.image);
  const product = entry.kind === "products";
  const selectedVariant = entry.variants?.find((v) => v.name === variant);
  const length = selectedVariant?.length ?? entry.length;
  const width = selectedVariant?.width ?? entry.width;
  const whatsapp = findSocial(entries, "whatsapp");
  const specs = specRows(entry.specifications);
  // Fiche matériel : identité et dimensions avant les caractéristiques techniques.
  const facts: [string, string][] = product
    ? ([
        [t.detail.brand, entry.brand],
        [t.detail.model, entry.model],
        [t.detail.reference, entry.reference],
        [t.detail.color, entry.color],
        [t.detail.length, length != null ? centimetres(length, locale) : undefined],
        [t.detail.width, width != null ? centimetres(width, locale) : undefined],
      ].filter((row): row is [string, string] => Boolean(row[1])))
    : ([
        [t.detail.place, entry.location],
        [t.detail.year, entry.date],
      ].filter((row): row is [string, string] => Boolean(row[1])));
  const projectLabel = (value?: string) => projectCategoryLabel(locale, value);
  return (
    <section className={s.section}>
      <Button variant="link" href={href(product ? "equipment" : "projects")}>
        {product ? t.detail.backEquipment : t.detail.backProjects}
      </Button>
      <div className={s.detail}>
        <div>
          <button
            className={s.detailImage}
            onClick={() => setZoom(true)}
            aria-label={t.detail.zoom}
          >
            <img src={image || "/eventheme.jpg"} alt={entry.title} />
          </button>
          <div className={s.thumbnails}>
            {[entry.image, ...(entry.gallery || [])]
              .filter(Boolean)
              .map((url) => (
                <button
                  key={url}
                  onClick={() => setImage(url)}
                  aria-label={t.detail.show}
                >
                  <img src={url} alt={entry.title} />
                </button>
              ))}
          </div>
        </div>
        <div>
          <span className={s.eyebrow}>
            {product ? categoryTrail(entries, entry) : projectLabel(entry.category)}{" "}
            {entry.demo && t.detail.illustration}
          </span>
          <h1>{entry.title}</h1>
          <p>{entry.description}</p>
          {facts.length > 0 && (
            <dl className={s.facts}>
              {facts.map(([term, value]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>
                    {term === t.detail.color && entry.swatch && (
                      <span
                        className={s.swatchDot}
                        style={{ backgroundColor: entry.swatch }}
                        aria-hidden="true"
                      />
                    )}
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {specs.lines.length > 0 && (
            <>
              <h2 className={s.factsTitle}>
                {product ? t.detail.specs : t.detail.delivered}
              </h2>
              {specs.pairs ? (
                <dl className={s.facts}>
                  {specs.pairs.map(([term, value], index) => (
                    <div key={`${term}-${index}`}>
                      <dt>{term}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <ul className={s.specList}>
                  {specs.lines.map((line, index) => (
                    <li key={`${line}-${index}`}>{line}</li>
                  ))}
                </ul>
              )}
            </>
          )}
          {product && (
            <>
              <span className={s.price}>
                {priceLabel(
                  { ...entry, price: selectedVariant ? selectedVariant.price : entry.price },
                  locale,
                )}
              </span>
              <p className={s.availability}>
                {entry.available === false ? t.detail.unavailable : t.detail.availability}
              </p>
            </>
          )}
          <div className={s.detailActions}>
            {product && !!entry.variants?.length && (
              <Select
                label={t.detail.variant}
                className={s.variantField}
                options={entry.variants.map((v) => ({
                  value: v.name,
                  label: v.label || v.name,
                }))}
                value={variant}
                onChange={setVariant}
              />
            )}
            {product && entry.available !== false && (
              <NumberInput
                label={t.detail.quantity}
                className={s.variantField}
                min={1}
                max={1000}
                decimals={0}
                value={quantity}
                onChange={setQuantity}
              />
            )}
            {product && (
              <Button
                icon="+"
                disabled={entry.available === false}
                onClick={() => add(entry, variant, quantity ?? 1)}
              >
                {entry.available === false ? t.common.unavailable : t.common.addToQuote}
              </Button>
            )}
            {!product && (
              <Button href={href("quote")} icon={<ArrowUpRightIcon />}>
                {t.common.requestQuote}
              </Button>
            )}
            {whatsapp?.url && (
              <Button
                variant="link"
                href={whatsapp.url}
                target="_blank"
                rel="noreferrer"
                icon={<ArrowUpRightIcon />}
              >
                {t.common.whatsapp}
              </Button>
            )}
            {entry.video && (
              <Button
                variant="link"
                href={entry.video}
                target="_blank"
                rel="noreferrer"
                icon={<ArrowUpRightIcon />}
              >
                {t.detail.video}
              </Button>
            )}
          </div>
        </div>
      </div>
      {zoom && (
        <div
          className={s.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label={entry.title}
          onClick={() => setZoom(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setZoom(false);
          }}
        >
          <button
            autoFocus
            onClick={() => setZoom(false)}
            aria-label={t.detail.close}
          >
            ×
          </button>
          <img src={image || "/eventheme.jpg"} alt={entry.title} />
        </div>
      )}
    </section>
  );
}
export function Legal({ privacy = false }: { privacy?: boolean }) {
  const { entries, t } = useEventheme();
  const content = entries.find((e) => e.id === (privacy ? "privacy" : "legal"));
  return (
    <section className={`${s.section} ${s.legal}`}>
      <span className={s.eyebrow}>{brand.name}</span>
      <h1>{privacy ? t.legal.privacy : t.legal.legal}</h1>
      {content ? (
        <p>{content.description}</p>
      ) : (
        <>
          <p>{fill(t.legal.pending, { brand: brand.name })}</p>
          <p>{t.legal.demo}</p>
        </>
      )}
    </section>
  );
}
