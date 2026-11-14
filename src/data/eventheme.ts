import { fr } from "@/data/locales/fr";
import type { Entry, EntryTranslation } from "@/lib/eventheme/types";
import type { PageKey } from "@/lib/i18n";

/**
 * Marque — cahier des charges EVENTHEMES (§01 et §04 A). L’accroche est celle
 * que le cahier propose : elle reste à valider par EVENTHEMES. La baseline, le
 * résumé et les disciplines dépendent de la langue : `t.brand` (data/locales).
 */
export const brand = {
  name: "EVENTHEMES",
  sector: "Event Technical Production",
  signature: "We engineer the experience.",
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
 * Prestations d’un service : le champ « caractéristiques » de l’administration
 * s’il est rempli, sinon la liste par défaut de la langue (`t.serviceDetails`,
 * reprise du cahier des charges §04 C).
 */
export function serviceItems(service: Entry, defaults: Readonly<Record<string, readonly string[]>>) {
  const own = service.specifications?.split("\n").map((line) => line.trim()).filter(Boolean);
  return own?.length ? own : defaults[service.id] ?? [];
}

/**
 * Classement des réalisations (cahier des charges §04 E) : les valeurs
 * enregistrées, en français. Libellés traduits : `t.projectCategories`.
 */
export const projectCategories = Object.keys(fr.projectCategories) as (keyof typeof fr.projectCategories)[];

/** Plan du site (cahier des charges §03). « Mon devis » reste un bouton à part. */
export const navigation = ["home", "about", "services", "equipment", "projects", "contact"] as const satisfies readonly PageKey[];

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
// Versions anglaises du contenu de départ : brouillons, à valider par EVENTHEMES.
const exampleNoteEn = "Example listing, to be replaced with EVENTHEMES equipment.";
const inspirationNoteEn =
  "Inspiration board. This photograph illustrates an atmosphere and does not show an EVENTHEMES project.";
const en = (translation: EntryTranslation): Pick<Entry, "translations"> => ({ translations: { en: translation } });

/** Contenu initial : remplacé par l’administration (fichier local ou Supabase). */
export const seed: Entry[] = [
  entry(
    "home",
    "pages",
    "We engineer\nthe experience.",
    "Scène, structure, image, son et lumière : EVENTHEMES fournit, installe et exploite les solutions techniques de vos événements au Maroc.",
    {
      subtitle: "EVENT TECHNICAL PRODUCTION · MAROC",
      image: imagery.stageTruss,
      ...en({
        description:
          "Stage, structure, video, sound and lighting: EVENTHEMES supplies, installs and operates the technical solutions for your events in Morocco.",
        subtitle: "EVENT TECHNICAL PRODUCTION · MOROCCO",
      }),
    },
  ),
  entry(
    "about",
    "pages",
    "La technique au service\nde vos événements.",
    "EVENTHEMES est spécialisée dans les solutions techniques et audiovisuelles pour événements de toutes tailles. Nous intervenons dans la fourniture, la location, l’installation et l’exploitation des équipements nécessaires aux événements professionnels et privés.",
    {
      subtitle: "À PROPOS D’EVENTHEMES",
      image: imagery.ledStage,
      ...en({
        title: "Technical production\nfor your events.",
        description:
          "EVENTHEMES specialises in technical and audiovisual solutions for events of every size. We supply, rent, install and operate the equipment that professional and private events need.",
        subtitle: "ABOUT EVENTHEMES",
      }),
    },
  ),
  entry(
    "values",
    "pages",
    "Puissance technique.\nExcellence professionnelle.",
    "Trois valeurs guident chaque projet : la puissance technique, l’excellence professionnelle et l’innovation audiovisuelle. Une préparation rigoureuse, pour une technique qui sert l’événement sans jamais s’imposer.",
    en({
      title: "Technical power.\nProfessional excellence.",
      description:
        "Three values guide every project: technical power, professional excellence and audiovisual innovation. Rigorous preparation, for technology that serves the event without ever taking over.",
    }),
  ),
  entry(
    "contact",
    "pages",
    "Parlons de votre\nprochain événement.",
    "Un lieu, une date, un format ? Décrivez-nous votre projet : notre équipe revient vers vous pour préparer une offre adaptée.",
    en({
      title: "Let’s talk about your\nnext event.",
      description:
        "A venue, a date, a format? Tell us about your project: our team will get back to you with a tailored proposal.",
    }),
  ),
  entry(
    "services-page",
    "pages",
    "Nos expertises\ntechniques.",
    "Scènes, structures, écrans, son, lumière et régie : des prestations complètes ou à la carte, de l’étude technique au démontage.",
    en({
      title: "Our technical\nexpertise.",
      description:
        "Stages, structures, screens, sound, lighting and technical control: complete or à la carte services, from the technical survey to the get-out.",
    }),
  ),
  entry(
    "location-page",
    "pages",
    "Le parc\nmatériel.",
    "Parcourez nos équipements par catégorie et ajoutez-les à votre demande de devis. La disponibilité et le tarif final sont confirmés par notre équipe selon la date, la quantité, la durée et le lieu.",
    en({
      title: "Our equipment\nrange.",
      description:
        "Browse our equipment by category and add it to your quote request. Availability and the final price are confirmed by our team according to the date, quantity, duration and venue.",
    }),
  ),
  entry(
    "projects-page",
    "pages",
    "Nos\nréalisations.",
    "Galas, événements corporate, concerts, festivals, conférences : nos projets, classés par type d’événement.",
    en({
      title: "Our\nprojects.",
      description: "Galas, corporate events, concerts, festivals, conferences: our projects, sorted by type of event.",
    }),
  ),
  ...(
    [
      ["scenes", "Scènes & podiums", "Scène", imagery.stageRoof,
        "Scènes modulaires, podiums et plateformes : une base stable, dimensionnée pour votre lieu et votre programme.",
        "Stages & risers", "Stage",
        "Modular stages, risers and platforms: a stable base, sized for your venue and your programme."],
      ["structures", "Structures & truss", "Structure", imagery.festivalTruss,
        "Structures aluminium, roof systems, supports et rigging pour porter la lumière, le son et l’image en toute sécurité.",
        "Structures & truss", "Structure",
        "Aluminium structures, roof systems, supports and rigging to carry lighting, sound and video safely."],
      ["led-video", "Écrans LED & vidéo", "Image", imagery.ledConference,
        "Murs LED, écrans géants, diffusion et solutions vidéo pour donner à votre message toute sa dimension.",
        "LED screens & video", "Video",
        "LED walls, giant screens, playback and video solutions to give your message its full scale."],
      ["sonorisation", "Sonorisation", "Son", imagery.microphone,
        "Systèmes audio, enceintes, microphones et consoles pour un son clair et maîtrisé, de la conférence au concert.",
        "Sound systems", "Sound",
        "Audio systems, speakers, microphones and mixing desks for clear, controlled sound, from conferences to concerts."],
      ["eclairage", "Éclairage professionnel", "Lumière", imagery.beams,
        "Moving heads, PAR LED, éclairage architectural et effets lumineux pour créer l’atmosphère de votre événement.",
        "Professional lighting", "Lighting",
        "Moving heads, LED PARs, architectural lighting and lighting effects to set the atmosphere of your event."],
      ["regie", "Régie technique", "Régie", imagery.controlRoom,
        "Régie son, lumière et vidéo : coordination et exploitation technique de votre événement, du montage au direct.",
        "Technical control", "Control",
        "Sound, lighting and video control: coordination and technical operation of your event, from set-up to showtime."],
      ["complementaires", "Services complémentaires", "Sur mesure", imagery.smoke,
        "Effets spéciaux, installation, exploitation et démontage, selon les prestations retenues pour votre projet.",
        "Additional services", "Bespoke",
        "Special effects, installation, operation and get-out, depending on the services chosen for your project."],
    ] as const
  ).map(([id, title, category, image, description, titleEn, categoryEn, descriptionEn]) =>
    entry(id, "services", title, description, {
      category,
      image,
      pricing: "request",
      price: null,
      ...en({ title: titleEn, category: categoryEn, description: descriptionEn }),
    }),
  ),
  ...(
    [
      ["gala", "Gala & cérémonie", "Prestige", imagery.galaConfetti,
        "Scène, lumière d’ambiance et sonorisation maîtrisée pour une soirée d’exception.",
        "Gala & ceremony", "Stage, ambient lighting and controlled sound for an exceptional evening."],
      ["soiree", "Soirée privée ou professionnelle", "Soirées", imagery.djSmoke,
        "Son, lumière et effets pour donner du rythme à votre soirée.",
        "Private or corporate party", "Sound, lighting and effects to set the pace of your party."],
      ["concert", "Concert & festival", "Grand public", imagery.lasers,
        "Scène, structures, son et lumière dimensionnés pour le live et le grand public.",
        "Concert & festival", "Stage, structures, sound and lighting sized for live shows and large audiences."],
      ["corporate", "Événement corporate", "Entreprises", imagery.roundTables,
        "Image, son et régie pour vos conventions, assemblées et événements d’entreprise.",
        "Corporate event", "Video, sound and technical control for your conventions, general meetings and company events."],
      ["conference", "Conférence & séminaire", "Entreprises", imagery.conferenceAudience,
        "Sonorisation des interventions, écrans et diffusion pour un message clair.",
        "Conference & seminar", "Speech reinforcement, screens and playback for a clear message."],
      ["lancement", "Lancement de produit", "Entreprises", imagery.projection,
        "Mise en lumière, murs LED et effets pour révéler votre produit.",
        "Product launch", "Lighting, LED walls and effects to reveal your product."],
      ["prive", "Anniversaire & événement privé", "Privés", imagery.birthdayDinner,
        "Son, lumière et ambiance sur mesure pour vos célébrations privées.",
        "Birthday & private event", "Bespoke sound, lighting and atmosphere for your private celebrations."],
    ] as const
  ).map(([id, title, category, image, description, titleEn, descriptionEn]) =>
    entry(id, "events", title, description, { category, image, price: null, ...en({ title: titleEn, description: descriptionEn }) }),
  ),
  // Arborescence proposée du catalogue, à adapter au parc réel dans l’administration.
  ...(
    [
      ["cat-scenes", "Scènes & podiums", "Scènes modulaires, podiums et plateformes.",
        "Stages & risers", "Modular stages, risers and platforms."],
      ["cat-structures", "Structures & truss", "Structures aluminium, roof systems, supports et rigging.",
        "Structures & truss", "Aluminium structures, roof systems, supports and rigging."],
      ["cat-image", "Écrans LED & vidéo", "Murs LED, écrans et diffusion vidéo.",
        "LED screens & video", "LED walls, screens and video playback."],
      ["cat-image-led", "Murs LED", "Écrans LED modulaires, intérieur et extérieur.",
        "LED walls", "Modular LED screens, indoor and outdoor.", "cat-image"],
      ["cat-son", "Sonorisation", "Systèmes audio, enceintes, microphones.",
        "Sound", "Audio systems, speakers, microphones."],
      ["cat-son-diffusion", "Diffusion", "Enceintes et systèmes line array.",
        "Speakers", "Speakers and line array systems.", "cat-son"],
      ["cat-son-micros", "Microphones", "Micros filaires et sans fil.",
        "Microphones", "Wired and wireless microphones.", "cat-son"],
      ["cat-lumiere", "Éclairage", "Projecteurs, lyres et effets lumineux.",
        "Lighting", "Fixtures, moving heads and lighting effects."],
      ["cat-lumiere-lyres", "Lyres asservies", "Projecteurs motorisés : faisceaux, wash, spot.",
        "Moving heads", "Motorised fixtures: beam, wash, spot.", "cat-lumiere"],
      ["cat-lumiere-projecteurs", "Projecteurs LED", "PAR LED et projecteurs d’ambiance.",
        "LED fixtures", "LED PARs and ambient fixtures.", "cat-lumiere"],
      ["cat-regie", "Régie", "Consoles et matériel de régie son, lumière et vidéo.",
        "Control", "Consoles and control equipment for sound, lighting and video."],
      ["cat-effets", "Effets spéciaux", "Fumée, confettis et effets de scène.",
        "Special effects", "Smoke, confetti and stage effects."],
      ["cat-effets-fumee", "Fumée & brouillard", "Machines à fumée et à brouillard.",
        "Smoke & haze", "Smoke and haze machines.", "cat-effets"],
      ["cat-effets-confettis", "Confettis", "Canons et lanceurs de confettis.",
        "Confetti", "Confetti cannons and launchers.", "cat-effets"],
    ] as [id: string, title: string, description: string, titleEn: string, descriptionEn: string, parent?: string][]
  ).map(([id, title, description, titleEn, descriptionEn, parent]) =>
    entry(id, "categories", title, description, {
      ...(parent ? { parent } : {}),
      ...en({ title: titleEn, description: descriptionEn }),
    }),
  ),
  entry("mur-led", "products", "Mur LED modulaire",
    `${exampleNote} Mur d’images assemblable pour scène, conférence ou salon : taille, pas de pixel et luminosité définis selon le lieu et la distance de vision.`, {
      category: "cat-image",
      subcategory: "cat-image-led",
      reference: "DEMO-LED-01",
      image: imagery.ledStage,
      price: null,
      pricing: "request",
      variants: [
        { name: "Intérieur", price: null },
        { name: "Extérieur", price: null },
      ],
      demo: true,
      ...en({
        title: "Modular LED wall",
        variants: "Indoor\nOutdoor",
        description: `${exampleNoteEn} Video wall assembled for a stage, conference or trade show: size, pixel pitch and brightness chosen according to the venue and the viewing distance.`,
      }),
    }),
  entry("line-array", "products", "Système de sonorisation line array",
    `${exampleNote} Diffusion suspendue ou posée pour couvrir un large public ; configuration calculée selon la jauge et l’acoustique du lieu.`, {
      category: "cat-son",
      subcategory: "cat-son-diffusion",
      reference: "DEMO-SON-01",
      image: imagery.concertOrange,
      price: null,
      pricing: "request",
      demo: true,
      ...en({
        title: "Line array sound system",
        description: `${exampleNoteEn} Flown or ground-stacked system to cover a large audience; configuration calculated according to the capacity and acoustics of the venue.`,
      }),
    }),
  entry("micros-hf", "products", "Microphones sans fil (HF)",
    `${exampleNote} Micros main ou serre-tête pour les prises de parole, les tables rondes et les animations.`, {
      category: "cat-son",
      subcategory: "cat-son-micros",
      reference: "DEMO-SON-02",
      image: imagery.microphoneStage,
      price: null,
      pricing: "request",
      variants: [
        { name: "Micro main", price: null },
        { name: "Serre-tête", price: null },
      ],
      demo: true,
      ...en({
        title: "Wireless microphones",
        variants: "Handheld\nHeadset",
        description: `${exampleNoteEn} Handheld or headset microphones for speeches, panel discussions and hosting.`,
      }),
    }),
  entry("console", "products", "Console de mixage numérique",
    `${exampleNote} Console pour la régie son de vos conférences, concerts et soirées.`, {
      category: "cat-regie",
      reference: "DEMO-REG-01",
      image: imagery.mixer,
      price: null,
      pricing: "request",
      demo: true,
      ...en({
        title: "Digital mixing desk",
        description: `${exampleNoteEn} Mixing desk for the sound control of your conferences, concerts and parties.`,
      }),
    }),
  entry("lyre", "products", "Lyre asservie (moving head)",
    `${exampleNote} Projecteur motorisé pour les faisceaux, les mouvements et les effets de lumière sur scène.`, {
      category: "cat-lumiere",
      subcategory: "cat-lumiere-lyres",
      reference: "DEMO-LUM-01",
      image: imagery.beamsYellow,
      price: null,
      pricing: "request",
      demo: true,
      ...en({
        title: "Moving head",
        description: `${exampleNoteEn} Motorised fixture for beams, movement and lighting effects on stage.`,
      }),
    }),
  entry("par-led", "products", "Projecteur PAR LED",
    `${exampleNote} Projecteur couleur pour la mise en lumière de la scène, du décor ou de l’architecture.`, {
      category: "cat-lumiere",
      subcategory: "cat-lumiere-projecteurs",
      reference: "DEMO-LUM-02",
      image: imagery.redLight,
      price: null,
      pricing: "request",
      demo: true,
      ...en({
        title: "LED PAR fixture",
        description: `${exampleNoteEn} Colour fixture for lighting the stage, the set or the architecture.`,
      }),
    }),
  entry("truss", "products", "Structure truss aluminium",
    `${exampleNote} Poutres et tours en aluminium pour porter la lumière, le son et l’image : portiques, grils et roof systems.`, {
      category: "cat-structures",
      reference: "DEMO-STR-01",
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
      ...en({
        title: "Aluminium truss structure",
        variants: "Length 1 m\nLength 2 m\nLength 3 m",
        description: `${exampleNoteEn} Aluminium beams and towers to carry lighting, sound and video: goalposts, grids and roof systems.`,
        color: "Aluminium",
      }),
    }),
  entry("scene", "products", "Scène modulaire",
    `${exampleNote} Praticables assemblables pour composer une scène ou un podium à la hauteur et aux dimensions de votre événement.`, {
      category: "cat-scenes",
      reference: "DEMO-SCN-01",
      image: imagery.stageRoof,
      price: null,
      pricing: "request",
      color: "Noir",
      swatch: "#08090b",
      demo: true,
      ...en({
        title: "Modular stage",
        description: `${exampleNoteEn} Stage decks assembled into a stage or riser at the height and size your event needs.`,
        color: "Black",
      }),
    }),
  entry("fumee", "products", "Machine à fumée",
    `${exampleNote} Brouillard ou fumée lourde pour révéler les faisceaux lumineux et créer l’atmosphère.`, {
      category: "cat-effets",
      subcategory: "cat-effets-fumee",
      reference: "DEMO-EFX-01",
      image: imagery.smoke,
      price: null,
      pricing: "request",
      demo: true,
      ...en({
        title: "Smoke machine",
        description: `${exampleNoteEn} Haze or low fog to reveal light beams and create atmosphere.`,
      }),
    }),
  entry("confettis", "products", "Canon à confettis",
    `${exampleNote} Effet de lancement pour un moment fort : ouverture, révélation ou final.`, {
      category: "cat-effets",
      subcategory: "cat-effets-confettis",
      reference: "DEMO-EFX-02",
      image: imagery.confetti,
      price: null,
      pricing: "request",
      demo: true,
      ...en({
        title: "Confetti cannon",
        description: `${exampleNoteEn} Launch effect for a highlight: opening, reveal or finale.`,
      }),
    }),
  ...(
    [
      ["inspiration-gala", "Ambiance gala", "Galas", imagery.galaConfetti, "Gala atmosphere"],
      ["inspiration-corporate", "Ambiance convention", "Événements corporate", imagery.ledConference, "Convention atmosphere"],
      ["inspiration-concert", "Ambiance concert", "Concerts", imagery.stageGlow, "Concert atmosphere"],
      ["inspiration-prive", "Ambiance soirée privée", "Événements privés", imagery.partyVenue, "Private party atmosphere"],
      ["inspiration-festival", "Ambiance festival", "Festivals", imagery.festivalConfetti, "Festival atmosphere"],
      ["inspiration-conference", "Ambiance conférence", "Conférences", imagery.conferenceHall, "Conference atmosphere"],
    ] as const
  ).map(([id, title, category, image, titleEn]) =>
    entry(id, "projects", title, inspirationNote, {
      category,
      image,
      demo: true,
      ...en({ title: titleEn, description: inspirationNoteEn }),
    }),
  ),
  entry("instagram", "socials", "Instagram", "@eventhemes", {
    network: "instagram",
    url: "https://www.instagram.com/eventhemes/",
  }),
  entry("whatsapp", "socials", "WhatsApp", "Échangeons sur votre projet", {
    network: "whatsapp",
    url: "https://wa.me/message/AREDMVCCJW5GM1",
    ...en({ description: "Let’s talk about your project" }),
  }),
];
