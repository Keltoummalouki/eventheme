# EVENTHEMES

**Event Technical Production & Equipment Rental — Maroc.**

Official website of EVENTHEMES: a premium showcase, an interactive equipment catalogue, a multi-step quote request system and a back office. EVENTHEMES supplies, rents, installs and operates the technical and audiovisual equipment of professional and private events: stages and podiums, truss structures, LED screens and video, sound, lighting and technical control.

> WE ENGINEER THE EXPERIENCE. _(tagline proposed by the specification, to be validated by EVENTHEMES)_

The full brief, brand rules and roadmap are in [CLAUDE.md](CLAUDE.md). Installation, Supabase and admin setup are in [docs/SETUP.md](docs/SETUP.md).

---

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
```

In development, content and test requests are stored in `.eventheme/data.json` (git-ignored) and uploaded photos in `public/uploads/`. The admin at `/admin` always requires a Supabase Auth account with the admin role, even with local data. Set `EVENTHEME_DATA_MODE=supabase` (see `.env.example`) to use Supabase.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit tests (pricing, validation, forms, analytics, WhatsApp) |
| `npm run content:export` | Write the public content to `supabase/seed.sql` |
| `npm run admin:role -- grant <email>` | Give a Supabase user the admin role |

---

## Site Map

| Page | Route |
| --- | --- |
| Accueil | `/` |
| À propos | `/a-propos` |
| Services | `/services` |
| Matériel (catalogue, fiches) | `/materiel`, `/materiel/[id]` |
| Réalisations | `/realisations`, `/realisations/[id]` |
| Demande de devis | `/devis` |
| Contact | `/contact` |
| Mentions légales, confidentialité | `/mentions-legales`, `/politique-de-confidentialite` |
| Page d’attente (not enforced) | `/bientot` |
| Administration | `/admin` |

`/location`, `/location/[id]` and `/evenements` redirect permanently to their replacements.

---

## Brand System

| Token | Hex | Use |
| --- | --- | --- |
| `--noir` | `#08090B` | Main background |
| `--or` | `#C9A24A` | Accents, separators, details |
| `--argent` | `#C5C8CE` | Technical details, secondary elements |
| `--blanc` | `#FFFFFF` | Text and contrast |
| `--gris` | `#858990` | Secondary text |

Headings, numbers and data use **Space Grotesk**; body text uses **Inter**. The recurring ornament is the truss structure: the `<Truss />` SVG beam and the 3D truss rig of the hero.

---

## Tech Stack

- **Next.js 16** (App Router), React 19, TypeScript.
- **Supabase**: Postgres with Row Level Security, Auth for the admin, Storage for media. Migrations in `supabase/migrations/`.
- **CSS Modules** with design tokens (`src/styles/tokens.css`). No UI framework, no utility-class library.
- **GSAP** behind a shared motion layer that honours `prefers-reduced-motion`; Lenis smooth scrolling on the home page; **three.js** for the hero rig (lazy-loaded, with an SVG fallback).
- **`next/font`** self-hosts Space Grotesk and Inter.

```text
src/
├── app/            Routes, layout, metadata, sitemap, robots, API route handlers
├── components/
│   ├── eventheme/  Site shell, pages, quote studio, admin
│   ├── layout/     Intro curtain, mobile menu, motion root
│   ├── sections/   Home sections (hero, services, gallery, equipment, why us, CTA…)
│   └── ui/         Buttons, forms, dialogs, Truss ornament, icons
├── data/           Brand constants, navigation, demo seed; locales/ (French and English interface texts)
├── hooks/          Behaviour
├── lib/            Pure logic: pricing, validation, WhatsApp, dates, motion, server data layer
└── styles/         Tokens, base, utilities
```

---

## Status

**Done:** multi-page site; EVENTHEMES rebrand (palette, typography, copy, truss motif, technical demo content); catalogue with managed categories and sub-categories, brand, model and reference, filters and search; quote basket and five-step quote request with optional budget and private attachments; readable request references (`EVT-2026-0001`) and the specified statuses; admin with request management and CSV export; automatic e-mails (team alert and client acknowledgement) through Resend or Brevo, previewed locally until a provider is configured; Supabase schema with RLS and rate limiting; French and English versions (`/` and `/en/…`), with optional English fields for every piece of content in the admin and acknowledgements in the visitor's language; one page per service and per service area (city), structured data, a bilingual sitemap, consent-based Google Analytics and Search Console verification (both off until configured).

**Next:** the Settings admin module, Arabic (optional), and audits on the deployed site. The English texts are drafts to be validated by EVENTHEMES; the cities to publish, the legal texts and the analytics IDs are theirs to supply. To configure before launch: the e-mail provider account and `EMAIL_*` variables (see [docs/SETUP.md](docs/SETUP.md)).

All photography and catalogue entries are illustrations marked « Exemple » or « Inspiration ». They must be replaced by EVENTHEMES’ own media, equipment and authorised projects before launch, together with the contact details and the validated legal texts.
