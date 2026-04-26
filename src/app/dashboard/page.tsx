"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUserGenerations, getUserUsageStats } from "@/actions/generations";
import { checkIsAdmin } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown, AlertCircle, CheckCircle2, Crown } from "lucide-react";
import { UpgradeModal } from "@/components/upgrade-modal";

// ── Dialects ──────────────────────────────────────────────────────────────
const DIALECTS = [
  { id: "msa",      label: "فصحى",     labelEn: "MSA",      flag: "🌐", desc: "Modern Standard Arabic" },
  { id: "saudi",    label: "سعودي",    labelEn: "Saudi",    flag: "🇸🇦", desc: "Saudi dialect" },
  { id: "egyptian", label: "مصري",     labelEn: "Egyptian", flag: "🇪🇬", desc: "Egyptian dialect" },
  { id: "gulf",     label: "خليجي",    labelEn: "Gulf",     flag: "🇦🇪", desc: "Gulf dialect" },
  { id: "levantine",label: "شامي",     labelEn: "Levantine",flag: "🇱🇧", desc: "Levantine dialect" },
  { id: "maghrebi", label: "مغربي",    labelEn: "Moroccan", flag: "🇲🇦", desc: "Maghrebi dialect" },
  { id: "iraqi",    label: "عراقي",    labelEn: "Iraqi",    flag: "🇮🇶", desc: "Iraqi dialect" },
  { id: "sudanese", label: "سوداني",   labelEn: "Sudanese", flag: "🇸🇩", desc: "Sudanese dialect" },
  { id: "yemeni",   label: "يمني",     labelEn: "Yemeni",   flag: "🇾🇪", desc: "Yemeni dialect" },
] as const;
type DialectId = typeof DIALECTS[number]["id"];

