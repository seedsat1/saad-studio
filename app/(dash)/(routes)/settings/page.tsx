"use client";

import { motion, type Variants } from "framer-motion";
import { useCallback, useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
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

type SettingsApiResponse = {
  profile: {
    name: string;
    email: string;
    phone: string | null;
  };
  subscription: {
    plan: "Free" | "Starter" | "Pro" | "Max" | string;
    nextBillingAt: string | null;
  };
  credits: number;
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
  const { user, isLoaded } = useUser();
  const { openUserProfile, signOut } = useClerk();

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
        const unsafe = (user.unsafeMetadata ?? {}) as Record<string, unknown>;
        await user.update({
          unsafeMetadata: {
            ...unsafe,
            settingsPrefs: nextPrefs,
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to save preferences.";
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
        if (!res.ok) throw new Error(data.error || "Failed to load settings.");
        if (disposed) return;

        setName(data.profile?.name || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || "");
        setEmail(data.profile?.email || user.emailAddresses[0]?.emailAddress || "");
        setPhone(data.profile?.phone || "");
        setPlan((data.subscription?.plan as "Free" | "Starter" | "Pro" | "Max") || "Free");
        setNextBilling(data.subscription?.nextBillingAt ?? null);
        setCredits(Math.max(0, Math.floor(data.credits ?? 0)));

        const stored = ((user.unsafeMetadata ?? {}) as Record<string, unknown>).settingsPrefs as Partial<PreferenceState> | undefined;
        if (stored) {
          setPrefs({
            ...DEFAULT_PREFS,
            ...stored,
          });
        }
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

  useEffect(() => {
    applyThemeMode(prefs.darkMode);
    try {
      window.localStorage.setItem("saad_dark_mode", prefs.darkMode ? "1" : "0");
    } catch {
      // ignore localStorage write issues
    }
  }, [prefs.darkMode, applyThemeMode]);
  useEffect(() => {
    applyLanguage(prefs.language);
    try {
      window.localStorage.setItem("saad_language", prefs.language);
    } catch {
      // ignore localStorage write issues
    }
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
      if (!res.ok) throw new Error(data?.error || "Failed to save profile.");
      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save profile.";
      setSettingsError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const ok = window.confirm("Delete account permanently? This action cannot be undone.");
    if (!ok) return;
    setDeleteBusy(true);
    setSettingsError("");
    try {
      const res = await fetch("/api/profile/settings", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string })?.error || "Failed to delete account.");
      }
      await signOut({ redirectUrl: "/" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete account.";
      setSettingsError(msg);
      setDeleteBusy(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!user) return;
    setPasswordError("");
    setPasswordSaved(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("New password must be different from current password.");
      return;
    }

    setPasswordBusy(true);
    try {
      const userWithPasswordApi = user as unknown as {
        updatePassword?: (payload: { currentPassword: string; newPassword: string }) => Promise<unknown>;
      };

      if (typeof userWithPasswordApi.updatePassword !== "function") {
        setPasswordError("Password update API is unavailable here. Open security settings.");
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
      const msg = e instanceof Error ? e.message : "Failed to update password.";
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
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Settings</h1>
          </div>
          <p className="text-sm text-slate-500 ml-12">Manage your account, security, and preferences.</p>
        </motion.div>

        {settingsError && (
          <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
            {settingsError}
          </div>
        )}

        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
          <SectionCard title="Subscription" icon={Zap}>
            <div className={`flex items-center justify-between p-4 rounded-xl border ${planBg}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${planBg}`}>
                  <PlanIcon className={`w-5 h-5 ${planColor}`} />
                </div>
                <div>
                  <p className="font-bold text-white">{normalizedPlan} Plan</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {nextBilling
                      ? `Next billing: ${new Date(nextBilling).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                      : "No active billing cycle"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-0.5">Credits</p>
                <p className="font-extrabold text-white">{credits.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleUpgrade}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors"
              >
                <Zap className="w-4 h-4" /> Upgrade Plan
              </button>
              <Link href="/pricing" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-colors">
                <CreditCard className="w-4 h-4" /> Buy Credits
              </Link>
            </div>
          </SectionCard>

          <SectionCard title="Profile Information" icon={User}>
            <InputField label="Display Name" value={name} onChange={setName} placeholder="Your name" disabled={loading} />
            <InputField label="Email Address" value={email} onChange={setEmail} type="email" placeholder="you@example.com" disabled={loading} />
            <InputField label="Phone Number" value={phone} onChange={setPhone} placeholder="+964 7XX XXX XXXX" disabled={loading} />
            <button
              onClick={handleSaveProfile}
              disabled={loading || savingProfile}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold transition-all duration-200"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : profileSaved ? (
                <>
                  <Check className="w-4 h-4" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </button>
          </SectionCard>

          <SectionCard title="Security" icon={Shield}>
            <InputField
              label="Current Password"
              value={currentPassword}
              onChange={setCurrentPassword}
              type="password"
              placeholder="Enter current password"
              disabled={passwordBusy}
            />
            <InputField
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              type="password"
              placeholder="Enter new password"
              disabled={passwordBusy}
            />
            <InputField
              label="Confirm New Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              type="password"
              placeholder="Confirm new password"
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
                    <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                  </>
                ) : passwordSaved ? (
                  <>
                    <Check className="w-4 h-4" /> Password Updated
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Update Password
                  </>
                )}
              </button>
              <button
                onClick={() => openUserProfile()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-colors"
              >
                <Shield className="w-4 h-4" /> Open Security Settings
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Notifications" icon={Bell}>
            <Toggle
              enabled={prefs.emailReceipts}
              onToggle={() => updatePrefs({ emailReceipts: !prefs.emailReceipts })}
              label="Email Receipts"
              description="Receive email confirmation for every payment."
              disabled={savingPrefs}
            />
            <Toggle
              enabled={prefs.creditAlerts}
              onToggle={() => updatePrefs({ creditAlerts: !prefs.creditAlerts })}
              label="Credit Alerts"
              description="Get notified when your credits are running low."
              disabled={savingPrefs}
            />
            <Toggle
              enabled={prefs.paymentConfirm}
              onToggle={() => updatePrefs({ paymentConfirm: !prefs.paymentConfirm })}
              label="Payment Status"
              description="Notify me when payment is approved or rejected."
              disabled={savingPrefs}
            />
            <Toggle
              enabled={prefs.productUpdates}
              onToggle={() => updatePrefs({ productUpdates: !prefs.productUpdates })}
              label="Product Updates"
              description="New AI models, features, and announcements."
              disabled={savingPrefs}
            />
            <Toggle
              enabled={prefs.weeklyDigest}
              onToggle={() => updatePrefs({ weeklyDigest: !prefs.weeklyDigest })}
              label="Weekly Digest"
              description="A summary of your usage every week."
              disabled={savingPrefs}
            />
          </SectionCard>

          <SectionCard title="Appearance & Language" icon={Globe}>
            <Toggle
              enabled={prefs.darkMode}
              onToggle={() => updatePrefs({ darkMode: !prefs.darkMode })}
              label="Dark Mode"
              description="Recommended for AI studio work."
              disabled={savingPrefs}
            />
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Interface Language</label>
              <select
                value={prefs.language}
                onChange={(e) => updatePrefs({ language: e.target.value as "en" | "ar" })}
                disabled={savingPrefs}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-violet-500/60 text-sm text-slate-100 outline-none transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
          </SectionCard>

          <SectionCard title="Danger Zone" icon={Trash2}>
            <p className="text-sm text-slate-400">Deleting your account is permanent. All your data, credits, and history will be lost.</p>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteBusy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {deleteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete My Account
            </button>
          </SectionCard>
        </motion.div>
      </div>
    </div>
  );
}
