"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  Check, X, Zap, Sparkles, Star, Crown, Rocket,
  Video, ImageIcon, Infinity, ShoppingCart,
} from "lucide-react";
import { useCmsData } from "@/lib/use-cms-data";
import { useLanguage } from "@/lib/use-language";

/* ─── CMS types (must match admin/cms/pricing) ─── */
interface CmsPlan {
  _id: string; id: string; badge: string; tagline: string; credits: string;
  equiv: string; creditsNum?: number; monthlyPrice: number; annualDiscount: number; cta: string;
  highlight: boolean; features: string[];
}
interface CmsTopup { _id: string; credits: string; price: string; pricePerCredit: string; popular: boolean; }
interface CmsModelCost { _id: string; name: string; cost: string; per: string; type: "video" | "image"; }
interface CmsHero { badge: string; heading: string; headingHighlight: string; subtitle: string; }
interface CmsSubHero { heading: string; headingHighlight: string; subtitle: string; }
interface PricingCmsData {
  hero: CmsHero; plans: CmsPlan[]; topupHero: CmsSubHero; topups: CmsTopup[];
  modelCostHero: CmsSubHero; modelCosts: CmsModelCost[];
}

// â”€â”€â”€ Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PLAN_FEATURES: Record<string, string[]> = {
  try: [
    "Try the full studio with a small credit pack",
    "Selected model access",
    "Up to 1 video or 2 image parallel generations",
    "Best to evaluate quality before committing",
  ],
  starter: [
    "Selected model access",
    "Up to 2 video or 4 image parallel generations",
    "Credit-based usage across supported tools",
    "Good for light monthly creation",
  ],
  plus: [
    "Standard model access",
    "Up to 3 video or 6 image parallel generations",
    "Faster queue priority",
    "Email support",
  ],
  pro: [
    "Premium model access",
    "Up to 5 video or 10 image parallel generations",
    "Priority generation queue",
    "Commercial usage rights",
    "Early access to new models",
  ],
  max: [
    "Access to all available models",
    "Up to 10 video or 20 image parallel generations",
    "Dedicated priority queue",
    "Dedicated account manager",
    "Team collaboration features",
    "Full API access",
  ],
};

const PLANS = [
  {
    id: "try",
    badge: "Try",
    tagline: "Test the studio with one quick taste",
    credits: "70 credits / mo",
    equiv: "= 22 Nano Banana Pro images - ~1 Kling 3.0 video (8s)",
    price: "$5",
    period: "per month, billed monthly",
    cta: "Try for $5",
    ctaStyle: "border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10",
    highlight: false,
    Icon: Zap,
    iconColor: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/30",
    features: [
      ...PLAN_FEATURES.try,
    ],
    unlimited: {
      active: [],
      coming: [],
      none: [],
    },
  },
  {
    id: "starter",
    badge: "Starter",
    tagline: "For first-time AI content creators",
    credits: "300 credits / mo",
    equiv: "= 97 Nano Banana Pro images - ~5 Kling 3.0 videos (15s)",
    price: "$15",
    period: "per month, billed annually",
    cta: "Get Starter",
    ctaStyle: "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25",
    highlight: false,
    Icon: Rocket,
    iconColor: "text-violet-400",
    accentBg: "bg-violet-500/10",
    accentBorder: "border-violet-500/30",
    features: [
      ...PLAN_FEATURES.starter,
    ],
    unlimited: {
      active: [],
      coming: [],
      none: [],
    },
  },
  {
    id: "plus",
    badge: "Plus",
    tagline: "For consistent AI creation",
    credits: "800 credits / mo",
    equiv: "= 260 Nano Banana Pro images - ~15 Kling 3.0 videos (15s)",
    price: "$35",
    period: "per month, billed annually",
    cta: "Get Plus",
    ctaStyle: "border border-slate-700 text-slate-200 hover:bg-slate-800",
    highlight: false,
    Icon: Sparkles,
    iconColor: "text-slate-400",
    accentBg: "bg-slate-500/10",
    accentBorder: "border-slate-700",
    features: [
      ...PLAN_FEATURES.plus,
    ],
    unlimited: {
      active: [],
      coming: [],
      none: [],
    },
  },
  {
    id: "pro",
    badge: "Pro",
    tagline: "For serious AI content studios",
    credits: "1,800 credits / mo",
    equiv: "= 586 Nano Banana Pro images - ~34 Kling 3.0 videos (15s)",
    price: "$70",
    period: "per month, billed annually",
    cta: "Get Pro - Most Popular",
    ctaStyle: "bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 text-white shadow-lg shadow-blue-500/30",
    highlight: true,
    Icon: Star,
    iconColor: "text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/40",
    features: [
      ...PLAN_FEATURES.pro,
    ],
    unlimited: {
      active: [],
      coming: [],
      none: [],
    },
  },
  {
    id: "max",
    badge: "Max",
    tagline: "For high-volume studios & agencies",
    credits: "2,700 credits / mo",
    equiv: "= 879 Nano Banana Pro images - ~51 Kling 3.0 videos (15s)",
    price: "$99",
    period: "per month, billed annually",
    cta: "Get Max",
    ctaStyle: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/30",
    highlight: false,
    Icon: Crown,
    iconColor: "text-amber-400",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/30",
    features: [
      ...PLAN_FEATURES.max,
    ],
    unlimited: {
      active: [],
      coming: [],
      none: [],
    },
  },
];

