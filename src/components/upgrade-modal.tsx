"use client";

import { useState } from "react";
import { X, Zap, Crown, Sparkles, TrendingUp, Loader2 } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  usedChars?: number;
  limitChars?: number;
}

const PLANS = [
  {
    id: "starter",
    chars: "50,000",
    price: "$4.99",
    priceAr: "٤.٩٩ دولار",
    minutes: "~60",
    label: "Starter",
    labelAr: "المبتدئ",
    icon: <Zap className="w-4 h-4" />,
    color: "border-white/10 hover:border-[#D6B25E]/50",
    badge: null,
    priceId: "price_starter",
  },
  {
    id: "pro",
    chars: "200,000",
    price: "$9.99",
    priceAr: "٩.٩٩ دولار",
    minutes: "~155",
    label: "Pro",
    labelAr: "المحترف",
    icon: <Crown className="w-4 h-4" />,
    color: "border-[#7C5CFF]/60 shadow-[0_0_30px_rgba(124,92,255,0.2)]",
    badge: "الأكثر شعبية",
    priceId: "price_pro",
  },
  {
    id: "business",
    chars: "600,000",
    price: "$24.99",
    priceAr: "٢٤.٩٩ دولار",
    minutes: "~476",
    label: "Business",
    labelAr: "الأعمال",
    icon: <Sparkles className="w-4 h-4" />,
    color: "border-white/10 hover:border-[#20C7B7]/50",
    badge: null,
    priceId: "price_business",
  },
  {
    id: "enterprise",
    chars: "1,500,000",
    price: "$49.99",
    priceAr: "٤٩.٩٩ دولار",
    minutes: "~1,190",
    label: "Enterprise",
    labelAr: "المؤسسات",
    icon: <TrendingUp className="w-4 h-4" />,
    color: "border-white/10 hover:border-[#20C7B7]/50",
    badge: "الأوفر",
    priceId: "price_enterprise",
  },
] as const;

export function UpgradeModal({ open, onClose, usedChars = 0, limitChars = 0 }: UpgradeModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  if (!open) return null;

  const pct   = limitChars > 0 ? Math.min((usedChars / limitChars) * 100, 100) : 100;
  const words  = Math.round(usedChars / 5);

  const handleUpgrade = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const res  = await fetch("/api/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Checkout error");
        setLoadingPlan(null);
      }
    } catch {
      alert("Network error — please try again");
      setLoadingPlan(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-3xl bg-[#0B1020] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" dir="ltr">
        
        {/* Purple glow top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-[#7C5CFF]/20 blur-3xl rounded-full pointer-events-none" />

        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            انتهى حد الاستخدام المجاني
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 font-cairo">
            ترقية للاستمرار في التوليد
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            لقد وصلت إلى الحد المجاني. اختر خطة للحصول على آلاف الحروف الإضافية.
          </p>

          {/* Usage bar */}
          {limitChars > 0 && (
            <div className="mt-5 bg-white/5 rounded-2xl p-4 text-left border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400 font-mono">الاستخدام الحالي</span>
                <span className="text-xs font-bold text-white font-mono">
                  {usedChars.toLocaleString()} / {limitChars.toLocaleString()} حرف
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 flex gap-4 text-[11px] text-gray-500">
                <span>{usedChars.toLocaleString()} حرف</span>
                <span>·</span>
                <span>~{words.toLocaleString()} كلمة</span>
                <span>·</span>
                <span className="text-red-400 font-semibold">الحد المجاني ممتلئ</span>
              </div>
            </div>
          )}
        </div>

        {/* Plans grid */}
        <div className="px-8 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-white/5 p-4 transition-all duration-200 cursor-pointer group ${plan.color}`}
              onClick={() => handleUpgrade(plan.id)}
            >
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                  plan.id === "pro"
                    ? "bg-[#7C5CFF] text-white"
                    : "bg-[#20C7B7]/20 text-[#20C7B7] border border-[#20C7B7]/30"
                }`}>
                  {plan.badge}
                </div>
              )}

              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${
                plan.id === "pro" ? "bg-[#7C5CFF]/20 text-[#7C5CFF]" : "bg-white/10 text-gray-400"
              }`}>
                {plan.icon}
              </div>

              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1">
                {plan.chars} حرف
              </div>

              <div className={`text-2xl font-bold mb-0.5 ${plan.id === "pro" ? "text-[#7C5CFF]" : "text-white"}`}>
                {plan.price}
              </div>

              <div className="text-[11px] text-gray-500 mb-3">
                {plan.minutes} دقيقة تقريباً
              </div>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loadingPlan !== null}
                className={`w-full py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  plan.id === "pro"
                    ? "bg-[#7C5CFF] text-white hover:bg-[#9B82FF] shadow-lg shadow-purple-500/20 disabled:opacity-70"
                    : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:text-white group-hover:border-white/20 disabled:opacity-50"
                }`}
              >
                {loadingPlan === plan.id
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> جاري التحميل...</>
                  : <>اشترك الآن</>}
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="px-8 pb-8 pt-2 text-center">
          <p className="text-[11px] text-gray-600">
            الخطط تُجدَّد شهرياً · إلغاء في أي وقت · دفع آمن عبر Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
