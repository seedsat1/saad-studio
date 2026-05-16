"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Film,
  Sparkles,
  Eye,
  ChevronDown,
  Trash2,
  FolderPlus,
  Folder,
  CheckSquare,
  Square,
  ListChecks,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { AssetInspector, type Asset } from "@/components/AssetInspector";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

const STORYBOARD_TYPES = [
  { id: "production", label: "Storyboard Production" },
  { id: "short-drama", label: "Short Drama" },
  { id: "short-drama-2", label: "Short Drama 2" },
  { id: "comic-drama", label: "Comic Drama" },
  { id: "comic-drama-2", label: "Comic Drama 2" },
] as const;

const ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"] as const;

const QUALITY_OPTIONS = [
  { id: "1k", label: "1K", creditsPerPanel: 2, outputFormat: "jpeg" as const, maxBytes: 2_500_000, maxSide: 1024 },
  { id: "2k", label: "2K", creditsPerPanel: 4, outputFormat: "png" as const, maxBytes: 4_500_000, maxSide: 2048 },
  { id: "4k", label: "4K", creditsPerPanel: 8, outputFormat: "png" as const, maxBytes: 8_000_000, maxSide: 4096 },
] as const;

const CAMERA_ANGLES = [
  { id: "ext-long-shot", label: "Ext. long shot" },
  { id: "eye-level", label: "Eye level" },
  { id: "closeup", label: "Closeup" },
  { id: "back-view", label: "Back view" },
  { id: "profile", label: "Profile" },
  { id: "aerial", label: "Aerial" },
  { id: "low-angle", label: "Low angle" },
  { id: "high-angle", label: "High angle" },
  { id: "dutch-angle", label: "Dutch angle" },
  { id: "pov", label: "POV" },
  { id: "long-shot", label: "Long shot" },
  { id: "extreme-closeup", label: "Extreme closeup" },
  { id: "med-closeup", label: "Med. closeup" },
  { id: "ots", label: "OTS" },
  { id: "wide", label: "Wide" },
  { id: "3-4-view", label: "3/4 view" },
] as const;

const PRIMARY_CAMERA_SEQUENCE = [
  "ext-long-shot",
  "eye-level",
  "closeup",
  "back-view",
  "profile",
  "aerial",
  "low-angle",
  "high-angle",
  "dutch-angle",
  "pov",
  "long-shot",
  "med-closeup",
  "wide",
  "ots",
  "3-4-view",
  "extreme-closeup",
] as const;

function orderAngles(angleIds: string[]) {
  return PRIMARY_CAMERA_SEQUENCE.filter((angleId) => angleIds.includes(angleId));
}

function getAutoAngleSelection(numPanels: number, currentAngles: string[] = []) {
  const normalized = orderAngles(currentAngles);
  if (normalized.length >= numPanels) {
    return normalized.slice(0, numPanels);
  }
  const missing = PRIMARY_CAMERA_SEQUENCE
    .filter((angleId) => !normalized.includes(angleId))
    .slice(0, numPanels - normalized.length);
  return [...normalized, ...missing];
}

type GenerationStatus = "idle" | "generating" | "success" | "failed";

interface ResultState {
  outputs: string[];
  status: GenerationStatus;
  error?: string;
}

interface StoryboardHistoryItem {
  id: string;
  url: string;
  prompt: string;
  model: string;
  date: string;
}

interface Album {
  id: string;
  name: string;
  assetIds: string[];
}

const STORYBOARD_ALBUMS_STORAGE_KEY = "saad_studio_storyboard_albums_v1";

function loadAlbums(): Album[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORYBOARD_ALBUMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((album) => album && typeof album.id === "string" && typeof album.name === "string")
      .map((album) => ({
        id: album.id,
        name: album.name,
        assetIds: Array.isArray(album.assetIds)
          ? album.assetIds.filter((assetId: unknown) => typeof assetId === "string")
          : [],
      }));
  } catch {
    return [];
  }
}

function saveAlbums(albums: Album[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORYBOARD_ALBUMS_STORAGE_KEY, JSON.stringify(albums));
  } catch {
    // ignore storage quota issues
  }
}

function fileExtensionFromMime(mimeType: string): string {
  const mime = mimeType.toLowerCase();
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("avif")) return "avif";
  if (mime.includes("gif")) return "gif";
  return "png";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Compress image to JPEG ≤ maxBytes using canvas while respecting quality tier max side. */
