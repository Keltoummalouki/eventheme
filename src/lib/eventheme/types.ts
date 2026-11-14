import { dictionaries } from "@/data/locales";
import { isSocialNetwork, type SocialNetwork } from "@/data/socials";
import { fill, intlLocale, type Locale } from "@/lib/i18n";
/** Nombre au format de la langue. */
const number = (value: number, locale: Locale, options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat(intlLocale[locale], options).format(value);
export const kinds = [
  "services",
  "products",
  "categories",
  "events",
  "projects",
  "pages",
  "cities",
  "socials",
] as const;
export type Kind = (typeof kinds)[number];
export type Variant = {
  /** Nom saisi dans l’administration : la clé enregistrée dans le panier et vérifiée par le serveur. */
  name: string;
  /** Libellé dans la langue de la page (version anglaise) ; jamais enregistré. */
  label?: string;
  price: number | null;
  /** En centimètres ; vides, la variante reprend les dimensions du produit. */
  length?: number;
  width?: number;
};
export type Entry = {
  id: string;
  kind: Kind;
  title: string;
  description: string;
  published: boolean;
  image?: string;
  /**
   * Matériel : identifiant de sa catégorie (fiche « categories »).
   * Services : discipline affichée (« Son », « Lumière »…). Réalisations : type
   * d’événement du classement (« Galas », « Concerts »…).
   */
  category?: string;
  /** Matériel : identifiant de sa sous-catégorie, enfant de `category`. */
  subcategory?: string;
  /** Catégorie : identifiant de la catégorie parente ; absente pour une catégorie principale. */
  parent?: string;
  /** Service : catégories du catalogue présentées sur sa page (« Le matériel associé »). */
  related?: string[];
  /** Matériel : marque, modèle et référence interne, lorsqu’ils sont connus. */
  brand?: string;
  model?: string;
  reference?: string;
  price?: number | null;
  pricing?: "fixed" | "from" | "request" | "daily";
  variants?: Variant[];
  color?: string;
  /** Teinte « #rrggbb » de la couleur, affichée en pastille, facultative. */
  swatch?: string;
  /** Longueur d'un produit, en centimètres, facultative. */
  length?: number;
  /** Largeur d'un produit, en centimètres, facultative. */
  width?: number;
  specifications?: string;
  available?: boolean;
  location?: string;
  date?: string;
  url?: string;
  subtitle?: string;
  gallery?: string[];
  video?: string;
  demo?: boolean;
  /** Réseau ou canal d'un lien « Contact & réseaux ». */
  network?: SocialNetwork;
  /** Nombre d'abonnés d'un réseau, facultatif. */
  followers?: number;
  /** Version anglaise des textes, facultative : le français s'affiche à défaut. */
  translations?: { en?: EntryTranslation };
};
/**
 * Champs traduisibles d'un contenu (version anglaise facultative, saisie dans
 * l'administration). `variants` : les noms des variantes, un par ligne, dans l'ordre.
 */
export const translatableFields = ["title", "description", "subtitle", "specifications", "category", "color", "variants"] as const;
export type EntryTranslation = Partial<Record<(typeof translatableFields)[number], string>>;
export type BasketItem = { id: string; quantity: number; variant: string };
export type Basket = { services: string[]; products: BasketItem[] };
export type InquiryInput = {
  kind: "quote" | "contact" | "callback";
  name: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  /** Adresse ou nom du lieu, facultative : précise la ville. */
  address: string;
  message: string;
  subject: string;
  event: string;
  date: string;
  /** Durée de l'événement en heures, facultative : 0 = non précisée. */
  duration: number;
  /** Jours de location du matériel, tarifé à la journée : 1 au minimum. */
  rentalDays: number;
  /** Nombre estimé de participants : 0 = non précisé. */
  guests: number;
  /** Budget estimatif en MAD, facultatif : 0 = non précisé. */
  budget: number;
  contactMethod: string;
  consent: boolean;
  website: string;
  startedAt: number;
  basket: Basket;
};
/** Statuts d’une demande (cahier des charges §07). */
export const statuses = [
  "Nouveau",
  "En cours de traitement",
  "Devis envoyé",
  "Accepté",
  "Refusé",
  "Terminé",
] as const;
export type Status = (typeof statuses)[number];
/** Statuts enregistrés avant le cahier des charges EVENTHEMES, et leur équivalent. */
const legacyStatuses: Record<string, Status> = {
  "Nouvelle demande": "Nouveau",
  Confirmé: "Accepté",
  Annulé: "Refusé",
};
export function normalizeStatus(value: string): Status {
  if ((statuses as readonly string[]).includes(value)) return value as Status;
  return legacyStatuses[value] ?? "Nouveau";
}
/** Pièces jointes d’une demande de devis : plans, photos ou documents. */
export const attachmentTypes = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export type AttachmentType = keyof typeof attachmentTypes;
export const MAX_ATTACHMENTS = 3;
/** Par fichier : sous la limite de 4,5 Mo d’une requête sur l’hébergement visé. */
export const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export type Attachment = {
  id: string;
  /** Nom d’origine, nettoyé : affiché à l’équipe, jamais utilisé comme chemin. */
  name: string;
  type: AttachmentType;
  size: number;
  uploadedAt: string;
};
export type Inquiry = InquiryInput & {
  id: string;
  /** Numéro lisible et unique, « EVT-2026-0001 ». Absent des demandes antérieures. */
  reference?: string;
  createdAt: string;
  status: Status;
  notes: string;
  estimate: number;
  hasUnpriced: boolean;
  summary: string[];
  attachments?: Attachment[];
  continuationHash?: string;
  completedAt?: string;
  /** Langue de la page d’où vient la demande : celle de l’accusé de réception. Français par défaut. */
  locale?: Locale;
};
/** Référence affichée : le numéro lisible, ou le début de l’identifiant pour une demande ancienne. */
/** Nom affiché d’une variante : son libellé traduit s’il existe, sinon son nom. */
export const variantLabel = (product: Pick<Entry, "variants"> | undefined, name: string) =>
  product?.variants?.find((variant) => variant.name === name)?.label || name;
export const referenceOf = (inquiry: Pick<Inquiry, "id" | "reference">) =>
  inquiry.reference || inquiry.id.slice(0, 8).toUpperCase();
export const MAX_PARTICIPANTS = 100000;
export function participantsLabel(value: number, locale: Locale = "fr") {
  const format = dictionaries[locale].format;
  if (value <= 0) return format.participantsUnknown;
  return fill(value > 1 ? format.participants : format.participant, { count: number(value, locale) });
}
export type CallbackReceipt = {
  id: string;
  reference: string;
  /** Un accusé de réception part vers l’e-mail du client. */
  emailed?: boolean;
  token: string;
  name: string;
  phone: string;
  email: string;
  event: string;
};
/** Une ligne de l’estimation : `amount` vide = poste à chiffrer par l’équipe. */
export type EstimateLine = {
  kind: Kind;
  label: string;
  quantity: number;
  amount: number | null;
  from: boolean;
};
/** Coordonnées du premier formulaire « Mon devis ». */
export type QuoteContact = Pick<InquiryInput, "name" | "company" | "phone" | "email" | "contactMethod" | "consent">;
/** Précisions ajoutées, si le client le souhaite, après sa demande de rappel. */
export type QuoteDetails = Pick<
  InquiryInput,
  "event" | "date" | "duration" | "rentalDays" | "city" | "address" | "guests" | "budget" | "message"
>;
/** Sort d’une pièce jointe à l’envoi : reçue par l’équipe, ou à renvoyer autrement. */
export type SentAttachment = { name: string; sent: boolean; error?: string };
/** Instantané remis au client à la fin du parcours : son devis estimatif. */
export type QuoteResult = {
  id: string;
  reference: string;
  sentAt: string;
  estimate: number;
  hasUnpriced: boolean;
  lines: EstimateLine[];
  contact: QuoteContact;
  details: QuoteDetails;
  basket: Basket;
  attachments: SentAttachment[];
  /** Une copie du récapitulatif part vers l’e-mail du client. */
  emailed?: boolean;
};
/**
 * lead : coordonnées · invite : proposition d’aller plus loin · waiting : simple
 * rappel · configure : personnalisation · done : devis estimatif.
 */
export type QuotePhase = "lead" | "invite" | "waiting" | "configure" | "done";
export type QuoteState = {
  phase: QuotePhase;
  step: number;
  contact: QuoteContact;
  details: QuoteDetails;
  /** Pièces jointes choisies, envoyées après la demande ; en mémoire seulement. */
  files: File[];
  lead: CallbackReceipt | null;
  result: QuoteResult | null;
};
export const labels: Record<Kind, string> = {
  services: "Services",
  products: "Matériel & variantes",
  categories: "Catégories du matériel",
  events: "Types d’événement",
  projects: "Réalisations",
  pages: "Contenu des pages",
  cities: "Zones d’intervention",
  socials: "Contact & réseaux",
};
export const money = (value: number, locale: Locale = "fr") =>
  new Intl.NumberFormat(locale === "fr" ? "fr-MA" : intlLocale[locale], {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  }).format(value);
export const centimetres = (value: number, locale: Locale = "fr") =>
  `${number(value, locale, { maximumFractionDigits: 1 })} cm`;
/** Bornes partagées par le configurateur et la validation serveur. */
export const MAX_DURATION_HOURS = 72;
export const MAX_RENTAL_DAYS = 60;
export const hoursLabel = (value: number, locale: Locale = "fr") =>
  fill(dictionaries[locale].format.hours, { count: number(value, locale, { maximumFractionDigits: 1 }) });
export const daysLabel = (value: number, locale: Locale = "fr") =>
  fill(value > 1 ? dictionaries[locale].format.days : dictionaries[locale].format.day, { count: value });
/** Réseau d'un lien de contact ; les fiches antérieures au champ `network` le portent dans leur identifiant. */
export const socialNetworkOf = (entry: Entry): SocialNetwork | undefined =>
  entry.network ?? (isSocialNetwork(entry.id) ? entry.id : undefined);
export const findSocial = (entries: Entry[], network: SocialNetwork) =>
  entries.find((e) => e.kind === "socials" && socialNetworkOf(e) === network);
export const followersLabel = (followers: number, locale: Locale = "fr") =>
  fill(dictionaries[locale].format.followers, { count: number(followers, locale, { notation: "compact" }) });
export function priceLabel(entry: Entry, locale: Locale = "fr") {
  const format = dictionaries[locale].format;
  if (entry.price == null || entry.pricing === "request") return format.onRequest;
  const amount = money(entry.price, locale);
  if (entry.pricing === "from") return fill(format.from, { amount });
  if (entry.pricing === "daily") return fill(format.perDay, { amount });
  return amount;
}
/** Intitulé lisible d’une ligne de l’estimation, selon sa nature. */
export function lineLabel(line: EstimateLine, locale: Locale = "fr") {
  return line.kind === "events" ? fill(dictionaries[locale].format.eventType, { title: line.label }) : line.label;
}
export function lineAmount(line: EstimateLine, locale: Locale = "fr") {
  const format = dictionaries[locale].format;
  if (line.amount == null) return format.onRequest;
  const amount = money(line.amount, locale);
  return line.from ? fill(format.fromShort, { amount }) : amount;
}
