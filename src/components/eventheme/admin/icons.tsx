import { Glyph } from "@/components/ui/icons";

/*
 * Pictogrammes de l'espace administrateur, au même trait fin que ceux du site
 * (components/ui/icons) : décoratifs, toujours accompagnés d'un libellé.
 */
type IconProps = { className?: string };

export const DashboardIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <rect x="3.5" y="3.5" width="7" height="8" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
    <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
    <rect x="3.5" y="14.5" width="7" height="6" rx="1.5" />
  </Glyph>
);

export const ChartIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M4 20.5h16.5M7 16.5v-4M11.5 16.5v-8M16 16.5v-6" />
    <path d="m6 8.5 4-3.5 3.5 2.5 5-4" />
  </Glyph>
);

export const QuoteIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M14 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z" />
    <path d="M14 3.5V8h4.5M9 12.5h6M9 16h4" />
  </Glyph>
);

export const MailIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </Glyph>
);

export const PhoneIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M6 3.5h3l1.5 4.2-2 1.4a11 11 0 0 0 6.4 6.4l1.4-2 4.2 1.5v3a1.5 1.5 0 0 1-1.5 1.5A16.5 16.5 0 0 1 4.5 5 1.5 1.5 0 0 1 6 3.5z" />
  </Glyph>
);

export const UsersIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5M15.5 5.3a3.5 3.5 0 0 1 0 6.4M17.5 14.8c1.8.6 3 2.2 3.5 4.7" />
  </Glyph>
);

/** Matériel : une enceinte. */
export const SpeakerIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <rect x="5.5" y="2.5" width="13" height="19" rx="2" />
    <circle cx="12" cy="14.5" r="3.5" />
    <circle cx="12" cy="7" r="1.5" />
  </Glyph>
);

export const LayersIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="m12 3.5 9 4.5-9 4.5L3 8z" />
    <path d="m3 12 9 4.5 9-4.5M3 16l9 4.5 9-4.5" />
  </Glyph>
);

/** Services : une scène sous son portique truss. */
export const StageIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M3 20.5h18M4.5 20.5V17h15v3.5M5 17V5.5h14V17" />
    <path d="M5 8.5h14M5 5.5l3 3 3-3 3 3 3-3 2 2" />
  </Glyph>
);

/** Types d'événement : un billet. */
export const TicketIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h14a1.5 1.5 0 0 1 1.5 1.5v2a2.5 2.5 0 0 0 0 5v2A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5v-2a2.5 2.5 0 0 0 0-5z" />
    <path d="M14.5 6v12" strokeDasharray="1.5 2" />
  </Glyph>
);

/** Réalisations : une photographie. */
export const ImageIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="9.5" r="1.8" />
    <path d="m4 17.5 5-4.5 3.5 3 3-2.5 4.5 4" />
  </Glyph>
);

export const PageIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
    <path d="M3.5 8.5h17M8 13h8M8 16.5h5" />
  </Glyph>
);

export const PinIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z" />
    <circle cx="12" cy="10" r="2.3" />
  </Glyph>
);

export const ShareIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="17.5" cy="5.5" r="2.5" />
    <circle cx="17.5" cy="18.5" r="2.5" />
    <path d="m8.2 10.8 7.1-4M8.2 13.2l7.1 4" />
  </Glyph>
);

export const GearIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" />
    <circle cx="12" cy="12" r="6.6" />
  </Glyph>
);

export const LogoutIcon = ({ className }: IconProps) => (
  <Glyph className={className} mirror>
    <path d="M14 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H14M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5" />
  </Glyph>
);

export const SunIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </Glyph>
);

export const MoonIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />
  </Glyph>
);

export const MenuIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </Glyph>
);

export const SidebarIcon = ({ className }: IconProps) => (
  <Glyph className={className} mirror>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M9.5 4.5v15M14 10l-2 2 2 2" />
  </Glyph>
);

export const PlusIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M12 5v14M5 12h14" />
  </Glyph>
);

export const DownloadIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15" />
  </Glyph>
);

export const ShuffleIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M3.5 7h3.2c2 0 3.2 1 4.3 2.7l2 3.6c1 1.7 2.3 2.7 4.3 2.7h3.2M17.5 13.5 20.5 16l-3 2.5M3.5 17h3.2c1.4 0 2.5-.5 3.3-1.4M13.9 8.4c.8-.9 1.9-1.4 3.3-1.4h3.3M17.5 4.5l3 2.5-3 2.5" />
  </Glyph>
);