function compressImage(dataUrl: string, maxBytes = 2_500_000, maxSide = 2048): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_SIDE = maxSide;
      let { width, height } = img;
      if (width > MAX_SIDE || height > MAX_SIDE) {
        const scale = MAX_SIDE / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.85;
      let result = canvas.toDataURL("image/jpeg", quality);
      while (result.length > maxBytes && quality > 0.3) {
        quality -= 0.1;
        result = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(result);
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = dataUrl;
  });
}

export default function StoryboardProductionPage() {
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [numPanels, setNumPanels] = useState(4);
  const [storyboardType, setStoryboardType] = useState<string>("production");
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [ratioOpen, setRatioOpen] = useState(false);
  const [selectedAngles, setSelectedAngles] = useState<string[]>(() => getAutoAngleSelection(4));
  const [quality, setQuality] = useState<(typeof QUALITY_OPTIONS)[number]["id"]>("1k");
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [result, setResult] = useState<ResultState | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [inspectorAsset, setInspectorAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<StoryboardHistoryItem[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [albums, setAlbums] = useState<Album[]>([]);
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [albumPickerMode, setAlbumPickerMode] = useState<"add" | "move">("add");
  const [draggedAssetId, setDraggedAssetId] = useState<string | null>(null);

  const loadStoryboardAssets = useCallback(async () => {
    const res = await fetch("/api/assets?type=image", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data?.assets)) {
      throw new Error(data?.error || "Failed to load storyboard assets.");
    }
    const storyboardAssets = data.assets.filter((asset: { model?: string; url?: string }) =>
      asset.model?.includes("qwen-image-edit-multiple-angles") && typeof asset.url === "string"
    );
    setHistory(storyboardAssets.map((asset: { id: string; url: string; prompt?: string; model?: string; date?: string }) => ({
      id: asset.id,
      url: asset.url,
      prompt: asset.prompt || "Storyboard panel",
      model: asset.model || "Qwen Image Edit",
      date: asset.date || "",
    })));
  }, []);

  // Load saved storyboard panels on mount
  useEffect(() => {
    const load = async () => {
      try {
        await loadStoryboardAssets();
      } catch { /* ignore */ }
    };
    void load();
  }, [loadStoryboardAssets]);

  useEffect(() => {
    setAlbums(loadAlbums());
  }, []);

  useEffect(() => {
    saveAlbums(albums);
  }, [albums]);

  const isGenerating = generationStatus === "generating";
  const selectedQuality = QUALITY_OPTIONS.find((option) => option.id === quality) ?? QUALITY_OPTIONS[0];
  const creditsPerPanel = selectedQuality.creditsPerPanel;
  const totalCost = numPanels * creditsPerPanel;
  const activeAlbum = activeAlbumId ? albums.find((album) => album.id === activeAlbumId) ?? null : null;
  const visibleHistory = activeAlbum
    ? activeAlbum.assetIds
      .map((assetId) => history.find((item) => item.id === assetId))
      .filter((item): item is StoryboardHistoryItem => Boolean(item))
    : history;

  useEffect(() => {
    setSelectedAngles((prev) => getAutoAngleSelection(numPanels, prev));
  }, [numPanels]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const onBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (typeof window !== "undefined" && !window.confirm(`Delete ${ids.length} storyboard image(s)? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Bulk delete failed");
      }
      setAlbums((prev) => prev.map((album) => ({ ...album, assetIds: album.assetIds.filter((assetId) => !selectedIds.has(assetId)) })));
      exitSelectionMode();
      await loadStoryboardAssets();
    } catch (err) {
      setStatusMessage(getSafeErrorMessage(err));
    }
  }, [selectedIds, exitSelectionMode, loadStoryboardAssets, getSafeErrorMessage]);

  const addSelectionToAlbum = useCallback((albumId: string) => {
    if (selectedIds.size === 0) return;
    setAlbums((prev) => prev.map((album) => album.id === albumId
      ? { ...album, assetIds: Array.from(new Set([...album.assetIds, ...Array.from(selectedIds)])) }
      : album));
    exitSelectionMode();
    setShowAlbumPicker(false);
  }, [selectedIds, exitSelectionMode]);

  const moveSelectionToAlbum = useCallback((albumId: string) => {
    if (selectedIds.size === 0) return;
    const movedIds = Array.from(selectedIds);
    setAlbums((prev) => prev.map((album) => {
      const filtered = album.assetIds.filter((assetId) => !selectedIds.has(assetId));
      if (album.id !== albumId) {
        return { ...album, assetIds: filtered };
      }
      return { ...album, assetIds: [...filtered, ...movedIds] };
    }));
    setActiveAlbumId(albumId);
    exitSelectionMode();
    setShowAlbumPicker(false);
  }, [selectedIds, exitSelectionMode]);

  const createAlbumWithSelection = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed || selectedIds.size === 0) return;
    const id = `story_alb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    setAlbums((prev) => {
      const nextAlbums = albumPickerMode === "move"
        ? prev.map((album) => ({ ...album, assetIds: album.assetIds.filter((assetId) => !selectedIds.has(assetId)) }))
        : prev;
      return [...nextAlbums, { id, name: trimmed, assetIds: Array.from(selectedIds) }];
    });
    setActiveAlbumId(id);
    exitSelectionMode();
    setShowAlbumPicker(false);
  }, [selectedIds, exitSelectionMode, albumPickerMode]);

  const renameAlbum = useCallback((albumId: string) => {
    if (typeof window === "undefined") return;
    const current = albums.find((album) => album.id === albumId);
    if (!current) return;
    const nextName = window.prompt("Rename album", current.name)?.trim();
    if (!nextName || nextName === current.name) return;
    setAlbums((prev) => prev.map((album) => album.id === albumId ? { ...album, name: nextName } : album));
  }, [albums]);

  const deleteAlbum = useCallback((albumId: string) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this album? Images will stay in your storyboard library.")) return;
    setAlbums((prev) => prev.filter((album) => album.id !== albumId));
    if (activeAlbumId === albumId) setActiveAlbumId(null);
  }, [activeAlbumId]);

  const moveAssetWithinAlbum = useCallback((fromId: string, toId: string) => {
    if (!activeAlbumId || fromId === toId) return;
    setAlbums((prev) => prev.map((album) => {
      if (album.id !== activeAlbumId) return album;
      const fromIndex = album.assetIds.indexOf(fromId);
      const toIndex = album.assetIds.indexOf(toId);
      if (fromIndex === -1 || toIndex === -1) return album;
      const nextIds = [...album.assetIds];
      const [moved] = nextIds.splice(fromIndex, 1);
      nextIds.splice(toIndex, 0, moved);
      return { ...album, assetIds: nextIds };
    }));
  }, [activeAlbumId]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await readFileAsDataUrl(file);
    setImageDataUrl(dataUrl);
    setResult(null);
  }, []);

  const toggleCameraAngle = (angleId: string) => {
    setSelectedAngles((prev) => {
      if (prev.includes(angleId)) {
        return prev.filter((id) => id !== angleId);
      }
      if (prev.length >= numPanels) {
        return prev;
      }
      return orderAngles([...prev, angleId]);
    });
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const downloadStoryboardImage = useCallback(async (url: string, nameBase: string) => {
    try {
      const isExternal = /^https?:\/\//i.test(url);
      const response = await fetch(
        isExternal ? `/api/download?url=${encodeURIComponent(url)}` : url,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(`Download failed (${response.status})`);
      }
      const blob = await response.blob();
      const extension = fileExtensionFromMime(blob.type || "");
      const safeBase = nameBase.replace(/[^a-z0-9-_]/gi, "-").replace(/-+/g, "-").toLowerCase();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${safeBase}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
  }, []);

  async function handleGenerate() {
    if (isGenerating || !imageDataUrl) return;
    if (selectedAngles.length === 0) {
      setGenerationStatus("failed");
      setResult({ outputs: [], status: "failed", error: "Please select at least one camera angle." });
      return;
    }
    const gate = await guardGeneration({ requiredCredits: totalCost, action: "apps:storyboard" });
    if (!gate.ok) {
      if (gate.reason === "error") setStatusMessage(gate.message ?? getSafeErrorMessage(gate.message));
      return;
    }

    setResult(null);
    setGenerationStatus("generating");
    setStatusMessage(`Compressing image & generating ${numPanels} panels… this may take 1–3 minutes.`);

    try {
      const compressedImage = await compressImage(imageDataUrl, selectedQuality.maxBytes, selectedQuality.maxSide);
      const orderedAngles = orderAngles(selectedAngles).slice(0, numPanels);

      const res = await fetch("/api/runninghub/storyboard-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: compressedImage,
          numPanels,
          storyboardType,
          aspectRatio,
          quality,
          outputFormat: selectedQuality.outputFormat,
          cameraAngles: orderedAngles,
        }),
      });

      if (!res.ok) {
        let errorMsg = "Failed to generate";
        try {
          const data = await res.json();
          errorMsg = data.error ?? errorMsg;
        } catch {
          errorMsg = `Server error (${res.status})`;
        }
        throw new Error(errorMsg);
      }

      const { outputs } = (await res.json()) as { outputs: string[]; generationId: string };
      setResult({ outputs, status: "success" });
      setGenerationStatus("success");
      setStatusMessage("");
      await loadStoryboardAssets().catch(() => null);
    } catch (err) {
      const message = getSafeErrorMessage(err);
      setResult({ outputs: [], status: "failed", error: message });
      setGenerationStatus("failed");
      setStatusMessage("");
    }
  }

  function reset() {
    setResult(null);
    setGenerationStatus("idle");
    setStatusMessage("");
  }

  return (
    <div
      className={`${outfit.variable} ${plusJakarta.variable} min-h-screen`}
      style={{ background: "#060c18", color: "#e2e8f0", fontFamily: "var(--font-body, sans-serif)" }}
    >
      {/* Gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #06b6d4, transparent)" }} />
      </div>

      {/* Back nav */}
      <div className="relative z-10 px-6 pt-5 pb-0">
        <Link href="/apps" className="inline-flex items-center gap-2 text-sm font-medium transition-colors" style={{ color: "#64748b" }}>
          <ArrowLeft size={15} /> Back to Apps
        </Link>
      </div>

      {/* Main split layout */}
      <div className="relative z-10 flex min-h-[calc(100vh-56px)]" style={{ gap: 0 }}>

        {/* ── LEFT: Preview & Results ── */}
        <div className="flex-1 p-6 overflow-y-auto" style={{ borderRight: "1px solid #1e293b" }}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
              <span style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Storyboard Production
              </span>
            </h1>
            <p className="text-sm" style={{ color: "#64748b" }}>
              Transform a single image into cinematic storyboard panels
            </p>
          </div>

          {/* Empty state */}
          {generationStatus === "idle" && !result && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
                <Film size={32} style={{ color: "#8b5cf6" }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)", color: "#94a3b8" }}>
                Your storyboard will appear here
              </h3>
              <p className="text-xs max-w-sm text-center" style={{ color: "#475569" }}>
                Upload a reference image and describe your scene. The AI will produce cinematic panels in one go.
              </p>
            </div>
          )}

          {/* Loading */}
          {generationStatus === "generating" && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-14 h-14 rounded-full border-2 border-t-transparent animate-spin mb-5" style={{ borderColor: "#1e293b", borderTopColor: "#8b5cf6" }} />
              <div className="text-sm font-medium mb-1" style={{ color: "#94a3b8" }}>Generating storyboard…</div>
              {statusMessage && <div className="text-xs" style={{ color: "#475569" }}>{statusMessage}</div>}
            </div>
          )}

          {/* Error */}
          {generationStatus === "failed" && result?.error && (
            <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", color: "#f97316" }}>
              <div className="flex items-center gap-2 mb-1"><AlertCircle size={14} /><span className="font-semibold">Generation failed</span></div>
              {result.error}
              <button className="ml-3 underline text-xs" onClick={reset}>Try again</button>
            </div>
          )}

          {/* Success — masonry gallery like image page */}
          {generationStatus === "success" && result && result.outputs.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#a3e635" }}>
                  <CheckCircle size={14} /> {result.outputs.length} panel{result.outputs.length !== 1 ? "s" : ""} generated
                </span>
                <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium" style={{ border: "1px solid #1e293b", background: "#0a1225", color: "#94a3b8" }} onClick={reset}>
                  <RefreshCw size={11} /> New
                </button>
              </div>
              <div
                className="grid w-full gap-2.5"
                style={{
                  gridTemplateColumns:
                    result.outputs.length === 1
                      ? "1fr"
                      : result.outputs.length <= 4
                        ? "repeat(2, 1fr)"
                        : "repeat(3, 1fr)",
                }}
              >
                <AnimatePresence>
                  {result.outputs.map((url, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="group relative cursor-pointer overflow-hidden rounded-2xl ring-1 ring-white/10"
                      style={{ background: "#060c18" }}
                      onClick={() => setInspectorAsset({ type: "image", url, title: `Panel ${i + 1}`, prompt: "Storyboard panel", model: "Qwen Image Edit" })}
                    >
                      <div className="flex min-h-[180px] items-center justify-center bg-[#060c18] p-2">
                        <img src={url} alt={`Panel ${i + 1}`} className="w-full max-h-[320px] object-contain transition duration-300 group-hover:scale-[1.02]" />
                      </div>
                      <div className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-zinc-200">Panel {i + 1}</div>
                      <div className="absolute inset-0 flex items-end justify-center gap-2 bg-black/0 pb-3 opacity-0 transition duration-200 group-hover:bg-black/45 group-hover:opacity-100">
                        <button onClick={(e) => { e.stopPropagation(); setInspectorAsset({ type: "image", url, title: `Panel ${i + 1}`, prompt: "Storyboard panel", model: "Qwen Image Edit" }); }} className="rounded-lg bg-white/15 p-2 text-white ring-1 ring-white/20"><Eye className="h-4 w-4" /></button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void downloadStoryboardImage(url, `storyboard-panel-${i + 1}`);
                          }}
                          className="rounded-lg bg-white/15 p-2 text-white ring-1 ring-white/20"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}

          {/* Storyboard library */}
          {(history.length > 0 || activeAlbumId) && generationStatus !== "success" && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Film size={14} style={{ color: "#06b6d4" }} />
                <span className="text-sm font-semibold" style={{ color: "#94a3b8", fontFamily: "var(--font-display)" }}>Storyboard Library</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4" }}>{visibleHistory.length}</span>
                <button onClick={() => setSelectionMode((prev) => !prev)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10">
                  <ListChecks className="h-3.5 w-3.5" />
                  {selectionMode ? "Cancel" : "Manage"}
                </button>
                {selectionMode && selectedIds.size > 0 && (
                  <>
                    <button onClick={() => { setAlbumPickerMode("add"); setShowAlbumPicker(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100 hover:bg-amber-500/20">
                      <FolderPlus className="h-3.5 w-3.5" />
                      Add to Album
                    </button>
                    <button onClick={() => { setAlbumPickerMode("move"); setShowAlbumPicker(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100 hover:bg-cyan-500/20">
                      <Folder className="h-3.5 w-3.5" />
                      Move
                    </button>
                    <button onClick={() => void onBulkDelete()} className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-100 hover:bg-red-500/20">
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </>
                )}
              </div>

              {albums.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button onClick={() => setActiveAlbumId(null)} className="rounded-lg border px-2.5 py-1 text-[11px] transition-all" style={{ borderColor: activeAlbumId ? "#1e293b" : "rgba(6,182,212,0.4)", background: activeAlbumId ? "#0e1630" : "rgba(6,182,212,0.1)", color: activeAlbumId ? "#64748b" : "#06b6d4" }}>
                    All
                  </button>
                  {albums.map((album) => {
                    const isActive = activeAlbumId === album.id;
                    return (
                      <div key={album.id} className="inline-flex items-center rounded-lg border" style={{ borderColor: isActive ? "rgba(245,158,11,0.35)" : "#1e293b", background: isActive ? "rgba(245,158,11,0.1)" : "#0e1630" }}>
                        <button onClick={() => setActiveAlbumId(isActive ? null : album.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px]" style={{ color: isActive ? "#fbbf24" : "#94a3b8" }}>
                          <Folder className="h-3.5 w-3.5" />
                          {album.name}
                          <span className="opacity-70">{album.assetIds.length}</span>
                        </button>
                        <button onClick={() => renameAlbum(album.id)} className="px-2 py-1 text-[11px] text-slate-400 hover:text-cyan-300">Rename</button>
                        <button onClick={() => deleteAlbum(album.id)} className="px-2 py-1 text-[11px] text-slate-400 hover:text-red-300">×</button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid w-full gap-1.5" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
                {visibleHistory.map((item) => (
                  <div
                    key={item.id}
                    className="group relative cursor-pointer overflow-hidden rounded-lg ring-1 ring-white/10"
                    style={{ aspectRatio: "1 / 1", opacity: draggedAssetId === item.id ? 0.55 : 1 }}
                    onClick={() => selectionMode ? toggleSelected(item.id) : setInspectorAsset({ type: "image", url: item.url, title: item.prompt, prompt: item.prompt, model: "Qwen Image Edit" })}
                    draggable={Boolean(activeAlbumId && !selectionMode)}
                    onDragStart={() => setDraggedAssetId(item.id)}
                    onDragEnd={() => setDraggedAssetId(null)}
                    onDragOver={(e) => {
                      if (!activeAlbumId || selectionMode) return;
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      if (!activeAlbumId || selectionMode || !draggedAssetId) return;
                      e.preventDefault();
                      moveAssetWithinAlbum(draggedAssetId, item.id);
                      setDraggedAssetId(null);
                    }}
                  >
                    <img src={item.url} alt={item.prompt} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                    {selectionMode && (
                      <div className="absolute left-2 top-2 rounded-md bg-black/60 p-1 text-white">
                        {selectedIds.has(item.id) ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      </div>
                    )}
                    {!selectionMode && (
                      <div className="absolute inset-0 flex items-end justify-center gap-1.5 bg-black/0 pb-2 opacity-0 transition duration-200 group-hover:bg-black/45 group-hover:opacity-100">
                        <button onClick={(e) => { e.stopPropagation(); setInspectorAsset({ type: "image", url: item.url, title: item.prompt, prompt: item.prompt, model: "Qwen Image Edit" }); }} className="rounded-md bg-white/15 p-1.5 text-white ring-1 ring-white/20"><Eye className="h-3 w-3" /></button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void downloadStoryboardImage(item.url, item.prompt || "storyboard-image");
                          }}
                          className="rounded-md bg-white/15 p-1.5 text-white ring-1 ring-white/20"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {visibleHistory.length === 0 && (
                <div className="mt-3 rounded-xl border border-white/10 bg-[#060c18] px-4 py-6 text-center text-xs text-slate-400">
                  {activeAlbumId ? "This album is empty." : "No storyboard images found yet."}
                </div>
              )}

              {activeAlbumId && visibleHistory.length > 1 && !selectionMode && (
                <div className="mt-2 text-[10px] text-slate-500">
                  Drag images to reorder this album.
                </div>
              )}
            </div>
          )}

          {/* Info card */}
          <div className="mt-8 rounded-xl p-5" style={{ background: "#0a1225", border: "1px solid #1e293b" }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} style={{ color: "#8b5cf6" }} />
              <span className="text-xs font-semibold" style={{ color: "#94a3b8", fontFamily: "var(--font-display)" }}>About this tool</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
              <strong className="text-violet-400">Storyboard Production</strong> transforms a single reference image into cinematic storyboard panels. Upload your image, describe the scene, and the AI handles composition, angles, and visual storytelling.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg py-3 px-2" style={{ background: "#060c18" }}>
                <div className="text-lg font-bold" style={{ color: "#06b6d4", fontFamily: "var(--font-display)" }}>{creditsPerPanel}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>Credits/Panel</div>
              </div>
              <div className="rounded-lg py-3 px-2" style={{ background: "#060c18" }}>
                <div className="text-lg font-bold" style={{ color: "#8b5cf6", fontFamily: "var(--font-display)" }}>1-9</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>Panels</div>
              </div>
              <div className="rounded-lg py-3 px-2" style={{ background: "#060c18" }}>
                <div className="text-lg font-bold" style={{ color: "#a3e635", fontFamily: "var(--font-display)" }}>{CAMERA_ANGLES.length}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>Camera Angles</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Controls ── */}
        <div className="flex flex-col overflow-y-hidden sticky top-0 self-start" style={{ width: 420, minWidth: 360, height: "100vh", background: "#0a1225", padding: "20px" }}>
          <SectionLabel>Reference Image</SectionLabel>
          <div
            className={`relative rounded-xl transition-all duration-300 cursor-pointer ${isDragging ? "scale-[1.01]" : ""}`}
            style={{
              border: `2px ${imageDataUrl ? "solid" : "dashed"} ${isDragging ? "#8b5cf6" : imageDataUrl ? "#8b5cf6" : "#334155"}`,
              background: isDragging ? "rgba(139,92,246,0.02)" : imageDataUrl ? "transparent" : "rgba(255,255,255,0.006)",
              padding: imageDataUrl ? "8px" : "24px 16px",
              textAlign: imageDataUrl ? undefined : "center",
            }}
            onClick={() => !imageDataUrl && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {imageDataUrl ? (
              <>
                <img src={imageDataUrl} alt="Reference" className="w-full rounded-lg object-contain" style={{ maxHeight: 180 }} />
                <button className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", border: "1px solid #1e293b" }} onClick={(e) => { e.stopPropagation(); setImageDataUrl(null); setResult(null); }}>
                  <X size={13} />
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(139,92,246,0.1)" }}>
                  <Upload size={20} style={{ color: "#8b5cf6" }} />
                </div>
                <div className="text-sm font-medium">Drop image or click to upload</div>
                <div className="text-xs mt-1.5" style={{ color: "#64748b" }}>PNG, JPG, WEBP supported</div>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

          {/* Storyboard Type */}
          <div className="mt-5">
            <SectionLabel>Storyboard Type</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {STORYBOARD_TYPES.map((t) => (
                <button
                  key={t.id}
                  className="w-full py-2.5 px-3 rounded-lg text-[12px] font-semibold transition-all text-left"
                  style={{
                    border: `1px solid ${storyboardType === t.id ? "rgba(139,92,246,0.4)" : "#1e293b"}`,
                    background: storyboardType === t.id ? "rgba(139,92,246,0.1)" : "#0e1630",
                    color: storyboardType === t.id ? "#a78bfa" : "#64748b",
                    fontFamily: "var(--font-display)",
                  }}
                  onClick={() => setStoryboardType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="mt-5">
            <SectionLabel>Aspect Ratio</SectionLabel>
            <div className="relative">
              <button
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-[12px] font-bold transition-all"
                style={{
                  border: "1px solid #1e293b",
                  background: "#0e1630",
                  color: "#06b6d4",
                  fontFamily: "var(--font-display)",
                }}
                onClick={() => setRatioOpen(!ratioOpen)}
              >
                <span className="flex items-center gap-2.5">
                  <RatioIcon ratio={aspectRatio} />
                  {aspectRatio}
                </span>
                <ChevronDown size={14} style={{ color: "#64748b", transform: ratioOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>
              {ratioOpen && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg overflow-hidden"
                  style={{ background: "#0e1630", border: "1px solid #1e293b" }}
                >
                  {ASPECT_RATIOS.map((r) => (
                    <button
                      key={r}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-bold transition-all text-left hover:bg-white/5"
                      style={{
                        background: aspectRatio === r ? "rgba(6,182,212,0.1)" : "transparent",
                        color: aspectRatio === r ? "#06b6d4" : "#94a3b8",
                        fontFamily: "var(--font-display)",
                      }}
                      onClick={() => { setAspectRatio(r); setRatioOpen(false); }}
                    >
                      <span
                        className="flex-shrink-0 w-4 h-4 rounded-[3px] flex items-center justify-center"
                        style={{
                          border: `1.5px solid ${aspectRatio === r ? "#06b6d4" : "#334155"}`,
                          background: aspectRatio === r ? "#06b6d4" : "transparent",
                        }}
                      >
                        {aspectRatio === r && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5.5L4 7.5L8 3" stroke="#060c18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        )}
                      </span>
                      <RatioIcon ratio={r} />
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Number of panels */}
          <div className="mt-5">
            <SectionLabel>Number of Panels</SectionLabel>
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  className="flex-1 py-2.5 rounded-lg text-[12px] font-bold transition-all"
                  style={{
                    border: `1px solid ${numPanels === n ? "rgba(6,182,212,0.4)" : "#1e293b"}`,
                    background: numPanels === n ? "rgba(6,182,212,0.1)" : "#0e1630",
                    color: numPanels === n ? "#06b6d4" : "#64748b",
                    fontFamily: "var(--font-display)",
                  }}
                  onClick={() => setNumPanels(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="text-right text-[10px] mt-1.5" style={{ color: "#475569" }}>
              {numPanels} panel{numPanels !== 1 ? "s" : ""} × {creditsPerPanel} = <span style={{ color: "#8b5cf6", fontWeight: 600 }}>{totalCost} credits</span>
            </div>
          </div>

          {/* Quality */}
          <div className="mt-5">
            <SectionLabel>Quality</SectionLabel>
            <div className="grid grid-cols-3 gap-1.5">
              {QUALITY_OPTIONS.map((q) => (
                <button
                  key={q.id}
                  className="px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all text-center"
                  style={{
                    border: `1px solid ${quality === q.id ? "rgba(6,182,212,0.4)" : "#1e293b"}`,
                    background: quality === q.id ? "rgba(6,182,212,0.1)" : "#0e1630",
                    color: quality === q.id ? "#06b6d4" : "#64748b",
                    fontFamily: "var(--font-display)",
                  }}
                  onClick={() => setQuality(q.id)}
                >
                  {q.label}
                </button>
              ))}
            </div>
            <div className="text-[10px] mt-1.5" style={{ color: "#475569" }}>
              {selectedQuality.label} quality costs {selectedQuality.creditsPerPanel} credits per panel.
            </div>
          </div>

          {/* Generate button */}
          <button
            className="mt-5 flex w-full items-center justify-center py-4 rounded-2xl font-semibold text-sm text-white transition-all relative overflow-hidden text-center"
            style={{
              background: isGenerating || !imageDataUrl ? "#1e293b" : "linear-gradient(135deg, #8b5cf6, #06b6d4)",
              fontFamily: "var(--font-display)",
              cursor: isGenerating || !imageDataUrl ? "not-allowed" : "pointer",
            }}
            disabled={isGenerating || !imageDataUrl}
            onClick={handleGenerate}
          >
            {isGenerating ? (
              <span className="flex w-full items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Processing…</span>
            ) : (
              <span className="flex w-full items-center justify-center gap-2"><Sparkles size={15} /> Generate Storyboard</span>
            )}
          </button>
          <div className="text-center mt-2 text-[10px]" style={{ color: "#475569" }}>
            Costs <span style={{ color: "#8b5cf6", fontWeight: 600 }}>{totalCost} credits</span> for {numPanels} panel{numPanels !== 1 ? "s" : ""}
          </div>

          {/* Camera Angles */}
          <div className="mt-5">
            <SectionLabel>Camera Angles</SectionLabel>
            <div className="grid grid-cols-3 gap-1.5">
              {CAMERA_ANGLES.map((angle) => (
                <button
                  key={angle.id}
                  className="px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all text-left"
                  style={{
                    border: `1px solid ${selectedAngles.includes(angle.id) ? "rgba(139,92,246,0.4)" : "#1e293b"}`,
                    background: selectedAngles.includes(angle.id) ? "rgba(139,92,246,0.1)" : "#0e1630",
                    color: selectedAngles.includes(angle.id) ? "#a78bfa" : "#64748b",
                    fontFamily: "var(--font-display)",
                  }}
                  onClick={() => toggleCameraAngle(angle.id)}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="flex-shrink-0 w-3 h-3 rounded-[2px] flex items-center justify-center"
                      style={{
                        border: `1px solid ${selectedAngles.includes(angle.id) ? "#a78bfa" : "#475569"}`,
                        background: selectedAngles.includes(angle.id) ? "#8b5cf6" : "transparent",
                      }}
                    >
                      {selectedAngles.includes(angle.id) && (
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5.5L4 7.5L8 3" stroke="#060c18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      )}
                    </span>
                    {angle.label}
                  </span>
                </button>
              ))}
            </div>
            <div className="text-[10px] mt-2" style={{ color: "#475569" }}>
              Selected: {selectedAngles.length}/{numPanels} angle{numPanels !== 1 ? "s" : ""}. You cannot select more than the panel count.
            </div>
          </div>

        </div>
      </div>

      {/* ── Asset Inspector Modal ── */}
      <AnimatePresence>
        {inspectorAsset ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/80 p-4" onClick={() => setInspectorAsset(null)}>
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} className="mx-auto h-[82vh] max-w-5xl overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
              <AssetInspector asset={inspectorAsset} onClose={() => setInspectorAsset(null)} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showAlbumPicker ? (
        <AlbumPicker
          albums={albums}
          count={selectedIds.size}
          mode={albumPickerMode}
          onPick={albumPickerMode === "move" ? moveSelectionToAlbum : addSelectionToAlbum}
          onCreate={createAlbumWithSelection}
          onClose={() => setShowAlbumPicker(false)}
        />
      ) : null}
    </div>
  );
}

function AlbumPicker({ albums, count, mode, onPick, onCreate, onClose }: { albums: Album[]; count: number; mode: "add" | "move"; onPick: (id: string) => void; onCreate: (name: string) => void; onClose: () => void }) {
  const [newName, setNewName] = useState("");
  const title = mode === "move" ? `Move ${count} image(s) to album` : `Add ${count} image(s) to album`;
  const createLabel = mode === "move" ? "Create & Move" : "Create";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1222] p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>

        {albums.length > 0 && (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {albums.map((album) => (
              <button key={album.id} onClick={() => onPick(album.id)} className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm">
                <span className="inline-flex items-center gap-2"><Folder className="h-4 w-4 text-amber-300" />{album.name}</span>
                <span className="text-xs text-slate-400">{album.assetIds.length}</span>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2 pt-2 border-t border-white/10">
          <label className="text-xs text-slate-400">Create new album</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onCreate(newName); }}
              placeholder="Album name"
              className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
            />
            <button onClick={() => onCreate(newName)} disabled={!newName.trim()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-400/40 bg-amber-500/20 text-sm text-amber-100 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed">
              <FolderPlus className="h-3.5 w-3.5" />
              {createLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#64748b", fontFamily: "var(--font-body)" }}>
      <span className="w-0.5 h-3 rounded-sm flex-shrink-0" style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)" }} />
      {children}
    </div>
  );
}

/** Small visual rectangle showing the aspect ratio shape */
function RatioIcon({ ratio }: { ratio: string }) {
  const [w, h] = ratio.split(":").map(Number);
  if (!w || !h) return null;
  const maxSide = 14;
  const scale = maxSide / Math.max(w, h);
  const rw = Math.round(w * scale);
  const rh = Math.round(h * scale);
  return (
    <span
      className="flex-shrink-0 rounded-[2px]"
      style={{
        width: rw,
        height: rh,
        border: "1.5px solid currentColor",
        opacity: 0.7,
      }}
    />
  );
}
