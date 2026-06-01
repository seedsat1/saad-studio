"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Languages,
  Link2,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";

type CaptionJobStatus = "queued" | "prepped" | "processing" | "completed" | "failed";

interface ReapJob {
  id: string;
  projectId: string;
  tool: "captions" | string;
  sourceUrl: string;
  status: CaptionJobStatus;
  error?: string | null;
  outputUrls: string[] | string | unknown;
  options: unknown;
  creditsCost: number;
  createdAt: string;
}

interface OptionItem {
  code: string;
  label: string;
}

interface CaptionStyle {
  id: string;
  label: string;
  sample: string;
  image?: string;
  accent: string;
  bg: string;
  textClass?: string;
  source?: string;
  preferences?: ReapPresetOption["preferences"];
}

interface ReapPresetOption {
  id: string;
  label: string;
  name?: string;
  source?: string;
  preferences?: {
    captionsPreset?: string;
    language?: string;
    translationLanguage?: string | null;
    transcriptionScript?: string;
    resolution?: number;
    enableEmojis?: boolean;
    enableHighlights?: boolean;
    addAudiogram?: boolean;
    addCaptions?: boolean;
    orientation?: string;
    genre?: string;
  } & Record<string, unknown>;
}

const FALLBACK_LANGUAGES: OptionItem[] = [
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic - العربية" },
  { code: "es", label: "Spanish - Español" },
  { code: "fr", label: "French - Français" },
  { code: "de", label: "German - Deutsch" },
  { code: "it", label: "Italian - Italiano" },
  { code: "pt", label: "Portuguese - Português" },
  { code: "tr", label: "Turkish - Türkçe" },
  { code: "hi", label: "Hindi - हिन्दी" },
  { code: "ur", label: "Urdu - اردو" },
  { code: "fa", label: "Persian - فارسی" },
  { code: "id", label: "Indonesian - Bahasa Indonesia" },
  { code: "ms", label: "Malay - Bahasa Melayu" },
  { code: "ja", label: "Japanese - 日本語" },
  { code: "ko", label: "Korean - 한국어" },
  { code: "zh", label: "Chinese - 中文" },
  { code: "ru", label: "Russian - Русский" },
  { code: "nl", label: "Dutch - Nederlands" },
  { code: "pl", label: "Polish - Polski" },
  { code: "sv", label: "Swedish - Svenska" },
  { code: "no", label: "Norwegian - Norsk" },
  { code: "da", label: "Danish - Dansk" },
  { code: "fi", label: "Finnish - Suomi" },
  { code: "el", label: "Greek - Ελληνικά" },
  { code: "he", label: "Hebrew - עברית" },
  { code: "th", label: "Thai - ไทย" },
  { code: "vi", label: "Vietnamese - Tiếng Việt" },
  { code: "uk", label: "Ukrainian - Українська" },
  { code: "ro", label: "Romanian - Română" },
  { code: "cs", label: "Czech - Čeština" },
  { code: "hu", label: "Hungarian - Magyar" },
];

