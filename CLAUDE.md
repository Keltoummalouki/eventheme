# CLAUDE.md — EVENTHEMES

## Project Context

EVENTHEMES is a Moroccan **event technical production and equipment rental** company: technical and audiovisual solutions for events of every size. It supplies, rents, installs and operates the equipment that professional and private events need: stages, truss structures, LED screens and video, sound, lighting and technical control (_régie_).

Audience: companies, institutions, event agencies and private clients in Morocco.

This repository is its official website: a premium showcase, an interactive equipment catalogue, a multi-step quote request system, and a back office.

Proposed creative tagline (from the spec, still to be validated by EVENTHEMES):

> WE ENGINEER THE EXPERIENCE.

Client journey (spec §05):

```text
Découvrir → Explorer le catalogue → Sélectionner (matériel + prestations) → Personnaliser (infos événement) → Envoyer → Suivi commercial
```

---

## Sources of Truth

1. **The EVENTHEMES cahier des charges** (« Conception & développement du site web », supplied 2026-11-14, summarised in this file) is authoritative for brand, content, pages, features and requirements. It wins every conflict.
2. **Stack decisions (user):** Next.js front-end with a Supabase backend (2026-09-18). The spec's §09 table is a list of « pistes techniques » for the developer to validate: Supabase covers PostgreSQL and S3-compatible media storage; **CSS Modules with design tokens are kept instead of Tailwind** (2026-11-14).
3. **Superseded:** the earlier EVENTHEME brief (organisation, animation, décoration; golden butterflies; Cormorant/Cinzel; « Votre événement. Votre vision. Notre savoir-faire. »). Do not reintroduce its services, copy, palette, fonts or motifs.
4. **`aurelys-maquette .html`** (space in the filename) remains a reference only for interaction quality, spacing and motion. Never for brand, colours, fonts or copy.

---

## Current State (2026-11-14)

**Built and working:**

- Multi-page App Router site: `/`, `/a-propos`, `/services`, `/services/[id]`, `/materiel`, `/materiel/[id]`, `/realisations`, `/realisations/[id]`, `/villes`, `/villes/[id]`, `/contact`, `/devis`, `/mentions-legales`, `/politique-de-confidentialite`, `/bientot` (coming soon, not enforced). `/location*` and `/evenements` redirect (308) to their replacements.
- Rebrand to EVENTHEMES: tokens, Space Grotesk + Inter, copy, technical demo content, truss motif (`src/components/ui/Truss.tsx`), 3D truss rig in the hero (`HeroSculpture.tsx`, three.js, lazy-loaded with an SVG fallback).
- Home in spec order: hero → introduction → expertises → réalisations → matériel → « Pourquoi EVENTHEMES » → quote studio → final CTA.
- Catalogue: categories and sub-categories managed as content (`kind: "categories"`, products reference them by id; helpers in `src/lib/eventheme/catalogue.ts`), filters by category, sub-category, brand, colour, price and availability, search by name, brand, model and reference, `?categorie=` preselection. Product sheets: brand, model, reference, specs table, variants, quantity, availability note, WhatsApp link. « Ajouter au devis » basket persisted across pages.
- Quote studio (`QuoteStudio.tsx`): callback request first (name, optional company, phone, optional e-mail, event type, consent), then an optional five-step configuration (événement, prestations, matériel, détails, récapitulatif) with live indicative estimate and a printable summary. Only event type, date and city are required; participants and budget are optional. Up to 3 attachments (PDF/JPG/PNG/WebP, 4 MB each, type checked on content, large photos shrunk in the browser) go to `/api/inquiries/attachments` under the request's continuation token. Every request gets a readable reference `EVT-AAAA-NNNN` (Postgres sequence in production). WhatsApp message prefilled when the business number is configured.
- Admin at `/admin` (Supabase Auth, `app_metadata.role = "admin"`): dashboard, statistics, requests (reference, budget, participants, attachments downloaded through `/api/admin/attachments`), messages, clients, CRUD for services (with related catalogue categories), products, catalogue categories, event types, projects, page texts, service areas (cities), socials; optional English version of each; CSV export.
- Data layer `src/lib/eventheme/server.ts`: local JSON store in development (`.eventheme/data.json`, git-ignored), Supabase when `EVENTHEME_DATA_MODE=supabase`. Migrations and a generated public seed in `supabase/`. RLS on every table, server-side validation, origin checks, DB rate limiting.
- Automatic e-mails after each request (`after()` in `/api/inquiries`): team alert and client acknowledgement. Templates and provider payloads are pure (`src/lib/eventheme/emails.ts`); sending in `mailer.ts` through Resend or Brevo HTTP APIs with `fetch` (no SDK), chosen by `EMAIL_PROVIDER`; recipients and anti-abuse limits in `notifications.ts`. Without a provider: previews in `.eventheme/emails/` locally, nothing in production. A failed e-mail never fails a request; a retried completion never re-sends.
- Languages: French at `/`, English under `/en/…` with English slugs (`/en/equipment`, `/en/quote`…). Routing helpers in `src/lib/i18n.ts` (`pathFor`, `routeOf`, `translatePath`, `alternatesFor`); the proxy passes the page language to the root layout (`<html lang>`, metadata, content); hreflang alternates on every page and in the sitemap; language switcher in the header and mobile menu. Interface texts live in `src/data/locales/fr.ts` (reference) and `en.ts` (English draft, to be validated by EVENTHEMES); components read `t`, `locale` and `href(key, id)` from `useEventheme()`. Staff content has an optional « Version anglaise » in the admin (`entry.translations.en`: title, subtitle, description, specifications, service discipline, colour, option names), merged server-side by `localizeEntries`; an empty field falls back to French. Each request records its language (`inquiry.locale`, from the `X-Locale` header): API errors (`translateServerError`) and the client acknowledgement follow it; the team alert stays French and flags English requests.
- `npm test` (node:test via tsx), lint, typecheck; smoke scripts in `tests/*.mjs`.

