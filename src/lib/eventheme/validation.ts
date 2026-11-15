import { isMoroccanCity } from "@/data/moroccanCities";
import { isSocialNetwork } from "@/data/socials";
import { isHexColor } from "@/lib/colors";
import {
  kinds,
  MAX_DURATION_HOURS,
  MAX_PARTICIPANTS,
  MAX_RENTAL_DAYS,
  SETTINGS_ID,
  translatableFields,
  type Entry,
  type EntryTranslation,
  type InquiryInput,
  type SiteSettings,
} from "./types";
const ENTRY_ID = /^[a-zA-Z0-9_-]{1,100}$/;
export function safeUrl(value: unknown, local = false): value is string {
  return (
    typeof value === "string" &&
    ((local && /^\/(?!\/)/.test(value)) ||
      /^(https:\/\/|mailto:|tel:)/.test(value))
  );
}
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function text(value: unknown, max = 3000) {
  if (typeof value !== "string" || value.length > max)
    throw new Error("Un champ est invalide ou trop long.");
  return value.trim();
}
/** Longueur ou largeur facultative, en centimètres. */
function dimension(value: unknown) {
  if (value == null) return undefined;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > 1e5
  )
    throw new Error("La longueur et la largeur doivent être supérieures à zéro.");
  return value;
}
export function validateEntry(value: unknown): Entry {
  if (!value || typeof value !== "object") throw new Error("Contenu invalide.");
  const v = value as Entry;
  if (!kinds.includes(v.kind) || !ENTRY_ID.test(v.id))
    throw new Error("Type ou identifiant invalide.");
  if (v.kind === "settings") return settingsEntry(v);
  const result: Entry = {
    id: v.id,
    kind: v.kind,
    title: text(v.title, 250),
    description: text(v.description, 10000),
    // Une catégorie n’a pas d’état brouillon : masquée, elle rendrait ses fiches orphelines.
    published: v.kind === "categories" || v.published === true,
  };
  if (!result.title) throw new Error("Le titre est obligatoire.");
  for (const field of [
    "category",
    "color",
    "specifications",
    "location",
    "date",
    "subtitle",
  ] as const)
    if (v[field] != null) result[field] = text(v[field], 3000);
  for (const field of ["brand", "model", "reference"] as const)
    if (v[field] != null) result[field] = text(v[field], 250) || undefined;
  for (const field of ["subcategory", "parent"] as const)
    if (v[field]) {
      if (typeof v[field] !== "string" || !ENTRY_ID.test(v[field]))
        throw new Error("Catégorie invalide.");
      result[field] = v[field];
    }
  if (v.related != null) {
    if (
      !Array.isArray(v.related) ||
      v.related.length > 30 ||
      v.related.some((id) => typeof id !== "string" || !ENTRY_ID.test(id))
    )
      throw new Error("Catégories associées invalides.");
    if (v.related.length) result.related = [...new Set(v.related)];
  }
  if (v.swatch) {
    if (!isHexColor(v.swatch)) throw new Error("Teinte invalide.");
    result.swatch = v.swatch.toLowerCase();
  }
  for (const field of ["image", "url", "video"] as const)
    if (v[field]) {
      if (!safeUrl(v[field], field === "image"))
        throw new Error("Utilisez une URL https, mailto ou tel valide.");
      result[field] = v[field];
    }
  if (v.gallery) {
    if (
      !Array.isArray(v.gallery) ||
      v.gallery.length > 30 ||
      v.gallery.some((url) => !safeUrl(url, true))
    )
      throw new Error("Galerie invalide.");
    result.gallery = v.gallery;
  }
  if (v.price != null) {
    if (
      typeof v.price !== "number" ||
      !Number.isFinite(v.price) ||
      v.price < 0 ||
      v.price > 1e8
    )
      throw new Error("Les montants doivent être positifs.");
    result.price = v.price;
  }
  result.length = dimension(v.length);
  result.width = dimension(v.width);
  if (v.pricing) {
    if (!["fixed", "from", "request", "daily"].includes(v.pricing))
      throw new Error("Mode de prix invalide.");
    result.pricing = v.pricing;
  }
  if (v.variants) {
    if (!Array.isArray(v.variants) || v.variants.length > 30)
      throw new Error("Variantes invalides.");
    result.variants = v.variants.map((variant) => {
      const name = text(variant.name, 100);
      if (
        !name ||
        (variant.price != null &&
          (!Number.isFinite(variant.price) ||
            variant.price < 0 ||
            variant.price > 1e8))
      )
        throw new Error("Variante invalide.");
      return {
        name,
        price: variant.price ?? null,
        length: dimension(variant.length),
        width: dimension(variant.width),
      };
    });
    if (
      new Set(result.variants.map((v) => v.name)).size !==
      result.variants.length
    )
      throw new Error("Les noms des variantes doivent être uniques.");
  }
  if (v.network != null) {
    if (!isSocialNetwork(v.network)) throw new Error("Réseau inconnu.");
    result.network = v.network;
  }
  if (v.followers != null) {
    if (
      !Number.isInteger(v.followers) ||
      v.followers < 0 ||
      v.followers > 1e10
    )
      throw new Error("Le nombre d’abonnés doit être un entier positif.");
    result.followers = v.followers;
  }
  result.demo = v.demo === true;
  result.available = v.available !== false;
  const english = translation(v.translations);
  if (english) result.translations = { en: english };
  return result;
}
/** Paramètres du site : un seul contenu, des champs connus, des valeurs par défaut sûres. */
function settingsEntry(v: Entry): Entry {
  if (v.id !== SETTINGS_ID) throw new Error("Paramètres invalides.");
  const raw = (v.settings && typeof v.settings === "object" ? v.settings : {}) as Record<string, unknown>;
  const optional = (key: keyof SiteSettings, max: number) => (raw[key] == null ? undefined : text(raw[key], max) || undefined);
  const map = optional("map", 500);
  if (map && !/^https:\/\/\S+$/.test(map)) throw new Error("Le lien de la carte doit être une adresse https://.");
  const settings: SiteSettings = {
    address: optional("address", 500),
    map,
    hours: optional("hours", 1000),
    hoursEn: optional("hoursEn", 1000),
    english: raw.english !== false,
    comingSoon: raw.comingSoon === true,
  };
  return { id: SETTINGS_ID, kind: "settings", title: "Paramètres du site", description: "", published: true, settings };
}
/**
 * Version anglaise facultative d’un contenu : seuls les champs traduisibles,
 * mêmes limites que le français ; les champs vides sont omis (le français s’affiche).
 */
