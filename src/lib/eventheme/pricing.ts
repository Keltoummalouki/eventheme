import { dictionaries } from "@/data/locales";
import { fill, type Locale } from "@/lib/i18n";
import type { Basket, Entry, EstimateLine, InquiryInput } from "./types";
/**
 * Estimation indicative d’une demande. Les libellés des lignes suivent
 * `locale` (affichage) ; le résumé enregistré pour l’équipe reste en français.
 */
export function estimate(
  entries: Entry[],
  input: Pick<InquiryInput, "event" | "rentalDays">,
  basket: Basket,
  locale: Locale = "fr",
) {
  let total = 0;
  let hasUnpriced = false;
  const summary: string[] = [];
  const lines: EstimateLine[] = [];
  const add = (
    entry: Entry | undefined,
    quantity = 1,
    price = entry?.price,
    detail = "",
  ) => {
    if (!entry) return;
    const amount = price == null || entry.pricing === "request" ? null : price * quantity;
    lines.push({ kind: entry.kind, label: `${entry.title}${detail ? ` · ${detail}` : ""}`, quantity, amount, from: entry.pricing === "from" });
    summary.push(`${entry.title}${quantity > 1 ? ` × ${quantity}` : ""}`);
    if (price == null || entry.pricing === "request") hasUnpriced = true;
    else total += price * quantity;
  };
  add(entries.find((e) => e.id === input.event && e.kind === "events"));
  basket.services.forEach((id) =>
    add(entries.find((e) => e.id === id && e.kind === "services")),
  );
  // Le matériel se loue à la journée : une journée au minimum.
  const days = Math.max(1, Math.floor(input.rentalDays) || 1);
  for (const item of basket.products) {
    const product = entries.find(
      (e) => e.id === item.id && e.kind === "products",
    );
    const variant = product?.variants?.find((v) => v.name === item.variant);
    add(
      product,
      item.quantity * (product?.pricing === "daily" ? days : 1),
      variant ? variant.price : product?.price,
      [variant && (variant.label || variant.name), product?.pricing === "daily" ? fill(dictionaries[locale].format.unitsByDays, { units: item.quantity, days }) : ""]
        .filter(Boolean)
        .join(" · "),
    );
    if (variant) summary.push(`Variante : ${variant.name}`);
  }
  return { total, hasUnpriced, summary, lines };
}
