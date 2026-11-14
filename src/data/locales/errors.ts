import type { Locale } from "@/lib/i18n";

/**
 * Messages renvoyés par le serveur aux formulaires publics. Ils sont rédigés
 * en français dans le code ; un visiteur anglophone reçoit leur traduction.
 */
const english: Record<string, string> = {
  "Un champ est invalide ou trop long.": "A field is invalid or too long.",
  "Demande invalide.": "Invalid request.",
  "Veuillez vérifier le formulaire et le consentement.": "Please check the form and your consent.",
  "Vérifiez votre nom, votre e-mail et votre téléphone.": "Please check your name, email and phone number.",
  "Ajoutez votre e-mail ou choisissez un contact par téléphone.": "Add your email or choose to be contacted by phone.",
  "Choisissez le type de votre événement.": "Choose the type of your event.",
  "Budget estimatif invalide.": "Invalid estimated budget.",
  "Précisez une date à venir et la ville de l’événement.": "Please give an upcoming date and the city of the event.",
  "Une option sélectionnée n’est plus disponible. Actualisez la page.":
    "A selected option is no longer available. Please refresh the page.",
  "Sélection invalide.": "Invalid selection.",
  "Un service n’est plus disponible.": "A service is no longer available.",
  "Vérifiez les produits, les variantes et les quantités.": "Please check the products, options and quantities.",
  "Votre message est obligatoire.": "Your message is required.",
  "Origine non autorisée.": "Origin not allowed.",
  "Données trop volumineuses.": "Data too large.",
  "Formulaire vide.": "Empty form.",
  "Trop de tentatives. Réessayez dans quinze minutes.": "Too many attempts. Please try again in fifteen minutes.",
  "Demande introuvable.": "Request not found.",
  "La demande vient d’être modifiée. Réessayez dans un instant.":
    "The request has just been modified. Please try again in a moment.",
  "Cette session de personnalisation a expiré. Votre demande de rappel reste enregistrée.":
    "This customisation session has expired. Your callback request remains recorded.",
  "Les demandes en ligne seront disponibles prochainement. Contactez-nous sur WhatsApp.":
    "Online requests will be available soon. Contact us on WhatsApp.",
  "Référence de demande invalide.": "Invalid request reference.",
  "Impossible d’enregistrer la demande.": "The request could not be saved.",
  "L’envoi de fichiers n’est pas encore disponible.": "File upload is not available yet.",
  "Fichier vide.": "Empty file.",
  "Format non reconnu : envoyez un PDF, un JPG, un PNG ou un WebP.": "Unrecognised format: send a PDF, JPG, PNG or WebP file.",
  "Envoi du fichier impossible.": "The file could not be sent.",
};

/** Messages construits avec des chiffres : traduits par motif. */
const patterns: [RegExp, (value: string) => string][] = [
  [/^Indiquez un nombre de participants entre 1 et (.+)\.$/, (max) => `Enter a number of attendees between 1 and ${max.replace(/\s/g, ",")}.`],
  [/^La durée de l’événement ne peut dépasser (\d+) heures\.$/, (max) => `The event duration cannot exceed ${max} hours.`],
  [/^Indiquez entre 1 et (\d+) jours de location\.$/, (max) => `Enter between 1 and ${max} rental days.`],
  [/^(\d+) pièces jointes au plus par demande\.$/, (max) => `${max} attachments at most per request.`],
  [/^Fichier trop lourd : (.+) au plus\.$/, (size) => `File too large: ${size.replace("Mo", "MB").replace("Ko", "KB")} at most.`],
];

export function translateServerError(message: string, locale: Locale) {
  if (locale === "fr") return message;
  if (message in english) return english[message];
  for (const [pattern, translate] of patterns) {
    const match = message.match(pattern);
    if (match) return translate(match[1]);
  }
  return message;
}
