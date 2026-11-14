import { getEntries } from "@/lib/eventheme/server";
import { Logo } from "@/components/eventheme/Shell";
import Button from "@/components/ui/Button";
import s from "@/components/eventheme/Eventheme.module.css";
import { ArrowUpRightIcon } from "@/components/ui/icons";
import { brand } from "@/data/eventheme";
export const metadata = { title: "Bientôt en ligne", robots: { index: false } };
export default async function Page() {
  const entries = await getEntries();
  const home = entries.find((e) => e.id === "home");
  return (
    <main className={`${s.site} ${s.coming}`}>
      <img
        src={home?.image || "/eventheme.jpg"}
        className={s.heroImage}
        alt=""
      />
      <div>
        <Logo />
        <span className={s.eyebrow}>
          {brand.name} · {brand.sector.toUpperCase()}
        </span>
        <h1>
          Quelque chose
          <br />
          d’extraordinaire arrive.
        </h1>
        <p lang="en">{brand.signature}</p>
        <div className={s.actions}>
          {entries
            .filter((e) => e.kind === "socials")
            .map((e) => (
              <Button
                key={e.id}
                variant="link"
                icon={<ArrowUpRightIcon />}
                className={s.comingLink}
                href={e.url || "/contact"}
              >
                {e.title}
              </Button>
            ))}
        </div>
      </div>
    </main>
  );
}