export const TrendIcon = ({ className, down = false }: IconProps & { down?: boolean }) => (
  <Glyph className={className}>
    {down ? <path d="m3.5 7.5 6 6 4-4 7 7M20.5 11.5v5h-5" /> : <path d="m3.5 16.5 6-6 4 4 7-7M20.5 12.5v-5h-5" />}
  </Glyph>
);

export const BellIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />
  </Glyph>
);

export const WalletIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M18.5 7.5V5.5a1.5 1.5 0 0 0-1.5-1.5H5.5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h13.5a1.5 1.5 0 0 0 1.5-1.5v-9a1.5 1.5 0 0 0-1.5-1.5H5.5a2 2 0 0 1-2-2" />
    <circle cx="16.5" cy="13.5" r="1.2" />
  </Glyph>
);

export const TargetIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" />
  </Glyph>
);

export const CheckCircleIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.3 12.3 2.5 2.5 5-5.3" />
  </Glyph>
);

export const ChevronRightIcon = ({ className }: IconProps) => (
  <Glyph className={className} mirror>
    <path d="m9.5 6 6 6-6 6" />
  </Glyph>
);

export const ReturnIcon = ({ className }: IconProps) => (
  <Glyph className={className} mirror>
    <path d="M19.5 5.5v5a3 3 0 0 1-3 3H5.5M9.5 9.5l-4 4 4 4" />
  </Glyph>
);

export const ExternalIcon = ({ className }: IconProps) => (
  <Glyph className={className} mirror>
    <path d="M13.5 4.5h6v6M19.5 4.5 11 13M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
  </Glyph>
);

export const CubeIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
    <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
  </Glyph>
);

export const GlobeIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <ellipse cx="12" cy="12" rx="3.8" ry="8.5" />
    <path d="M3.5 12h17" />
  </Glyph>
);

export const DatabaseIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <ellipse cx="12" cy="6" rx="7.5" ry="2.8" />
    <path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" />
  </Glyph>
);

export const SendIcon = ({ className }: IconProps) => (
  <Glyph className={className} mirror>
    <path d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4z" />
  </Glyph>
);

export const SparkIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M12 3.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5zM18.5 16.5c.2 1.6 1 2.4 2.5 2.5-1.5.2-2.3 1-2.5 2.5-.2-1.5-1-2.3-2.5-2.5 1.5-.1 2.3-.9 2.5-2.5z" />
  </Glyph>
);

/* --- Disciplines des services (« Prestations les plus demandées ») --------- */

export const TrussIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M3 8.5h18M3 15.5h18M3 15.5l3.5-7 3.5 7 3.5-7 3.5 7 3.5-7" />
  </Glyph>
);

export const ScreenIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <rect x="2.5" y="4.5" width="19" height="12" rx="1.5" />
    <path d="M8.5 20.5h7M12 16.5v4M7 8.5h3M7 11.5h6" />
  </Glyph>
);

export const SpotIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M9 3.5h6l-1 5h-4z" />
    <path d="M10 8.5 5.5 20.5h13L14 8.5" opacity=".55" />
    <path d="M12 3.5V2" />
  </Glyph>
);

/** Régie : les faders d'une console. */
export const ConsoleIcon = ({ className }: IconProps) => (
  <Glyph className={className}>
    <path d="M6 4v16M12 4v16M18 4v16" />
    <rect x="4.2" y="12.5" width="3.6" height="2.6" rx=".6" />
    <rect x="10.2" y="7" width="3.6" height="2.6" rx=".6" />
    <rect x="16.2" y="14.5" width="3.6" height="2.6" rx=".6" />
  </Glyph>
);

/** Pictogramme d'une prestation, d'après son identifiant ou, à défaut, son intitulé. */
export function ServiceIcon({ id, title, className }: IconProps & { id: string; title: string }) {
  const key = `${id} ${title}`.toLowerCase();
  if (/sc[eè]ne|podium/.test(key)) return <StageIcon className={className} />;
  if (/truss|structure/.test(key)) return <TrussIcon className={className} />;
  if (/led|[ée]cran|vid[ée]o/.test(key)) return <ScreenIcon className={className} />;
  if (/sono|son\b|audio/.test(key)) return <SpeakerIcon className={className} />;
  if (/[ée]clairage|lumi/.test(key)) return <SpotIcon className={className} />;
  if (/r[ée]gie/.test(key)) return <ConsoleIcon className={className} />;
  return <SparkIcon className={className} />;
}
