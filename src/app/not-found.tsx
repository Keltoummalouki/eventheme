import Shell from "@/components/eventheme/Shell";
import Button from "@/components/ui/Button";
import s from "@/components/eventheme/Eventheme.module.css";
import { dictionaries } from "@/data/locales";
import { requestLocale } from "@/lib/eventheme/locale";
import { pathFor } from "@/lib/i18n";

/** Page introuvable, dans la langue de l’adresse demandée (/… ou /en/…). */
export default async function NotFound() {
  const locale = await requestLocale();
  const t = dictionaries[locale];
  return (
    <Shell>
      <section className={s.success}>
        <span className={s.eyebrow}>{t.notFound.eyebrow}</span>
        <h1>{t.notFound.title}</h1>
        <p>{t.notFound.text}</p>
        <Button href={pathFor(locale, "home")} icon="→" className={s.successAction}>
          {t.common.backHome}
        </Button>
      </section>
    </Shell>
  );
}
