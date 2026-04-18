"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Save, Plus, Trash2, GripVertical, Upload, X, Loader2,
  ArrowLeft, Eye, ShieldCheck, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════════ */

interface PromoSlide {
  _id: string;
  bgUrl: string;
  tag: string;
  headline: string;
  sub: string;
  cta: string;
  accent: string;
}

interface StatChip {
  _id: string;
  icon: "video" | "image" | "mic";
  label: string;
}

interface AuthBranding {
  badgeName: string;
  badgeLabel: string;
  rating: string;
  brandName: string;
}

interface SignupText {
  heading: string;
  subtitle: string;
  buttonText: string;
}

interface LoginText {
  heading: string;
  subtitle: string;
  buttonText: string;
}

interface FooterText {
  signupToggle: string;
  loginToggle: string;
  termsText: string;
}

interface AuthCmsData {
  promoSlides: PromoSlide[];
  stats: StatChip[];
  branding: AuthBranding;
  signup: SignupText;
  login: LoginText;
  footer: FooterText;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SEEDS
   ═══════════════════════════════════════════════════════════════════════════════ */

const uid = () => Math.random().toString(36).slice(2, 10);

const ACCENT_OPTIONS = [
  "from-violet-600 to-purple-700",
  "from-blue-600 to-cyan-700",
  "from-rose-600 to-pink-700",
  "from-emerald-600 to-teal-700",
  "from-amber-600 to-orange-700",
  "from-indigo-600 to-blue-700",
];

const ICON_OPTIONS: StatChip["icon"][] = ["video", "image", "mic"];

const SEED: AuthCmsData = {
  promoSlides: [
    {
      _id: uid(),
      bgUrl: "https://images.unsplash.com/photo-1686191128892-3b37add4c844?w=900&q=90&auto=format&fit=crop",
      tag: "🎬 AI Video Generation",
      headline: "Unlock the Power of AI Generation",
      sub: "Sign up today and get 100 Free Credits to generate cinematic videos, photorealistic images, and immersive audio.",
      cta: "Start Free →",
      accent: "from-violet-600 to-purple-700",
    },
    {
      _id: uid(),
      bgUrl: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=900&q=90&auto=format&fit=crop",
      tag: "🖼️ Flux & Seedance Models",
      headline: "Create Stunning Visuals in Seconds",
      sub: "Access 15+ cutting-edge AI models including Flux Pro 1.1, Kling 3.0, and ElevenLabs v3.",
      cta: "Explore Models →",
      accent: "from-blue-600 to-cyan-700",
    },
  ],
  stats: [
    { _id: uid(), icon: "video", label: "10K+ Videos" },
    { _id: uid(), icon: "image", label: "50K+ Images" },
    { _id: uid(), icon: "mic", label: "5K+ Audios" },
  ],
  branding: {
    badgeName: "Saad Studio AI",
    badgeLabel: "PRO",
    rating: "4.9 / 5",
    brandName: "Saad Studio",
  },
  signup: {
    heading: "Create your account",
    subtitle: "Start generating with 100 free credits — no card needed.",
    buttonText: "Create Account",
  },
  login: {
    heading: "Welcome back",
    subtitle: "Sign in to continue creating with AI.",
    buttonText: "Login",
  },
  footer: {
    signupToggle: "Already have an account?",
    loginToggle: "Don't have an account?",
    termsText: "By continuing, you agree to our Terms and Privacy Policy",
  },
};

/* ═══════════════════════════════════════════════════════════════════════════════
   UPLOAD HELPER
   ═══════════════════════════════════════════════════════════════════════════════ */

async function uploadToSupabase(file: File): Promise<string> {
  const res = await fetch("/api/admin/media/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type }),
  });
  if (!res.ok) throw new Error("Upload URL failed");
  const { signedUrl, publicUrl } = await res.json();
  const up = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!up.ok) throw new Error("Upload failed");
  return publicUrl;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SHARED UI
   ═══════════════════════════════════════════════════════════════════════════════ */

function Field({
  label, value, onChange, multiline, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; placeholder?: string;
}) {
  const cls =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50";
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(cls, "h-20 resize-none")}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative group", isDragging && "z-50 opacity-80")}
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute -left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-800 border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
      >
        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {children}
    </div>
  );
}

