"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { useMemo, useState } from "react";
import {
  Check, X, Zap, Sparkles, Star, Crown, Rocket,
  Video, ImageIcon, Infinity, ShoppingCart,
} from "lucide-react";

// â”€â”€â”€ Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PLANS = [
  {
    id: "starter",
    badge: "Starter",
    tagline: "For first-time AI content creators",
    credits: "250 credits / mo",
    equiv: "= 125 Nano Banana Pro images - ~41 Kling 3.0 videos",
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
      "Selected model access",
      "2 video - 4 image parallel gens",
      "Early access to new AI features",
      "Lowest cost per credit",
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
    credits: "600 credits / mo",
    equiv: "= 300 Nano Banana Pro images - ~100 Kling 3.0 videos",
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
      "ALL standard model access",
      "3 video - 6 image parallel gens",
      "Faster queue priority",
      "Email support",
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
    credits: "1,200 credits / mo",
    equiv: "= 600 Nano Banana Pro images - ~200 Kling 3.0 videos",
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
      "ALL models including premium",
      "5 video - 10 image parallel gens",
      "Priority generation queue",
      "Commercial usage rights",
      "Early access to every new model",
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
    credits: "3,000 credits / mo",
    equiv: "= 1,500 Nano Banana Pro images - ~500 Kling 3.0 videos",
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
      "Unlimited access to ALL models",
      "10 video - 20 image parallel gens",
      "Dedicated priority queue",
      "Dedicated account manager",
      "Team collaboration features",
      "Full API access",
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
  starter: 15,
  plus: 35,
  pro: 70,
  max: 99,
};

const PLAN_ANNUAL_DISCOUNT: Record<string, number> = {
  starter: 0, // monthly only
  plus: 10,
  pro: 12,
  max: 15,
};

