"use client";

import { motion, type Variants } from "framer-motion";
import { useCallback, useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { useLanguage } from "@/lib/use-language";
import {
  Settings,
  User,
  Bell,
  Shield,
  CreditCard,
  Zap,
  Globe,
  Lock,
  Trash2,
  Check,
  Crown,
  Rocket,
  Star,
  Eye,
  EyeOff,
  Save,
  Loader2,
} from "lucide-react";

function useSettingsTranslation() {
  const { lang, changeLanguage } = useLanguage();
  const dict: Record<string, Record<string, string>> = {
    en: {},
    ar: {
      // Page titles
      "Settings": "الإعدادات",
      "Manage your account, security, and preferences.": "إدارة حسابك والأمان والتفضيلات.",
      
      // Sections
      "Subscription": "الاشتراك",
      "Profile Information": "بيانات الحساب",
      "Security": "الأمان",
      "Notifications": "الإشعارات",
      "Appearance & Language": "المظهر واللغة",
      "Danger Zone": "منطقة الخطر",
      
      // Subscription
      "Free Plan": "الخطة المجانية",
      "Starter Plan": "خطة المبتدئ",
      "Pro Plan": "خطة برو",
      "Max Plan": "خطة ماكس",
      "Plan": "خطة",
      "Next billing:": "الفوترة القادمة:",
      "No active billing cycle": "لا توجد دورة فوترة نشطة",
      "Upgrade Plan": "ترقية الخطة",
      "Buy Credits": "شراء النقاط",
      "Credits": "النقاط",
      
      // Early credits request
      "Early monthly credits": "نقاط شهرية مبكرة",
      "deductionMessage": "سيتم خصم {num} نقاط من تجديدك القادم.",
      "requestMessage": "طلب {num} نقاط من تجديدك السنوي القادم.",
      "Database setup is required before early credits can be requested.": "مطلب إعداد قاعدة البيانات قبل طلب النقاط المبكرة.",
      "Already requested": "تم الطلب بالفعل",
      "Setup required": "مطلب الإعداد",
      "Unavailable": "غير متوفر",
      "Requesting...": "جاري الطلب...",
      "Request early credits": "طلب نقاط مبكرة",
      "Early credits added. They will be deducted from your next annual refresh.": "تم إضافة النقاط المبكرة. سيتم خصمها من التحديث السنوي القادم.",
      
      // Profile Info
      "Display Name": "الاسم المستعار",
      "Email Address": "البريد الإلكتروني",
      "Phone Number": "رقم الهاتف",
      "Saving...": "جاري الحفظ...",
      "Saved!": "تم الحفظ!",
      "Save Changes": "حفظ التغييرات",
      
      // Security
      "Current Password": "كلمة المرور الحالية",
      "New Password": "كلمة المرور الجديدة",
      "Confirm New Password": "تأكيد كلمة المرور الجديدة",
      "Enter current password": "أدخل كلمة المرور الحالية",
      "Enter new password": "أدخل كلمة المرور الجديدة",
      "Confirm new password": "تأكيد كلمة المرور الجديدة",
      "Updating...": "جاري التحديث...",
      "Password Updated": "تم تحديث كلمة المرور",
      "Update Password": "تحديث كلمة المرور",
      "Reset Password Flow": "إعادة تعيين كلمة المرور",
      
      // Password validations
      "All password fields are required.": "جميع حقول كلمة المرور مطلوبة.",
      "New password must be at least 8 characters.": "يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.",
      "New password and confirmation do not match.": "كلمة المرور الجديدة والتأكيد غير متطابقين.",
      "New password must be different from current password.": "يجب أن تكون كلمة المرور الجديدة مختلفة عن كلمة المرور الحالية.",
      "Password update is unavailable for this login method. Use Forgot password from login.": "تحديث كلمة المرور غير متوفر لطريقة تسجيل الدخول هذه. استخدم نسيت كلمة المرور من صفحة الدخول.",
      
      // Notifications
      "Email Receipts": "إيصالات البريد الإلكتروني",
      "Receive email confirmation for every payment.": "تلقي تأكيد بريد إلكتروني لكل عملية دفع.",
      "Credit Alerts": "تنبيهات النقاط",
      "Get notified when your credits are running low.": "الحصول على تنبيه عندما تكون نقاطك منخفضة.",
      "Payment Status": "حالة الدفع",
      "Notify me when payment is approved or rejected.": "إعلامي عندما يتم قبول الدفع أو رفضه.",
      "Product Updates": "تحديثات المنتجات",
      "New AI models, features, and announcements.": "نماذج الذكاء الاصطناعي الجديدة والميزات والإعلانات.",
      "Weekly Digest": "الملخص الأسبوعي",
      "A summary of your usage every week.": "ملخص استخدامك كل أسبوع.",
      
      // Appearance & Language
      "Dark Mode": "الوضع الداكن",
      "Recommended for AI studio work.": "موصى به للعمل في استوديو الذكاء الاصطناعي.",
      "Interface Language": "لغة الواجهة",
      "English": "الإنجليزية",
      "Arabic": "العربية",
      
      // Danger zone
      "Deleting your account is permanent. All your data, credits, and history will be lost.": "حذف حسابك نهائي. ستفقد كل بياناتك ونقاطك وسجل أعمالك.",
      "Delete My Account": "حذف حسابي",
      "Delete account permanently? This action cannot be undone.": "حذف الحساب بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.",
      
      // General errors
      "Failed to save preferences.": "فشل حفظ التفضيلات.",
      "Failed to request early credits.": "فشل طلب النقاط المبكرة.",
      "Failed to save profile.": "فشل حفظ الملف الشخصي.",
      "Failed to delete account.": "فشل حذف الحساب.",
      "Failed to update password.": "فشل تحديث كلمة المرور.",
      "Failed to load settings.": "فشل تحميل الإعدادات.",
      "Failed to save notification preferences.": "فشل حفظ تفضيلات الإشعارات.",
      
      // Plan Names
      "Free": "مجاني",
      "Starter": "مبتدئ",
      "Plus": "بلاس",
      "Pro": "برو",
      "Max": "ماكس"
    }
  };
  const t = (key: string): string => {
    return dict[lang]?.[key] ?? key;
  };
  return { t, lang, changeLanguage };
}

type SettingsApiResponse = {
  profile: {
    name: string;
    email: string;
    phone: string | null;
  };
  subscription: {
    plan: "Free" | "Starter" | "Pro" | "Max" | string;
    planId?: string | null;
    active?: boolean;
    billingInterval?: string | null;
    nextBillingAt: string | null;
  };
  credits: number;
  notifications?: Pick<
    PreferenceState,
    "emailReceipts" | "creditAlerts" | "paymentConfirm" | "productUpdates" | "weeklyDigest"
  >;
  creditAdvance?: {
    balance: number;
    requestedAt: string | null;
    cycleEnd: string | null;
    available: boolean;
    amount: number;
    needsMigration?: boolean;
  };
};

type PreferenceState = {
  emailReceipts: boolean;
  creditAlerts: boolean;
  paymentConfirm: boolean;
  productUpdates: boolean;
  weeklyDigest: boolean;
  darkMode: boolean;
  language: "en" | "ar";
};

const DEFAULT_PREFS: PreferenceState = {
  emailReceipts: true,
  creditAlerts: true,
  paymentConfirm: true,
  productUpdates: false,
  weeklyDigest: false,
  darkMode: true,
  language: "en",
};

const PLAN_ICONS = {
  Free: Star,
  Starter: Rocket,
  Pro: Crown,
  Max: Crown,
} as const;

const PLAN_COLORS = {
  Free: "text-slate-400",
  Starter: "text-violet-400",
  Pro: "text-blue-400",
  Max: "text-amber-400",
} as const;

const PLAN_BG = {
  Free: "bg-slate-500/10 border-slate-500/30",
  Starter: "bg-violet-500/10 border-violet-500/30",
  Pro: "bg-blue-500/10 border-blue-500/30",
  Max: "bg-amber-500/10 border-amber-500/30",
} as const;

const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <motion.div variants={slideUp} className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800 bg-slate-800/30">
        <Icon className="w-4 h-4 text-violet-400" />
        <h2 className="text-sm font-bold text-slate-200">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </motion.div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={isPassword && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-violet-500/60 text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function Toggle({
  enabled,
  onToggle,
  label,
  description,
  disabled = false,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${enabled ? "bg-violet-600" : "bg-slate-700"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${enabled ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { t, lang, changeLanguage } = useSettingsTranslation();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const [loading, setLoading] = useState(true);
  const [settingsError, setSettingsError] = useState("");
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [plan, setPlan] = useState<"Free" | "Starter" | "Pro" | "Max">("Free");
  const [nextBilling, setNextBilling] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [billingInterval, setBillingInterval] = useState<string | null>(null);
  const [creditAdvance, setCreditAdvance] = useState<SettingsApiResponse["creditAdvance"] | null>(null);
  const [advanceBusy, setAdvanceBusy] = useState(false);
  const [advanceMessage, setAdvanceMessage] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [prefs, setPrefs] = useState<PreferenceState>(DEFAULT_PREFS);

  const applyThemeMode = useCallback((darkEnabled: boolean) => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("saad-light", !darkEnabled);
    document.documentElement.setAttribute("data-theme", darkEnabled ? "dark" : "light");
  }, []);
  const applyLanguage = useCallback((language: "en" | "ar") => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("lang", language);
    document.documentElement.setAttribute("dir", language === "ar" ? "rtl" : "ltr");
  }, []);

  const normalizedPlan = useMemo(() => {
    if (plan === "Starter" || plan === "Pro" || plan === "Max" || plan === "Free") return plan;
    return "Free";
  }, [plan]);

  const PlanIcon = PLAN_ICONS[normalizedPlan];
  const planColor = PLAN_COLORS[normalizedPlan];
  const planBg = PLAN_BG[normalizedPlan];

  const savePreferencesToClerk = useCallback(
    async (nextPrefs: PreferenceState) => {
      if (!user) return;
      setSavingPrefs(true);
      try {
        const notifications = {
          emailReceipts: nextPrefs.emailReceipts,
          creditAlerts: nextPrefs.creditAlerts,
          paymentConfirm: nextPrefs.paymentConfirm,
          productUpdates: nextPrefs.productUpdates,
          weeklyDigest: nextPrefs.weeklyDigest,
        };
        const response = await fetch("/api/profile/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notifications }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || t("Failed to save notification preferences."));
        }

        const unsafe = (user.unsafeMetadata ?? {}) as Record<string, unknown>;
        await user.update({
          unsafeMetadata: {
            ...unsafe,
            settingsPrefs: nextPrefs,
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : t("Failed to save preferences.");
        setSettingsError(msg);
      } finally {
        setSavingPrefs(false);
      }
    },
    [user],
  );

  useEffect(() => {
    try {
      const storedDark = window.localStorage.getItem("saad_dark_mode");
      if (storedDark === "0" || storedDark === "1") {
        const darkMode = storedDark === "1";
        setPrefs((prev) => ({ ...prev, darkMode }));
        applyThemeMode(darkMode);
      }
      const storedLanguage = window.localStorage.getItem("saad_language");
      if (storedLanguage === "en" || storedLanguage === "ar") {
        setPrefs((prev) => ({ ...prev, language: storedLanguage }));
        applyLanguage(storedLanguage);
      }
    } catch {
      // ignore localStorage read issues
    }
  }, [applyLanguage, applyThemeMode]);

  useEffect(() => {
    if (!isLoaded || !user) return;

    let disposed = false;
    const load = async () => {
      setLoading(true);
      setSettingsError("");
      try {
        const res = await fetch("/api/profile/settings", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as SettingsApiResponse & { error?: string };
        if (!res.ok) throw new Error(data.error || t("Failed to load settings."));
        if (disposed) return;

        setName(data.profile?.name || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || "");
        setEmail(data.profile?.email || user.emailAddresses[0]?.emailAddress || "");
        setPhone(data.profile?.phone || "");
        setPlan((data.subscription?.plan as "Free" | "Starter" | "Pro" | "Max") || "Free");
        setNextBilling(data.subscription?.nextBillingAt ?? null);
        setCredits(Math.max(0, Math.floor(data.credits ?? 0)));
        setSubscriptionActive(Boolean(data.subscription?.active));
        setBillingInterval(data.subscription?.billingInterval ?? null);
        setCreditAdvance(data.creditAdvance ?? null);

        const stored = ((user.unsafeMetadata ?? {}) as Record<string, unknown>).settingsPrefs as Partial<PreferenceState> | undefined;
        setPrefs({
          ...DEFAULT_PREFS,
          ...stored,
          ...data.notifications,
        });
      } catch (e) {
        if (!disposed) {
          const msg = e instanceof Error ? e.message : "Failed to load settings.";
          setSettingsError(msg);
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    load();
    return () => {
      disposed = true;
    };
  }, [isLoaded, user]);

  const reloadSettings = useCallback(async () => {
    if (!user) return;
    const res = await fetch("/api/profile/settings", { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as SettingsApiResponse & { error?: string };
    if (!res.ok) throw new Error(data.error || t("Failed to load settings."));

    setPlan((data.subscription?.plan as "Free" | "Starter" | "Pro" | "Max") || "Free");
    setNextBilling(data.subscription?.nextBillingAt ?? null);
    setCredits(Math.max(0, Math.floor(data.credits ?? 0)));
    setSubscriptionActive(Boolean(data.subscription?.active));
    setBillingInterval(data.subscription?.billingInterval ?? null);
    setCreditAdvance(data.creditAdvance ?? null);
  }, [user]);

  useEffect(() => {
    applyThemeMode(prefs.darkMode);
    try {
      window.localStorage.setItem("saad_dark_mode", prefs.darkMode ? "1" : "0");
    } catch {
      // ignore localStorage write issues
    }
  }, [prefs.darkMode, applyThemeMode]);
  useEffect(() => {
    try {
      window.localStorage.setItem("saad_language", prefs.language);
    } catch {
      // ignore localStorage write issues
    }
    applyLanguage(prefs.language);
  }, [prefs.language, applyLanguage]);

  const handleUpgrade = async () => {
    try {
      const res = await fetch("/api/stripe", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (typeof data?.url === "string") {
        window.location.href = data.url;
        return;
      }
      window.location.href = "/pricing";
    } catch {
      window.location.href = "/pricing";
    }
  };

  const handleCreditAdvance = async () => {
    if (!creditAdvance?.available || advanceBusy) return;
    setAdvanceBusy(true);
    setAdvanceMessage("");
    setSettingsError("");
    try {
      const res = await fetch("/api/credits/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: creditAdvance.amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Credit advance is not available.");
      }
      setAdvanceMessage(t("Early credits added. They will be deducted from your next annual refresh."));
      await reloadSettings();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("Failed to request early credits.");
      setSettingsError(msg);
    } finally {
      setAdvanceBusy(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileSaved(false);
    setSettingsError("");
    try {
      const res = await fetch("/api/profile/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t("Failed to save profile."));
      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("Failed to save profile.");
      setSettingsError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const ok = window.confirm(t("Delete account permanently? This action cannot be undone."));
    if (!ok) return;
    setDeleteBusy(true);
    setSettingsError("");
    try {
      const res = await fetch("/api/profile/settings", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string })?.error || t("Failed to delete account."));
      }
      await signOut({ redirectUrl: "/" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("Failed to delete account.");
      setSettingsError(msg);
      setDeleteBusy(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!user) return;
    setPasswordError("");
    setPasswordSaved(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t("All password fields are required."));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(t("New password must be at least 8 characters."));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("New password and confirmation do not match."));
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError(t("New password must be different from current password."));
      return;
    }

    setPasswordBusy(true);
    try {
      const userWithPasswordApi = user as unknown as {
        updatePassword?: (payload: { currentPassword: string; newPassword: string }) => Promise<unknown>;
      };

      if (typeof userWithPasswordApi.updatePassword !== "function") {
        setPasswordError(t("Password update is unavailable for this login method. Use Forgot password from login."));
        return;
      }

      await userWithPasswordApi.updatePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
      window.setTimeout(() => setPasswordSaved(false), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("Failed to update password.");
      setPasswordError(msg);
    } finally {
      setPasswordBusy(false);
    }
  };

  const updatePrefs = (partial: Partial<PreferenceState>) => {
    const next = { ...prefs, ...partial };
    setPrefs(next);
    void savePreferencesToClerk(next);
  };

  const showCreditAdvancePanel = subscriptionActive && billingInterval === "annual";
  const canRequestCreditAdvance = Boolean(showCreditAdvancePanel && creditAdvance?.available && creditAdvance.amount > 0);
  const creditAdvanceButtonLabel = advanceBusy
    ? t("Requesting...")
    : canRequestCreditAdvance
      ? t("Request early credits")
      : creditAdvance?.needsMigration
        ? t("Setup required")
        : creditAdvance?.balance
          ? t("Already requested")
          : t("Unavailable");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-20 left-1/3 h-[400px] w-[400px] rounded-full bg-violet-900/10 blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-900/10 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
              <Settings className="w-4 h-4 text-violet-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{t("Settings")}</h1>
          </div>
          <p className="text-sm text-slate-500 ml-12">{t("Manage your account, security, and preferences.")}</p>
        </motion.div>

        {settingsError && (
          <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
            {settingsError}
          </div>
        )}

        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
          <SectionCard title={t("Subscription")} icon={Zap}>
            <div className={`flex items-center justify-between p-4 rounded-xl border ${planBg}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${planBg}`}>
                  <PlanIcon className={`w-5 h-5 ${planColor}`} />
                </div>
                <div>
                  <p className="font-bold text-white">{t(normalizedPlan)} {t("Plan")}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {nextBilling
                      ? t("Next billing:") + " " + new Date(nextBilling).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "long", day: "numeric", year: "numeric" })
                      : t("No active billing cycle")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-0.5">{t("Credits")}</p>
                <p className="font-extrabold text-white">{credits.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleUpgrade}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors"
              >
                <Zap className="w-4 h-4" /> {t("Upgrade Plan")}
              </button>
              <Link href="/pricing" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-colors">
                <CreditCard className="w-4 h-4" /> {t("Buy Credits")}
              </Link>
            </div>
            {showCreditAdvancePanel && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-amber-100">{t("Early monthly credits")}</p>
                    <p className="mt-0.5 text-xs text-amber-100/70">
                      {creditAdvance?.balance
                        ? t("deductionMessage").replace("{num}", creditAdvance.balance.toLocaleString())
                        : t("requestMessage").replace("{num}", (creditAdvance?.amount.toLocaleString() ?? "0"))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreditAdvance}
                    disabled={!canRequestCreditAdvance || advanceBusy}
                    className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                  >
                    {advanceBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {creditAdvanceButtonLabel}
                  </button>
                </div>
                {creditAdvance?.needsMigration && (
                  <p className="mt-2 text-xs text-amber-100/80">{t("Database setup is required before early credits can be requested.")}</p>
                )}
                {advanceMessage && <p className="mt-2 text-xs text-amber-100/80">{advanceMessage}</p>}
              </div>
            )}
          </SectionCard>

          <SectionCard title={t("Profile Information")} icon={User}>
            <InputField label={t("Display Name")} value={name} onChange={setName} placeholder="Your name" disabled={loading} />
            <InputField label={t("Email Address")} value={email} onChange={setEmail} type="email" placeholder="you@example.com" disabled={loading} />
            <InputField label={t("Phone Number")} value={phone} onChange={setPhone} placeholder="+964 7XX XXX XXXX" disabled={loading} />
            <button
              onClick={handleSaveProfile}
              disabled={loading || savingProfile}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold transition-all duration-200"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> t("Saving...")
                </>
              ) : profileSaved ? (
                <>
                  <Check className="w-4 h-4" /> t("Saved!")
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> t("Save Changes")
                </>
              )}
            </button>
          </SectionCard>

          <SectionCard title={t("Security")} icon={Shield}>
            <InputField
              label={t("Current Password")}
              value={currentPassword}
              onChange={setCurrentPassword}
              type="password"
              placeholder={t("Enter current password")}
              disabled={passwordBusy}
            />
            <InputField
              label={t("New Password")}
              value={newPassword}
              onChange={setNewPassword}
              type="password"
              placeholder={t("Enter new password")}
              disabled={passwordBusy}
            />
            <InputField
              label={t("Confirm New Password")}
              value={confirmPassword}
              onChange={setConfirmPassword}
              type="password"
              placeholder={t("Confirm new password")}
              disabled={passwordBusy}
            />
            {passwordError && <p className="text-xs text-rose-400">{passwordError}</p>}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleUpdatePassword}
                disabled={passwordBusy}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold transition-all duration-200"
              >
                {passwordBusy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> t("Updating...")
                  </>
                ) : passwordSaved ? (
                  <>
                    <Check className="w-4 h-4" /> t("Password Updated")
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> t("Update Password")
                  </>
                )}
              </button>
              <Link
                href="/?auth=login"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-colors"
              >
                <Shield className="w-4 h-4" /> {t("Reset Password Flow")}
              </Link>
            </div>
          </SectionCard>

          <SectionCard title={t("Notifications")} icon={Bell}>
            <Toggle
              enabled={prefs.emailReceipts}
              onToggle={() => updatePrefs({ emailReceipts: !prefs.emailReceipts })}
              label={t("Email Receipts")}
              description={t("Receive email confirmation for every payment.")}
              disabled={savingPrefs}
            />
            <Toggle
              enabled={prefs.creditAlerts}
              onToggle={() => updatePrefs({ creditAlerts: !prefs.creditAlerts })}
              label={t("Credit Alerts")}
              description={t("Get notified when your credits are running low.")}
              disabled={savingPrefs}
            />
            <Toggle
              enabled={prefs.paymentConfirm}
              onToggle={() => updatePrefs({ paymentConfirm: !prefs.paymentConfirm })}
              label={t("Payment Status")}
              description={t("Notify me when payment is approved or rejected.")}
              disabled={savingPrefs}
            />
            <Toggle
              enabled={prefs.productUpdates}
              onToggle={() => updatePrefs({ productUpdates: !prefs.productUpdates })}
              label={t("Product Updates")}
              description={t("New AI models, features, and announcements.")}
              disabled={savingPrefs}
            />
            <Toggle
              enabled={prefs.weeklyDigest}
              onToggle={() => updatePrefs({ weeklyDigest: !prefs.weeklyDigest })}
              label={t("Weekly Digest")}
              description={t("A summary of your usage every week.")}
              disabled={savingPrefs}
            />
          </SectionCard>

          <SectionCard title={t("Appearance & Language")} icon={Globe}>
            <Toggle
              enabled={prefs.darkMode}
              onToggle={() => updatePrefs({ darkMode: !prefs.darkMode })}
              label={t("Dark Mode")}
              description={t("Recommended for AI studio work.")}
              disabled={savingPrefs}
            />
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t("Interface Language")}</label>
              <select
                value={prefs.language}
                onChange={(e) => {
                  const nextLang = e.target.value as "en" | "ar";
                  updatePrefs({ language: nextLang });
                  changeLanguage(nextLang);
                }}
                disabled={savingPrefs}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-violet-500/60 text-sm text-slate-100 outline-none transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="en">{t("English")}</option>
                <option value="ar">{t("Arabic")}</option>
              </select>
            </div>
          </SectionCard>

          <SectionCard title={t("Danger Zone")} icon={Trash2}>
            <p className="text-sm text-slate-400">{t("Deleting your account is permanent. All your data, credits, and history will be lost.")}</p>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteBusy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {deleteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} {t("Delete My Account")}
            </button>
          </SectionCard>
        </motion.div>
      </div>
    </div>
  );
}