const CAPTION_STYLES: CaptionStyle[] = [
  { id: "system_one_punch", label: "One Punch", sample: "ONE", accent: "text-yellow-300", bg: "bg-[#242424]" },
  { id: "system_mint", label: "Mint", sample: "One small step for man", image: "/studio-edit/media__1780238399522.png", accent: "text-lime-300", bg: "bg-[#222]" },
  { id: "system_vintage", label: "Vintage", sample: "small", accent: "text-stone-100", bg: "bg-[#252525]" },
  { id: "system_notes", label: "Notes", sample: "NOTE", accent: "text-yellow-200", bg: "bg-[#292929]" },
  { id: "system_impact", label: "Impact", sample: "ONE", accent: "text-white", bg: "bg-[#2b2b2b]", textClass: "font-black" },
  { id: "system_blue", label: "Blue", sample: "ONE SMALL STEP FOR MAN", accent: "text-sky-200", bg: "bg-[#2a2a2a]" },
  { id: "system_beasty", label: "Beasty", sample: "ONE SMALL STEP FOR MAN", image: "/studio-edit/media__1780238410827.png", accent: "text-yellow-300", bg: "bg-[#2c2c2c]", textClass: "italic font-black" },
  { id: "system_popline", label: "Popline", sample: "One small step for man", accent: "text-purple-300", bg: "bg-[#262626]" },
  { id: "system_deep_diver", label: "Deep Diver", sample: "One small step for man", image: "/studio-edit/media__1780241589749.png", accent: "text-slate-200", bg: "bg-[#303030]" },
  { id: "system_silka", label: "Silka", sample: "One small step for man", accent: "text-emerald-300", bg: "bg-[#252525]", textClass: "italic" },
  { id: "system_turban", label: "Turban", sample: "ONE SMALL STEP FOR MAN", accent: "text-violet-100", bg: "bg-[#262626]" },
  { id: "system_ember", label: "Ember", sample: "One", accent: "text-orange-400", bg: "bg-[#292929]" },
  { id: "system_indigo", label: "Indigo", sample: "One small step for man", accent: "text-indigo-200", bg: "bg-[#242437]", textClass: "font-black" },
  { id: "system_lumina", label: "Lumina", sample: "One", accent: "text-white", bg: "bg-[#303030]" },
  { id: "system_webster", label: "Webster", sample: "caption", accent: "text-red-200", bg: "bg-[#282828]" },
  { id: "system_pro_box", label: "Pro Box", sample: "One small step for man", accent: "text-white", bg: "bg-[#242424]" },
  { id: "system_ghost", label: "Ghost", sample: "ONE", accent: "text-white", bg: "bg-[#303030]" },
  { id: "system_orange", label: "Orange", sample: "ONE SMALL", accent: "text-orange-500", bg: "bg-[#272727]" },
  { id: "system_phantom", label: "Phantom", sample: "ONE SMALL", accent: "text-white", bg: "bg-[#2b2b2b]" },
  { id: "system_noah", label: "Noah", sample: "ONE SMALL STEP FOR MAN", accent: "text-white", bg: "bg-[#262626]", textClass: "italic" },
  { id: "system_pod_p", label: "Pod P", sample: "ONE SMALL STEP FOR MAN", accent: "text-fuchsia-300", bg: "bg-[#282828]" },
  { id: "system_youshaei", label: "Youshaei", sample: "One small step for man", accent: "text-emerald-300", bg: "bg-[#2b2b2b]" },
  { id: "system_spell", label: "Spell", sample: "ONE SMALL STEP FOR", accent: "text-purple-200", bg: "bg-[#303030]" },
  { id: "system_flipper", label: "Flipper", sample: "ONE SMALL STEP FOR MAN", accent: "text-yellow-950", bg: "bg-yellow-300" },
  { id: "system_ember_duo", label: "Ember Duo", sample: "One", accent: "text-orange-300", bg: "bg-[#282828]" },
  { id: "system_galaxy", label: "Galaxy", sample: "ONE", accent: "text-violet-300", bg: "bg-[#262642]" },
  { id: "system_playdate", label: "Playdate", sample: "One small step for man", accent: "text-orange-200", bg: "bg-[#303030]" },
  { id: "system_drive", label: "Drive", sample: "ONE SMALL STEP FOR", accent: "text-blue-300", bg: "bg-[#242424]" },
  { id: "system_popping", label: "Popping", sample: "ONE SMALL STEP FOR MAN", accent: "text-white", bg: "bg-[#303030]" },
  { id: "system_playfair", label: "Playfair", sample: "One small step for", accent: "text-stone-100", bg: "bg-[#2d2d2d]" },
];

const SCRIPT_OPTIONS = ["Native", "Latin", "Arabic", "Auto"];
const RESOLUTION_OPTIONS = ["720", "1080", "1440", "2160"];

const scriptToApiValue = (value: string) => value === "Latin" ? "roman" : "native";
const apiScriptToUiValue = (value?: string) => value === "roman" ? "Latin" : "Native";