const TOPUPS = [
  { credits: "+75 Credits",  price: "$5",  pricePerCredit: "$0.067", popular: false, savings: "" },
  { credits: "+160 Credits", price: "$10", pricePerCredit: "$0.063", popular: false, savings: "" },
  { credits: "+250 Credits", price: "$15", pricePerCredit: "$0.060", popular: true,  savings: "" },
  { credits: "+330 Credits", price: "$20", pricePerCredit: "$0.061", popular: false, savings: "" },
  { credits: "+500 Credits", price: "$30", pricePerCredit: "$0.060", popular: false, savings: "" },
];

const PLAN_MONTHLY_PRICE: Record<string, number> = {
  try: 5,
  starter: 15,
  plus: 35,
  pro: 70,
  max: 99,
};

const PLAN_ANNUAL_DISCOUNT: Record<string, number> = {
  try: 0, // monthly only
  starter: 0, // monthly only
  plus: 10,
  pro: 12,
  max: 15,
};

const ANNUAL_UNLIMITED_IMAGE_MODELS = [
  { name: "FLUX.2 Pro", badge: "Unlimited" },
  { name: "Seedream 4.5", badge: "Unlimited" },
  { name: "Nano Banana", badge: "Unlimited" },
  { name: "Seedream 5 Lite", badge: "Unlimited" },
  { name: "GPT Image", badge: "Unlimited" },
];

const MAX_ANNUAL_UNLIMITED_IMAGE_MODELS = [
  ...ANNUAL_UNLIMITED_IMAGE_MODELS,
  { name: "Nano Banana 2", badge: "Unlimited" },
  { name: "Nano Banana Pro", badge: "Unlimited" },
];

// Source-of-truth values must match lib/pricing-models.ts:
//   nano_pro.userCreditsRate = 3.07  (per image)
//   kling30.userCreditsRate  = 3.5   (per second; 15s clip = 52.5 credits)
// These constants drive the "X images / Y videos" copy on each plan card.
const NANO_BANANA_PRO_CREDITS = 3.07;
const KLING_3_15S_CREDITS = 52.5;

