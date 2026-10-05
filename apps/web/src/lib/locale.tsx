"use client";

// ภาษาที่เลือก (TH/EN) เก็บใน localStorage — static site อ่าน cookie ฝั่ง server ไม่ได้
import { createContext, useContext, useEffect, useState } from "react";
import type { Locale } from "@ev/core";

const LocaleContext = createContext<{ locale: Locale; setLocale: (l: Locale) => void }>({
  locale: "th",
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("th");
  useEffect(() => {
    try {
      if (localStorage.getItem("ev-lang") === "en") setLocaleState("en");
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("ev-lang", l);
    } catch {
      // ignore
    }
  };
  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