function translation(value: unknown): EntryTranslation | undefined {
  if (value == null) return undefined;
  const object = (candidate: unknown): candidate is Record<string, unknown> =>
    typeof candidate === "object" && candidate !== null && !Array.isArray(candidate);
  if (!object(value)) throw new Error("Version anglaise invalide.");
  const english = value.en;
  if (english == null) return undefined;
  if (!object(english)) throw new Error("Version anglaise invalide.");
  const result: EntryTranslation = {};
  for (const field of translatableFields) {
    const raw = english[field];
    if (raw == null) continue;
    const content = text(raw, field === "title" ? 250 : field === "description" ? 10000 : 3000);
    if (content) result[field] = content;
  }
  return Object.keys(result).length ? result : undefined;
}
export function validateInquiry(
  value: unknown,
  entries: Entry[],
): InquiryInput {
  if (!value || typeof value !== "object") throw new Error("Demande invalide.");
  const v = value as InquiryInput;
  if (
    !["contact", "quote", "callback"].includes(v.kind) ||
    v.consent !== true ||
    v.website ||
    !Number.isFinite(v.startedAt) ||
    Date.now() - v.startedAt < 1500
  )
    throw new Error("Veuillez vérifier le formulaire et le consentement.");
  const result = {
    kind: v.kind,
    consent: true,
    website: "",
    startedAt: v.startedAt,
  } as InquiryInput;
  for (const field of [
    "name",
    "email",
    "phone",
    "company",
    "city",
    "address",
    "message",
    "subject",
    "event",
    "date",
    "contactMethod",
  ] as const)
    result[field] = text(v[field] ?? "", field === "message" ? 5000 : 250);
  if (
    !result.name ||
    (result.kind === "contact" && !result.email) ||
    (Boolean(result.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) ||
    !/^[+\d ()-]{7,30}$/.test(result.phone)
  )
    throw new Error("Vérifiez votre nom, votre e-mail et votre téléphone.");
  if (result.contactMethod === "E-mail" && !result.email)
    throw new Error("Ajoutez votre e-mail ou choisissez un contact par téléphone.");
  if (result.kind === "callback" && !entries.some(e => e.kind === "events" && e.id === result.event))
    throw new Error("Choisissez le type de votre événement.");
  // Nombre estimé de participants et budget : facultatifs, 0 = non précisé.
  result.guests = Number(v.guests) || 0;
  if (!Number.isInteger(result.guests) || result.guests < 0 || result.guests > MAX_PARTICIPANTS)
    throw new Error(`Indiquez un nombre de participants entre 1 et ${new Intl.NumberFormat("fr-FR").format(MAX_PARTICIPANTS)}.`);
  result.budget = Number(v.budget) || 0;
  if (!Number.isFinite(result.budget) || result.budget < 0 || result.budget > 1e9)
    throw new Error("Budget estimatif invalide.");
  result.budget = Math.round(result.budget);
  result.duration = Number(v.duration) || 0;
  if (!Number.isFinite(result.duration) || result.duration < 0 || result.duration > MAX_DURATION_HOURS)
    throw new Error(`La durée de l’événement ne peut dépasser ${MAX_DURATION_HOURS} heures.`);
  result.rentalDays = Number(v.rentalDays) || 1;
  if (!Number.isInteger(result.rentalDays) || result.rentalDays < 1 || result.rentalDays > MAX_RENTAL_DAYS)
    throw new Error(`Indiquez entre 1 et ${MAX_RENTAL_DAYS} jours de location.`);
  // Champs obligatoires réduits au strict nécessaire (cahier des charges §04 F).
  if (result.kind === "quote") {
    if (
      !isMoroccanCity(result.city) ||
      !validDate(result.date) ||
      result.date < new Date().toISOString().slice(0, 10)
    )
      throw new Error("Précisez une date à venir et la ville de l’événement.");
    if (!entries.some((e) => e.kind === "events" && e.id === result.event))
      throw new Error(
        "Une option sélectionnée n’est plus disponible. Actualisez la page.",
      );
  }
  if (
    !v.basket ||
    !Array.isArray(v.basket.services) ||
    !Array.isArray(v.basket.products) ||
    v.basket.services.length > 50 ||
    v.basket.products.length > 100
  )
    throw new Error("Sélection invalide.");
  result.basket = {
    services: [...new Set(v.basket.services)],
    products: v.basket.products.map((item) => ({
      id: text(item.id, 100),
      variant: text(item.variant ?? "", 100),
      quantity: item.quantity,
    })),
  };
  if (
    result.basket.services.some(
      (id) => !entries.some((e) => e.kind === "services" && e.id === id),
    )
  )
    throw new Error("Un service n’est plus disponible.");
  for (const item of result.basket.products) {
    const product = entries.find(
      (e) => e.kind === "products" && e.id === item.id,
    );
    if (
      !product ||
      product.available === false ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 1000 ||
      (product.variants?.length &&
        !product.variants.some((v) => v.name === item.variant))
    )
      throw new Error("Vérifiez les produits, les variantes et les quantités.");
  }
  if (result.kind === "contact" && !result.message)
    throw new Error("Votre message est obligatoire.");
  return result;
}
