"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "@/components/eventheme/Eventheme.module.css";
import { brand } from "@/data/eventheme";
import { dictionaries } from "@/data/locales";
import { pathFor, routeOf } from "@/lib/i18n";

/** Erreur inattendue d’une page : la langue se lit dans l’adresse, sans dépendre du reste de l’interface. */
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { locale } = routeOf(usePathname());
  const t = dictionaries[locale].error;
  return (
    <main className={`${s.site} ${s.success}`}>
      <span className={s.eyebrow}>{brand.name}</span>
      <h1>{t.title}</h1>
      <p>{t.text}</p>
      <div className={s.actions}>
        <button className={s.button} onClick={reset}>
          {t.retry}
        </button>
        <Link className={s.textLink} href={pathFor(locale, "home")}>
          {t.home}
        </Link>
      </div>
    </main>
  );
}
