'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { formText, formTextEn } from '@/data/ui';
import { intlLocale, type Locale } from '@/lib/i18n';

type FormLocale = { text: { readonly [Key in keyof typeof formText]: string }; locale: string };

/** Français par défaut : l’administration n’a pas de fournisseur et garde ses libellés. */
const FormLocaleContext = createContext<FormLocale>({ text: formText, locale: intlLocale.fr });

/** Langue des champs (libellés, calendrier, noms de pays) pour tout ce qu’il enveloppe. */
export function FormLocaleProvider({ language, children }: { language: Locale; children: ReactNode }) {
  const value = { text: language === 'en' ? formTextEn : formText, locale: intlLocale[language] };
  return <FormLocaleContext.Provider value={value}>{children}</FormLocaleContext.Provider>;
}

export const useFormText = () => useContext(FormLocaleContext).text;
/** Étiquette Intl (« fr-FR », « en-GB ») des dates et des noms de pays. */
export const useFormLocale = () => useContext(FormLocaleContext).locale;
