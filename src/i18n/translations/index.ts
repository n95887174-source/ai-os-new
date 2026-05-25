import { en } from './en';
import { ru } from './ru';

export type Locale = 'en' | 'ru';
export type TranslationKey = keyof typeof en;

export const translations: Record<Locale, Record<TranslationKey, string>> = { en, ru };

export function getTranslation(locale: Locale, key: TranslationKey, params?: Record<string, string | number>): string {
  let text = translations[locale]?.[key] || translations.en[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export const DEFAULT_LOCALE: Locale = 'en';
