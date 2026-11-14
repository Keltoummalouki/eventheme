"use client";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { ArrowUpRightIcon, CheckIcon } from "@/components/ui/icons";
import { imagery, serviceItems } from "@/data/eventheme";
import { moroccanCities } from "@/data/moroccanCities";
import { categoryTrail, inCategory, topCategories, usedCategories } from "@/lib/eventheme/catalogue";
import { cityTitle } from "@/lib/eventheme/structured";
import { findSocial, priceLabel, type Entry } from "@/lib/eventheme/types";
import { fill } from "@/lib/i18n";
import { slugify } from "@/lib/slug";
import { useEventheme } from "./Provider";
import { CTA } from "./Shell";
import s from "./Eventheme.module.css";

/**
 * Pages de référencement (cahier des charges §10) : une page par service et
 * une page par ville où EVENTHEMES intervient. Tout leur contenu vient de
 * l’administration ; les textes communs, des dictionnaires.
 */

/** Fil d’Ariane visible ; sa version structurée est ajoutée par la route. */
export function Breadcrumbs({ items }: { items: readonly (readonly [label: string, href?: string])[] }) {
  const { t } = useEventheme();
  return (
    <nav aria-label={t.breadcrumb.label} className={s.breadcrumb}>
      <ol>
        {items.map(([label, target], index) =>
          target && index < items.length - 1 ? (
            <li key={index}>
              <Link href={target}>{label}</Link>
            </li>
          ) : (
            <li key={index} aria-current="page">
              {label}
            </li>
          ),
        )}
      </ol>
    </nav>
  );
}

