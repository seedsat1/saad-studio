"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, Plus, Trash2, GripVertical, ArrowLeft, Loader2,
  ChevronDown, ChevronUp, Check, Star, Eye, EyeOff,
} from "lucide-react";
import Link from "next/link";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ══════════════════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════════════════ */

interface CmsPlan {
  _id: string;
  id: string;       // starter | plus | pro | max
  badge: string;
  tagline: string;
  credits: string;
  creditsNum: number;
  equiv: string;
  monthlyPrice: number;
  iqd: number;
  annualDiscount: number;
  cta: string;
  highlight: boolean;
  features: string[];
}

interface CmsTopup {
  _id: string;
  credits: string;
  creditsNum: number;
  price: string;
  usd: number;
  iqd: number;
  pricePerCredit: string;
  popular: boolean;
}

interface CmsModelCost {
  _id: string;
  name: string;
  cost: string;
  per: string;
  type: "video" | "image";
}

interface CmsPaymentMethod {
  _id: string;
  name: string;
  account: string;
  logoText: string;
}

interface CmsHero {
  badge: string;
  heading: string;
  headingHighlight: string;
  subtitle: string;
}

interface CmsTopupHero {
  heading: string;
  headingHighlight: string;
  subtitle: string;
}

interface CmsModelCostHero {
  heading: string;
  headingHighlight: string;
  subtitle: string;
}

interface CmsPaymentHero {
  heading: string;
  subtitle: string;
}

interface PricingCmsData {
  hero: CmsHero;
  plans: CmsPlan[];
  topupHero: CmsTopupHero;
  topups: CmsTopup[];
  modelCostHero: CmsModelCostHero;
  modelCosts: CmsModelCost[];
  paymentMethods: CmsPaymentMethod[];
  whatsappNumber: string;
  paymentHero: CmsPaymentHero;
}

/* ══════════════════════════════════════════════════════════════════════════════
   SEED DATA — matches current hardcoded pricing page
   ══════════════════════════════════════════════════════════════════════════════ */

const uid = () => Math.random().toString(36).slice(2, 10);

const SEED_PLANS: CmsPlan[] = [
  { _id: uid(), id: "starter", badge: "Starter", tagline: "For first-time AI content creators", credits: "250 credits / mo", creditsNum: 250, equiv: "= 125 Nano Banana Pro images - ~41 Kling 3.0 videos", monthlyPrice: 15, iqd: 19500, annualDiscount: 0, cta: "Get Starter", highlight: false, features: ["Selected model access", "2 video - 4 image parallel gens", "Early access to new AI features", "Lowest cost per credit"] },
  { _id: uid(), id: "plus", badge: "Plus", tagline: "For consistent AI creation", credits: "600 credits / mo", creditsNum: 600, equiv: "= 300 Nano Banana Pro images - ~100 Kling 3.0 videos", monthlyPrice: 35, iqd: 45500, annualDiscount: 10, cta: "Get Plus", highlight: false, features: ["ALL standard model access", "3 video - 6 image parallel gens", "Faster queue priority", "Email support"] },
  { _id: uid(), id: "pro", badge: "Pro", tagline: "For serious AI content studios", credits: "1,200 credits / mo", creditsNum: 1200, equiv: "= 600 Nano Banana Pro images - ~200 Kling 3.0 videos", monthlyPrice: 70, iqd: 91000, annualDiscount: 12, cta: "Get Pro - Most Popular", highlight: true, features: ["ALL models including premium", "5 video - 10 image parallel gens", "Priority generation queue", "Commercial usage rights", "Early access to every new model"] },
  { _id: uid(), id: "max", badge: "Max", tagline: "For high-volume studios & agencies", credits: "3,000 credits / mo", creditsNum: 3000, equiv: "= 1,500 Nano Banana Pro images - ~500 Kling 3.0 videos", monthlyPrice: 99, iqd: 128700, annualDiscount: 15, cta: "Get Max", highlight: false, features: ["Unlimited access to ALL models", "10 video - 20 image parallel gens", "Dedicated priority queue", "Dedicated account manager", "Team collaboration features", "Full API access"] },
];

const SEED_TOPUPS: CmsTopup[] = [
  { _id: uid(), credits: "+75 Credits", creditsNum: 75, price: "$5", usd: 5, iqd: 6500, pricePerCredit: "$0.067", popular: false },
  { _id: uid(), credits: "+160 Credits", creditsNum: 160, price: "$10", usd: 10, iqd: 13000, pricePerCredit: "$0.063", popular: false },
  { _id: uid(), credits: "+250 Credits", creditsNum: 250, price: "$15", usd: 15, iqd: 19500, pricePerCredit: "$0.060", popular: true },
  { _id: uid(), credits: "+330 Credits", creditsNum: 330, price: "$20", usd: 20, iqd: 26000, pricePerCredit: "$0.061", popular: false },
  { _id: uid(), credits: "+500 Credits", creditsNum: 500, price: "$30", usd: 30, iqd: 39000, pricePerCredit: "$0.060", popular: false },
];