export default function StudioEditPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videoUrl, setVideoUrl] = useState("");
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [language, setLanguage] = useState("en");
  const [translateTo, setTranslateTo] = useState("none");
  const [script, setScript] = useState("Native");
  const [resolution, setResolution] = useState("720");
  const [enableEmojis, setEnableEmojis] = useState(true);
  const [enableHighlights, setEnableHighlights] = useState(true);
  const [captionPreset, setCaptionPreset] = useState("system_mint");
  const [activeBrandTemplateId, setActiveBrandTemplateId] = useState<string | null>(null);
  const [styleTab, setStyleTab] = useState<"styles" | "brand">("styles");
  const [showStyleModal, setShowStyleModal] = useState(false);

  const [apiLanguages, setApiLanguages] = useState<OptionItem[]>([]);
  const [apiPresets, setApiPresets] = useState<ReapPresetOption[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ReapJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const languages = useMemo(() => {
    const merged = new Map<string, OptionItem>();
    FALLBACK_LANGUAGES.forEach((item) => merged.set(item.code, item));
    apiLanguages.forEach((item) => {
      if (item.code) merged.set(item.code, item);
    });
    return Array.from(merged.values()).sort((a, b) => {
      if (a.code === "ar") return -1;
      if (b.code === "ar") return 1;
      if (a.code === "en") return -1;
      if (b.code === "en") return 1;
      return a.label.localeCompare(b.label);
    });
  }, [apiLanguages]);

  const brandPresets = apiPresets.filter((preset) => preset.source && preset.source !== "system");
  const apiSystemPresets = apiPresets.filter((preset) => !preset.source || preset.source === "system");
  const captionStyles = mergeCaptionStyles(apiSystemPresets);
  const selectedStyle = captionStyles.find((style) => style.id === captionPreset) ?? CAPTION_STYLES[0];
  const selectedPresetLabel = apiPresets.find((preset) => preset.id === captionPreset)?.label ?? selectedStyle.label;
  const visibleStyles = captionStyles.slice(0, 4);
  const targetUrl = videoUrl.trim() || uploadedFileUrl;

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setJobs([]);
      return;
    }
    void fetchOptions();
    void fetchJobs();
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    if (!jobs.some((job) => job.status === "queued" || job.status === "processing")) return;
    const timer = window.setInterval(() => {
      void pollActiveJobs();
    }, 6000);
    return () => window.clearInterval(timer);
  }, [jobs]);

  async function fetchOptions() {
    try {
      setOptionsError(null);
      const res = await fetch("/api/studio-edit/languages", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        const message = typeof data.error === "string" ? data.error : `Options request failed with ${res.status}`;
        setOptionsError(`${res.status}: ${message}`);
        return;
      }
      if (Array.isArray(data.languages)) setApiLanguages(data.languages);
      if (Array.isArray(data.presets)) setApiPresets(data.presets);
    } catch (err) {
      setOptionsError((err as Error).message);
      console.error("Failed to fetch Reap options:", err);
    }
  }

  function applyBrandTemplate(preset: ReapPresetOption) {
    const prefs = preset.preferences ?? {};
    setActiveBrandTemplateId(preset.id);
    setCaptionPreset(preset.id);
    if (prefs.language) setLanguage(prefs.language);
    if (prefs.translationLanguage) setTranslateTo(prefs.translationLanguage);
    else setTranslateTo("none");
    if (prefs.transcriptionScript) setScript(apiScriptToUiValue(prefs.transcriptionScript));
    if (prefs.resolution) setResolution(String(prefs.resolution));
    if (typeof prefs.enableEmojis === "boolean") setEnableEmojis(prefs.enableEmojis);
    if (typeof prefs.enableHighlights === "boolean") setEnableHighlights(prefs.enableHighlights);
    toast.success(`${preset.label} template applied.`);
  }

  async function fetchJobs() {
    setLoadingJobs(true);
    try {
      const res = await fetch("/api/studio-edit/jobs");
      const data = await res.json();
      if (Array.isArray(data.jobs)) {
        setJobs(data.jobs.filter((job: ReapJob) => job.tool === "captions"));
      }
    } catch (err) {
      console.error("Failed to fetch caption jobs:", err);
    } finally {
      setLoadingJobs(false);
    }
  }

  async function pollActiveJobs() {
    let changed = false;
    for (const job of jobs.filter((item) => item.status === "queued" || item.status === "processing")) {
      try {
        const res = await fetch(`/api/studio-edit/status?projectId=${job.projectId}&generationId=${job.id}`);
        const data = await res.json();
        if (data.status && data.status !== job.status) changed = true;
      } catch (err) {
        console.error(`Failed polling caption job ${job.projectId}:`, err);
      }
    }
    if (changed) await fetchJobs();
  }

  async function uploadFile(file: File) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a video file.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadedFileUrl("");
    setUploadedFileName(file.name);

    try {
      const urlRes = await fetch("/api/studio/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          assetType: "video",
        }),
      });

      if (!urlRes.ok) throw new Error("Failed to generate upload URL");
      const { signedUrl, publicUrl } = await urlRes.json();

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signedUrl, true);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        setIsUploading(false);
        if (xhr.status === 200) {
          setUploadedFileUrl(publicUrl);
          setVideoUrl(publicUrl);
          toast.success("Video uploaded.");
        } else {
          toast.error(`Upload failed: ${xhr.statusText}`);
        }
      };
      xhr.onerror = () => {
        setIsUploading(false);
        toast.error("Upload network error.");
      };
      xhr.send(file);
    } catch (err) {
      setIsUploading(false);
      toast.error(err instanceof Error ? err.message : "Failed to upload video.");
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
  }

  async function handleDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUrl) {
      toast.error("Drop a video link or upload a file first.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/studio-edit/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "captions",
          sourceUrl: targetUrl,
          filename: uploadedFileName || `caption-${Date.now()}.mp4`,
          prompt: `Generate captions with ${selectedPresetLabel}`,
          options: {
            captionsPreset: captionPreset,
            language,
            translationLanguage: translateTo === "none" ? undefined : translateTo,
            transcriptionScript: scriptToApiValue(script),
            resolution: Number(resolution),
            enableEmojis,
            enableHighlights,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate captions.");

      toast.success("Caption project started.");
      setVideoUrl("");
      setUploadedFileUrl("");
      setUploadedFileName("");
      await fetchJobs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate captions.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="fixed inset-x-0 bottom-0 top-16 overflow-hidden bg-[#111] text-white">
      <style dangerouslySetInnerHTML={{ __html: `
        body > div.fixed.inset-0 button.overflow-hidden.rounded-xl.border.text-left.transition {
          height: 112px !important;
          display: flex !important;
          flex-direction: column !important;
        }

        body > div.fixed.inset-0 button.overflow-hidden.rounded-xl.border.text-left.transition > div:first-child {
          height: 76px !important;
          min-height: 76px !important;
          flex: 0 0 76px !important;
        }

        body > div.fixed.inset-0 button.overflow-hidden.rounded-xl.border.text-left.transition > div:last-child {
          height: 36px !important;
          min-height: 36px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 12px !important;
        }

        .caption-preview {
          display: inline-block;
          transform-origin: center;
          white-space: normal;
          will-change: transform, opacity, filter, text-shadow;
        }

        .caption-preview-pulse { animation: captionPreviewPulse 1.7s ease-in-out infinite; }
        .caption-preview-pop { animation: captionPreviewPop 1.35s cubic-bezier(.2,.8,.2,1) infinite; }
        .caption-preview-wavy { animation: captionPreviewWavy 1.8s ease-in-out infinite; }
        .caption-preview-glitch { animation: captionPreviewGlitch 1.1s steps(2, end) infinite; }
        .caption-preview-slide { animation: captionPreviewSlide 1.9s ease-in-out infinite; }
        .caption-preview-fade { animation: captionPreviewFade 1.8s ease-in-out infinite; }
        .caption-preview-typewriter {
          max-width: 13ch;
          overflow: hidden;
          white-space: nowrap;
          animation: captionPreviewType 2.4s steps(13, end) infinite;
        }
        .caption-preview-ticker {
          white-space: nowrap;
          animation: captionPreviewTicker 2.8s linear infinite;
        }
        .caption-preview-highlight {
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
          animation: captionPreviewHighlight 1.6s ease-in-out infinite;
        }

        @keyframes captionPreviewPulse {
          0%, 100% { transform: scale(1); opacity: .88; }
          50% { transform: scale(1.08); opacity: 1; }
        }

        @keyframes captionPreviewPop {
          0%, 100% { transform: scale(.94) rotate(-1deg); }
          45% { transform: scale(1.12) rotate(1deg); }
          70% { transform: scale(1.02); }
        }

        @keyframes captionPreviewWavy {
          0%, 100% { transform: translateY(0) skewX(0deg); }
          35% { transform: translateY(-5px) skewX(-5deg); }
          70% { transform: translateY(4px) skewX(5deg); }
        }

        @keyframes captionPreviewGlitch {
          0%, 100% { transform: translate(0, 0); filter: none; text-shadow: 2px 0 #06b6d4, -2px 0 #f43f5e; }
          20% { transform: translate(-2px, 1px); filter: contrast(1.4); }
          40% { transform: translate(2px, -1px); text-shadow: -2px 0 #06b6d4, 2px 0 #f43f5e; }
          60% { transform: translate(-1px, -1px); }
          80% { transform: translate(1px, 1px); }
        }

        @keyframes captionPreviewSlide {
          0%, 100% { transform: translateX(-8px); opacity: .45; }
          45% { transform: translateX(0); opacity: 1; }
          75% { transform: translateX(8px); opacity: .75; }
        }

        @keyframes captionPreviewFade {
          0%, 100% { opacity: .38; filter: blur(.8px); }
          50% { opacity: 1; filter: blur(0); }
        }

        @keyframes captionPreviewType {
          0%, 18% { width: 0; }
          58%, 82% { width: 13ch; }
          100% { width: 0; }
        }

        @keyframes captionPreviewTicker {
          0% { transform: translateX(42%); }
          100% { transform: translateX(-42%); }
        }

        @keyframes captionPreviewHighlight {
          0%, 100% { background: linear-gradient(transparent 60%, rgba(250, 204, 21, .2) 0); transform: scale(1); }
          50% { background: linear-gradient(transparent 42%, rgba(250, 204, 21, .85) 0); transform: scale(1.04); }
        }
      ` }} />
      <div className="mx-auto grid h-full w-full max-w-[1220px] grid-cols-[minmax(320px,430px)_minmax(300px,1fr)] gap-4 overflow-hidden px-4 py-4 lg:px-6">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <header className="shrink-0 text-center">
            <h1 className="text-base font-black tracking-tight sm:text-lg">
              Add <span className="text-cyan-400">Captions</span> to your reels, shorts & stories
            </h1>
          </header>

          <section className="shrink-0 space-y-2">
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Drop a video link"
                className="h-12 w-full rounded-full border border-white/15 bg-[#222] pl-12 pr-5 text-sm text-white outline-none transition focus:border-cyan-400/60"
              />
            </div>
            <p className="text-xs text-zinc-300">
              We recommend videos longer than <strong className="text-white">3 seconds</strong>. Arabic captions and translation are supported.
            </p>
          </section>

          <div className="flex shrink-0 items-center gap-4 text-sm font-bold text-white">
            <span className="h-px flex-1 bg-white/15" />
            Or
            <span className="h-px flex-1 bg-white/15" />
          </div>

          <section
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDraggingFile(false);
            }}
            onDrop={handleDrop}
            className={`flex min-h-[116px] shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-center transition ${
              isDraggingFile
                ? "border-cyan-300 bg-cyan-400/10"
                : "border-white/20 bg-[#151515] hover:border-cyan-400/50 hover:bg-[#181818]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={handleFileUpload}
              className="hidden"
            />
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                <div className="w-full max-w-xs rounded-full bg-zinc-800 p-1">
                  <div className="h-2 rounded-full bg-cyan-400 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-sm text-zinc-300">{uploadProgress}% uploaded</p>
              </>
            ) : uploadedFileUrl ? (
              <>
                <Check className="h-8 w-8 text-cyan-400" />
                <p className="text-sm font-semibold text-white">{uploadedFileName}</p>
                <p className="text-xs text-zinc-400">Uploaded and ready for captions</p>
              </>
            ) : (
              <>
                <Upload className="h-7 w-7 text-zinc-400" />
                <p className="text-sm text-zinc-300">Drop your video here or</p>
                <button
                  type="button"
                  className="rounded-full bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-2 text-sm font-black text-white"
                >
                  Browse files
                </button>
                <p className="text-xs text-zinc-400">Max. file 15 mins and 2 GB</p>
              </>
            )}
          </section>

          <section className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-[#171717] p-3">
            <div className="flex h-full flex-col gap-4 overflow-hidden">
            <div className="border-b border-white/10">
              <div className="flex gap-8 text-sm font-bold">
                <button
                  type="button"
                  onClick={() => setStyleTab("styles")}
                  className={`border-b px-0 pb-3 transition ${
                    styleTab === "styles" ? "border-white text-white" : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  Caption styles
                </button>
                <button
                  type="button"
                  onClick={() => setStyleTab("brand")}
                  className={`border-b px-0 pb-3 transition ${
                    styleTab === "brand" ? "border-white text-white" : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  Brand templates
                </button>
              </div>
            </div>

            {styleTab === "styles" ? (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {visibleStyles.map((style) => (
                    <StyleCard
                      key={style.id}
                      style={style}
                    selected={captionPreset === style.id}
                    onSelect={() => {
                      setActiveBrandTemplateId(null);
                      setCaptionPreset(style.id);
                    }}
                  />
                  ))}
                </div>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowStyleModal(true)}
                    className="rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-white transition hover:border-cyan-400 hover:text-cyan-300"
                  >
                    More Styles
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                {brandPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyBrandTemplate(preset)}
                    className={`h-28 w-36 overflow-hidden rounded-xl border bg-[#222] text-left transition hover:border-cyan-300 ${
                      activeBrandTemplateId === preset.id ? "border-cyan-400" : "border-white/10"
                    }`}
                  >
                    <div className="flex h-20 items-center justify-center gap-2 text-xs text-white">
                      <span className="rounded border border-white/70 px-1.5 py-2" />
                      <span className="font-black">{preset.preferences?.resolution ?? 720}</span>
                      <span className="rounded bg-white px-1 text-[10px] font-black text-black">CC</span>
                    </div>
                    <div className="bg-white/15 py-2 text-center text-xs font-black">{preset.label}</div>
                  </button>
                ))}
                {optionsError ? (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
                    Reap presets request failed: {optionsError}
                  </div>
                ) : brandPresets.length === 0 && (
                  <div className="rounded-xl border border-white/10 bg-[#202020] px-4 py-3 text-xs text-zinc-400">
                    No Reap brand templates returned yet.
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void fetchOptions()}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:border-cyan-400 hover:text-cyan-300"
                >
                  Refresh presets
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            )}
            </div>
          </section>
        </form>

        <aside className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <section className="grid shrink-0 gap-4 rounded-2xl bg-[#242424] p-5 sm:grid-cols-2">
            <SelectField label="Language" value={language} onChange={setLanguage} items={languages} />
            <SelectField
              label="Translate to"
              value={translateTo}
              onChange={setTranslateTo}
              items={[{ code: "none", label: "None" }, ...languages]}
            />
            <SelectField
              label="Script"
              value={script}
              onChange={setScript}
              items={SCRIPT_OPTIONS.map((item) => ({ code: item, label: item }))}
            />
            <SelectField
              label="Resolution"
              value={resolution}
              onChange={setResolution}
              items={RESOLUTION_OPTIONS.map((item) => ({ code: item, label: item }))}
            />
          </section>

          <div className="space-y-3">
            <ToggleRow label="Add Emoji" value={enableEmojis} onChange={setEnableEmojis} suffix="😍" />
            <ToggleRow label="Add Word Highlight" value={enableHighlights} onChange={setEnableHighlights} highlight />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || isUploading}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-teal-400 px-6 py-3 text-sm font-black text-white shadow-lg shadow-cyan-950/40 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Captions
            </button>
          </div>

        <section className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#171717]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-sm font-black">Caption projects</h2>
              <p className="text-xs text-zinc-400">Recent caption renders and outputs</p>
            </div>
            <button
              type="button"
              onClick={() => void fetchJobs()}
              className="rounded-full border border-white/10 p-2 text-zinc-400 transition hover:border-cyan-400 hover:text-cyan-300"
              aria-label="Refresh caption jobs"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loadingJobs ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading captions...
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-zinc-400">
              <FileText className="h-7 w-7 text-zinc-600" />
              No caption projects yet.
            </div>
          ) : (
            <div className="max-h-full divide-y divide-white/10 overflow-y-auto">
              {jobs.map((job) => {
                const outputs = normalizeOutputs(job.outputUrls);
                return (
                  <div key={job.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{job.sourceUrl.split("/").pop() || "caption-video.mp4"}</p>
                      <p className="text-xs text-zinc-500">{new Date(job.createdAt).toLocaleString()} · {job.creditsCost} credits</p>
                      {job.error && <p className="mt-1 truncate text-xs text-rose-400">{job.error}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={job.status} />
                      {outputs.map((url, index) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-cyan-400 px-3 py-1.5 text-xs font-black text-black"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          Output {index + 1}
                        </a>
                      ))}
                      <a
                        href={job.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white"
                      >
                        Source
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        </aside>
      </div>

      {showStyleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="flex max-h-[82vh] w-full max-w-[760px] flex-col rounded-2xl border border-white/15 bg-[#171717] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h3 className="text-sm font-black">Caption styles</h3>
                <div className="mt-4 h-px w-28 bg-white" />
              </div>
              <button
                type="button"
                onClick={() => setShowStyleModal(false)}
                className="rounded-full border border-white/10 p-2 text-zinc-400 hover:text-white"
                aria-label="Close caption styles"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 overflow-y-auto p-5 sm:grid-cols-2 md:grid-cols-3">
              {captionStyles.map((style) => (
                <StyleCard
                  key={style.id}
                  style={style}
                  selected={captionPreset === style.id}
                  onSelect={() => {
                    setActiveBrandTemplateId(null);
                    setCaptionPreset(style.id);
                  }}
                  compact
                />
              ))}
              {apiSystemPresets
                .filter((preset) => !captionStyles.some((style) => style.id === preset.id))
                .map((preset) => (
                  <StyleCard
                    key={preset.id}
                    style={{
                      id: preset.id,
                      label: preset.label,
                      sample: preset.label,
                      accent: "text-cyan-200",
                      bg: "bg-[#282828]",
                    }}
                    selected={captionPreset === preset.id}
                    onSelect={() => {
                      setActiveBrandTemplateId(null);
                      setCaptionPreset(preset.id);
                    }}
                    compact
                  />
                ))}
            </div>
            <div className="flex justify-end border-t border-white/10 p-5">
              <button
                type="button"
                onClick={() => setShowStyleModal(false)}
                className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black"
              >
                Select Style
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StyleCard({
  style,
  selected,
  onSelect,
  compact = false,
}: {
  style: CaptionStyle;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const animationClass = getPreviewAnimationClass(style);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`overflow-hidden rounded-xl border text-left transition ${compact ? "h-28" : ""} ${
        selected ? "border-cyan-400 shadow-[0_0_0_1px_rgba(34,211,238,0.6)]" : "border-white/10 hover:border-white/30"
      }`}
      style={compact ? { height: 112 } : undefined}
    >
      <div
        className={`relative flex ${compact ? "h-[76px]" : "h-28"} items-center justify-center ${style.bg}`}
        style={compact ? { height: 76 } : undefined}
      >
        {style.image && !compact ? (
          <img src={style.image} alt="" className="h-full w-full object-cover opacity-80" />
        ) : (
          <span className={`caption-preview ${animationClass} max-w-[85%] text-center text-xs uppercase leading-tight ${style.accent} ${style.textClass ?? "font-black"}`}>
            {style.sample}
          </span>
        )}
        {style.preferences && (
          <div className="absolute left-2 top-2 flex max-w-[calc(100%-3rem)] flex-wrap gap-1">
            {style.preferences.resolution ? (
              <span className="rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-black text-white">{style.preferences.resolution}</span>
            ) : null}
            {style.preferences.orientation ? (
              <span className="rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-black capitalize text-white">{String(style.preferences.orientation)}</span>
            ) : null}
            {style.preferences.addAudiogram ? (
              <span className="rounded bg-cyan-400/90 px-1.5 py-0.5 text-[9px] font-black text-black">Audio</span>
            ) : null}
          </div>
        )}
        {selected && (
          <span className="absolute right-2 top-2 rounded-full bg-cyan-400 p-1 text-black">
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className={`${compact ? "h-9 py-2 text-xs" : "py-2 text-xs"} bg-[#101010] px-2 text-center font-black text-white`}>
        {style.label}
      </div>
    </button>
  );
}

function getPreviewAnimationClass(style: CaptionStyle): string {
  const key = `${style.id} ${style.label}`.toLowerCase();
  if (key.includes("glitch")) return "caption-preview-glitch";
  if (key.includes("wavy") || key.includes("wiggle") || key.includes("squiggly")) return "caption-preview-wavy";
  if (key.includes("pop") || key.includes("impact") || key.includes("beasty")) return "caption-preview-pop";
  if (key.includes("typewriter")) return "caption-preview-typewriter";
  if (key.includes("ticker") || key.includes("kinetic")) return "caption-preview-ticker";
  if (key.includes("ghost") || key.includes("lumina") || key.includes("deep")) return "caption-preview-fade";
  if (key.includes("drive") || key.includes("slide") || key.includes("flipper")) return "caption-preview-slide";
  if (key.includes("highlight") || key.includes("notes") || key.includes("headline")) return "caption-preview-highlight";
  return "caption-preview-pulse";
}

function SelectField({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: OptionItem[];
}) {
  return (
    <label className="space-y-2">
      <span className="flex items-center gap-2 text-sm font-black text-white">
        {label === "Language" || label === "Translate to" ? <Languages className="h-4 w-4 text-cyan-300" /> : null}
        {label}
      </span>
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-[#181818] px-4 pr-10 text-sm font-bold text-white outline-none transition focus:border-cyan-400"
        >
          {items.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      </span>
    </label>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  suffix,
  highlight,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-xl bg-[#242424] px-5 py-4 text-left"
    >
      <span className="text-sm font-black text-white">
        {label} {suffix && <span>{suffix}</span>} {highlight && <span className="border-b-2 border-yellow-300">Highlight</span>}
      </span>
      <span className={`flex h-6 w-11 items-center rounded-full p-1 transition ${value ? "bg-sky-500" : "bg-zinc-700"}`}>
        <span className={`h-4 w-4 rounded-full bg-white transition ${value ? "translate-x-5" : "translate-x-0"}`} />
      </span>
    </button>
  );
}

function StatusBadge({ status }: { status: CaptionJobStatus }) {
  const classes =
    status === "completed"
      ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/20"
      : status === "failed"
        ? "bg-rose-400/10 text-rose-300 border-rose-400/20"
        : "bg-amber-400/10 text-amber-300 border-amber-400/20";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-black capitalize ${classes}`}>
      {(status === "queued" || status === "processing") && <Loader2 className="h-3 w-3 animate-spin" />}
      {status}
    </span>
  );
}

function mergeCaptionStyles(apiPresets: ReapPresetOption[]): CaptionStyle[] {
  const fallback = new Map(CAPTION_STYLES.map((style) => [style.id, style]));
  const styles = new Map<string, CaptionStyle>();
  for (const preset of apiPresets) {
    const local = fallback.get(preset.id);
    styles.set(preset.id, {
      id: preset.id,
      label: preset.label,
      sample: local?.sample ?? preset.label,
      image: local?.image,
      accent: local?.accent ?? "text-cyan-200",
      bg: local?.bg ?? "bg-[#282828]",
      textClass: local?.textClass,
      source: preset.source,
      preferences: preset.preferences,
    });
  }
  for (const style of CAPTION_STYLES) {
    if (!styles.has(style.id)) styles.set(style.id, style);
  }
  return Array.from(styles.values());
}

function normalizeOutputs(value: ReapJob["outputUrls"]): string[] {
  if (typeof value === "string" && value) return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  return [];
}