const MODEL_COSTS = {
  video: [
    { name: "Kling 3.0",        cost: "6+ Credits", per: "std/pro, duration based", free: false, color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
    { name: "Wan 2.6",          cost: "8 Credits",  per: "per video",              free: false, color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20" },
    { name: "Seedance 2.0",     cost: "24 / 85 Credits", per: "4s / 15s",          free: false, color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
  ],
  image: [
    { name: "Nano Banana Pro",  cost: "2 Credits",  per: "per image",              free: false, color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/20" },
    { name: "Flux.2 Pro 1K",    cost: "2 Credits",  per: "per image",              free: false, color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20" },
    { name: "GPT Image",        cost: "2 Credits",  per: "per image",              free: false, color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20" },
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

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const formatUsd = (value: number) => {
    if (Number.isInteger(value)) return `$${value}`;
    return `$${value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}`;
  };

  const getPlanPricing = useMemo(() => {
    return (planId: string) => {
      const monthly = PLAN_MONTHLY_PRICE[planId] ?? 0;
      const discount = PLAN_ANNUAL_DISCOUNT[planId] ?? 0;

      if (billingCycle === "annual" && discount > 0) {
        const discountedMonthly = monthly * (1 - discount / 100);
        return {
          amount: formatUsd(discountedMonthly),
          previousAmount: formatUsd(monthly),
          suffix: "/ mo",
          period: `billed yearly (${discount}% off)`,
          cycle: "annual" as const,
        };
      }

      return {
        amount: formatUsd(monthly),
        previousAmount: "",
        suffix: "/ mo",
        period: planId === "starter" && billingCycle === "annual" ? "monthly only" : "billed monthly",
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
            Credits-Based - Cancel Anytime
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            Choose Your{" "}
            <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Creative Plan
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            One credit balance. All AI models. No hidden fees. Top up anytime - credits never expire.
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
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
                billingCycle === "annual"
                  ? "bg-violet-600 text-white"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Annual
            </button>
          </div>
        </div>

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/* SECTION 1 â€” PLANS                                              */}
        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-start"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {PLANS.map((plan) => (
              (() => {
                const pricing = getPlanPricing(plan.id);
                return (
              <motion.div
                key={plan.id}
                variants={slideUp}
                className={`relative flex flex-col rounded-3xl border p-6 backdrop-blur-sm transition-all duration-300
                  ${plan.highlight
                    ? "bg-slate-900/80 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.25)] scale-[1.03]"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
              >
                {/* Popular badge */}
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 text-xs font-bold text-white shadow-lg whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                {/* Header */}
                <div className={`flex items-center gap-3 mb-4 p-3 rounded-2xl ${plan.accentBg} border ${plan.accentBorder}`}>
                  <plan.Icon className={`w-5 h-5 ${plan.iconColor}`} />
                  <div>
                    <p className="text-sm font-bold text-white">{plan.badge}</p>
                    <p className="text-xs text-slate-500 leading-tight">{plan.tagline}</p>
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
                  <p className="text-sm font-bold text-white">{plan.credits}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{plan.equiv}</p>
                </div>

                {/* CTA */}
                <Link
                  href={`/payment?type=plan&id=${plan.id}&cycle=${pricing.cycle}`}
                  className={`block w-full mt-3 py-3 rounded-2xl text-sm font-bold text-center transition-all duration-200 ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>

                <div className="my-5 border-t border-slate-800" />

                {/* Features */}
                <ul className="space-y-2 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Unlimited section */}
                <div className="space-y-2 mt-auto">
                  {plan.unlimited.active.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-400 mb-1.5 flex items-center gap-1">
                        <Infinity className="w-3 h-3" /> Unlimited Included
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.unlimited.active.map((m) => (
                          <span key={m} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                            {m}
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
                          <span key={m} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {plan.unlimited.none.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-400 mb-1.5 flex items-center gap-1">
                        <X className="w-3 h-3" /> Not Unlimited
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.unlimited.none.map((m) => (
                          <span key={m} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/25 text-red-300">
                            {m}
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
              Need More Power?{" "}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Buy Extra Credits
              </span>
            </h2>
            <p className="text-slate-400 text-base max-w-lg mx-auto">
              Top up your balance anytime. Credits stack with your plan and <strong className="text-slate-300">never expire</strong>.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {TOPUPS.map((t) => (
              <motion.div
                key={t.credits}
                variants={slideUp}
                className={`relative flex flex-col items-center gap-3 p-5 rounded-2xl border backdrop-blur-sm text-center transition-all duration-200 hover:scale-[1.04]
                  ${t.popular
                    ? "bg-amber-500/10 border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.2)]"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
              >
                {t.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-[10px] font-bold text-white whitespace-nowrap">
                    Best Value
                  </span>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.popular ? "bg-amber-500/20" : "bg-slate-800"}`}>
                  <Zap className={`w-5 h-5 ${t.popular ? "text-amber-400" : "text-slate-400"}`} />
                </div>
                <div>
                  <p className="text-base font-extrabold text-white">{t.credits}</p>
                  <p className="text-2xl font-black text-white mt-1">{t.price}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.pricePerCredit} / credit</p>
                  {t.savings && (
                    <span className="mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                      {t.savings}
                    </span>
                  )}
                </div>
                <Link
                  href={`/payment?type=topup&credits=${t.credits.replace(/[^0-9,]/g, "")}`}
                  className={`block w-full py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5
                  ${t.popular
                    ? "bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/30"
                    : "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white"
                  }`}>
                  <ShoppingCart className="w-3.5 h-3.5" /> Buy Credits
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
              What Does{" "}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                1 Credit
              </span>{" "}
              Get You?
            </h2>
            <p className="text-slate-400 text-base max-w-lg mx-auto">
              Approximate credit pricing per generation. No surprises.
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
                  <h3 className="text-base font-bold text-white">Video Models</h3>
                  <p className="text-xs text-slate-500">Approx. credit cost per generation</p>
                </div>
              </div>
              <div className="space-y-3">
                {MODEL_COSTS.video.map((m) => (
                  <div key={m.name} className={`flex items-center justify-between p-3.5 rounded-2xl border ${m.bg} ${m.border}`}>
                    <div className="flex items-center gap-3">
                      {m.free
                        ? <Infinity className={`w-4 h-4 ${m.color}`} />
                        : <Video className={`w-4 h-4 ${m.color}`} />
                      }
                      <span className="text-sm font-semibold text-slate-200">{m.name}</span>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-extrabold ${m.color}`}>{m.cost}</p>
                      <p className="text-[10px] text-slate-500">{m.per}</p>
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
                  <h3 className="text-base font-bold text-white">Image Models</h3>
                  <p className="text-xs text-slate-500">Approx. credit cost per generation</p>
                </div>
              </div>
              <div className="space-y-3">
                {MODEL_COSTS.image.map((m) => (
                  <div key={m.name} className={`flex items-center justify-between p-3.5 rounded-2xl border ${m.bg} ${m.border}`}>
                    <div className="flex items-center gap-3">
                      {m.free
                        ? <Infinity className={`w-4 h-4 ${m.color}`} />
                        : <ImageIcon className={`w-4 h-4 ${m.color}`} />
                      }
                      <span className="text-sm font-semibold text-slate-200">{m.name}</span>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-extrabold ${m.color}`}>{m.cost}</p>
                      <p className="text-[10px] text-slate-500">{m.per}</p>
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


