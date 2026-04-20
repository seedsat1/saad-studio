"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Star,
  Video,
  Image as ImageIcon,
  Mic,
} from "lucide-react";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useAuthModal } from "@/hooks/use-auth-modal";
import { useCmsData } from "@/lib/use-cms-data";

// ─── CMS TYPES ───────────────────────────────────────────────────────────────

interface AuthCmsData {
  promoSlides: { _id?: string; bgUrl: string; tag: string; headline: string; sub: string; cta: string; accent: string }[];
  stats: { _id?: string; icon: "video" | "image" | "mic"; label: string }[];
  branding: { badgeName: string; badgeLabel: string; rating: string; brandName: string };
  signup: { heading: string; subtitle: string; buttonText: string };
  login: { heading: string; subtitle: string; buttonText: string };
  footer: { signupToggle: string; loginToggle: string; termsText: string };
}

// ─── PROMO SLIDE DATA (defaults) ─────────────────────────────────────────────

const DEFAULT_PROMO_SLIDES = [
  {
    id: 1,
    bg: "https://images.unsplash.com/photo-1686191128892-3b37add4c844?w=900&q=90&auto=format&fit=crop",
    tag: "🎬 AI Video Generation",
    headline: "Unlock the Power of AI Generation",
    sub: "Sign up today and get 25 Free Credits to generate cinematic videos, photorealistic images, and immersive audio.",
    cta: "Start Free →",
    accent: "from-violet-600 to-purple-700",
  },
  {
    id: 2,
    bg: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=900&q=90&auto=format&fit=crop",
    tag: "🖼️ Flux & Seedance Models",
    headline: "Create Stunning Visuals in Seconds",
    sub: "Access 20+ cutting-edge AI models including GPT Image 1.5, FLUX.2, Imagen 4, Nano Banana Pro.",
    cta: "Explore Models →",
    accent: "from-blue-600 to-cyan-700",
  },
];

// ─── STAT CHIPS (defaults) ───────────────────────────────────────────────────
const DEFAULT_STATS = [
  { icon: ImageIcon, label: "20+ AI Models" },
  { icon: Video, label: "17 Video Engines" },
  { icon: Mic, label: "85+ Tools" },
];

const ICON_MAP: Record<string, React.ElementType> = { video: Video, image: ImageIcon, mic: Mic };

