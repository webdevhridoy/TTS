"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { VoiceGenerator } from "@/components/voice-generator";
import { useDashboardLang } from "@/lib/dashboard-lang-context";

export default function DashboardPage() {
  const { lang } = useDashboardLang();

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-[#7C5CFF]" />
      </div>
    }>
      <VoiceGenerator lang={lang} />
    </Suspense>
  );
}
