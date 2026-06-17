"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Upload,
  Type,
  Languages,
  Maximize2,
  FileText,
  Video,
  Play,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  ArrowRight,
  HelpCircle,
  Cpu,
  Zap,
  Globe,
  Activity,
  Trash2,
  Plus,
  Search,
  Music,
  Settings,
  Layers,
  History
} from "lucide-react";
import { FloatingParticles } from "@/components/FloatingParticles";

const FALLBACK_LANGUAGES = [
  { code: "en-US", label: "English (United States)" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "ar-SA", label: "Arabic (Saudi Arabia)" },
  { code: "ar-EG", label: "Arabic (Egypt)" },
  { code: "es-ES", label: "Spanish (Spain)" },
  { code: "es-MX", label: "Spanish (Mexico)" },
  { code: "fr-FR", label: "French (France)" },
  { code: "fr-CA", label: "French (Canada)" },
  { code: "de-DE", label: "German (Germany)" },
  { code: "it-IT", label: "Italian (Italy)" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "pt-PT", label: "Portuguese (Portugal)" },
  { code: "ru-RU", label: "Russian (Russia)" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "zh-TW", label: "Chinese (Traditional)" },
  { code: "ja-JP", label: "Japanese (Japan)" },
  { code: "ko-KR", label: "Korean (South Korea)" },
  { code: "tr-TR", label: "Turkish (Turkey)" },
  { code: "hi-IN", label: "Hindi (India)" },
  { code: "nl-NL", label: "Dutch (Netherlands)" },
  { code: "sv-SE", label: "Swedish (Sweden)" },
  { code: "pl-PL", label: "Polish (Poland)" },
  { code: "id-ID", label: "Indonesian (Indonesia)" },
  { code: "vi-VN", label: "Vietnamese (Vietnam)" },
  { code: "th-TH", label: "Thai (Thailand)" },
  { code: "he-IL", label: "Hebrew (Israel)" },
  { code: "el-GR", label: "Greek (Greece)" },
  { code: "ro-RO", label: "Romanian (Romania)" },
  { code: "da-DK", label: "Danish (Denmark)" },
  { code: "fi-FI", label: "Finnish (Finland)" },
  { code: "no-NO", label: "Norwegian (Norway)" },
  { code: "cs-CZ", label: "Czech (Czechia)" },
  { code: "hu-HU", label: "Hungarian (Hungary)" },
  { code: "uk-UA", label: "Ukrainian (Ukraine)" }
];

type ToolType = "captions" | "dubbing" | "reframe" | "transcription" | "edit-videos" | "audiogram";

interface ReapCatalogItem {
  id?: string;
  code?: string;
  label: string;
}

interface CatalogState {
  languages: ReapCatalogItem[];
  dubbingSourceLanguages: ReapCatalogItem[];
  dubbingLanguages: ReapCatalogItem[];
  captionPresets: ReapCatalogItem[];
  brandTemplates: ReapCatalogItem[];
  loading: boolean;
}

const TOOL_DETAILS: Record<ToolType, {
  title: string;
  desc: string;
  cost: number;
  icon: any;
  color: string;
  illustration: string;
  features: string[];
}> = {
  "captions": {
    title: "AI Captions",
    desc: "Add eye-catching, animated captions & subtitles to your video in 98+ languages.",
    cost: 50,
    icon: Type,
    color: "from-cyan-500 to-blue-500",
    illustration: "/ai_captions.png",
    features: [
      "Auto-generated captions perfectly synced with speech",
      "Over 20 premium designed caption styles and animation presets",
      "Multi-language support for 98+ global languages"
    ]
  },
  "dubbing": {
    title: "AI Dubbing",
    desc: "Dub your video voices instantly into other languages with natural voice synthesis.",
    cost: 120,
    icon: Languages,
    color: "from-indigo-500 to-purple-500",
    illustration: "/ai_dubbing.png",
    features: [
      "Translate and dub human voices with highly realistic AI voiceovers",
      "Preserves original speaker's vocal tone and expression",
      "Seamless cross-language synchronization"
    ]
  },
  "reframe": {
    title: "Auto Reframe",
    desc: "Intelligently crop your video for different formats (vertical TikTok, square Insta, etc.).",
    cost: 80,
    icon: Maximize2,
    color: "from-pink-500 to-rose-500",
    illustration: "/ai_reframe.png",
    features: [
      "AI focal point tracker dynamically reframes video to vertical",
      "One-click aspect ratio conversions (9:16, 1:1, 16:9)",
      "Perfect for repurposing landscape videos into short-form content"
    ]
  },
  "transcription": {
    title: "Transcription",
    desc: "Transcribe audio & video into highly accurate text transcripts.",
    cost: 30,
    icon: FileText,
    color: "from-emerald-500 to-teal-500",
    illustration: "/ai_captions.png",
    features: [
      "99% accurate speech-to-text transcription for various languages",
      "Generate downloadable subtitle and script files (TXT, SRT, VTT)",
      "Smart speaker separation and silence detection"
    ]
  },
  "edit-videos": {
    title: "AI Video Editor",
    desc: "Provide text instructions to edit, merge, clip or tweak your video dynamically.",
    cost: 150,
    icon: Video,
    color: "from-amber-500 to-orange-500",
    illustration: "/ai_reframe.png",
    features: [
      "Smart edits using natural text prompts without timeline complexity",
      "Auto-clip highlights and extract engaging moments from long videos",
      "Intelligent transitions and camera angle selections"
    ]
  },
  "audiogram": {
    title: "Audiograms",
    desc: "Convert audio-only podcasts and voice tracks into engaging social media videos with waveforms.",
    cost: 80,
    icon: Music,
    color: "from-violet-500 to-fuchsia-500",
    illustration: "/ai_captions.png",
    features: [
      "Dynamic audio visualizer waveform synced with sound",
      "Branded logo and background overlay images",
      "Fully synced captions and progress bar visualizer"
    ]
  }
};

const STEPS = [
  {
    num: "01",
    title: "Select Tool",
    desc: "Choose one of the 5 AI-powered tools to process your media.",
    icon: Cpu,
  },
  {
    num: "02",
    title: "Upload Media",
    desc: "Drag and drop your MP4/MP3 file into the upload zone.",
    icon: Upload,
  },
  {
    num: "03",
    title: "Customize Options",
    desc: "Set languages, aspect ratios, or custom preset styles.",
    icon: Globe,
  },
  {
    num: "04",
    title: "Generate & Save",
    desc: "Process and download your finalized post-production file.",
    icon: Zap,
  }
];