// ── 20 voice definitions (with dialect grouping) ──────────────────────────
const VOICE_DATA = [
  // MSA voices
  { id: "ali",        nameAr: "علي",     nameEn: "Ali",        style: "Warm & Documentary",       gender: "male",   popular: true,  dialect: "msa"       },
  { id: "maya",       nameAr: "مايا",    nameEn: "Maya",       style: "Clear & Lively",           gender: "female", popular: true,  dialect: "msa"       },
  { id: "youssef",    nameAr: "يوسف",    nameEn: "Youssef",    style: "Deep & Storyteller",       gender: "male",   popular: false, dialect: "msa"       },
  { id: "fatima",     nameAr: "فاطمة",   nameEn: "Fatima",     style: "Gentle & Expressive",      gender: "female", popular: false, dialect: "msa"       },
  // Saudi voices
  { id: "khalid",     nameAr: "خالد",    nameEn: "Khalid",     style: "Confident & Energetic",    gender: "male",   popular: false, dialect: "saudi"     },
  { id: "nour",       nameAr: "نور",     nameEn: "Nour",       style: "Bright & Youthful",        gender: "female", popular: false, dialect: "saudi"     },
  { id: "faisal",     nameAr: "فيصل",    nameEn: "Faisal",     style: "Modern & Upbeat",          gender: "male",   popular: false, dialect: "saudi"     },
  { id: "reem",       nameAr: "ريم",     nameEn: "Reem",       style: "Friendly & Welcoming",     gender: "female", popular: false, dialect: "saudi"     },
  // Egyptian voices
  { id: "omar",       nameAr: "عمر",     nameEn: "Omar",       style: "Professional & Formal",    gender: "male",   popular: false, dialect: "egyptian"  },
  { id: "layla",      nameAr: "ليلى",    nameEn: "Layla",      style: "Warm & Professional",      gender: "female", popular: false, dialect: "egyptian"  },
  { id: "mahmoud",    nameAr: "محمود",   nameEn: "Mahmoud",    style: "Casual & Authentic",       gender: "male",   popular: false, dialect: "egyptian"  },
  { id: "salma",      nameAr: "سلمى",    nameEn: "Salma",      style: "Soft & Conversational",    gender: "female", popular: false, dialect: "egyptian"  },
  // Gulf voices
  { id: "ziad",       nameAr: "زياد",    nameEn: "Ziad",       style: "Deep & Authoritative",     gender: "male",   popular: false, dialect: "gulf"      },
  { id: "sara",       nameAr: "سارة",    nameEn: "Sara",       style: "Calm & Educational",       gender: "female", popular: false, dialect: "gulf"      },
  { id: "saeed",      nameAr: "سعيد",    nameEn: "Saeed",      style: "Formal & Resonant",        gender: "male",   popular: false, dialect: "gulf"      },
  { id: "hind",       nameAr: "هند",     nameEn: "Hind",       style: "Elegant & Clear",          gender: "female", popular: false, dialect: "gulf"      },
  // Levantine voices
  { id: "hassan",     nameAr: "حسن",     nameEn: "Hassan",     style: "Smooth & Conversational",  gender: "male",   popular: false, dialect: "levantine" },
  { id: "tariq",      nameAr: "طارق",    nameEn: "Tariq",      style: "Punchy & Commercial",      gender: "male",   popular: false, dialect: "levantine" },
  { id: "jawad",      nameAr: "جواد",    nameEn: "Jawad",      style: "Youthful & Dynamic",       gender: "male",   popular: false, dialect: "levantine" },
  { id: "zeina",      nameAr: "زينة",    nameEn: "Zeina",      style: "Expressive & Passionate",  gender: "female", popular: false, dialect: "levantine" },
  // Maghrebi voices
  { id: "hamza",      nameAr: "حمزة",    nameEn: "Hamza",      style: "Warm & Traditional",       gender: "male",   popular: false, dialect: "maghrebi"   },
  { id: "nadia",      nameAr: "نادية",   nameEn: "Nadia",      style: "Lively & Engaging",        gender: "female", popular: false, dialect: "maghrebi"   },
  // Iraqi voices
  { id: "ahmed",      nameAr: "أحمد",    nameEn: "Ahmed",      style: "Deep & Classical",         gender: "male",   popular: false, dialect: "iraqi"      },
  { id: "zainab",     nameAr: "زينب",    nameEn: "Zainab",     style: "Calm & Resonant",          gender: "female", popular: false, dialect: "iraqi"      },
  // Sudanese voices
  { id: "osama",      nameAr: "أسامة",   nameEn: "Osama",      style: "Friendly & Relaxed",       gender: "male",   popular: false, dialect: "sudanese"   },
  { id: "asma",       nameAr: "أسماء",   nameEn: "Asma",       style: "Clear & Academic",         gender: "female", popular: false, dialect: "sudanese"   },
  // Yemeni voices
  { id: "nabil",      nameAr: "نبيل",    nameEn: "Nabil",      style: "Authentic & Grounded",     gender: "male",   popular: false, dialect: "yemeni"     },
  { id: "lubna",      nameAr: "لبنى",    nameEn: "Lubna",      style: "Gentle & Poetic",          gender: "female", popular: false, dialect: "yemeni"     },
] as const;
type VoiceId = typeof VOICE_DATA[number]["id"];

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-[#7C5CFF]" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { data: usage, mutate: mutateUsage } = useSWR("usage", () => getUserUsageStats(), {
    revalidateOnFocus: false
  });

  const CHAR_LIMIT = (usage?.limit ?? 1000) > 1000 ? 5000 : 1000;

  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [dialect, setDialect] = useState<DialectId>("msa");
  const [voiceId, setVoiceId] = useState<VoiceId>("ali");
  const [dialectOpen, setDialectOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("text");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const searchParams = useSearchParams();
  const upgraded = searchParams.get("upgraded") === "true";
  const upgradedPlan = searchParams.get("plan") ?? "pro";

  const handlePlay = (id: string, url: string) => {
    if (playingId === id) {
      if (audioElement) audioElement.pause();
      setPlayingId(null);
      return;
    }
    
    if (audioElement) audioElement.pause();
    
    const newAudio = new Audio(url);
    
    newAudio.play().catch(() => {
      // Intentionally silenced. In development Next.js forcefully overlays any console.error 
      // onto the webpage. We just want to silently revert the play button when mock playback fails.
      setPlayingId(null);
    });

    setPlayingId(id);
    setAudioElement(newAudio);
    
    newAudio.onended = () => setPlayingId(null);
  };

  // Usage fetch dynamically lifted to top of component for CHAR_LIMIT

  const { } = useSWR("check-admin", () => checkIsAdmin(), {
    revalidateOnFocus: false
  });

  const { data: generations, mutate: mutateGenerations } = useSWR("generations", () => getUserGenerations(10), {
    refreshInterval: (data) => {
      const hasActiveJobs = (data as Array<{status: string}>)?.some((g) => g.status === "pending" || g.status === "processing");
      return hasActiveJobs ? 2500 : 0;
    }
  });

  // Revalidate usage immediately after successful payment redirect
  useEffect(() => {
    if (upgraded) {
      mutateUsage();
    }
  }, [upgraded]);

  const handleGenerateText = async () => {
    // Check limit before hitting API
    if (usage && !usage.allowed) {
      setShowUpgrade(true);
      return;
    }
    setIsSubmitting(true);
    try {
      if (activeTab === "audio") {
        if (!audioFile) return setIsSubmitting(false);
        const formData = new FormData();
        formData.append("audio", audioFile);
        formData.append("voiceId", voiceId);

        const res = await fetch("/api/stt", {
          method: "POST",
          body: formData
        });
        
        if (res.ok) {
          const data = await res.json();
          setText(data.text || "");
          setAudioFile(null);
          setActiveTab("text");
        } else {
          const error = await res.json();
          alert(error.error || "Transcription failed");
        }
      } else {
        if (!text.trim() && activeTab === "text") return setIsSubmitting(false);
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId, dialect })
        });
        if (res.ok) {
          setText("");
          await mutateGenerations();
          await mutateUsage();
        } else {
          const error = await res.json();
          if (res.status === 429 || error.error?.toLowerCase().includes("limit")) {
            setShowUpgrade(true);
          } else {
            alert(error.error || "Generation failed");
          }
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 shadow-sm">مكتمل</Badge>;
      case "processing": return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 shadow-sm animate-pulse">جاري المعالجة</Badge>;
      case "pending": return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 shadow-sm">في الانتظار</Badge>;
      case "failed": return <Badge variant="destructive" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 shadow-sm">فشل</Badge>;
      default: return <Badge variant="secondary" className="shadow-sm">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8" dir="rtl">
      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        usedChars={(usage?.currentUsage) ?? 0}
        limitChars={(usage?.limit) ?? 0}
      />


      {/* ✅ Payment success banner */}
      {upgraded && (
        <div className="flex items-center gap-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-2xl px-5 py-4 font-cairo">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-teal-400" />
          <div className="flex-1 text-right">
            <p className="font-bold text-sm">تمت الترقية بنجاح! 🎉</p>
            <p className="text-xs text-teal-500/80 mt-0.5">
              خطة <span className="font-bold capitalize">{upgradedPlan}</span> مفعّلة — يمكنك الآن توليد المزيد من الصوت العربي.
            </p>
          </div>
        </div>
      )}

      {/* Input Module */}
      <section className="bg-white dark:bg-[#121936] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-xl relative transition-colors">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#7C5CFF]/10 dark:bg-[#7C5CFF]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative z-10">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-900 border border-gray-800 dark:bg-[#0B1020] dark:border-white/5 p-1 rounded-xl shadow-inner transition-colors">
            <TabsTrigger value="text" className="font-cairo data-[state=active]:bg-gray-800 dark:data-[state=active]:bg-[#121936] data-[state=active]:text-white text-gray-400 hover:text-gray-300">تحويل نص (Text)</TabsTrigger>
            <TabsTrigger value="audio" className="font-cairo data-[state=active]:bg-gray-800 dark:data-[state=active]:bg-[#121936] data-[state=active]:text-white text-gray-400 hover:text-gray-300">تغيير الصوت (Audio)</TabsTrigger>
            <TabsTrigger value="url" className="font-cairo data-[state=active]:bg-gray-800 dark:data-[state=active]:bg-[#121936] data-[state=active]:text-white text-gray-400 hover:text-gray-300">رابط مقال (URL)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="space-y-4">
            <textarea 
              value={text}
              onChange={(e) => {
                const newVal = e.target.value;
                if (newVal.length > CHAR_LIMIT) {
                  setText(newVal.slice(0, CHAR_LIMIT));
                  setShowUpgrade(true);
                } else {
                  setText(newVal);
                }
              }}
              placeholder="اكتب النص العربي هنا..."
              className={`w-full h-40 bg-gray-50 dark:bg-[#0B1020] border rounded-xl p-4 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent resize-none font-cairo disabled:opacity-50 transition-colors placeholder-gray-400 dark:placeholder-gray-600 shadow-inner ${
                text.length >= CHAR_LIMIT
                  ? "border-red-500/60 focus:ring-red-500"
                  : text.length >= CHAR_LIMIT * 0.9
                  ? "border-yellow-500/60 focus:ring-yellow-500"
                  : "border-gray-200 dark:border-white/10 focus:ring-[#7C5CFF]"
              }`}
              disabled={isSubmitting || !!(usage && !usage.allowed)}
            />
            
            <div className="flex justify-between items-center text-xs font-mono px-2">
              <span className={`${
                text.length >= CHAR_LIMIT ? "text-red-500 font-bold" :
                text.length >= CHAR_LIMIT * 0.9 ? "text-yellow-500" : "text-gray-500"
              }`}>
                {text.length} / {CHAR_LIMIT} حرف
                {text.length >= CHAR_LIMIT && " — تجاوزت الحد!"}
              </span>
              <span className="text-gray-500">متبقي {usage?.remaining?.toLocaleString() ?? 0}</span>
            </div>

            {/* Limit reached warning */}
            {usage && !usage.allowed && (
              <button
                onClick={() => setShowUpgrade(true)}
                className="w-full flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm font-cairo hover:bg-red-500/15 transition-colors"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-right">
                  انتهى حد الاستخدام المجاني ({(usage.currentUsage ?? 0).toLocaleString()} / {(usage.limit ?? 0).toLocaleString()} حرف)
                </span>
                <span className="text-[#7C5CFF] font-bold text-xs whitespace-nowrap">ترقية الآن ←</span>
              </button>
            )}
          </TabsContent>

          <TabsContent value="audio" className="space-y-4">
            <div className={`border-2 border-dashed ${audioFile ? 'border-[#20C7B7] bg-[#20C7B7]/5' : 'border-gray-300 dark:border-white/10 hover:border-[#7C5CFF]/50 bg-gray-50 dark:bg-transparent'} rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors shadow-inner`}>
              <input 
                type="file" 
                accept="audio/mp3, audio/wav, audio/mpeg" 
                id="audioUpload" 
                className="hidden" 
                onChange={(e) => {
                   if (e.target.files && e.target.files.length > 0) {
                     setAudioFile(e.target.files[0]);
                   }
                }}
                disabled={isSubmitting || !!(usage && !usage?.allowed)}
              />
              <label htmlFor="audioUpload" className="cursor-pointer flex flex-col items-center w-full">
                <svg className={`h-10 w-10 mb-4 ${audioFile ? 'text-[#20C7B7]' : 'text-gray-400 dark:text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span className="text-gray-900 dark:text-white font-cairo text-lg font-semibold">
                  {audioFile ? audioFile.name : "اضغط لرفع ملف صوتي (Upload Audio)"}
                </span>
                <span className="text-gray-500 text-xs mt-2">MP3, WAV up to 10MB</span>
              </label>
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <input 
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full bg-gray-50 dark:bg-[#0B1020] border border-gray-200 dark:border-white/10 rounded-xl p-4 text-gray-900 dark:text-white resize-none text-left focus:ring-2 focus:ring-[#7C5CFF] transition-colors disabled:opacity-50 shadow-inner placeholder-gray-400 dark:placeholder-gray-600"
              dir="ltr"
              disabled={isSubmitting || !!(usage && !usage?.allowed)}
            />
            <div className="text-xs text-gray-500 font-cairo pr-2">سيتم استخراج المقال تلقائياً (Feature coming soon)</div>
          </TabsContent>
        </Tabs>

          {/* Voice + Dialect — hidden on Audio (STT) tab */}
          {activeTab !== "audio" && <div className="mt-6 border-t border-gray-200 dark:border-white/5 pt-5 space-y-4">

            {/* ── Persistent Upgrade Plan button (Free Users Only) ───────────────── */}
            {(!usage || usage.limit <= 1000) && (
              <button
                onClick={() => setShowUpgrade(true)}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#7C5CFF]/10 to-[#20C7B7]/10 border border-[#7C5CFF]/30 dark:border-[#7C5CFF]/30 rounded-xl text-[#7C5CFF] hover:bg-[#7C5CFF]/20 hover:border-[#7C5CFF]/50 transition-all duration-300 group shadow-sm disabled:opacity-50"
              >
                <div className="flex items-center gap-2 font-cairo font-bold">
                  <Crown className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  ترقية الخطة (Upgrade Plan)
                </div>
                <span className="text-xs font-mono font-bold bg-[#7C5CFF]/10 px-2.5 py-1 rounded-md text-[#7C5CFF]">
                  الحد المتبقي: {usage?.remaining ? usage.remaining.toLocaleString() : "جاري التحميل..."}
                </span>
              </button>
            )}

            {/* ── Dialect picker ───────────────────────────────── */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-widest block mb-2">
                اللهجة (Dialect)
              </label>
              <div className="relative" dir="ltr">
                <button
                  onClick={() => setDialectOpen(o => !o)}
                  disabled={isSubmitting}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white hover:border-[#7C5CFF]/50 transition-all duration-200 disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    {(() => {
                      const d = DIALECTS.find(x => x.id === dialect);
                      return (
                        <>
                          <span className="text-base">{d?.flag}</span>
                          <span className="font-semibold text-sm">{d?.label} ({d?.labelEn})</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-xs text-gray-500">{d?.desc}</span>
                        </>
                      );
                    })()}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${dialectOpen ? "rotate-180" : ""}`} />
                </button>

                {dialectOpen && (
                  <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-[#121936] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-1.5 max-h-[320px] overflow-y-auto">
                      {DIALECTS.map(d => {
                        const isSelected = d.id === dialect;
                        return (
                          <button
                            key={d.id}
                            onClick={() => {
                              setDialect(d.id);
                              const first = VOICE_DATA.find(v => v.dialect === d.id);
                              if (first) setVoiceId(first.id as VoiceId);
                              setDialectOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                              isSelected
                                ? "bg-[#7C5CFF]/10 text-[#7C5CFF]"
                                : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-900 dark:text-white"
                            }`}
                          >
                            <span className="text-base flex-shrink-0">{d.flag}</span>
                            <span className="font-semibold text-sm flex-shrink-0">{d.label} ({d.labelEn})</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ms-auto">{d.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Voice dropdown ───────────────────────────────── */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-widest block mb-2">
                الصوت (Voice)
              </label>

              <div className="relative" dir="ltr">
                <button
                  onClick={() => setVoiceOpen(o => !o)}
                  disabled={isSubmitting}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white hover:border-[#7C5CFF]/50 transition-all duration-200 disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    {(() => {
                      const v = VOICE_DATA.find(x => x.id === voiceId) ?? VOICE_DATA[0];
                      const d = DIALECTS.find(x => x.id === v.dialect);
                      const dotColor = v.gender === "female" ? "bg-[#20C7B7]" : v.popular ? "bg-[#7C5CFF]" : "bg-[#D6B25E]";
                      return (
                        <>
                          <span className="text-base">{d?.flag}</span>
                          <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                          <span className="font-semibold text-sm">{v.nameAr} ({v.nameEn})</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-xs text-gray-500">{v.style}</span>
                        </>
                      );
                    })()}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${voiceOpen ? "rotate-180" : ""}`} />
                </button>

                {voiceOpen && (
                  <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-[#121936] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-1.5 max-h-[320px] overflow-y-auto">
                      {VOICE_DATA.filter(v => v.dialect === dialect).map(v => {
                        const isSelected = v.id === voiceId;
                        const dotColor   = v.gender === "female" ? "bg-[#20C7B7]" : v.popular ? "bg-[#7C5CFF]" : "bg-[#D6B25E]";
                        return (
                          <button
                            key={v.id}
                            onClick={() => { setVoiceId(v.id); setVoiceOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                              isSelected
                                ? "bg-[#7C5CFF]/10 text-[#7C5CFF]"
                                : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-900 dark:text-white"
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isSelected ? "bg-[#7C5CFF]" : dotColor}`} />
                            <span className="font-semibold text-sm flex-shrink-0">{v.nameAr} ({v.nameEn})</span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {v.gender === "female" ? "أنثى · Female" : "ذكر · Male"}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ms-auto">{v.style}</span>
                            {v.popular && (
                              <span className="text-[10px] font-bold text-[#7C5CFF] bg-[#7C5CFF]/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                شائع
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Generate button */}
            <div className="flex justify-end pt-1">
              <button
                onClick={handleGenerateText}
                disabled={
                  isSubmitting ||
                  (usage && !usage?.allowed) ||
                  (activeTab === "text" && (!text.trim() || text.length > CHAR_LIMIT)) ||
                  (activeTab === "url" && !url.trim()) ||
                  (activeTab === "audio" && !audioFile)
                }
                className="w-full sm:w-auto bg-gradient-to-r from-[#7C5CFF] to-[#9B82FF] text-white px-8 py-3 rounded-xl font-cairo font-semibold shadow-lg shadow-purple-500/20 disabled:opacity-50 hover:shadow-purple-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center min-w-[160px] relative overflow-hidden group"
              >
                <div className="absolute inset-0 w-full h-full bg-white/20 scale-x-0 group-hover:scale-x-100 origin-right transition-transform" />
                <span className="relative flex items-center gap-2">
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> جاري التوليد</>
                  ) : (
                    <>توليد الصوت (Generate)</>
                  )}
                </span>
              </button>
            </div>
          </div>}

          {/* Generate button — Audio tab only (no voice needed for STT) */}
          {activeTab === "audio" && (
            <div className="mt-6 border-t border-gray-200 dark:border-white/5 pt-5 flex justify-end">
              <button
                onClick={handleGenerateText}
                disabled={isSubmitting || !audioFile}
                className="w-full sm:w-auto bg-gradient-to-r from-[#7C5CFF] to-[#9B82FF] text-white px-8 py-3 rounded-xl font-cairo font-semibold shadow-lg shadow-purple-500/20 disabled:opacity-50 hover:shadow-purple-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center min-w-[160px] relative overflow-hidden group"
              >
                <div className="absolute inset-0 w-full h-full bg-white/20 scale-x-0 group-hover:scale-x-100 origin-right transition-transform" />
                <span className="relative flex items-center gap-2">
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> جاري التحويل</>
                  ) : (
                    <>تحويل إلى نص (Transcribe)</>
                  )}
                </span>
              </button>
            </div>
          )}
      </section>

      {/* History List */}
      <section className="bg-white dark:bg-[#121936] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-xl transition-colors">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-cairo text-lg text-gray-900 dark:text-white font-bold">سجل التوليد (History)</h3>
          {!generations && <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-gray-500" />}
        </div>
        
        <div className="space-y-3">
          {!generations ? (
             <div className="text-gray-500 text-center py-12 font-cairo bg-gray-50 dark:bg-[#0B1020] rounded-xl border border-gray-200 dark:border-white/5 animate-pulse transition-colors">جاري تحميل السجل...</div>
          ) : generations.length === 0 ? (
            <div className="text-gray-500 text-center py-12 font-cairo bg-gray-50 dark:bg-[#0B1020] rounded-xl border border-gray-200 dark:border-white/5 transition-colors">لا يوجد سجلات حتى الآن</div>
          ) : (
            generations.map((gen, i) => (
              <div key={(gen.id as string) || i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-[#0B1020] rounded-xl border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-colors group gap-4 shadow-sm">
                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                  <button 
                    onClick={() => gen.audioUrl && handlePlay(gen.id as string, gen.audioUrl as string)}
                    disabled={!gen.audioUrl}
                    className="w-10 h-10 shrink-0 rounded-full bg-white dark:bg-[#121936] border border-gray-200 dark:border-white/5 shadow-sm flex items-center justify-center hover:bg-[#7C5CFF]/10 dark:hover:bg-[#7C5CFF]/10 transition disabled:opacity-50 disabled:cursor-not-allowed group-hover:border-[#7C5CFF]/30 dark:group-hover:border-[#7C5CFF]/30"
                  >
                    {playingId === gen.id ? (
                      <div className="w-3 h-3 bg-[#20C7B7] rounded-sm mr-0.5" />
                    ) : (
                      <svg className={`w-4 h-4 translate-x-[1px] ${gen.audioUrl ? 'text-[#20C7B7]' : 'text-gray-400 dark:text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4l12 6-12 6z" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 dark:text-gray-200 font-cairo text-sm truncate font-medium" dir="auto">{gen.inputText}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-[11px] text-gray-600 dark:text-gray-500 font-mono bg-gray-200 dark:bg-white/5 px-2 py-0.5 rounded text-transform capitalize">{gen.voiceId}</span>
                      <span className="text-[11px] text-gray-500">{new Date(gen.createdAt).toLocaleDateString()}</span>
                      {gen.status === "completed" && gen.durationSeconds && (
                        <span className="text-[11px] text-[#20C7B7] dark:text-[#20C7B7]/70 font-mono border-r border-gray-300 dark:border-white/10 pr-3 font-semibold">{Math.round(gen.durationSeconds as number)}s</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:ml-4 border-t sm:border-t-0 border-gray-200 dark:border-white/5 pt-3 sm:pt-0">
                  {getStatusBadge(gen.status as string)}
                  
                  {gen.status === "failed" && (
                    <div className="text-[10px] text-red-500 dark:text-red-400 font-mono text-left sm:text-right max-w-[200px] truncate" title={gen.errorMessage as string}>
                      {gen.errorMessage || "Unknown fallback error"}
                    </div>
                  )}

                  {gen.status === "completed" && gen.audioUrl && (
                    <div className="text-[11px] text-[#7C5CFF] hover:text-[#9B82FF] transition-colors font-cairo font-bold">
                      <a href={gen.audioUrl as string} download={`sawti-${gen.id}.mp3`} target="_blank" rel="noreferrer" className="flex items-center gap-1">
                        تحميل الصوت (Download)
                      </a>
                    </div>
                  )}
                  {gen.status === "failed" && (
                    <button 
                      className="text-[11px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-cairo font-medium transition-colors"
                      onClick={() => {
                        setText(gen.inputText as string);
                        setVoiceId(gen.voiceId as VoiceId);
                      }}
                    >
                      إعادة المحاولة (Retry)
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
