"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import Button from "@/components/ui/Button";
import {
  clearAnalyticsCookies,
  contactMethodOf,
  loadAnalytics,
  onReopenConsent,
  readConsent,
  subscribeConsent,
  track,
  writeConsent,
  type ConsentChoice,
} from "@/lib/eventheme/audience";
import { useEventheme } from "./Provider";
import s from "./Eventheme.module.css";

/**
 * Consentement à la mesure d’audience (loi 09-08) : demandé une fois, aussi
 * simple à refuser qu’à accepter, modifiable depuis le pied de page. Une fois
 * accepté, Google Analytics est chargé et les clics vers WhatsApp, le
 * téléphone ou l’e-mail sont comptés (sans donnée personnelle).
 */
export default function Consent({ id }: { id: string }) {
  const { t, href } = useEventheme();
  // undefined : rendu serveur (rien à afficher) ; null : aucun choix enregistré dans ce navigateur.
  const stored = useSyncExternalStore<ConsentChoice | null | undefined>(
    subscribeConsent,
    () => readConsent(window.localStorage),
    () => undefined,
  );
  // « Gérer les cookies » rouvre le bandeau, même après un choix.
  const [reopened, setReopened] = useState(false);
  useEffect(() => onReopenConsent(() => setReopened(true)), []);

  useEffect(() => {
    if (stored !== "granted") return;
    loadAnalytics(id);
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      const method = contactMethodOf(link?.getAttribute("href"));
      if (method) track("contact_click", { method });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [stored, id]);

  const decide = (choice: ConsentChoice) => {
    const before = stored;
    writeConsent(window.localStorage, choice);
    setReopened(false);
    // Retrait : les cookies de mesure sont supprimés et la page rechargée sans Google Analytics.
    if (before === "granted" && choice === "denied") {
      clearAnalyticsCookies();
      window.location.reload();
    }
  };

  if (stored !== null && !reopened) return null;
  return (
    <section className={s.consent} aria-label={t.consent.label}>
      <p>
        <strong>{t.consent.label}</strong>
        {t.consent.text} <Link href={href("privacy")}>{t.consent.more}</Link>
      </p>
      <div className={s.consentActions}>
        <Button size="sm" onClick={() => decide("granted")}>
          {t.consent.accept}
        </Button>
        <Button size="sm" variant="outline" onClick={() => decide("denied")}>
          {t.consent.refuse}
        </Button>
      </div>
    </section>
  );
}
