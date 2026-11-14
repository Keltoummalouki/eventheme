import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { EventhemeProvider } from "@/components/eventheme/Provider";
import { brand } from "@/data/eventheme";
import { dictionaries } from "@/data/locales";
import { fill, locales, ogLocale } from "@/lib/i18n";
import { requestLocale } from "@/lib/eventheme/locale";
import { getEntries, localMode } from "@/lib/eventheme/server";
import { localizeEntries } from "@/lib/eventheme/translations";
import "./globals.css";

/** Titres, chiffres et données (cahier des charges §02). Police variable : un seul fichier. */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-display",
});

/** Textes courants et interface. Police variable : un seul fichier. */
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-body",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLocale();
  const t = dictionaries[locale];
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
      alternateLocale: locales.filter((other) => other !== locale).map((other) => ogLocale[other]),
      type: "website",
    },
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
  const entries = localizeEntries(await getEntries(), locale);
  return (
    <html
      lang={locale}
      className={`${spaceGrotesk.variable} ${inter.variable}`}
    >
      <body>
        {/* Sans JavaScript, les blocs révélés au défilement restent visibles. */}
        <noscript>
          <style>
            {".reveal{opacity:1 !important;transform:none !important;}"}
          </style>
        </noscript>
        <EventhemeProvider entries={entries} local={localMode()} locale={locale}>
          {children}
        </EventhemeProvider>
      </body>
    </html>
  );
}
