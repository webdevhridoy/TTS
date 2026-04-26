"use client";

import { Globe } from "lucide-react";
import { type Lang } from "@/lib/translations";

interface LangToggleProps {
  lang: Lang;
  onToggle: () => void;
}

export function LangToggle({ lang, onToggle }: LangToggleProps) {
  return (
    <button
      onClick={onToggle}
      aria-label={lang === "en" ? "Switch to Arabic" : "Switch to English"}
      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm font-semibold text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 active:scale-95 transition-all duration-300 group overflow-hidden select-none"
    >
      {/* Subtle fill on hover */}
      <span className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300 rounded-full" />
      <Globe className="w-4 h-4 relative z-10 group-hover:rotate-[360deg] transition-transform duration-700 ease-in-out" />
      <span className="relative z-10 tracking-wide transition-all duration-300">
        {lang === "en" ? "العربية" : "English"}
      </span>
    </button>
  );
}
