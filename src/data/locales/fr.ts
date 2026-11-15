/**
 * Textes d’interface du site public — français (langue de référence).
 * La version anglaise (en.ts) reprend exactement les mêmes clés.
 * « {nom} » est remplacé à l’affichage (voir `fill` dans lib/i18n).
 */
export const fr = {
  languageName: "Français",
  /** Libellé court du sélecteur de langue. */
  languageShort: "FR",

  meta: {
    title: "{brand} — {baseline} au Maroc",
    description: "{summary} Fourniture, location, installation et exploitation.",
  },

  brand: {
    market: "Maroc",
    baseline: "Production technique & location de matériel événementiel",
    summary:
      "Scènes, structures, écrans LED, sonorisation, éclairage et régie technique pour vos événements au Maroc.",
    disciplines: ["Scène", "Structure", "Image", "Son", "Lumière", "Régie"],
  },

  /** Titre et description de chaque page (référencement). */
  pages: {
    about: {
      title: "À propos",
      description:
        "{brand}, production technique événementielle au Maroc : vision, valeurs, expertise technique et méthode de travail.",
    },
    services: {
      title: "Nos expertises techniques",
      description:
        "Scènes et podiums, structures truss, écrans LED et vidéo, sonorisation, éclairage professionnel et régie technique pour vos événements au Maroc.",
    },
    equipment: {
      title: "Matériel événementiel",
      description:
        "Catalogue de matériel technique : écrans LED, sonorisation, éclairage, structures, scènes et effets spéciaux. Ajoutez vos équipements à votre demande de devis.",
    },
    projects: {
      title: "Réalisations",
      description:
        "Galas, événements corporate, concerts, festivals et conférences : les réalisations {brand}, classées par type d’événement.",
    },
    contact: {
      title: "Contact",
      description:
        "Contactez {brand} par téléphone, WhatsApp ou formulaire pour parler de la technique de votre prochain événement.",
    },
    quote: {
      title: "Demande de devis",
      description:
        "Sélectionnez vos prestations et votre matériel, décrivez votre événement et envoyez votre demande de devis, sans engagement.",
    },
    legal: { title: "Mentions légales", description: "Mentions légales du site {brand}." },
    privacy: { title: "Politique de confidentialité", description: "Politique de confidentialité du site {brand}." },
    cities: {
      title: "Zones d’intervention",
      description:
        "Les villes du Maroc où {brand} intervient : scènes, structures, écrans LED, sonorisation, éclairage et régie technique pour vos événements.",
    },
  },

  nav: {
    home: "Accueil",
    about: "À propos",
    services: "Services",
    equipment: "Matériel",
    projects: "Réalisations",
    contact: "Contact",
    quote: "Mon devis",
    skip: "Aller au contenu",
    main: "Navigation principale",
    mobile: "Navigation mobile",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    logoAlt: "{brand} — accueil",
    viewQuote: "Voir mon devis →",
    language: "Langue",
  },

  footer: {
    explore: "Explorer",
    services: "Services",
    catalogue: "Catalogue matériel",
    meet: "Rencontrons-nous",
    talk: "Parlons de votre projet",
    rights: "Tous droits réservés.",
    legal: "Mentions légales",
    privacy: "Confidentialité",
    admin: "Administration",
    areas: "Zones d’intervention",
    cookies: "Gérer les cookies",
  },

  common: {
    requestQuote: "Demander un devis",
    addToQuote: "Ajouter au devis",
    inQuote: "Dans mon devis",
    unavailable: "Indisponible",
    added: "{title} ajouté à votre devis",
    illustration: "Photographie d’illustration",
    example: "Exemple",
    inspiration: "Inspiration",
    stageAlt: "Scène équipée d’écrans LED et de projecteurs",
    learnMore: "En savoir plus",
    discover: "Découvrir",
    whatsapp: "En parler sur WhatsApp",
    backHome: "Retour à l’accueil",
    sending: "Envoi…",
    missing: "Quelques informations manquent encore.",
    local: "Aperçu local",
  },

  /** Invitation finale des pages intérieures. */
  cta: {
    eyebrow: "VOTRE PROJET, NOTRE TECHNIQUE",
    titleStart: "Parlons de votre",
    titleEnd: "prochain événement.",
    whatsapp: "Nous contacter sur WhatsApp",
  },

  hero: {
    worlds: [
      { label: "Concevoir", caption: "Tout commence par une étude.", detail: "Le lieu, le public, le programme." },
      { label: "Installer", caption: "Chaque structure à sa place.", detail: "Scène, truss, écrans, son et lumière." },
      { label: "Exploiter", caption: "Le direct, maîtrisé.", detail: "Une régie technique aux commandes." },
    ],
    expertise: "Nos expertises",
    resume: "Reprendre",
    pause: "Pause",
    resumeLabel: "Reprendre l’animation de la structure",
    pauseLabel: "Mettre l’animation de la structure en pause",
    discover: "Découvrir {brand}",
    worldsLabel: "Explorer les trois temps d’un projet",
    whatsapp: "Nous contacter sur WhatsApp (nouvel onglet)",
  },

  intro: {
    eyebrow: "Production technique événementielle",
    titleStart: "L’invisible fait",
    titleEnd: "la différence.",
    manifesto:
      "Une scène se construit bien avant de s’allumer. De l’étude technique au démontage, nous faisons de la technique le socle invisible et fiable de votre événement.",
    caption: "Scène, image, lumière.",
    annotationStart: "Tout se règle",
    annotationEnd: "en amont.",
  },

  /** Les métiers d’EVENTHEMES (cahier des charges §01). */
  activities: [
    ["Fourniture", "Des équipements techniques et audiovisuels professionnels, pour chaque format d’événement."],
    ["Location", "Un parc matériel à composer selon vos besoins : scène, structure, image, son et lumière."],
    ["Installation", "Montage, câblage et réglages sur site, dans le respect du lieu et du planning."],
    ["Exploitation", "Une régie technique aux commandes pendant l’événement, jusqu’au démontage."],
  ],

  homeServices: {
    eyebrow: "Nos expertises",
    titleStart: "Toute la technique.",
    titleEnd: "Une seule équipe.",
    description:
      "Scène, structure, image, son, lumière et régie : choisissez les prestations utiles à votre événement et ajoutez-les à votre demande de devis.",
    all: "Tous nos services",
    caption: "Photographies d’ambiance et d’illustration.",
  },

  gallery: {
    eyebrow: "Réalisations",
    titleStart: "Chaque format,",
    titleEnd: "sa technique.",
    introStart: "Galas, concerts, festivals, conférences :",
    introEnd: "les ambiances, par type d’événement.",
    all: "Toute la galerie",
    filterLabel: "Filtrer les réalisations par type d’événement",
    allFilter: "Tous",
    previous: "Faire défiler la galerie vers la gauche",
    next: "Faire défiler la galerie vers la droite",
    region: "Galerie d’inspiration — faire défiler horizontalement",
    view: "Voir {title}",
    note: "Planches d’inspiration : ces visuels illustrent des ambiances et seront remplacés par les réalisations {brand}.",
    photo: "Photographie {index} sur {total}",
    seeProject: "Voir le projet",
    previousProject: "Projet précédent",
    nextProject: "Projet suivant",
    close: "Fermer la visionneuse",
  },

  rental: {
    eyebrow: "Matériel technique",
    titleStart: "Le bon matériel.",
    titleEnd: "Au bon endroit.",
    description:
      "Écrans LED, sonorisation, éclairage, structures et effets : composez votre sélection et ajoutez-la directement à votre devis.",
    all: "Tout le catalogue",
    region: "Catalogue matériel — faire défiler horizontalement",
    moreStart: "Tout le",
    moreEnd: "catalogue",
  },

  why: {
    eyebrow: "Pourquoi {brand}",
    titleStart: "La technique,",
    titleEnd: "sans compromis.",
    intro: "Quatre engagements pour que chaque événement se déroule comme prévu, du premier échange au démontage.",
    link: "Découvrir le matériel",
  },

  /** « Why EVENTHEMES » (cahier des charges §04 A). */
  reasons: [
    ["Équipements professionnels", "Un parc matériel pensé pour l’événementiel : scène, structure, image, son et lumière."],
    ["Expertise technique", "La maîtrise du son, de la lumière, de la vidéo et des structures, de l’étude au direct."],
    ["Solutions adaptées", "Une configuration pensée pour votre lieu, votre public et votre format, du séminaire au festival."],
    ["Exécution fiable", "Préparation, installation et exploitation menées avec méthode, pour un événement sans fausse note."],
  ],

  homeCta: {
    topline: "Et maintenant, à vous.",
    label: "Votre scène vous attend : demander un devis",
    titleStart: "Votre scène",
    titleEnd: "vous attend.",
    textStart: "Un lieu, une date, un programme.",
    textEnd: "Nous concevons la technique qui va avec.",
    whatsapp: "Parlons sur WhatsApp",
    behind: "Dans les coulisses",
  },

  /** Méthodologie (cahier des charges §04 B) — texte proposé, à valider par EVENTHEMES. */
  method: {
    eyebrow: "Notre méthode",
    titleStart: "De l’étude",
    titleEnd: "au direct.",
    intro: "Trois temps, sept étapes, une même exigence : une technique qui sert votre événement sans jamais s’imposer.",
    chapters: [
      { title: "Concevoir.", note: "L’étude" },
      { title: "Installer.", note: "Le montage" },
      { title: "Exploiter.", note: "Le direct" },
    ],
    steps: [
      ["Brief", "Votre événement, votre lieu, votre public et vos contraintes : nous recueillons le besoin technique."],
      ["Étude technique", "Accès, alimentation électrique, points d’accroche : nous choisissons les équipements adaptés au lieu."],
      ["Proposition & devis", "Implantation, liste du matériel et devis détaillé, ajustés à votre budget."],
      ["Préparation", "Préparation et tests du matériel, planning de montage, coordination avec les autres prestataires."],
      ["Installation", "Montage des scènes, structures, écrans, son et lumière, puis réglages sur site."],
      ["Exploitation", "Régie son, lumière et vidéo pendant l’événement, au rythme de votre programme."],
      ["Démontage & bilan", "Démontage, remise en état des espaces et retour d’expérience avec vous."],
    ],
  },

  catalog: {
    projectsEyebrow: "NOS RÉALISATIONS",
    equipmentEyebrow: "CATALOGUE MATÉRIEL",
    byEventType: "Filtrer par type d’événement",
    byCategory: "Filtrer par catégorie",
    allProjects: "Tous",
    allEquipment: "Tout le matériel",
    byType: "Filtrer par type de matériel",
    allTypes: "Tous les types",
    searchProjects: "Rechercher une réalisation",
    searchEquipment: "Rechercher dans le catalogue",
    searchProjectsPlaceholder: "Rechercher un projet…",
    searchEquipmentPlaceholder: "Nom, marque, modèle, référence…",
    byBrand: "Filtrer par marque",
    allBrands: "Toutes les marques",
    byColor: "Filtrer par couleur",
    allColors: "Toutes les couleurs",
    maxPrice: "Prix maximum",
    maxPricePlaceholder: "Prix max.",
    available: "Disponible",
    countProjects: "{count} projet(s)",
    countEquipment: "{count} article(s)",
    demoNote: "Les contenus marqués « exemple » ou « inspiration » sont à remplacer par le catalogue et les réalisations {brand}.",
    inspirationTag: "INSPIRATION",
    exampleTag: "EXEMPLE DE CATALOGUE",
    reference: "Réf. {reference}",
    empty: "Aucun résultat pour ces critères.",
    reset: "Réinitialiser les filtres",
  },

  servicesPage: { eyebrow: "NOS EXPERTISES" },

  /** Fil d’Ariane des pages intérieures. */
  breadcrumb: { label: "Fil d’Ariane" },

  /** Page d’un service (cahier des charges §10 : une page par service). */
  service: {
    eyebrow: "NOS EXPERTISES",
    items: "Prestations incluses",
    equipment: "Le matériel associé",
    equipmentIntro: "Une sélection du catalogue pour ce service. La disponibilité et le tarif sont confirmés par notre équipe.",
    allEquipment: "Tout le matériel « {category} »",
    others: "Nos autres expertises",
    more: "Découvrir le service",
    areas: "Nous intervenons à",
  },

  /** Zones d’intervention : une page par ville publiée (référencement local). */
  cities: {
    eyebrow: "ZONES D’INTERVENTION",
    title: "Production technique événementielle à {city}",
    intro: "Les villes où notre équipe intervient. Votre ville n’y figure pas ? Décrivez-nous votre projet : nous étudions chaque demande.",
    services: "Nos expertises à {city}",
    servicesIntro: "Choisissez les prestations utiles à votre événement : chaque service se compose à la carte, de l’étude technique au démontage.",
    equipment: "Le matériel, par catégorie",
    quote: "Demander un devis à {city}",
    others: "Autres zones d’intervention",
    discover: "Découvrir",
  },

  /** Mesure d’audience : consentement préalable (loi 09-08), affiché seulement si un outil est configuré. */
  consent: {
    label: "Mesure d’audience",
    text: "Avec votre accord, nous mesurons la fréquentation du site avec Google Analytics afin de l’améliorer. Vous pouvez changer d’avis à tout moment depuis le pied de page.",
    accept: "Accepter",
    refuse: "Refuser",
    more: "Politique de confidentialité",
  },

  about: {
    eyebrow: "À PROPOS D’{brand}",
    imageAlt: "Scène équipée d’écrans LED et de projecteurs — photographie d’illustration",
    values: "NOS VALEURS",
    expertise: "EXPERTISE TECHNIQUE",
    expertiseTitle: "De la fourniture à l’exploitation.",
  },

  detail: {
    backEquipment: "← Retour au catalogue",
    backProjects: "← Retour aux réalisations",
    zoom: "Agrandir la photographie",
    show: "Afficher cette photographie",
    illustration: "· ILLUSTRATION",
    brand: "Marque",
    model: "Modèle",
    reference: "Référence",
    color: "Couleur / finition",
    length: "Longueur",
    width: "Largeur",
    place: "Lieu",
    year: "Année",
    specs: "Caractéristiques techniques",
    delivered: "Prestations réalisées",
    unavailable: "Indisponible pour le moment.",
    availability: "Disponibilité et tarif confirmés par notre équipe selon la date, la quantité, la durée et le lieu.",
    variant: "Variante",
    quantity: "Quantité souhaitée",
    video: "Voir la vidéo",
    close: "Fermer la photographie",
  },

  legal: {
    legal: "Mentions légales",
    privacy: "Politique de confidentialité",
    pending:
      "Page en préparation. Les informations légales et la politique de confidentialité doivent être complétées et validées par {brand} avant la mise en ligne.",
    demo: "La version locale sert uniquement à la démonstration. Utilisez des coordonnées fictives pour tester les formulaires.",
  },

  /** « Mon devis » : demande de rappel, puis personnalisation. */
  quote: {
    eyebrow: "Mon devis",
    journey: ["Faisons connaissance", "Imaginez votre événement", "Recevez votre devis"],
    titles: {
      lead: ["Votre événement", "commence ici."],
      invite: ["C’est noté{name}.", "Et si l’on imaginait la suite ?"],
      waiting: ["À très bientôt{name}.", "Nous vous rappelons."],
      configure: ["Composez votre", "événement."],
      done: ["Votre devis", "est prêt."],
    },
    intros: {
      lead: "Laissez-nous vos coordonnées : notre équipe vous rappelle. Ensuite, si vous le souhaitez, composez votre événement et découvrez son estimation.",
      invite: "Votre demande de rappel est enregistrée. Vous pouvez vous arrêter ici, ou nous en dire plus et voir, poste par poste, ce que représente votre événement.",
      waiting: "Notre équipe vous contactera au {phone} dans les meilleurs délais. Vous pouvez toujours composer votre événement en attendant.",
      configure: "Choisissez vos prestations et votre matériel : l’estimation évolue en direct avec vos choix. Rien n’est engagé avant notre échange.",
      done: "Merci pour votre demande. Notre équipe vous contactera dans les meilleurs délais afin de préparer une proposition adaptée à votre événement.",
    },
    /** Avant le prénom dans « C’est noté{name}. » */
    nameSeparator: ", ",
    reassurance: "Sans engagement · Sans paiement en ligne · À votre rythme",
    preferWriting: "Vous préférez écrire ?",
    whatsapp: "Échangeons sur WhatsApp",
    leadKicker: "01 — Faisons connaissance",
    name: "Nom complet",
    company: "Entreprise (facultatif)",
    phone: "Téléphone",
    email: "E-mail (facultatif)",
    contactMethod: "Comment préférez-vous être contacté ?",
    event: "Votre événement",
    honeypot: "Site web",
    consentStart: "J’accepte d’être contacté au sujet de mon événement et la",
    privacyPolicy: "politique de confidentialité",
    errors: {
      name: "Indiquez votre nom.",
      phone: "Indiquez un numéro de téléphone valide.",
      email: "Cette adresse e-mail semble incomplète.",
      emailMethod: "Ajoutez votre e-mail, ou choisissez un autre moyen de contact.",
      event: "Choisissez votre événement.",
      consent: "Votre accord est nécessaire pour être recontacté.",
      failed: "L’envoi a échoué. Réessayez.",
    },
    submit: "Être recontacté",
    next: "Ensuite, si vous le souhaitez : personnalisation de votre événement et estimation détaillée.",
    localLead: "Aperçu local · utilisez des coordonnées fictives.",
    received: "Demande reçue · Réf. {reference}",
    inviteTitle: "Envie d’aller un peu plus loin ?",
    waitingTitle: "Votre demande est entre de bonnes mains.",
    emailed: "Un accusé de réception est en route vers {email}.",
    inviteText:
      "En quelques étapes, choisissez vos prestations et votre matériel, joignez vos plans ou photos, et recevez votre devis estimatif détaillé.",
    waitingText: "Si l’envie vous prend, composez votre événement : votre devis estimatif sera prêt en quelques minutes.",
    perks: [
      "Estimation en direct, poste par poste",
      "Plans, photos ou documents en pièces jointes",
      "Devis imprimable et envoyable sur WhatsApp",
      "Votre demande reste enregistrée, quoi que vous choisissiez",
    ],
    customise: "Personnaliser mon événement",
    callMe: "Je préfère être rappelé",
    localInvite: "Aperçu local : demande enregistrée sur cet ordinateur ; les e-mails sont enregistrés pour relecture, pas envoyés.",
  },

  configurator: {
    steps: ["L’événement", "Les prestations", "Le matériel", "Les détails", "Récapitulatif"],
    step: "Étape {step} / {total}",
    errors: {
      event: "Choisissez votre événement.",
      date: "Choisissez une date à venir.",
      city: "Choisissez la ville de l’événement.",
      duration: "Indiquez une durée de {max} heures au plus.",
      guests: "Indiquez entre 1 et {max} participants, ou laissez vide.",
      rentalDays: "Indiquez entre 1 et {max} jours de location.",
      budget: "Indiquez un budget positif.",
      tooMany: "{max} fichiers au plus : {count} n’ont pas été ajoutés.",
      failed: "Impossible d’envoyer votre demande. Réessayez.",
    },
    uploading: "Envoi des pièces jointes · {index}/{total}",
    event: "Votre événement",
    date: "Date de l’événement",
    duration: "Durée de l’événement (facultatif)",
    hours: "heures",
    durationPlaceholder: "Si vous la connaissez",
    city: "Ville",
    cityPlaceholder: "Choisir une ville",
    cityEmpty: "Ville non listée : choisissez la plus proche, puis précisez le lieu.",
    place: "Lieu (facultatif)",
    placePlaceholder: "Nom du lieu, salle, adresse…",
    participants: "Nombre estimé de participants (facultatif)",
    participantsUnit: "participants",
    participantsRange: "Nombre de participants, réglage rapide",
    participantsExact: "Nombre exact",
    participantsHint: "Au-delà de {max}, saisissez le nombre. Laissez vide si vous ne le savez pas encore.",
    servicesLede: "Sélectionnez les expertises qui vous intéressent. Vous pouvez aussi les ajouter depuis la page Services du site.",
    equipmentLede: "Composez votre sélection de matériel. Les quantités restent modifiables jusqu’à l’envoi ; la disponibilité est confirmée par notre équipe.",
    search: "Rechercher un matériel",
    searchPlaceholder: "Nom, marque, référence…",
    category: "Catégorie",
    allCategories: "Toutes les catégories",
    variant: "Variante — {title}",
    noMatch: "Aucun matériel ne correspond à cette recherche.",
    selection: "Votre sélection · {count} article(s)",
    remove: "Retirer {title}",
    rentalDays: "Nombre de jours de location",
    rentalUnit: "jour(s)",
    rentalHint: "Durée de mise à disposition du matériel, montage compris si vous la connaissez.",
    catalogue: "Explorer le catalogue complet",
    detailsLede: "Tout est facultatif : plus nous en savons, plus notre proposition sera précise.",
    description: "Description du projet (facultatif)",
    descriptionPlaceholder: "Programme, déroulé, contraintes du lieu (accès, alimentation, horaires de montage), autres besoins…",
    budget: "Budget estimatif (facultatif)",
    budgetPlaceholder: "Si vous en avez un",
    budgetHint: "Il nous aide à proposer la configuration la plus adaptée ; il ne vous engage pas.",
    attachments: "Pièces jointes (facultatif)",
    attachmentsHint: "Plans du lieu, photos, fiche technique… {limits}. Les photos trop lourdes sont réduites automatiquement.",
    selectedFiles: "Pièces jointes sélectionnées",
    recap: {
      event: "Événement",
      date: "Date",
      place: "Lieu",
      participants: "Participants",
      services: "Services",
      equipment: "Matériel",
      budget: "Budget estimatif",
      description: "Description du projet",
      attachments: "Pièces jointes",
      contact: "Vos coordonnées",
      toDefine: "À définir",
      toSpecify: "À préciser",
      noServices: "Aucun service sélectionné",
      noEquipment: "Aucun matériel sélectionné",
      notSpecified: "Non précisé",
      noDescription: "Aucune précision",
      noAttachments: "Aucune",
      contactWay: "Contact : {method}",
      edit: "Modifier",
    },
    previous: "← Précédent",
    continue: "Continuer",
    send: "Envoyer ma demande",
    terms: "Sans engagement et sans paiement en ligne. Disponibilités et tarifs confirmés par notre équipe.",
    localNote: "Aperçu local : les demandes sont enregistrées sur cet ordinateur.",
    live: {
      label: "Estimation en direct",
      kicker: "Estimation en direct",
      yourEvent: "Votre événement",
      toSpecify: "Date, lieu et participants à préciser",
      priced: "Postes déjà chiffrés",
      indicative: "Montant indicatif",
      empty: "Vos choix apparaîtront ici.",
      onRequestNote: "Certaines prestations sont chiffrées sur devis : notre équipe vous communiquera le montant définitif.",
      note: "Estimation indicative, non contractuelle, à confirmer par notre équipe.",
      count: "{services} service(s) · {articles} article(s)",
      files: " · {count} pièce(s) jointe(s)",
    },
    mobileStep: "Étape {step}/{total}",
    quantity: "Quantité — {label}",
    removeOne: "Retirer un",
    addOne: "Ajouter un",
  },

  document: {
    label: "Devis estimatif {reference}",
    title: "Devis estimatif",
    issued: "Émis le {date}",
    client: "Client",
    contactWay: "Contact préféré : {method}",
    event: "Événement",
    noDate: "Date à définir",
    rental: "Location du matériel : {days}",
    item: "Désignation",
    quantity: "Qté",
    amount: "Montant",
    pricedTotal: "Total estimatif des postes chiffrés",
    total: "Total estimatif",
    notes: "Vos précisions",
    budget: "Budget estimatif communiqué : {amount}",
    attachments: "Pièces jointes",
    notReceived: " · non reçue{reason}",
    resend: "Envoyez-nous {files} sur WhatsApp en rappelant la référence {reference}.",
    resendOne: "ce fichier",
    resendMany: "ces fichiers",
    disclaimer: "Estimation indicative et non contractuelle, établie à partir des tarifs publiés sur le site.",
    unpriced: " Les postes « sur devis » seront chiffrés par notre équipe.",
    confirmation: " Disponibilités, quantités et montants définitifs vous seront confirmés dans votre devis personnalisé. Aucun paiement en ligne.",
    print: "Imprimer ou enregistrer en PDF",
    whatsapp: "Envoyer sur WhatsApp",
    restart: "Nouvelle demande",
    copied: "Votre message est copié : collez-le dans la conversation WhatsApp qui s’ouvre.",
    mention: "Mentionnez la référence {reference} dans la conversation WhatsApp qui s’ouvre.",
    emailed: "Une copie de ce récapitulatif vous a été envoyée à {email}.",
    material: "matériel : {items}",
  },

  contact: {
    eyebrow: "PARLONS DE VOTRE PROJET",
    title: "Racontez-nous votre idée.",
    name: "Nom complet",
    company: "Entreprise",
    email: "E-mail",
    phone: "Téléphone",
    contactMethod: "Contact préféré",
    eventType: "Type d’événement",
    toDefine: "À définir",
    subject: "Objet",
    message: "Votre message",
    consentStart: "J’accepte que mes coordonnées soient utilisées pour répondre à ma demande et j’ai pris connaissance de la",
    submit: "Envoyer mon message",
    failed: "Impossible d’envoyer votre message. Réessayez.",
    asideEyebrow: "RESTONS EN CONTACT",
    asideTitle: "À votre écoute.",
    asideText: "Un projet précis ? Composez votre événement et recevez votre devis estimatif.",
    localNote: "Aperçu local · Utilisez des coordonnées fictives. Les messages sont enregistrés sur cet ordinateur.",
    sentEyebrow: "MESSAGE ENVOYÉ",
    sentStart: "Merci pour",
    sentEnd: "votre message.",
    sentLocal: "Votre message de test a été enregistré dans l’administration locale. Les e-mails sont enregistrés pour relecture, pas envoyés.",
    sentText: "Notre équipe vous répondra dans les meilleurs délais.",
    sentEmailed: " Un accusé de réception vous a été envoyé par e-mail.",
    reference: "Référence : {reference}",
    address: "Adresse",
    map: "Voir sur la carte",
    hours: "Horaires",
  },

  /** Pièces jointes : consignes, poids et refus, vérifiés dans le navigateur. */
  attachments: {
    hint: "PDF, JPG, PNG ou WebP · {count} fichiers · {size} chacun",
    megabytes: "{size} Mo",
    kilobytes: "{size} Ko",
    badType: "« {name} » : format non accepté (PDF, JPG, PNG ou WebP).",
    tooLarge: "« {name} » dépasse {size} : envoyez-le-nous plutôt par WhatsApp ou par e-mail.",
    heavy: "Fichier trop lourd ({size}).",
    failed: "Envoi impossible.",
    offline: "Connexion interrompue.",
  },

  /** Libellés des moyens de contact ; les valeurs enregistrées restent en français. */
  contactMethods: { Téléphone: "Téléphone", WhatsApp: "WhatsApp", "E-mail": "E-mail" },

  /** Page d’attente (« Bientôt en ligne »), imposée depuis les paramètres du site. */
  comingSoon: {
    title: "Bientôt en ligne",
    titleStart: "Quelque chose",
    titleEnd: "d’extraordinaire arrive.",
  },

  notFound: {
    eyebrow: "404 — PAGE INTROUVABLE",
    title: "Reprenons le fil.",
    text: "Cette page n’existe pas ou n’est plus publiée.",
  },

  error: {
    title: "Un instant, s’il vous plaît.",
    text: "La page est momentanément indisponible. Réessayez dans quelques instants.",
    retry: "Réessayer ↻",
    home: "Retour à l’accueil →",
  },

  /** Prestations de chaque service (cahier des charges §04 C), si l’administration n’en indique pas. */
  serviceDetails: {
    scenes: ["Scènes modulaires", "Podiums", "Plateformes", "Installations scéniques"],
    structures: ["Structures aluminium", "Roof systems", "Supports", "Rigging"],
    "led-video": ["Murs LED", "Écrans géants", "Diffusion", "Solutions vidéo"],
    sonorisation: ["Systèmes audio", "Enceintes", "Microphones", "Consoles"],
    eclairage: ["Moving heads", "PAR LED", "Éclairage architectural", "Effets lumineux"],
    regie: ["Régie son", "Régie lumière", "Régie vidéo", "Coordination", "Exploitation technique"],
    complementaires: ["Effets spéciaux", "Installation", "Exploitation", "Démontage"],
  },

  /** Classement des réalisations : la valeur enregistrée (française) et son libellé. */
  projectCategories: {
    Galas: "Galas",
    "Événements corporate": "Événements corporate",
    Concerts: "Concerts",
    "Événements privés": "Événements privés",
    Festivals: "Festivals",
    Conférences: "Conférences",
  },

  /** Règles d’affichage des prix, durées et quantités. */
  format: {
    onRequest: "Sur devis",
    from: "À partir de {amount}",
    perDay: "{amount} / jour",
    fromShort: "Dès {amount}",
    eventType: "Type d’événement — {title}",
    participant: "{count} participant",
    participants: "{count} participants",
    participantsUnknown: "Participants à préciser",
    day: "{count} jour",
    days: "{count} jours",
    hours: "{count} h",
    followers: "{count} abonnés",
    unitsByDays: "{units} unité(s) × {days} jour(s)",
  },

  whatsapp: {
    message:
      "Bonjour {brand}, je souhaite demander un devis pour un événement de type {type}, prévu le {date}, à {city}. Les services souhaités sont : {services}. Voici mes informations : {contact}.",
    reference: " Référence de ma demande : {reference}.",
    noType: "à définir",
    noDate: "(date à définir)",
    noCity: "(ville à définir)",
    noServices: "à définir ensemble",
  },

  /** Accusé de réception envoyé au client, dans sa langue. */
  email: {
    hello: "Bonjour{name},",
    footer: "Vous recevez cet e-mail à la suite d’une demande envoyée depuis notre site. Si vous n’en êtes pas à l’origine, ignorez-le.",
    whatsapp: "Nous écrire sur WhatsApp",
    reference: "Référence",
    subject: "Objet",
    estimate: "Estimation indicative",
    notes: "Vos précisions",
    contact: {
      subject: "Nous avons bien reçu votre message · {reference}",
      title: "Merci pour votre message.",
      text: "Votre message est bien arrivé. Notre équipe {brand} vous répondra dans les meilleurs délais.",
    },
    callback: {
      subject: "Nous avons bien reçu votre demande · {reference}",
      title: "Votre demande est bien reçue.",
      text: "Nous avons bien reçu votre demande. Notre équipe {brand} vous contactera dans les meilleurs délais{way} afin de préparer une proposition adaptée à votre événement.",
    },
    quote: {
      subject: "Récapitulatif de votre demande de devis · {reference}",
      title: "Votre demande de devis.",
      text: "Merci pour votre demande de devis. Voici le récapitulatif de ce que vous nous avez transmis : notre équipe vous recontacte dans les meilleurs délais{way} pour préparer une proposition adaptée.",
      disclaimer:
        "Montants indicatifs et non contractuels : disponibilités et tarifs définitifs vous seront confirmés dans votre devis personnalisé. Aucun paiement en ligne.",
    },
    ways: { Téléphone: " par téléphone", WhatsApp: " sur WhatsApp", "E-mail": " par e-mail" },
    rows: {
      event: "Événement",
      date: "Date",
      place: "Lieu",
      participants: "Participants",
      toSpecify: "À préciser",
      services: "Services",
      equipment: "Matériel",
      rental: "Location : {days}",
      budget: "Budget estimatif",
    },
  },
} as const;

type Widen<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? readonly Widen<Item>[]
    : { readonly [Key in keyof T]: Widen<T[Key]> };

/** Structure commune aux deux langues : l’anglais doit fournir chaque clé. */
export type Dictionary = Widen<typeof fr>;
