"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Video,
  ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  Play,
  X,
  Search,
  Film,
  Sparkles,
  Eye,
  Trash2,
  ExternalLink,
  Megaphone,
} from "lucide-react";

// --- TYPES -------------------------------------------------------------

type PresetMedia = {
  id: string;
  name: string;
  category: string;
  previewVideoUrl: string;
  previewGradient: string;
  description: string;
  costMultiplier: number;
};

type AssetSection = "transitions" | "beauty-tools" | "promo";

type BeautyToolAsset = {
  id: string;
  name: string;
  thumbFile: string;
};

// --- BEAUTY TOOLS DATA (matches /img/beauty-tools/) -------------------

const BEAUTY_TOOLS: BeautyToolAsset[] = [
  { id: "outfit-change", name: "Outfit Change", thumbFile: "outfit-change.png" },
  { id: "evening-dress", name: "Evening Dress", thumbFile: "evening-dress.png" },
  { id: "wedding-dress", name: "Wedding Dress", thumbFile: "wedding-dress.png" },
  { id: "traditional-wear", name: "Traditional Wear", thumbFile: "traditional-wear.png" },
  { id: "hijab-styling", name: "Hijab Styling", thumbFile: "hijab-styling.png" },
  { id: "cosplay", name: "Cosplay", thumbFile: "cosplay.png" },
  { id: "full-glam-makeup", name: "Full Glam Makeup", thumbFile: "full-glam-makeup.png" },
  { id: "korean-beauty", name: "Korean Beauty", thumbFile: "korean-beauty.png" },
  { id: "arabic-makeup", name: "Arabic Makeup", thumbFile: "arabic-makeup.png" },
  { id: "lip-color-tryon", name: "Lip Color Try-On", thumbFile: "lip-color-tryon.png" },
  { id: "eye-makeup", name: "Eye Makeup", thumbFile: "eye-makeup.png" },
  { id: "bridal-makeup", name: "Bridal Makeup", thumbFile: "bridal-makeup.png" },
  { id: "skin-retouch", name: "Skin Retouch", thumbFile: "skin-retouch.png" },
  { id: "hairstyle-change", name: "Hairstyle Change", thumbFile: "hairstyle-change.png" },
  { id: "hair-color", name: "Hair Color", thumbFile: "hair-color.png" },
  { id: "beard-style", name: "Beard Styles", thumbFile: "beard-style.png" },
  { id: "bangs-tryon", name: "Bangs Try-On", thumbFile: "bangs-tryon.png" },
  { id: "braids-updos", name: "Braids & Updos", thumbFile: "braids-updos.png" },
  { id: "hair-extensions", name: "Hair Extensions", thumbFile: "hair-extensions.png" },
  { id: "balayage", name: "Balayage", thumbFile: "balayage.png" },
  { id: "lip-enhancement", name: "Lip Enhancement", thumbFile: "lip-enhancement.png" },
  { id: "slim-body", name: "Slim Body", thumbFile: "slim-body.png" },
  { id: "muscle-enhance", name: "Muscle Enhancement", thumbFile: "muscle-enhance.png" },
  { id: "nose-reshape", name: "Nose Reshape", thumbFile: "nose-reshape.png" },
  { id: "skin-tan", name: "Skin Tan", thumbFile: "skin-tan.png" },
];

// --- CATEGORY COLORS --------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  transformation: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  fx_material: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  camera_motion: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  object_reveal: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  stylized_special: "bg-violet-500/20 text-violet-300 border-violet-500/30",
};

// --- UPLOAD HELPER ----------------------------------------------------

async function uploadToSupabase(
  file: File
): Promise<{ publicUrl: string; isVideo: boolean }> {
  const signRes = await fetch("/api/admin/media/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type }),
  });
  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(err?.error ?? "Failed to get upload URL");
  }
  const { signedUrl, publicUrl, isVideo } = (await signRes.json()) as {
    signedUrl: string;
    publicUrl: string;
    isVideo: boolean;
  };
  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadRes.ok) throw new Error("Upload to storage failed");
  return { publicUrl, isVideo };
}

