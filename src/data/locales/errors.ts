import type { Locale } from "@/lib/i18n";

/**
 * Messages renvoyés par le serveur aux formulaires publics. Ils sont rédigés
 * en français dans le code ; un visiteur anglophone ou arabophone reçoit leur traduction.
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
const arabic: Record<string, string> = {
  "Un champ est invalide ou trop long.": "أحد الحقول غير صالح أو طويل جدًا.",
  "Demande invalide.": "طلب غير صالح.",
  "Veuillez vérifier le formulaire et le consentement.": "يرجى التحقق من الاستمارة ومن الموافقة.",
  "Vérifiez votre nom, votre e-mail et votre téléphone.": "تحققوا من الاسم والبريد الإلكتروني والهاتف.",
  "Ajoutez votre e-mail ou choisissez un contact par téléphone.": "أضيفوا بريدكم الإلكتروني أو اختاروا التواصل عبر الهاتف.",
  "Choisissez le type de votre événement.": "اختاروا نوع فعاليتكم.",
  "Budget estimatif invalide.": "الميزانية التقديرية غير صالحة.",
  "Précisez une date à venir et la ville de l’événement.": "حددوا تاريخًا قادمًا ومدينة الفعالية.",
  "Une option sélectionnée n’est plus disponible. Actualisez la page.":
    "أحد الخيارات المحددة لم يعد متاحًا. يرجى تحديث الصفحة.",
  "Sélection invalide.": "اختيار غير صالح.",
  "Un service n’est plus disponible.": "إحدى الخدمات لم تعد متاحة.",
  "Vérifiez les produits, les variantes et les quantités.": "تحققوا من المعدات والخيارات والكميات.",
  "Votre message est obligatoire.": "الرسالة إلزامية.",
  "Origine non autorisée.": "مصدر غير مسموح به.",
  "Données trop volumineuses.": "البيانات كبيرة جدًا.",
  "Formulaire vide.": "الاستمارة فارغة.",
  "Trop de tentatives. Réessayez dans quinze minutes.": "محاولات كثيرة. يرجى المحاولة بعد خمس عشرة دقيقة.",
  "Demande introuvable.": "الطلب غير موجود.",
  "La demande vient d’être modifiée. Réessayez dans un instant.": "عُدِّل الطلب للتو. يرجى المحاولة بعد لحظة.",
  "Cette session de personnalisation a expiré. Votre demande de rappel reste enregistrée.":
    "انتهت جلسة التخصيص. يبقى طلب معاودة الاتصال مسجلًا.",
  "Les demandes en ligne seront disponibles prochainement. Contactez-nous sur WhatsApp.":
    "ستتوفر الطلبات عبر الإنترنت قريبًا. تواصلوا معنا على واتساب.",
  "Référence de demande invalide.": "مرجع الطلب غير صالح.",
  "Impossible d’enregistrer la demande.": "تعذر تسجيل الطلب.",
  "L’envoi de fichiers n’est pas encore disponible.": "إرسال الملفات غير متاح بعد.",
  "Fichier vide.": "الملف فارغ.",
  "Format non reconnu : envoyez un PDF, un JPG, un PNG ou un WebP.": "صيغة غير معروفة: أرسلوا ملف PDF أو JPG أو PNG أو WebP.",
  "Envoi du fichier impossible.": "تعذر إرسال الملف.",
};

/** Messages construits avec des chiffres : traduits par motif. */
type Pattern = [RegExp, (value: string) => string];
const messages: Record<Exclude<Locale, "fr">, { exact: Record<string, string>; patterns: Pattern[] }> = {
  en: {
    exact: english,
    patterns: [
      [/^Indiquez un nombre de participants entre 1 et (.+)\.$/, (max) => `Enter a number of attendees between 1 and ${max.replace(/\s/g, ",")}.`],
      [/^La durée de l’événement ne peut dépasser (\d+) heures\.$/, (max) => `The event duration cannot exceed ${max} hours.`],
      [/^Indiquez entre 1 et (\d+) jours de location\.$/, (max) => `Enter between 1 and ${max} rental days.`],
      [/^(\d+) pièces jointes au plus par demande\.$/, (max) => `${max} attachments at most per request.`],
      [/^Fichier trop lourd : (.+) au plus\.$/, (size) => `File too large: ${size.replace("Mo", "MB").replace("Ko", "KB")} at most.`],
    ],
  },
  ar: {
    exact: arabic,
    patterns: [
      [/^Indiquez un nombre de participants entre 1 et (.+)\.$/, (max) => `أدخلوا عدد مشاركين بين 1 و${max.replace(/\s/g, ".")}.`],
      [/^La durée de l’événement ne peut dépasser (\d+) heures\.$/, (max) => `لا يمكن أن تتجاوز مدة الفعالية ${max} ساعة.`],
      [/^Indiquez entre 1 et (\d+) jours de location\.$/, (max) => `أدخلوا عدد أيام كراء بين 1 و${max}.`],
      [/^(\d+) pièces jointes au plus par demande\.$/, (max) => `${max} مرفقات كحد أقصى لكل طلب.`],
      [
        /^Fichier trop lourd : (.+) au plus\.$/,
        (size) => `الملف كبير جدًا: ${size.replace("Mo", "ميغابايت").replace("Ko", "كيلوبايت")} كحد أقصى.`,
      ],
    ],
  },
};

export function translateServerError(message: string, locale: Locale) {
  if (locale === "fr") return message;
  const { exact, patterns } = messages[locale];
  if (message in exact) return exact[message];
  for (const [pattern, translate] of patterns) {
    const match = message.match(pattern);
    if (match) return translate(match[1]);
  }
  return message;
}