const SEED_MODEL_COSTS: CmsModelCost[] = [
  { _id: uid(), name: "Kling 3.0", cost: "6+ Credits", per: "std/pro, duration based", type: "video" },
  { _id: uid(), name: "Wan 2.6", cost: "8 Credits", per: "per video", type: "video" },
  { _id: uid(), name: "Seedance 2.0", cost: "24 / 85 Credits", per: "4s / 15s", type: "video" },
  { _id: uid(), name: "Nano Banana Pro", cost: "2 Credits", per: "per image", type: "image" },
  { _id: uid(), name: "Flux.2 Pro 1K", cost: "2 Credits", per: "per image", type: "image" },
  { _id: uid(), name: "GPT Image", cost: "2 Credits", per: "per image", type: "image" },
];

const SEED_PAYMENT_METHODS: CmsPaymentMethod[] = [
  { _id: uid(), name: "QiCard", account: "917382844723", logoText: "QI" },
  { _id: uid(), name: "Zain Cash", account: "07902585579", logoText: "ZC" },
];

const SEED_HERO: CmsHero = {
  badge: "Credits-Based - Cancel Anytime",
  heading: "Choose Your",
  headingHighlight: "Creative Plan",
  subtitle: "One credit balance. All AI models. No hidden fees. Top up anytime - credits never expire.",
};

const SEED_TOPUP_HERO: CmsTopupHero = {
  heading: "Need More Power?",
  headingHighlight: "Buy Extra Credits",
  subtitle: "Top up your balance anytime. Credits stack with your plan and never expire.",
};

const SEED_MODEL_COST_HERO: CmsModelCostHero = {
  heading: "What Does",
  headingHighlight: "1 Credit",
  subtitle: "Approximate credit pricing per generation. No surprises.",
};

const SEED_PAYMENT_HERO: CmsPaymentHero = {
  heading: "Complete Your Payment",
  subtitle: "Local transfer · Secure · Fast activation",
};

/* ══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════════════════ */

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ── Sortable wrapper ──────────────────────────────────────────────────────── */
function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("relative group/sort", isDragging && "z-50 opacity-80")}>
      <button {...attributes} {...listeners}
        className="absolute -left-1 top-1/2 -translate-y-1/2 z-20 flex h-8 w-6 items-center justify-center rounded-l-md bg-white/10 text-zinc-500 opacity-0 group-hover/sort:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        title="Drag to reorder">
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

