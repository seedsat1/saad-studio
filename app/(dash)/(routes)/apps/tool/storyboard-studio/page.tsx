"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Outfit, Plus_Jakarta_Sans, Caveat } from "next/font/google";
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
  ShoppingBag,
  Lightbulb,
  ArrowRight,
  Share2,
  Cloud,
  Sliders,
  Users,
  Cpu,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { AssetInspector, type Asset } from "@/components/AssetInspector";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-handwritten", display: "swap" });

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

const DEMO_STORIES = [
  {
    num: "01",
    type: "EXT. CITY - DAY",
    image: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=600&q=80",
    action: "The young explorer arrives at the city of the future.",
    camera: "WIDE SHOT - Wide Background",
    notes: "Showcase the grand scale and advanced architecture of the city."
  },
  {
    num: "02",
    type: "MED. SHOT",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
    action: "The explorer contemplates the futuristic surrounding.",
    camera: "MEDIUM SHOT - Mid-range perspective",
    notes: "Focus on facial expressions of wonder and surprise."
  },
  {
    num: "03",
    type: "WIDE SHOT",
    image: "https://images.unsplash.com/photo-1549692520-acc6669e2f0c?auto=format&fit=crop&w=600&q=80",
    action: "Walking down the main street surrounded by autonomous vehicles.",
    camera: "WIDE SHOT - Street level pan",
    notes: "Capture the active traffic flow and digital billboards."
  },
  {
    num: "04",
    type: "CLOSE UP",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
    action: "He spots an incredible piece of holographic tech ahead.",
    camera: "CLOSE UP - Tight focus",
    notes: "Accentuate the reaction in his eyes and facial details."
  },
  {
    num: "05",
    type: "OVER THE SHOULDER",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80",
    action: "Interacting with the floating digital projection interface.",
    camera: "OTS - Over the shoulder perspective",
    notes: "Highlight the bright hologram map reflecting light on his face."
  },
  {
    num: "06",
    type: "EXT. CITY - SUNSET",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
    action: "The day ends with the character looking towards the golden sunset.",
    camera: "WIDE SHOT - Cinematic skyline frame",
    notes: "Inspiring ending scene showing hope and adventure."
  }
];

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

function getStoryboardErrorMessage(error: unknown, getSafeErrorMessage: (error: unknown) => string): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (message.toLowerCase().includes("restricted content detected")) {
    return "This image was removed automatically because it violates the NSFW content policy.\nPlease upload a different image.";
  }
  if (message.toLowerCase().includes("unable to verify image safety")) {
    return "Unable to verify image safety. Please try again or use another image.";
  }
  if (message.toLowerCase().includes("safety check service is unavailable")) {
    return "Image safety check is unavailable. Please try again later.";
  }

  return getSafeErrorMessage(error);
}

function isStoryboardNsfwError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("restricted content") || normalized.includes("nsfw") || normalized.includes("policy");
}

const PushPin = () => (
  <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
    <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-red-500 to-red-700 border border-red-600 shadow-[0_2px_4px_rgba(0,0,0,0.4)] flex items-center justify-center">
      <div className="w-1 h-1 rounded-full bg-white/50" />
    </div>
  </div>
);

const CardPins = () => (
  <>
    <div className="absolute top-2 left-2 z-20 pointer-events-none">
      <div className="w-3 h-3 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 border border-slate-300 shadow-[0_2px_3px_rgba(0,0,0,0.35)] flex items-center justify-center">
        <div className="w-0.5 h-0.5 rounded-full bg-white/60" />
      </div>
    </div>
    <div className="absolute top-2 right-2 z-20 pointer-events-none">
      <div className="w-3 h-3 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 border border-slate-300 shadow-[0_2px_3px_rgba(0,0,0,0.35)] flex items-center justify-center">
        <div className="w-0.5 h-0.5 rounded-full bg-white/60" />
      </div>
    </div>
  </>
);

