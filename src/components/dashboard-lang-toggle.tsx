"use client";

import { Globe } from "lucide-react";
import { useDashboardLang } from "@/lib/dashboard-lang-context";

export function DashboardLangToggle() {
  const { lang, toggle } = useDashboardLang();

  return (
    <button
      onClick={toggle}
      aria-label={lang === "en" ? "Switch to Arabic" : "Switch to English"}
      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-[#7C5CFF] hover:border-[#7C5CFF]/50 hover:bg-[#7C5CFF]/5 active:scale-95 transition-all duration-300 group overflow-hidden select-none"
    >
      <span className="absolute inset-0 bg-[#7C5CFF]/0 group-hover:bg-[#7C5CFF]/5 transition-colors duration-300 rounded-full" />
      <Globe className="w-4 h-4 relative z-10 group-hover:rotate-[360deg] transition-transform duration-700 ease-in-out" />
      <span className="relative z-10 tracking-wide transition-all duration-300">
        {lang === "en" ? "العربية" : "English"}
      </span>
    </button>
  );
}

