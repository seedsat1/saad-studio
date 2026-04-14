"use client";

import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useRef, useState, useCallback, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useAvatar, PRESET_AVATARS } from "@/lib/avatar-context";
import {
  User, Mail, Zap, Star, ImageIcon, VideoIcon, Music, Box,
  Shield, Bell, CreditCard, Calendar, TrendingUp, Clock,
  Edit3, Camera, Upload, X, Check, AtSign,
} from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  Image: "text-violet-400 bg-violet-500/10 border-violet-500/30",
  Audio: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  Video: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  "3D":  "text-orange-400 bg-orange-500/10 border-orange-500/30",
};

const TYPE_GRADIENTS: Record<string, string> = {
  Image: "from-violet-900 to-indigo-900",
  Audio: "from-emerald-900 to-teal-900",
  Video: "from-blue-900 to-cyan-900",
  "3D": "from-orange-900 to-amber-900",
};

type ProfileOverview = {
  credits: number;
  topStats: {
    generations: number;
    projects: number;
  };
  usage: {
    images: number;
    videos: number;
    music: number;
    models3d: number;
  };
  recentActivity: Array<{
    id: string;
    label: string;
    type: "Image" | "Video" | "Audio" | "3D";
    createdAt: string;
  }>;
};

function formatTimeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(1, Math.floor((now - then) / 1000));

  if (diffSec < 60) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const stagger: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const slideUp: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

