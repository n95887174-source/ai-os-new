// Re-export from new modular structure for backward compatibility
export { translations, getTranslation, DEFAULT_LOCALE } from './translations/index';
export type { Locale, TranslationKey } from './translations/index';

import { translations as dict } from './translations/index';

let currentLang: 'en' | 'ru' = 'en';

export function setLanguage(lang: 'en' | 'ru') {
  currentLang = lang;
}

export function getLanguage(): 'en' | 'ru' {
  return currentLang;
}

export function t(key: string, lang?: 'en' | 'ru', params?: Record<string, string | number>): string {
  const l = lang ?? currentLang;
  let text = (dict[l as keyof typeof dict] as Record<string, string> | undefined)?.[key] ?? (dict.en as Record<string, string>)?.[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
