"use client";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import { cx } from "@/lib/cx";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion";
import type { AdminAccount } from "@/lib/eventheme/auth";
import { inquiryKindLabels, type AdminView } from "@/lib/eventheme/dashboard";
import AdminShell, { locate, navigation } from "./admin/AdminShell";
import Dashboard, { StatusPill } from "./admin/Dashboard";
import type { PaletteItem } from "./admin/CommandPalette";
import { DownloadIcon, ExternalIcon, LogoutIcon, MailIcon, PhoneIcon, PlusIcon, QuoteIcon } from "./admin/icons";
import a from "./admin/Admin.module.css";
import {
  kinds,
  labels,
  statuses,
  money,
  daysLabel,
  hoursLabel,
  priceLabel,
  followersLabel,
  socialNetworkOf,
  participantsLabel,
  referenceOf,
  SETTINGS_ID,
  translatedLocales,
  type Entry,
  type EntryTranslation,
  type Inquiry,
  type Kind,
  type SiteSettings,
  type TranslatedLocale,
  type Variant,
} from "@/lib/eventheme/types";
import { adminLogin } from "@/lib/eventheme/auth";
import { direction, pathFor, type PageKey } from "@/lib/i18n";
import { isGeneratedId, slugify, uniqueSlug } from "@/lib/slug";
import { categoryTrail, childCategories, topCategories } from "@/lib/eventheme/catalogue";
import { sizeLabel } from "@/lib/eventheme/requests";
import { projectCategories } from "@/data/eventheme";
import { analytics, statisticsRows } from "@/lib/eventheme/analytics";
import { Logo } from "./Shell";
import Statistics from "./Statistics";
import Button from "@/components/ui/Button";
import { confirmDialog } from "@/components/ui/dialog";
import { ArrowUpRightIcon, CloseIcon, SocialIcon } from "@/components/ui/icons";
import { socialNetworks, type SocialNetwork } from "@/data/socials";
import {
  Checkbox,
  ColorInput,
  FileInput,
  Input,
  NumberInput,
  SearchInput,
  Select,
  Textarea,
  YearPicker,
} from "@/components/ui/form";
import s from "./Eventheme.module.css";
const sitePages = [
  { id: "home", label: "Accueil" },
  { id: "about", label: "À propos" },
  { id: "values", label: "Nos valeurs" },
  { id: "contact", label: "Contact" },
  { id: "services-page", label: "Page Services" },
  { id: "location-page", label: "Page Matériel" },
  { id: "projects-page", label: "Page Réalisations" },
  { id: "cities-page", label: "Page Zones d’intervention" },
  { id: "legal", label: "Mentions légales" },
  { id: "privacy", label: "Politique de confidentialité" },
];
/** Types de contenu listés dans « Votre site » ; les paramètres ont leur propre onglet. */
const contentKinds: readonly Kind[] = kinds.filter((kind) => kind !== "settings");
/** Contenus qui ont une adresse publique : un nouveau contenu prend un identifiant lisible, tiré de son titre. */
const addressed: readonly Kind[] = ["services", "products", "categories", "events", "projects", "cities"];
/** Page publique de chaque type de fiche (aperçu de l’adresse dans le formulaire). */
const pageOf: Partial<Record<Kind, PageKey>> = {
  services: "services",
  products: "equipment",
  projects: "projects",
  cities: "cities",
};
/** Nouveau contenu : identifiant lisible et libre (« marrakech », « marrakech-2 »…) à la place de l’identifiant aléatoire. */
const withReadableId = (entry: Entry, entries: Entry[]): Entry =>
  addressed.includes(entry.kind) && isGeneratedId(entry.id) && !entries.some((e) => e.id === entry.id)
    ? { ...entry, id: uniqueSlug(slugify(entry.title), entries.map((e) => e.id)) }
    : entry;
type FormField =
  | "title"
  | "discipline"
  | "catalogue"
  | "identity"
  | "parent"
  | "projectType"
  | "subtitle"
  | "description"
  | "items"
  | "image"
  | "gallery"
  | "price"
  | "product"
  | "variants"
  | "project"
  | "related"
  | "demo";
