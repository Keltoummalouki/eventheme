import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Noto_Kufi_Arabic, Noto_Sans_Arabic, Roboto } from "next/font/google";
import localFont from "next/font/local";
import ComingSoon from "@/components/eventheme/ComingSoon";
import { EventhemeProvider } from "@/components/eventheme/Provider";
import { brand } from "@/data/eventheme";
import { dictionaries } from "@/data/locales";
import { direction, fill, ogLocale } from "@/lib/i18n";
import { isPublicRequest, requestLocale } from "@/lib/eventheme/locale";
import { getEntries, localMode } from "@/lib/eventheme/server";
import { localizeEntries } from "@/lib/eventheme/translations";
import { publishedLocales, siteSettings } from "@/lib/eventheme/types";
import "./globals.css";

/** Original Bebas supplied by Dharma Type, with accented glyphs from Bebas Neue. */
const bebas = localFont({
  src: "./fonts/Bebas-Regular.ttf",
  weight: "400",
  adjustFontFallback: false,
  display: "swap",
  variable: "--font-display",
});
const bebasAccents = Bebas_Neue({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-display-accents",
});

/** Textes courants et interface. Police variable : un seul fichier. */
const roboto = Roboto({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-body",
});

const signature = localFont({
  src: "./fonts/Signature.otf",
  weight: "400",
  display: "swap",
  variable: "--font-signature",
});

/**
 * Arabe (pages /ar) : titres en coufique géométrique, textes en Noto Sans
 * Arabic, dessiné pour accompagner Roboto. Placés après les polices latines
 * (tokens.css) : ils ne servent qu’aux lettres arabes, et ne sont téléchargés
 * que par une page qui en contient (pas de préchargement).
 */
const arabicDisplay = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  display: "swap",
  preload: false,
  variable: "--font-display-ar",
});
const arabicBody = Noto_Sans_Arabic({
  subsets: ["arabic"],
  display: "swap",
  preload: false,
  variable: "--font-body-ar",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  const t = dictionaries[locale];
  const entries = await getEntries();
  // Page d’attente imposée : rien n’est indexé tant que le site est fermé.
  const closed = siteSettings(entries).comingSoon && (await isPublicRequest());
  return {
    metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
    title: {
      default: fill(t.meta.title, { brand: brand.name, baseline: t.brand.baseline }),
      template: `%s | ${brand.name}`,
    },
    description: fill(t.meta.description, { summary: t.brand.summary }),
    icons: {
      icon: [{ url: "/eventheme_icon.ico", sizes: "32x32" }],
    },
    // Search Console : jeton de vérification de la propriété (variable GOOGLE_SITE_VERIFICATION).
    ...(process.env.GOOGLE_SITE_VERIFICATION?.trim()
      ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION.trim() } }
      : {}),
    openGraph: {
      title: `${brand.name} — ${brand.signature}`,
      description: t.brand.summary,
      siteName: brand.name,
      locale: ogLocale[locale],
      alternateLocale: publishedLocales(entries)
        .filter((other) => other !== locale)
        .map((other) => ogLocale[other]),
      type: "website",
    },
    ...(closed ? { robots: { index: false, follow: false } } : {}),
  };
}

export const viewport: Viewport = {
  themeColor: "#08090b",
};

export const dynamic = "force-dynamic";
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Langue posée par le proxy d’après l’adresse ; contenus traduits avant l’affichage.
  const locale = await requestLocale();
  const stored = await getEntries();
  const entries = localizeEntries(stored, locale);
  // Paramètres « page d’attente » : le site public la montre à la place de chaque page ; l’administration reste ouverte.
  const closed = siteSettings(stored).comingSoon && (await isPublicRequest());
  return (
    <html
      suppressHydrationWarning
      lang={locale}
      dir={direction(locale)}
      className={`${bebas.variable} ${bebasAccents.variable} ${roboto.variable} ${signature.variable} ${arabicDisplay.variable} ${arabicBody.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('eventheme-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}" }} />
        {/* Sans JavaScript, les blocs révélés au défilement restent visibles. */}
        <noscript>
          <style>
            {".reveal{opacity:1 !important;transform:none !important;}"}
          </style>
        </noscript>
        <EventhemeProvider entries={entries} local={localMode()} locale={locale}>
          {closed ? <ComingSoon locale={locale} entries={entries} /> : children}
        </EventhemeProvider>
      </body>
    </html>
  );
}
