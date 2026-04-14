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

// ─── PROMO SLIDE DATA ────────────────────────────────────────────────────────

const PROMO_SLIDES = [
  {
    id: 1,
    bg: "https://images.unsplash.com/photo-1686191128892-3b37add4c844?w=900&q=90&auto=format&fit=crop",
    tag: "🎬 AI Video Generation",
    headline: "Unlock the Power of Kie AI",
    sub: "Sign up today and get 100 Free Credits to generate cinematic videos, photorealistic images, and immersive audio.",
    cta: "Start Free →",
    accent: "from-violet-600 to-purple-700",
  },
  {
    id: 2,
    bg: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=900&q=90&auto=format&fit=crop",
    tag: "🖼️ Flux & Seedance Models",
    headline: "Create Stunning Visuals in Seconds",
    sub: "Access 15+ cutting-edge AI models including Flux Pro 1.1, Kling 3.0, and ElevenLabs v3.",
    cta: "Explore Models →",
    accent: "from-blue-600 to-cyan-700",
  },
];

// ─── STAT CHIPS ──────────────────────────────────────────────────────────────
const STATS = [
  { icon: Video, label: "10K+ Videos" },
  { icon: ImageIcon, label: "50K+ Images" },
  { icon: Mic, label: "5K+ Audios" },
];

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
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const isSignup = view === "signup";

  // Active promo slide
  const promo = PROMO_SLIDES[isSignup ? 0 : 1];

  const handleOAuth = async (provider: "oauth_google") => {
    try {
      setOauthLoading(provider);
      if (isSignup && signUp) {
        await signUp.authenticateWithRedirect({
          strategy: provider,
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/dash",
        });
      } else if (signIn) {
        await signIn.authenticateWithRedirect({
          strategy: provider,
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/dash",
        });
      }
    } catch {
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Redirect to Clerk-hosted auth pages
    if (isSignup) {
      router.push("/sign-up");
    } else {
      router.push("/sign-in");
    }
    onClose();
    setLoading(false);
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
                  <span className="text-[11px] font-semibold text-slate-200">Saad Studio AI</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-violet-600/30 text-violet-300 rounded-full font-bold border border-violet-500/30">
                    PRO
                  </span>
                </motion.div>

                {/* Star rating */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="absolute top-16 left-5 flex items-center gap-1"
                >
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-[11px] text-slate-400 ml-1">4.9 / 5</span>
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
                      <span className="text-sm font-bold text-white">Saad Studio</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-white leading-tight">
                      {isSignup ? "Create your account" : "Welcome back"}
                    </h1>
                    <p className="text-sm text-slate-400 mt-1.5">
                      {isSignup
                        ? "Start generating with 100 free credits — no card needed."
                        : "Sign in to continue creating with AI."}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Form */}
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
                        onClick={() => { onClose(); router.push("/sign-in"); }}
                        className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {/* Submit CTA */}
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
                          {isSignup ? "Create Account" : "Login"}
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
                  {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
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
                  By continuing, you agree to our{" "}
                  <span className="text-slate-500 hover:text-slate-400 cursor-pointer transition-colors">
                    Terms
                  </span>{" "}
                  and{" "}
                  <span className="text-slate-500 hover:text-slate-400 cursor-pointer transition-colors">
                    Privacy Policy
                  </span>
                </p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