/** Each form shows only the fields the public site actually reads for that kind. */
const formFields: Record<Kind, readonly FormField[]> = {
  services: ["title", "discipline", "description", "items", "related", "image", "price"],
  products: [
    "title",
    "catalogue",
    "identity",
    "description",
    "image",
    "gallery",
    "price",
    "product",
    "variants",
    "demo",
  ],
  categories: ["title", "parent", "description", "image"],
  events: ["title", "description", "image", "price"],
  projects: [
    "title",
    "projectType",
    "description",
    "items",
    "image",
    "gallery",
    "project",
    "demo",
  ],
  pages: ["title", "subtitle", "description", "image", "gallery"],
  // One page per city: the name, an optional page title, a text proper to that city, a photo.
  cities: ["title", "subtitle", "description", "image"],
  // Site settings have their own panel (SettingsPanel).
  settings: [],
  // Social links have their own form: network, link, account name, followers.
  socials: [],
};
const kindNames = inquiryKindLabels;
/** Nouvelle fiche vierge d'un type de contenu (bouton « Ajouter », raccourcis du tableau de bord). */
const blankEntry = (kind: Kind): Entry => ({
  id: crypto.randomUUID(),
  kind,
  title: "",
  description: "",
  published: true,
  price: null,
  pricing: "request",
  variants: [],
});
async function api(body: object, path = "/api/admin") {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}
async function uploadPhoto(file: File): Promise<string> {
  const data = new FormData();
  data.set("file", file);
  const response = await fetch("/api/admin/media", {
    method: "POST",
    body: data,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result.url;
}
const galleryLimit = 30;
export function AdminLogin({
  configured,
  next,
}: {
  configured: boolean;
  next: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      await api(
        { email: data.get("email"), password: data.get("password") },
        "/api/auth",
      );
      router.replace(next);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.login}>
      <Link href="/">
        <Logo />
      </Link>
      <span className={s.eyebrow}>ESPACE ADMINISTRATEUR</span>
      <h1>Bienvenue chez vous.</h1>
      <p>
        {configured
          ? "Connectez-vous avec votre compte administrateur pour gérer votre site et vos demandes."
          : "La connexion administrateur n’est pas encore configurée."}
      </p>
      {configured && (
        <form onSubmit={login} className={s.loginForm}>
          <Input
            label="E-mail"
            name="email"
            type="email"
            autoComplete="username"
            required
          />
          <Input
            label="Mot de passe"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
          <Button type="submit" block loading={busy} icon={<ArrowUpRightIcon />}>
            {busy ? "Connexion…" : "Se connecter"}
          </Button>
        </form>
      )}
      <Button href="/" variant="link" className={s.loginBack}>
        ← Retour au site
      </Button>
    </div>
  );
}
export default function Admin({
  initialEntries,
  initialInquiries,
  local,
  now,
  offset,
  mail,
  account,
  initialView = "dashboard",
}: {
  initialEntries: Entry[];
  initialInquiries: Inquiry[];
  local: boolean;
  /** E-mails automatiques : mode d’envoi et destinataires des alertes. */
  mail: { mode: "provider" | "preview" | "off"; recipients: string[] };
  /**
   * Instant de référence des statistiques, daté par le serveur : la page rendue
   * et la page hydratée comptent ainsi les mêmes journées.
   */
  now: number;
  /**
   * Décalage de Casablanca sur UTC à cet instant, lu par le serveur : le
   * tableau de bord compte ses journées sans consulter les fuseaux du navigateur.
   */
  offset: number;
  /** Le compte connecté : salutation et carte du menu. */
  account: AdminAccount;
  /** Onglet demandé par l’adresse (« /admin?vue=quotes »), pour qu’un rechargement garde sa place. */
  initialView?: AdminView;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [tab, setTab] = useState<AdminView>(initialView);
  const [edit, setEdit] = useState<Entry | null>(null);
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const view = useRef<HTMLDivElement>(null);
  const detail = useRef<HTMLDivElement>(null);
  const shown = useRef(false);

  // Changement d’onglet : le contenu entre en fondu (sauf au premier affichage et en mouvement réduit).
  useGSAP(
    () => {
      if (!shown.current) {
        shown.current = true;
        return;
      }
      if (!view.current || prefersReducedMotion()) return;
      gsap.fromTo(
        view.current,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", clearProps: "opacity,transform" },
      );
    },
    { dependencies: [tab] },
  );

  // Une demande ouverte depuis une liste s’affiche sous elle : on l’amène à l’écran.
  useEffect(() => {
    if (inquiry)
      detail.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }, [inquiry?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  async function mutate(body: object, onSuccess?: () => void) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(body);
      const response = await fetch("/api/admin", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setEntries(data.entries);
      setInquiries(data.inquiries);
      setNotice("Modifications enregistrées.");
      onSuccess?.();
      router.refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const quotes = inquiries.filter((i) => i.kind === "quote");
  const messages = inquiries.filter((i) => i.kind === "contact");
  const stats = useMemo(
    () => analytics(entries, inquiries, new Date(now)),
    [entries, inquiries, now],
  );
  const here = locate(tab);
  function navigate(next: AdminView) {
    if (next !== tab) window.scrollTo({ top: 0 });
    setTab(next);
    setEdit(null);
    setInquiry(null);
    setSearch("");
    setError("");
    // L’adresse suit l’onglet : un rechargement ou un lien partagé y ramène.
    window.history.replaceState(null, "", next === "dashboard" ? "/admin" : `/admin?vue=${next}`);
  }
  /** Ouvre une fiche dans son onglet. */
  function editEntry(target: Entry) {
    navigate(target.kind);
    setEdit(structuredClone(target));
  }
  /** Nouvelle fiche d’un type de contenu, ouverte dans son onglet. */
  function createEntry(kind: Kind) {
    navigate(kind);
    setEdit(blankEntry(kind));
  }
  async function logout() {
    await api({ action: "logout" }, "/api/auth");
    router.replace(adminLogin);
  }
  /** Ouvre une demande depuis les statistiques, dans la liste qui la contient. */
  function openInquiry(target: Inquiry) {
    navigate(
      target.kind === "contact"
        ? "messages"
        : target.kind === "callback"
          ? "clients"
          : "quotes",
    );
    setInquiry(structuredClone(target));
  }
  /** Écrit un CSV lisible par Excel : séparateur « ; », BOM, cellules neutralisées. */
  function downloadCsv(rows: string[][], name: string) {
    const csv =
      "﻿" +
      rows
        .map((row) =>
          row
            .map(
              (value) =>
                `"${(/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`,
            )
            .join(";"),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  function exportCsv() {
    const eventTitle = (id: string) =>
      entries.find((e) => e.id === id && e.kind === "events")?.title ?? "";
    const rows = [
      [
        "Référence",
        "Type",
        "Statut",
        "Reçue le",
        "Nom",
        "Entreprise",
        "E-mail",
        "Téléphone",
        "Contact préféré",
        "Événement",
        "Date événement",
        "Ville",
        "Lieu",
        "Participants",
        "Budget estimatif (MAD)",
        "Montant indicatif (MAD)",
        "Pièces jointes",
        "Message",
      ],
      ...inquiries.map((i) => [
        referenceOf(i),
        kindNames[i.kind],
        i.status,
        new Date(i.createdAt).toLocaleDateString("fr-FR"),
        i.name,
        i.company,
        i.email,
        i.phone,
        i.contactMethod,
        eventTitle(i.event),
        i.date,
        i.city,
        i.address ?? "",
        i.guests ? String(i.guests) : "",
        i.budget ? String(i.budget) : "",
        i.estimate ? String(i.estimate) : "",
        String(i.attachments?.length ?? 0),
        i.message,
      ]),
    ];
    downloadCsv(rows, "eventhemes-demandes.csv");
  }
  /** Pastilles du menu : ce qui attend une première réponse. */
  const fresh = (kind: Inquiry["kind"]) => inquiries.filter((i) => i.kind === kind && i.status === "Nouveau").length;
  const counts = { quotes: fresh("quote"), messages: fresh("contact"), clients: fresh("callback") };
  /** La palette de commandes : aller à un onglet, lancer une action, retrouver une demande ou une fiche. */
  const paletteItems = useMemo<PaletteItem[]>(() => {
    const kindIcons = { quote: <QuoteIcon />, callback: <PhoneIcon />, contact: <MailIcon /> };
    const go: PaletteItem[] = navigation.flatMap((group) =>
      group.items.map(({ view: target, label, icon: Icon }) => ({
        id: `aller-${target}`,
        group: "Aller à",
        label,
        hint: group.title,
        icon: <Icon />,
        run: () => navigate(target),
      })),
    );
    const actions: PaletteItem[] = [
      { id: "ajout-materiel", label: "Ajouter du matériel", kind: "products" as Kind },
      { id: "ajout-realisation", label: "Nouvelle réalisation", kind: "projects" as Kind },
      { id: "ajout-service", label: "Nouveau service", kind: "services" as Kind },
      { id: "ajout-categorie", label: "Nouvelle catégorie du matériel", kind: "categories" as Kind },
      { id: "ajout-ville", label: "Nouvelle zone d’intervention", kind: "cities" as Kind },
    ].map(({ id, label, kind }) => ({ id, group: "Actions", label, icon: <PlusIcon />, run: () => createEntry(kind) }));
    actions.push(
      { id: "export-demandes", group: "Actions", label: "Exporter les demandes (CSV)", icon: <DownloadIcon />, run: exportCsv },
      {
        id: "export-statistiques",
        group: "Actions",
        label: "Exporter les statistiques (CSV)",
        icon: <DownloadIcon />,
        run: () => downloadCsv(statisticsRows(stats), "eventhemes-statistiques.csv"),
      },
      { id: "voir-site", group: "Actions", label: "Voir le site", hint: "Nouvel onglet", icon: <ExternalIcon />, run: () => window.open("/", "_blank", "noopener") },
      { id: "deconnexion", group: "Actions", label: "Se déconnecter", icon: <LogoutIcon />, run: () => void logout() },
    );
    const requests: PaletteItem[] = inquiries.map((item) => ({
      id: `demande-${item.id}`,
      group: "Demandes",
      label: item.name || "Demande sans nom",
      hint: [kindNames[item.kind], referenceOf(item), item.city, item.status].filter(Boolean).join(" · "),
      keywords: [item.company, item.email, item.phone, item.subject].join(" "),
      icon: kindIcons[item.kind],
      searchOnly: true,
      run: () => openInquiry(item),
    }));
    const records: PaletteItem[] = entries
      .filter((entry) => entry.kind !== "settings")
      .map((entry) => {
        const Icon = locate(entry.kind).icon;
        return {
          id: `fiche-${entry.kind}-${entry.id}`,
          group: "Contenus",
          label: entry.title || entry.id,
          hint: `${labels[entry.kind]}${entry.published ? "" : " · Brouillon"}`,
          keywords: [entry.id, entry.brand, entry.model, entry.reference, entry.category].filter(Boolean).join(" "),
          icon: <Icon />,
          searchOnly: true,
          run: () => editEntry(entry),
        };
      });
    return [...go, ...actions, ...requests, ...records];
    // Les actions lisent l’état courant à chaque rendu : la liste est recalculée avec les données.
  }, [entries, inquiries, stats]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <AdminShell
      view={tab}
      navigate={navigate}
      counts={counts}
      account={account}
      local={local}
      onLogout={() => void logout()}
      paletteItems={paletteItems}
      notice={notice}
      onNoticeShown={() => setNotice("")}
    >
      <div ref={view}>
        {tab !== "dashboard" && (
          <div className={a.pageHead}>
            <p className={a.eyebrow}>{here.group}</p>
            <h1>{here.label}</h1>
          </div>
        )}
        {["quotes", "messages", "clients"].includes(tab) && (
          <p className={s.adminBanner}>
            {mail.mode === "off"
              ? "Les e-mails automatiques ne sont pas configurés : les nouvelles demandes n’arrivent que dans cette administration."
              : mail.mode === "preview"
                ? "Aperçu local : les e-mails (alertes et accusés de réception) sont enregistrés dans .eventheme/emails/ pour relecture, pas envoyés."
                : mail.recipients.length
                  ? `Alertes e-mail envoyées à ${mail.recipients.join(", ")}. Les clients qui donnent leur e-mail reçoivent un accusé de réception.`
                  : "Aucune adresse ne reçoit les alertes : ajoutez un lien « E-mail » dans Contact & réseaux, ou définissez EMAIL_TEAM."}
          </p>
        )}
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        {tab === "dashboard" && (
          <Dashboard
            entries={entries}
            inquiries={inquiries}
            stats={stats}
            now={now}
            offset={offset}
            account={account}
            local={local}
            mail={mail}
            navigate={navigate}
            openInquiry={openInquiry}
            editEntry={editEntry}
            createEntry={createEntry}
          />
        )}
        {tab === "statistics" && (
          <>
            <div className={s.adminToolbar}>
              <p className={s.caption}>
                Indicateurs calculés sur les demandes reçues et les contenus
                publiés. Les montants sont indicatifs : ils proviennent du
                configurateur et ne valent pas devis.
              </p>
              <Button
                variant="outline"
                size="sm"
                icon="↓"
                className={s.toolbarAction}
                onClick={() =>
                  downloadCsv(
                    statisticsRows(stats),
                    "eventhemes-statistiques.csv",
                  )
                }
              >
                Exporter les statistiques CSV
              </Button>
            </div>
            <Statistics stats={stats} select={openInquiry} />
          </>
        )}
        {["quotes", "messages", "clients"].includes(tab) && (
          <div className={s.adminPanel}>
            <div className={s.adminToolbar}>
              <SearchInput
                label="Rechercher les demandes"
                className={s.toolbarSearch}
                placeholder="Rechercher une référence, un nom, un e-mail, un statut…"
                value={search}
                onChange={setSearch}
              />
              <Button
                variant="outline"
                size="sm"
                icon="↓"
                className={s.toolbarAction}
                onClick={exportCsv}
              >
                Exporter les contacts CSV
              </Button>
            </div>
            <RequestTable
              inquiries={(tab === "quotes"
                ? quotes
                : tab === "messages"
                  ? messages
                  : inquiries
              ).filter((i) =>
                `${referenceOf(i)} ${i.name} ${i.company} ${i.email} ${i.phone} ${i.status}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )}
              select={setInquiry}
            />
          </div>
        )}
        {tab === "settings" && (
          <SettingsPanel
            entries={entries}
            busy={busy}
            save={(value) => mutate({ action: "save", value })}
          />
        )}
        {contentKinds.includes(tab as Kind) && !edit && (
          <div className={s.adminPanel}>
            <div className={s.adminToolbar}>
              <SearchInput
                label="Rechercher le contenu"
                className={s.toolbarSearch}
                placeholder="Rechercher…"
                value={search}
                onChange={setSearch}
              />
              <Button
                icon="+"
                className={s.toolbarAction}
                onClick={() => setEdit(blankEntry(tab as Kind))}
              >
                Ajouter
              </Button>
            </div>
            {tab === "cities" && (
              <p className={s.caption}>
                Une page par ville où EVENTHEMES intervient (référencement
                local). Les villes proposées sont des brouillons non publiés :
                rédigez un texte propre à chaque ville, puis publiez seulement
                les villes réellement desservies.
              </p>
            )}
            {tab === "pages" && (
              <p className={s.caption}>
                Chaque contenu correspond à une page, choisie dans la liste
                « Page ». Ajoutez « Mentions légales » ou « Politique de
                confidentialité » pour publier vos textes légaux validés.
              </p>
            )}
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Contenu</th>
                    <th>
                      {tab === "socials"
                        ? "Lien"
                        : tab === "categories"
                          ? "Rangement"
                          : "Catégorie / tarif"}
                    </th>
                    <th>Publication</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries
                    .filter(
                      (e) =>
                        e.kind === tab &&
                        `${e.title} ${e.kind === "products" ? `${categoryTrail(entries, e)} ${e.brand ?? ""} ${e.model ?? ""} ${e.reference ?? ""}` : e.category ?? ""}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    )
                    .map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          <strong>{entry.title}</strong>
                          <small>{entry.id}</small>
                        </td>
                        {entry.kind === "socials" ? (
                          <td>
                            {entry.url || "—"}
                            {entry.followers != null && (
                              <small>{followersLabel(entry.followers)}</small>
                            )}
                          </td>
                        ) : entry.kind === "categories" ? (
                          <td>
                            {entry.parent
                              ? `Sous-catégorie de « ${entries.find((c) => c.id === entry.parent)?.title ?? entry.parent} »`
                              : "Catégorie principale"}
                            <small>
                              {(() => {
                                const used = entries.filter(
                                  (product) =>
                                    product.kind === "products" &&
                                    (product.category === entry.id || product.subcategory === entry.id),
                                ).length;
                                return `${used} matériel${used > 1 ? "s" : ""}`;
                              })()}
                            </small>
                          </td>
                        ) : (
                          <td>
                            {(entry.kind === "products" ? categoryTrail(entries, entry) : entry.category) || "—"}
                            <small>
                              {entry.kind === "products" && entry.reference ? `Réf. ${entry.reference} · ` : ""}
                              {priceLabel(entry)}
                            </small>
                          </td>
                        )}
                        <td>
                          <span className={s.status}>
                            {entry.published ? "Publié" : "Brouillon"}
                          </span>
                        </td>
                        <td className={s.tableActions}>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => setEdit(structuredClone(entry))}
                          >
                            Modifier
                          </Button>
                          <Button
                            variant="link"
                            size="sm"
                            danger
                            disabled={busy}
                            onClick={async () => {
                              const confirmed = await confirmDialog({
                                title: `Supprimer « ${entry.title} » ?`,
                                text: "Cette action retire le contenu du site.",
                                confirmText: "Supprimer",
                                danger: true,
                              });
                              if (confirmed)
                                void mutate({ action: "delete", id: entry.id });
                            }}
                          >
                            Supprimer
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!entries.some((e) => e.kind === tab) && (
              <p className={s.empty}>
                Aucun contenu. Ajoutez votre premier élément.
              </p>
            )}
          </div>
        )}
        {edit && (
          <EntryEditor
            entry={edit}
            setEntry={setEdit}
            entries={entries}
            siblings={entries.filter(
              (e) => e.kind === edit.kind && e.id !== edit.id,
            )}
            isNew={!entries.some((e) => e.id === edit.id)}
            busy={busy}
            save={() =>
              mutate({ action: "save", value: withReadableId(edit, entries) }, () => setEdit(null))
            }
            close={() => setEdit(null)}
          />
        )}
        {inquiry && (
          <div ref={detail} className={cx(s.adminPanel, a.detail)}>
            <div className={s.sectionHeading}>
              <div>
                <span className={s.eyebrow}>
                  {kindNames[inquiry.kind].toUpperCase()} · {referenceOf(inquiry)}
                </span>
                <h2>{inquiry.name}</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={<CloseIcon />}
                onClick={() => setInquiry(null)}
              >
                Fermer
              </Button>
            </div>
            <div className={s.formGrid}>
              <div>
                <h3>Coordonnées</h3>
                <p>
                  {inquiry.company && (
                    <>
                      {inquiry.company}
                      <br />
                    </>
                  )}
                  <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
                  <br />
                  <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a>
                  <br />
                  {inquiry.city}
                  {inquiry.address && (
                    <>
                      <br />
                      {inquiry.address}
                    </>
                  )}
                  <br />
                  Contact préféré : {inquiry.contactMethod}
                  {inquiry.locale && inquiry.locale !== "fr" && (
                    <>
                      <br />
                      <strong>Langue : {inquiry.locale === "en" ? "anglais" : "arabe"}</strong> (demande envoyée
                      depuis le site {inquiry.locale === "en" ? "anglais" : "arabe"})
                    </>
                  )}
                </p>
                <p>
                  Reçue le {new Date(inquiry.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
              <div>
                <h3>Événement</h3>
                <p>
                  {entries.find((e) => e.id === inquiry.event && e.kind === "events")?.title ||
                    "Type d’événement non précisé"}
                  <br />
                  {inquiry.date || "Date à préciser"}
                  {inquiry.duration > 0 && ` · ${hoursLabel(inquiry.duration)}`}
                  <br />
                  {participantsLabel(inquiry.guests)}
                  {inquiry.basket.products.length > 0 && (
                    <>
                      <br />
                      Location du matériel : {daysLabel(inquiry.rentalDays || 1)}
                    </>
                  )}
                  {inquiry.budget > 0 && (
                    <>
                      <br />
                      Budget estimatif : {money(inquiry.budget)}
                    </>
                  )}
                </p>
              </div>
            </div>
            {inquiry.kind === "quote" && (
              <>
                <h3>Prestations et matériel</h3>
                <ul className={s.requestSummary}>
                  {inquiry.summary.map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
                <p>
                  Montant indicatif : {money(inquiry.estimate)}{" "}
                  {inquiry.hasUnpriced && "(des postes restent à chiffrer)"}
                </p>
              </>
            )}
            <h3>{inquiry.subject || "Message"}</h3>
            <p className={s.preserve}>
              {inquiry.message || "Aucun message complémentaire."}
            </p>
            {!!inquiry.attachments?.length && (
              <>
                <h3>Pièces jointes</h3>
                <ul className={s.requestSummary}>
                  {inquiry.attachments.map((file) => (
                    <li key={file.id}>
                      <a
                        href={`/api/admin/attachments?demande=${inquiry.id}&fichier=${file.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {file.name} <ArrowUpRightIcon className="inline-icon" />
                      </a>{" "}
                      <small>{sizeLabel(file.size)}</small>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className={s.formGrid}>
              <Select
                label="Statut"
                options={statuses.map((status) => ({
                  value: status,
                  label: status,
                }))}
                value={inquiry.status}
                onChange={(status) => setInquiry({ ...inquiry, status })}
              />
              <Textarea
                label="Notes internes"
                rows={4}
                value={inquiry.notes}
                onChange={(e) =>
                  setInquiry({ ...inquiry, notes: e.target.value })
                }
              />
            </div>
            <div className={s.actions}>
              <Button
                loading={busy}
                onClick={() =>
                  mutate({
                    action: "inquiry",
                    id: inquiry.id,
                    status: inquiry.status,
                    notes: inquiry.notes,
                  })
                }
              >
                Enregistrer le suivi
              </Button>
              <Button
                variant="link"
                danger
                disabled={busy}
                onClick={async () => {
                  const confirmed = await confirmDialog({
                    title: "Supprimer la demande ?",
                    text: `La demande de ${inquiry.name} et ses coordonnées seront supprimées définitivement.`,
                    confirmText: "Supprimer",
                    danger: true,
                  });
                  if (confirmed)
                    void mutate(
                      { action: "deleteInquiry", id: inquiry.id },
                      () => setInquiry(null),
                    );
                }}
              >
                Supprimer la demande
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
function RequestTable({
  inquiries,
  select,
}: {
  inquiries: Inquiry[];
  select: (value: Inquiry) => void;
}) {
  return inquiries.length ? (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>
          <tr>
            <th>Client</th>
            <th>Demande</th>
            <th>Statut</th>
            <th>Reçue le</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {inquiries.map((i) => (
            <tr key={i.id}>
              <td>
                <strong>{i.name}</strong>
                <small>{i.email}</small>
              </td>
              <td>
                {kindNames[i.kind]}
                <small>
                  {[referenceOf(i), i.city || i.subject].filter(Boolean).join(" · ")}
                  {!!i.attachments?.length && ` · ${i.attachments.length} pièce(s) jointe(s)`}
                </small>
              </td>
              <td>
                <StatusPill status={i.status} />
              </td>
              <td>{new Date(i.createdAt).toLocaleDateString("fr-FR")}</td>
              <td>
                <Button
                  variant="link"
                  size="sm"
                  icon={<ArrowUpRightIcon />}
                  onClick={() => select(structuredClone(i))}
                >
                  Ouvrir
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className={s.empty}>
      Aucune demande pour le moment.
      <p>Les messages envoyés depuis le site apparaîtront ici.</p>
    </div>
  );
}
/**
 * Paramètres du site (cahier des charges §07) : informations générales,
 * langues et mise en ligne. Le téléphone, l’e-mail, WhatsApp et les réseaux
 * restent dans « Contact & réseaux ».
 */
function SettingsPanel({
  entries,
  busy,
  save,
}: {
  entries: Entry[];
  busy: boolean;
  save: (entry: Entry) => void;
}) {
  const stored = entries.find((entry) => entry.kind === "settings")?.settings;
  const [settings, setSettings] = useState<SiteSettings>(() => ({
    english: true,
    arabic: true,
    comingSoon: false,
    ...stored,
  }));
  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Fermer le site est une décision lourde : elle est confirmée.
    if (settings.comingSoon && !stored?.comingSoon) {
      const confirmed = await confirmDialog({
        title: "Afficher la page d’attente ?",
        text: "Les visiteurs ne verront plus que la page « Bientôt en ligne » jusqu’à ce que vous décochiez cette option.",
        confirmText: "Afficher la page d’attente",
        danger: true,
      });
      if (!confirmed) return;
    }
    save({
      id: SETTINGS_ID,
      kind: "settings",
      title: "Paramètres du site",
      description: "",
      published: true,
      settings,
    });
  }
  return (
    <form className={s.adminPanel} onSubmit={submit}>
      <fieldset>
        <legend>Informations générales</legend>
        <div className={s.formGrid}>
          <Textarea
            label="Adresse"
            className={s.fullWidth}
            rows={3}
            maxLength={500}
            hint="Affichée sur la page Contact et dans le pied de page, et donnée aux moteurs de recherche. Vide : non affichée."
            value={settings.address || ""}
            onChange={(e) => set("address", e.target.value)}
          />
          <Input
            label="Lien de la carte (facultatif)"
            type="url"
            className={s.fullWidth}
            placeholder="https://maps.app.goo.gl/…"
            hint="Ouvert par « Voir sur la carte » sur la page Contact. Aucune carte n’est intégrée à la page : pas de cookie tiers."
            value={settings.map || ""}
            onChange={(e) => set("map", e.target.value)}
          />
          <Textarea
            label="Horaires d’ouverture"
            rows={4}
            maxLength={1000}
            hint="Une ligne par jour ou par période. Vide : non affichés."
            value={settings.hours || ""}
            onChange={(e) => set("hours", e.target.value)}
          />
          <Textarea
            label="Horaires — version anglaise (facultative)"
            rows={4}
            maxLength={1000}
            hint="Vide : les horaires français sont affichés sur le site anglais."
            placeholder={settings.hours}
            value={settings.hoursEn || ""}
            onChange={(e) => set("hoursEn", e.target.value)}
          />
          <Textarea
            label="Horaires — version arabe (facultative)"
            rows={4}
            maxLength={1000}
            hint="Vide : les horaires français sont affichés sur le site arabe."
            placeholder={settings.hours}
            value={settings.hoursAr || ""}
            onChange={(e) => set("hoursAr", e.target.value)}
            lang="ar"
            dir="rtl"
          />
        </div>
        <p className={s.caption}>
          Téléphone, e-mail, WhatsApp et réseaux sociaux : onglet « Contact &amp; réseaux ».
        </p>
      </fieldset>
      <fieldset>
        <legend>Langues</legend>
        <Checkbox checked={settings.english !== false} onChange={(english) => set("english", english)}>
          Publier la version anglaise du site (/en)
        </Checkbox>
        <Checkbox checked={settings.arabic !== false} onChange={(arabic) => set("arabic", arabic)}>
          Publier la version arabe du site (/ar)
        </Checkbox>
        <p className={s.caption}>
          Une version décochée disparaît du sélecteur de langue, ses pages renvoient vers leur version
          française et le plan du site ne les liste plus. À cocher une fois ses textes validés.
        </p>
      </fieldset>
      <fieldset>
        <legend>Mise en ligne</legend>
        <Checkbox checked={settings.comingSoon === true} onChange={(comingSoon) => set("comingSoon", comingSoon)}>
          Afficher la page d’attente à la place du site public
        </Checkbox>
        <p className={s.caption}>
          Les visiteurs ne voient que la page « Bientôt en ligne », qui n’est pas indexée par les moteurs
          de recherche. L’administration reste accessible.
        </p>
      </fieldset>
      <div className={s.formActions}>
        <Button type="submit" loading={busy}>
          {busy ? "Enregistrement…" : "Enregistrer les paramètres"}
        </Button>
      </div>
    </form>
  );
}
function EntryEditor({
  entry,
  setEntry,
  entries,
  siblings,
  isNew,
  busy,
  save,
  close,
}: {
  entry: Entry;
  setEntry: Dispatch<SetStateAction<Entry | null>>;
  /** Every entry: catalogue categories for the selects. */
  entries: Entry[];
  /** The other entries of the same kind: pages and networks already in use. */
  siblings: Entry[];
  isNew: boolean;
  busy: boolean;
  save: () => void;
  close: () => void;
}) {
  // Functional update: an upload resolving later must not erase edits made meanwhile.
  const set = <K extends keyof Entry>(key: K, value: Entry[K]) =>
    setEntry((current) => current && { ...current, [key]: value });
  const setVariant = (index: number, patch: Partial<Variant>) =>
    setEntry(
      (current) =>
        current && {
          ...current,
          variants: current.variants?.map((v, j) =>
            j === index ? { ...v, ...patch } : v,
          ),
        },
    );
  const [uploading, setUploading] = useState<"image" | "gallery" | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<{
    field: "image" | "gallery";
    message: string;
  } | null>(null);
  async function upload(field: "image" | "gallery", files: File[]) {
    if (!files.length) return;
    setUploadError(null);
    if (
      field === "gallery" &&
      (entry.gallery?.length || 0) + files.length > galleryLimit
    ) {
      setUploadError({
        field,
        message: `La galerie accepte ${galleryLimit} photos maximum.`,
      });
      return;
    }
    setUploading(field);
    try {
      for (const file of files) {
        const url = await uploadPhoto(file);
        setEntry(
          (current) =>
            current &&
            (field === "image"
              ? { ...current, image: url }
              : { ...current, gallery: [...(current.gallery || []), url] }),
        );
      }
    } catch (error) {
      setUploadError({ field, message: (error as Error).message });
    } finally {
      setUploading(null);
    }
  }
  const fields = formFields[entry.kind];
  const has = (field: FormField) => fields.includes(field);
  // Only the home page reads a gallery: the hero slideshow.
  const gallery =
    has("gallery") && (entry.kind !== "pages" || entry.id === "home");
  // A value saved before its list existed stays selectable, so it is never dropped silently.
  const keep = (known: readonly string[], value: string | undefined, why: string) =>
    value && !known.includes(value) ? [{ value, label: value, description: why }] : [];
  const projectTypeOptions = [
    ...keep(projectCategories, entry.category, "Absent du classement : à remplacer"),
    ...projectCategories.map((title) => ({ value: title, label: title })),
  ];
  const mainCategories = topCategories(entries);
  const categoryOptions = [
    ...keep(
      mainCategories.map((c) => c.id),
      entry.kind === "products" ? entry.category : undefined,
      "Catégorie libre d’un contenu antérieur : choisissez-en une de la liste",
    ),
    ...mainCategories.map((c) => ({ value: c.id, label: c.title })),
  ];
  const subcategories = entry.category ? childCategories(entries, entry.category) : [];
  const parentOptions = [
    { value: "", label: "Aucune — catégorie principale" },
    ...mainCategories
      .filter((c) => c.id !== entry.id)
      .map((c) => ({ value: c.id, label: c.title })),
  ];
  const hasChildren = entry.kind === "categories" && childCategories(entries, entry.id).length > 0;
  // Adresse publique de la fiche ; pour un nouveau contenu, celle que donnera son titre.
  const page = pageOf[entry.kind];
  const address = page && pathFor("fr", page, isNew && isGeneratedId(entry.id) ? slugify(entry.title) || "…" : entry.id);
  // Versions traduites (sites /en et /ar) : les champs traduisibles de ce type de contenu.
  const setVersion = (language: TranslatedLocale, field: keyof EntryTranslation, value: string) =>
    setEntry(
      (current) =>
        current && {
          ...current,
          translations: { ...current.translations, [language]: { ...current.translations?.[language], [field]: value } },
        },
    );
  const translatable = has("title") || has("description") || entry.kind === "socials";
  const network = socialNetworkOf(entry);
  const networkInfo = socialNetworks.find((n) => n.key === network);
  const takenNetworks = siblings.map(socialNetworkOf);
  const takenPages = siblings.map((e) => e.id);
  return (
    <form
      className={s.adminPanel}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className={s.sectionHeading}>
        <h2>{entry.title || "Nouveau contenu"}</h2>
        <Button
          variant="link"
          icon={<CloseIcon />}
          onClick={close}
        >
          Annuler
        </Button>
      </div>
      <div className={s.formGrid}>
        {entry.kind === "socials" && (
          <>
            <Select<SocialNetwork>
              label="Réseau"
              required
              options={socialNetworks.map((n) => ({
                value: n.key,
                label: n.label,
                icon: <SocialIcon name={n.key} />,
                disabled: takenNetworks.includes(n.key),
                description: takenNetworks.includes(n.key)
                  ? "Déjà ajouté"
                  : undefined,
              }))}
              value={network ?? ""}
              onChange={(key) =>
                setEntry(
                  (current) =>
                    current && {
                      ...current,
                      network: key,
                      title:
                        socialNetworks.find((n) => n.key === key)?.label ??
                        current.title,
                    },
                )
              }
            />
            <Input
              label="Lien"
              hint="Adresse en https://, mailto: ou tel:"
              required
              placeholder={networkInfo?.placeholder}
              value={entry.url || ""}
              onChange={(e) => set("url", e.target.value)}
            />
            <Input
              label="Nom du compte ou accroche"
              hint="Affiché sur la page Contact, par exemple @eventhemes."
              maxLength={250}
              value={entry.description}
              onChange={(e) => set("description", e.target.value)}
            />
            {networkInfo?.audience && (
              <NumberInput
                label="Nombre d’abonnés"
                hint="Facultatif. Affiché sur la page Contact."
                min={0}
                step={100}
                value={entry.followers ?? null}
                onChange={(followers) =>
                  set("followers", followers ?? undefined)
                }
              />
            )}
          </>
        )}
        {has("title") && (
          <Input
            label={entry.kind === "cities" ? "Ville" : "Titre"}
            required
            maxLength={250}
            hint={entry.kind === "cities" ? "Le nom de la ville, tel qu’il doit apparaître sur le site." : undefined}
            value={entry.title}
            onChange={(e) => set("title", e.target.value)}
          />
        )}
        {address && (
          <p className={cx(s.caption, s.fullWidth)}>
            Adresse de la page : <code>{address}</code>
            {isNew && isGeneratedId(entry.id) ? " (fixée à l’enregistrement, d’après le titre)" : ""}
          </p>
        )}
        {entry.kind === "pages" && (
          <Select
            label="Page"
            required
            disabled={!isNew}
            hint={isNew ? undefined : "La page d’un contenu existant ne change pas."}
            options={[
              ...sitePages,
              // A page saved under an identifier missing from the list stays visible.
              ...(isNew || sitePages.some((p) => p.id === entry.id)
                ? []
                : [{ id: entry.id, label: entry.id }]),
            ].map((page) => ({
              value: page.id,
              label: page.label,
              disabled: isNew && takenPages.includes(page.id),
              description:
                isNew && takenPages.includes(page.id)
                  ? "Déjà créée : modifiez-la depuis la liste"
                  : undefined,
            }))}
            value={
              isNew && !sitePages.some((p) => p.id === entry.id) ? "" : entry.id
            }
            onChange={(id) => set("id", id)}
          />
        )}
        {has("discipline") && (
          <Input
            label="Discipline (surtitre)"
            hint="Affichée au-dessus du titre, par exemple « Son » ou « Lumière »."
            maxLength={60}
            value={entry.category || ""}
            onChange={(e) => set("category", e.target.value)}
          />
        )}
        {has("projectType") && (
          <Select
            label="Type d’événement"
            required
            hint="Classement des réalisations : il alimente les filtres de la galerie."
            options={projectTypeOptions}
            value={entry.category || ""}
            onChange={(category) => set("category", category)}
          />
        )}
        {has("parent") && (
          <Select
            label="Catégorie parente"
            disabled={hasChildren}
            hint={
              hasChildren
                ? "Cette catégorie a des sous-catégories : elle reste une catégorie principale."
                : "Laisser « Aucune » pour une catégorie principale ; sinon, elle devient une sous-catégorie."
            }
            options={parentOptions}
            value={entry.parent || ""}
            onChange={(parent) => set("parent", parent || undefined)}
          />
        )}
        {has("catalogue") && (
          <>
            <Select
              label="Catégorie"
              required
              hint="Liste gérée dans l’onglet « Catégories du matériel »."
              emptyText="Ajoutez d’abord une catégorie dans « Catégories du matériel »."
              options={categoryOptions}
              value={entry.category || ""}
              onChange={(category) =>
                setEntry(
                  (current) =>
                    current && {
                      ...current,
                      category,
                      // A sub-category always belongs to the chosen category.
                      subcategory: childCategories(entries, category).some((c) => c.id === current.subcategory)
                        ? current.subcategory
                        : undefined,
                    },
                )
              }
            />
            <Select
              label="Sous-catégorie (type de matériel)"
              disabled={!subcategories.length}
              hint={
                subcategories.length
                  ? "Facultative : elle affine le filtre du catalogue."
                  : "Cette catégorie n’a pas de sous-catégorie."
              }
              options={[
                { value: "", label: "Aucune" },
                ...subcategories.map((c) => ({ value: c.id, label: c.title })),
              ]}
              value={entry.subcategory || ""}
              onChange={(subcategory) => set("subcategory", subcategory || undefined)}
            />
          </>
        )}
        {has("identity") && (
          <>
            <Input
              label="Marque"
              hint="Lorsqu’elle est connue. Elle apparaît sur la fiche et dans le filtre « Marque »."
              maxLength={250}
              value={entry.brand || ""}
              onChange={(e) => set("brand", e.target.value)}
            />
            <Input
              label="Modèle"
              maxLength={250}
              value={entry.model || ""}
              onChange={(e) => set("model", e.target.value)}
            />
            <Input
              label="Référence interne (facultatif)"
              hint="Affichée sur la fiche ; la recherche du catalogue la trouve."
              maxLength={250}
              value={entry.reference || ""}
              onChange={(e) => set("reference", e.target.value)}
            />
          </>
        )}
        {has("subtitle") && (
          <Input
            label={entry.kind === "cities" ? "Titre de la page (facultatif)" : "Sous-titre / surtitre"}
            hint={
              entry.kind === "cities"
                ? `Vide : « Production technique événementielle à ${entry.title || "…"} ».`
                : undefined
            }
            className={s.fullWidth}
            value={entry.subtitle || ""}
            onChange={(e) => set("subtitle", e.target.value)}
          />
        )}
        {has("description") && (
          <Textarea
            label={entry.kind === "cities" ? "Texte de la page" : "Description"}
            hint={
              entry.kind === "cities"
                ? "Propre à cette ville : lieux, types d’événements, délais, logistique. Un texte copié d’une ville à l’autre nuit au référencement."
                : undefined
            }
            className={s.fullWidth}
            rows={entry.kind === "cities" ? 7 : 4}
            maxLength={10000}
            value={entry.description}
            onChange={(e) => set("description", e.target.value)}
          />
        )}
        {has("related") && (
          <fieldset className={cx(s.fullWidth, s.relatedField)}>
            <legend>Matériel associé (affiché sur la page du service)</legend>
            <div className={s.checkGrid}>
              {mainCategories.map((category) => (
                <Checkbox
                  key={category.id}
                  checked={entry.related?.includes(category.id) ?? false}
                  onChange={(on) =>
                    set(
                      "related",
                      on
                        ? [...(entry.related ?? []), category.id]
                        : (entry.related ?? []).filter((id) => id !== category.id),
                    )
                  }
                >
                  {category.title}
                </Checkbox>
              ))}
            </div>
          </fieldset>
        )}
        {has("items") && (
          <Textarea
            label={
              entry.kind === "services"
                ? "Prestations incluses (une par ligne)"
                : "Prestations réalisées (une par ligne)"
            }
            hint={
              entry.kind === "services"
                ? "Vide : la liste du cahier des charges est affichée."
                : "Facultatif : affichées sur la fiche du projet."
            }
            className={s.fullWidth}
            rows={5}
            value={entry.specifications || ""}
            onChange={(e) => set("specifications", e.target.value)}
          />
        )}
        {has("image") && (
          <div className={cx(s.fullWidth, s.photoField)}>
            {entry.image && (
              <div className={s.photoThumb}>
                <img src={entry.image} alt="Photo actuelle" />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Retirer la photo"
                  disabled={uploading !== null}
                  onClick={() => set("image", undefined)}
                >
                  <CloseIcon />
                </Button>
              </div>
            )}
            <FileInput
              label={entry.image ? "Remplacer la photo" : "Importer une photo"}
              hint="JPEG, PNG ou WebP, 8 Mo maximum."
              error={
                uploadError?.field === "image" ? uploadError.message : undefined
              }
              accept="image/jpeg,image/png,image/webp"
              loading={uploading === "image"}
              disabled={uploading === "gallery"}
              onFiles={(files) => void upload("image", files)}
            />
          </div>
        )}
        {gallery && (
          <div className={cx(s.fullWidth, s.photoField)}>
            {!!entry.gallery?.length && (
              <ul className={s.photoGrid} aria-label="Photos de la galerie">
                {entry.gallery.map((url, i) => (
                  <li className={s.photoThumb} key={`${i}-${url}`}>
                    <img src={url} alt={`Galerie, photo ${i + 1}`} />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Retirer la photo ${i + 1} de la galerie`}
                      disabled={uploading !== null}
                      onClick={() =>
                        set(
                          "gallery",
                          entry.gallery?.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <CloseIcon />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <FileInput
              label={
                entry.kind === "pages"
                  ? "Ajouter des photos au diaporama d’accueil"
                  : "Ajouter des photos à la galerie"
              }
              hint={`Sélection multiple possible. JPEG, PNG ou WebP, 8 Mo par photo, ${galleryLimit} photos maximum.`}
              error={
                uploadError?.field === "gallery"
                  ? uploadError.message
                  : undefined
              }
              multiple
              accept="image/jpeg,image/png,image/webp"
              loading={uploading === "gallery"}
              disabled={
                uploading === "image" ||
                (entry.gallery?.length || 0) >= galleryLimit
              }
              onFiles={(files) => void upload("gallery", files)}
            />
          </div>
        )}
        {has("price") && (
          <>
            <NumberInput
              label="Prix indicatif"
              hint="Laisser vide pour un tarif sur devis."
              min={0}
              step={10}
              decimals={2}
              suffix="MAD"
              value={entry.price ?? null}
              onChange={(price) => set("price", price)}
            />
            <Select<NonNullable<Entry["pricing"]>>
              label="Mode de tarification"
              options={[
                { value: "request", label: "Sur demande" },
                { value: "fixed", label: "Prix fixe" },
                { value: "from", label: "À partir de" },
                ...(entry.kind === "products"
                  ? [
                      {
                        value: "daily" as const,
                        label: "Par quantité et par jour",
                      },
                    ]
                  : []),
              ]}
              value={entry.pricing || "fixed"}
              onChange={(pricing) => set("pricing", pricing)}
            />
          </>
        )}
        {has("product") && (
          <>
            <ColorInput
              label="Couleur / finition"
              hint="La pastille ouvre le nuancier ; le nom apparaît sur la fiche produit et dans le filtre du catalogue."
              placeholder="Doré, bois naturel, blanc mat…"
              value={{ name: entry.color || "", swatch: entry.swatch }}
              onChange={({ name, swatch }) => {
                set("color", name);
                set("swatch", swatch);
              }}
            />
            <div className={s.dimensions}>
              <NumberInput
                label="Longueur"
                min={0}
                decimals={1}
                controls={false}
                suffix="cm"
                value={entry.length ?? null}
                onChange={(length) => set("length", length ?? undefined)}
              />
              <NumberInput
                label="Largeur"
                min={0}
                decimals={1}
                controls={false}
                suffix="cm"
                value={entry.width ?? null}
                onChange={(width) => set("width", width ?? undefined)}
              />
            </div>
            <Textarea
              label="Caractéristiques techniques"
              hint="Une par ligne. « Puissance : 1 000 W » s’affiche en tableau sur la fiche."
              className={s.fullWidth}
              value={entry.specifications || ""}
              onChange={(e) => set("specifications", e.target.value)}
            />
          </>
        )}
        {has("project") && (
          <>
            <Input
              label="Lieu"
              value={entry.location || ""}
              onChange={(e) => set("location", e.target.value)}
            />
            <YearPicker
              label="Année"
              max={new Date().getFullYear()}
              value={entry.date || ""}
              onChange={(year) => set("date", year)}
            />
            <Input
              label="Vidéo (URL https)"
              type="url"
              value={entry.video || ""}
              onChange={(e) => set("video", e.target.value)}
            />
          </>
        )}
        {/* The on/off settings sit together, after the fields. */}
        <div className={cx(s.fullWidth, s.checkRow)}>
          {has("product") && (
            <Checkbox
              checked={entry.available !== false}
              onChange={(available) => set("available", available)}
            >
              Disponible (à confirmer selon la date)
            </Checkbox>
          )}
          {entry.kind !== "categories" && (
            <Checkbox
              checked={entry.published}
              onChange={(published) => set("published", published)}
            >
              Publié sur le site
            </Checkbox>
          )}
          {has("demo") && (
            <Checkbox
              checked={entry.demo || false}
              onChange={(demo) => set("demo", demo)}
            >
              Contenu de démonstration / inspiration
            </Checkbox>
          )}
        </div>
      </div>
      {has("variants") && (
        <fieldset className={s.variants}>
          <legend>Variantes, prix et dimensions de remplacement</legend>
          {entry.variants?.map((variant, i) => (
            <div className={s.variantRow} key={i}>
              <Input
                label="Nom de la variante"
                className={s.variantName}
                required
                value={variant.name}
                onChange={(e) => setVariant(i, { name: e.target.value })}
              />
              <NumberInput
                label="Prix"
                className={s.variantPrice}
                min={0}
                step={10}
                decimals={2}
                suffix="MAD"
                value={variant.price ?? null}
                onChange={(price) => setVariant(i, { price })}
              />
              <NumberInput
                label="Longueur"
                className={s.variantLength}
                min={0}
                decimals={1}
                controls={false}
                suffix="cm"
                value={variant.length ?? null}
                onChange={(length) =>
                  setVariant(i, { length: length ?? undefined })
                }
              />
              <NumberInput
                label="Largeur"
                className={s.variantWidth}
                min={0}
                decimals={1}
                controls={false}
                suffix="cm"
                value={variant.width ?? null}
                onChange={(width) =>
                  setVariant(i, { width: width ?? undefined })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                danger
                className={s.variantRemove}
                aria-label={`Supprimer la variante ${variant.name}`}
                onClick={() =>
                  set(
                    "variants",
                    entry.variants?.filter((_, j) => j !== i),
                  )
                }
              >
                <CloseIcon />
              </Button>
            </div>
          ))}
          <Button
            variant="link"
            icon="+"
            onClick={() =>
              set("variants", [
                ...(entry.variants || []),
                { name: "", price: null },
              ])
            }
          >
            Ajouter une variante
          </Button>
          <p className={s.caption}>
            Le prix de la variante remplace le prix principal. Un prix vide
            reste sur devis. Le mode « sur demande » prévaut sur tous les prix.
            Une longueur ou une largeur vide reprend celle du produit.
          </p>
        </fieldset>
      )}
      {translatable &&
        translatedLocales.map((language) => {
          const version = entry.translations?.[language] ?? {};
          const setField = (name: keyof EntryTranslation, value: string) => setVersion(language, name, value);
          // Les champs arabes se saisissent de droite à gauche.
          const text = { lang: language, dir: direction(language) } as const;
          return (
        <fieldset key={language} className={s.translation}>
          <legend>{language === "en" ? "Version anglaise (facultative)" : "Version arabe (facultative)"}</legend>
          <p className={s.caption}>
            {language === "en"
              ? "Affichée sur le site anglais (/en)."
              : "Affichée sur le site arabe (/ar), écrit de droite à gauche."}{" "}
            Un champ vide reprend le texte français, indiqué en gris.
          </p>
          <div className={s.formGrid}>
            {entry.kind === "socials" && (
              <Input
                label="Accroche"
                hint="Le nom du compte (@…) n’a pas besoin d’être traduit."
                maxLength={250}
                placeholder={entry.description}
                value={version.description || ""}
                onChange={(e) => setField("description", e.target.value)}
                {...text}
              />
            )}
            {has("title") && (
              <Input
                label="Titre"
                maxLength={250}
                placeholder={entry.title}
                value={version.title || ""}
                onChange={(e) => setField("title", e.target.value)}
                {...text}
              />
            )}
            {has("discipline") && (
              <Input
                label="Discipline (surtitre)"
                maxLength={60}
                placeholder={entry.category}
                value={version.category || ""}
                onChange={(e) => setField("category", e.target.value)}
                {...text}
              />
            )}
            {has("subtitle") && (
              <Input
                label="Sous-titre / surtitre"
                className={s.fullWidth}
                placeholder={entry.subtitle}
                value={version.subtitle || ""}
                onChange={(e) => setField("subtitle", e.target.value)}
                {...text}
              />
            )}
            {has("description") && (
              <Textarea
                label="Description"
                className={s.fullWidth}
                rows={4}
                maxLength={10000}
                placeholder={entry.description}
                value={version.description || ""}
                onChange={(e) => setField("description", e.target.value)}
                {...text}
              />
            )}
            {has("product") && (
              <Input
                label="Couleur / finition"
                maxLength={250}
                placeholder={entry.color}
                value={version.color || ""}
                onChange={(e) => setField("color", e.target.value)}
                {...text}
              />
            )}
            {has("variants") && !!entry.variants?.length && (
              <Textarea
                label="Noms des variantes (un par ligne)"
                hint="Dans le même ordre que les variantes ci-dessus ; une ligne vide garde le nom français."
                className={s.fullWidth}
                rows={Math.min(6, entry.variants.length)}
                placeholder={entry.variants.map((variant) => variant.name).join("\n")}
                value={version.variants || ""}
                onChange={(e) => setField("variants", e.target.value)}
                {...text}
              />
            )}
            {(has("items") || has("product")) && (
              <Textarea
                label={
                  has("product")
                    ? "Caractéristiques techniques"
                    : entry.kind === "services"
                      ? "Prestations incluses (une par ligne)"
                      : "Prestations réalisées (une par ligne)"
                }
                hint={
                  entry.kind === "services"
                    ? "Vide : la liste par défaut, traduite, est affichée."
                    : "Une par ligne, dans le même ordre que le français."
                }
                className={s.fullWidth}
                rows={5}
                placeholder={entry.specifications}
                value={version.specifications || ""}
                onChange={(e) => setField("specifications", e.target.value)}
                {...text}
              />
            )}
          </div>
        </fieldset>
          );
        })}
      <div className={s.formActions}>
        <Button type="submit" loading={busy} disabled={uploading !== null}>
          {busy ? "Enregistrement…" : "Enregistrer les modifications"}
        </Button>
      </div>
    </form>
  );
}