// --- TRANSITION CARD --------------------------------------------------

function TransitionCard({
  preset,
  onUpload,
  uploading,
}: {
  preset: PresetMedia;
  onUpload: (presetId: string, file: File) => void;
  uploading: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);
  const hasVideo = !!preset.previewVideoUrl;
  const isUploading = uploading === preset.id;
  const catColor =
    CATEGORY_COLORS[preset.category] ??
    "bg-slate-500/20 text-slate-300 border-slate-500/30";

  useEffect(() => {
    if (videoRef.current && hasVideo) {
      if (hovering) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [hovering, hasVideo]);

  return (
    <div
      className="group relative rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900/60 transition-all hover:border-slate-600 hover:shadow-xl hover:shadow-black/30"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Preview area */}
      <div className="relative aspect-video bg-slate-950 overflow-hidden">
        {hasVideo ? (
          <>
            <video
              ref={videoRef}
              src={preset.previewVideoUrl}
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold">
              <CheckCircle2 className="w-3 h-3" /> Video Ready
            </div>
          </>
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${preset.previewGradient} flex flex-col items-center justify-center gap-2`}
          >
            <Film className="w-8 h-8 text-white/20" />
            <span className="text-[10px] text-white/30 font-semibold">
              No Preview Video
            </span>
          </div>
        )}

        {/* Upload overlay on hover */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center transition-opacity ${
            hovering ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-lg"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />{" "}
                {hasVideo ? "Replace Video" : "Upload Video"}
              </>
            )}
          </button>
        </div>

        {/* Cost badge */}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur text-[9px] font-bold text-amber-300">
          ×{preset.costMultiplier}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <h3 className="text-sm font-bold text-slate-200 truncate">
            {preset.name}
          </h3>
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catColor} whitespace-nowrap`}
          >
            {preset.category.replace(/_/g, " ")}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
          {preset.description}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(preset.id, f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// --- BEAUTY TOOL CARD -------------------------------------------------

function BeautyToolCard({
  tool,
  onUpload,
  uploading,
}: {
  tool: BeautyToolAsset;
  onUpload: (toolId: string, file: File) => void;
  uploading: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [hovering, setHovering] = useState(false);
  const isUploading = uploading === tool.id;
  const imgSrc = `/img/beauty-tools/${tool.thumbFile}`;

  return (
    <div
      className="group relative rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900/60 transition-all hover:border-slate-600 hover:shadow-xl hover:shadow-black/30"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="relative aspect-square bg-slate-950 overflow-hidden">
        <img
          src={imgSrc}
          alt={tool.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold">
          <CheckCircle2 className="w-3 h-3" /> Active
        </div>

        {/* Upload overlay */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center transition-opacity ${
            hovering ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-lg"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" /> Replace Image
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-3">
        <h3 className="text-sm font-bold text-slate-200 truncate">
          {tool.name}
        </h3>
        <p className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">
          {tool.thumbFile}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(tool.id, f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// --- PROMO UPLOAD ZONE ------------------------------------------------

function PromoUploadZone({
  onUpload,
  uploads,
  onRemove,
}: {
  onUpload: (files: FileList) => void;
  uploads: { url: string; type: string; name: string }[];
  onRemove: (idx: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files?.length) onUpload(e.dataTransfer.files);
    },
    [onUpload]
  );

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragging
            ? "border-violet-500 bg-violet-500/5"
            : "border-slate-700 bg-slate-900/30 hover:border-slate-600"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/20 to-purple-700/10 border border-violet-500/20 flex items-center justify-center">
            <Upload className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Videos (MP4, WebM) or Images (PNG, JPG, WebP) — Max 100MB
            </p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onUpload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Uploaded promo assets */}
      {uploads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {uploads.map((u, idx) => (
            <div
              key={idx}
              className="relative group rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900/40"
            >
              {u.type.startsWith("video") ? (
                <video
                  src={u.url}
                  className="w-full aspect-video object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={u.url}
                  alt={u.name}
                  className="w-full aspect-video object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <a
                  href={u.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => onRemove(idx)}
                  className="p-2 rounded-lg bg-red-600/30 text-red-300 hover:bg-red-600/50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2">
                <p className="text-[10px] text-slate-400 truncate">{u.name}</p>
                <p className="text-[9px] text-slate-600">
                  {u.type.startsWith("video") ? "Video" : "Image"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- SECTION TABS -----------------------------------------------------

const SECTIONS: {
  id: AssetSection;
  label: string;
  icon: React.ElementType;
  desc: string;
}[] = [
  {
    id: "transitions",
    label: "Transitions",
    icon: Film,
    desc: "Upload preview videos for transition presets",
  },
  {
    id: "beauty-tools",
    label: "Beauty Tools",
    icon: Sparkles,
    desc: "Manage beauty tool thumbnails",
  },
  {
    id: "promo",
    label: "Promo & Ads",
    icon: Megaphone,
    desc: "Upload promotional media assets",
  },
];

// --- STATS BAR --------------------------------------------------------

function StatsBar({
  presets,
  promoCount,
}: {
  presets: PresetMedia[];
  promoCount: number;
}) {
  const withVideo = presets.filter((p) => p.previewVideoUrl).length;
  const withoutVideo = presets.length - withVideo;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-600/5 border border-violet-500/20 p-4">
        <p className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">
          Total Transitions
        </p>
        <p className="text-2xl font-black text-white mt-1">{presets.length}</p>
      </div>
      <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-600/5 border border-emerald-500/20 p-4">
        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
          With Preview
        </p>
        <p className="text-2xl font-black text-emerald-300 mt-1">{withVideo}</p>
      </div>
      <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/20 p-4">
        <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
          Missing Preview
        </p>
        <p className="text-2xl font-black text-amber-300 mt-1">
          {withoutVideo}
        </p>
      </div>
      <div className="rounded-xl bg-gradient-to-br from-pink-500/10 to-rose-600/5 border border-pink-500/20 p-4">
        <p className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">
          Beauty Tools
        </p>
        <p className="text-2xl font-black text-pink-300 mt-1">
          {BEAUTY_TOOLS.length}
        </p>
      </div>
    </div>
  );
}

// --- MAIN PAGE --------------------------------------------------------

export default function PageBuilderPage() {
  const [section, setSection] = useState<AssetSection>("transitions");
  const [presets, setPresets] = useState<PresetMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);
  const [promoUploads, setPromoUploads] = useState<
    { url: string; type: string; name: string }[]
  >([]);
  const [promoUploading, setPromoUploading] = useState(false);

  // Load transition presets
  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/presets/media")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.presets)) setPresets(data.presets);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Upload video for a transition preset
  const handleTransitionUpload = async (presetId: string, file: File) => {
    setUploading(presetId);
    try {
      const { publicUrl } = await uploadToSupabase(file);

      // Update the preset source file via API
      const res = await fetch("/api/admin/presets/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId, previewVideoUrl: publicUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to save");
      }

      // Update local state
      setPresets((prev) =>
        prev.map((p) =>
          p.id === presetId ? { ...p, previewVideoUrl: publicUrl } : p
        )
      );
      setToast({
        msg: `Preview uploaded for "${presets.find((p) => p.id === presetId)?.name}"`,
        type: "ok",
      });
    } catch (err) {
      setToast({
        msg: err instanceof Error ? err.message : "Upload failed",
        type: "err",
      });
    } finally {
      setUploading(null);
    }
  };

  // Upload replacement beauty tool image
  const handleBeautyUpload = async (toolId: string, file: File) => {
    setUploading(toolId);
    try {
      const { publicUrl } = await uploadToSupabase(file);
      setToast({
        msg: `Uploaded image for "${toolId}". Supabase URL ready — replace the file in /img/beauty-tools/ to update the site.`,
        type: "ok",
      });
    } catch (err) {
      setToast({
        msg: err instanceof Error ? err.message : "Upload failed",
        type: "err",
      });
    } finally {
      setUploading(null);
    }
  };

  // Upload promo assets
  const handlePromoUpload = async (files: FileList) => {
    setPromoUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { publicUrl } = await uploadToSupabase(file);
        setPromoUploads((prev) => [
          ...prev,
          { url: publicUrl, type: file.type, name: file.name },
        ]);
      }
      setToast({
        msg: `${files.length} promo asset(s) uploaded`,
        type: "ok",
      });
    } catch (err) {
      setToast({
        msg: err instanceof Error ? err.message : "Upload failed",
        type: "err",
      });
    } finally {
      setPromoUploading(false);
    }
  };

  const handlePromoRemove = (idx: number) => {
    setPromoUploads((prev) => prev.filter((_, i) => i !== idx));
  };

  // Filter presets
  const categories = [
    "all",
    ...Array.from(new Set(presets.map((p) => p.category))),
  ];
  const filteredPresets = presets.filter((p) => {
    if (catFilter !== "all" && p.category !== catFilter) return false;
    if (
      search &&
      !p.name.toLowerCase().includes(search.toLowerCase()) &&
      !p.description.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-sm px-6 py-4">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/50">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-white leading-none">
                Media Asset Manager
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload previews, thumbnails & promotional media
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/apps/tool/transitions"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-cyan-300 hover:text-cyan-200 hover:bg-slate-800 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" /> View Transitions
            </a>
            <a
              href="/beauty2.html"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-pink-300 hover:text-pink-200 hover:bg-slate-800 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" /> View Beauty
            </a>
            <a
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-300 border border-slate-800 bg-slate-900/50 transition-colors"
            >
              ? Admin
            </a>
          </div>
        </div>
      </header>

      {/* --- BODY --- */}
      <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        <StatsBar presets={presets} promoCount={promoUploads.length} />

        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800/60 pb-0">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
                  isActive
                    ? "border-violet-500 text-violet-300"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* --- TRANSITIONS SECTION --- */}
        {section === "transitions" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search transitions..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder-slate-600"
                />
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/40 border border-slate-700 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCatFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      catFilter === cat
                        ? "bg-violet-600 text-white"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {cat === "all" ? "All" : cat.replace(/_/g, " ")}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-600">
                {filteredPresets.length} of {presets.length}
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse"
                  >
                    <div className="aspect-video bg-slate-800/60 rounded-t-xl" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-800/60 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPresets.map((preset) => (
                  <TransitionCard
                    key={preset.id}
                    preset={preset}
                    onUpload={handleTransitionUpload}
                    uploading={uploading}
                  />
                ))}
                {filteredPresets.length === 0 && (
                  <div className="col-span-full py-16 text-center">
                    <Film className="w-10 h-10 mx-auto text-slate-800 mb-3" />
                    <p className="text-sm text-slate-600">
                      No transitions match your filter
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- BEAUTY TOOLS SECTION --- */}
        {section === "beauty-tools" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Beauty Tool Thumbnails
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  These images show on the Beauty Studio card grid. Upload to
                  replace.
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {BEAUTY_TOOLS.length} tools active
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {BEAUTY_TOOLS.map((tool) => (
                <BeautyToolCard
                  key={tool.id}
                  tool={tool}
                  onUpload={handleBeautyUpload}
                  uploading={uploading}
                />
              ))}
            </div>
          </div>
        )}

        {/* --- PROMO SECTION --- */}
        {section === "promo" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Promotional Media
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Upload videos and images for ads, banners, and promotional
                  content across the site.
                </p>
              </div>
              {promoUploading && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-bold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />{" "}
                  Uploading...
                </div>
              )}
            </div>

            <PromoUploadZone
              onUpload={handlePromoUpload}
              uploads={promoUploads}
              onRemove={handlePromoRemove}
            />
          </div>
        )}
      </div>

      {/* --- TOAST --- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className={`fixed bottom-6 left-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-2xl shadow-black/40 border text-sm font-semibold ${
              toast.type === "ok"
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200"
                : "bg-red-950/90 border-red-500/30 text-red-200"
            }`}
          >
            {toast.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
            {toast.msg}
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
"use client";
