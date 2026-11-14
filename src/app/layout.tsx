import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { EventhemeProvider } from "@/components/eventheme/Provider";
import { brand } from "@/data/eventheme";
import { getEntries, localMode } from "@/lib/eventheme/server";
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

export const metadata: Metadata = {
  title: {
    default: `${brand.name} — ${brand.baseline} au Maroc`,
    template: `%s | ${brand.name}`,
  },
  description: `${brand.summary} Fourniture, location, installation et exploitation.`,
  icons: {
    icon: [{ url: "/eventheme_icon.ico", sizes: "32x32" }],
  },
  openGraph: {
    title: `${brand.name} — ${brand.signature}`,
    description: brand.summary,
    siteName: brand.name,
    locale: "fr_FR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#08090b",
};

export const dynamic = "force-dynamic";
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const entries = await getEntries();
  return (
    <html
      lang="fr"
      className={`${spaceGrotesk.variable} ${inter.variable}`}
    >
      <body>
        {/* Sans JavaScript, les blocs révélés au défilement restent visibles. */}
        <noscript>
          <style>
            {".reveal{opacity:1 !important;transform:none !important;}"}
          </style>
        </noscript>
        <EventhemeProvider entries={entries} local={localMode()}>
          {children}
        </EventhemeProvider>
      </body>
    </html>
  );
}
