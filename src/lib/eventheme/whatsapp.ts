import { brand } from "@/data/eventheme";
import { dictionaries } from "@/data/locales";
import { formatLongDate, parseIsoDate } from "@/lib/dates";
import { fill, intlLocale, type Locale } from "@/lib/i18n";

export type QuoteMessageInput = {
  event: string;
  date: string;
  city: string;
  services: string[];
  name: string;
  phone: string;
  email: string;
  reference?: string;
};

/** Message de demande de devis prévu par le cahier des charges, crochets remplis, dans la langue de la page. */
export function quoteMessage(input: QuoteMessageInput, locale: Locale = "fr") {
  const t = dictionaries[locale].whatsapp;
  const date = parseIsoDate(input.date);
  return (
    fill(t.message, {
      brand: brand.name,
      type: input.event || t.noType,
      date: date ? formatLongDate(date, intlLocale[locale]) : t.noDate,
      city: input.city || t.noCity,
      services: input.services.join(", ") || t.noServices,
      contact: [input.name, input.phone, input.email].filter(Boolean).join(", "),
    }) + (input.reference ? fill(t.reference, { reference: input.reference }) : "")
  );
}

/**
 * Lien WhatsApp pré-rempli. Seul un lien `wa.me/<numéro>` accepte un texte :
 * un lien court (`wa.me/message/…`) garde le message fixé dans WhatsApp Business,
 * d’où `null` — l’interface copie alors le message avant d’ouvrir le lien.
 */
export function whatsappLink(url: string | undefined, message: string) {
  const number = url?.match(/^https:\/\/wa\.me\/(\d{8,15})\/?(?:\?|$)/)?.[1];
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