export default function ClipCraftStudioPage() {
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();

  const [activeTool, setActiveTool] = useState<ToolType>("captions");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form options
  const [language, setLanguage] = useState("auto");
  const [sourceLang, setSourceLang] = useState("en-US");
  const [targetLang, setTargetLang] = useState("es-ES");
  const [captionStyle, setCaptionStyle] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [editPrompt, setEditPrompt] = useState("");
  const [brandTemplateId, setBrandTemplateId] = useState("");

  // Audiogram form options
  const [waveformTemplate, setWaveformTemplate] = useState("wave");
  const [audiogramOrientation, setAudiogramOrientation] = useState("square");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploadId, setLogoUploadId] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundUploadId, setBackgroundUploadId] = useState("");
  const [backgroundUploading, setBackgroundUploading] = useState(false);

  // Genre and advanced edits
  const [genre, setGenre] = useState("talking");
  const [enableFaceTracking, setEnableFaceTracking] = useState(false);
  const [enableAutoHooks, setEnableAutoHooks] = useState(false);

  // Advanced captions & link options
  const [sourceUrl, setSourceUrl] = useState("");
  const [translateTo, setTranslateTo] = useState("none");
  const [transcriptionScript, setTranscriptionScript] = useState<"native" | "roman">("native");
  const [resolution, setResolution] = useState(720);
  const [enableEmojis, setEnableEmojis] = useState(true);
  const [enableHighlights, setEnableHighlights] = useState(true);
  const [activeStyleTab, setActiveStyleTab] = useState<"presets" | "brands">("presets");

  // Reframe & clipping advanced options
  const [disableAutoSplit, setDisableAutoSplit] = useState(false);
  const [reframeClips, setReframeClips] = useState(false);
  const [exportOrientation, setExportOrientation] = useState("landscape");
  const [exportResolution, setExportResolution] = useState(720);
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [topics, setTopics] = useState("");
  const [clipDurations, setClipDurations] = useState<Array<[number, number]>>([]);

  // Interactive design canvas states
  const [canvasText, setCanvasText] = useState("Double-click to edit this caption text!");
  const [canvasFont, setCanvasFont] = useState("Montserrat");
  const [canvasFontSize, setCanvasFontSize] = useState(28);
  const [canvasTextColor, setCanvasTextColor] = useState("#ffffff");
  const [canvasBgColor, setCanvasBgColor] = useState("#06b6d4");
  const [canvasYPosition, setCanvasYPosition] = useState(75);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);

  // Clips Dashboard state
  const [clipsList, setClipsList] = useState<Array<{ id: string; url: string; label: string; status: "Draft" | "Scheduled" | "Published" }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showHooksModal, setShowHooksModal] = useState(false);
  const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null);

  // History state
  const [historyList, setHistoryList] = useState<Array<{ id: string; prompt: string; projectId: string; outputUrl: string; model: string; cost: number; createdAt: string }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Loading, polling & results
  const [status, setStatus] = useState<"idle" | "uploading" | "queued" | "processing" | "completed" | "failed">("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Result output
  const [resultUrl, setResultUrl] = useState("");
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<any>(null);

  // Catalog data from backend
  const [catalog, setCatalog] = useState<CatalogState>({
    languages: [],
    dubbingSourceLanguages: [],
    dubbingLanguages: [],
    captionPresets: [],
    brandTemplates: [],
    loading: true,
  });

  const combinedCaptionPresets = useMemo(() => {
    const defaultNew = [
      { id: "system_candy", label: "Candy 🍭 (NEW)" },
      { id: "system_glitch", label: "Glitch 👾 (NEW)" },
      { id: "system_prism", label: "Prism 🌈 (NEW)" },
      { id: "system_ticker", label: "Ticker 📰 (NEW)" },
      { id: "system_trophy", label: "Trophy 🏆 (NEW)" },
      { id: "system_typewriter", label: "Typewriter ⌨️ (NEW)" },
      { id: "system_wavy", label: "Wavy 🌊 (NEW)" },
      { id: "system_wiggle", label: "Wiggle 💃 (NEW)" },
    ];
    const existing = catalog.captionPresets;
    const ids = new Set(existing.map(p => p.id));
    const merged = [...existing];
    for (const item of defaultNew) {
      if (!ids.has(item.id)) {
        merged.push(item);
      }
    }
    return merged;
  }, [catalog.captionPresets]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setLogoFile(f);
      setLogoUploading(true);
      setError("");
      try {
        const urlRes = await fetch("/api/clipcraft/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: f.name }),
        });
        const urlData = await urlRes.json().catch(() => ({}));
        if (!urlRes.ok || !urlData.uploadId || !urlData.uploadUrl) {
          throw new Error(urlData.error || "Failed to generate logo upload URL.");
        }
        const uploadRes = await fetch(urlData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": f.type || "image/png" },
          body: f,
        });
        if (!uploadRes.ok) throw new Error("Logo upload failed.");
        setLogoUploadId(urlData.uploadId);
      } catch (err: any) {
        console.error("Logo upload error:", err);
        setError("Logo upload failed: " + err.message);
      } finally {
        setLogoUploading(false);
      }
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setBackgroundFile(f);
      setBackgroundUploading(true);
      setError("");
      try {
        const urlRes = await fetch("/api/clipcraft/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: f.name }),
        });
        const urlData = await urlRes.json().catch(() => ({}));
        if (!urlRes.ok || !urlData.uploadId || !urlData.uploadUrl) {
          throw new Error(urlData.error || "Failed to generate bg upload URL.");
        }
        const uploadRes = await fetch(urlData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": f.type || "image/png" },
          body: f,
        });
        if (!uploadRes.ok) throw new Error("Background upload failed.");
        setBackgroundUploadId(urlData.uploadId);
      } catch (err: any) {
        console.error("Background upload error:", err);
        setError("Background upload failed: " + err.message);
      } finally {
        setBackgroundUploading(false);
      }
    }
  };

  const handleDuplicateClip = (clipId: string) => {
    const clipToDup = clipsList.find(c => c.id === clipId);
    if (!clipToDup) return;
    const newClip = {
      ...clipToDup,
      id: `clip-dup-${Date.now()}`,
      label: `${clipToDup.label} (Copy)`
    };
    const idx = clipsList.findIndex(c => c.id === clipId);
    const updated = [...clipsList];
    updated.splice(idx + 1, 0, newClip);
    setClipsList(updated);
  };

  const handleDeleteClip = (clipId: string) => {
    setClipsList(clipsList.filter(c => c.id !== clipId));
  };

  const handleChangeClipStatus = (clipId: string, newStatus: "Draft" | "Scheduled" | "Published") => {
    setClipsList(clipsList.map(c => c.id === clipId ? { ...c, status: newStatus } : c));
  };

  const getSuggestedHooksForClip = (clipLabel: string) => {
    return [
      `🚨 STOP scrolling if you want to master ${activeTool === "audiogram" ? "audio podcasting" : "video content"}!`,
      `Here is the 1 mistake you are making with your ${activeTool} workflow...`,
      `The secret formula to automate ${activeTool === "captions" ? "subtitles" : "post-production"} in 2026.`,
      `I spent hours editing, but then this AI tool did it in 5 seconds 🤯`
    ];
  };

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch("/api/clipcraft/history");
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLoadPastProject = async (projectId: string, generationId: string, prompt: string, model: string) => {
    if (!projectId) return;
    setError("");
    setResultUrl("");
    setResultUrls([]);
    setMetadata(null);
    setProgress(null);
    setStatus("processing");
    setActiveTool(model as ToolType);
    
    try {
      const statusRes = await fetch(
        `/api/clipcraft/status?projectId=${projectId}&generationId=${generationId}`
      );
      const statusData = await statusRes.json().catch(() => ({}));
      if (!statusRes.ok) {
        throw new Error(statusData.error || "Failed to load project details.");
      }
      if (statusData.status === "completed") {
        setStatus("completed");
        setResultUrl(statusData.url || "");
        const urls = statusData.urls || (statusData.url ? [statusData.url] : []);
        setResultUrls(urls);
        setMetadata(statusData.metadata || null);
        setClipsList(
          urls.map((url: string, i: number) => ({
            id: `clip-${i}-${Date.now()}`,
            url,
            label: `Clip #${i + 1}`,
            status: "Draft" as const,
          }))
        );
      } else if (statusData.status === "failed") {
        setStatus("failed");
        setError(statusData.error || "Project failed.");
      } else {
        setStatus(statusData.status || "processing");
        let finished = false;
        let attempts = 0;
        while (!finished && attempts < 60) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          attempts++;
          const statusRes = await fetch(
            `/api/clipcraft/status?projectId=${projectId}&generationId=${generationId}`
          );
          const statusData = await statusRes.json().catch(() => ({}));
          if (!statusRes.ok) throw new Error(statusData.error || "Status check failed.");
          if (statusData.status === "completed") {
            finished = true;
            setStatus("completed");
            setResultUrl(statusData.url || "");
            const urls = statusData.urls || (statusData.url ? [statusData.url] : []);
            setResultUrls(urls);
            setMetadata(statusData.metadata || null);
            setClipsList(
              urls.map((url: string, i: number) => ({
                id: `clip-${i}-${Date.now()}`,
                url,
                label: `Clip #${i + 1}`,
                status: "Draft" as const,
              }))
            );
          } else if (statusData.status === "failed") {
            finished = true;
            setStatus("failed");
            setError(statusData.error || "Automation failed.");
          } else if (statusData.status === "processing") {
            setStatus("processing");
            if (typeof statusData.progress === "number") setProgress(statusData.progress);
          } else if (statusData.status === "queued") {
            setStatus("queued");
          }
        }
      }
    } catch (err: any) {
      setStatus("failed");
      setError(err.message || "Failed to load past project.");
    }
  };

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch("/api/clipcraft/catalog");
        if (!res.ok) throw new Error("Failed to load catalog data.");
        const data = await res.json();
        const langs = data?.languages?.items || [];
        const dubSrc = data?.dubbingSourceLanguages?.items || [];
        const dubTgt = data?.dubbingLanguages?.items || [];
        const presets = data?.captionPresets?.items || [];
        const brands = data?.brandTemplates?.items || [];

        setCatalog({
          languages: langs,
          dubbingSourceLanguages: dubSrc,
          dubbingLanguages: dubTgt,
          captionPresets: presets,
          brandTemplates: brands,
          loading: false,
        });

        // Set default values if available
        if (presets.length) {
          setCaptionStyle(presets[0].id);
        }
        if (dubSrc.length) {
          setSourceLang(dubSrc[0].code || dubSrc[0].id || "en-US");
        }
        if (dubTgt.length) {
          setTargetLang(dubTgt[0].code || dubTgt[0].id || "es-ES");
        }
      } catch (err) {
        console.error("Catalog load error:", err);
        setCatalog((prev) => ({ ...prev, loading: false }));
      }
    }
    void loadCatalog();
    void loadHistory();
  }, []);

  const toolCost = useMemo(() => TOOL_DETAILS[activeTool].cost, [activeTool]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Upload and run automation
  const handleGenerate = async () => {
    if (!file && !sourceUrl.trim()) {
      setError("Please select a video/audio file or paste a media link first.");
      return;
    }

    setError("");
    setResultUrl("");
    setResultUrls([]);
    setMetadata(null);
    setProgress(null);

    // Verify credits via generation gate
    const gate = await guardGeneration({
      requiredCredits: toolCost,
      action: `clipcraft:${activeTool}`,
    });
    if (!gate.ok) {
      if (gate.reason === "error") {
        setError(gate.message ?? getSafeErrorMessage(gate.message));
      }
      return;
    }

    setStatus("uploading");

    try {
      let uploadId = "";
      let filename = "";

      if (sourceUrl.trim()) {
        filename = sourceUrl.split("/").pop() || "media.mp4";
      } else if (file) {
        filename = file.name;
        // 1. Get presigned upload URL
        const urlRes = await fetch("/api/clipcraft/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name }),
        });
        const urlData = await urlRes.json().catch(() => ({}));
        if (!urlRes.ok || !urlData.uploadId || !urlData.uploadUrl) {
          throw new Error(urlData.error || "Failed to generate upload URL.");
        }

        // 2. Upload file directly to S3
        const uploadRes = await fetch(urlData.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "video/mp4",
          },
          body: file,
        });
        if (!uploadRes.ok) {
          throw new Error("Direct upload failed.");
        }
        uploadId = urlData.uploadId;
      }

      // 3. Configure options based on active tool
      const options: Record<string, any> = {};
      if (activeTool === "captions") {
        if (language !== "auto") {
          options.language = language;
        }
        options.captionsPreset = captionStyle || brandTemplateId || "system_beasty";
        if (translateTo && translateTo !== "none") {
          options.translationLanguage = translateTo;
        }
        options.transcriptionScript = transcriptionScript;
        options.resolution = resolution;
        options.enableEmojis = enableEmojis;
        options.enableHighlights = enableHighlights;
      } else if (activeTool === "dubbing") {
        options.sourceLanguage = sourceLang;
        options.targetLanguage = targetLang;
      } else if (activeTool === "reframe") {
        options.orientation = aspectRatio === "1:1" ? "square" : "portrait";
        options.genre = genre;
        options.disableAutoSplit = disableAutoSplit;
      } else if (activeTool === "transcription") {
        if (language !== "auto") {
          options.language = language;
        }
        if (translateTo && translateTo !== "none") {
          options.translationLanguage = translateTo;
        }
        options.transcriptionScript = transcriptionScript;
      } else if (activeTool === "edit-videos") {
        options.prompt = editPrompt;
        options.reframeClips = reframeClips;
        options.exportOrientation = exportOrientation;
        options.exportResolution = exportResolution;
        if (captionStyle || brandTemplateId) {
          options.captionsPreset = captionStyle || brandTemplateId;
        }
        options.enableEmojis = enableEmojis;
        options.enableHighlights = enableHighlights;
        if (language !== "auto") {
          options.language = language;
        }
        if (translateTo && translateTo !== "none") {
          options.translationLanguage = translateTo;
        }
        options.transcriptionScript = transcriptionScript;
        options.genre = genre;
        if (selectedStart) {
          options.selectedStart = Number(selectedStart);
        }
        if (selectedEnd) {
          options.selectedEnd = Number(selectedEnd);
        }
        if (clipDurations.length > 0) {
          options.clipDurations = clipDurations;
        }
        if (topics.trim()) {
          options.topics = topics.split(",").map(t => t.trim()).filter(Boolean);
        }
      } else if (activeTool === "audiogram") {
        if (language !== "auto") {
          options.language = language;
        }
        options.orientation = audiogramOrientation;
        options.templateId = waveformTemplate;
        options.captionsPreset = captionStyle || brandTemplateId || undefined;
        if (logoUploadId) {
          options.logoUploadId = logoUploadId;
        }
        if (backgroundUploadId) {
          options.backgroundUploadId = backgroundUploadId;
        }
        if (translateTo && translateTo !== "none") {
          options.translationLanguage = translateTo;
        }
        options.transcriptionScript = transcriptionScript;
        options.resolution = resolution;
      }

      // 4. Start the automation task
      const startRes = await fetch("/api/clipcraft/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: activeTool,
          uploadId: uploadId || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
          filename: filename,
          prompt: `${TOOL_DETAILS[activeTool].title}: ${filename}`,
          options,
        }),
      });

      const startData = await startRes.json().catch(() => ({}));
      if (!startRes.ok) {
        throw new Error(startData.error || "Failed to start automation task.");
      }

      const { projectId, generationId } = startData;
      setStatus("queued");
      void loadHistory();

      // 5. Poll status until complete
      let finished = false;
      let attempts = 0;

      while (!finished && attempts < 120) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;

        const statusRes = await fetch(
          `/api/clipcraft/status?projectId=${projectId}&generationId=${generationId}`
        );
        const statusData = await statusRes.json().catch(() => ({}));

        if (!statusRes.ok) {
          throw new Error(statusData.error || "Status check failed.");
        }

        if (statusData.status === "completed") {
          finished = true;
          setStatus("completed");
          setResultUrl(statusData.url || "");
          const urls = statusData.urls || (statusData.url ? [statusData.url] : []);
          setResultUrls(urls);
          setMetadata(statusData.metadata || null);
          setClipsList(
            urls.map((url: string, i: number) => ({
              id: `clip-${i}-${Date.now()}`,
              url,
              label: `Clip #${i + 1}`,
              status: "Draft" as const,
            }))
          );
        } else if (statusData.status === "failed") {
          finished = true;
          setStatus("failed");
          setError(statusData.error || "Automation failed.");
        } else if (statusData.status === "processing") {
          setStatus("processing");
          if (typeof statusData.progress === "number") {
            setProgress(statusData.progress);
          }
        } else if (statusData.status === "queued") {
          setStatus("queued");
        }
      }

      if (!finished) {
        throw new Error("Task timed out. Please check your history later.");
      }
    } catch (err) {
      console.error("Automation error:", err);
      setStatus("failed");
      setError(getSafeErrorMessage(err));
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-x-hidden text-slate-100"
      style={{ background: "#060c18" }}
      lang="en"
      dir="ltr"
    >
      <FloatingParticles />

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 py-10 pb-24 space-y-12">
        {/* Header Block */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            AI Video Post-Production Suite
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            ClipCraft Studio
          </h1>
          <p className="mt-4 text-slate-400 text-base max-w-2xl mx-auto">
            Automate voice dubbing, animated captions, aspect ratios, and smart text-based video edits in one place.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(Object.keys(TOOL_DETAILS) as ToolType[]).map((key) => {
            const t = TOOL_DETAILS[key];
            const Icon = t.icon;
            const active = activeTool === key;

            return (
              <button
                key={key}
                onClick={() => {
                  if (status === "idle" || status === "completed" || status === "failed") {
                    setActiveTool(key);
                    setError("");
                  }
                }}
                disabled={status !== "idle" && status !== "completed" && status !== "failed"}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 ${
                  active
                    ? "bg-slate-900/80 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-slate-100"
                    : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700/60 text-slate-400 disabled:opacity-40"
                }`}
              >
                <div className={`p-2.5 rounded-lg bg-gradient-to-br ${t.color} text-slate-950 mb-2.5`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-center">{t.title}</span>
                <span className="text-[10px] text-slate-500 mt-1 font-medium">
                  {t.cost} Credits
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form & Upload Area (Left) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-6 shadow-xl space-y-6">
              <h2 className="text-xl font-bold border-b border-slate-800/80 pb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 text-sm">1</span>
                Add Source Media
              </h2>

              {/* Paste URL Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Paste Video / Audio Link
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Drop a video link (e.g. https://example.com/video.mp4)..."
                    value={sourceUrl}
                    onChange={(e) => {
                      setSourceUrl(e.target.value);
                      if (e.target.value.trim().length > 0) {
                        setFile(null); // Clear file if URL is provided
                      }
                    }}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                  />
                  {sourceUrl && (
                    <button
                      onClick={() => setSourceUrl("")}
                      className="absolute right-3 top-2 text-xs font-bold text-cyan-400 hover:text-cyan-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {!sourceUrl && (
                  <p className="text-[10px] text-slate-500 text-center font-medium">Or upload a file instead:</p>
                )}
              </div>

              {/* Upload Dropzone */}
              {!sourceUrl.trim() && (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                    dragActive
                      ? "border-cyan-500 bg-cyan-500/5"
                      : file
                      ? "border-slate-700 bg-slate-900/20"
                      : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/10"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*,audio/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="p-3 rounded-full bg-slate-900 text-cyan-400 border border-slate-800">
                      <Upload className="w-6 h-6" />
                    </div>
                    {file ? (
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{file.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-slate-200">
                          Drag and drop your file here, or click to browse
                        </p>
                        <p className="text-xs text-slate-500 mt-1.5">
                          Supports MP4, MOV, WAV, MP3 and other media files
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Configurable options for each tool */}
              <div className="space-y-4 pt-2">
                <h2 className="text-xl font-bold border-b border-slate-800/80 pb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 text-sm">2</span>
                  Configuration Options
                </h2>

                {activeTool === "captions" && (
                  <div className="space-y-5">
                    {/* Visual Preset Selector Tabs */}
                    <div className="space-y-3">
                      <div className="flex border-b border-slate-800">
                        <button
                          type="button"
                          onClick={() => setActiveStyleTab("presets")}
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                            activeStyleTab === "presets"
                              ? "border-cyan-500 text-cyan-400"
                              : "border-transparent text-slate-500 hover:text-slate-350"
                          }`}
                        >
                          Caption Styles
                        </button>
                        {catalog.brandTemplates.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveStyleTab("brands")}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                              activeStyleTab === "brands"
                                ? "border-cyan-500 text-cyan-400"
                                : "border-transparent text-slate-500 hover:text-slate-350"
                            }`}
                          >
                            Brand Templates
                          </button>
                        )}
                      </div>

                      {activeStyleTab === "presets" ? (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Choose Caption Style
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {combinedCaptionPresets.map((preset) => {
                              const isSelected = captionStyle === preset.id;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    setCaptionStyle(preset.id);
                                    setBrandTemplateId("");
                                  }}
                                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                                    isSelected
                                      ? "bg-slate-900 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                                      : "bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-300"
                                  }`}
                                >
                                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-1.5 text-base shadow-inner">
                                    {preset.id.startsWith("system_") ? "✨" : "📝"}
                                  </div>
                                  <span className="text-xs font-semibold truncate max-w-full">
                                    {preset.label.replace(" (NEW)", "")}
                                  </span>
                                  {preset.label.includes("(NEW)") && (
                                    <span className="text-[8px] bg-cyan-500/10 text-cyan-400 px-1 py-0.2 rounded mt-0.5 font-bold uppercase tracking-wide">
                                      New
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Choose Brand Template
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {catalog.brandTemplates.map((template) => {
                              const isSelected = brandTemplateId === template.id;
                              return (
                                <button
                                  key={template.id}
                                  type="button"
                                  onClick={() => {
                                    setBrandTemplateId(template.id);
                                    setCaptionStyle("");
                                  }}
                                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                                    isSelected
                                      ? "bg-slate-900 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                                      : "bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-300"
                                  }`}
                                >
                                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-1.5 text-base shadow-inner">
                                    💼
                                  </div>
                                  <span className="text-xs font-semibold truncate max-w-full">
                                    {template.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Advanced Inputs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-900 pt-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Language
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value="auto">Auto Detect</option>
                          {(catalog.languages.length ? catalog.languages : FALLBACK_LANGUAGES).map((l) => (
                            <option key={l.code || l.id} value={l.code || l.id}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Translate to
                        </label>
                        <select
                          value={translateTo}
                          onChange={(e) => setTranslateTo(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value="none">None (No translation)</option>
                          {(catalog.languages.length ? catalog.languages : FALLBACK_LANGUAGES).map((l) => (
                            <option key={l.code || l.id} value={l.code || l.id}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Script
                        </label>
                        <select
                          value={transcriptionScript}
                          onChange={(e) => setTranscriptionScript(e.target.value as any)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value="native">Native script</option>
                          <option value="roman">Romanized (Latin)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Resolution
                        </label>
                        <select
                          value={resolution}
                          onChange={(e) => setResolution(Number(e.target.value))}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value={720}>720p</option>
                          <option value={1080}>1080p</option>
                          <option value={1440}>1440p (2K)</option>
                          <option value={2160}>2160p (4K)</option>
                        </select>
                      </div>
                    </div>

                    {/* Toggles stack */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800/80 bg-slate-900/20">
                        <div>
                          <div className="text-xs font-semibold text-slate-200">Add Emoji 🤩</div>
                          <div className="text-[10px] text-slate-500 font-medium">Include relevant emojis in captions</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableEmojis}
                            onChange={(e) => setEnableEmojis(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-slate-950"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800/80 bg-slate-900/20">
                        <div>
                          <div className="text-xs font-semibold text-slate-200">Word Highlight</div>
                          <div className="text-[10px] text-slate-500 font-medium">Highlight currently spoken words</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableHighlights}
                            onChange={(e) => setEnableHighlights(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-slate-950"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800/80 bg-slate-900/20 md:col-span-2">
                        <div>
                          <div className="text-xs font-semibold text-slate-200">Auto Hooks</div>
                          <div className="text-[10px] text-slate-500 font-medium">Automatically generate viral attention-grabbing titles/hooks</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableAutoHooks}
                            onChange={(e) => setEnableAutoHooks(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-slate-950"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {activeTool === "dubbing" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Original Language
                      </label>
                      <select
                        value={sourceLang}
                        onChange={(e) => setSourceLang(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                      >
                        {catalog.dubbingSourceLanguages.map((l) => (
                          <option key={l.code || l.id} value={l.code || l.id}>
                            {l.label}
                          </option>
                        ))}
                        {!catalog.dubbingSourceLanguages.length && (
                          <option value="en-US">English (US)</option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Target Language (Dub)
                      </label>
                      <select
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                      >
                        {catalog.dubbingLanguages.map((l) => (
                          <option key={l.code || l.id} value={l.code || l.id}>
                            {l.label}
                          </option>
                        ))}
                        {!catalog.dubbingLanguages.length && (
                          <>
                            <option value="ar-EG">Arabic (Egypt)</option>
                            <option value="en-US">English (US)</option>
                            <option value="es-ES">Spanish (Spain)</option>
                            <option value="fr-FR">French (France)</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                )}

                {activeTool === "reframe" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Target Orientation
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { ratio: "9:16", label: "Vertical (TikTok/Reels)" },
                          { ratio: "1:1", label: "Square (Post/Feed)" }
                        ].map((item) => (
                          <button
                            key={item.ratio}
                            type="button"
                            onClick={() => setAspectRatio(item.ratio)}
                            className={`p-3 rounded-lg border text-sm font-semibold transition-all duration-200 text-center ${
                              aspectRatio === item.ratio
                                ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400"
                                : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300"
                            }`}
                          >
                            <div className="text-base mb-1">{item.ratio}</div>
                            <div className="text-[10px] text-slate-500 font-medium">{item.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Video Genre
                        </label>
                        <select
                          value={genre}
                          onChange={(e) => setGenre(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value="talking">Talking Head 🗣️</option>
                          <option value="screenshare">Screen Share 🖥️</option>
                          <option value="gaming">Gaming Content 🎮</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-800/80 bg-slate-900/20">
                        <div>
                          <div className="text-sm font-semibold text-slate-200">Disable Auto Split</div>
                          <div className="text-xs text-slate-500">Do not split reframed video into segments</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={disableAutoSplit}
                            onChange={(e) => setDisableAutoSplit(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-slate-950"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {activeTool === "transcription" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Audio Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                      >
                        <option value="auto">Auto Detect</option>
                        {(catalog.languages.length ? catalog.languages : FALLBACK_LANGUAGES).map((l) => (
                          <option key={l.code || l.id} value={l.code || l.id}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Translate to
                      </label>
                      <select
                        value={translateTo}
                        onChange={(e) => setTranslateTo(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                      >
                        <option value="none">None (No translation)</option>
                        {(catalog.languages.length ? catalog.languages : FALLBACK_LANGUAGES).map((l) => (
                          <option key={l.code || l.id} value={l.code || l.id}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Script
                      </label>
                      <select
                        value={transcriptionScript}
                        onChange={(e) => setTranscriptionScript(e.target.value as any)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                      >
                        <option value="native">Native script</option>
                        <option value="roman">Romanized (Latin)</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeTool === "edit-videos" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Editing prompt / Guidance
                      </label>
                      <textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="E.g., highlight reel of the funniest moments under 30 seconds"
                        rows={3}
                        className="w-full rounded-lg bg-slate-900 border border-slate-800 p-3 text-sm text-slate-200 outline-none focus:border-cyan-500/50 placeholder-slate-600 resize-none"
                      />
                    </div>

                    {/* Styling Gallery for Video Editor Clips */}
                    <div className="space-y-3">
                      <div className="flex border-b border-slate-800">
                        <button
                          type="button"
                          onClick={() => setActiveStyleTab("presets")}
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                            activeStyleTab === "presets"
                              ? "border-cyan-500 text-cyan-400"
                              : "border-transparent text-slate-500 hover:text-slate-350"
                          }`}
                        >
                          Clip Caption Styles
                        </button>
                        {catalog.brandTemplates.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveStyleTab("brands")}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                              activeStyleTab === "brands"
                                ? "border-cyan-500 text-cyan-400"
                                : "border-transparent text-slate-500 hover:text-slate-350"
                            }`}
                          >
                            Brand Templates
                          </button>
                        )}
                      </div>

                      {activeStyleTab === "presets" ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {combinedCaptionPresets.map((preset) => {
                              const isSelected = captionStyle === preset.id;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    setCaptionStyle(preset.id);
                                    setBrandTemplateId("");
                                  }}
                                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                                    isSelected
                                      ? "bg-slate-900 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                                      : "bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-300"
                                  }`}
                                >
                                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-1.5 text-base shadow-inner">
                                    {preset.id.startsWith("system_") ? "✨" : "📝"}
                                  </div>
                                  <span className="text-xs font-semibold truncate max-w-full">
                                    {preset.label.replace(" (NEW)", "")}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {catalog.brandTemplates.map((template) => {
                              const isSelected = brandTemplateId === template.id;
                              return (
                                <button
                                  key={template.id}
                                  type="button"
                                  onClick={() => {
                                    setBrandTemplateId(template.id);
                                    setCaptionStyle("");
                                  }}
                                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                                    isSelected
                                      ? "bg-slate-900 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                                      : "bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-300"
                                  }`}
                                >
                                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-1.5 text-base shadow-inner">
                                    💼
                                  </div>
                                  <span className="text-xs font-semibold truncate max-w-full">
                                    {template.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Advanced Options Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-900 pt-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Video Genre
                        </label>
                        <select
                          value={genre}
                          onChange={(e) => setGenre(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value="talking">Talking Head 🗣️</option>
                          <option value="screenshare">Screen Share 🖥️</option>
                          <option value="gaming">Gaming Content 🎮</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Language
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value="auto">Auto Detect</option>
                          {(catalog.languages.length ? catalog.languages : FALLBACK_LANGUAGES).map((l) => (
                            <option key={l.code || l.id} value={l.code || l.id}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Translate to
                        </label>
                        <select
                          value={translateTo}
                          onChange={(e) => setTranslateTo(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value="none">None (No translation)</option>
                          {(catalog.languages.length ? catalog.languages : FALLBACK_LANGUAGES).map((l) => (
                            <option key={l.code || l.id} value={l.code || l.id}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Script
                        </label>
                        <select
                          value={transcriptionScript}
                          onChange={(e) => setTranscriptionScript(e.target.value as any)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value="native">Native script</option>
                          <option value="roman">Romanized (Latin)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Export Orientation
                        </label>
                        <select
                          value={exportOrientation}
                          onChange={(e) => setExportOrientation(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value="landscape">Landscape (16:9)</option>
                          <option value="portrait">Portrait (9:16)</option>
                          <option value="square">Square (1:1)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Export Resolution
                        </label>
                        <select
                          value={exportResolution}
                          onChange={(e) => setExportResolution(Number(e.target.value))}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value={720}>720p</option>
                          <option value={1080}>1080p</option>
                          <option value={1440}>1440p (2K)</option>
                          <option value={2160}>2160p (4K)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Topic Preferences (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="E.g. product intro, pricing plans"
                          value={topics}
                          onChange={(e) => setTopics(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Start (sec)
                          </label>
                          <input
                            type="number"
                            placeholder="Auto"
                            value={selectedStart}
                            onChange={(e) => setSelectedStart(e.target.value)}
                            className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            End (sec)
                          </label>
                          <input
                            type="number"
                            placeholder="Auto"
                            value={selectedEnd}
                            onChange={(e) => setSelectedEnd(e.target.value)}
                            className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Clip Duration Ranges */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Preferred Clip Durations
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { range: [0, 30] as [number, number], label: "0-30s" },
                          { range: [30, 60] as [number, number], label: "30-60s" },
                          { range: [60, 90] as [number, number], label: "60-90s" },
                          { range: [90, 180] as [number, number], label: "90-180s" },
                          { range: [180, 300] as [number, number], label: "180-300s" }
                        ].map((item) => {
                          const isSelected = clipDurations.some(d => d[0] === item.range[0] && d[1] === item.range[1]);
                          return (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setClipDurations(clipDurations.filter(d => !(d[0] === item.range[0] && d[1] === item.range[1])));
                                } else {
                                  setClipDurations([...clipDurations, item.range]);
                                }
                              }}
                              className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 ${
                                isSelected
                                  ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400"
                                  : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300"
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Advanced Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800/80 bg-slate-900/20">
                        <div>
                          <div className="text-xs font-semibold text-slate-200">Reframe Clips</div>
                          <div className="text-[10px] text-slate-500 font-medium">Reframe aspect ratios</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={reframeClips}
                            onChange={(e) => setReframeClips(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-slate-950"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800/80 bg-slate-900/20">
                        <div>
                          <div className="text-xs font-semibold text-slate-200">Add Emoji</div>
                          <div className="text-[10px] text-slate-500 font-medium">Use contextual emojis</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableEmojis}
                            onChange={(e) => setEnableEmojis(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-slate-950"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800/80 bg-slate-900/20">
                        <div>
                          <div className="text-xs font-semibold text-slate-200">Word Highlight</div>
                          <div className="text-[10px] text-slate-500 font-medium">Highlight keywords</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableHighlights}
                            onChange={(e) => setEnableHighlights(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-slate-950"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {activeTool === "audiogram" && (
                  <div className="space-y-4">
                    {/* Visual Preset Selector Tabs */}
                    <div className="space-y-3">
                      <div className="flex border-b border-slate-800">
                        <button
                          type="button"
                          onClick={() => setActiveStyleTab("presets")}
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                            activeStyleTab === "presets"
                              ? "border-cyan-500 text-cyan-400"
                              : "border-transparent text-slate-500 hover:text-slate-350"
                          }`}
                        >
                          Caption Styles
                        </button>
                        {catalog.brandTemplates.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveStyleTab("brands")}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                              activeStyleTab === "brands"
                                ? "border-cyan-500 text-cyan-400"
                                : "border-transparent text-slate-500 hover:text-slate-350"
                            }`}
                          >
                            Brand Templates
                          </button>
                        )}
                      </div>

                      {activeStyleTab === "presets" ? (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Choose Caption Style
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {combinedCaptionPresets.map((preset) => {
                              const isSelected = captionStyle === preset.id;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    setCaptionStyle(preset.id);
                                    setBrandTemplateId("");
                                  }}
                                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                                    isSelected
                                      ? "bg-slate-900 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                                      : "bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-300"
                                  }`}
                                >
                                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-1.5 text-base shadow-inner">
                                    {preset.id.startsWith("system_") ? "✨" : "📝"}
                                  </div>
                                  <span className="text-xs font-semibold truncate max-w-full">
                                    {preset.label.replace(" (NEW)", "")}
                                  </span>
                                  {preset.label.includes("(NEW)") && (
                                    <span className="text-[8px] bg-cyan-500/10 text-cyan-400 px-1 py-0.2 rounded mt-0.5 font-bold uppercase tracking-wide">
                                      New
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Choose Brand Template
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {catalog.brandTemplates.map((template) => {
                              const isSelected = brandTemplateId === template.id;
                              return (
                                <button
                                  key={template.id}
                                  type="button"
                                  onClick={() => {
                                    setBrandTemplateId(template.id);
                                    setCaptionStyle("");
                                  }}
                                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                                    isSelected
                                      ? "bg-slate-900 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                                      : "bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-300"
                                  }`}
                                >
                                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-1.5 text-base shadow-inner">
                                    💼
                                  </div>
                                  <span className="text-xs font-semibold truncate max-w-full">
                                    {template.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Advanced Inputs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-900 pt-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Audio Language
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value="auto">Auto Detect</option>
                          {catalog.languages.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Translate to
                        </label>
                        <select
                          value={translateTo}
                          onChange={(e) => setTranslateTo(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value="none">None (No translation)</option>
                          {catalog.languages.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Script
                        </label>
                        <select
                          value={transcriptionScript}
                          onChange={(e) => setTranscriptionScript(e.target.value as any)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value="native">Native script</option>
                          <option value="roman">Romanized (Latin)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Resolution
                        </label>
                        <select
                          value={resolution}
                          onChange={(e) => setResolution(Number(e.target.value))}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value={720}>720p</option>
                          <option value={1080}>1080p</option>
                          <option value={1440}>1440p (2K)</option>
                          <option value={2160}>2160p (4K)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Waveform Template
                        </label>
                        <select
                          value={waveformTemplate}
                          onChange={(e) => setWaveformTemplate(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value="wave">Sinusoidal Wave 🌊</option>
                          <option value="bars">Jumping Bars 📊</option>
                          <option value="circle">Circular Wave ⭕</option>
                          <option value="line">Flat Line ➖</option>
                          <option value="bricks">Visual Blocks 🧱</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Layout Orientation
                        </label>
                        <select
                          value={audiogramOrientation}
                          onChange={(e) => setAudiogramOrientation(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
                        >
                          <option value="square">Square (1:1 - Insta/LinkedIn)</option>
                          <option value="vertical">Vertical (9:16 - TikTok/Shorts)</option>
                          <option value="landscape">Landscape (16:9 - YouTube)</option>
                        </select>
                      </div>
                    </div>

                    {/* Logo & Background Brand Assets uploads */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Brand Logo (Optional)</span>
                          {logoUploadId && <span className="text-emerald-400 text-[10px] font-bold">Uploaded ✓</span>}
                        </label>
                        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2 rounded-lg">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={logoUploading}
                            className="hidden"
                            id="logo-upload-input"
                          />
                          <label
                            htmlFor="logo-upload-input"
                            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition-colors"
                          >
                            {logoUploading ? "Uploading..." : "Choose File"}
                          </label>
                          <span className="text-xs text-slate-500 truncate max-w-[150px]">
                            {logoFile ? logoFile.name : "No file chosen"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Background Image (Optional)</span>
                          {backgroundUploadId && <span className="text-emerald-400 text-[10px] font-bold">Uploaded ✓</span>}
                        </label>
                        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2 rounded-lg">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBackgroundUpload}
                            disabled={backgroundUploading}
                            className="hidden"
                            id="bg-upload-input"
                          />
                          <label
                            htmlFor="bg-upload-input"
                            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition-colors"
                          >
                            {backgroundUploading ? "Uploading..." : "Choose File"}
                          </label>
                          <span className="text-xs text-slate-500 truncate max-w-[150px]">
                            {backgroundFile ? backgroundFile.name : "No file chosen"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Generate Button / Progress Bar */}
              <div className="pt-4 border-t border-slate-900 space-y-4">
                {status !== "idle" && status !== "completed" && status !== "failed" && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-medium text-slate-400">
                      <span className="capitalize flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                        {status === "uploading"
                          ? "Uploading..."
                          : status === "queued"
                          ? "Queued..."
                          : "Processing..."}
                      </span>
                      {progress !== null && <span>{progress}%</span>}
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                        initial={{ width: "0%" }}
                        animate={{
                          width:
                            status === "uploading"
                              ? "20%"
                              : status === "queued"
                              ? "40%"
                              : status === "processing"
                              ? `${40 + (progress ?? 0) * 0.5}%`
                              : "0%"
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex gap-2 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={(!file && !sourceUrl.trim()) || (status !== "idle" && status !== "completed" && status !== "failed")}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 font-bold text-slate-950 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Generate ({toolCost} Credits)
                </button>
              </div>
            </div>
          </div>

          {/* Results & Illustration Guide Area (Right) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Output Result Card */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-xl p-6 shadow-xl min-h-[350px] flex flex-col justify-between">
              <h2 className="text-xl font-bold border-b border-slate-800/80 pb-3 mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 text-sm">3</span>
                Output Results
              </h2>

              <div className="flex-grow flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {status === "idle" && (
                    <motion.div
                      key="idle-state"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center text-slate-500 space-y-2 py-10"
                    >
                      <Video className="w-12 h-12 mx-auto text-slate-800" />
                      <p className="text-sm">Configure options and click generate to process media</p>
                    </motion.div>
                  )}

                  {(status === "uploading" || status === "queued" || status === "processing") && (
                    <motion.div
                      key="loading-state"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center space-y-3 py-10"
                    >
                      <Loader2 className="w-10 h-10 mx-auto text-cyan-400 animate-spin" />
                      <div>
                        <p className="text-sm font-semibold text-slate-200">
                          {status === "uploading"
                            ? "Uploading file to storage..."
                            : status === "queued"
                            ? "Queueing in AI post-processing systems..."
                            : "AI processing video content..."}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">This might take a couple of minutes</p>
                      </div>
                    </motion.div>
                  )}

                  {status === "failed" && (
                    <motion.div
                      key="failed-state"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center text-rose-400 space-y-2 py-10"
                    >
                      <AlertTriangle className="w-12 h-12 mx-auto text-rose-800" />
                      <p className="text-sm font-semibold">Generation Failed</p>
                      <p className="text-xs text-slate-500">Check error logs for details</p>
                    </motion.div>
                  )}

                  {status === "completed" && (
                    <motion.div
                      key="completed-state"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full space-y-4"
                    >
                      {/* Search Toolbar for Clips */}
                      {clipsList.length > 0 && (
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                          <input
                            type="text"
                            placeholder="Search generated clips..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500/50"
                          />
                        </div>
                      )}

                      {/* Video Player or multi outputs */}
                      {resultUrl && activeTool !== "transcription" && (
                        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
                          <video
                            src={resultUrl}
                            controls
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}

                      {/* Display transcript text */}
                      {activeTool === "transcription" && metadata?.text && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              Transcript text
                            </span>
                            <button
                              onClick={() => copyToClipboard(metadata.text)}
                              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            >
                              {copied ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  Copy Text
                                </>
                              )}
                            </button>
                          </div>
                          <div className="w-full max-h-60 overflow-y-auto rounded-lg bg-slate-900 border border-slate-800 p-3.5 text-sm leading-relaxed text-slate-300">
                            {metadata.text}
                          </div>
                        </div>
                      )}

                      {/* Clips Dashboard List */}
                      {clipsList.length > 0 && (
                        <div className="space-y-3">
                          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Generated Video Clips ({clipsList.length})
                          </label>
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {clipsList
                              .filter((clip) =>
                                clip.label.toLowerCase().includes(searchQuery.toLowerCase())
                              )
                              .map((clip, i) => (
                                <div
                                  key={clip.id}
                                  className="flex flex-col gap-2.5 p-3 rounded-lg border border-slate-800 bg-slate-900/40 text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-slate-200">
                                        {clip.label}
                                      </span>
                                      {/* Status Label Dropdown */}
                                      <select
                                        value={clip.status}
                                        onChange={(e) =>
                                          handleChangeClipStatus(
                                            clip.id,
                                            e.target.value as any
                                          )
                                        }
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold border border-slate-800 bg-slate-950 outline-none ${
                                          clip.status === "Published"
                                            ? "text-emerald-400"
                                            : clip.status === "Scheduled"
                                            ? "text-cyan-400"
                                            : "text-amber-400"
                                        }`}
                                      >
                                        <option value="Draft">Draft</option>
                                        <option value="Scheduled">Scheduled</option>
                                        <option value="Published">Published</option>
                                      </select>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {/* Duplicate Clip */}
                                      <button
                                        onClick={() => handleDuplicateClip(clip.id)}
                                        title="Duplicate Clip"
                                        className="p-1 rounded bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                      {/* Delete Clip */}
                                      <button
                                        onClick={() => handleDeleteClip(clip.id)}
                                        title="Delete Clip"
                                        className="p-1 rounded bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between border-t border-slate-800/60 pt-2">
                                    {/* Suggest Hooks */}
                                    <button
                                      onClick={() => {
                                        setSelectedClipIndex(i);
                                        setShowHooksModal(true);
                                      }}
                                      className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                      AI Hooks
                                    </button>

                                    <div className="flex items-center gap-2">
                                      {/* Set as current player video */}
                                      <button
                                        onClick={() => setResultUrl(clip.url)}
                                        className="text-slate-400 hover:text-slate-200 font-medium flex items-center gap-0.5"
                                      >
                                        <Play className="w-3 h-3 fill-current" />
                                        Preview
                                      </button>

                                      <a
                                        href={clip.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        Download
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Download Button */}
                      {resultUrl && (
                        <a
                          href={resultUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200"
                        >
                          <Download className="w-4 h-4 animate-bounce" />
                          Download Selected File
                        </a>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Interactive Design Canvas preview card */}
            {["captions", "audiogram", "edit-videos"].includes(activeTool) ? (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl p-5 shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                    <h3 className="text-sm font-semibold">Interactive Customizer Canvas</h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Position: {canvasYPosition}%
                  </span>
                </div>

                {/* Draggable canvas frame */}
                <div
                  className={`relative w-full overflow-hidden border border-slate-800 bg-slate-900 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    activeTool === "captions" || (activeTool === "audiogram" && audiogramOrientation === "vertical") || (activeTool === "edit-videos" && exportOrientation === "portrait")
                      ? "aspect-[9/16] max-w-[280px] mx-auto"
                      : (activeTool === "audiogram" && audiogramOrientation === "landscape") || (activeTool === "edit-videos" && exportOrientation === "landscape")
                      ? "aspect-video"
                      : "aspect-square"
                  }`}
                  onMouseMove={(e) => {
                    if (!isDraggingCanvas) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const relativeY = e.clientY - rect.top;
                    const percentage = Math.max(10, Math.min(90, Math.round((relativeY / rect.height) * 100)));
                    setCanvasYPosition(percentage);
                  }}
                  onMouseUp={() => setIsDraggingCanvas(false)}
                  onMouseLeave={() => setIsDraggingCanvas(false)}
                  onTouchMove={(e) => {
                    if (!isDraggingCanvas) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const touch = e.touches[0];
                    const relativeY = touch.clientY - rect.top;
                    const percentage = Math.max(10, Math.min(90, Math.round((relativeY / rect.height) * 100)));
                    setCanvasYPosition(percentage);
                  }}
                  onTouchEnd={() => setIsDraggingCanvas(false)}
                >
                  {/* Backdrop template illustration / visualizer / upload BG preview */}
                  {activeTool === "audiogram" && backgroundUploadId ? (
                    <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${backgroundFile ? URL.createObjectURL(backgroundFile) : ''})` }} />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
                  )}

                  {/* Logo overlay for audiogram */}
                  {activeTool === "audiogram" && logoUploadId && logoFile && (
                    <div className="absolute top-4 left-4 w-10 h-10 rounded border border-slate-700 bg-slate-950/50 backdrop-blur p-1 flex items-center justify-center overflow-hidden z-20">
                      <img src={URL.createObjectURL(logoFile)} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}

                  {/* Waveform visualizer simulation for audiograms */}
                  {activeTool === "audiogram" && (
                    <div className="absolute inset-x-0 bottom-1/3 flex items-center justify-center h-20 pointer-events-none z-10">
                      {waveformTemplate === "circle" ? (
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-cyan-500/40 animate-spin" />
                      ) : waveformTemplate === "bars" ? (
                        <div className="flex gap-1.5 items-end justify-center h-12 w-full px-4">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((h, i) => (
                            <div
                              key={i}
                              className="w-1 bg-cyan-400 rounded-t-sm"
                              style={{
                                height: `${h * 10}%`,
                                animation: `wave-bars 1s ease-in-out infinite alternate`,
                                animationDelay: `${i * 0.05}s`
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <svg className="w-full h-12 stroke-cyan-400 stroke-2 fill-none" viewBox="0 0 100 20">
                          <path d="M 0,10 Q 12.5,0 25,10 T 50,10 T 75,10 T 100,10" className="animate-[pulse_1.5s_infinite]" />
                        </svg>
                      )}
                    </div>
                  )}

                  {/* Draggable caption/headline block */}
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsDraggingCanvas(true);
                    }}
                    onTouchStart={(e) => {
                      setIsDraggingCanvas(true);
                    }}
                    style={{
                      position: 'absolute',
                      left: '5%',
                      right: '5%',
                      top: `${canvasYPosition}%`,
                      transform: 'translateY(-50%)',
                      fontFamily: canvasFont === 'Impact' ? 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' : canvasFont,
                      fontSize: `${canvasFontSize}px`,
                      color: canvasTextColor,
                      backgroundColor: canvasBgColor ? `${canvasBgColor}cc` : 'transparent',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      lineHeight: '1.25',
                      cursor: isDraggingCanvas ? 'grabbing' : 'grab',
                      userSelect: 'none',
                      border: isDraggingCanvas ? '1px dashed #06b6d4' : '1px solid transparent',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
                      textShadow: canvasBgColor ? 'none' : '1px 1px 2px rgba(0,0,0,0.8)',
                      wordBreak: 'break-word',
                      zIndex: 30,
                    }}
                  >
                    {canvasText}
                  </div>
                </div>

                {/* Controls widgets */}
                <div className="space-y-3 pt-2 border-t border-slate-900 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Preview Caption / Headline Content
                    </label>
                    <textarea
                      value={canvasText}
                      onChange={(e) => setCanvasText(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-slate-200 outline-none resize-none focus:border-cyan-500/50"
                      rows={2}
                      maxLength={120}
                      placeholder="Type text overlays..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Font Family
                      </label>
                      <select
                        value={canvasFont}
                        onChange={(e) => setCanvasFont(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-slate-800 p-1.5 text-slate-200 outline-none focus:border-cyan-500/50 font-medium"
                      >
                        <option value="sans-serif">System Sans</option>
                        <option value="Montserrat">Montserrat (Modern)</option>
                        <option value="Impact">Impact (Meme/Viral)</option>
                        <option value="Georgia">Georgia (Serif)</option>
                        <option value="monospace">Monospace (Code)</option>
                        <option value="cursive">Comic Styled (Wacky)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Font Size ({canvasFontSize}px)
                      </label>
                      <input
                        type="range"
                        min={14}
                        max={42}
                        value={canvasFontSize}
                        onChange={(e) => setCanvasFontSize(Number(e.target.value))}
                        className="w-full accent-cyan-500 mt-1 cursor-pointer bg-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Text Color
                      </label>
                      <div className="flex gap-1.5 items-center mt-1">
                        {[
                          { color: "#ffffff", name: "White" },
                          { color: "#facc15", name: "Yellow" },
                          { color: "#06b6d4", name: "Cyan" },
                          { color: "#4ade80", name: "Green" },
                          { color: "#c084fc", name: "Purple" }
                        ].map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => setCanvasTextColor(c.color)}
                            className={`w-5 h-5 rounded-full border transition-all ${
                              canvasTextColor === c.color ? "border-cyan-400 scale-110 shadow" : "border-slate-800 hover:scale-105"
                            }`}
                            style={{ backgroundColor: c.color }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Highlight Background
                      </label>
                      <div className="flex gap-1.5 items-center mt-1">
                        {[
                          { color: "", name: "Transparent" },
                          { color: "#000000", name: "Black" },
                          { color: "#ef4444", name: "Red" },
                          { color: "#06b6d4", name: "Cyan" },
                          { color: "#6366f1", name: "Indigo" }
                        ].map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => setCanvasBgColor(c.color)}
                            className={`w-5 h-5 rounded-full border transition-all relative flex items-center justify-center ${
                              canvasBgColor === c.color ? "border-cyan-400 scale-110 shadow" : "border-slate-800 hover:scale-105"
                            }`}
                            style={{ backgroundColor: c.color || "#1e293b" }}
                            title={c.name}
                          >
                            {c.color === "" && <span className="text-[10px] font-bold text-slate-400">×</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-[9px] text-slate-500 italic mt-2 text-center">
                    * Interactive styles simulation guides the video rendering engine positioning config.
                  </p>
                </div>
              </div>
            ) : (
              /* Visual Guide Card (Default fallback for transcription / dubbing / reframe) */
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl p-5 shadow-xl space-y-4">
                <div className="flex items-center gap-2 text-cyan-400">
                  <HelpCircle className="w-4 h-4" />
                  <h3 className="text-sm font-semibold">Visual Explanation Guide</h3>
                </div>

                <div className="relative rounded-xl overflow-hidden aspect-video border border-slate-800 bg-slate-950 flex items-center justify-center">
                  <img
                    src={TOOL_DETAILS[activeTool].illustration}
                    alt={TOOL_DETAILS[activeTool].title}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                </div>

                <div className="space-y-2">
                  <h4 className="text-base font-bold text-slate-100">
                    {TOOL_DETAILS[activeTool].title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {TOOL_DETAILS[activeTool].desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-900 space-y-1.5">
                  {TOOL_DETAILS[activeTool].features.map((feat, index) => (
                    <div key={index} className="flex items-center gap-2 text-[11px] text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Projects / Generation History */}
        {!historyLoading && historyList.length > 0 && (
          <div className="space-y-6 pt-6 border-t border-slate-900">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-slate-100 flex items-center justify-center md:justify-start gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                Recent Projects
              </h2>
              <p className="text-sm text-slate-500 mt-1">Reload your previous generation runs and completed clips.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {historyList.map((item) => {
                const toolDetails = TOOL_DETAILS[item.model as ToolType];
                const ToolIcon = toolDetails?.icon || FileText;
                const formattedDate = new Date(item.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={item.id}
                    className="group relative rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-4 hover:border-slate-700 hover:bg-slate-900/10 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${toolDetails?.color || "from-slate-500 to-slate-700"} text-slate-950`}>
                          <ToolIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                            {toolDetails?.title || item.model}
                          </span>
                          <h4 className="text-xs font-semibold text-slate-200 line-clamp-1 mt-0.5" title={item.prompt}>
                            {item.prompt}
                          </h4>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                        {formattedDate}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px]">
                      <span className="text-slate-500 font-medium">{item.cost} Credits</span>
                      <button
                        onClick={() => handleLoadPastProject(item.projectId, item.id, item.prompt, item.model)}
                        disabled={status !== "idle" && status !== "completed" && status !== "failed"}
                        className="px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Reload Project
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full-width Steps Walkthrough */}
        <div className="space-y-6 pt-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-100">Workflow & Process Steps</h2>
            <p className="text-sm text-slate-500 mt-1">Simple post-production flow without layout complexity.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {STEPS.map((s, i) => {
              const StepIcon = s.icon;
              return (
                <div
                  key={i}
                  className="relative rounded-xl border border-slate-800/80 bg-slate-950/40 p-5 space-y-3 group hover:border-slate-700/60 hover:bg-slate-900/10 transition-all duration-300"
                >
                  <div className="flex justify-between items-center">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 group-hover:text-cyan-300 transition-colors">
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <span className="text-3xl font-extrabold text-slate-800 group-hover:text-cyan-500/20 transition-colors">
                      {s.num}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-200">{s.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                  </div>
                  {i < 3 && (
                    <div className="hidden md:block absolute right-[-20px] top-1/2 -translate-y-1/2 z-20 text-slate-800">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Hooks Suggestion Modal */}
      <AnimatePresence>
        {showHooksModal && selectedClipIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <h3 className="text-base font-bold text-slate-100">
                    Suggested AI Hooks
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowHooksModal(false);
                    setSelectedClipIndex(null);
                  }}
                  className="text-slate-500 hover:text-slate-300 text-xs font-semibold outline-none"
                >
                  Close
                </button>
              </div>

              <div className="text-xs text-slate-400">
                Highly engaging opening titles / viral hook texts generated for{" "}
                <span className="font-semibold text-slate-200 font-mono">
                  {clipsList[selectedClipIndex]?.label}
                </span>:
              </div>

              <div className="space-y-3">
                {getSuggestedHooksForClip(clipsList[selectedClipIndex]?.label).map(
                  (hook, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-800/80 bg-slate-900/20 text-xs"
                    >
                      <span className="text-slate-300 leading-relaxed font-medium">
                        {hook}
                      </span>
                      <button
                        onClick={() => {
                          void copyToClipboard(hook);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