function MediaUploader({
  url, onUpload, label,
}: {
  url: string; onUpload: (url: string) => void; label: string;
}) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadToSupabase(file);
      onUpload(publicUrl);
    } catch {
      /* skip */
    }
    setUploading(false);
    if (ref.current) ref.current.value = "";
  };
  return (
    <div className="space-y-2">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
        {label}
      </span>
      <div
        className="relative rounded-xl border border-dashed border-white/15 bg-white/[.02] overflow-hidden"
        style={{ minHeight: 80 }}
      >
        {url ? (
          <Image src={url} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div className="flex items-center justify-center h-20 text-zinc-600">
            <Upload className="w-5 h-5" />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => ref.current?.click()}
          className="flex-1 py-1.5 rounded-lg bg-violet-600/20 text-violet-400 text-xs font-bold hover:bg-violet-600/30 transition-colors"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
        {url && (
          <button
            onClick={() => onUpload("")}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PROMO SLIDE EDITOR
   ═══════════════════════════════════════════════════════════════════════════════ */

function SlideEditor({
  slide, onUpdate, onRemove,
}: {
  slide: PromoSlide; onUpdate: (s: PromoSlide) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const up = (p: Partial<PromoSlide>) => onUpdate({ ...slide, ...p });

  return (
    <div className="rounded-2xl border border-white/[.06] bg-slate-900/40 overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[.02] transition-colors"
        onClick={() => setOpen(!open)}
      >
        {slide.bgUrl ? (
          <div className="relative w-12 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
            <Image src={slide.bgUrl} alt="" fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="w-12 h-8 rounded-lg bg-slate-800 flex-shrink-0 border border-white/10" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{slide.headline}</p>
          <p className="text-[11px] text-zinc-500 truncate">{slide.tag}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1.5 text-red-400/50 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </div>
      {open && (
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-white/5">
          <MediaUploader
            url={slide.bgUrl}
            onUpload={(url) => up({ bgUrl: url })}
            label="Background Image"
          />
          <Field label="Tag" value={slide.tag} onChange={(v) => up({ tag: v })} placeholder="🎬 AI Video Generation" />
          <Field label="Headline" value={slide.headline} onChange={(v) => up({ headline: v })} />
          <Field label="Subtitle" value={slide.sub} onChange={(v) => up({ sub: v })} multiline />
          <Field label="CTA Text" value={slide.cta} onChange={(v) => up({ cta: v })} />
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Accent Gradient</span>
            <select
              value={slide.accent}
              onChange={(e) => up({ accent: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
            >
              {ACCENT_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   STAT CHIP EDITOR
   ═══════════════════════════════════════════════════════════════════════════════ */

function StatEditor({
  stat, onUpdate, onRemove,
}: {
  stat: StatChip; onUpdate: (s: StatChip) => void; onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/[.06] bg-slate-900/40 px-4 py-3 flex items-center gap-3">
      <select
        value={stat.icon}
        onChange={(e) => onUpdate({ ...stat, icon: e.target.value as StatChip["icon"] })}
        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none w-24"
      >
        {ICON_OPTIONS.map((ic) => (
          <option key={ic} value={ic}>
            {ic === "video" ? "🎬 Video" : ic === "image" ? "🖼️ Image" : "🎤 Mic"}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={stat.label}
        onChange={(e) => onUpdate({ ...stat, label: e.target.value })}
        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50"
        placeholder="10K+ Videos"
      />
      <button onClick={onRemove} className="p-1 text-red-400/50 hover:text-red-400">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function AuthCmsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [promoSlides, setPromoSlides] = useState<PromoSlide[]>(SEED.promoSlides);
  const [stats, setStats] = useState<StatChip[]>(SEED.stats);
  const [branding, setBranding] = useState<AuthBranding>(SEED.branding);
  const [signup, setSignup] = useState<SignupText>(SEED.signup);
  const [login, setLogin] = useState<LoginText>(SEED.login);
  const [footer, setFooter] = useState<FooterText>(SEED.footer);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Load
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/layouts?page=cms-auth");
        if (!res.ok) return;
        const row = await res.json();
        const b = row?.layoutBlocks;
        if (!b) return;
        if (b.promoSlides?.length) setPromoSlides(b.promoSlides);
        if (b.stats?.length) setStats(b.stats);
        if (b.branding) setBranding(b.branding);
        if (b.signup) setSignup(b.signup);
        if (b.login) setLogin(b.login);
        if (b.footer) setFooter(b.footer);
      } catch {
        /* use seeds */
      }
    })();
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    setSaving(true);
    const payload: AuthCmsData = { promoSlides, stats, branding, signup, login, footer };
    try {
      await fetch("/api/admin/layouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageName: "cms-auth", layoutBlocks: payload }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* skip */
    }
    setSaving(false);
  }, [promoSlides, stats, branding, signup, login, footer]);

  // DnD for slides
  const handleSlideDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPromoSlides((prev) => {
        const oldIdx = prev.findIndex((s) => s._id === active.id);
        const newIdx = prev.findIndex((s) => s._id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  // DnD for stats
  const handleStatDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setStats((prev) => {
        const oldIdx = prev.findIndex((s) => s._id === active.id);
        const newIdx = prev.findIndex((s) => s._id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Top bar */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Auth Page CMS
              </h1>
              <p className="text-[11px] text-zinc-500">
                {promoSlides.length} slides · {stats.length} stat chips
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/?auth=signup"
              target="_blank"
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-white/10 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </a>
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300",
                saved
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25"
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saved ? "Saved!" : saving ? "Saving..." : "Publish"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">
        {/* ═══════ BRANDING ═══════ */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-violet-500" />
            Branding
          </h2>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Badge Name"
                value={branding.badgeName}
                onChange={(v) => setBranding({ ...branding, badgeName: v })}
                placeholder="Saad Studio AI"
              />
              <Field
                label="Badge Label"
                value={branding.badgeLabel}
                onChange={(v) => setBranding({ ...branding, badgeLabel: v })}
                placeholder="PRO"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Star Rating"
                value={branding.rating}
                onChange={(v) => setBranding({ ...branding, rating: v })}
                placeholder="4.9 / 5"
              />
              <Field
                label="Brand Name (Form Header)"
                value={branding.brandName}
                onChange={(v) => setBranding({ ...branding, brandName: v })}
                placeholder="Saad Studio"
              />
            </div>
          </div>
        </section>

        {/* ═══════ PROMO SLIDES ═══════ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-cyan-500" />
              Promo Slides ({promoSlides.length})
            </h2>
            <button
              onClick={() =>
                setPromoSlides([
                  ...promoSlides,
                  {
                    _id: uid(),
                    bgUrl: "",
                    tag: "✨ New Feature",
                    headline: "New Slide",
                    sub: "Describe this promo slide.",
                    cta: "Learn More →",
                    accent: ACCENT_OPTIONS[0],
                  },
                ])
              }
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600/20 px-3 py-1.5 text-xs font-bold text-cyan-400 hover:bg-cyan-600/30 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Slide
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Slide 1 shows on Sign-up view, Slide 2 shows on Login view. Add more for future carousel.
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSlideDragEnd}>
            <SortableContext items={promoSlides.map((s) => s._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {promoSlides.map((slide, i) => (
                  <SortableItem key={slide._id} id={slide._id}>
                    <div className="relative">
                      <span className="absolute -right-2 -top-2 z-10 w-5 h-5 rounded-full bg-slate-700 border border-slate-600 text-[10px] font-bold text-zinc-300 flex items-center justify-center">
                        {i + 1}
                      </span>
                      <SlideEditor
                        slide={slide}
                        onUpdate={(s) => setPromoSlides((prev) => prev.map((x) => x._id === s._id ? s : x))}
                        onRemove={() => setPromoSlides((prev) => prev.filter((x) => x._id !== slide._id))}
                      />
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        {/* ═══════ STAT CHIPS ═══════ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-amber-500" />
              Stat Chips ({stats.length})
            </h2>
            <button
              onClick={() =>
                setStats([
                  ...stats,
                  { _id: uid(), icon: "video", label: "0+ Items" },
                ])
              }
              className="flex items-center gap-1.5 rounded-lg bg-amber-600/20 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-600/30 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Stat
            </button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleStatDragEnd}>
            <SortableContext items={stats.map((s) => s._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {stats.map((stat) => (
                  <SortableItem key={stat._id} id={stat._id}>
                    <StatEditor
                      stat={stat}
                      onUpdate={(s) => setStats((prev) => prev.map((x) => x._id === s._id ? s : x))}
                      onRemove={() => setStats((prev) => prev.filter((x) => x._id !== stat._id))}
                    />
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        {/* ═══════ SIGNUP TEXT ═══════ */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-emerald-500" />
            Sign-Up View Text
          </h2>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
            <Field label="Heading" value={signup.heading} onChange={(v) => setSignup({ ...signup, heading: v })} />
            <Field label="Subtitle" value={signup.subtitle} onChange={(v) => setSignup({ ...signup, subtitle: v })} multiline />
            <Field label="Button Text" value={signup.buttonText} onChange={(v) => setSignup({ ...signup, buttonText: v })} />
          </div>
        </section>

        {/* ═══════ LOGIN TEXT ═══════ */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-blue-500" />
            Login View Text
          </h2>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
            <Field label="Heading" value={login.heading} onChange={(v) => setLogin({ ...login, heading: v })} />
            <Field label="Subtitle" value={login.subtitle} onChange={(v) => setLogin({ ...login, subtitle: v })} multiline />
            <Field label="Button Text" value={login.buttonText} onChange={(v) => setLogin({ ...login, buttonText: v })} />
          </div>
        </section>

        {/* ═══════ FOOTER TEXT ═══════ */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-rose-500" />
            Footer & Toggle Text
          </h2>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
            <Field
              label="Signup Toggle (shown on signup view)"
              value={footer.signupToggle}
              onChange={(v) => setFooter({ ...footer, signupToggle: v })}
              placeholder="Already have an account?"
            />
            <Field
              label="Login Toggle (shown on login view)"
              value={footer.loginToggle}
              onChange={(v) => setFooter({ ...footer, loginToggle: v })}
              placeholder="Don't have an account?"
            />
            <Field
              label="Terms Text"
              value={footer.termsText}
              onChange={(v) => setFooter({ ...footer, termsText: v })}
              multiline
            />
          </div>
        </section>
      </div>
    </div>
  );
}
