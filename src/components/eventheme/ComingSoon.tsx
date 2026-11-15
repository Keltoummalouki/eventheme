import Button from "@/components/ui/Button";
import { ArrowUpRightIcon } from "@/components/ui/icons";
import { brand } from "@/data/eventheme";
import { dictionaries } from "@/data/locales";
import type { Entry } from "@/lib/eventheme/types";
import type { Locale } from "@/lib/i18n";
import { Logo } from "./Shell";
import s from "./Eventheme.module.css";

/**
 * Page d’attente « Bientôt en ligne » : à l’adresse /bientot, et à la place de
 * tout le site public quand les paramètres l’imposent. Seuls les liens de
 * contact restent utilisables.
 */
export default function ComingSoon({ locale, entries }: { locale: Locale; entries: Entry[] }) {
  const t = dictionaries[locale].comingSoon;
  const home = entries.find((entry) => entry.id === "home");
  const links = entries.filter((entry) => entry.kind === "socials" && entry.url);
  return (
    <main className={`${s.site} ${s.coming}`}>
      <img src={home?.image || "/eventheme.jpg"} className={s.heroImage} alt="" />
      <div>
        <Logo alt={brand.name} />
        <span className={s.eyebrow}>
          {brand.name} · {brand.sector.toUpperCase()}
        </span>
        <h1>
          {t.titleStart}
          <br />
          {t.titleEnd}
        </h1>
        <p lang="en">{brand.signature}</p>
        <div className={s.actions}>
          {links.map((entry) => (
            <Button key={entry.id} variant="link" icon={<ArrowUpRightIcon />} className={s.comingLink} href={entry.url!}>
              {entry.title}
            </Button>
          ))}
        </div>
      </div>
    </main>
  );
}