const parsePlanCredits = (plan: { credits: string; creditsNum?: number }): number => {
  if (typeof plan.creditsNum === "number" && Number.isFinite(plan.creditsNum)) {
    return plan.creditsNum;
  }

  const parsed = Number.parseInt(plan.credits.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCount = (value: number): string => value.toLocaleString("en-US");

// getPlanGenerationAllowance moved inside PricingPage component

const MODEL_COSTS = {
  video: [
    { name: "Kling 3.0",        cost: "17.5+ Credits", per: "5s 720p, duration based", free: false, color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
    { name: "Wan 2.6",          cost: "8 Credits",  per: "per video",              free: false, color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20" },
    { name: "Seedance 2.0",     cost: "32 / 120 Credits", per: "4s / 15s",          free: false, color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
  ],
  image: [
    { name: "Nano Banana Pro",  cost: "3.07+ Credits",  per: "1K image",              free: false, color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/20" },
    { name: "Flux.2 Pro 1K",    cost: "0.52 Credits",  per: "1K image",              free: false, color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20" },
    { name: "GPT Image 2",      cost: "1.03+ Credits",  per: "1K image",              free: false, color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20" },
  ],
};

// â”€â”€â”€ Animations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const stagger: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const slideUp: Variants = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function usePricingTranslation() {
  const { lang } = useLanguage();
  const dict: Record<string, Record<string, string>> = {
    en: {},
    ar: {
      // Hero Texts
      "Credits-Based - Cancel Anytime": "نظام النقاط - إلغاء في أي وقت",
      "Choose Your": "اختر",
      "Creative Plan": "خطتك الإبداعية",
      "One credit balance. All AI models. No hidden fees. Top up anytime - credits never expire.": "رصيد نقاط موحد. جميع نماذج الذكاء الاصطناعي. لا توجد رسوم خفية. اشحن رصيدك في أي وقت - النقاط لا تنتهي صلاحيتها أبداً.",
      
      // Toggle
      "Monthly": "شهرياً",
      "Annual": "سنوياً",
      
      // Plans
      "Try": "تجريبي",
      "Test the studio with one quick taste": "اختبر الاستوديو بتجربة سريعة واحدة",
      "70 credits / mo": "70 نقطة / شهر",
      "Try for $5": "جرب مقابل $5",
      
      "Starter": "مبتدئ",
      "For first-time AI content creators": "لصناع محتوى الذكاء الاصطناعي الجدد",
      "300 credits / mo": "300 نقطة / شهر",
      "Get Starter": "احصل على باقة المبتدئ",
      
      "Plus": "بلاس",
      "For consistent AI creation": "لإنشاء محتوى الذكاء الاصطناعي المستمر",
      "800 credits / mo": "800 نقطة / شهر",
      "Get Plus": "احصل على باقة بلاس",
      
      "Pro": "برو",
      "For serious AI content studios": "لاستوديوهات محتوى الذكاء الاصطناعي الجادة",
      "1,800 credits / mo": "1,800 نقطة / شهر",
      "Get Pro - Most Popular": "احصل على برو - الأكثر شعبية",
      
      "Max": "ماكس",
      "For high-volume studios & agencies": "للاستوديوهات والوكالات ذات الإنتاج العالي",
      "2,700 credits / mo": "2,700 نقطة / شهر",
      "Get Max": "احصل على باقة ماكس",
      
      // Features
      "Try the full studio with a small credit pack": "جرب الاستوديو الكامل مع حزمة نقاط صغيرة",
      "Selected model access": "الوصول إلى نماذج محددة",
      "Up to 1 video or 2 image parallel generations": "توليد متوازي يصل إلى فيديو 1 أو صورتين",
      "Best to evaluate quality before committing": "الأفضل لتقييم الجودة قبل الالتزام",
      "Up to 2 video or 4 image parallel generations": "توليد متوازي يصل إلى فيديوهين أو 4 صور",
      "Credit-based usage across supported tools": "استخدام قائم على النقاط عبر جميع الأدوات المدعومة",
      "Good for light monthly creation": "جيد للإنشاء الشهري الخفيف",
      "Standard model access": "الوصول إلى النماذج القياسية",
      "Up to 3 video or 6 image parallel generations": "توليد متوازي يصل إلى 3 فيديوهات أو 6 صور",
      "Faster queue priority": "أولوية طابور أسرع",
      "Email support": "الدعم عبر البريد الإلكتروني",
      "Premium model access": "الوصول إلى النماذج المميزة (Premium)",
      "Up to 5 video or 10 image parallel generations": "توليد متوازي يصل إلى 5 فيديوهات أو 10 صور",
      "Priority generation queue": "أولوية طابور التوليد",
      "Commercial usage rights": "حقوق الاستخدام التجاري",
      "Early access to new models": "وصول مبكر للنماذج الجديدة",
      "Access to all available models": "الوصول إلى جميع النماذج المتاحة",
      "Up to 10 video or 20 image parallel generations": "توليد متوازي يصل إلى 10 فيديوهات أو 20 صورة",
      "Dedicated priority queue": "طابور أولوية مخصص",
      "Dedicated account manager": "مدير حساب مخصص",
      "Team collaboration features": "ميزات التعاون الجماعي",
      "Full API access": "وصول كامل للـ API",
      
      // Subscriptions labels
      "Most Popular": "الأكثر شعبية",
      "Current Plan": "الخطة الحالية",
      "Manage Subscription": "إدارة الاشتراك",
      "Annual Unlimited Images": "صور غير محدودة سنوياً",
      "Unlimited Included": "مشمول بشكل غير محدود",
      "Coming Soon": "قريباً",
      "Not Unlimited": "ليس غير محدود",
      "Unlimited": "غير محدود",
      
      // Billing Cycles
      "/ mo": " / شهرياً",
      "billed yearly": "مفوتر سنوياً",
      "billed monthly": "مفوتر شهرياً",
      "monthly only": "شهري فقط",
      "per month": "لكل شهر",
      
      // Topup Hero
      "Need More Power?": "هل تحتاج إلى المزيد من القوة؟",
      "Buy Extra Credits": "اشترِ نقاطاً إضافية",
      "Top up your balance anytime. Credits stack with your plan and never expire.": "اشحن رصيدك في أي وقت. تتراكم النقاط مع خطتك ولا تنتهي صلاحيتها أبداً.",
      "Best Value": "أفضل قيمة",
      "Buy Credits": "شراء النقاط",
      "credit": "نقطة",
      
      // Topups
      "+75 Credits": "+75 نقطة",
      "+160 Credits": "+160 نقطة",
      "+250 Credits": "+250 نقطة",
      "+330 Credits": "+330 نقطة",
      "+500 Credits": "+500 نقطة",
      
      // Model costs guide
      "What Does": "ماذا توفر لك",
      "1 Credit": "نقطة واحدة",
      "Get You?": "؟",
      "Approximate credit pricing per generation. No surprises.": "التسعير التقريبي للنقاط لكل عملية توليد. لا مفاجآت.",
      "Video Models": "نماذج الفيديو",
      "Image Models": "نماذج الصور",
      "Approx. credit cost per generation": "التكلفة التقريبية للنقاط لكل عملية توليد",
      
      // Model Costs Video
      "Kling 3.0": "Kling 3.0",
      "Wan 2.6": "Wan 2.6",
      "Seedance 2.0": "Seedance 2.0",
      "17.5+ Credits": "17.5+ نقطة",
      "8 Credits": "8 نقاط",
      "32 / 120 Credits": "32 / 120 نقطة",
      "5s 720p, duration based": "5 ثوانٍ بدقة 720p، حسب المدة",
      "per video": "لكل فيديو",
      "4s / 15s": "4 ثوانٍ / 15 ثانية",
      
      // Model Costs Image
      "Nano Banana Pro": "Nano Banana Pro",
      "Flux.2 Pro 1K": "Flux.2 Pro 1K",
      "GPT Image 2": "GPT Image 2",
      "3.07+ Credits": "3.07+ نقطة",
      "0.52 Credits": "0.52 نقطة",
      "1.03+ Credits": "1.03+ نقطة",
      "1K image": "صورة بدقة 1K"
    }
  };
  const t = (key: string): string => {
    return dict[lang]?.[key] ?? key;
  };
  return { t, lang };
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const { t, lang } = usePricingTranslation();
  const getPlanGenerationAllowance = (plan: { credits: string; creditsNum?: number }): string => {
    const credits = parsePlanCredits(plan);
    if (!credits) return "";

    const imageCount = Math.floor(credits / NANO_BANANA_PRO_CREDITS);
    const videoCount = Math.floor(credits / KLING_3_15S_CREDITS);
    const imgStr = formatCount(imageCount);
    const vidStr = formatCount(videoCount);
    return lang === "ar" 
      ? `حتى ${imgStr} صورة Nano Banana Pro أو ${vidStr} فيديو Kling 3.0` 
      : `Up to ${imgStr} Nano Banana Pro images OR ${vidStr} Kling 3.0 videos`;
  };
  const { data: cms } = useCmsData<PricingCmsData>("pricing");
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile/settings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || data?.error) return;
        const active = Boolean(data?.subscription?.active);
        const planId = String(data?.subscription?.planId ?? "").toLowerCase();
        const interval = String(data?.subscription?.billingInterval ?? "").toLowerCase();
        if (interval === "annual" || interval === "yearly" || interval === "year") {
          setBillingCycle("annual");
        } else if (interval === "monthly" || interval === "month") {
          setBillingCycle("monthly");
        }
        if (active && ["try", "starter", "plus", "pro", "max"].includes(planId)) {
          setCurrentPlanId(planId);
        }
      })
      .catch(() => null);
  }, []);

  const ICON_MAP = useMemo<Record<string, typeof Rocket>>(() => ({ try: Zap, starter: Rocket, plus: Sparkles, pro: Star, max: Crown }), []);
  const ACCENT_MAP = useMemo<Record<string, { bg: string; border: string; iconColor: string; ctaStyle: string }>>(() => ({
    try:     { bg: "bg-emerald-500/10", border: "border-emerald-500/30", iconColor: "text-emerald-400", ctaStyle: "border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10" },
    starter: { bg: "bg-violet-500/10", border: "border-violet-500/30", iconColor: "text-violet-400", ctaStyle: "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25" },
    plus:    { bg: "bg-slate-500/10",  border: "border-slate-700",     iconColor: "text-slate-400",  ctaStyle: "border border-slate-700 text-slate-200 hover:bg-slate-800" },
    pro:     { bg: "bg-blue-500/10",   border: "border-blue-500/40",   iconColor: "text-blue-400",   ctaStyle: "bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 text-white shadow-lg shadow-blue-500/30" },
    max:     { bg: "bg-amber-500/10",  border: "border-amber-500/30",  iconColor: "text-amber-400",  ctaStyle: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/30" },
  }), []);

  // CMS-driven data with fallback to hardcoded
  const heroData = cms?.hero ?? { badge: "Credits-Based - Cancel Anytime", heading: "Choose Your", headingHighlight: "Creative Plan", subtitle: "One credit balance. All AI models. No hidden fees. Top up anytime - credits never expire." };
  const topupHeroData = cms?.topupHero ?? { heading: "Need More Power?", headingHighlight: "Buy Extra Credits", subtitle: "Top up your balance anytime. Credits stack with your plan and never expire." };
  const modelCostHeroData = cms?.modelCostHero ?? { heading: "What Does", headingHighlight: "1 Credit", subtitle: "Approximate credit pricing per generation. No surprises." };

  // Plans from CMS or hardcoded
  const cmsPlans = cms?.plans;
  const livePlans = useMemo(() => {
    if (!cmsPlans?.length) return PLANS.map((p) => ({ ...p, _monthlyPrice: PLAN_MONTHLY_PRICE[p.id] ?? 0, _annualDiscount: PLAN_ANNUAL_DISCOUNT[p.id] ?? 0 }));
    return cmsPlans.map((cp) => {
      const accent = ACCENT_MAP[cp.id] ?? ACCENT_MAP.starter;
      const Icon = ICON_MAP[cp.id] ?? Rocket;
      return {
        ...cp,
        features: PLAN_FEATURES[cp.id] ?? cp.features,
        Icon,
        iconColor: accent.iconColor,
        accentBg: accent.bg,
        accentBorder: accent.border,
        ctaStyle: accent.ctaStyle,
        price: `$${cp.monthlyPrice}`,
        period: t("per month"),
        _monthlyPrice: cp.monthlyPrice,
        _annualDiscount: cp.annualDiscount,
        unlimited: { active: [] as string[], coming: [] as string[], none: [] as string[] },
      };
    });
  }, [ACCENT_MAP, ICON_MAP, cmsPlans]);

  const liveTopups = cms?.topups?.length ? cms.topups : TOPUPS;
  const liveModelCosts = cms?.modelCosts?.length ? cms.modelCosts : [...MODEL_COSTS.video.map((m) => ({ ...m, type: "video" as const, _id: m.name })), ...MODEL_COSTS.image.map((m) => ({ ...m, type: "image" as const, _id: m.name }))];

  const videoModels = liveModelCosts.filter((m) => m.type === "video");
  const imageModels = liveModelCosts.filter((m) => m.type === "image");

  const formatUsd = (value: number) => {
    if (Number.isInteger(value)) return `$${value}`;
    return `$${value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}`;
  };

  const getPlanPricing = useMemo(() => {
    return (plan: typeof livePlans[number]) => {
      const monthly = plan._monthlyPrice;
      const discount = plan._annualDiscount;

      if (billingCycle === "annual" && discount > 0) {
        const discountedMonthly = monthly * (1 - discount / 100);
        return {
          amount: formatUsd(discountedMonthly),
          previousAmount: formatUsd(monthly),
          suffix: t("/ mo"),
          period: t("billed yearly") + ` (${discount}% ${t("off")})`,
          cycle: "annual" as const,
        };
      }

      return {
        amount: formatUsd(monthly),
        previousAmount: "",
        suffix: t("/ mo"),
        period: plan.id === "starter" && billingCycle === "annual" ? t("monthly only") : t("billed monthly"),
        cycle: "monthly" as const,
      };
    };
  }, [billingCycle]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full bg-violet-900/15 blur-[140px]" />
        <div className="absolute top-1/3 right-0 h-[400px] w-[400px] rounded-full bg-blue-900/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full bg-indigo-900/10 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-28">

        {/* â”€â”€ Hero â”€â”€ */}
        <motion.div
          className="text-center space-y-4 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-sm font-medium mb-2">
            <Zap className="w-3.5 h-3.5 fill-violet-400 text-violet-400" />
            {t(heroData.badge)}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            {t(heroData.heading)}{" "}
            <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {t(heroData.headingHighlight)}
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            {t(heroData.subtitle)}
          </p>
        </motion.div>

        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
                billingCycle === "monthly"
                  ? "bg-violet-600 text-white"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {t("Monthly")}
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
                billingCycle === "annual"
                  ? "bg-violet-600 text-white"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {t("Annual")}
            </button>
          </div>
        </div>

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/* SECTION 1 â€” PLANS                                              */}
        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 items-start"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {livePlans.map((plan) => (
              (() => {
                const pricing = getPlanPricing(plan);
                const isCurrent = currentPlanId === plan.id;
                return (
              <motion.div
                key={plan.id}
                variants={slideUp}
                className={`relative flex flex-col rounded-3xl border p-6 backdrop-blur-sm transition-all duration-300
                  ${isCurrent
                    ? "bg-slate-900/85 border-emerald-400 shadow-[0_0_44px_rgba(16,185,129,0.28)] scale-[1.03]"
                    : plan.highlight
                    ? "bg-slate-900/80 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.25)] scale-[1.03]"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
              >
                {/* Popular badge */}
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 text-xs font-bold text-white shadow-lg whitespace-nowrap">
                    {t("Most Popular")}
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3.5 left-4 px-3 py-1 rounded-full bg-emerald-500 text-xs font-bold text-white shadow-lg whitespace-nowrap">
                    {t("Current Plan")}
                  </div>
                )}

                {/* Header */}
                <div className={`flex items-center gap-3 mb-4 p-3 rounded-2xl ${plan.accentBg} border ${plan.accentBorder}`}>
                  <plan.Icon className={`w-5 h-5 ${plan.iconColor}`} />
                  <div>
                    <p className="text-sm font-bold text-white">{t(plan.badge)}</p>
                    <p className="text-xs text-slate-500 leading-tight">{t(plan.tagline)}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-1">
                  {pricing.previousAmount && (
                    <span className="text-slate-500 text-xl font-bold line-through mr-2">
                      {pricing.previousAmount}
                    </span>
                  )}
                  <span className="text-4xl font-extrabold text-white">{pricing.amount}</span>
                  <span className="text-slate-500 text-sm ml-1">{pricing.suffix}</span>
                </div>
                <p className="text-xs text-slate-500 mb-4">{pricing.period}</p>
                {/* Credits callout */}
                <div className={`rounded-xl px-3 py-2.5 mb-2 border ${plan.accentBg} ${plan.accentBorder}`}>
                  <p className="text-sm font-bold text-white">{t(plan.credits)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{getPlanGenerationAllowance(plan)}</p>
                </div>

                {/* CTA */}
                {isCurrent ? (
                  <Link
                    href="/settings"
                    className="block w-full mt-3 py-3 rounded-2xl text-sm font-bold text-center transition-all duration-200 bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25"
                  >
                    {t("Manage Subscription")}
                  </Link>
                ) : (
                  <Link
                    href={`/payment?type=plan&id=${plan.id}&cycle=${pricing.cycle}`}
                    className={`block w-full mt-3 py-3 rounded-2xl text-sm font-bold text-center transition-all duration-200 ${plan.ctaStyle}`}
                  >
                    {t(plan.cta)}
                  </Link>
                )}

                <div className="my-5 border-t border-slate-800" />

                {/* Features */}
                <ul className="space-y-2 mb-5">
                  {plan.features.map((f) => (
                    <li key={t(f)} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      {t(f)}
                    </li>
                  ))}
                </ul>

                {billingCycle === "annual" && ["pro", "max"].includes(plan.id) && (
                  <div className="mb-5 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100">
                        {t("Annual Unlimited Images")}
                      </p>
                      <span className="rounded-full bg-cyan-300 px-2 py-0.5 text-[9px] font-black uppercase text-slate-950">
                        {t("Unlimited")}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {(plan.id === "max" ? MAX_ANNUAL_UNLIMITED_IMAGE_MODELS : ANNUAL_UNLIMITED_IMAGE_MODELS).map((model) => (
                        <div key={t(model.name)} className="flex items-center justify-between gap-2 text-xs text-slate-200">
                          <span className="flex items-center gap-1.5">
                            <Check className="h-3 w-3 text-emerald-300" />
                            {t(model.name)}
                          </span>
                          <span className="rounded-full bg-cyan-300 px-1.5 py-0.5 text-[9px] font-black text-slate-950">
                            {t(model.badge)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unlimited section */}
                <div className="space-y-2 mt-auto">
                  {plan.unlimited.active.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-400 mb-1.5 flex items-center gap-1">
                        <Infinity className="w-3 h-3" /> {t("Unlimited Included")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.unlimited.active.map((m) => (
                          <span key={t(m)} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                            {t(m)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {plan.unlimited.coming.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-400 mb-1.5">Coming Soon</p>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.unlimited.coming.map((m) => (
                          <span key={t(m)} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300">
                            {t(m)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {plan.unlimited.none.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-400 mb-1.5 flex items-center gap-1">
                        <X className="w-3 h-3" /> {t("Not Unlimited")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.unlimited.none.map((m) => (
                          <span key={t(m)} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/25 text-red-300">
                            {t(m)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
                );
              })()
            ))}
          </motion.div>
        </section>

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/* SECTION 2 â€” TOP-UP                                             */}
        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section>
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
              {t(topupHeroData.heading)}{" "}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                {t(topupHeroData.headingHighlight)}
              </span>
            </h2>
            <p className="text-slate-400 text-base max-w-lg mx-auto">
              {t(topupHeroData.subtitle)}
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {liveTopups.map((topup) => (
              <motion.div
                key={topup.credits}
                variants={slideUp}
                className={`relative flex flex-col items-center gap-3 p-5 rounded-2xl border backdrop-blur-sm text-center transition-all duration-200 hover:scale-[1.04]
                  ${topup.popular
                    ? "bg-amber-500/10 border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.2)]"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
              >
                {topup.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-[10px] font-bold text-white whitespace-nowrap">
                    {t("Best Value")}
                  </span>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${topup.popular ? "bg-amber-500/20" : "bg-slate-800"}`}>
                  <Zap className={`w-5 h-5 ${topup.popular ? "text-amber-400" : "text-slate-400"}`} />
                </div>
                <div>
                  <p className="text-base font-extrabold text-white">{t(topup.credits)}</p>
                  <p className="text-2xl font-black text-white mt-1">{t(topup.price)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t(topup.pricePerCredit)} / {t("credit")}</p>
                  {"savings" in topup && topup.savings && (
                    <span className="mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                      {t(topup.savings)}
                    </span>
                  )}
                </div>
                <Link
                  href={`/payment?type=topup&credits=${topup.credits.replace(/[^0-9,]/g, "")}`}
                  className={`block w-full py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5
                  ${topup.popular
                    ? "bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/30"
                    : "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white"
                  }`}>
                  <ShoppingCart className="w-3.5 h-3.5" /> {t("Buy Credits")}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/* SECTION 3 â€” MODEL COST GUIDE                                   */}
        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section className="pb-10">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
              {t(modelCostHeroData.heading)}{" "}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                {t(modelCostHeroData.headingHighlight)}
              </span>{" "}
              {t("Get You?")}
            </h2>
            <p className="text-slate-400 text-base max-w-lg mx-auto">
              {t(modelCostHeroData.subtitle)}
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Video */}
            <motion.div variants={slideUp} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Video className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{t("Video Models")}</h3>
                  <p className="text-xs text-slate-500">{t("Approx. credit cost per generation")}</p>
                </div>
              </div>
              <div className="space-y-3">
                {videoModels.map((m) => (
                  <div key={m.name} className="flex items-center justify-between p-3.5 rounded-2xl border bg-blue-500/10 border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <Video className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-semibold text-slate-200">{t(m.name)}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-blue-400">{t(m.cost)}</p>
                      <p className="text-[10px] text-slate-500">{t(m.per)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Images */}
            <motion.div variants={slideUp} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <ImageIcon className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{t("Image Models")}</h3>
                  <p className="text-xs text-slate-500">{t("Approx. credit cost per generation")}</p>
                </div>
              </div>
              <div className="space-y-3">
                {imageModels.map((m) => (
                  <div key={m.name} className="flex items-center justify-between p-3.5 rounded-2xl border bg-violet-500/10 border-violet-500/20">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="w-4 h-4 text-violet-400" />
                      <span className="text-sm font-semibold text-slate-200">{t(m.name)}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-violet-400">{t(m.cost)}</p>
                      <p className="text-[10px] text-slate-500">{t(m.per)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

        </section>

      </div>
    </div>
  );
}


