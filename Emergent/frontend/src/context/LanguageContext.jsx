import React, { createContext, useContext, useMemo, useState } from "react";
import { translations } from "@/i18n/translations";

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    if (typeof window === "undefined") return "zh";
    return localStorage.getItem("lang") || "zh";
  });

  const value = useMemo(() => {
    const t = translations[lang] || translations.zh;
    const set = (l) => {
      setLang(l);
      try {
        localStorage.setItem("lang", l);
      } catch (err) {
        console.warn("LanguageContext: failed to persist lang", err);
      }
    };
    return { lang, setLang: set, t };
  }, [lang]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
};

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
};
