import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "../../assets/locales/en.json";
import fr from "../../assets/locales/fr.json";

type Language = "en" | "fr";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isLoading: boolean;
}

const localeMap: Record<Language, Record<string, unknown>> = { en, fr };

function lookup(translations: Record<string, unknown>, key: string): string | null {
  const keys = key.split(".");
  let value: unknown = translations;
  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k];
  }
  return typeof value === "string" ? value : null;
}

function applyParams(result: string, params?: Record<string, string | number>): string {
  if (!params || !result) return result;
  let out = result;
  Object.keys(params).forEach((param) => {
    out = out.replace(new RegExp(`\\{${param}\\}`, "g"), String(params[param]));
  });
  return out;
}

function translate(
  translations: Record<string, unknown>,
  key: string,
  params?: Record<string, string | number>,
  fallbackTranslations?: Record<string, unknown>
): string {
  const primary = lookup(translations, key);
  if (primary) return applyParams(primary, params);
  if (fallbackTranslations) {
    const fallback = lookup(fallbackTranslations, key);
    if (fallback) return applyParams(fallback, params);
  }
  return "";
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fr");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("language")
      .then((saved) => {
        if (saved === "en" || saved === "fr") setLanguageState(saved);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem("language", lang);
  }, []);

  const translations = localeMap[language] || localeMap.fr;
  const enFallback = localeMap.en;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string =>
      translate(translations, key, params, language === "en" ? undefined : enFallback),
    [translations, language, enFallback]
  );

  const contextValue = useMemo(
    () => ({ language, setLanguage, t, isLoading }),
    [language, setLanguage, t, isLoading]
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context) return context;

  return {
    language: "fr" as Language,
    setLanguage: () => {},
    t: (key: string, params?: Record<string, string | number>) =>
      translate(localeMap.fr, key, params),
    isLoading: false,
  };
}
