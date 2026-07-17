"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Suspense, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Zap, ChevronRight, Upload, X, CheckCircle2, Clock,
  XCircle, AlertCircle, Copy, Check,
  Star, Rocket, Crown, Sparkles, FileText, RefreshCw,
  MessageCircle, CreditCard,
} from "lucide-react";
import { useCmsData } from "@/lib/use-cms-data";
import { useLanguage } from "@/lib/use-language";

/* ─── CMS types (shared with pricing CMS) ─── */
interface CmsPlan { _id: string; id: string; monthlyPrice: number; annualDiscount: number; credits: string; creditsNum: number; badge: string; }
interface CmsTopup { _id: string; credits: string; creditsNum: number; usd: number; price: string; pricePerCredit: string; popular: boolean; }
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
  { id: "try",     label: "Try",     usd: 5,  credits: 70,   Icon: Zap, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/40" },
  { id: "starter", label: "Starter", usd: 15, credits: 300,  Icon: Rocket, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/40" },
  { id: "plus",    label: "Plus",    usd: 35, credits: 800,  Icon: Sparkles, color: "text-slate-300", bg: "bg-slate-500/10", border: "border-slate-500/40" },
  { id: "pro",     label: "Pro",     usd: 70, credits: 1800, Icon: Star,   color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/40"   },
  { id: "max",     label: "Max",     usd: 99, credits: 2700, Icon: Crown,  color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/40"  },
  { id: "podcast", label: "Podcast Automation", usd: 3, credits: 0, Icon: CreditCard, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/40" },
];

const TOPUPS = [
  { id: "t75",  credits: 75,  usd: 5  },
  { id: "t160", credits: 160, usd: 10 },
  { id: "t250", credits: 250, usd: 15 },
  { id: "t330", credits: 330, usd: 20 },
  { id: "t500", credits: 500, usd: 30 },
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
  try: 0,
  starter: 0,
  plus: 10,
  pro: 12,
  max: 15,
};

function generateOrderId() {
  return "SS-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 5).toUpperCase();
}

function cleanPaymentOrderId(input: string | null | undefined) {
  return String(input ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

// ─── StepBar ─────────────────────────────────────────────────────────────────

function usePaymentTranslation() {
  const { lang } = useLanguage();
  const dict: Record<string, Record<string, string>> = {
    en: {},
    ar: {
      // Step Bar
      "Select Order": "تحديد الطلب",
      "Payment": "الدفع",
      "Status": "الحالة",
      
      // Hero
      "Payment Verification": "تأكيد الدفع",
      "Please complete your payment and upload proof of transfer for approval.": "يرجى إكمال عملية الدفع ورفع إثبات التحويل للموافقة عليه.",
      
      // Step 1
      "What would you like to purchase?": "ماذا ترغب في الشراء؟",
      "Subscription Plan": "خطة اشتراك",
      "Credit Top-up": "شحن نقاط",
      "Monthly credit bundle": "حزمة نقاط شهرية",
      "One-time credit refill": "شحن نقاط لمرة واحدة",
      
      // Plan levels
      "Try": "تجريبي",
      "Starter": "مبتدئ",
      "Plus": "بلاس",
      "Pro": "برو",
      "Max": "ماكس",
      "Podcast Automation": "أتمتة البودكاست",
      "Unlimited access": "وصول غير محدود",
      "credits / mo": "نقطة / شهر",
      
      // Actions
      "Continue": "متابعة",
      "← Back": "← رجوع",
      "Submit for Verification": "إرسال للتحقق",
      "Submitting...": "جاري الإرسال...",
      
      // Step 2 Review
      "Complete checkout": "إكمال الدفع",
      "Review your order and enter your card details": "راجع طلبك وأدخل تفاصيل البطاقة",
      "Plan": "خطة",
      "Credits": "نقاط",
      "Total due now:": "الإجمالي المستحق الآن:",
      
      // ZainCash Online Form
      "Card details": "تفاصيل البطاقة",
      "Email": "البريد الإلكتروني",
      "Card information": "معلومات البطاقة",
      "Cardholder name": "اسم صاحب البطاقة",
      "Country or region": "البلد أو المنطقة",
      "Iraq": "العراق",
      "Order": "الطلب",
      "Pay": "دفع",
      
      // Transfer Instructions
      "Transfer Instructions": "تعليمات التحويل",
      "Account / Number": "الحساب / الرقم",
      "Copied!": "تم النسخ!",
      "Copy": "نسخ",
      "Send Confirmation on WhatsApp": "إرسال التأكيد على واتساب",
      
      // Proof Upload
      "Drag and drop proof of transfer or click to browse": "اسحب وأفلت إثبات التحويل أو انقر للتصفح",
      "Supports PNG, JPG, or PDF up to 10 MB": "يدعم ملفات PNG أو JPG أو PDF حتى 10 ميجابايت",
      "File exceeds the 10 MB limit.": "الملف يتجاوز الحد الأقصى 10 ميجابايت.",
      "Only PNG, JPG, or PDF files are accepted.": "يتم قبول ملفات PNG أو JPG أو PDF فقط.",
      "Proof of Transfer": "إثبات التحويل",
      "Upload Transfer Receipt": "رفع إيصال التحويل",
      
      // Verification Status configs
      "Pending Verification": "قيد التحقق",
      "Your payment is under review. We typically verify within 1–4 hours during business hours.": "عملية الدفع الخاصة بك قيد المراجعة. نتحقق عادةً خلال 1-4 ساعات خلال ساعات العمل.",
      "Payment Approved!": "تمت الموافقة على الدفع!",
      "Your subscription is active. Credits are available in your wallet.": "اشتراكك نشط الآن. النقاط متوفرة في محفظتك.",
      "Payment Rejected": "تم رفض الدفع",
      "Reason:": "السبب:",
      "Resubmit": "إعادة الإرسال",
      "New Order": "طلب جديد",
      
      // Helpers
      "Contact on WhatsApp": "تواصل عبر واتساب",
      "Demo status:": "حالة العرض التجريبي:",
      "Order ID:": "رقم الطلب:",
      "pending": "قيد الانتظار",
      "approved": "مقبول",
      "rejected": "مرفوض",
      
      // Suffixes
      "/yr": " / سنوياً",
      "/mo": " / شهرياً",
      "annual": "سنوي",
      "monthly": "شهري",
      "Credits Top-up": "شحن نقاط إضافية",
      "off": "خصم"
    }
  };
  const t = (key: string): string => {
    return dict[lang]?.[key] ?? key;
  };
  return { t, lang };
}

const STEP_LABELS = ["Select Order", "Payment", "Status"];

function StepBar({ step }: { step: Step }) {
  const { t } = usePaymentTranslation();
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
              <span className={`text-[10px] font-medium whitespace-nowrap hidden sm:block ${active ? "text-violet-300" : done ? "text-emerald-400" : "text-slate-600"}`}>{t(label)}</span>
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
  const { t } = usePaymentTranslation();
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
          <p className="font-bold text-white text-base">{t(method.name)}</p>
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
  const { t, lang } = usePaymentTranslation();
  const [copiedAccount, setCopiedAccount] = useState(false);

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => { setter(true); setTimeout(() => setter(false), 2000); });
  };

  const waMsgText = lang === "ar"
    ? `مرحباً SAAD STUDIO،\nلقد قمت بالدفع عبر ${t(method.name)}.\nالخدمة: ${orderLabel}\nرقم الطلب: ${orderId}\nيرجى تأكيد الدفع الخاص بي. شكراً لكم!`
    : `Hello SAAD STUDIO,\nI made a payment via ${method.name}.\nService: ${orderLabel}\nOrder ID: ${orderId}\nPlease verify my payment. Thank you!`;
  const waMsg = encodeURIComponent(waMsgText);

  return (
    <div className="mt-5 p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-4">
      <p className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        <FileText className="w-4 h-4 text-violet-400" /> {t("Transfer Instructions")}
      </p>
      <div>
        <p className="text-xs text-slate-500 mb-1.5">{t("Account / Number")}</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono">{method.account}</code>
          <button onClick={() => copy(method.account, setCopiedAccount)} className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 flex items-center gap-1.5 transition-colors whitespace-nowrap">
            {copiedAccount ? <><Check className="w-3 h-3 text-emerald-400" />{t("Copied!")}</> : <><Copy className="w-3 h-3" />{t("Copy")}</>}
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
          {t("Send Confirmation on WhatsApp")}
        </a>
      </div>
    </div>
  );
}

// ─── ProofUpload ──────────────────────────────────────────────────────────────

function CardCheckoutForm({ orderId, amount }: { orderId: string; amount: number }) {
  const { t } = usePaymentTranslation();
  const [message, setMessage] = useState("");

  const handleCardSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("Card payment fields need the bank's official embedded gateway SDK before live charging can be enabled.");
  };

  return (
    <form onSubmit={handleCardSubmit} className="mt-5 p-5 rounded-2xl bg-slate-900/70 border border-slate-700 space-y-4">
      <p className="text-sm font-semibold text-white flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-violet-300" /> {t("Card details")}
      </p>
      <div className="grid gap-3">
        <label className="grid gap-1.5 text-xs font-semibold text-slate-300">
          {t("Email")}
          <input
            type="email"
            autoComplete="email"
            placeholder={t("you@example.com")}
            className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-violet-500"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-300">
          {t("Card information")}
          <input
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 1234 1234 1234"
            className="h-11 rounded-t-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-violet-500"
          />
          <div className="-mt-3 grid grid-cols-2">
            <input
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM / YY"
              className="h-11 rounded-bl-xl border border-r-0 border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-violet-500"
            />
            <input
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="CVC"
              className="h-11 rounded-br-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-violet-500"
            />
          </div>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-300">
          {t("Cardholder name")}
          <input
            autoComplete="cc-name"
            placeholder={t("Name on card")}
            className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-violet-500"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-300">
          {t("Country or region")}
          <select
            defaultValue="IQ"
            className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-violet-500"
          >
            <option value="IQ">{t("Iraq")}</option>
          </select>
        </label>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
        <span>{t("Order")}</span>
        <code className="font-mono text-slate-200">{orderId}</code>
      </div>
      {message && <p className="text-xs text-amber-300">{message}</p>}
      <button
        type="submit"
        className="w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400"
      >
        {t("Pay")} ${amount.toLocaleString()}
      </button>
    </form>
  );
}

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
  const { t } = usePaymentTranslation();
  const configs = {
    pending:  { Icon: Clock,         iconColor: "text-amber-400",   iconBg: "bg-amber-500/15",   title: "Pending Verification",   desc: "Your payment is under review. We typically verify within 1–4 hours during business hours.", border: "border-amber-500/30",   bg: "bg-amber-500/5"   },
    approved: { Icon: CheckCircle2,  iconColor: "text-emerald-400", iconBg: "bg-emerald-500/15", title: "Payment Approved!",       desc: "Your subscription is active. Credits are available in your wallet.",                      border: "border-emerald-500/30", bg: "bg-emerald-500/5" },
    rejected: { Icon: XCircle,       iconColor: "text-red-400",     iconBg: "bg-red-500/15",     title: "Payment Rejected",       desc: "",                                                                                       border: "border-red-500/30",     bg: "bg-red-500/5"     },
  };
  const c = configs[status];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border p-8 text-center ${c.bg} ${c.border}`}>
      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${c.iconBg} mb-4`}>
        <c.Icon className={`w-8 h-8 ${c.iconColor}`} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{t(c.title)}</h3>
      {c.desc && <p className="text-sm text-slate-400 max-w-sm mx-auto">{t(c.desc)}</p>}
      {status === "rejected" && (
        <div className="mt-4 p-4 rounded-xl bg-slate-800/60 border border-red-500/20 text-left">
          <p className="text-xs font-semibold text-red-400 mb-1">{t("Reason:")}</p>
          <p className="text-sm text-slate-300">{rejectionReason}</p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
        {status === "rejected" && (
          <button onClick={onResubmit} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
            <RefreshCw className="w-4 h-4" />{t("Resubmit")}
          </button>
        )}
        <button onClick={onNew} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-colors">
          <Zap className="w-4 h-4" />{t("New Order")}
        </button>
      </div>
    </motion.div>
  );
}

// ─── WhatsAppButton ───────────────────────────────────────────────────────────

function WhatsAppButton({ orderId, whatsappNumber }: { orderId: string; whatsappNumber: string }) {
  const { t, lang } = usePaymentTranslation();
  const msgText = lang === "ar"
    ? `مرحباً SAAD STUDIO، أحتاج إلى مساعدة بشأن عملية الدفع الخاصة بي. رقم الطلب: ${orderId || "غير متوفر"}`
    : `Hello SAAD STUDIO, I need help with my payment. Order ID: ${orderId || "N/A"}`;
  const msg = encodeURIComponent(msgText);
  return (
    <a href={`https://wa.me/${whatsappNumber}?text=${msg}`} target="_blank" rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20b85a] text-white text-sm font-bold shadow-2xl shadow-green-500/30 transition-all duration-200 hover:scale-105">
      <MessageCircle className="w-5 h-5" />
      {t("Contact on WhatsApp")}
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

function PaymentPageContent() {
  const { t, lang } = usePaymentTranslation();
  const searchParams = useSearchParams();
  const { data: cms } = useCmsData<PricingCmsData>("pricing");
  const [step, setStep]                     = useState<Step>(1);
  const [orderType, setOrderType]           = useState<OrderType>("plan");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedTopupId, setSelectedTopupId] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("zaincash");

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

  useEffect(() => {
    if (!liveMethods.length) return;
    if (!liveMethods.some((m) => m.id === selectedMethod)) {
      setSelectedMethod(liveMethods.find((m) => m.id === "zaincash")?.id ?? liveMethods[0].id);
    }
  }, [liveMethods, selectedMethod]);

  // Live plans from CMS (USD only — IQD removed)
  const ICON_MAP = useMemo<Record<string, typeof Rocket>>(() => ({ try: Zap, starter: Rocket, plus: Sparkles, pro: Star, max: Crown, podcast: CreditCard }), []);
  const STYLE_MAP_PLANS = useMemo<Record<string, { color: string; bg: string; border: string }>>(() => ({
    try:     { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/40" },
    starter: { color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/40" },
    plus:    { color: "text-slate-300",  bg: "bg-slate-500/10",  border: "border-slate-500/40" },
    pro:     { color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/40" },
    max:     { color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/40" },
    podcast: { color: "text-rose-400",   bg: "bg-rose-500/10",   border: "border-rose-500/40" },
  }), []);
  const defaultPlanStyle = useMemo(() => ({ color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/40" }), []);

  const livePlans = useMemo(() => {
    if (!cms?.plans?.length) return PLANS;
    return cms.plans.map((cp) => {
      const s = STYLE_MAP_PLANS[cp.id] ?? defaultPlanStyle;
      return {
        id: cp.id, label: cp.badge, usd: cp.monthlyPrice, credits: cp.creditsNum,
        Icon: ICON_MAP[cp.id] ?? Rocket, ...s,
      };
    });
  }, [ICON_MAP, STYLE_MAP_PLANS, cms?.plans, defaultPlanStyle]);

  const liveTopups = useMemo(() => {
    if (!cms?.topups?.length) return TOPUPS;
    return cms.topups.map((ct) => ({
      id: `t${ct.creditsNum}`, credits: ct.creditsNum, usd: ct.usd,
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

  const [status, setStatus]                 = useState<Status>("idle");
  const [rejectionReason]                   = useState("The transfer reference number could not be verified. Please resubmit with a clear screenshot.");
  const [orderId, setOrderId]               = useState("");

  const [proofFile, setProofFile]   = useState<File | null>(null);
  const [proofError, setProofError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading]       = useState(false);

  const syncOrderInUrl = useCallback((id: string) => {
    if (typeof window === "undefined") return;
    const safeId = cleanPaymentOrderId(id);
    if (!safeId) return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("order") === safeId) return;
      url.searchParams.set("order", safeId);
      window.history.replaceState(null, "", url.toString());
      window.localStorage.setItem("saad_last_payment_order", safeId);
    } catch {}
  }, []);

  useEffect(() => {
    syncOrderInUrl(orderId);
  }, [orderId, syncOrderInUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlOrder = cleanPaymentOrderId(searchParams.get("order") || searchParams.get("orderId"));
    const storedOrder = cleanPaymentOrderId(window.localStorage.getItem("saad_last_payment_order"));
    const nextId = urlOrder || storedOrder || generateOrderId();
    setOrderId(nextId);
  }, [searchParams]);

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
    const yearlyBaseUsd = monthlyUsd * 12;

    if (billingCycle === "annual" && discount > 0) {
      return {
        usd: Math.round(yearlyBaseUsd * (1 - discount / 100)),
        previousUsd: yearlyBaseUsd,
        suffix: t("/yr"),
        creditsText: plan.id === "podcast" ? t("Unlimited access") : `${plan.credits.toLocaleString()} ${t("credits / mo")}`,
        periodText: t("Billed yearly") + ` (${discount}% ${t("off")})`,
      };
    }
    return {
      usd: monthlyUsd,
      previousUsd: null,
      suffix: t("/mo"),
      creditsText: plan.id === "podcast" ? t("Unlimited access") : `${plan.credits.toLocaleString()} ${t("credits / mo")}`,
      periodText: t("Billed monthly"),
    };
  };

  const method      = liveMethods.find((m) => m.id === selectedMethod) ?? liveMethods[0];
  const isZainCashOnline = false;
  const lockedType: OrderType | null = incomingType === "topup" ? "topup" : incomingType === "plan" ? "plan" : null;
  const effectiveOrderType: OrderType = lockedType ?? orderType;
  const effectivePlanId =
    lockedType === "plan" && incomingPlanId && livePlans.some((p) => p.id === incomingPlanId)
      ? incomingPlanId
      : selectedPlanId;
  const effectiveTopupId =
    lockedType === "topup"
      ? (incomingTopupId || selectedTopupId)
      : selectedTopupId;
  const selectedItem =
    effectiveOrderType === "plan"
      ? livePlans.find((p) => p.id === effectivePlanId)
      : liveTopups.find((tp) => tp.id === effectiveTopupId);

  const selectedPlan = selectedItem && effectiveOrderType === "plan" ? (selectedItem as typeof livePlans[0]) : null;
  const selectedPlanBilling = selectedPlan ? resolvePlanBilling(selectedPlan) : null;

  const orderLabel =
    effectiveOrderType === "plan"
      ? `${t(selectedPlan?.label ?? "")} ${t("Plan")} — ${selectedPlanBilling?.creditsText ?? ""} (${selectedPlanBilling?.suffix === t("/yr") ? t("annual") : t("monthly")})`
      : `+${(selectedItem as typeof liveTopups[0])?.credits?.toLocaleString() ?? ""} ${t("Credits Top-up")}`;

  const goStep2 = () => {
    if (effectiveOrderType === "plan" && !effectivePlanId) return;
    if (effectiveOrderType === "topup" && !effectiveTopupId) return;
    setStep(2);
  };

  const handleSubmit = async () => {
    setSubmitError("");
    const safeOrderId = cleanPaymentOrderId(orderId);
    if (!safeOrderId) {
      const nextId = generateOrderId();
      setOrderId(nextId);
      setSubmitError("Order ID was refreshed. Please submit again.");
      return;
    }
    if (!selectedItem) {
      setSubmitError("Please select a plan or top-up.");
      return;
    }

    const amount =
      effectiveOrderType === "plan"
        ? Number(selectedPlanBilling?.usd ?? 0)
        : Number((selectedItem as typeof TOPUPS[number])?.usd ?? 0);
    const credits =
      effectiveOrderType === "plan"
        ? Number(selectedPlan?.credits ?? 0)
        : Number((selectedItem as typeof TOPUPS[number])?.credits ?? 0);

    const isPodcastPlan = effectiveOrderType === "plan" && effectivePlanId === "podcast";
    if (
      !Number.isFinite(amount) || amount <= 0 ||
      !Number.isFinite(credits) || (credits <= 0 && !isPodcastPlan)
    ) {
      setSubmitError("Invalid order amount. Please re-select your plan/top-up.");
      return;
    }

    if (!isZainCashOnline) {
      let hasError = false;
      if (!proofFile) { setProofError("Please upload your payment proof."); hasError = true; } else setProofError("");
      if (hasError) return;
    }

    setLoading(true);
    try {
      if (isZainCashOnline) {
        const zainRes = await fetch("/api/payments/zaincash/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: safeOrderId,
            order: safeOrderId,
            orderType: effectiveOrderType,
            planId: effectiveOrderType === "plan" ? effectivePlanId : null,
            planLabel: effectiveOrderType === "plan" ? (selectedPlan?.label ?? effectivePlanId ?? null) : null,
            billingCycle,
            topupId: effectiveOrderType === "topup" ? effectiveTopupId : null,
            amount,
            credits,
          }),
        });

        const payload = await zainRes.json().catch(() => ({}));
        if (!zainRes.ok || !payload?.url) {
          if (zainRes.status === 401) {
            const currentUrl = typeof window !== "undefined" ? window.location.href : "/payment";
            window.location.href = `/sign-in?redirect_url=${encodeURIComponent(currentUrl)}`;
            return;
          }
          throw new Error(payload?.error ?? `Failed to start payment (${zainRes.status})`);
        }

        setStatus("pending");
        setStep(3);
        window.location.href = payload.url;
        return;
      }

      const fd = new FormData();
      fd.append("file", proofFile!);
      fd.append("orderId", safeOrderId);
      fd.append("order", safeOrderId);

      const uploadRes = await fetch("/api/payments/upload-proof", {
        method: "POST",
        body: fd,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err?.error ?? `Proof upload failed (${uploadRes.status})`);
      }

      const uploaded = (await uploadRes.json()) as { proofUrl: string; proofFileName: string };
      const proofUrl = String(uploaded?.proofUrl ?? "").trim();
      const proofFileName = String(uploaded?.proofFileName ?? "").trim();
      if (!proofUrl) throw new Error("Payment proof upload failed");

      const reqRes = await fetch("/api/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: safeOrderId,
          order: safeOrderId,
          orderType: effectiveOrderType,
          planId: effectiveOrderType === "plan" ? effectivePlanId : null,
          planLabel: effectiveOrderType === "plan" ? (selectedPlan?.label ?? effectivePlanId ?? null) : null,
          billingCycle,
          topupId: effectiveOrderType === "topup" ? effectiveTopupId : null,
          methodId: method?.id ?? null,
          methodName: method?.name ?? null,
          amount,
          credits,
          proofFileName,
          proofUrl,
        }),
      });

      if (!reqRes.ok) {
        const err = await reqRes.json().catch(() => ({}));
        throw new Error(err?.error ?? `Failed to submit request (${reqRes.status})`);
      }

      setStatus("pending");
      setStep(3);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = () => { setStatus("idle"); setStep(2); setProofError(""); };
  const handleNew = () => {
    const nextId = generateOrderId();
    setOrderId(nextId);
    setStep(1); setStatus("idle"); setSelectedPlanId(""); setSelectedTopupId("");
    setSelectedMethod(liveMethods.find((m) => m.id === "zaincash")?.id ?? liveMethods[0]?.id ?? METHODS[0].id);
    setProofFile(null); setProofError("");
  };

  useEffect(() => {
    const safeOrderId = cleanPaymentOrderId(orderId);
    if (!safeOrderId) return;
    let cancelled = false;
    let intervalId: number | null = null;
    const run = async () => {
      try {
        const res = await fetch(`/api/payments/status?orderId=${encodeURIComponent(safeOrderId)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const s = String(data?.status ?? "");
        if (cancelled) return;
        if (s === "NOT_FOUND") {
          if (intervalId != null) window.clearInterval(intervalId);
          intervalId = null;
          return;
        }
        setStep(3);
        if (s === "COMPLETED") {
          setStatus("approved");
          if (intervalId != null) window.clearInterval(intervalId);
          intervalId = null;
        } else if (s === "FAILED") {
          setStatus("rejected");
          if (intervalId != null) window.clearInterval(intervalId);
          intervalId = null;
        } else if (s === "PENDING") {
          setStatus("pending");
        }
      } catch {}
    };
    void run();
    intervalId = window.setInterval(run, 8000);
    return () => {
      cancelled = true;
      if (intervalId != null) window.clearInterval(intervalId);
    };
    // Keep a short poll loop: stops automatically once status is COMPLETED/FAILED/NOT_FOUND
  }, [orderId]);

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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{t(livePaymentHero.heading)}</h1>
          <p className="text-sm text-slate-400 mt-1">{t(livePaymentHero.subtitle)}</p>
        </div>

        {/* Order ID */}
        <div className="flex items-center gap-2 mb-6 text-xs text-slate-600">
          <span className="font-medium text-slate-500">{t("Order ID:")}</span>
          <code className="text-slate-400 font-mono">{orderId}</code>
        </div>

        <StepBar step={step} />

        <AnimatePresence mode="wait">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
              <h2 className="text-lg font-bold text-white">{t("What would you like to purchase?")}</h2>

              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-3">
                {(["plan", "topup"] as OrderType[]).map((ot) => (
                  <button key={ot} onClick={() => { setOrderType(ot); setSelectedPlanId(""); setSelectedTopupId(""); }}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200
                      ${orderType === ot ? "border-violet-500 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.2)]" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${orderType === ot ? "bg-violet-500/20" : "bg-slate-800"}`}>
                      {ot === "plan" ? <Star className={`w-4 h-4 ${orderType === ot ? "text-violet-400" : "text-slate-500"}`} /> : <Zap className={`w-4 h-4 ${orderType === ot ? "text-violet-400" : "text-slate-500"}`} />}
                    </div>
                    <p className="font-bold text-sm text-white">{ot === "plan" ? t("Subscription Plan") : t("Credit Top-up")}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{ot === "plan" ? t("Monthly credit bundle") : t("One-time credit refill")}</p>
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
                        <p className="font-bold text-white">{t(p.label)}</p>
                        <p className="text-xs text-slate-500">{p.credits.toLocaleString()} {t("credits / mo")}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {billing.previousUsd ? (
                          <p className="text-[10px] text-slate-500 line-through">${billing.previousUsd.toLocaleString()}/yr</p>
                        ) : null}
                        <p className="font-extrabold text-white">${billing.usd}<span className="text-xs text-slate-500 font-normal">{billing.suffix}</span></p>
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
                      <p className="text-xs text-slate-500 mt-0.5">{t("credits")}</p>
                      <p className="text-base font-black text-white mt-1">${tp.usd}</p>
                    </button>
                  ))}
                </div>
              )}

              <button onClick={goStep2} disabled={orderType === "plan" ? !selectedPlanId : !selectedTopupId}
                className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-violet-500/25">
                {t("Continue")} <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">{t("Complete checkout")}</h2>
                <p className="text-sm text-slate-400 mt-1">{t("Review your order and enter your card details")}</p>
              </div>

              {/* Order summary */}
              {selectedItem && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
                  <Zap className="w-5 h-5 text-violet-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">
                      {effectiveOrderType === "plan"
                        ? `${t(selectedPlan!.label)} ${t("Plan")} — ${selectedPlanBilling!.creditsText}`
                        : `+${(selectedItem as typeof TOPUPS[0]).credits.toLocaleString()} ${t("Credits")}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {effectiveOrderType === "plan"
                        ? `${selectedPlanBilling!.previousUsd ? `~~$${selectedPlanBilling!.previousUsd.toLocaleString()}/yr~~ → ` : ""}$${selectedPlanBilling!.usd} ${selectedPlanBilling!.suffix}`
                        : `$${(selectedItem as { usd: number }).usd}`}
                    </p>
                    {effectiveOrderType === "plan" && (
                      <p className="text-[11px] text-violet-300 mt-1">{t(selectedPlanBilling!.periodText)} • {t("Total due now:")} ${selectedPlanBilling!.usd.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              )}

              {!isZainCashOnline && (
                <div className="space-y-3">
                  {liveMethods.map((m) => (
                    <PaymentMethodCard key={m.id} method={m} selected={selectedMethod === m.id} onSelect={() => setSelectedMethod(m.id)} />
                  ))}
                </div>
              )}

              {isZainCashOnline ? (
                <CardCheckoutForm
                  orderId={orderId}
                  amount={
                    effectiveOrderType === "plan"
                      ? Number(selectedPlanBilling?.usd ?? 0)
                      : Number((selectedItem as { usd?: number })?.usd ?? 0)
                  }
                />
              ) : (
                <>
                  <TransferInstructions method={method} orderId={orderId} orderLabel={orderLabel} whatsappNumber={liveWhatsApp} />
                  <ProofUpload file={proofFile} onFile={(f) => { setProofFile(f); setProofError(""); }} onClear={() => setProofFile(null)} />
                  {proofError && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{proofError}</p>}
                </>
              )}
              {submitError && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{submitError}</p>}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-2xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors">{t("← Back")}</button>
                {!isZainCashOnline && (
                  <button onClick={handleSubmit} disabled={loading}
                    className="flex-[4] py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-violet-500/25">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t("Submitting...")}</>
                      : <>{t("Submit for Verification")} <ChevronRight className="w-4 h-4" /></>}
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && status !== "idle" && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <VerificationStatus status={status} rejectionReason={rejectionReason} onResubmit={handleResubmit} onNew={handleNew} />
              {/* Demo toggle */}
              <div className="mt-6 flex gap-2 flex-wrap justify-center opacity-30 hover:opacity-100 transition-opacity">
                <span className="text-xs text-slate-600">{t("Demo status:")}</span>
                {(["pending", "approved", "rejected"] as Status[]).map((s) => (
                  <button key={s} onClick={() => setStatus(s)} className={`text-xs px-2.5 py-1 rounded-lg border ${status === s ? "border-violet-500 text-violet-400 bg-violet-500/10" : "border-slate-700 text-slate-500"}`}>{t(s)}</button>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <PaymentPageContent />
    </Suspense>
  );
}
