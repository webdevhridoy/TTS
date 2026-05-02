"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { getUserUsageStats } from "@/actions/generations";
import { UpgradeModal } from "@/components/upgrade-modal";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { LangToggle } from "@/components/lang-toggle";
import { translations, type Lang } from "@/lib/translations";
import { VoiceGenerator } from "@/components/voice-generator";
import {
  Mic, Download, Zap, Sparkles,
  Check, PlayCircle, Globe,
  Headphones, Users, Volume2,
  Play, Square, Loader2, ChevronDown, AlertCircle
} from "lucide-react";

// ─── Static UI maps ─────────────────────────────────────────────────────────
const featureIcons = [
  <Zap      key="zap"   className="w-6 h-6 group-hover:rotate-12 transition-transform duration-500" />,
  <Mic      key="mic"   className="w-6 h-6 group-hover:scale-110 transition-transform duration-500" />,
  <Download key="dl"    className="w-6 h-6 group-hover:-translate-y-1 transition-transform duration-500" />,
  <Users    key="users" className="w-6 h-6 group-hover:scale-110 transition-transform duration-500" />,
];
const featureColors = [
  { bg: "bg-primary/10",   text: "text-primary",   hoverCard: "hover:border-primary/50 hover:shadow-[0_10px_40px_-15px_rgba(124,92,255,0.3)]",   hoverIcon: "group-hover:bg-primary group-hover:text-primary-foreground",   hoverH3: "group-hover:text-primary" },
  { bg: "bg-secondary/10", text: "text-secondary", hoverCard: "hover:border-secondary/50 hover:shadow-[0_10px_40px_-15px_rgba(32,199,183,0.3)]", hoverIcon: "group-hover:bg-secondary group-hover:text-secondary-foreground", hoverH3: "group-hover:text-secondary" },
  { bg: "bg-accent/10",    text: "text-accent",    hoverCard: "hover:border-accent/50 hover:shadow-[0_10px_40px_-15px_rgba(214,178,94,0.3)]",    hoverIcon: "group-hover:bg-accent group-hover:text-accent-foreground",    hoverH3: "group-hover:text-accent" },
  { bg: "bg-primary/10",   text: "text-primary",   hoverCard: "hover:border-primary/50 hover:shadow-[0_10px_40px_-15px_rgba(124,92,255,0.3)]",   hoverIcon: "group-hover:bg-primary group-hover:text-primary-foreground",   hoverH3: "group-hover:text-primary" },
];
const trustIcons = [
  <Globe    key="g" className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300 flex-shrink-0" />,
  <Sparkles key="s" className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300 flex-shrink-0" />,
  <Download key="d" className="w-5 h-5 group-hover:-translate-y-1 transition-transform duration-300 flex-shrink-0" />,
  <Users    key="u" className="w-5 h-5 group-hover:scale-110 transition-transform duration-300 flex-shrink-0" />,
];
const trustHover  = ["hover:text-primary", "hover:text-secondary", "hover:text-accent", "hover:text-primary"];
const stepStyles  = [
  { num: "bg-background border border-border text-primary group-hover:shadow-[0_0_20px_rgba(124,92,255,0.3)] group-hover:border-primary/50", hTitle: "group-hover:text-primary" },
  { num: "bg-primary text-primary-foreground shadow-md group-hover:shadow-[0_0_30px_rgba(124,92,255,0.5)]",                                   hTitle: "group-hover:text-primary" },
  { num: "bg-background border border-border text-secondary group-hover:shadow-[0_0_20px_rgba(32,199,183,0.3)] group-hover:border-secondary/50", hTitle: "group-hover:text-secondary" },
];
const chipColors = [
  "hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-[0_10px_20px_-10px_rgba(124,92,255,0.5)]",
  "hover:bg-secondary hover:text-secondary-foreground hover:border-secondary hover:shadow-[0_10px_20px_-10px_rgba(32,199,183,0.5)]",
  "hover:bg-accent hover:text-accent-foreground hover:border-accent hover:shadow-[0_10px_20px_-10px_rgba(214,178,94,0.5)]",
  "hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-[0_10px_20px_-10px_rgba(124,92,255,0.5)]",
];
const WAVE_COUNT = 28;
const STATIC_HEIGHTS = [30,45,60,80,50,40,70,90,85,45,30,20,50,75,40,25,45,80,60,35,55,95,40,20,55,70,35,50];
const VOICES = ["ali", "omar", "khalid", "ziad", "hassan", "tariq", "maya", "layla", "nour", "sara"] as const;
type VoiceId = typeof VOICES[number];

