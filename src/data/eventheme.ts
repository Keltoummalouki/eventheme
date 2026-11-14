import type { Entry } from "@/lib/eventheme/types";

/**
 * Marque — cahier des charges EVENTHEMES (§01 et §04 A). L’accroche est celle
 * que le cahier propose : elle reste à valider par EVENTHEMES.
 */
export const brand = {
  name: "EVENTHEMES",
  sector: "Event Technical Production",
  signature: "We engineer the experience.",
  baseline: "Production technique & location de matériel événementiel",
  market: "Maroc",
  summary:
    "Scènes, structures, écrans LED, sonorisation, éclairage et régie technique pour vos événements au Maroc.",
  disciplines: ["Scène", "Structure", "Image", "Son", "Lumière", "Régie"],
} as const;

/** Vrai si le texte est l’accroche anglaise de la marque, quelle que soit sa mise en ligne. */
export const isSignature = (text: string) =>
  text.replace(/\s+/g, " ").trim().toLowerCase() === brand.signature.toLowerCase();

const photo = (id: string, width = 1400) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=85`;

/**
 * Photographies d’illustration (Unsplash), à remplacer par les médias réels
 * d’EVENTHEMES. Elles montrent des ambiances, jamais une réalisation de la marque.
 */
export const imagery = {
  stageTruss: photo("1563841930606-67e2bce48b78", 2000),
  stageRoof: photo("1504680177321-2e6a879aac86", 2000),
  stageGlow: photo("1470229722913-7c0e2dbbafd3", 2000),
  festivalTruss: photo("1506157786151-b8491531f063"),
  ledConference: photo("1587825140708-dfaf72ae4b04"),
  ledStage: photo("1516450360452-9312f5e86fc7"),
  microphone: photo("1475721027785-f74eccf877e2"),
  microphoneStage: photo("1516280440614-37939bbacd81"),
  beams: photo("1557787163-1635e2efb160"),
  beamsYellow: photo("1459749411175-04bf5292ceea"),
  redLight: photo("1545128485-c400e7702796"),
  mixer: photo("1544785349-c4a5301826fd"),
  controlRoom: photo("1563330232-57114bb0823c"),
  smoke: photo("1493225457124-a3eb161ffa5f"),
  confetti: photo("1492684223066-81342ee5ff30"),
  concertOrange: photo("1524368535928-5b5e00ddc76b"),
  galaConfetti: photo("1533174072545-7a4b6ad7a6c3"),
  djSmoke: photo("1496337589254-7e19d01cec44"),
  lasers: photo("1514525253161-7a46d19cd819"),
  roundTables: photo("1561489413-985b06da5bee"),
  conferenceAudience: photo("1540575467063-178a50c2df87"),
  projection: photo("1505373877841-8d25f7d46678"),
  birthdayDinner: photo("1556125574-d7f27ec36a06"),
  partyVenue: photo("1574391884720-bbc3740c59d1"),
  festivalConfetti: photo("1505236858219-8359eb29e329"),
  conferenceHall: photo("1531058020387-3be344556be6"),
};

/**
 * Diaporama d’accueil — scènes professionnelles d’illustration, utilisées tant
 * que la page « home » n’a pas de galerie dans l’administration.
 */
export const heroSlides = [imagery.stageTruss, imagery.stageRoof, imagery.stageGlow, imagery.beams];

/**
 * Prestations de chaque service, reprises du cahier des charges (§04 C).
 * Remplacées par le champ « caractéristiques » du service dès qu’il est rempli
 * dans l’administration.
 */
export const serviceDetails: Record<string, string[]> = {
  scenes: ["Scènes modulaires", "Podiums", "Plateformes", "Installations scéniques"],
  structures: ["Structures aluminium", "Roof systems", "Supports", "Rigging"],
  "led-video": ["Murs LED", "Écrans géants", "Diffusion", "Solutions vidéo"],
  sonorisation: ["Systèmes audio", "Enceintes", "Microphones", "Consoles"],
  eclairage: ["Moving heads", "PAR LED", "Éclairage architectural", "Effets lumineux"],
  regie: ["Régie son", "Régie lumière", "Régie vidéo", "Coordination", "Exploitation technique"],
  complementaires: ["Effets spéciaux", "Installation", "Exploitation", "Démontage"],
};
export function serviceItems(service: Entry) {
  const own = service.specifications?.split("\n").map((line) => line.trim()).filter(Boolean);
  return own?.length ? own : serviceDetails[service.id] || [];
}

/** Phrase dévoilée mot à mot au défilement, sur l’accueil. */
export const manifesto =
  "Une scène se construit bien avant de s’allumer. De l’étude technique au démontage, nous faisons de la technique le socle invisible et fiable de votre événement.";

/** Les métiers d’EVENTHEMES (cahier des charges §01). */
export const activities = [
  ["Fourniture", "Des équipements techniques et audiovisuels professionnels, pour chaque format d’événement."],
  ["Location", "Un parc matériel à composer selon vos besoins : scène, structure, image, son et lumière."],
  ["Installation", "Montage, câblage et réglages sur site, dans le respect du lieu et du planning."],
  ["Exploitation", "Une régie technique aux commandes pendant l’événement, jusqu’au démontage."],
] as const;

/** « Why EVENTHEMES » (cahier des charges §04 A) — positionnement, sans chiffre ni promesse datée. */
export const reasons = [
  ["Équipements professionnels", "Un parc matériel pensé pour l’événementiel : scène, structure, image, son et lumière."],
  ["Expertise technique", "La maîtrise du son, de la lumière, de la vidéo et des structures, de l’étude au direct."],
  ["Solutions adaptées", "Une configuration pensée pour votre lieu, votre public et votre format, du séminaire au festival."],
  ["Exécution fiable", "Préparation, installation et exploitation menées avec méthode, pour un événement sans fausse note."],
] as const;

/** Méthodologie (cahier des charges §04 B) — texte proposé, à valider par EVENTHEMES. */
export const methodSteps = [
  ["Brief", "Votre événement, votre lieu, votre public et vos contraintes : nous recueillons le besoin technique."],
  ["Étude technique", "Accès, alimentation électrique, points d’accroche : nous choisissons les équipements adaptés au lieu."],
  ["Proposition & devis", "Implantation, liste du matériel et devis détaillé, ajustés à votre budget."],
  ["Préparation", "Préparation et tests du matériel, planning de montage, coordination avec les autres prestataires."],
  ["Installation", "Montage des scènes, structures, écrans, son et lumière, puis réglages sur site."],
  ["Exploitation", "Régie son, lumière et vidéo pendant l’événement, au rythme de votre programme."],
  ["Démontage & bilan", "Démontage, remise en état des espaces et retour d’expérience avec vous."],
] as const;

/** Plan du site (cahier des charges §03). « Mon devis » reste un bouton à part. */
export const navigation = [
  ["Accueil", "/"],
  ["À propos", "/a-propos"],
  ["Services", "/services"],
  ["Matériel", "/materiel"],
  ["Réalisations", "/realisations"],
  ["Contact", "/contact"],
] as const;

const entry = (
  id: string,
  kind: Entry["kind"],
  title: string,
  description: string,
  extra: Partial<Entry> = {},
): Entry => ({ id, kind, title, description, published: true, ...extra });

const exampleNote = "Exemple de fiche, à remplacer par le matériel EVENTHEMES.";
const inspirationNote =
  "Planche d’inspiration. Cette photographie illustre une ambiance et ne représente pas une réalisation EVENTHEMES.";

/** Contenu initial : remplacé par l’administration (fichier local ou Supabase). */
export const seed: Entry[] = [
  entry(
    "home",
    "pages",
    "We engineer\nthe experience.",
    "Scène, structure, image, son et lumière : EVENTHEMES fournit, installe et exploite les solutions techniques de vos événements au Maroc.",
    { subtitle: "EVENT TECHNICAL PRODUCTION · MAROC", image: imagery.stageTruss },
  ),
  entry(
    "about",
    "pages",
    "La technique au service\nde vos événements.",
    "EVENTHEMES est spécialisée dans les solutions techniques et audiovisuelles pour événements de toutes tailles. Nous intervenons dans la fourniture, la location, l’installation et l’exploitation des équipements nécessaires aux événements professionnels et privés.",
    { subtitle: "À PROPOS D’EVENTHEMES", image: imagery.ledStage },
  ),
  entry(
    "values",
    "pages",
    "Puissance technique.\nExcellence professionnelle.",
    "Trois valeurs guident chaque projet : la puissance technique, l’excellence professionnelle et l’innovation audiovisuelle. Une préparation rigoureuse, pour une technique qui sert l’événement sans jamais s’imposer.",
  ),
  entry(
    "contact",
    "pages",
    "Parlons de votre\nprochain événement.",
    "Un lieu, une date, un format ? Décrivez-nous votre projet : notre équipe revient vers vous pour préparer une offre adaptée.",
  ),
  entry(
    "services-page",
    "pages",
    "Nos expertises\ntechniques.",
    "Scènes, structures, écrans, son, lumière et régie : des prestations complètes ou à la carte, de l’étude technique au démontage.",
  ),
  entry(
    "location-page",
    "pages",
    "Le parc\nmatériel.",
    "Parcourez nos équipements par catégorie et ajoutez-les à votre demande de devis. La disponibilité et le tarif final sont confirmés par notre équipe selon la date, la quantité, la durée et le lieu.",
  ),
  entry(
    "projects-page",
    "pages",
    "Nos\nréalisations.",
    "Galas, événements corporate, concerts, festivals, conférences : nos projets, classés par type d’événement.",
  ),
  ...(
    [
      ["scenes", "Scènes & podiums", "Scène", imagery.stageRoof,
        "Scènes modulaires, podiums et plateformes : une base stable, dimensionnée pour votre lieu et votre programme."],
      ["structures", "Structures & truss", "Structure", imagery.festivalTruss,
        "Structures aluminium, roof systems, supports et rigging pour porter la lumière, le son et l’image en toute sécurité."],
      ["led-video", "Écrans LED & vidéo", "Image", imagery.ledConference,
        "Murs LED, écrans géants, diffusion et solutions vidéo pour donner à votre message toute sa dimension."],
      ["sonorisation", "Sonorisation", "Son", imagery.microphone,
        "Systèmes audio, enceintes, microphones et consoles pour un son clair et maîtrisé, de la conférence au concert."],
      ["eclairage", "Éclairage professionnel", "Lumière", imagery.beams,
        "Moving heads, PAR LED, éclairage architectural et effets lumineux pour créer l’atmosphère de votre événement."],
      ["regie", "Régie technique", "Régie", imagery.controlRoom,
        "Régie son, lumière et vidéo : coordination et exploitation technique de votre événement, du montage au direct."],
      ["complementaires", "Services complémentaires", "Sur mesure", imagery.smoke,
        "Effets spéciaux, installation, exploitation et démontage, selon les prestations retenues pour votre projet."],
    ] as const
  ).map(([id, title, category, image, description]) =>
    entry(id, "services", title, description, { category, image, pricing: "request", price: null }),
  ),
  ...(
    [
      ["gala", "Gala & cérémonie", "Prestige", imagery.galaConfetti,
        "Scène, lumière d’ambiance et sonorisation maîtrisée pour une soirée d’exception."],
      ["soiree", "Soirée privée ou professionnelle", "Soirées", imagery.djSmoke,
        "Son, lumière et effets pour donner du rythme à votre soirée."],
      ["concert", "Concert & festival", "Grand public", imagery.lasers,
        "Scène, structures, son et lumière dimensionnés pour le live et le grand public."],
      ["corporate", "Événement corporate", "Entreprises", imagery.roundTables,
        "Image, son et régie pour vos conventions, assemblées et événements d’entreprise."],
      ["conference", "Conférence & séminaire", "Entreprises", imagery.conferenceAudience,
        "Sonorisation des interventions, écrans et diffusion pour un message clair."],
      ["lancement", "Lancement de produit", "Entreprises", imagery.projection,
        "Mise en lumière, murs LED et effets pour révéler votre produit."],
      ["prive", "Anniversaire & événement privé", "Privés", imagery.birthdayDinner,
        "Son, lumière et ambiance sur mesure pour vos célébrations privées."],
    ] as const
  ).map(([id, title, category, image, description]) =>
    entry(id, "events", title, description, { category, image, price: null }),
  ),
  entry("mur-led", "products", "Mur LED modulaire",
    `${exampleNote} Mur d’images assemblable pour scène, conférence ou salon : taille, pas de pixel et luminosité définis selon le lieu et la distance de vision.`, {
      category: "Écrans LED & vidéo",
      image: imagery.ledStage,
      price: null,
      pricing: "request",
      variants: [
        { name: "Intérieur", price: null },
        { name: "Extérieur", price: null },
      ],
      demo: true,
    }),
  entry("line-array", "products", "Système de sonorisation line array",
    `${exampleNote} Diffusion suspendue ou posée pour couvrir un large public ; configuration calculée selon la jauge et l’acoustique du lieu.`, {
      category: "Sonorisation",
      image: imagery.concertOrange,
      price: null,
      pricing: "request",
      demo: true,
    }),
  entry("micros-hf", "products", "Microphones sans fil (HF)",
    `${exampleNote} Micros main ou serre-tête pour les prises de parole, les tables rondes et les animations.`, {
      category: "Sonorisation",
      image: imagery.microphoneStage,
      price: null,
      pricing: "request",
      variants: [
        { name: "Micro main", price: null },
        { name: "Serre-tête", price: null },
      ],
      demo: true,
    }),
  entry("console", "products", "Console de mixage numérique",
    `${exampleNote} Console pour la régie son de vos conférences, concerts et soirées.`, {
      category: "Régie",
      image: imagery.mixer,
      price: null,
      pricing: "request",
      demo: true,
    }),
  entry("lyre", "products", "Lyre asservie (moving head)",
    `${exampleNote} Projecteur motorisé pour les faisceaux, les mouvements et les effets de lumière sur scène.`, {
      category: "Éclairage",
      image: imagery.beamsYellow,
      price: null,
      pricing: "request",
      demo: true,
    }),
  entry("par-led", "products", "Projecteur PAR LED",
    `${exampleNote} Projecteur couleur pour la mise en lumière de la scène, du décor ou de l’architecture.`, {
      category: "Éclairage",
      image: imagery.redLight,
      price: null,
      pricing: "request",
      demo: true,
    }),
  entry("truss", "products", "Structure truss aluminium",
    `${exampleNote} Poutres et tours en aluminium pour porter la lumière, le son et l’image : portiques, grils et roof systems.`, {
      category: "Structures & truss",
      image: imagery.stageTruss,
      price: null,
      pricing: "request",
      color: "Aluminium",
      swatch: "#c5c8ce",
      variants: [
        { name: "Longueur 1 m", price: null, length: 100 },
        { name: "Longueur 2 m", price: null, length: 200 },
        { name: "Longueur 3 m", price: null, length: 300 },
      ],
      demo: true,
    }),
  entry("scene", "products", "Scène modulaire",
    `${exampleNote} Praticables assemblables pour composer une scène ou un podium à la hauteur et aux dimensions de votre événement.`, {
      category: "Scènes & podiums",
      image: imagery.stageRoof,
      price: null,
      pricing: "request",
      color: "Noir",
      swatch: "#08090b",
      demo: true,
    }),
  entry("fumee", "products", "Machine à fumée",
    `${exampleNote} Brouillard ou fumée lourde pour révéler les faisceaux lumineux et créer l’atmosphère.`, {
      category: "Effets spéciaux",
      image: imagery.smoke,
      price: null,
      pricing: "request",
      demo: true,
    }),
  entry("confettis", "products", "Canon à confettis",
    `${exampleNote} Effet de lancement pour un moment fort : ouverture, révélation ou final.`, {
      category: "Effets spéciaux",
      image: imagery.confetti,
      price: null,
      pricing: "request",
      demo: true,
    }),
  ...(
    [
      ["inspiration-gala", "Ambiance gala", "Galas", imagery.galaConfetti],
      ["inspiration-corporate", "Ambiance convention", "Événements corporate", imagery.ledConference],
      ["inspiration-concert", "Ambiance concert", "Concerts", imagery.stageGlow],
      ["inspiration-prive", "Ambiance soirée privée", "Événements privés", imagery.partyVenue],
      ["inspiration-festival", "Ambiance festival", "Festivals", imagery.festivalConfetti],
      ["inspiration-conference", "Ambiance conférence", "Conférences", imagery.conferenceHall],
    ] as const
  ).map(([id, title, category, image]) =>
    entry(id, "projects", title, inspirationNote, { category, image, demo: true }),
  ),
  entry("instagram", "socials", "Instagram", "@eventhemes", {
    network: "instagram",
    url: "https://www.instagram.com/eventhemes/",
  }),
  entry("whatsapp", "socials", "WhatsApp", "Échangeons sur votre projet", {
    network: "whatsapp",
    url: "https://wa.me/message/AREDMVCCJW5GM1",
  }),
];