- SEO (spec §10): one page per service (`ServicePages.tsx`: included services, related catalogue categories chosen in the admin, other services, cities served) and one page per published city (« Zones d’intervention », content kind `cities`, migration `20261114200000`; the `/villes` index exists only when a city is published; the city drafts in the seed are unpublished). JSON-LD from `src/lib/eventheme/structured.ts` (Organization and WebSite on the home page, BreadcrumbList on service, city and detail pages, Service on service and city pages; nothing for demo content). Sitemap with both languages, services and published cities, without demo entries; demo sheets are `noindex, follow`. New content gets a readable id from its title (`src/lib/slug.ts`), which becomes its address.
- Analytics with consent (`audience.ts`, `Consent.tsx`): off unless `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set at build time; then a consent banner, Google Analytics loaded only after « Accepter » (Google signals and ad personalisation off), withdrawal from the footer (« Gérer les cookies »), and events without personal data (`generate_lead`, `add_to_quote`, `contact_click`). Search Console verification through `GOOGLE_SITE_VERIFICATION`.

**Not built yet (see Roadmap):** the Settings admin module, Arabic (optional, right-to-left), Safari/Firefox and performance audits on the deployed site. « Archiver » a product is unpublishing it: it stays in the admin.

**Inherited, unused modules** (AURÉLYS single-page era; nothing imports them): `src/data/{site,hero,services,stats,testimonials,calculator}.ts`, `src/lib/pricing.ts`, `src/components/sections/{EventCalculator,Stats,StatCounter,Testimonials,EventTypes}.*`. Ask before deleting or repurposing them; never present their figures as EVENTHEMES facts.

Internal identifiers keep the historical `eventheme` spelling on purpose: the `src/components/eventheme/` and `src/lib/eventheme/` folders, `useEventheme`, the `EVENTHEME_DATA_MODE` variable, the `eventheme-media` bucket, `.eventheme/`. Renaming them breaks deployments and stored data for no visible gain. User-facing text always says **EVENTHEMES**.

---

## Brand

### Positioning

Three values (spec §02): **puissance technique, excellence professionnelle, innovation audiovisuelle**. Style: minimalist, premium, cinematic, technical. « Spectaculaire sans devenir chargé » — readability, speed and accessibility come first.

### Colour Palette (spec §02)

| Spec name | Hex | Token | Use |
| --- | --- | --- | --- |
| Noir profond | `#08090B` | `--noir` | Main background, premium sections |
| Or | `#C9A24A` | `--or` | Accents, separators, details |
| Argent | `#C5C8CE` | `--argent` | Technical details, secondary elements, body copy on dark |
| Blanc | `#FFFFFF` | `--blanc` | Text and contrast |
| Gris | `#858990` | `--gris` | Secondary text (5.7:1 on `--noir`) |

