"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Zap, ChevronRight, Upload, X, CheckCircle2, Clock,
  XCircle, AlertCircle, Copy, Check,
  Star, Rocket, Crown, Sparkles, FileText, RefreshCw,
  MessageCircle,
} from "lucide-react";
import { useCmsData } from "@/lib/use-cms-data";

/* ─── CMS types (shared with pricing CMS) ─── */
interface CmsPlan { _id: string; id: string; monthlyPrice: number; iqd: number; annualDiscount: number; credits: string; creditsNum: number; badge: string; }
interface CmsTopup { _id: string; credits: string; creditsNum: number; usd: number; iqd: number; price: string; pricePerCredit: string; popular: boolean; }
interface CmsPaymentMethod { _id: string; name: string; account: string; logoText: string; }
interface CmsPaymentHero { heading: string; subtitle: string; }
interface PricingCmsData {
  plans?: CmsPlan[];
  topups?: CmsTopup[];
  paymentMethods?: CmsPaymentMethod[];
  whatsappNumber?: string;
  paymentHero?: CmsPaymentHero;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const PLANS = [
  { id: "starter", label: "Starter", usd: 15, iqd: 19500,  credits: 250,  Icon: Rocket, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/40" },
  { id: "plus",    label: "Plus",    usd: 35, iqd: 45500,  credits: 600,  Icon: Sparkles, color: "text-slate-300", bg: "bg-slate-500/10", border: "border-slate-500/40" },
  { id: "pro",     label: "Pro",     usd: 70, iqd: 91000,  credits: 1200, Icon: Star,   color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/40"   },
  { id: "max",     label: "Max",     usd: 99, iqd: 128700, credits: 3000, Icon: Crown,  color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/40"  },
];

const TOPUPS = [
  { id: "t75",  credits: 75,  usd: 5,  iqd: 6500  },
  { id: "t160", credits: 160, usd: 10, iqd: 13000 },
  { id: "t250", credits: 250, usd: 15, iqd: 19500 },
  { id: "t330", credits: 330, usd: 20, iqd: 26000 },
  { id: "t500", credits: 500, usd: 30, iqd: 39000 },
];

const METHODS = [
  {
    id: "qicard",
    name: "QiCard",
    account: "917382844723",
    logoText: "QI",
    gradient: "from-emerald-600 to-teal-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.2)]",
    activeBorder: "border-emerald-400",
  },
  {
    id: "zaincash",
    name: "Zain Cash",
    account: "07902585579",
    logoText: "ZC",
    gradient: "from-red-600 to-rose-700",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.2)]",
    activeBorder: "border-red-400",
  },
];

type OrderType = "plan" | "topup";
type Status = "idle" | "pending" | "approved" | "rejected";
type Step = 1 | 2 | 3;
type BillingCycle = "monthly" | "annual";

const PLAN_ANNUAL_DISCOUNT: Record<string, number> = {
  starter: 0,
  plus: 10,
  pro: 12,
  max: 15,
};

function generateOrderId() {
  return "SS-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 5).toUpperCase();
}

// ─── StepBar ─────────────────────────────────────────────────────────────────

const STEP_LABELS = ["Select Order", "Payment Method", "Status"];

function StepBar({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 min-w-[56px]">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                ${done ? "bg-emerald-500 text-white" : active ? "bg-violet-600 text-white ring-2 ring-violet-400/50" : "bg-slate-800 text-slate-500 border border-slate-700"}`}>
                {done ? <Check className="w-4 h-4" /> : n}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap hidden sm:block ${active ? "text-violet-300" : done ? "text-emerald-400" : "text-slate-600"}`}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`flex-1 h-px mx-1 transition-all duration-300 ${done ? "bg-emerald-500/60" : "bg-slate-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── PaymentMethodCard ────────────────────────────────────────────────────────

function PaymentMethodCard({
  method, selected, onSelect,
}: {
  method: typeof METHODS[0]; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`relative w-full text-left p-5 rounded-2xl border-2 transition-all duration-200
        ${selected ? `${method.activeBorder} ${method.glow} bg-slate-800/80` : `${method.border} ${method.bg} hover:bg-slate-800/60`}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${method.gradient} flex items-center justify-center text-white font-extrabold text-sm shadow-lg flex-shrink-0`}>
          {method.logoText}
        </div>
        <div className="flex-1">
          <p className="font-bold text-white text-base">{method.name}</p>
          <p className="text-sm text-slate-400 mt-0.5">{method.account}</p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? "border-white bg-white/20" : "border-slate-600"}`}>
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>
    </button>
  );
}

// ─── TransferInstructions ─────────────────────────────────────────────────────

function TransferInstructions({ method, orderId, orderLabel, whatsappNumber }: { method: typeof METHODS[0]; orderId: string; orderLabel: string; whatsappNumber: string }) {
  const [copiedAccount, setCopiedAccount] = useState(false);

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => { setter(true); setTimeout(() => setter(false), 2000); });
  };

  const waMsg = encodeURIComponent(`Hello SAAD STUDIO,\nI made a payment via ${method.name}.\nService: ${orderLabel}\nOrder ID: ${orderId}\nPlease verify my payment. Thank you!`);

  return (
    <div className="mt-5 p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-4">
      <p className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        <FileText className="w-4 h-4 text-violet-400" /> Transfer Instructions
      </p>
      <div>
        <p className="text-xs text-slate-500 mb-1.5">Account / Number</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono">{method.account}</code>
          <button onClick={() => copy(method.account, setCopiedAccount)} className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 flex items-center gap-1.5 transition-colors whitespace-nowrap">
            {copiedAccount ? <><Check className="w-3 h-3 text-emerald-400" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
          </button>
        </div>
      </div>
      <div className="pt-3 border-t border-slate-700">
        <a
          href={`https://wa.me/${whatsappNumber}?text=${waMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20b85a] text-white text-sm font-bold transition-all duration-200 hover:scale-[1.02] active:scale-100"
        >
          <MessageCircle className="w-4 h-4" />
          Send Confirmation on WhatsApp
        </a>
      </div>
    </div>
  );
}

// ─── ProofUpload ──────────────────────────────────────────────────────────────

function ProofUpload({ file, onFile, onClear }: { file: File | null; onFile: (f: File) => void; onClear: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const validate = useCallback((f: File) => {
    if (f.size > 10 * 1024 * 1024) { setError("File exceeds the 10 MB limit."); return false; }
    if (!["image/png", "image/jpeg", "application/pdf"].includes(f.type)) { setError("Only PNG, JPG, or PDF files are accepted."); return false; }
    setError(""); return true;
  }, []);

  const handle = (f: File) => { if (validate(f)) onFile(f); };

  return (
    <div>
      <p className="text-sm font-medium text-slate-300 mb-1">Upload Payment Proof</p>
      <p className="text-xs text-slate-500 mb-2">Screenshot or PDF of your transfer receipt</p>
      {file ? (
        <div className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-emerald-500/30">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-sm text-slate-200 flex-1 truncate">{file.name}</p>
          <button onClick={onClear} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
          onClick={() => ref.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200
            ${dragging ? "border-violet-500 bg-violet-500/10" : "border-slate-700 hover:border-violet-500/60 hover:bg-slate-800/40"}`}
        >
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center"><Upload className="w-5 h-5 text-violet-400" /></div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-200">Drop your file here, or click to browse</p>
            <p className="text-xs text-slate-500 mt-0.5">PNG, JPG, PDF — max 10 MB</p>
          </div>
        </div>
      )}
      <input ref={ref} type="file" accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }} />
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── VerificationStatus ───────────────────────────────────────────────────────

function VerificationStatus({
  status, rejectionReason, onResubmit, onNew,
}: {
  status: "pending" | "approved" | "rejected";
  rejectionReason: string;
  onResubmit: () => void;
  onNew: () => void;
}) {
  const configs = {
    pending:  { Icon: Clock,         iconColor: "text-amber-400",   iconBg: "bg-amber-500/15",   title: "Pending Verification",   desc: "Your payment is under review. We typically verify within 1–4 hours during business hours.", border: "border-amber-500/30",   bg: "bg-amber-500/5"   },
    approved: { Icon: CheckCircle2,  iconColor: "text-emerald-400", iconBg: "bg-emerald-500/15", title: "Payment Approved!",       desc: "Credits have been added to your wallet.",                                                border: "border-emerald-500/30", bg: "bg-emerald-500/5" },
    rejected: { Icon: XCircle,       iconColor: "text-red-400",     iconBg: "bg-red-500/15",     title: "Payment Rejected",       desc: "",                                                                                       border: "border-red-500/30",     bg: "bg-red-500/5"     },
  };
  const c = configs[status];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border p-8 text-center ${c.bg} ${c.border}`}>
      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${c.iconBg} mb-4`}>
        <c.Icon className={`w-8 h-8 ${c.iconColor}`} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{c.title}</h3>
      {c.desc && <p className="text-sm text-slate-400 max-w-sm mx-auto">{c.desc}</p>}
      {status === "rejected" && (
        <div className="mt-4 p-4 rounded-xl bg-slate-800/60 border border-red-500/20 text-left">
          <p className="text-xs font-semibold text-red-400 mb-1">Reason:</p>
          <p className="text-sm text-slate-300">{rejectionReason}</p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
        {status === "rejected" && (
          <button onClick={onResubmit} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
            <RefreshCw className="w-4 h-4" />Resubmit
          </button>
        )}
        <button onClick={onNew} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-colors">
          <Zap className="w-4 h-4" />New Order
        </button>
      </div>
    </motion.div>
  );
}

// ─── WhatsAppButton ───────────────────────────────────────────────────────────

function WhatsAppButton({ orderId, whatsappNumber }: { orderId: string; whatsappNumber: string }) {
  const msg = encodeURIComponent(`Hello SAAD STUDIO, I need help with my payment. Order ID: ${orderId || "N/A"}`);
  return (
    <a href={`https://wa.me/${whatsappNumber}?text=${msg}`} target="_blank" rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20b85a] text-white text-sm font-bold shadow-2xl shadow-green-500/30 transition-all duration-200 hover:scale-105">
      <MessageCircle className="w-5 h-5" />
      Contact on WhatsApp
    </a>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

const inputCls = (err?: string) =>
  `w-full px-4 py-2.5 rounded-xl bg-slate-800 border ${err ? "border-red-500/60" : "border-slate-700 focus:border-violet-500/60"} text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors`;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const { data: cms } = useCmsData<PricingCmsData>("pricing");
  const [step, setStep]                     = useState<Step>(1);
  const [orderType, setOrderType]           = useState<OrderType>("plan");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedTopupId, setSelectedTopupId] = useState("");

  // Live methods from CMS with styling fallback
  const liveMethods = useMemo(() => {
    if (!cms?.paymentMethods?.length) return METHODS;
    const STYLE_MAP: Record<string, { gradient: string; bg: string; border: string; glow: string; activeBorder: string }> = {
      qicard:   { gradient: "from-emerald-600 to-teal-600", bg: "bg-emerald-500/10", border: "border-emerald-500/30", glow: "shadow-[0_0_20px_rgba(16,185,129,0.2)]", activeBorder: "border-emerald-400" },
      zaincash: { gradient: "from-red-600 to-rose-700",     bg: "bg-red-500/10",     border: "border-red-500/30",     glow: "shadow-[0_0_20px_rgba(239,68,68,0.2)]", activeBorder: "border-red-400" },
    };
    const defaultStyle = { gradient: "from-blue-600 to-indigo-600", bg: "bg-blue-500/10", border: "border-blue-500/30", glow: "shadow-[0_0_20px_rgba(59,130,246,0.2)]", activeBorder: "border-blue-400" };
    return cms.paymentMethods.map((pm) => ({
      id: pm.name.toLowerCase().replace(/\s+/g, ""),
      name: pm.name,
      account: pm.account,
      logoText: pm.logoText,
      ...(STYLE_MAP[pm.name.toLowerCase().replace(/\s+/g, "")] ?? defaultStyle),
    }));
  }, [cms?.paymentMethods]);

  const liveWhatsApp = cms?.whatsappNumber ?? "9647902585579";

  // Live plans from CMS (with IQD prices + styling fallback)
  const ICON_MAP: Record<string, typeof Rocket> = { starter: Rocket, plus: Sparkles, pro: Star, max: Crown };
  const STYLE_MAP_PLANS: Record<string, { color: string; bg: string; border: string }> = {
    starter: { color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/40" },
    plus:    { color: "text-slate-300",  bg: "bg-slate-500/10",  border: "border-slate-500/40" },
    pro:     { color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/40" },
    max:     { color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/40" },
  };
  const defaultPlanStyle = { color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/40" };

  const livePlans = useMemo(() => {
    if (!cms?.plans?.length) return PLANS;
    return cms.plans.map((cp) => {
      const s = STYLE_MAP_PLANS[cp.id] ?? defaultPlanStyle;
      return {
        id: cp.id, label: cp.badge, usd: cp.monthlyPrice, iqd: cp.iqd, credits: cp.creditsNum,
        Icon: ICON_MAP[cp.id] ?? Rocket, ...s,
      };
    });
  }, [cms?.plans]);

  const liveTopups = useMemo(() => {
    if (!cms?.topups?.length) return TOPUPS;
    return cms.topups.map((ct) => ({
      id: `t${ct.creditsNum}`, credits: ct.creditsNum, usd: ct.usd, iqd: ct.iqd,
    }));
  }, [cms?.topups]);

  const livePaymentHero = cms?.paymentHero ?? { heading: "Complete Your Payment", subtitle: "Local transfer · Secure · Fast activation" };

  // Live annual discounts from CMS plans
  const liveAnnualDiscount = useMemo(() => {
    if (!cms?.plans?.length) return PLAN_ANNUAL_DISCOUNT;
    const map: Record<string, number> = {};
    cms.plans.forEach((p) => { map[p.id] = p.annualDiscount; });
    return map;
  }, [cms?.plans]);

  const [selectedMethod, setSelectedMethod] = useState(METHODS[0].id);
  const [status, setStatus]                 = useState<Status>("idle");
  const [rejectionReason]                   = useState("The transfer reference number could not be verified. Please resubmit with a clear screenshot.");
  const [orderId]                           = useState(generateOrderId);

  const [proofFile, setProofFile]   = useState<File | null>(null);
  const [proofError, setProofError] = useState("");
  const [confirmed, setConfirmed]   = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [loading, setLoading]       = useState(false);

  const cycleQuery = (searchParams.get("cycle") || searchParams.get("billing") || searchParams.get("interval") || "").toLowerCase();
  const billingCycle: BillingCycle = ["annual", "yearly", "year"].includes(cycleQuery) ? "annual" : "monthly";
  const incomingType = searchParams.get("type");
  const incomingPlanId = searchParams.get("id");
  const incomingTopupCredits = Number((searchParams.get("credits") || "").replace(/\D/g, "")) || 0;
  const incomingTopupId = incomingTopupCredits
    ? (liveTopups.find((tp) => tp.credits === incomingTopupCredits)?.id ?? "")
    : "";

  useEffect(() => {
    if (incomingType === "topup") {
      setOrderType("topup");
      if (incomingTopupId) setSelectedTopupId(incomingTopupId);
      return;
    }
    if (incomingType === "plan") {
      setOrderType("plan");
      if (incomingPlanId && livePlans.some((p) => p.id === incomingPlanId)) {
        setSelectedPlanId(incomingPlanId);
      }
    }
  }, [incomingType, incomingTopupId, incomingPlanId, livePlans]);

  const resolvePlanBilling = (plan: (typeof PLANS)[number]) => {
    const discount = liveAnnualDiscount[plan.id] ?? 0;
    const monthlyUsd = plan.usd;
    const monthlyIqd = plan.iqd;
    const yearlyBaseUsd = monthlyUsd * 12;
    const yearlyBaseIqd = monthlyIqd * 12;

    if (billingCycle === "annual" && discount > 0) {
      return {
        usd: Math.round(yearlyBaseUsd * (1 - discount / 100)),
        iqd: Math.round(yearlyBaseIqd * (1 - discount / 100)),
        previousUsd: yearlyBaseUsd,
        previousIqd: yearlyBaseIqd,
        suffix: "/yr",
        creditsText: `${plan.credits.toLocaleString()} credits / mo`,
        periodText: `Billed yearly (${discount}% off)`,
      };
    }
    return {
      usd: monthlyUsd,
      iqd: monthlyIqd,
      previousUsd: null,
      previousIqd: null,
      suffix: "/mo",
      creditsText: `${plan.credits.toLocaleString()} credits / mo`,
      periodText: "Billed monthly",
    };
  };

  const method      = liveMethods.find((m) => m.id === selectedMethod) ?? liveMethods[0];
  const effectiveOrderType: OrderType = incomingType === "topup" ? "topup" : "plan";
  const effectivePlanId = incomingPlanId && livePlans.some((p) => p.id === incomingPlanId) ? incomingPlanId : selectedPlanId;
  const effectiveTopupId = incomingType === "topup" ? (incomingTopupId || selectedTopupId) : selectedTopupId;
  const selectedItem =
    effectiveOrderType === "plan"
      ? livePlans.find((p) => p.id === effectivePlanId)
      : liveTopups.find((tp) => tp.id === effectiveTopupId);

  const selectedPlan = selectedItem && effectiveOrderType === "plan" ? (selectedItem as typeof livePlans[0]) : null;
  const selectedPlanBilling = selectedPlan ? resolvePlanBilling(selectedPlan) : null;

  const orderLabel =
    effectiveOrderType === "plan"
      ? `${selectedPlan?.label ?? ""} Plan — ${selectedPlanBilling?.creditsText ?? ""} (${selectedPlanBilling?.suffix === "/yr" ? "annual" : "monthly"})`
      : `+${(selectedItem as typeof liveTopups[0])?.credits?.toLocaleString() ?? ""} Credits Top-up`;

  const goStep2 = () => {
    if (effectiveOrderType === "plan" && !effectivePlanId) return;
    if (effectiveOrderType === "topup" && !effectiveTopupId) return;
    setStep(2);
  };

  const handleSubmit = async () => {
    let hasError = false;
    if (!proofFile) { setProofError("Please upload your payment proof."); hasError = true; } else setProofError("");
    if (!confirmed) { setConfirmError("Please confirm before submitting."); hasError = true; } else setConfirmError("");
    if (hasError) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setStatus("pending");
    setStep(3);
  };

  const handleResubmit = () => { setStatus("idle"); setStep(2); setProofError(""); setConfirmError(""); };
  const handleNew = () => {
    setStep(1); setStatus("idle"); setSelectedPlanId(""); setSelectedTopupId("");
    setSelectedMethod(liveMethods[0]?.id ?? METHODS[0].id);
    setProofFile(null); setConfirmed(false); setProofError(""); setConfirmError("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 h-[400px] w-[400px] rounded-full bg-violet-900/10 blur-[130px]" />
        <div className="absolute bottom-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-900/10 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{livePaymentHero.heading}</h1>
          <p className="text-sm text-slate-400 mt-1">{livePaymentHero.subtitle}</p>
        </div>

        {/* Order ID */}
        <div className="flex items-center gap-2 mb-6 text-xs text-slate-600">
          <span className="font-medium text-slate-500">Order ID:</span>
          <code className="text-slate-400 font-mono">{orderId}</code>
        </div>

        <StepBar step={step} />

        <AnimatePresence mode="wait">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
              <h2 className="text-lg font-bold text-white">What would you like to purchase?</h2>

              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-3">
                {(["plan", "topup"] as OrderType[]).map((ot) => (
                  <button key={ot} onClick={() => { setOrderType(ot); setSelectedPlanId(""); setSelectedTopupId(""); }}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200
                      ${orderType === ot ? "border-violet-500 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.2)]" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${orderType === ot ? "bg-violet-500/20" : "bg-slate-800"}`}>
                      {ot === "plan" ? <Star className={`w-4 h-4 ${orderType === ot ? "text-violet-400" : "text-slate-500"}`} /> : <Zap className={`w-4 h-4 ${orderType === ot ? "text-violet-400" : "text-slate-500"}`} />}
                    </div>
                    <p className="font-bold text-sm text-white">{ot === "plan" ? "Subscription Plan" : "Credit Top-up"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{ot === "plan" ? "Monthly credit bundle" : "One-time credit refill"}</p>
                  </button>
                ))}
              </div>

              {/* Plan list */}
              {orderType === "plan" && (
                <div className="space-y-2.5">
                  {livePlans.map((p) => (
                    (() => {
                      const billing = resolvePlanBilling(p);
                      return (
                    <button key={p.id} onClick={() => setSelectedPlanId(p.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200
                        ${selectedPlanId === p.id ? `${p.border} ${p.bg}` : "border-slate-800 bg-slate-900/60 hover:border-slate-700"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.bg} border ${p.border} flex-shrink-0`}>
                        <p.Icon className={`w-5 h-5 ${p.color}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-white">{p.label}</p>
                        <p className="text-xs text-slate-500">{p.credits.toLocaleString()} credits / mo</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {billing.previousUsd ? (
                          <p className="text-[10px] text-slate-500 line-through">${billing.previousUsd.toLocaleString()}/yr</p>
                        ) : null}
                        <p className="font-extrabold text-white">${billing.usd}<span className="text-xs text-slate-500 font-normal">{billing.suffix}</span></p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{billing.iqd.toLocaleString()} IQD</p>
                      </div>
                    </button>
                      );
                    })()
                  ))}
                </div>
              )}

              {/* Top-up grid */}
              {orderType === "topup" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {liveTopups.map((tp) => (
                    <button key={tp.id} onClick={() => setSelectedTopupId(tp.id)}
                      className={`p-3.5 rounded-2xl border text-center transition-all duration-200
                        ${selectedTopupId === tp.id ? "border-violet-500 bg-violet-500/10 shadow-[0_0_16px_rgba(139,92,246,0.2)]" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"}`}>
                      <p className="text-sm font-extrabold text-white">+{tp.credits.toLocaleString()}</p>
                      <p className="text-xs text-slate-500 mt-0.5">credits</p>
                      <p className="text-base font-black text-white mt-1">${tp.usd}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{tp.iqd.toLocaleString()} IQD</p>
                    </button>
                  ))}
                </div>
              )}

              <button onClick={goStep2} disabled={orderType === "plan" ? !selectedPlanId : !selectedTopupId}
                className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-violet-500/25">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">Choose payment method</h2>
                <p className="text-sm text-slate-400 mt-1">Select how you want to transfer</p>
              </div>

              {/* Order summary */}
              {selectedItem && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
                  <Zap className="w-5 h-5 text-violet-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">
                      {effectiveOrderType === "plan"
                        ? `${selectedPlan!.label} Plan — ${selectedPlanBilling!.creditsText}`
                        : `+${(selectedItem as typeof TOPUPS[0]).credits.toLocaleString()} Credits`}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {effectiveOrderType === "plan"
                        ? `${selectedPlanBilling!.previousUsd ? `~~$${selectedPlanBilling!.previousUsd.toLocaleString()}/yr~~ → ` : ""}$${selectedPlanBilling!.usd} ${selectedPlanBilling!.suffix} · ${selectedPlanBilling!.iqd.toLocaleString()} IQD`
                        : `$${(selectedItem as { usd: number }).usd} · ${(selectedItem as { iqd: number }).iqd.toLocaleString()} IQD`}
                    </p>
                    {effectiveOrderType === "plan" && (
                      <p className="text-[11px] text-violet-300 mt-1">{selectedPlanBilling!.periodText} • Total due now: ${selectedPlanBilling!.usd.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {liveMethods.map((m) => (
                  <PaymentMethodCard key={m.id} method={m} selected={selectedMethod === m.id} onSelect={() => setSelectedMethod(m.id)} />
                ))}
              </div>

              <TransferInstructions method={method} orderId={orderId} orderLabel={orderLabel} whatsappNumber={liveWhatsApp} />

              <ProofUpload file={proofFile} onFile={(f) => { setProofFile(f); setProofError(""); }} onClear={() => setProofFile(null)} />
              {proofError && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{proofError}</p>}

              {/* Compliance */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-2 text-xs text-slate-500">
                <p>⚠ Credits are added after payment verification.</p>
                <p>⚠ Completed AI generations are non-refundable except in cases of verified technical errors.</p>
              </div>

              {/* Confirm */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div onClick={() => { setConfirmed((p) => !p); setConfirmError(""); }}
                  className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200
                    ${confirmed ? "bg-violet-600 border-violet-600" : "border-slate-600 group-hover:border-violet-500/60"}`}>
                  {confirmed && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm text-slate-300">I confirm I have made the transfer and the proof above is correct.</span>
              </label>
              {confirmError && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{confirmError}</p>}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-2xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors">← Back</button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-[4] py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-violet-500/25">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting…</>
                    : <>Submit for Verification <ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && status !== "idle" && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <VerificationStatus status={status} rejectionReason={rejectionReason} onResubmit={handleResubmit} onNew={handleNew} />
              {/* Demo toggle */}
              <div className="mt-6 flex gap-2 flex-wrap justify-center opacity-30 hover:opacity-100 transition-opacity">
                <span className="text-xs text-slate-600">Demo status:</span>
                {(["pending", "approved", "rejected"] as Status[]).map((s) => (
                  <button key={s} onClick={() => setStatus(s)} className={`text-xs px-2.5 py-1 rounded-lg border ${status === s ? "border-violet-500 text-violet-400 bg-violet-500/10" : "border-slate-700 text-slate-500"}`}>{s}</button>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

