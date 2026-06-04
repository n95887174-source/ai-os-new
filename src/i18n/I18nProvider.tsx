import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Locale, TranslationKey } from './translations';
import { getTranslation, DEFAULT_LOCALE } from './translations';
import { StorageAdapter } from '../kernel/services/storage-adapter';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children, initialLocale = DEFAULT_LOCALE }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    return (StorageAdapter.UI.getSync<Locale>('locale') as Locale) || initialLocale;
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    StorageAdapter.UI.setSync('locale', l);
  }, []);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>) => {
    return getTranslation(locale, key, params);
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