Derived tokens in `src/styles/tokens.css` are mixes of palette colours only: surfaces `--noir-2/3/4`, gold states `--or-clair` / `--or-profond`, hairlines `--ligne` (gold) and `--ligne-argent`. Transparent variants of palette colours are fine; new hues are not (the destructive `--rouge` is the one agreed exception). Never hard-code colours in components: use tokens.

### Typography (spec §02)

- **Headings:** Space Grotesk (`--ff-display`). Sora is the spec's alternative; Space Grotesk was chosen because the spec also uses it for numbers, so one family covers both.
- **Body and UI:** Inter (`--ff-body`).
- **Numbers and data:** Space Grotesk (`--ff-data`).
- Both are variable fonts loaded through `next/font` in `src/app/layout.tsx`. Neither display face is set in italic: accents are colour (gold), not italics.

### Graphic Principles

Large-format photography and immersive video; geometric grids inspired by **truss structures** (`<Truss />` ornament, the 3D rig); coherent technical iconography; fluid, useful animation. No golden butterflies or floral motifs.

**Logo:** `public/eventheme_logo*.webp` is the client's existing script « EvenTheme » logo with a butterfly. It predates this spec and lacks the S. Keep it until EVENTHEMES supplies a logo for the new identity; never invent one.

### Tone

Polished French: precise, technical, premium, reassuring. The English tagline is marked `lang="en"` wherever it appears (`brand.signature`, `isSignature()` in `src/data/eventheme.ts`).

**Never invent facts.** Key figures only when real and verifiable; projects only when real and authorised for publication; no client names, testimonials, brands, models, prices or contact details unless EVENTHEMES supplies them. Demo content is marked `demo: true` and labelled « Exemple » / « Inspiration » / « Photographie d’illustration ».

---

## Site Structure (spec §03)

| Spec page | Route | Notes |
| --- | --- | --- |
| Home | `/` | |
| About | `/a-propos` | |
| Services | `/services`, `/services/[id]` | One page per service |
| Equipment | `/materiel`, `/materiel/[id]` | Content id of the page text: `location-page` (kept for data stability) |
| Projects | `/realisations`, `/realisations/[id]` | |
| Request a Quote | `/devis` | « Mon devis » button in the header and mobile menu |
| Contact | `/contact` | |
| Legal | `/mentions-legales`, `/politique-de-confidentialite` | |
| Service areas | `/villes`, `/villes/[id]` | One page per published city; drafts stay hidden |
| Back office | `/admin` | Authenticated |

English: the same pages under `/en` with English slugs (`/en/about`, `/en/services`, `/en/equipment`, `/en/projects`, `/en/contact`, `/en/quote`, `/en/legal-notice`, `/en/privacy-policy`). The admin stays in French.

Main menu: Accueil · À propos · Services · Matériel · Réalisations · Contact, plus the highlighted « Mon devis » button (reachable on mobile).

---

## Page Requirements (spec §04)

**Home:** full-screen stage visual or video with clear navigation, main message and CTAs; introduction; Our Expertise; Featured Projects; Technical Equipment (overview of equipment categories); Why EVENTHEMES (équipements professionnels, expertise technique, solutions adaptées, exécution fiable); Chiffres clés (**real, verifiable data only**: not shown until supplied); final CTA to request a quote.

**About:** company presentation, vision and mission, values, technical expertise, methodology, team (only if information and visuals exist). Vision/mission and team await EVENTHEMES content.

**Services:**

| Service | Content |
| --- | --- |
| Scènes & Podiums | Scènes modulaires, podiums, plateformes et installations |
| Structures & Truss | Structures aluminium, roof systems, supports et rigging |
| Écrans LED & Vidéo | Murs LED, écrans géants, diffusion et solutions vidéo |
| Sonorisation | Systèmes audio, enceintes, microphones et consoles |
| Éclairage professionnel | Moving heads, PAR LED, éclairage architectural, effets lumineux |
| Régie technique | Régie son, lumière, vidéo, coordination et exploitation technique |
| Services complémentaires | Effets spéciaux, installation, exploitation et démontage |