export default function StoryboardProductionPage() {
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [safeReferenceImageDataUrl, setSafeReferenceImageDataUrl] = useState<string | null>(null);
  const [referenceSafetyToken, setReferenceSafetyToken] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCheckingImageSafety, setIsCheckingImageSafety] = useState(false);
  const [numPanels, setNumPanels] = useState(4);
  const [storyboardType, setStoryboardType] = useState<string>("production");
  const [storyboardTypeOpen, setStoryboardTypeOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [ratioOpen, setRatioOpen] = useState(false);
  const [panelsOpen, setPanelsOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
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

  // Redesign state variables
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [boardTab, setBoardTab] = useState<"demo" | "result" | "library">("demo");

  const loadStoryboardAssets = useCallback(async () => {
    const res = await fetch("/api/assets?type=image", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data?.assets)) {
      throw new Error(data?.error || "Failed to load storyboard assets.");
    }
    const storyboardAssets = data.assets.filter((asset: { model?: string; url?: string }) =>
      (asset.model?.includes("qwen-image-edit-multiple-angles") || asset.model?.includes("seedream")) &&
      typeof asset.url === "string"
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
  const isBusy = isGenerating || isCheckingImageSafety;
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
    setIsCheckingImageSafety(true);
    setImageDataUrl(null);
    setSafeReferenceImageDataUrl(null);
    setReferenceSafetyToken(null);
    setResult(null);
    setGenerationStatus("idle");
    setStatusMessage("Checking image safety...");

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const safetyImage = await compressImage(dataUrl, 2_500_000, 1024);
      const res = await fetch("/api/runninghub/storyboard-production/safety-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: safetyImage }),
      });
      const safetyResult = await res.json().catch(() => null) as { safetyToken?: string; error?: string } | null;

      if (!res.ok) {
        throw new Error(safetyResult?.error || "Restricted content detected. This reference image cannot be used.");
      }
      if (!safetyResult?.safetyToken) {
        throw new Error("Unable to verify image safety. Please use another image.");
      }

      setImageDataUrl(dataUrl);
      setSafeReferenceImageDataUrl(safetyImage);
      setReferenceSafetyToken(safetyResult.safetyToken);
      setResult(null);
      setGenerationStatus("idle");
      setStatusMessage("");
    } catch (err) {
      const message = getStoryboardErrorMessage(err, getSafeErrorMessage);
      setImageDataUrl(null);
      setSafeReferenceImageDataUrl(null);
      setReferenceSafetyToken(null);
      setResult({ outputs: [], status: "failed", error: message });
      setGenerationStatus("failed");
      setStatusMessage("");
    } finally {
      setIsCheckingImageSafety(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [getSafeErrorMessage]);

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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isCheckingImageSafety) setIsDragging(true);
  }, [isCheckingImageSafety]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && !isCheckingImageSafety) handleFileSelect(file);
    },
    [handleFileSelect, isCheckingImageSafety],
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
    if (isBusy || !imageDataUrl) return;
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
    setBoardTab("result");
    setDrawerOpen(false); // Close drawer during active generation
    setStatusMessage("Preparing approved reference image...");

    try {
      const compressedImage = safeReferenceImageDataUrl
        ?? await compressImage(imageDataUrl, selectedQuality.maxBytes, selectedQuality.maxSide);
      const orderedAngles = orderAngles(selectedAngles).slice(0, numPanels);
      setStatusMessage(`Generating ${numPanels} panels from reference...`);

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
          referenceSafetyToken,
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
      const message = getStoryboardErrorMessage(err, getSafeErrorMessage);
      setResult({ outputs: [], status: "failed", error: message });
      setGenerationStatus("failed");
      setStatusMessage("");
    }
  }

  function reset() {
    setResult(null);
    setGenerationStatus("idle");
    setStatusMessage("");
    setBoardTab("demo");
  }

  // Active storyboard cards calculation
  const currentPanels = useMemo(() => {
    if (boardTab === "result" && result && result.outputs.length > 0) {
      return result.outputs.map((url, i) => {
        const angleId = selectedAngles[i] ?? "ext-long-shot";
        const angleLabel = CAMERA_ANGLES.find((a) => a.id === angleId)?.label ?? "Scene View";
        return {
          num: String(i + 1).padStart(2, "0"),
          type: angleLabel.toUpperCase(),
          image: url,
          action: "AI-generated storyboard panel based on your reference image.",
          camera: angleLabel,
          notes: "Consistent composition, style, and lighting maintained by Qwen AI."
        };
      });
    }
    return DEMO_STORIES;
  }, [boardTab, result, selectedAngles]);

  return (
    <div
      className={`${outfit.variable} ${plusJakarta.variable} ${caveat.variable} fixed inset-x-0 bottom-0 top-16 overflow-hidden bg-[#030610] text-slate-100 font-sans`}
      style={{ fontFamily: "var(--font-body, sans-serif)" }}
    >
      {/* Radial glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(6,182,212,0.1),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.06),transparent_40%)]" />

      {/* Main split grid */}
      <section className="relative mx-auto flex h-full max-w-7xl gap-6 p-6 justify-between select-none">
        
        {/* ── LEFT SIDEBAR: Brand & Info ── */}
        <aside className="w-[300px] flex flex-col justify-between py-2 pr-6 border-r border-white/5 shrink-0">
          <div className="flex flex-col gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3 select-none">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                <Film size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white uppercase leading-none flex items-center gap-1">
                  Storyboard <span className="text-cyan-400">AI</span>
                </h1>
                <p className="text-[9px] tracking-[0.25em] text-slate-500 uppercase font-bold mt-1">Saad Studio</p>
              </div>
            </div>

            {/* Slogan */}
            <div className="space-y-3 mt-4">
              <h2 className="text-lg font-bold leading-snug text-slate-200">
                Convert your idea into professional scenes in seconds.
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Create a complete storyboard with descriptions for each shot and easily organize the visual flow of your film.
              </p>
            </div>

            {/* Vertical Features checklist */}
            <div className="space-y-4 mt-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <Sparkles size={14} />
                </div>
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold text-slate-200 block">Automatic AI Generation</span>
                  <span className="text-slate-400">Convert your concept or script into visual panels</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <Film size={14} />
                </div>
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold text-slate-200 block">Cinematic Sequence</span>
                  <span className="text-slate-400">Arrange storyboard scenes in logical film order</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <ListChecks size={14} />
                </div>
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold text-slate-200 block">Detailed Shot Specs</span>
                  <span className="text-slate-400">Get directing annotations and camera angles</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <Share2 size={14} />
                </div>
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold text-slate-200 block">Production Ready</span>
                  <span className="text-slate-400">Export completed storyboard and share with team</span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="mt-auto space-y-4">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-full h-11 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2 transition active:scale-98"
            >
              <span className="font-bold">Create Storyboard Now +</span>
            </button>

            {/* Micro feature icons list */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-2 border-t border-white/5">
              <span className="flex items-center gap-1.5"><Download size={10} /> Multi-format</span>
              <span className="flex items-center gap-1.5"><Users size={10} /> Team Share</span>
              <span className="flex items-center gap-1.5"><Cloud size={10} /> Cloud Sync</span>
              <span className="flex items-center gap-1.5"><Sliders size={10} /> Customize</span>
            </div>
          </div>
        </aside>

        {/* ── MAIN WORKSPACE ── */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          
          {/* Top Pipeline Steps */}
          <div className="flex items-center justify-between gap-2 max-w-4xl mx-auto w-full py-2 select-none border-b border-white/5 pb-4">
            {/* Step 1 */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <Lightbulb size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-200 leading-tight">Idea / Text</h4>
                <p className="text-[9px] text-slate-500 truncate mt-0.5">Write your idea or story summary</p>
              </div>
            </div>
            
            {/* Arrow 1 */}
            <div className="hidden md:flex items-center gap-1 text-slate-700 px-2 shrink-0">
              <span className="text-lg font-light">···</span>
              <ArrowRight size={12} className="text-slate-600 animate-pulse" />
              <span className="text-lg font-light">···</span>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                <Brain size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-200 leading-tight">AI Analysis</h4>
                <p className="text-[9px] text-slate-500 truncate mt-0.5">Analyzes the idea & splits to scenes</p>
              </div>
            </div>

            {/* Arrow 2 */}
            <div className="hidden md:flex items-center gap-1 text-slate-700 px-2 shrink-0">
              <span className="text-lg font-light">···</span>
              <ArrowRight size={12} className="text-slate-600 animate-pulse" />
              <span className="text-lg font-light">···</span>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Film size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-200 leading-tight">Scene Layout</h4>
                <p className="text-[9px] text-slate-500 truncate mt-0.5">Design each shot & its details</p>
              </div>
            </div>

            {/* Arrow 3 */}
            <div className="hidden md:flex items-center gap-1 text-slate-700 px-2 shrink-0">
              <span className="text-lg font-light">···</span>
              <ArrowRight size={12} className="text-slate-600 animate-pulse" />
              <span className="text-lg font-light">···</span>
            </div>

            {/* Step 4 */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-200 leading-tight">Ready Board</h4>
                <p className="text-[9px] text-slate-500 truncate mt-0.5">Professional storyboard ready</p>
              </div>
            </div>
          </div>

          {/* Chalkboard Workspace */}
          <div className="flex-1 min-h-0 border-[12px] border-[#181a24] bg-gradient-to-b from-[#111726] to-[#0a0d16] rounded-3xl p-6 shadow-[inset_0_4px_16px_rgba(0,0,0,0.85),0_10px_30px_rgba(0,0,0,0.7)] overflow-y-auto relative flex flex-col">
            {/* Dust grain background */}
            <div className="absolute inset-0 opacity-[0.015] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            {/* Metal Corners */}
            <div className="absolute top-1 left-1 w-3 h-3 border-t border-l border-white/10 rounded-tl pointer-events-none" />
            <div className="absolute top-1 right-1 w-3 h-3 border-t border-r border-white/10 rounded-tr pointer-events-none" />
            <div className="absolute bottom-1 left-1 w-3 h-3 border-b border-l border-white/10 rounded-bl pointer-events-none" />
            <div className="absolute bottom-1 right-1 w-3 h-3 border-b border-r border-white/10 rounded-br pointer-events-none" />

            {/* Board Header & Tab Navigation */}
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div className="flex gap-2">
                <button
                  onClick={() => setBoardTab("demo")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-black transition border ${
                    boardTab === "demo"
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                      : "border-white/5 bg-slate-900/50 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Demo Board
                </button>

                {(result || generationStatus === "success") && (
                  <button
                    onClick={() => setBoardTab("result")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-black transition border ${
                      boardTab === "result"
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                        : "border-white/5 bg-slate-900/50 text-slate-400 hover:text-slate-200"
                  }`}
                  >
                    My Storyboard
                  </button>
                )}

                {history.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectionMode(false);
                      setBoardTab("library");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-black transition border ${
                      boardTab === "library"
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                        : "border-white/5 bg-slate-900/50 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Library ({history.length})
                  </button>
                )}
              </div>

              {/* Chalkboard Title */}
              <h3 
                className="font-handwritten text-cyan-400/85 tracking-[0.25em] text-3xl font-bold uppercase text-center pl-10 shadow-sm select-none"
                style={{ fontFamily: 'var(--font-handwritten), cursive' }}
              >
                STORYBOARD
                <span className="block h-0.5 w-36 mx-auto bg-cyan-400/30 rounded-full mt-1.5" />
              </h3>

              {/* Album controls (visible in library) */}
              <div className="flex gap-1.5 items-center">
                {boardTab === "library" && history.length > 0 && (
                  <button
                    onClick={() => setSelectionMode((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-slate-950/60 px-2.5 py-1.5 text-[10px] font-bold text-slate-300 hover:bg-slate-900"
                  >
                    <ListChecks className="h-3 w-3" />
                    {selectionMode ? "Cancel" : "Manage"}
                  </button>
                )}
                {selectionMode && selectedIds.size > 0 && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { setAlbumPickerMode("add"); setShowAlbumPicker(true); }}
                      className="px-2 py-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-[10px] font-bold text-amber-300"
                    >
                      + Album
                    </button>
                    <button
                      onClick={() => void onBulkDelete()}
                      className="px-2 py-1.5 rounded-md border border-red-500/30 bg-red-500/10 text-[10px] font-bold text-red-300 animate-pulse"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Post-it Notes (Demo / Concept Preview) */}
            {boardTab !== "library" && (
              <>
                <div className="absolute top-4 left-6 -rotate-3 w-48 bg-[#e0f7fa] text-[#006064] p-4 rounded-sm shadow-[4px_4px_10px_rgba(0,0,0,0.35)] z-20 hidden xl:block select-none border-b-2 border-cyan-200/40">
                  <PushPin />
                  <span className="font-handwritten text-[10px] font-extrabold uppercase tracking-wide block mb-1 opacity-70" style={{ fontFamily: 'var(--font-handwritten), cursive' }}>Story Concept:</span>
                  <p className="font-handwritten text-xs leading-snug font-medium" style={{ fontFamily: 'var(--font-handwritten), cursive' }}>
                    {imageDataUrl ? "Reference image loaded. Ready to build." : "A youth travels to discover the city of the future."}
                  </p>
                </div>

                <div className="absolute top-4 right-6 rotate-3 w-44 bg-[#e3f2fd] text-[#0d47a1] p-4 rounded-sm shadow-[4px_4px_10px_rgba(0,0,0,0.35)] z-20 hidden xl:block select-none border-b-2 border-blue-200/40">
                  <PushPin />
                  <span className="font-handwritten text-[10px] font-extrabold uppercase tracking-wide block mb-1 opacity-70" style={{ fontFamily: 'var(--font-handwritten), cursive' }}>Project:</span>
                  <p className="font-handwritten text-xs leading-snug font-bold" style={{ fontFamily: 'var(--font-handwritten), cursive' }}>
                    Future City
                  </p>
                  <div className="mt-2 pt-1 border-t border-blue-200/40 font-handwritten text-[10px] opacity-75" style={{ fontFamily: 'var(--font-handwritten), cursive' }}>
                    Status: Ready
                  </div>
                </div>
              </>
            )}

            {/* Canvas grid content */}
            <div className="relative flex-1 mt-6">
              
              {/* Active Board Tab (Demo / Generated Results) */}
              {boardTab !== "library" && (
                <div className="grid grid-cols-3 gap-x-8 gap-y-10 px-6 py-4">
                  {currentPanels.map((panel: any, i: number) => {
                    const totalPanels = currentPanels.length;
                    const showArrow = i + 1 < totalPanels;
                    const isRightArrow = showArrow && (i + 1) % 3 !== 0;
                    const isCurveArrow = showArrow && (i + 1) % 3 === 0;

                    return (
                      <div
                        key={panel.num}
                        className="group relative bg-[#faf9f6] border border-slate-300/80 shadow-[4px_4px_12px_rgba(0,0,0,0.25)] rounded-lg p-4 flex flex-col gap-3.5 transition hover:scale-[1.015] select-text"
                        onClick={() =>
                          setInspectorAsset({
                            type: "image",
                            url: panel.image,
                            title: `Panel ${panel.num}`,
                            prompt: panel.action,
                            model: "Qwen Image Edit"
                          })
                        }
                      >
                        <CardPins />

                        {/* Top panel stats */}
                        <div className="flex justify-between items-center text-[10px] select-none">
                          <span className="bg-blue-600 text-white font-extrabold px-2 py-0.5 rounded tracking-tight">
                            {panel.num}
                          </span>
                          <span className="font-extrabold text-slate-800 truncate max-w-[140px] uppercase">
                            {panel.type}
                          </span>
                        </div>

                        {/* Thumbnail image */}
                        <div className="aspect-[16/10] w-full rounded bg-slate-100 overflow-hidden relative border border-slate-200/60 shrink-0">
                          <img 
                            src={panel.image} 
                            alt={panel.type} 
                            className="w-full h-full object-cover grayscale contrast-[1.15] brightness-[1.02] group-hover:scale-102 transition duration-300" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition">
                            <button
                              type="button"
                              className="rounded-lg bg-white/20 p-2 text-white ring-1 ring-white/30 hover:bg-white/35 transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectorAsset({
                                  type: "image",
                                  url: panel.image,
                                  title: `Panel ${panel.num}`,
                                  prompt: panel.action,
                                  model: "Qwen Image Edit"
                                });
                              }}
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              className="rounded-lg bg-white/20 p-2 text-white ring-1 ring-white/30 hover:bg-white/35 transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                void downloadStoryboardImage(panel.image, `storyboard-panel-${panel.num}`);
                              }}
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Descriptions table */}
                        <div className="space-y-2 text-[10px] border-t border-slate-200/80 pt-3.5 select-text">
                          <div className="flex gap-2">
                            <span className="font-black text-slate-400 uppercase w-12 shrink-0">Action:</span>
                            <span className="text-slate-700 leading-relaxed font-semibold">{panel.action}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-black text-slate-400 uppercase w-12 shrink-0">Camera:</span>
                            <span className="text-blue-600 font-bold">{panel.camera}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-black text-slate-400 uppercase w-12 shrink-0">Notes:</span>
                            <span className="text-slate-600 leading-relaxed font-medium">{panel.notes}</span>
                          </div>
                        </div>

                        {/* Story flow arrows overlay */}
                        {isRightArrow && (
                          <div className="absolute top-1/2 -right-6.5 -translate-y-1/2 text-cyan-400/80 z-20 pointer-events-none hidden xl:block animate-pulse">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="2" y1="12" x2="22" y2="12"></line>
                              <polyline points="15 5 22 12 15 19"></polyline>
                            </svg>
                          </div>
                        )}

                        {isCurveArrow && (
                          <div className="absolute -right-8 top-1/2 h-[180px] w-16 text-cyan-400/80 z-20 pointer-events-none hidden xl:block animate-pulse">
                            <svg width="60" height="150" viewBox="0 0 60 150" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10 10 C 65 10, 65 140, -10 140" />
                              <polyline points="0 132 -10 140 0 148" />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Clapperboard decoration */}
              {boardTab !== "library" && (
                <div className="absolute bottom-2 right-4 w-48 h-36 bg-[#18181b] border-4 border-[#27272a] rounded-lg shadow-2xl rotate-[-12deg] z-10 hidden xl:flex flex-col p-2 text-white font-mono text-[8px] select-none pointer-events-none border-t-0">
                  {/* Clapper bar with stripes */}
                  <div className="absolute -top-6 left-0 right-0 h-6 bg-black border-2 border-zinc-800 flex overflow-hidden rounded-t-md">
                    <div className="flex-1 h-full bg-zinc-900 skew-x-[-30deg] border-r-4 border-white first:ml-[-10px]"></div>
                    <div className="flex-1 h-full bg-zinc-900 skew-x-[-30deg] border-r-4 border-white"></div>
                    <div className="flex-1 h-full bg-zinc-900 skew-x-[-30deg] border-r-4 border-white"></div>
                    <div className="flex-1 h-full bg-zinc-900 skew-x-[-30deg] border-r-4 border-white"></div>
                    <div className="flex-1 h-full bg-zinc-900 skew-x-[-30deg] border-r-4 border-white"></div>
                  </div>
                  {/* Text labels */}
                  <div className="grid grid-cols-3 gap-1 border-b border-zinc-700 pb-1 mt-2">
                    <div>
                      <span className="text-[6px] text-zinc-500 block">SCENE</span>
                      <span className="font-bold text-zinc-200">01</span>
                    </div>
                    <div>
                      <span className="text-[6px] text-zinc-500 block">TAKE</span>
                      <span className="font-bold text-zinc-200">4</span>
                    </div>
                    <div>
                      <span className="text-[6px] text-zinc-500 block">ROLL</span>
                      <span className="font-bold text-zinc-200">A2</span>
                    </div>
                  </div>
                  <div className="space-y-1 pt-1">
                    <div>
                      <span className="text-[5px] text-zinc-500 block">DATE</span>
                      <span className="text-zinc-300">JUNE 11, 2026</span>
                    </div>
                    <div>
                      <span className="text-[5px] text-zinc-500 block">DIRECTOR</span>
                      <span className="text-zinc-300 truncate">SAAD STUDIO</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Library Tab Grid */}
              {boardTab === "library" && (
                <div className="flex flex-col gap-4 px-6">
                  {albums.length > 0 && (
                    <div className="mb-2 flex flex-wrap items-center gap-2 select-none border-b border-white/5 pb-4">
                      <button
                        onClick={() => setActiveAlbumId(null)}
                        className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase transition ${
                          activeAlbumId === null
                            ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                            : "border-white/10 bg-slate-950/40 text-slate-400 hover:text-slate-300"
                        }`}
                      >
                        All Items ({history.length})
                      </button>
                      {albums.map((album) => {
                        const isActive = activeAlbumId === album.id;
                        return (
                          <div
                            key={album.id}
                            className="inline-flex items-center rounded-lg border border-white/10 bg-slate-950/40"
                          >
                            <button
                              onClick={() => setActiveAlbumId(isActive ? null : album.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase ${
                                isActive ? "text-amber-400" : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              <Folder className="h-3 w-3" />
                              {album.name}
                              <span className="opacity-60">({album.assetIds.length})</span>
                            </button>
                            <button onClick={() => renameAlbum(album.id)} className="px-2 py-1 text-[9px] font-bold uppercase text-slate-500 hover:text-cyan-400">Rename</button>
                            <button onClick={() => deleteAlbum(album.id)} className="px-2 py-1 text-[9px] font-bold uppercase text-slate-500 hover:text-red-400">×</button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-6 gap-3 py-2">
                    {visibleHistory.map((item) => (
                      <div
                        key={item.id}
                        onClick={() =>
                          selectionMode
                            ? toggleSelected(item.id)
                            : setInspectorAsset({
                                type: "image",
                                url: item.url,
                                title: item.prompt,
                                prompt: item.prompt,
                                model: "Qwen Image Edit"
                              })
                        }
                        className={`group relative aspect-square rounded-xl overflow-hidden border cursor-pointer transition ${
                          selectionMode && selectedIds.has(item.id)
                            ? "border-cyan-500 ring-2 ring-cyan-500/20"
                            : "border-white/5 hover:border-cyan-500/40"
                        }`}
                      >
                        <img src={item.url} alt={item.prompt} className="w-full h-full object-cover group-hover:scale-102 transition duration-300" />
                        {selectionMode && (
                          <div className="absolute top-2 left-2 bg-black/60 p-1 rounded-md text-white">
                            {selectedIds.has(item.id) ? <CheckSquare size={13} className="text-cyan-400" /> : <Square size={13} />}
                          </div>
                        )}
                        {!selectionMode && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition">
                            <button
                              type="button"
                              className="rounded-md bg-white/10 p-1.5 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectorAsset({
                                  type: "image",
                                  url: item.url,
                                  title: item.prompt,
                                  prompt: item.prompt,
                                  model: "Qwen Image Edit"
                                });
                              }}
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              type="button"
                              className="rounded-md bg-white/10 p-1.5 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                void downloadStoryboardImage(item.url, item.prompt || "storyboard-image");
                              }}
                            >
                              <Download size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {visibleHistory.length === 0 && (
                    <div className="py-12 text-center text-xs text-slate-500 select-none">
                      {activeAlbumId ? "This album is empty." : "No storyboard images found yet."}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Active AI generating Overlay on Chalkboard */}
            {isGenerating && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 select-none">
                <Loader2 className="h-10 w-10 animate-spin text-cyan-400 mb-4" />
                <span className="text-sm font-black tracking-widest text-cyan-100 uppercase">
                  {statusMessage || "Generating Storyboard..."}
                </span>
                <span className="text-xs text-slate-500 mt-2 max-w-[240px] leading-relaxed">
                  Dividing inputs and illustrating scenes. Please do not close this tab.
                </span>
              </div>
            )}
          </div>

          {/* Bottom Features Horizontal Bar */}
          <div className="grid grid-cols-4 gap-4 mt-1 select-none">
            <div className="border border-white/5 bg-slate-950/20 p-3 rounded-xl flex gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                <Download size={16} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-bold text-slate-200">Multi-format Export</h4>
                <p className="text-[10px] text-slate-500">PDF - PNG - Excel formats</p>
              </div>
            </div>
            
            <div className="border border-white/5 bg-slate-950/20 p-3 rounded-xl flex gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                <Users size={16} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-bold text-slate-200">Easy Sharing</h4>
                <p className="text-[10px] text-slate-500">Share boards with team</p>
              </div>
            </div>

            <div className="border border-white/5 bg-slate-950/20 p-3 rounded-xl flex gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                <Cloud size={16} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-bold text-slate-200">Cloud Storage</h4>
                <p className="text-[10px] text-slate-500">Access work from anywhere</p>
              </div>
            </div>

            <div className="border border-white/5 bg-slate-950/20 p-3 rounded-xl flex gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
                <Sliders size={16} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-bold text-slate-200">Custom Editing</h4>
                <p className="text-[10px] text-slate-500">Easily edit scenes & notes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── RETRACTABLE RIGHT-SIDE CONFIGURATION DRAWER ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Click-outside dim background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            />

            {/* Sidebar drawer content */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed top-16 right-0 bottom-0 w-[420px] bg-slate-950/95 border-l border-white/5 z-50 flex flex-col p-6 gap-5 justify-between backdrop-blur-xl shadow-2xl overflow-y-auto"
            >
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4 select-none">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-cyan-400" />
                    <h3 className="text-sm font-black uppercase tracking-wider">Storyboard Settings</h3>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Reference Image upload */}
                <div>
                  <SectionLabel>Reference Image</SectionLabel>
                  <div
                    className={`relative rounded-xl transition-all duration-300 cursor-pointer overflow-hidden ${
                      isDragging ? "scale-[1.01]" : ""
                    }`}
                    style={{
                      border: `2px ${imageDataUrl ? "solid" : "dashed"} ${isDragging ? "#8b5cf6" : imageDataUrl ? "rgba(6,182,212,0.3)" : "#334155"}`,
                      background: isDragging ? "rgba(139,92,246,0.02)" : imageDataUrl ? "transparent" : "rgba(255,255,255,0.005)",
                      padding: imageDataUrl ? "8px" : "24px 16px",
                      textAlign: imageDataUrl ? undefined : "center",
                    }}
                    onClick={() => !imageDataUrl && !isCheckingImageSafety && fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {imageDataUrl ? (
                      <div className="relative">
                        <img src={imageDataUrl} alt="Reference" className="w-full rounded-lg object-contain" style={{ maxHeight: 180 }} />
                        <button
                          type="button"
                          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-black/70 border border-white/10 hover:bg-black/90 transition text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImageDataUrl(null);
                            setSafeReferenceImageDataUrl(null);
                            setReferenceSafetyToken(null);
                            setResult(null);
                          }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : isCheckingImageSafety ? (
                      <div className="py-2 select-none">
                        <Loader2 size={24} className="animate-spin text-cyan-400 mx-auto mb-3" />
                        <div className="text-xs font-bold text-white uppercase tracking-wider">Verifying Safety...</div>
                        <div className="text-[10px] text-slate-500 mt-1">Analyzing content tags. Please wait.</div>
                      </div>
                    ) : (
                      <div className="select-none">
                        <Upload size={24} className="text-slate-400 mx-auto mb-3" />
                        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Upload Reference Image</div>
                        <div className="text-[10px] text-slate-500 mt-1">Drag & drop or click to browse. PNG, JPG, WEBP.</div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                  />
                </div>

                {/* Storyboard Type */}
                <div className="select-none">
                  <SectionLabel>Storyboard Type</SectionLabel>
                  <div className="relative">
                    <button
                      className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-xs font-bold transition border border-white/10 bg-slate-950/60 text-cyan-400"
                      onClick={() => setStoryboardTypeOpen((prev) => !prev)}
                    >
                      <span>{STORYBOARD_TYPES.find((type) => type.id === storyboardType)?.label ?? "Storyboard Production"}</span>
                      <ChevronDown size={14} style={{ color: "#64748b", transform: storyboardTypeOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                    </button>
                    {storyboardTypeOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-lg overflow-hidden bg-slate-900 border border-white/10 shadow-2xl">
                        {STORYBOARD_TYPES.map((t) => (
                          <button
                            key={t.id}
                            className="w-full py-2 px-3 text-xs font-bold text-left transition hover:bg-white/5"
                            style={{
                              background: storyboardType === t.id ? "rgba(6,182,212,0.1)" : "transparent",
                              color: storyboardType === t.id ? "#06b6d4" : "#94a3b8",
                            }}
                            onClick={() => {
                              setStoryboardType(t.id);
                              setStoryboardTypeOpen(false);
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div className="select-none">
                  <SectionLabel>Aspect Ratio</SectionLabel>
                  <div className="relative">
                    <button
                      className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-xs font-bold transition border border-white/10 bg-slate-950/60 text-cyan-400"
                      onClick={() => {
                        setRatioOpen((prev) => !prev);
                        setPanelsOpen(false);
                        setQualityOpen(false);
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <RatioIcon ratio={aspectRatio} />
                        {aspectRatio}
                      </span>
                      <ChevronDown size={14} style={{ color: "#64748b", transform: ratioOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                    </button>
                    {ratioOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-lg overflow-hidden bg-slate-900 border border-white/10 shadow-2xl">
                        {ASPECT_RATIOS.map((r) => (
                          <button
                            key={r}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-left transition hover:bg-white/5"
                            style={{
                              background: aspectRatio === r ? "rgba(6,182,212,0.1)" : "transparent",
                              color: aspectRatio === r ? "#06b6d4" : "#94a3b8",
                            }}
                            onClick={() => {
                              setAspectRatio(r);
                              setRatioOpen(false);
                            }}
                          >
                            <RatioIcon ratio={r} />
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Panels Count */}
                <div className="select-none">
                  <SectionLabel>Number of Panels</SectionLabel>
                  <div className="relative">
                    <button
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition border border-white/10 bg-slate-950/60 text-cyan-400"
                      onClick={() => {
                        setPanelsOpen((prev) => !prev);
                        setQualityOpen(false);
                        setRatioOpen(false);
                      }}
                    >
                      <span>{numPanels} panel{numPanels !== 1 ? "s" : ""}</span>
                      <ChevronDown size={14} style={{ color: "#64748b", transform: panelsOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                    </button>
                    {panelsOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-lg overflow-hidden bg-slate-900 border border-white/10 shadow-2xl">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <button
                            key={n}
                            className="w-full px-3 py-2 text-xs font-bold text-left transition hover:bg-white/5"
                            style={{
                              background: numPanels === n ? "rgba(6,182,212,0.1)" : "transparent",
                              color: numPanels === n ? "#06b6d4" : "#94a3b8",
                            }}
                            onClick={() => {
                              setNumPanels(n);
                              setPanelsOpen(false);
                            }}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quality Tier */}
                <div className="select-none">
                  <SectionLabel>Resolution Quality</SectionLabel>
                  <div className="relative">
                    <button
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition border border-white/10 bg-slate-950/60 text-cyan-400"
                      onClick={() => {
                        setQualityOpen((prev) => !prev);
                        setPanelsOpen(false);
                        setRatioOpen(false);
                      }}
                    >
                      <span>{selectedQuality.label} Quality</span>
                      <ChevronDown size={14} style={{ color: "#64748b", transform: qualityOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                    </button>
                    {qualityOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-lg overflow-hidden bg-slate-900 border border-white/10 shadow-2xl">
                        {QUALITY_OPTIONS.map((q) => (
                          <button
                            key={q.id}
                            className="w-full px-3 py-2 text-xs font-bold text-left transition hover:bg-white/5"
                            style={{
                              background: quality === q.id ? "rgba(6,182,212,0.1)" : "transparent",
                              color: quality === q.id ? "#06b6d4" : "#94a3b8",
                            }}
                            onClick={() => {
                              setQuality(q.id);
                              setQualityOpen(false);
                            }}
                          >
                            {q.label} Quality
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Camera Angles Selection */}
                <div>
                  <SectionLabel>Camera Angles ({selectedAngles.length}/{numPanels})</SectionLabel>
                  <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {CAMERA_ANGLES.map((angle) => {
                      const isSelected = selectedAngles.includes(angle.id);
                      return (
                        <button
                          key={angle.id}
                          type="button"
                          className={`px-3 py-2 rounded-lg text-[10px] font-bold text-left transition border ${
                            isSelected
                              ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 font-extrabold"
                              : "border-white/5 bg-slate-900/60 text-slate-400 hover:text-slate-300"
                          }`}
                          onClick={() => toggleCameraAngle(angle.id)}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-[3px] border flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-cyan-500 border-cyan-400 text-slate-950" : "border-slate-600"
                            }`}>
                              {isSelected && (
                                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                                  <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </span>
                            {angle.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Generate button */}
              <div className="border-t border-white/5 pt-4 space-y-2 select-none shrink-0">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isBusy || !imageDataUrl}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-500 disabled:cursor-not-allowed text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-2 transition"
                >
                  {isCheckingImageSafety ? (
                    <>
                      <Loader2 size={15} className="animate-spin text-cyan-200" />
                      <span>Checking Reference...</span>
                    </>
                  ) : isGenerating ? (
                    <>
                      <Loader2 size={15} className="animate-spin text-cyan-200" />
                      <span>Generating Scenes...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>Generate Storyboard</span>
                    </>
                  )}
                </button>
                <div className="text-center text-[10px] text-slate-500">
                  Consumes <span className="font-bold text-violet-400">{totalCost} credits</span> for {numPanels} panels.
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1222] p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        {albums.length > 0 && (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {albums.map((album) => (
              <button key={album.id} onClick={() => onPick(album.id)} className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm transition">
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
              className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400/50 text-white"
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
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider mb-2.5 text-slate-400">
      <span className="w-0.5 h-3 rounded-sm flex-shrink-0" style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)" }} />
      {children}
    </div>
  );
}

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