/* ── Inline field ──────────────────────────────────────────────────────────── */
function Field({ label, value, onChange, multiline = false, type = "text", placeholder = "" }: {
  label: string; value: string | number; onChange: (v: string) => void; multiline?: boolean; type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none resize-none" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none" />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PLAN CARD EDITOR
   ══════════════════════════════════════════════════════════════════════════════ */

function PlanCardEditor({ plan, onUpdate, onRemove }: {
  plan: CmsPlan; onUpdate: (p: CmsPlan) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const up = (p: Partial<CmsPlan>) => onUpdate({ ...plan, ...p });

  return (
    <div className={cn("rounded-2xl border overflow-hidden bg-slate-900/80", plan.highlight ? "border-blue-500/50" : "border-white/10")}>
      {/* Preview header */}
      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          {plan.highlight && <Star className="h-4 w-4 text-blue-400 fill-blue-400" />}
          <div>
            <p className="text-sm font-bold text-white">{plan.badge}</p>
            <p className="text-xs text-zinc-500">${plan.monthlyPrice}/mo · {plan.iqd.toLocaleString()} IQD · {plan.credits}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); up({ highlight: !plan.highlight }); }}
            className={cn("p-1.5 rounded-lg transition-colors", plan.highlight ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-zinc-500 hover:text-white")}
            title="Toggle Most Popular">
            <Star className="h-3.5 w-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 rounded-lg bg-white/5 text-red-400 hover:bg-red-600 hover:text-white transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {open ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
        </div>
      </div>
      {/* Edit panel */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-4 space-y-3 border-t border-white/10">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Plan ID" value={plan.id} onChange={(v) => up({ id: v })} placeholder="starter" />
                <Field label="Badge" value={plan.badge} onChange={(v) => up({ badge: v })} />
              </div>
              <Field label="Tagline" value={plan.tagline} onChange={(v) => up({ tagline: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Monthly Price ($)" value={plan.monthlyPrice} onChange={(v) => up({ monthlyPrice: Number(v) || 0 })} type="number" />
                <Field label="Price (IQD)" value={plan.iqd} onChange={(v) => up({ iqd: Number(v) || 0 })} type="number" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Annual Discount (%)" value={plan.annualDiscount} onChange={(v) => up({ annualDiscount: Number(v) || 0 })} type="number" />
                <Field label="Credits (number)" value={plan.creditsNum} onChange={(v) => up({ creditsNum: Number(v) || 0 })} type="number" />
              </div>
              <Field label="Credits" value={plan.credits} onChange={(v) => up({ credits: v })} placeholder="250 credits / mo" />
              <Field label="Equivalent" value={plan.equiv} onChange={(v) => up({ equiv: v })} multiline />
              <Field label="CTA Text" value={plan.cta} onChange={(v) => up({ cta: v })} />
              {/* Features */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Features</label>
                {plan.features.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={f} onChange={(e) => {
                      const fts = [...plan.features]; fts[i] = e.target.value; up({ features: fts });
                    }} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-violet-500/50 focus:outline-none" />
                    <button onClick={() => up({ features: plan.features.filter((_, j) => j !== i) })}
                      className="p-1 text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
                <button onClick={() => up({ features: [...plan.features, "New feature"] })}
                  className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 mt-1">
                  <Plus className="h-3 w-3" /> Add Feature
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   TOPUP EDITOR ROW
   ══════════════════════════════════════════════════════════════════════════════ */

function TopupRow({ topup, onUpdate, onRemove }: {
  topup: CmsTopup; onUpdate: (t: CmsTopup) => void; onRemove: () => void;
}) {
  const up = (p: Partial<CmsTopup>) => onUpdate({ ...topup, ...p });
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-slate-900/80">
      <div className="flex-1 grid grid-cols-5 gap-2">
        <input value={topup.credits} onChange={(e) => up({ credits: e.target.value })} placeholder="+75 Credits"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none" />
        <input type="number" value={topup.usd} onChange={(e) => up({ usd: Number(e.target.value) || 0, price: `$${e.target.value}` })} placeholder="USD"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none" />
        <input type="number" value={topup.iqd} onChange={(e) => up({ iqd: Number(e.target.value) || 0 })} placeholder="IQD"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none" />
        <input value={topup.pricePerCredit} onChange={(e) => up({ pricePerCredit: e.target.value })} placeholder="$0.067"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none" />
        <input type="number" value={topup.creditsNum} onChange={(e) => up({ creditsNum: Number(e.target.value) || 0 })} placeholder="75"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none" />
      </div>
      <button onClick={() => up({ popular: !topup.popular })}
        className={cn("p-1.5 rounded-lg transition-colors text-xs font-bold", topup.popular ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-zinc-500")}>
        {topup.popular ? "★" : "☆"}
      </button>
      <button onClick={onRemove} className="p-1.5 text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MODEL COST ROW
   ══════════════════════════════════════════════════════════════════════════════ */

function ModelCostRow({ mc, onUpdate, onRemove }: {
  mc: CmsModelCost; onUpdate: (m: CmsModelCost) => void; onRemove: () => void;
}) {
  const up = (p: Partial<CmsModelCost>) => onUpdate({ ...mc, ...p });
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-slate-900/80">
      <div className="flex-1 grid grid-cols-4 gap-2">
        <input value={mc.name} onChange={(e) => up({ name: e.target.value })} placeholder="Model name"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none" />
        <input value={mc.cost} onChange={(e) => up({ cost: e.target.value })} placeholder="6 Credits"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none" />
        <input value={mc.per} onChange={(e) => up({ per: e.target.value })} placeholder="per video"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none" />
        <select value={mc.type} onChange={(e) => up({ type: e.target.value as "video" | "image" })}
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none">
          <option value="video">Video</option>
          <option value="image">Image</option>
        </select>
      </div>
      <button onClick={onRemove} className="p-1.5 text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PAYMENT METHOD ROW
   ══════════════════════════════════════════════════════════════════════════════ */

function PaymentMethodRow({ method, onUpdate, onRemove }: {
  method: CmsPaymentMethod; onUpdate: (m: CmsPaymentMethod) => void; onRemove: () => void;
}) {
  const up = (p: Partial<CmsPaymentMethod>) => onUpdate({ ...method, ...p });
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-slate-900/80">
      <div className="flex-1 grid grid-cols-3 gap-2">
        <input value={method.name} onChange={(e) => up({ name: e.target.value })} placeholder="QiCard"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none" />
        <input value={method.account} onChange={(e) => up({ account: e.target.value })} placeholder="917382844723"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none" />
        <input value={method.logoText} onChange={(e) => up({ logoText: e.target.value })} placeholder="QI"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none" />
      </div>
      <button onClick={onRemove} className="p-1.5 text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════════ */

export default function PricingCmsPage() {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // State
  const [hero, setHero] = useState<CmsHero>(SEED_HERO);
  const [plans, setPlans] = useState<CmsPlan[]>(SEED_PLANS);
  const [topupHero, setTopupHero] = useState<CmsTopupHero>(SEED_TOPUP_HERO);
  const [topups, setTopups] = useState<CmsTopup[]>(SEED_TOPUPS);
  const [modelCostHero, setModelCostHero] = useState<CmsModelCostHero>(SEED_MODEL_COST_HERO);
  const [modelCosts, setModelCosts] = useState<CmsModelCost[]>(SEED_MODEL_COSTS);
  const [paymentMethods, setPaymentMethods] = useState<CmsPaymentMethod[]>(SEED_PAYMENT_METHODS);
  const [whatsappNumber, setWhatsappNumber] = useState("9647902585579");
  const [paymentHero, setPaymentHero] = useState<CmsPaymentHero>(SEED_PAYMENT_HERO);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/layouts?page=cms-pricing");
        if (!res.ok) return;
        const row = await res.json();
        const b = row?.layoutBlocks;
        if (!b) return;
        if (b.hero) setHero(b.hero);
        if (b.plans?.length) setPlans(b.plans);
        if (b.topupHero) setTopupHero(b.topupHero);
        if (b.topups?.length) setTopups(b.topups);
        if (b.modelCostHero) setModelCostHero(b.modelCostHero);
        if (b.modelCosts?.length) setModelCosts(b.modelCosts);
        if (b.paymentMethods?.length) setPaymentMethods(b.paymentMethods);
        if (b.whatsappNumber) setWhatsappNumber(b.whatsappNumber);
        if (b.paymentHero) setPaymentHero(b.paymentHero);
      } catch { /* use seeds */ }
    })();
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    setSaving(true);
    const payload: PricingCmsData = { hero, plans, topupHero, topups, modelCostHero, modelCosts, paymentMethods, whatsappNumber, paymentHero };
    try {
      await fetch("/api/admin/layouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageName: "cms-pricing", layoutBlocks: payload }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* skip */ }
    setSaving(false);
  }, [hero, plans, topupHero, topups, modelCostHero, modelCosts, paymentMethods, whatsappNumber, paymentHero]);

  // DnD
  const handleDragEndPlans = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setPlans((prev) => {
      const oi = prev.findIndex((p) => p._id === active.id);
      const ni = prev.findIndex((p) => p._id === over.id);
      return arrayMove(prev, oi, ni);
    });
  };

  return (
    <div className="min-h-screen bg-[#060c18] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#060c18]/90 backdrop-blur-xl px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Admin
          </Link>
          <span className="text-zinc-600">/</span>
          <Link href="/admin/cms" className="text-xs text-zinc-400 hover:text-white transition-colors">CMS</Link>
          <span className="text-zinc-600">/</span>
          <h1 className="text-sm font-bold">Pricing & Payment</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pricing" target="_blank" className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
            <Eye className="h-3.5 w-3.5" /> Preview
          </Link>
          <button onClick={handleSave} disabled={saving}
            className={cn("flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold transition-all",
              saved ? "bg-emerald-600 text-white" : "bg-violet-600 hover:bg-violet-500 text-white",
              saving && "opacity-50")}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : saved ? "Saved!" : "Save All"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">

        {/* ── Hero Section ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-violet-500" />
            Hero Section
          </h2>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-3">
            <Field label="Badge" value={hero.badge} onChange={(v) => setHero({ ...hero, badge: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Heading" value={hero.heading} onChange={(v) => setHero({ ...hero, heading: v })} />
              <Field label="Heading Highlight" value={hero.headingHighlight} onChange={(v) => setHero({ ...hero, headingHighlight: v })} />
            </div>
            <Field label="Subtitle" value={hero.subtitle} onChange={(v) => setHero({ ...hero, subtitle: v })} multiline />
          </div>
        </section>

        {/* ── Plans ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-blue-500" />
              Plans ({plans.length})
            </h2>
            <button onClick={() => setPlans([...plans, { _id: uid(), id: "new", badge: "New Plan", tagline: "Description", credits: "100 credits / mo", creditsNum: 100, equiv: "", monthlyPrice: 10, iqd: 13000, annualDiscount: 0, cta: "Get Plan", highlight: false, features: ["Feature 1"] }])}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600/20 px-3 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-600/30 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Plan
            </button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndPlans}>
            <SortableContext items={plans.map((p) => p._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {plans.map((plan) => (
                  <SortableItem key={plan._id} id={plan._id}>
                    <PlanCardEditor
                      plan={plan}
                      onUpdate={(p) => setPlans((prev) => prev.map((x) => x._id === p._id ? p : x))}
                      onRemove={() => setPlans((prev) => prev.filter((x) => x._id !== plan._id))}
                    />
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        {/* ── Top-ups ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-amber-500" />
            Top-up Section
          </h2>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Heading" value={topupHero.heading} onChange={(v) => setTopupHero({ ...topupHero, heading: v })} />
              <Field label="Heading Highlight" value={topupHero.headingHighlight} onChange={(v) => setTopupHero({ ...topupHero, headingHighlight: v })} />
            </div>
            <Field label="Subtitle" value={topupHero.subtitle} onChange={(v) => setTopupHero({ ...topupHero, subtitle: v })} multiline />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Credits · USD · IQD · $/Credit · #</p>
            <button onClick={() => setTopups([...topups, { _id: uid(), credits: "+100 Credits", creditsNum: 100, price: "$10", usd: 10, iqd: 13000, pricePerCredit: "$0.100", popular: false }])}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600/20 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-600/30 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Top-up
            </button>
          </div>
          <div className="space-y-2">
            {topups.map((t) => (
              <TopupRow key={t._id} topup={t}
                onUpdate={(u) => setTopups((prev) => prev.map((x) => x._id === u._id ? u : x))}
                onRemove={() => setTopups((prev) => prev.filter((x) => x._id !== t._id))} />
            ))}
          </div>
        </section>

        {/* ── Model Costs ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-cyan-500" />
            Model Cost Guide
          </h2>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Heading" value={modelCostHero.heading} onChange={(v) => setModelCostHero({ ...modelCostHero, heading: v })} />
              <Field label="Heading Highlight" value={modelCostHero.headingHighlight} onChange={(v) => setModelCostHero({ ...modelCostHero, headingHighlight: v })} />
            </div>
            <Field label="Subtitle" value={modelCostHero.subtitle} onChange={(v) => setModelCostHero({ ...modelCostHero, subtitle: v })} multiline />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Name · Cost · Per · Type</p>
            <button onClick={() => setModelCosts([...modelCosts, { _id: uid(), name: "New Model", cost: "2 Credits", per: "per generation", type: "image" }])}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600/20 px-3 py-1.5 text-xs font-bold text-cyan-400 hover:bg-cyan-600/30 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Model
            </button>
          </div>
          <div className="space-y-2">
            {modelCosts.map((mc) => (
              <ModelCostRow key={mc._id} mc={mc}
                onUpdate={(u) => setModelCosts((prev) => prev.map((x) => x._id === u._id ? u : x))}
                onRemove={() => setModelCosts((prev) => prev.filter((x) => x._id !== mc._id))} />
            ))}
          </div>
        </section>

        {/* ── Payment Methods ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-emerald-500" />
            Payment Methods
          </h2>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-3">
            <Field label="WhatsApp Number" value={whatsappNumber} onChange={setWhatsappNumber} placeholder="9647902585579" />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Name · Account · Logo</p>
            <button onClick={() => setPaymentMethods([...paymentMethods, { _id: uid(), name: "New Method", account: "", logoText: "XX" }])}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600/20 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-600/30 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Method
            </button>
          </div>
          <div className="space-y-2">
            {paymentMethods.map((m) => (
              <PaymentMethodRow key={m._id} method={m}
                onUpdate={(u) => setPaymentMethods((prev) => prev.map((x) => x._id === u._id ? u : x))}
                onRemove={() => setPaymentMethods((prev) => prev.filter((x) => x._id !== m._id))} />
            ))}
          </div>
        </section>

        {/* ── Payment Page Header ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-rose-500" />
            Payment Page Header
          </h2>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-3">
            <Field label="Heading" value={paymentHero.heading} onChange={(v) => setPaymentHero({ ...paymentHero, heading: v })} />
            <Field label="Subtitle" value={paymentHero.subtitle} onChange={(v) => setPaymentHero({ ...paymentHero, subtitle: v })} />
          </div>
        </section>

      </div>
    </div>
  );
}