// Gender map — used for badge colours and label
const VOICE_GENDER: Record<VoiceId, "male" | "female"> = {
  ali: "male", omar: "male", khalid: "male", ziad: "male", hassan: "male", tariq: "male",
  maya: "female", layla: "female", nour: "female", sara: "female",
};
const VOICE_POPULAR: Partial<Record<VoiceId, true>> = { maya: true, ali: true };

// ─── Animated Waveform Bar component ────────────────────────────────────────
function WaveBar({ height, active, delay }: { height: number; active: boolean; delay: number }) {
  return (
    <div
      className={`rounded-full transition-all duration-150 ${
        active
          ? "bg-secondary animate-pulse"
          : "bg-primary/40"
      }`}
      style={{
        width: "3.5px",
        height: active ? `${Math.max(20, height + Math.random() * 30)}%` : `${height}%`,
        animationDelay: `${delay}ms`,
        animationDuration: active ? `${300 + delay * 2}ms` : "3s",
      }}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router  = useRouter();

  // ── Language ──────────────────────────────────────────────────
  const [lang, setLang] = useState<Lang>("en");
  const t    = translations[lang];
  const isAr = lang === "ar";
  const dir  = isAr ? "rtl" : "ltr";
  const ta   = isAr ? "text-right" : "text-left";

  const { data: usage, mutate: mutateUsage } = useSWR("usage", () => getUserUsageStats(), {
    revalidateOnFocus: false
  });
  const { isLoaded, userId } = useAuth();
  const CHAR_LIMIT = (usage?.limit ?? 1000) > 1000 ? 5000 : 1000;
  const [showUpgrade, setShowUpgrade] = useState(false);

  // ── Demo card state ───────────────────────────────────────────
  const [text, setText]           = useState<string>(translations.en.demoText);
  const [selectedVoice, setVoice] = useState<VoiceId>("ali");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [status, setStatus]       = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [audioUrl, setAudioUrl]   = useState<string | null>(null);
  const [errorMsg, setErrorMsg]   = useState<string>("");
  const [waveTick, setWaveTick]   = useState(0);   // forces waveform re-render while playing
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Voice card play-state (section 5) ───────────────────────
  const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});

  const waveUrl = "https://assets.streamlinehq.com/image/private/w_400,h_400,ar_1/f_auto/v1/icons/music/audio-waves-7-h27tstn3r42fdf4t28b3m.png?_a=DAJFJtWIZAAC";

  // ── Helpers ────────────────────────────────────────────────────
  const handleLangToggle = () => {
    const next: Lang = lang === "en" ? "ar" : "en";
    setLang(next);
    setText(translations[next].demoText);
  };

  const handleActionClick = () => {
    if (typeof window !== "undefined") localStorage.setItem("pending_tts_text", text);
    router.push("/dashboard");
  };

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (waveTimer.current) clearInterval(waveTimer.current);
    setStatus("idle");
  }, []);

  const startWaveAnimation = () => {
    if (waveTimer.current) clearInterval(waveTimer.current);
    waveTimer.current = setInterval(() => setWaveTick(n => n + 1), 120);
  };

  // Generate TTS then immediately play
  const handleGenerate = async () => {
    if (usage && !usage.allowed) {
      setShowUpgrade(true);
      return;
    }
    if (!text.trim()) return;
    stopAudio();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res  = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: selectedVoice }),
      });
      const data = await res.json();

      if (!res.ok || !data.audioUrl) {
        setErrorMsg(data.error ?? "Generation failed — please try again.");
        setStatus("error");
        return;
      }

      setAudioUrl(data.audioUrl);
      const audio = new Audio(data.audioUrl);
      audioRef.current = audio;
      audio.onended  = () => { setStatus("idle"); if (waveTimer.current) clearInterval(waveTimer.current); };
      audio.onerror  = () => { setStatus("error"); setErrorMsg("Playback failed."); };
      await audio.play();
      setStatus("playing");
      startWaveAnimation();
    } catch {
      setErrorMsg("Could not connect to audio service.");
      setStatus("error");
    }
  };

  // Download last generated file
  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href     = audioUrl;
    a.download = `sawti-${selectedVoice}-${Date.now()}.mp3`;
    a.click();
  };

  // Replay already-generated audio
  const handleReplay = async () => {
    if (!audioUrl) return;
    stopAudio();
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => { setStatus("idle"); if (waveTimer.current) clearInterval(waveTimer.current); };
    await audio.play();
    setStatus("playing");
    startWaveAnimation();
  };

  // Section-5 voice card preview
  const toggleVoiceCard = (id: string) => {
    setIsPlaying(p => ({ ...p, [id]: !p[id] }));
    setTimeout(() => setIsPlaying(p => ({ ...p, [id]: false })), 3000);
  };

  // Cleanup on unmount
  useEffect(() => () => {
    if (audioRef.current) audioRef.current.pause();
    if (waveTimer.current)  clearInterval(waveTimer.current);
  }, []);

  // Voice display labels (bilingual-aware)
  const voiceLabel: Record<VoiceId, string> = {
    ali:    lang === "ar" ? "علي"   : "Ali",
    omar:   lang === "ar" ? "عمر"   : "Omar",
    khalid: lang === "ar" ? "خالد"  : "Khalid",
    ziad:   lang === "ar" ? "زياد"  : "Ziad",
    hassan: lang === "ar" ? "حسن"   : "Hassan",
    tariq:  lang === "ar" ? "طارق"  : "Tariq",
    maya:   lang === "ar" ? "مايا"  : "Maya",
    layla:  lang === "ar" ? "ليلى"  : "Layla",
    nour:   lang === "ar" ? "نور"   : "Nour",
    sara:   lang === "ar" ? "سارة"  : "Sara",
  };

  // ── Generate-button label ──────────────────────────────────────
  const btnLabel = {
    idle:    lang === "ar" ? "توليد الصوت" : "Generate Voice",
    loading: lang === "ar" ? "جاري التوليد…" : "Generating…",
    playing: lang === "ar" ? "إيقاف"       : "Stop",
    error:   lang === "ar" ? "حاول مجدداً" : "Try Again",
  }[status];

  return (
    <div dir={dir} className="relative text-foreground min-h-screen font-sans selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        usedChars={(usage?.currentUsage) ?? 0}
        limitChars={(usage?.limit) ?? 0}
      />

      {/* ── Background ─────── */}
      <div className="fixed inset-0 -z-30 bg-gradient-to-tr from-background via-background to-background transition-colors duration-300" />
      <div className="fixed top-[-5%] right-[-10%] w-[700px] h-[700px] bg-primary/25 rounded-full blur-[140px] -z-20 pointer-events-none animate-pulse" style={{ animationDuration: "6s" }} />
      <div className="fixed bottom-[-10%] left-[-15%] w-[800px] h-[800px] bg-secondary/20 rounded-full blur-[140px] -z-20 pointer-events-none animate-pulse" style={{ animationDuration: "10s" }} />
      <div className="fixed top-[30%] left-[10%] w-[500px] h-[500px] bg-accent/15 rounded-full blur-[120px] -z-20 pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-transparent via-background/40 to-background dark:to-black/95 pointer-events-none" />

      {/* ── Nav ───────────── */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border transition-colors duration-300">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 h-20">
          <div className="flex items-center gap-10">
            <Link href="/" className="group text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
              صوتي
            </Link>
            <div className="hidden md:flex gap-8 items-center">
              <Link className="text-muted-foreground hover:text-primary hover:-translate-y-0.5 font-medium transition-all duration-300" href="#demo">{t.nav.voices}</Link>
              <Link className="text-muted-foreground hover:text-primary hover:-translate-y-0.5 font-medium transition-all duration-300" href="#features">{t.nav.features}</Link>
              <Link className="text-muted-foreground hover:text-primary hover:-translate-y-0.5 font-medium transition-all duration-300" href="#pricing">{t.nav.pricing}</Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ModeToggle />
            <LangToggle lang={lang} onToggle={handleLangToggle} />
            
            {isLoaded && !userId && (
              <>
                <SignInButton mode="modal">
                  <button className="text-muted-foreground hover:text-primary hover:-translate-y-0.5 font-medium px-5 py-2 hidden sm:block transition-all duration-300">
                    {t.nav.signIn}
                  </button>
                </SignInButton>
                <SignInButton mode="modal">
                  <Button className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-semibold hover:shadow-[0_0_20px_rgba(124,92,255,0.4)] hover:scale-105 active:scale-95 transition-all duration-300">
                    {t.nav.startNow}
                  </Button>
                </SignInButton>
              </>
            )}

            {isLoaded && userId && (
              <>
                <Link href="/dashboard" className="hidden sm:block">
                  <Button className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-semibold hover:shadow-[0_0_20px_rgba(124,92,255,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 mr-2">
                    {lang === "ar" ? "لوحة التحكم" : "Dashboard"}
                  </Button>
                </Link>
                <UserButton />
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-32">

        {/* ── 1. Hero ──────────────────────────────────────────── */}
        <section className="relative max-w-7xl mx-auto px-6 mb-20 md:mb-32">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: "15s" }} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Hero text */}
            <div className={ta}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-6 hover:bg-secondary/20 hover:scale-105 transition-all duration-300 cursor-default group">
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                <span>{t.hero.badge}</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6 text-foreground tracking-tight" style={{ fontFamily: "var(--font-headline)" }}>
                {t.hero.headline1} <br />
                <span className="text-primary">{t.hero.headline2}</span>{" "}{t.hero.headline3}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed mb-10 max-w-2xl">
                {t.hero.subtext}
              </p>
              <div className={`flex flex-col sm:flex-row gap-4 ${isAr ? "justify-start flex-row-reverse" : "justify-start"}`}>
                <button
                  onClick={() => document.getElementById("live-demo")?.scrollIntoView({ behavior: "smooth" })}
                  className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground rounded-full text-lg font-semibold hover:shadow-[0_0_30px_rgba(124,92,255,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  {t.hero.ctaPrimary}
                  <PlayCircle className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                </button>
                <button
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                  className="w-full sm:w-auto px-8 py-4 bg-card text-foreground border border-border rounded-full text-lg font-semibold hover:bg-muted hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  {t.hero.ctaSecondary}
                </button>
              </div>
            </div>

            {/* ── DUMMY HERO CARD (decorative) ───────────────────── */}
            <div className="relative group perspective-[1000px]">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-100 group-hover:duration-200 transition duration-1000" />
              <div className="relative bg-card border border-border shadow-2xl rounded-[2rem] p-8 group-hover:scale-[1.02] transition-transform duration-500">
                {/* Window chrome */}
                <div className="flex items-center justify-between mb-4" dir="ltr">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-300">{t.hero.cardLabel}</span>
                </div>
                {/* Dummy textarea */}
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  className="w-full h-32 bg-transparent text-foreground border-none resize-none focus:ring-0 text-xl md:text-2xl outline-none placeholder:text-muted-foreground"
                  dir="rtl"
                />
                {/* Static waveform bars */}
                <div className="flex items-center gap-1 h-8 mt-6 mb-8 justify-center opacity-70 group-hover:opacity-100 transition-opacity duration-300" dir="ltr">
                  {STATIC_HEIGHTS.slice(0, 24).map((h, i) => (
                    <div key={i} className="w-1.5 bg-primary/40 group-hover:bg-primary/80 rounded-full animate-pulse transition-colors duration-300" style={{ height: `${h}%`, animationDelay: `${i * 0.05}s` }} />
                  ))}
                </div>
                {/* CTA scrolls to live section */}
                <button
                  onClick={() => document.getElementById("live-demo")?.scrollIntoView({ behavior: "smooth" })}
                  className="w-full py-4 bg-secondary text-secondary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(32,199,183,0.4)] hover:scale-[1.02] active:scale-95 transition-all duration-300 group/btn"
                >
                  <Volume2 className="w-5 h-5 group-hover/btn:scale-110 transition-transform duration-300" />
                  {t.hero.cardCta}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── LIVE TTS SECTION (fully functional) ─────────────── */}
        <section id="live-demo" className="max-w-4xl mx-auto px-6 mb-16 md:mb-24">
          {/* Heading */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4 cursor-default">
              <Volume2 className="w-4 h-4" />
              <span>{lang === "ar" ? "جرّب الآن مجاناً" : "Try It Free — Right Now"}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3" style={{ fontFamily: "var(--font-headline)" }}>
              {lang === "ar" ? "حوّل نصك إلى صوت في ثوانٍ" : "Convert Your Text to Voice in Seconds"}
            </h2>
            <p className="text-muted-foreground text-lg">
              {lang === "ar" ? "اختر صوتاً، الصق نصك، واستمع فوراً." : "Pick a voice, paste your text, and listen instantly."}
            </p>
          </div>

          {/* Functional card */}
          {/* Functional Voice Box */}
          <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <VoiceGenerator lang={lang} />
          </Suspense>
        </section>

        {/* ── 2. Trust Strip ─────────────────────────────────────── */}
        <section className="border-y border-border bg-muted/20 py-8 mb-24 hover:bg-muted/40 transition-colors duration-500">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-wrap justify-between items-center gap-8 opacity-80">
              {t.trust.map((item, i) => (
                <div key={i} className={`group flex items-center gap-3 text-muted-foreground font-medium w-full md:w-auto justify-center md:justify-start ${trustHover[i]} hover:-translate-y-1 transition-all duration-300 cursor-default`}>
                  {trustIcons[i]}
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. Features ────────────────────────────────────────── */}
        <section id="features" className="max-w-7xl mx-auto px-6 mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t.features.title}</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t.features.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {t.features.items.map((f, i) => (
              <div key={i} className={`group p-8 bg-card border border-border rounded-2xl ${featureColors[i].hoverCard} hover:-translate-y-2 transition-all duration-500 cursor-default`}>
                <div className={`w-12 h-12 ${featureColors[i].bg} ${featureColors[i].text} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 ${featureColors[i].hoverIcon} transition-all duration-500`}>
                  {featureIcons[i]}
                </div>
                <h3 className={`text-xl font-bold text-foreground mb-3 ${ta} ${featureColors[i].hoverH3} transition-colors duration-300`}>{f.title}</h3>
                <p className={`text-muted-foreground ${ta}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. How It Works ────────────────────────────────────── */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-6 mb-32">
          <div className="group/wrapper bg-card border border-border rounded-3xl p-10 md:p-16 hover:border-primary/30 hover:shadow-2xl transition-all duration-700">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t.howItWorks.title}</h2>
              <p className="text-muted-foreground text-lg">{t.howItWorks.subtitle}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-[2px] bg-border -z-10 group-hover/wrapper:bg-primary/20 transition-colors duration-700" />
              {t.howItWorks.steps.map((step, i) => (
                <div key={i} className="group flex flex-col items-center text-center cursor-default">
                  <div className={`w-24 h-24 ${stepStyles[i].num} rounded-2xl flex items-center justify-center mb-6 text-2xl font-bold group-hover:scale-110 transition-all duration-500`}>0{i + 1}</div>
                  <h3 className={`text-xl font-bold text-foreground mb-3 ${stepStyles[i].hTitle} transition-colors duration-300`}>{step.label}</h3>
                  <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. Voices ──────────────────────────────────────────── */}
        <section id="demo" className="max-w-7xl mx-auto px-6 mb-32">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 hover:bg-primary/20 hover:scale-105 transition-all duration-300 cursor-default group">
              <Headphones className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
              <span>{t.voices.badge}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t.voices.title}</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t.voices.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {VOICES.map((v) => {
              const info   = t.voices[v];
              const isFem  = VOICE_GENDER[v] === "female";
              const isPop  = VOICE_POPULAR[v];
              const playing = !!isPlaying[v];

              // Per-voice accent colour palette
              const accent = isFem
                ? "secondary"          // female  → teal
                : isPop
                ? "primary"            // ali     → purple
                : "accent";            // other males → gold

              const hoverBorder = accent === "primary"
                ? "hover:border-primary/50 hover:shadow-[0_8px_30px_-10px_rgba(124,92,255,0.35)]"
                : accent === "secondary"
                ? "hover:border-secondary/50 hover:shadow-[0_8px_30px_-10px_rgba(32,199,183,0.35)]"
                : "hover:border-accent/50 hover:shadow-[0_8px_30px_-10px_rgba(214,178,94,0.25)]";

              const hoverText = `group-hover:text-${accent}`;
              const accentText = `text-${accent}`;
              const btnActive = accent === "primary"
                ? "bg-primary text-primary-foreground border-primary"
                : accent === "secondary"
                ? "bg-secondary text-secondary-foreground border-secondary"
                : "bg-accent text-accent-foreground border-accent";
              const btnHover = accent === "primary"
                ? "hover:bg-primary hover:text-primary-foreground hover:border-primary"
                : accent === "secondary"
                ? "hover:bg-secondary hover:text-secondary-foreground hover:border-secondary"
                : "hover:bg-accent hover:text-accent-foreground hover:border-accent";

              return (
                <div
                  key={v}
                  className={`relative group bg-card border ${isPop ? "border-primary/30" : "border-border"} rounded-2xl p-5 ${hoverBorder} hover:-translate-y-2 transition-all duration-500 cursor-default flex flex-col overflow-hidden`}
                >
                  {/* Glow blob for popular */}
                  {isPop && (
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-[80px] -z-10 group-hover:scale-150 group-hover:bg-primary/10 transition-transform duration-700" />
                  )}

                  {/* Top row: play btn + badges */}
                  <div className="flex items-start justify-between mb-4">
                    <button
                      onClick={() => toggleVoiceCard(v)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 text-foreground bg-background border-border ${playing ? `${btnActive} animate-pulse` : `${btnHover}`}`}
                    >
                      {playing
                        ? <img src={waveUrl} className="w-5 h-5 object-contain opacity-60 invert dark:invert-0" alt="" />
                        : <Play className="w-4 h-4" />}
                    </button>
                    <div className="flex flex-col items-end gap-1">
                      {isPop && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 ${accentText}`}>
                          {t.voices.mostUsed}
                        </span>
                      )}
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground`}>
                        {isFem ? t.voices.female : t.voices.male}
                      </span>
                    </div>
                  </div>

                  {/* Name + style + desc */}
                  <h3 className={`text-base font-bold text-foreground mb-0.5 ${ta} ${hoverText} transition-colors duration-300`}>
                    {info.name}
                  </h3>
                  <p className={`${accentText} text-xs font-semibold mb-3 ${ta}`}>{info.style}</p>
                  <p className={`text-muted-foreground text-xs leading-relaxed group-hover:text-foreground transition-colors duration-300 ${ta} flex-1`}>
                    {info.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 6. Use Cases ───────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 mb-32">
          <div className="bg-muted/10 hover:bg-muted/30 transition-colors duration-700 rounded-3xl p-10 py-16 border border-border text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10">{t.useCases.title}</h2>
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              {t.useCases.chips.map((chip, i) => (
                <div key={i} className={`px-6 py-3 bg-card border border-border rounded-xl font-medium text-foreground text-lg shadow-sm ${chipColors[i]} hover:-translate-y-1 transition-all duration-300 cursor-default`}>{chip}</div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. Pricing ─────────────────────────────────────────── */}
        <section id="pricing" className="max-w-5xl mx-auto px-6 mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t.pricing.title}</h2>
            <p className="text-muted-foreground text-lg">{t.pricing.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free */}
            <div className="group bg-card border border-border rounded-3xl p-10 flex flex-col hover:border-secondary/50 hover:shadow-[0_15px_50px_-15px_rgba(32,199,183,0.2)] hover:scale-[1.02] transition-all duration-500">
              <h3 className={`text-2xl font-bold text-foreground mb-2 group-hover:text-secondary transition-colors duration-300 ${ta}`}>{t.pricing.free.name}</h3>
              <div className={`flex items-baseline gap-1 mb-8 ${isAr ? "flex-row-reverse justify-end" : ""}`}>
                <span className="text-4xl font-bold text-foreground group-hover:text-secondary transition-colors duration-300">{t.pricing.free.price}</span>
                <span className="text-muted-foreground font-medium">{t.pricing.free.period}</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {t.pricing.free.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-muted-foreground">
                    <Check className="w-5 h-5 text-secondary flex-shrink-0 group-hover:scale-125 transition-transform duration-300" />
                    <span className="group-hover:text-foreground transition-colors duration-300">{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={handleActionClick} className="w-full py-4 bg-muted text-foreground border border-border rounded-xl font-bold hover:bg-secondary hover:text-secondary-foreground hover:border-secondary hover:shadow-[0_0_20px_rgba(32,199,183,0.3)] hover:scale-105 active:scale-95 transition-all duration-300">{t.pricing.free.cta}</button>
            </div>
            {/* Pro */}
            <div className="group bg-card border-2 border-primary rounded-3xl p-10 flex flex-col relative shadow-lg hover:shadow-[0_20px_60px_-15px_rgba(124,92,255,0.4)] hover:scale-[1.03] transition-all duration-500 z-10">
              <div className={`absolute top-0 ${isAr ? "right-8" : "left-8"} -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold tracking-wide group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(124,92,255,0.5)] transition-all duration-300`}>{t.pricing.pro.badge}</div>
              <h3 className={`text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-300 ${ta}`}>{t.pricing.pro.name}</h3>
              <div className={`flex items-baseline gap-1 mb-8 ${isAr ? "flex-row-reverse justify-end" : ""}`}>
                <span className="text-4xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">{t.pricing.pro.price}</span>
                <span className="text-muted-foreground font-medium">{t.pricing.pro.period}</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {t.pricing.pro.features.map((f, i) => (
                  <li key={i} className={`flex items-center gap-3 ${i === 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    <Check className="w-5 h-5 text-primary flex-shrink-0 group-hover:scale-125 transition-transform duration-300" />
                    <span className={i !== 0 ? "group-hover:text-foreground transition-colors duration-300" : ""}>{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={handleActionClick} className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:shadow-[0_0_25px_rgba(124,92,255,0.5)] hover:scale-105 active:scale-95 transition-all duration-300">{t.pricing.pro.cta}</button>
            </div>
          </div>
        </section>

        {/* ── 8. Final CTA ───────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-6 mb-20">
          <div className="group bg-card border border-border rounded-[3rem] p-16 text-center relative overflow-hidden shadow-xl hover:shadow-[0_20px_80px_-20px_rgba(124,92,255,0.3)] hover:border-primary/40 transition-all duration-700">
            <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors duration-700" />
            <div className="relative z-10 flex flex-col items-center">
              <Sparkles className="w-10 h-10 text-primary mb-6 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500" />
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground tracking-tight group-hover:-translate-y-1 transition-transform duration-500" style={{ fontFamily: "var(--font-headline)" }}>{t.cta.title}</h2>
              <p className="text-xl mb-10 text-muted-foreground max-w-2xl mx-auto group-hover:text-foreground/80 transition-colors duration-500">{t.cta.subtitle}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={handleActionClick} className="px-10 py-4 bg-primary text-primary-foreground rounded-full text-lg font-bold hover:shadow-[0_0_30px_rgba(124,92,255,0.6)] hover:scale-110 active:scale-95 transition-all duration-300">{t.cta.primary}</button>
                <button onClick={handleActionClick} className="px-10 py-4 bg-background border border-border text-foreground rounded-full text-lg font-bold hover:bg-muted hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-300">{t.cta.secondary}</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="w-full py-12 border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 group cursor-pointer">
            <Sparkles className="w-5 h-5 text-primary group-hover:rotate-12 group-hover:scale-125 transition-transform duration-300" />
            <span className="font-bold text-lg text-foreground group-hover:text-primary transition-colors duration-300">صوتي</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <a href="#"        className="hover:text-primary hover:-translate-y-1 transition-all duration-300">{t.footer.product}</a>
            <a href="#pricing" className="hover:text-primary hover:-translate-y-1 transition-all duration-300">{t.footer.pricing}</a>
            <a href="#"        className="hover:text-primary hover:-translate-y-1 transition-all duration-300">{t.footer.privacy}</a>
            <a href="#"        className="hover:text-primary hover:-translate-y-1 transition-all duration-300">{t.footer.terms}</a>
            <a href="#"        className="hover:text-primary hover:-translate-y-1 transition-all duration-300">{t.footer.contact}</a>
          </div>
          <div className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 cursor-default">{t.footer.copyright}</div>
        </div>
      </footer>
    </div>
  );
}