function AvatarPickerModal({
  initials, currentPhoto, currentPreset, onClose, onSave,
}: {
  initials: string; currentPhoto: string | null; currentPreset: number;
  onClose: () => void; onSave: (photo: string | null, preset: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"presets" | "upload">("presets");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(currentPhoto);
  const [selectedPreset, setSelectedPreset] = useState(currentPreset);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 300;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.7);
        setPreviewPhoto(compressed);
        setTab("upload");
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0]; if (file) handleFile(file);
  };

  const activeGradient = PRESET_AVATARS.find((p) => p.id === selectedPreset)?.gradient ?? "from-violet-500 to-indigo-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden"
        initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">Change Profile Picture</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex justify-center pt-6 pb-2">
          <div className="relative">
            {previewPhoto && tab === "upload" ? (
              <img src={previewPhoto} alt="Preview" className="w-24 h-24 rounded-2xl object-cover ring-4 ring-violet-500/40 shadow-lg" />
            ) : (
              <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${activeGradient} flex items-center justify-center text-2xl font-bold text-white ring-4 ring-violet-500/40 shadow-lg`}>{initials}</div>
            )}
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full ring-4 ring-slate-900" />
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 mb-4">Preview</p>

        <div className="flex mx-6 mb-4 bg-slate-800/60 rounded-xl p-1 gap-1">
          {(["presets", "upload"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-violet-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}>
              {t === "presets" ? "Choose Style" : "Upload Photo"}
            </button>
          ))}
        </div>

        <div className="px-6 pb-6">
          {tab === "presets" && (
            <div className="grid grid-cols-6 gap-2.5">
              {PRESET_AVATARS.map((p) => (
                <button key={p.id} onClick={() => { setSelectedPreset(p.id); setPreviewPhoto(null); }}
                  className={`relative w-full aspect-square rounded-xl bg-gradient-to-br ${p.gradient} transition-all duration-200 hover:scale-110 ${selectedPreset === p.id ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110" : ""}`}>
                  {selectedPreset === p.id && (
                    <div className="absolute inset-0 flex items-center justify-center"><Check className="w-3 h-3 text-white drop-shadow" /></div>
                  )}
                </button>
              ))}
            </div>
          )}

          {tab === "upload" && (
            <div className="space-y-3">
              <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 ${dragging ? "border-violet-500 bg-violet-500/10" : "border-slate-700 hover:border-violet-500/60 hover:bg-slate-800/40"}`}>
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center"><Upload className="w-5 h-5 text-violet-400" /></div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-200">Drop your photo here</p>
                  <p className="text-xs text-slate-500 mt-0.5">or click to browse — JPG, PNG, WebP</p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {previewPhoto && (
                <div className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                  <img src={previewPhoto} alt="Uploaded" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  <p className="text-sm text-slate-300 flex-1 truncate">Photo ready</p>
                  <button onClick={() => setPreviewPhoto(null)} className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          )}

          <button onClick={() => onSave(tab === "upload" ? previewPhoto : null, selectedPreset)}
            className="mt-5 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-violet-500/20">
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function EditProfileModal({
  name, email, onClose, onSave,
}: {
  name: string; email: string;
  onClose: () => void;
  onSave: (name: string, email: string) => void;
}) {
  const [draftName,  setDraftName]  = useState(name);
  const [draftEmail, setDraftEmail] = useState(email);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const validate = () => {
    const e: { name?: string; email?: string } = {};
    if (!draftName.trim())  e.name  = "Name is required.";
    if (!draftEmail.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draftEmail)) e.email = "Enter a valid email.";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(draftName.trim(), draftEmail.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative z-10 w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden"
        initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">Edit Profile</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Display Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text" value={draftName} onChange={(e) => { setDraftName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="Your name"
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border ${ errors.name ? "border-red-500/60" : "border-slate-700 focus:border-violet-500/60" } text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors`}
              />
            </div>
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address</label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email" value={draftEmail} onChange={(e) => { setDraftEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                placeholder="you@example.com"
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border ${ errors.email ? "border-red-500/60" : "border-slate-700 focus:border-violet-500/60" } text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors`}
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition-all duration-200">
              Cancel
            </button>
            <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-violet-500/20">
              Save Changes
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [realCreditBalance, setRealCreditBalance] = useState<number | null>(null);
  const [overview, setOverview] = useState<ProfileOverview | null>(null);
  const { uploadedPhoto, activePreset, setAvatar } = useAvatar();

  const activeGradient = PRESET_AVATARS.find((p) => p.id === activePreset)?.gradient ?? "from-violet-500 to-indigo-600";
  const activeShadow   = PRESET_AVATARS.find((p) => p.id === activePreset)?.shadow   ?? "shadow-violet-500/30";

  // Real user data from Clerk
  const fullName  = isLoaded ? ([user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "User") : "...";
  const email     = isLoaded ? (user?.emailAddresses[0]?.emailAddress ?? "") : "...";
  const userId = user?.id;
  const initials  = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const joinedDate = isLoaded && user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  const handleSave = (photo: string | null, preset: number) => {
    setAvatar(photo, preset); setPickerOpen(false);
  };

  useEffect(() => {
    if (!isLoaded || !userId) {
      setRealCreditBalance(null);
      setOverview(null);
      return;
    }

    let disposed = false;
    const loadOverview = async () => {
      try {
        const res = await fetch("/api/profile/overview", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!disposed && typeof data?.credits === "number") {
          setOverview(data as ProfileOverview);
          setRealCreditBalance(Math.max(0, Math.floor(data.credits)));
        }
      } catch {
        // keep previous value if request fails
      }
    };

    loadOverview();
    const timer = window.setInterval(loadOverview, 20000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [isLoaded, userId]);

  const usageStats = [
    {
      label: "Images Generated",
      value: overview?.usage.images ?? 0,
      icon: ImageIcon,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
    },
    {
      label: "Videos Created",
      value: overview?.usage.videos ?? 0,
      icon: VideoIcon,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Music Tracks",
      value: overview?.usage.music ?? 0,
      icon: Music,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "3D Models",
      value: overview?.usage.models3d ?? 0,
      icon: Box,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/3 h-[400px] w-[400px] rounded-full bg-violet-900/10 blur-[130px]" />
        <div className="absolute bottom-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-900/10 blur-[100px]" />
      </div>

      <AnimatePresence>{pickerOpen && <AvatarPickerModal initials={initials} currentPhoto={uploadedPhoto} currentPreset={activePreset} onClose={() => setPickerOpen(false)} onSave={handleSave} />}</AnimatePresence>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 space-y-10">

        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 md:p-10 backdrop-blur-sm shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative flex-shrink-0 group">
              {uploadedPhoto ? (
                <img src={uploadedPhoto} alt="Avatar" className={`w-24 h-24 rounded-2xl object-cover shadow-lg ${activeShadow}`} />
              ) : (
                <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${activeGradient} flex items-center justify-center text-3xl font-bold text-white shadow-lg ${activeShadow}`}>{initials}</div>
              )}
              <button onClick={() => setPickerOpen(true)} className="absolute inset-0 rounded-2xl flex items-center justify-center bg-slate-950/0 group-hover:bg-slate-950/60 transition-all duration-200 cursor-pointer">
                <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow" />
              </button>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full ring-4 ring-slate-900 shadow-md" />
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{fullName}</h1>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">{(user?.publicMetadata?.role as string) || "Free"} Member</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mt-1">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{email}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Joined {joinedDate}</span>
              </div>
              <button onClick={() => setPickerOpen(true)} className="mt-3 flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                <Camera className="w-3.5 h-3.5" /> Change profile picture
              </button>
            </div>

            <button onClick={() => openUserProfile()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-all duration-200">
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2 md:col-span-1 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Credits</p>
                <p className="text-lg font-bold text-amber-300">
                  {realCreditBalance !== null ? realCreditBalance.toLocaleString() : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3">
              <TrendingUp className="w-5 h-5 text-violet-400 flex-shrink-0" /><div><p className="text-xs text-slate-500">Generations</p><p className="text-lg font-bold text-violet-300">{overview?.topStats.generations ?? 0}</p></div>
            </div>
            <div className="flex items-center gap-3 bg-sky-500/10 border border-sky-500/20 rounded-xl px-4 py-3">
              <Star className="w-5 h-5 text-sky-400 flex-shrink-0" /><div><p className="text-xs text-slate-500">Projects</p><p className="text-lg font-bold text-sky-300">{overview?.topStats.projects ?? 0}</p></div>
            </div>
          </div>
        </motion.div>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Usage Breakdown</h2>
          <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4" variants={stagger} initial="hidden" animate="visible">
            {usageStats.map((stat) => (
              <motion.div key={stat.label} variants={slideUp} className={`${stat.bg} border ${stat.border} rounded-2xl p-5 backdrop-blur-sm`}>
                <div className={`p-2 rounded-xl ${stat.bg} border ${stat.border} w-fit mb-3`}><stat.icon className={`w-4 h-4 ${stat.color}`} /></div>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        <div className="grid md:grid-cols-2 gap-6 pb-10">
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-violet-400" /> Recent Activity</h2>
            <div className="space-y-3">
              {(overview?.recentActivity ?? []).length === 0 ? (
                <div className="text-sm text-slate-500">No recent activity yet.</div>
              ) : (
                (overview?.recentActivity ?? []).map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${TYPE_GRADIENTS[item.type]} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{item.label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md border ${TYPE_COLORS[item.type]}`}>{item.type}</span>
                        <span className="text-xs text-slate-500">{formatTimeAgo(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2"><User className="w-4 h-4 text-sky-400" /> Account</h2>
            <div className="space-y-2">
              {[
                { icon: User,       label: "Personal Information",   sub: "Update your name and email",    color: "text-violet-400",  href: "/settings" },
                { icon: Shield,     label: "Security & Password",    sub: "Manage login and 2FA",           color: "text-emerald-400", href: "/settings" },
                { icon: CreditCard, label: "Billing & Subscription", sub: "View plan and payment history", color: "text-amber-400",   href: "/settings" },
                { icon: Bell,       label: "Notifications",          sub: "Control email and push alerts", color: "text-sky-400",     href: "/settings" },
              ].map((item) => (
                <a key={item.label} href={item.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/60 transition-all duration-200 group cursor-pointer border border-transparent hover:border-slate-700/50">
                  <div className="p-2 rounded-lg bg-slate-800/80 group-hover:bg-slate-700/80 transition-colors"><item.icon className={`w-4 h-4 ${item.color}`} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{item.label}</p>
                    <p className="text-xs text-slate-500 truncate">{item.sub}</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
