import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/SettingsService';
import { t as translate, setLanguage, type TranslationKey } from './translations';

export function useTranslation() {
  const [lang, setLang] = useState<'en' | 'ru'>(() => {
    const s = settingsService.getSettings();
    const l = s.language === 'ru' ? 'ru' : 'en';
    setLanguage(l);
    return l;
  });

  useEffect(() => {
    const unsub = settingsService.subscribe((settings) => {
      const l = settings.language === 'ru' ? 'ru' : 'en';
      setLang(l);
      setLanguage(l);
    });
    return () => unsub();
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translate(key, lang);
  }, [lang]);

  return { t, lang };
}
