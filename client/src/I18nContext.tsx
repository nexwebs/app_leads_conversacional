import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { translations, getBrowserLanguage, type Language } from './i18n';

type TranslationData = typeof translations.es;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationData;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    if (saved === 'en' || saved === 'es') return saved;
    return getBrowserLanguage();
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = translations[language];

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