**Equipment catalogue:** organised by categories **and sub-categories**; per item: professional photo, name, **brand and model when available**, description and technical specifications, category, optional internal reference, availability « à confirmer », « Ajouter au devis ». Filters by category, **brand** and equipment type; search by name, **brand or reference**. Prices may be « sur demande »; availability and final price are always confirmed by the team according to date, quantity, duration and place.

**Projects:** filter by Galas, Événements corporate, Concerts, Événements privés, Festivals, Conférences. Each project may have name, event type, city, photos, video and services delivered. Only real, authorised projects.

**Request a Quote:** multi-step form with a summary before sending, easy on mobile, **required fields kept to the strict minimum**.

**Contact:** phone and WhatsApp, e-mail, address and map if available, social networks, contact form.

**Event types (spec §01):** Galas & cérémonies · Soirées privées et professionnelles · Concerts & festivals · Événements corporate · Conférences & séminaires · Lancements de produits · Anniversaires et événements privés.

---

## Quote System (spec §05)

Form fields:

- **Client:** nom complet, entreprise (optional), téléphone, e-mail.
- **Événement:** type, date, ville, lieu, nombre estimé de **participants**.
- **Prestations:** scène, structure, LED, son, lumière, régie, autres besoins.
- **Matériel:** catalogue items and quantities.
- **Détails:** project description, optional estimated budget, **attachments** (plans, photos, documents).
- **Confirmation:** summary, privacy-policy consent, send.

After sending: generate a **unique reference number**, notify the admin team, send an acknowledgement to the client, offer direct WhatsApp access, save the request in the back office. No online payment. Any amount shown is indicative, never a quotation.

Attachments are private client documents: they go to a **private** Storage bucket served through signed URLs, never to the public `eventheme-media` bucket.

---

## Back Office (spec §07)

Modules: Dashboard, Equipment (add, edit, **archive**, organise), **Categories** (with sub-categories), Projects, Services, Requests (status changes), Clients, Messages, **Settings** (general information, languages, parameters).

Request statuses (spec): `Nouveau` · `En cours de traitement` · `Devis envoyé` · `Accepté` · `Refusé` · `Terminé`. Former values (`Nouvelle demande`, `Confirmé`, `Annulé`) are mapped when read (`normalizeStatus`) and rewritten by migration `20261114180000`.

Supabase rules: RLS on every table (visitors read published content; only server code creates requests; only admins read requests or edit content); secret keys server-side only, never `NEXT_PUBLIC_*`; admin accounts via Supabase Auth with no public sign-up; schema changes as versioned migrations in `supabase/migrations/`; required variables listed in `.env.example`. E-mail: Resend and Brevo adapters exist; which one to use, and the account and sending domain, are EVENTHEMES' decision (configuration only). Ask before adding another provider or an SDK.

---

## Cross-cutting Requirements

- **Languages (spec §11):** French (main), English, Arabic (optional, with RTL). Never hard-code copy in JSX: add the key to `fr.ts` **and** `en.ts` (`tests/i18n.test.ts` fails if keys, list lengths or `{placeholders}` differ) and read it through `t`. Links go through `href(key, id)` / `pathFor`, never a literal French path. Formatting helpers (`money`, `priceLabel`, `participantsLabel`, `daysLabel`, `sizeLabel`, `formatLongDate`…) take the locale. Stored values stay French (project types, contact methods, option names, server error messages) and are labelled per language at display (`projectCategoryLabel`, `contactMethodLabel`, `variantLabel`, `translateServerError`). Use CSS logical properties in new styles so RTL stays possible.
- **Responsive:** desktop, laptop, tablet, phone; menus, galleries, filters, forms and catalogue usable on small screens; no horizontal scroll.
- **Animation (spec §08):** smooth scrolling, reveal on scroll, light cinematic transitions, discreet hovers, subtle parallax, animated counters only for real figures, micro-interactions. Never slow the site or block low-power devices; honour `prefers-reduced-motion`.
- **Accessibility:** semantic HTML, keyboard navigation, visible focus, sufficient contrast, labelled inputs, meaningful alt text.
- **SEO (spec §10):** clean URLs, unique meta titles and descriptions, dedicated pages for services and relevant service areas (cities), XML sitemap, robots.txt, relevant structured data, Search Console and a compliant analytics tool.
- **Performance:** WebP/AVIF images, compressed video, lazy-loaded non-critical media, few dependencies (`animejs` was removed: GSAP covers every animation).
- **CSS order:** development and production load CSS Modules in different orders. A primitive whose parent passes a `className` (for example `Truss`) keeps its base rules under `:where()`, so the parent's class always wins.
- **Security and privacy:** SSL, validated and spam-protected forms, backups and updates, data-protection rules; client data visible only to authorised staff.

