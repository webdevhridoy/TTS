"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Lang = "en" | "ar";

interface DashboardLangContextValue {
  lang: Lang;
  toggle: () => void;
}

const DashboardLangContext = createContext<DashboardLangContextValue>({
  lang: "ar",
  toggle: () => {},
});

export function DashboardLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("dashboard-lang") as Lang | null;
    if (saved === "en" || saved === "ar") setLang(saved);
  }, []);

  const toggle = () => {
    const next: Lang = lang === "ar" ? "en" : "ar";
    setLang(next);
    localStorage.setItem("dashboard-lang", next);
  };

  return (
    <DashboardLangContext.Provider value={{ lang, toggle }}>
      {children}
    </DashboardLangContext.Provider>
  );
}

export function useDashboardLang() {
  return useContext(DashboardLangContext);
}