/** Liens vers d’autres pages (services, villes) : une grille de cartes sobres. */
function LinkGrid({ items }: { items: { id: string; href: string; eyebrow?: string; title: string; text?: string }[] }) {
  return (
    <ul className={s.linkGrid}>
      {items.map((item) => (
        <li key={item.id}>
          <Link href={item.href}>
            {item.eyebrow && <span className={s.eyebrow}>{item.eyebrow}</span>}
            <strong>{item.title}</strong>
            {item.text && <span>{item.text}</span>}
            <ArrowUpRightIcon className={s.linkGridArrow} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Adresse du catalogue filtré sur une catégorie. */
function useCatalogueLink() {
  const { locale, href } = useEventheme();
  return (category: string) => `${href("equipment")}?${locale === "fr" ? "categorie" : "category"}=${encodeURIComponent(category)}`;
}

/** Page d’un service : prestations, matériel associé, autres expertises, villes desservies. */
export function ServiceDetail({ entry }: { entry: Entry }) {
  const { entries, add, basket, setBasket, locale, t, href } = useEventheme();
  const catalogue = useCatalogueLink();
  const chosen = basket.services.includes(entry.id);
  const items = serviceItems(entry, t.serviceDetails);
  const whatsapp = findSocial(entries, "whatsapp");
  const categories = (entry.related ?? [])
    .map((id) => entries.find((item) => item.id === id && item.kind === "categories"))
    .filter((item): item is Entry => Boolean(item));
  const products = entries
    .filter((item) => item.kind === "products" && categories.some((category) => inCategory(item, category.id)))
    .slice(0, 3);
  const others = entries.filter((item) => item.kind === "services" && item.id !== entry.id);
  const cities = entries.filter((item) => item.kind === "cities");
  const toggle = () =>
    chosen ? setBasket({ ...basket, services: basket.services.filter((id) => id !== entry.id) }) : add(entry);
  return (
    <>
      <section className={s.section}>
        <Breadcrumbs items={[[t.nav.home, href("home")], [t.nav.services, href("services")], [entry.title]]} />
        <div className={s.detail}>
          <div>
            <span className={s.eyebrow}>{entry.category || t.service.eyebrow}</span>
            <h1>{entry.title}</h1>
            <p>{entry.description}</p>
            {items.length > 0 && (
              <>
                <h2 className={s.factsTitle}>{t.service.items}</h2>
                <ul className={s.specList}>
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}
            <span className={s.price}>{priceLabel(entry, locale)}</span>
            <div className={s.detailActions}>
              <Button
                variant={chosen ? "outline" : "fill"}
                icon={chosen ? <CheckIcon /> : "+"}
                aria-pressed={chosen}
                className={s.addButton}
                onClick={toggle}
              >
                {chosen ? t.common.inQuote : t.common.addToQuote}
              </Button>
              <Button href={href("quote")} variant="link" icon={<ArrowUpRightIcon />}>
                {t.common.requestQuote}
              </Button>
              {whatsapp?.url && (
                <Button href={whatsapp.url} target="_blank" variant="link" icon={<ArrowUpRightIcon />}>
                  {t.common.whatsapp}
                </Button>
              )}
            </div>
            {cities.length > 0 && (
              <p className={s.caption}>
                {t.service.areas}{" "}
                {cities.map((city, index) => (
                  <span key={city.id}>
                    {index > 0 && ", "}
                    <Link href={href("cities", city.id)} className={s.inlineLink}>
                      {city.title}
                    </Link>
                  </span>
                ))}
                .
              </p>
            )}
          </div>
          <figure className={s.pageVisual}>
            <img src={entry.image || imagery.stageGlow} alt={entry.title} />
            <figcaption>{t.common.illustration}</figcaption>
          </figure>
        </div>
      </section>
      {categories.length > 0 && (
        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t.service.equipment}</h2>
          <p className={s.sectionIntro}>{t.service.equipmentIntro}</p>
          <div className={s.filters}>
            {categories.map((category) => (
              <Button key={category.id} href={catalogue(category.id)} variant="outline" size="sm" icon={<ArrowUpRightIcon />}>
                {fill(t.service.allEquipment, { category: category.title })}
              </Button>
            ))}
          </div>
          {products.length > 0 && (
            <div className={s.catalogGrid}>
              {products.map((product) => (
                <article key={product.id} className={s.productCard}>
                  <Link href={href("equipment", product.id)} className={s.productImage}>
                    <img src={product.image || "/eventheme.jpg"} alt={product.title} loading="lazy" />
                    {product.demo && <span className={s.imageTag}>{t.catalog.exampleTag}</span>}
                  </Link>
                  <div className={s.productBody}>
                    <span className={s.eyebrow}>{categoryTrail(entries, product)}</span>
                    <Link href={href("equipment", product.id)}>
                      <h3>{product.title}</h3>
                    </Link>
                    <div className={s.productActions}>
                      <span>{priceLabel(product, locale)}</span>
                      <Button
                        variant="link"
                        size="sm"
                        icon="+"
                        disabled={product.available === false}
                        onClick={() => add(product)}
                      >
                        {product.available === false ? t.common.unavailable : t.common.addToQuote}
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {others.length > 0 && (
        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t.service.others}</h2>
          <LinkGrid
            items={others.map((item) => ({
              id: item.id,
              href: href("services", item.id),
              eyebrow: item.category,
              title: item.title,
            }))}
          />
        </section>
      )}
      <CTA />
    </>
  );
}

/** Zones d’intervention : la liste des villes publiées. */
export function Cities() {
  const { entries, t, href } = useEventheme();
  const page = entries.find((item) => item.id === "cities-page");
  const cities = entries.filter((item) => item.kind === "cities");
  return (
    <>
      <section className={s.pageIntro}>
        <span className={s.eyebrow}>{t.cities.eyebrow}</span>
        <h1>{page?.title || t.pages.cities.title}</h1>
        <p>{page?.description || t.cities.intro}</p>
      </section>
      <section className={s.section}>
        <LinkGrid
          items={cities.map((city) => ({
            id: city.id,
            href: href("cities", city.id),
            title: city.title,
            text: city.subtitle?.trim() || fill(t.cities.title, { city: city.title }),
          }))}
        />
      </section>
      <CTA />
    </>
  );
}

/** Page d’une ville : son texte propre, les expertises, le matériel par catégorie, le devis avec la ville préremplie. */
export function CityPage({ entry }: { entry: Entry }) {
  const { entries, locale, t, href } = useEventheme();
  const catalogue = useCatalogueLink();
  const title = cityTitle(locale, entry);
  const whatsapp = findSocial(entries, "whatsapp");
  const services = entries.filter((item) => item.kind === "services");
  const products = entries.filter((item) => item.kind === "products");
  const categories = usedCategories(topCategories(entries), products);
  const others = entries.filter((item) => item.kind === "cities" && item.id !== entry.id);
  // La ville du devis est choisie dans la liste des villes du Maroc : on la retrouve par son identifiant.
  const known = moroccanCities.find((name) => slugify(name) === entry.id);
  const quote = known
    ? `${href("quote")}?${locale === "fr" ? "ville" : "city"}=${encodeURIComponent(known)}`
    : href("quote");
  return (
    <>
      <section className={s.section}>
        <Breadcrumbs items={[[t.nav.home, href("home")], [t.pages.cities.title, href("cities")], [entry.title]]} />
        <div className={s.detail}>
          <div>
            <span className={s.eyebrow}>{t.cities.eyebrow}</span>
            <h1>{title}</h1>
            <p className={s.preserveLines}>{entry.description}</p>
            <div className={s.detailActions}>
              <Button href={quote} icon={<ArrowUpRightIcon />}>
                {fill(t.cities.quote, { city: entry.title })}
              </Button>
              {whatsapp?.url && (
                <Button href={whatsapp.url} target="_blank" variant="link" icon={<ArrowUpRightIcon />}>
                  {t.common.whatsapp}
                </Button>
              )}
            </div>
          </div>
          <figure className={s.pageVisual}>
            <img src={entry.image || imagery.stageTruss} alt={title} />
            {!entry.image && <figcaption>{t.common.illustration}</figcaption>}
          </figure>
        </div>
      </section>
      {services.length > 0 && (
        <section className={s.section}>
          <h2 className={s.sectionTitle}>{fill(t.cities.services, { city: entry.title })}</h2>
          <p className={s.sectionIntro}>{t.cities.servicesIntro}</p>
          <LinkGrid
            items={services.map((item) => ({
              id: item.id,
              href: href("services", item.id),
              eyebrow: item.category,
              title: item.title,
            }))}
          />
        </section>
      )}
      {categories.length > 0 && (
        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t.cities.equipment}</h2>
          <div className={s.filters}>
            {categories.map((category) => (
              <Button key={category.id} href={catalogue(category.id)} variant="outline" size="sm">
                {category.title}
              </Button>
            ))}
          </div>
        </section>
      )}
      {others.length > 0 && (
        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t.cities.others}</h2>
          <LinkGrid
            items={others.map((city) => ({ id: city.id, href: href("cities", city.id), title: city.title }))}
          />
        </section>
      )}
      <CTA />
    </>
  );
}