---

## Technical Principles

**Stack:** Next.js (App Router), React 19, TypeScript, CSS Modules with design tokens, GSAP (`gsap`, `@gsap/react`), Lenis smooth scrolling on the home page, three.js for the hero rig, `next/font`, Supabase (Postgres, Auth, Storage). No UI framework, no utility-class library.

**Code organisation (keep it):**

- `src/data/`: static content and options. `eventheme.ts` holds the brand constants, imagery, navigation keys, project types and the demo seed (with English drafts); `locales/` holds the interface texts per language (`fr.ts`, `en.ts`) and the server error translations (`errors.ts`).
- `src/lib/`: pure, testable logic (pricing, validation, WhatsApp, dates, motion core, `i18n.ts` routing).
- `src/hooks/`: behaviour.
- `src/components/`: `eventheme/` (site shell, pages, admin, quote), `layout/`, `sections/` (home sections), `ui/` (primitives, forms, `Truss`).
- `src/styles/`: tokens, base styles, utilities.

Repeated content is data-driven, never hard-coded in JSX. Anything staff must edit lives in the content store (local JSON in development, Supabase in production), not in `src/data`.

**Motion rules** (`src/lib/motion.ts`): ornament goes through `motionSafe`, scroll-revealed content through `revealSafe`; always `fromTo`, never `from`; one property, one owner; animate `transform` and `opacity`.

**Checks:** `npm run lint`, `npm run typecheck` and `npm test` before calling work done; `npm run build` for anything touching routing, metadata or server code. Visual changes should be checked at desktop, tablet and phone widths.

---

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Lock the direction: this file, README, baseline commit | Done |
| 1 | Rebrand: name, palette, fonts, copy, navigation, home order, truss motif, technical demo content | Done |
| 2 | Catalogue and quote: brand/model/reference, categories and sub-categories, private attachments, reference numbers, new statuses, « participants », minimal required fields | Done |
| 3 | E-mails: admin notification and client acknowledgement | Done (provider account and `EMAIL_*` variables to configure) |
| 4 | Languages: FR/EN routing and content model, then optional AR with RTL | FR/EN done (English texts to validate by EVENTHEMES); Arabic optional, later |
| 5 | SEO and launch: service and city pages, structured data, analytics with consent, legal pages, performance and cross-browser checks | Service and city pages, structured data, sitemap, analytics with consent and Search Console done; cities, legal texts, Analytics ID and Search Console token await EVENTHEMES; audits after deployment |

---

## Contact & Social Links

- Instagram: https://www.instagram.com/eventhemes/
- WhatsApp: https://wa.me/message/AREDMVCCJW5GM1 (short link: its message is fixed in WhatsApp Business; per-request prefilled messages need `https://wa.me/<number>`).

Still to be supplied by EVENTHEMES: logo for the new identity, phone, e-mail, address, opening hours, real equipment list (brands, models, specs, photos), authorised projects, verifiable key figures, vision/mission and team content, legal texts. Keep clearly marked placeholders until they arrive.

---

## Deliverables & Acceptance (spec §12)

Deliverables include the sitemap and user journeys, wireframes, desktop and mobile UI mockups (Figma), a design system (colours, type, components, states), front-end and back-end, the administrable catalogue, the quote system, integration of validated content, SEO and analytics setup, tests, launch and user documentation.

Acceptance: every page and navigation works; responsive on all planned formats; catalogue administrable with working filters; add-to-quote and summary work; requests, notifications and acknowledgements tested; secure admin; optimised images and videos; no known blocking bug; content, links, forms and legal notices checked.

---

## Golden Rule

Before building anything, ask:

> Does this present EVENTHEMES as a powerful, professional and innovative technical partner, and does it make it easier for a visitor to send a complete, qualified quote request?