// ─── INPUT FIELD ─────────────────────────────────────────────────────────────
function InputField({
  id,
  type: inputType,
  placeholder,
  value,
  onChange,
  icon: Icon,
  autoComplete,
}: {
  id: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ElementType;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = inputType === "password";
  const resolvedType = isPassword ? (show ? "text" : "password") : inputType;

  return (
    <div className="relative group">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors pointer-events-none">
        <Icon className="w-4 h-4" />
      </div>
      <input
        id={id}
        type={resolvedType}
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-800/70 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
      />
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((p) => !p)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function AuthModal() {
  const { isOpen, view, onClose, setView } = useAuthModal();
  const router = useRouter();
  const { signIn, isLoaded: signInLoaded, setActive: setSignInActive } = useSignIn();
  const { signUp, isLoaded: signUpLoaded, setActive: setSignUpActive } = useSignUp();
  const { data: cms } = useCmsData<AuthCmsData>("auth");

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotStep, setForgotStep] = useState<"email" | "reset">("email");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const isSignup = view === "signup";
  const isForgot = view === "forgot";
  const isVerify = view === "verify";

  // Verification state (after signup)
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [formError, setFormError] = useState("");

  // CMS-aware data
  const PROMO_SLIDES = cms?.promoSlides?.length
    ? cms.promoSlides.map((s, i) => ({ id: i + 1, bg: s.bgUrl, tag: s.tag, headline: s.headline, sub: s.sub, cta: s.cta, accent: s.accent }))
    : DEFAULT_PROMO_SLIDES;

  const STATS = cms?.stats?.length
    ? cms.stats.map((s) => ({ icon: ICON_MAP[s.icon] || Video, label: s.label }))
    : DEFAULT_STATS;

  const brandBadgeName = cms?.branding?.badgeName ?? "Saad Studio AI";
  const brandBadgeLabel = cms?.branding?.badgeLabel ?? "PRO";
  const brandRating = cms?.branding?.rating ?? "AI Creative Studio";
  const brandName = cms?.branding?.brandName ?? "Saad Studio";
  const signupHeading = cms?.signup?.heading ?? "Create your account";
  const signupSubtitle = cms?.signup?.subtitle ?? "Start generating with 25 free credits — no card needed.";
  const signupButton = cms?.signup?.buttonText ?? "Create Account";
  const loginHeading = cms?.login?.heading ?? "Welcome back";
  const loginSubtitle = cms?.login?.subtitle ?? "Sign in to continue creating with AI.";
  const loginButton = cms?.login?.buttonText ?? "Login";
  const footerSignupToggle = cms?.footer?.signupToggle ?? "Already have an account?";
  const footerLoginToggle = cms?.footer?.loginToggle ?? "Don't have an account?";
  const footerTerms = cms?.footer?.termsText ?? "By continuing, you agree to our Terms and Privacy Policy";

  // Active promo slide
  const promo = PROMO_SLIDES[isSignup ? 0 : 1] ?? PROMO_SLIDES[0];

  const handleForgotSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInLoaded || !signIn) return;
    setLoading(true);
    setForgotError("");
    try {
      await signIn.create({ strategy: "reset_password_email_code", identifier: forgotEmail });
      setForgotStep("reset");
    } catch (err: unknown) {
      const msg = (err as { errors?: Array<{ message: string }> })?.errors?.[0]?.message ?? "Something went wrong";
      setForgotError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInLoaded || !signIn) return;
    setLoading(true);
    setForgotError("");
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: forgotCode,
        password: forgotNewPassword,
      });
      if (result.status === "complete") {
        setForgotSuccess(true);
        setTimeout(() => { onClose(); router.push("/explore"); }, 1500);
      }
    } catch (err: unknown) {
      const msg = (err as { errors?: Array<{ message: string }> })?.errors?.[0]?.message ?? "Invalid code or password";
      setForgotError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "oauth_google") => {
    try {
      setOauthLoading(provider);
      if (isSignup && signUp) {
        await signUp.authenticateWithRedirect({
          strategy: provider,
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/explore",
        });
      } else if (signIn) {
        await signIn.authenticateWithRedirect({
          strategy: provider,
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/explore",
        });
      }
    } catch {
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setLoading(true);
    try {
      if (isSignup) {
        if (!signUpLoaded || !signUp) return;
        const nameParts = name.trim().split(" ");
        const firstName = nameParts[0] ?? "";
        const lastName = nameParts.slice(1).join(" ") || undefined;
        const result = await signUp.create({
          emailAddress: email,
          password,
          firstName,
          lastName,
        });
        if (result.status === "complete") {
          await setSignUpActive!({ session: result.createdSessionId });
          onClose();
          router.push("/explore");
        } else {
          // Email verification required
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setView("verify");
        }
      } else {
        if (!signInLoaded || !signIn) return;
        const result = await signIn.create({
          identifier: email,
          password,
        });
        if (result.status === "complete") {
          await setSignInActive!({ session: result.createdSessionId });
          onClose();
          router.push("/explore");
        }
      }
    } catch (err: unknown) {
      const msg = (err as { errors?: Array<{ message: string }> })?.errors?.[0]?.message ?? "Something went wrong";
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpLoaded || !signUp) return;
    setVerifyError("");
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verifyCode });
      if (result.status === "complete") {
        await setSignUpActive!({ session: result.createdSessionId });
        onClose();
        router.push("/explore");
      }
    } catch (err: unknown) {
      const msg = (err as { errors?: Array<{ message: string }> })?.errors?.[0]?.message ?? "Invalid code";
      setVerifyError(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchView = () => {
    setView(isSignup ? "login" : "signup");
    setName("");
    setEmail("");
    setPassword("");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── BACKDROP ─────────────────────────────────────────────────── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            {/* ── MODAL ──────────────────────────────────────────────────── */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 grid md:grid-cols-2"
            >
              {/* ── CLOSE BUTTON ─────────────────────────────────────────── */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* ══════════════════════════════════════════════════════════
                  LEFT COLUMN — PROMO / AD SPACE
              ══════════════════════════════════════════════════════════ */}
              <div className="relative hidden md:flex flex-col justify-end overflow-hidden min-h-[520px]">
                {/* Background Image */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={promo.id}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${promo.bg})` }}
                  />
                </AnimatePresence>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-900/30" />
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${promo.accent} opacity-20`}
                />

                {/* Floating badge */}
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute top-5 left-5 flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 backdrop-blur-sm rounded-full px-3 py-1.5"
                >
                  <Sparkles className="w-3 h-3 text-violet-400" />
                  <span className="text-[11px] font-semibold text-slate-200">{brandBadgeName}</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-violet-600/30 text-violet-300 rounded-full font-bold border border-violet-500/30">
                    {brandBadgeLabel}
                  </span>
                </motion.div>

                {/* Star rating */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="absolute top-16 left-5 flex items-center gap-1"
                >
                  <span className="text-[11px] text-slate-400 font-semibold">{brandRating}</span>
                </motion.div>

                {/* Content overlay */}
                <div className="relative z-10 p-7 space-y-3">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={promo.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.35 }}
                    >
                      <span className="inline-block text-[11px] font-bold text-violet-300 bg-violet-500/15 border border-violet-500/30 px-2.5 py-1 rounded-full mb-3">
                        {promo.tag}
                      </span>
                      <h2 className="text-2xl font-extrabold text-white leading-tight">
                        {promo.headline}
                      </h2>
                      <p className="text-sm text-slate-300/80 mt-2 leading-relaxed">
                        {promo.sub}
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  {/* Stat chips */}
                  <div className="flex items-center gap-2 pt-2 flex-wrap">
                    {STATS.map(({ icon: Icon, label }) => (
                      <div
                        key={label}
                        className="flex items-center gap-1.5 bg-slate-800/70 border border-slate-700/60 backdrop-blur-sm rounded-full px-2.5 py-1"
                      >
                        <Icon className="w-3 h-3 text-violet-400" />
                        <span className="text-[11px] font-semibold text-slate-300">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════
                  RIGHT COLUMN — AUTH FORM
              ══════════════════════════════════════════════════════════ */}
              <div className="flex flex-col justify-center px-8 py-10 min-h-[520px]">
                {/* Header */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={view + "-header"}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22 }}
                    className="mb-7"
                  >
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/50">
                        <Sparkles className="w-[18px] h-[18px] text-white" />
                      </div>
                      <span className="text-sm font-bold text-white">{brandName}</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-white leading-tight">
                      {isVerify
                        ? "Verify your email"
                        : isForgot
                        ? forgotStep === "email" ? "Reset your password" : "Enter reset code"
                        : isSignup ? signupHeading : loginHeading}
                    </h1>
                    <p className="text-sm text-slate-400 mt-1.5">
                      {isVerify
                        ? `We sent a verification code to ${email}`
                        : isForgot
                        ? forgotStep === "email"
                          ? "We'll send a reset code to your email."
                          : `Code sent to ${forgotEmail}`
                        : isSignup
                        ? signupSubtitle
                        : loginSubtitle}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* ── VERIFY EMAIL FORM ─────────────────────────────── */}
                {isVerify && (
                  <div className="space-y-4">
                    <form onSubmit={handleVerify} className="space-y-4">
                      <InputField
                        id="verify-code"
                        type="text"
                        placeholder="Verification code (from email)"
                        value={verifyCode}
                        onChange={setVerifyCode}
                        icon={Mail}
                        autoComplete="one-time-code"
                      />
                      {verifyError && <p className="text-xs text-red-400">{verifyError}</p>}
                      <button
                        type="submit"
                        disabled={loading || !verifyCode}
                        className="relative w-full py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)", boxShadow: "0 4px 32px rgba(124,58,237,0.5)" }}
                      >
                        <span className="relative flex items-center justify-center gap-2">
                          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Verify Email <ArrowRight className="w-4 h-4" /></>}
                        </span>
                      </button>
                    </form>
                    <p className="text-center text-sm text-slate-500">
                      <button type="button" onClick={() => setView("signup")} className="text-violet-400 font-semibold hover:text-violet-300 transition-colors">
                        ← Back
                      </button>
                    </p>
                  </div>
                )}

                {/* ── FORGOT PASSWORD FORM ───────────────────────────── */}
                {isForgot && (
                  <div className="space-y-4">
                    {forgotSuccess ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-3">✅</div>
                        <p className="text-green-400 font-semibold">Password reset! Redirecting…</p>
                      </div>
                    ) : forgotStep === "email" ? (
                      <form onSubmit={handleForgotSendCode} className="space-y-4">
                        <InputField
                          id="forgot-email"
                          type="email"
                          placeholder="Your email address"
                          value={forgotEmail}
                          onChange={setForgotEmail}
                          icon={Mail}
                          autoComplete="email"
                        />
                        {forgotError && <p className="text-xs text-red-400">{forgotError}</p>}
                        <button
                          type="submit"
                          disabled={loading || !forgotEmail}
                          className="relative w-full py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
                          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)", boxShadow: "0 4px 32px rgba(124,58,237,0.5)" }}
                        >
                          <span className="relative flex items-center justify-center gap-2">
                            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Send Reset Code <ArrowRight className="w-4 h-4" /></>}
                          </span>
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleForgotReset} className="space-y-4">
                        <InputField
                          id="forgot-code"
                          type="text"
                          placeholder="Reset code (from email)"
                          value={forgotCode}
                          onChange={setForgotCode}
                          icon={Mail}
                          autoComplete="one-time-code"
                        />
                        <InputField
                          id="forgot-new-password"
                          type="password"
                          placeholder="New password"
                          value={forgotNewPassword}
                          onChange={setForgotNewPassword}
                          icon={Lock}
                          autoComplete="new-password"
                        />
                        {forgotError && <p className="text-xs text-red-400">{forgotError}</p>}
                        <button
                          type="submit"
                          disabled={loading || !forgotCode || !forgotNewPassword}
                          className="relative w-full py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
                          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)", boxShadow: "0 4px 32px rgba(124,58,237,0.5)" }}
                        >
                          <span className="relative flex items-center justify-center gap-2">
                            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Reset Password <ArrowRight className="w-4 h-4" /></>}
                          </span>
                        </button>
                      </form>
                    )}
                    <p className="text-center text-sm text-slate-500">
                      <button type="button" onClick={() => setView("login")} className="text-violet-400 font-semibold hover:text-violet-300 transition-colors">
                        ← Back to login
                      </button>
                    </p>
                  </div>
                )}

                {/* ── LOGIN / SIGNUP FORM ────────────────────────────── */}
                {!isForgot && !isVerify && (
                  <>
                  <form onSubmit={handleSubmit} className="space-y-3.5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={view + "-fields"}
                      initial={{ opacity: 0, x: isSignup ? 16 : -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: isSignup ? -16 : 16 }}
                      transition={{ duration: 0.22 }}
                      className="space-y-3"
                    >
                      {/* Name — signup only */}
                      {isSignup && (
                        <InputField
                          id="name"
                          type="text"
                          placeholder="Full Name"
                          value={name}
                          onChange={setName}
                          icon={User}
                          autoComplete="name"
                        />
                      )}

                      <InputField
                        id="email"
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={setEmail}
                        icon={Mail}
                        autoComplete="email"
                      />

                      <InputField
                        id="password"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={setPassword}
                        icon={Lock}
                        autoComplete={isSignup ? "new-password" : "current-password"}
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* Forgot password — login only */}
                  {!isSignup && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => { setForgotEmail(email); setForgotStep("email"); setForgotError(""); setForgotSuccess(false); setView("forgot"); }}
                        className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {/* Submit CTA */}
                  {formError && <p className="text-xs text-red-400 mt-1">{formError}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="relative w-full py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden group mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                      boxShadow: "0 4px 32px rgba(124, 58, 237, 0.5)",
                    }}
                  >
                    {/* Shimmer hover effect */}
                    <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                    <span className="relative flex items-center justify-center gap-2">
                      {loading ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          {isSignup ? signupButton : loginButton}
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </span>
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-xs text-slate-600 font-medium">or continue with</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                {/* Social buttons */}
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    {
                      label: "Google",
                      provider: "oauth_google" as const,
                      icon: (
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      ),
                    },
                  ].map(({ label, provider, icon }) => (
                    <button
                      key={label}
                      type="button"
                      disabled={oauthLoading !== null}
                      onClick={() => handleOAuth(provider)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-700/80 hover:border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {oauthLoading === provider ? (
                        <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                      ) : icon}
                      {label}
                    </button>
                  ))}
                </div>

                {/* Toggle view */}
                <p className="text-center text-sm text-slate-500 mt-6">
                  {isSignup ? footerSignupToggle : footerLoginToggle}{" "}
                  <button
                    type="button"
                    onClick={switchView}
                    className="text-violet-400 font-semibold hover:text-violet-300 transition-colors"
                  >
                    {isSignup ? "Login" : "Sign up"}
                  </button>
                </p>

                {/* Trust badges */}
                <p className="text-center text-[11px] text-slate-600 mt-4">
                  {footerTerms}
                </p>
                  </> 
                )} {/* end !isForgot */}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
