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
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fr");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("language").then((saved) => {
      if (saved === "en" || saved === "fr") setLanguageState(saved);
      setIsLoading(false);
    });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem("language", lang);
  }, []);

  const translations = localeMap[language];

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split(".");
      let value: unknown = translations;
      for (const k of keys) {
        value = (value as Record<string, unknown>)?.[k];
      }

      let result = typeof value === "string" ? value : "";
      if (params && result) {
        Object.keys(params).forEach((param) => {
          result = result.replace(new RegExp(`\\{${param}\\}`, "g"), String(params[param]));
        });
      }
      return result;
    },
    [translations]
  );

  const contextValue = useMemo(
    () => ({ language, setLanguage, t, isLoading }),
    [language, setLanguage, t, isLoading]
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
}
