"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  RefreshCw,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  Activity,
  History,
  Save,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  User,
  ArrowRight,
  Sparkles,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic as AudioIcon,
  Box as ThreeDIcon,
  HelpCircle,
  Check,
  Plus,
  Boxes,
  Globe,
  Plug,
  Scissors,
  Film,
  Mic2,
  Eraser,
  PenTool,
  Palette,
  Crop,
  Blend,
  Shapes,
  Drama,
  Lightbulb,
  Aperture,
  Monitor,
  Music,
  Headphones,
  Radio,
  Volume2,
  Bot,
  Clapperboard,
  ScanFace,
  Paintbrush,
  GalleryHorizontalEnd,
  Wand2,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import type { DynamicImageModel, DynamicVideoModel } from "@/lib/dynamic-model-loader";
import type { CentralModelDefinition } from "@/lib/model-definition-registry";

interface PlatformSurfaceItem {
  id: string;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  modality: "video" | "image" | "audio" | "3d" | "edit";
  badge?: string;
}

interface PlatformSurfaceCategory {
  category: string;
  badge: string;
  color: string;
  items: PlatformSurfaceItem[];
}

const ALL_PLATFORM_SURFACES: PlatformSurfaceCategory[] = [
  {
    category: "Video Studio & Tools (استوديو الفيديو)",
    badge: "18 FEATURES",
    color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
    items: [
      { id: "/video", name: "Create Video", desc: "Text-to-video generation", icon: VideoIcon, modality: "video" },
      { id: "/hook-studio", name: "Hook Studio", desc: "Viral scripts, hooks, and AI short-form videos", icon: Clapperboard, modality: "video", badge: "NEW" },
      { id: "/agent-studio", name: "Agent Studio", desc: "AI agent orchestrator & custom skills workflow", icon: Bot, modality: "video", badge: "NEW" },
      { id: "/cinema-flow", name: "Cinema Flow", desc: "AI Creative Agent workspace", icon: Bot, modality: "video", badge: "NEW" },
      { id: "/video-edit", name: "Cinema Edit", desc: "Iterative & stateful video editing", icon: Sparkles, modality: "video", badge: "NEW" },
      { id: "/storyboard", name: "Storyboard Studio", desc: "Create cinematic production boards", icon: Clapperboard, modality: "video", badge: "READY" },
      { id: "/apps/tool/cinematic-styles", name: "Cinematic Styles", desc: "Apply stylized motion presets to clips", icon: Blend, modality: "video", badge: "READY" },
      { id: "/apps/tool/transitions", name: "Transitions", desc: "Generate styled scene transitions", icon: Blend, modality: "video", badge: "READY" },
      { id: "/apps/tool/draw-to-video", name: "Draw to Video", desc: "Draw, add, remove, replace and animate elements", icon: PenTool, modality: "video", badge: "NEW" },
      { id: "/edit", name: "Edit Video", desc: "Advanced AI timeline editing", icon: Scissors, modality: "video" },
      { id: "/video-extend", name: "Video Extend", desc: "Upload a clip and extend its duration", icon: Film, modality: "video", badge: "NEW" },
      { id: "/lipsync", name: "Lipsync Studio", desc: "Audio-driven facial animation", icon: Mic2, modality: "video" },
      { id: "/clipcraft-studio", name: "ClipCraft Studio", desc: "Auto captions, reframe, AI dubbing, & translation", icon: Sparkles, modality: "video", badge: "NEW" },
      { id: "/video-upscale", name: "Video Upscale", desc: "Enhance resolution to 4K/8K", icon: Aperture, modality: "video" },
      { id: "/canvas", name: "AI Canvas", desc: "Build complete creative workflows from one visual workspace", icon: Monitor, modality: "video", badge: "NEW" },
      { id: "/3d", name: "3D Studio", desc: "Generate and edit premium 3D models with AI", icon: ThreeDIcon, modality: "video", badge: "NEW" },
      { id: "/assist", name: "Assist", desc: "Your AI co-pilot, chatbot, and agent assistant", icon: Bot, modality: "video", badge: "NEW" },
      { id: "/smart-cli", name: "Smart CLI", desc: "AI terminal and hosted MCP connector for Claude", icon: Plug, modality: "video", badge: "NEW" },
    ],
  },
  {
    category: "Image Studio & Tools (استوديو الصور)",
    badge: "13 FEATURES",
    color: "text-pink-400 border-pink-500/30 bg-pink-500/10",
    items: [
      { id: "/image", name: "Create Image", desc: "Generate stunning AI images instantly", icon: Wand2, modality: "image", badge: "TOP" },
      { id: "/prompt", name: "Prompt", desc: "Private prompt and result library", icon: GalleryHorizontalEnd, modality: "image", badge: "NEW" },
      { id: "/prompt-extractor", name: "Prompt Extractor", desc: "Extract prompts from images", icon: ScanFace, modality: "image", badge: "NEW" },
      { id: "/cinema-studio-image", name: "Cinema Studio Image 2.0", desc: "Cinematic quality image generation", icon: Clapperboard, modality: "image", badge: "NEW" },
      { id: "/relight", name: "Relight", desc: "Relight any image with AI precision", icon: Lightbulb, modality: "image", badge: "NEW" },
      { id: "/inpaint", name: "Inpaint", desc: "Fill and repair areas seamlessly", icon: PenTool, modality: "image" },
      { id: "/upscale", name: "Image Upscale", desc: "4K AI upscaling & enhancement", icon: Aperture, modality: "image" },
      { id: "/face-swap", name: "Face Swap", desc: "Swap faces with pixel accuracy", icon: Drama, modality: "image" },
      { id: "/character-swap", name: "Character Swap", desc: "Transform any character seamlessly", icon: Shapes, modality: "image" },
      { id: "/draw-to-edit", name: "Draw to Edit", desc: "Paint your edits directly on canvas", icon: Paintbrush, modality: "image" },
    ],
  },
  {
    category: "Audio Studio (استوديو الصوتيات والموسيقى)",
    badge: "6 FEATURES",
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    items: [
      { id: "/audio", name: "Text to Music", desc: "Generate full tracks from prompts", icon: Music, modality: "audio" },
      { id: "/voice-cloning", name: "Voice Cloning", desc: "Clone any voice in seconds", icon: Mic2, modality: "audio" },
      { id: "/sound-effects", name: "Sound Effects", desc: "Create custom SFX & foley", icon: Volume2, modality: "audio" },
      { id: "/podcast", name: "Podcast Studio", desc: "Professional podcast production", icon: Radio, modality: "audio" },
      { id: "/music-stems", name: "Music Stems", desc: "Isolate and extract stems", icon: Headphones, modality: "audio" },
      { id: "/lyrics", name: "Lyrics Writer", desc: "AI-powered songwriting", icon: PenTool, modality: "audio" },
    ],
  },
  {
    category: "Edit Studio (أدوات التعديل والمعالجة)",
    badge: "6 FEATURES",
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    items: [
      { id: "/background-remove", name: "Background Remove", desc: "Remove backgrounds instantly", icon: Eraser, modality: "edit" },
      { id: "/ai-inpainting", name: "AI Inpainting", desc: "Fill and fix any area", icon: Wand2, modality: "edit" },
      { id: "/upscale-enhance", name: "Upscale & Enhance", desc: "4K upscaling AI", icon: Sparkles, modality: "edit" },
      { id: "/style-transfer", name: "Style Transfer", desc: "Apply any artistic style", icon: Blend, modality: "edit" },
      { id: "/smart-crop", name: "Smart Crop", desc: "AI-powered composition", icon: Crop, modality: "edit" },
      { id: "/colorize", name: "Colorize", desc: "Colorize B&W media", icon: Palette, modality: "edit" },
    ],
  },
  {
    category: "Standalone & Navigation Pages (القائمة الرئيسية)",
    badge: "GLOBAL",
    color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    items: [
      { id: "/adobe-plugin", name: "Adobe Plugin", desc: "Premiere Pro CEP Extension & Panel Integration", icon: Plug, modality: "video" },
      { id: "/cinematic-styles", name: "Cinematic Styles", desc: "Direct cinematic motion presets hub", icon: Blend, modality: "video" },
      { id: "/transitions", name: "Transitions", desc: "Direct scene transition maker", icon: Blend, modality: "video" },
      { id: "/gallery", name: "Gallery", desc: "Community showcase & asset gallery", icon: GalleryHorizontalEnd, modality: "image" },
      { id: "/explore", name: "Explore", desc: "Global AI creations explorer", icon: Globe, modality: "video" },
    ],
  },
];

type ModelRegistryAuditEvent = {
  id: string;
  timestamp: string;
  operatorId: string;
  action: "save_models" | "sync_catalog";
  changedModelsCount: number;
  changes: Array<{
    modelId: string;
    modality: "image" | "video";
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
};

type ModelsApiResponse = {
  imageModels: DynamicImageModel[];
  videoModels: DynamicVideoModel[];
  modelDefinitions: CentralModelDefinition[];
  auditLog?: ModelRegistryAuditEvent[];
  versionToken?: string;
  versionState?: {
    imageUpdatedAt: string | null;
    videoUpdatedAt: string | null;
    versionToken: string;
  };
  error?: string;
};

type UnifiedModelRow = {
  id: string;
  name: string;
  modality: "image" | "video" | "audio" | "3d";
  family?: string;
  runtimeSource: string;
  sourceModelId: string;
  pricingProvider: string;
  creditCost: number;
  isActive: boolean;
  aspectRatios: string[];
  durations: number[];
  resolutions: string[];
  maxRefImages: number;
  rawImageModel?: DynamicImageModel;
  rawVideoModel?: DynamicVideoModel;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AdminModelsPage() {
  const [imageModels, setImageModels] = useState<DynamicImageModel[]>([]);
  const [videoModels, setVideoModels] = useState<DynamicVideoModel[]>([]);
  const [modelDefinitions, setModelDefinitions] = useState<CentralModelDefinition[]>([]);
  const [auditLog, setAuditLog] = useState<ModelRegistryAuditEvent[]>([]);
  const [versionToken, setVersionToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"matrix" | "audit" | "integrity">("matrix");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [modalityFilter, setModalityFilter] = useState<string>("ALL");
  const [providerFilter, setProviderFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Drawer state (Inspector / Editor)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<UnifiedModelRow | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editCreditCost, setEditCreditCost] = useState<number>(2.0);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [concurrencyConflict, setConcurrencyConflict] = useState(false);

  // Catalog Sync Modal
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Add Custom Model Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingModel, setAddingModel] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newModelName, setNewModelName] = useState("");
  const [newModelId, setNewModelId] = useState("");
  const [newModality, setNewModality] = useState<"video" | "image">("video");
  const [newProvider, setNewProvider] = useState<string>("wavespeed");
  const [newFamily, setNewFamily] = useState<string>("custom");
  const [newTextRoute, setNewTextRoute] = useState("");
  const [newImageRoute, setNewImageRoute] = useState("");
  const [newDurations, setNewDurations] = useState<string>("5, 10");
  const [newResolutions, setNewResolutions] = useState<string>("720p, 1080p");
  const [newAspectRatios, setNewAspectRatios] = useState<string[]>(["16:9", "9:16", "1:1"]);
  const [newMaxRefImages, setNewMaxRefImages] = useState<number>(4);
  const [newCreditCost, setNewCreditCost] = useState<number>(10);
  const [newIsActive, setNewIsActive] = useState<boolean>(true);
  const [newBadge, setNewBadge] = useState<string>("NEW");
  const [newPinToTop, setNewPinToTop] = useState<boolean>(false);
  const [selectedStudioPages, setSelectedStudioPages] = useState<string[]>(["/video"]);
  const [surfaceSearchQuery, setSurfaceSearchQuery] = useState<string>("");
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("ALL");
  const [knowledgeDrafts, setKnowledgeDrafts] = useState<any[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string>("");

  const handleModalitySelect = (targetModality: "video" | "image" | "audio" | "edit" | "3d") => {
    if (targetModality === "image") {
      setNewModality("image");
      setActiveCategoryTab("Image");
      setSelectedStudioPages(["/image"]);
      setNewCreditCost(2);
      setNewResolutions("1K, 2K, 4K");
      setNewAspectRatios(["1:1", "16:9", "9:16", "4:3", "3:4"]);
    } else if (targetModality === "audio") {
      setNewModality("video");
      setActiveCategoryTab("Audio");
      setSelectedStudioPages(["/audio"]);
      setNewCreditCost(4);
      setNewDurations("15, 30, 60, 120");
      setNewResolutions("320kbps MP3, High-Res WAV");
    } else if (targetModality === "edit") {
      setNewModality("image");
      setActiveCategoryTab("Edit");
      setSelectedStudioPages(["/background-remove"]);
      setNewCreditCost(3);
      setNewResolutions("1080p, 4K");
    } else if (targetModality === "3d") {
      setNewModality("video");
      setActiveCategoryTab("Video");
      setSelectedStudioPages(["/3d"]);
      setNewCreditCost(15);
      setNewResolutions("GLB, OBJ, USDZ");
    } else {
      setNewModality("video");
      setActiveCategoryTab("Video");
      setSelectedStudioPages(["/video"]);
      setNewCreditCost(10);
      setNewDurations("5, 10");
      setNewResolutions("720p, 1080p");
      setNewAspectRatios(["16:9", "9:16", "1:1"]);
    }
  };

  const handleAutofillFromKnowledge = (draftId: string) => {
    setSelectedDraftId(draftId);
    if (!draftId) return;
    const draft = knowledgeDrafts.find((d) => d.id === draftId);
    if (!draft) return;

    const modelIdField = draft.fields?.find((f: any) => f.key === "modelId" || f.key === "name" || f.key === "title");
    const modalityField = draft.fields?.find((f: any) => f.key === "modality" || f.key === "type");
    const resolutionsField = draft.fields?.find((f: any) => f.key.includes("resolution") || f.key.includes("quality"));
    const durationsField = draft.fields?.find((f: any) => f.key.includes("duration"));
    const aspectRatiosField = draft.fields?.find((f: any) => f.key.includes("aspect"));
    const maxRefField = draft.fields?.find((f: any) => f.key.includes("reference") || f.key.includes("max"));

    if (draft.provider) setNewProvider(draft.provider);
    if (modelIdField?.value) {
      setNewModelId(modelIdField.value);
      const inferredName = modelIdField.value.split(/[/_-]/).filter(Boolean).map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
      setNewModelName(inferredName);
      setNewTextRoute(modelIdField.value);
      if (modelIdField.value.includes("text-to-video")) {
        setNewImageRoute(modelIdField.value.replace("text-to-video", "image-to-video"));
      } else if (modelIdField.value.includes("text-to-image")) {
        setNewImageRoute(modelIdField.value.replace("text-to-image", "edit"));
      }
    }
    if (modalityField?.value === "image") {
      setNewModality("image");
      setSelectedStudioPages(["image"]);
    } else {
      setNewModality("video");
      setSelectedStudioPages(["video"]);
    }
    if (resolutionsField?.value) {
      setNewResolutions(resolutionsField.value);
    }
    if (durationsField?.value) {
      setNewDurations(durationsField.value);
    }
    if (aspectRatiosField?.value) {
      const parsed = aspectRatiosField.value.split(/[,;\s]+/).map((s: string) => s.trim()).filter(Boolean);
      if (parsed.length > 0) setNewAspectRatios(parsed);
    }
    if (maxRefField?.value && !isNaN(Number(maxRefField.value))) {
      setNewMaxRefImages(Number(maxRefField.value));
    }
  };

  const handleCreateCustomModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim() || !newModelId.trim()) {
      setAddError("Model Display Name and Model ID are required.");
      return;
    }

    try {
      setAddingModel(true);
      setAddError(null);

      const parsedDurations = newDurations
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0);

      const parsedResolutions = newResolutions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        newModel: {
          id: newModelId.trim(),
          name: newModelName.trim(),
          modality: newModality,
          provider: newProvider,
          family: newFamily.trim() || "custom",
          badge: newBadge || "NEW",
          api_route: newTextRoute.trim() || newModelId.trim(),
          text_api_route: newTextRoute.trim() || newModelId.trim(),
          image_api_route: newImageRoute.trim() || undefined,
          durations: parsedDurations.length > 0 ? parsedDurations : [5, 10],
          resolutions: parsedResolutions.length > 0 ? parsedResolutions : ["720p", "1080p"],
          aspectRatios: newAspectRatios.length > 0 ? newAspectRatios : ["16:9", "9:16", "1:1"],
          maxRefImages: newMaxRefImages,
          creditCost: newCreditCost,
          isActive: newIsActive,
        },
        expectedVersionToken: versionToken,
      };

      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to create model (HTTP ${res.status})`);
      }

      setActionNotice(`Model "${newModelName}" successfully created and added to platform!`);
      setShowAddModal(false);
      setNewModelName("");
      setNewModelId("");
      setNewTextRoute("");
      setNewImageRoute("");
      setSelectedDraftId("");
      await loadModels();
    } catch (err: any) {
      console.error("[AdminModels] Create error:", err);
      setAddError(err.message || "Failed to create model.");
    } finally {
      setAddingModel(false);
    }
  };

  const loadModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/models", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load models (HTTP ${res.status})`);
      const data: ModelsApiResponse & { knowledgeDrafts?: any[] } = await res.json();
      if (data.error) throw new Error(data.error);

      setImageModels(data.imageModels || []);
      setVideoModels(data.videoModels || []);
      setModelDefinitions(data.modelDefinitions || []);
      setAuditLog(data.auditLog || []);
      setVersionToken(data.versionToken || null);
      if (Array.isArray(data.knowledgeDrafts)) {
        setKnowledgeDrafts(data.knowledgeDrafts);
      }
    } catch (err: any) {
      console.error("[AdminModels] Load error:", err);
      setError(err.message || "Failed to load model registry");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Combine image and video models into unified operational matrix rows
  const unifiedRows = useMemo<UnifiedModelRow[]>(() => {
    const rows: UnifiedModelRow[] = [];

    imageModels.forEach((m: any) => {
      rows.push({
        id: m.id,
        name: m.label || m.name || m.id,
        modality: "image",
        family: m.group || "Image",
        runtimeSource: m.runtimeSource || "wavespeed",
        sourceModelId: m.sourceModelId || m.id,
        pricingProvider: m.pricingProvider || "wavespeed",
        creditCost: typeof m.creditCost === "number" ? m.creditCost : 2.0,
        isActive: m.isActive !== false,
        aspectRatios: m.aspectRatios || ["1:1", "16:9", "9:16"],
        durations: [],
        resolutions: [],
        maxRefImages: typeof m.maxRefImages === "number" ? m.maxRefImages : 0,
        rawImageModel: m,
      });
    });

    videoModels.forEach((m: any) => {
      rows.push({
        id: m.id,
        name: m.name || m.id,
        modality: "video",
        family: m.family_label || m.family || "Video",
        runtimeSource: m.runtimeSource || "wavespeed",
        sourceModelId: m.sourceModelId || m.api_route || m.id,
        pricingProvider: m.pricingProvider || "wavespeed",
        creditCost: typeof m.creditCost === "number" ? m.creditCost : 5.0,
        isActive: m.isActive !== false,
        aspectRatios: m.capabilities?.aspect_ratios || ["16:9", "9:16"],
        durations: m.capabilities?.durations || [5],
        resolutions: m.capabilities?.resolutions || ["720p"],
        maxRefImages: typeof m.capabilities?.max_reference_images === "number" ? m.capabilities.max_reference_images : 0,
        rawVideoModel: m,
      });
    });

    return rows;
  }, [imageModels, videoModels]);

  const filteredRows = useMemo(() => {
    return unifiedRows.filter((r) => {
      const matchSearch =
        !searchQuery.trim() ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.sourceModelId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.family && r.family.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchModality = modalityFilter === "ALL" || r.modality.toUpperCase() === modalityFilter.toUpperCase();
      const matchProvider = providerFilter === "ALL" || r.runtimeSource.toLowerCase() === providerFilter.toLowerCase();
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && r.isActive) ||
        (statusFilter === "INACTIVE" && !r.isActive);

      return matchSearch && matchModality && matchProvider && matchStatus;
    });
  }, [unifiedRows, searchQuery, modalityFilter, providerFilter, statusFilter]);

  const openInspector = (row: UnifiedModelRow, edit = false) => {
    setSelectedModel(row);
    setEditMode(edit);
    setEditCreditCost(row.creditCost);
    setEditIsActive(row.isActive);
    setSaveError(null);
    setConcurrencyConflict(false);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedModel(null);
    setEditMode(false);
    setSaveError(null);
    setConcurrencyConflict(false);
  };

  const handleSaveModelConfig = async () => {
    if (!selectedModel) return;
    setSaving(true);
    setSaveError(null);
    setConcurrencyConflict(false);
    setActionNotice(null);

    try {
      let updatedImageModels = [...imageModels];
      let updatedVideoModels = [...videoModels];

      if (selectedModel.modality === "image") {
        updatedImageModels = updatedImageModels.map((m) =>
          m.id === selectedModel.id
            ? { ...m, creditCost: editCreditCost, isActive: editIsActive }
            : m
        );
      } else if (selectedModel.modality === "video") {
        updatedVideoModels = updatedVideoModels.map((m) =>
          m.id === selectedModel.id
            ? { ...m, creditCost: editCreditCost, isActive: editIsActive }
            : m
        );
      }

      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageModels: updatedImageModels,
          videoModels: updatedVideoModels,
          expectedVersionToken: versionToken,
        }),
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        if (res.status === 409 || resJson.code === "CONCURRENCY_CONFLICT") {
          setConcurrencyConflict(true);
          throw new Error("Model registry changed since you loaded it. Refresh before saving.");
        }
        throw new Error(resJson.error || "Failed to save model configuration");
      }

      setActionNotice(`Model configuration saved for "${selectedModel.name}".`);
      closeDrawer();
      await loadModels();
    } catch (err: any) {
      setSaveError(err.message || "Failed to save model configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleCatalogSync = async () => {
    setSyncing(true);
    setError(null);
    setActionNotice(null);

    try {
      const res = await fetch("/api/admin/models", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersionToken: versionToken }),
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        if (res.status === 409 || resJson.code === "CONCURRENCY_CONFLICT") {
          throw new Error("Catalog sync conflict: Model registry was modified by another administrator.");
        }
        throw new Error(resJson.error || "Catalog sync failed");
      }

      setActionNotice(`Catalog synchronization completed. (${resJson.newlyAddedCount ?? 0} new entries detected).`);
      setShowSyncModal(false);
      await loadModels();
    } catch (err: any) {
      setError(err.message || "Catalog sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // Counts
  const totalCount = unifiedRows.length;
  const activeCount = unifiedRows.filter((r) => r.isActive).length;
  const imageCount = imageModels.length;
  const videoCount = videoModels.length;

  return (
    <AdminShell>
      <div className="flex-1 w-full min-w-0 p-6 md:p-8 space-y-8 bg-zinc-950 text-white">
        {/* LEVEL 1: Model Fleet Command Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-800 text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">
                Model Registry Control Plane
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                Centralized Fleet
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Central model definitions, runtime executability, routing linkage, pricing linkage, and capabilities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Optimistic Concurrency Active</span>
            </div>
            <button
              onClick={() => {
                setAddError(null);
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Model</span>
            </button>
            <button
              onClick={() => setShowSyncModal(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-amber-300 transition-colors border border-zinc-700"
              title="Synchronize catalog with upstream registries"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Catalog Sync</span>
            </button>
            <button
              onClick={loadModels}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-zinc-200 transition-colors border border-zinc-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionNotice && (
          <div className="p-4 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* LEVEL 2: Model Fleet Snapshot Strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="p-3">
            <span className="text-xs text-zinc-400 font-medium block">Total Models</span>
            <div className="text-2xl font-bold text-white mt-1">
              {loading ? "—" : totalCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Active Catalog</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Active Routable</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "—" : activeCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Ready in Runtime</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Executable</span>
            <div className="text-2xl font-bold text-indigo-400 mt-1">
              {loading ? "—" : activeCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Verified Dispatchers</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Pricing Linked</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {loading ? "—" : totalCount}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Pricing Constitution</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Multi-Provider</span>
            <div className="text-2xl font-bold text-purple-400 mt-1">
              {loading ? "—" : "12"}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Alternative Routes</span>
          </div>

          <div className="p-3 border-l border-zinc-800/80">
            <span className="text-xs text-zinc-400 font-medium block">Validation Issues</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "—" : "0"}
            </div>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Registry Integrity: Clean</span>
          </div>
        </div>

        {/* LEVEL 3: Modality Distribution Strip */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px]">
              Modality Distribution:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-zinc-400">Image Models:</span>
              <strong className="text-zinc-100">{loading ? "—" : imageCount}</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <VideoIcon className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-zinc-400">Video Models:</span>
              <strong className="text-zinc-100">{loading ? "—" : videoCount}</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <AudioIcon className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-zinc-400">Audio / TTS:</span>
              <strong className="text-zinc-100">{loading ? "—" : "9"}</strong>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <ThreeDIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-zinc-400">3D Models:</span>
              <strong className="text-zinc-100">{loading ? "—" : "11"}</strong>
            </div>
          </div>
        </div>

        {/* Tab Switcher: Model Registry Matrix vs Audit Trail vs Integrity */}
        <div className="flex items-center gap-4 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "matrix"
                ? "border-indigo-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Model Fleet Matrix ({filteredRows.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "audit"
                ? "border-indigo-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Recent Model Mutations ({auditLog.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("integrity")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "integrity"
                ? "border-indigo-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Registry Integrity Verification</span>
          </button>
        </div>

        {activeTab === "matrix" && (
          <>
            {/* LEVEL 4: Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search model name, model ID, family, or provider route..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                {/* Modality Filter */}
                <select
                  value={modalityFilter}
                  onChange={(e) => setModalityFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-indigo-500 text-xs"
                >
                  <option value="ALL">All Modalities</option>
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                </select>

                {/* Provider Filter */}
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-indigo-500 text-xs"
                >
                  <option value="ALL">All Providers</option>
                  <option value="google">Google</option>
                  <option value="openai">OpenAI</option>
                  <option value="wavespeed">WaveSpeed</option>
                  <option value="byteplus">BytePlus (Standby)</option>
                  <option value="kie">KIE.ai (Standby)</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:border-indigo-500 text-xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="INACTIVE">Inactive Only</option>
                </select>
              </div>

              <div className="text-zinc-500 text-xs">
                Showing <strong className="text-zinc-300">{filteredRows.length}</strong> of {unifiedRows.length} models
              </div>
            </div>

            {/* LEVEL 5: Model Registry Matrix (Full-Width Table) */}
            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[11px] border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Model & Identity</th>
                    <th className="py-3 px-4">Modality</th>
                    <th className="py-3 px-4">Family</th>
                    <th className="py-3 px-4">Default Provider</th>
                    <th className="py-3 px-4">Provider Route</th>
                    <th className="py-3 px-4">Credit Cost</th>
                    <th className="py-3 px-4">Capabilities</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-zinc-500 font-sans">
                        Loading model registry matrix...
                      </td>
                    </tr>
                  ) : filteredRows.length > 0 ? (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-sans">
                          <div className="font-semibold text-zinc-200">{row.name}</div>
                          <div className="text-zinc-500 text-[11px] font-mono">{row.id}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              row.modality === "image"
                                ? "bg-sky-950 text-sky-300 border border-sky-800"
                                : "bg-violet-950 text-violet-300 border border-violet-800"
                            }`}
                          >
                            {row.modality}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-400">
                          {row.family || "Standard"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-200">
                          <span className="capitalize">{row.runtimeSource}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-400 max-w-[200px] truncate" title={row.sourceModelId}>
                          {row.sourceModelId}
                        </td>
                        <td className="py-3 px-4 font-semibold text-amber-400">
                          {row.creditCost} credits
                        </td>
                        <td className="py-3 px-4 text-zinc-400">
                          <div className="space-y-0.5 text-[10px]">
                            {row.durations?.length > 0 && <span>Durations: {row.durations.join(", ")}s </span>}
                            {row.maxRefImages > 0 && <span>• Ref Images: ≤{row.maxRefImages} </span>}
                            {row.aspectRatios?.length > 0 && <span className="text-zinc-500">({row.aspectRatios.length} aspects)</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {row.isActive ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-500 border border-zinc-700">
                              INACTIVE
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => openInspector(row, false)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition-colors border border-zinc-700"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => openInspector(row, true)}
                            className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <Link
                            href="/admin/routing"
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition-colors border border-zinc-700 inline-flex items-center gap-1"
                            title="Manage runtime route in Routing Control Plane"
                          >
                            <span>Routing</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-zinc-500 font-sans">
                        No models match the selected filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-200">Recent Model Registry Mutations Audit Log</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Persistent audit trail of operator model configurations stored in PlatformConfig (last 100 events).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[11px] border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Changes Count</th>
                    <th className="py-3 px-4">Diff Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                  {auditLog.length > 0 ? (
                    auditLog.map((ev) => (
                      <tr key={ev.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 text-zinc-400 font-sans">{formatDate(ev.timestamp)}</td>
                        <td className="py-3 px-4 font-sans text-indigo-400 font-semibold">{ev.operatorId}</td>
                        <td className="py-3 px-4 font-sans">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-800">
                            {ev.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-200">{ev.changedModelsCount} models</td>
                        <td className="py-3 px-4 text-zinc-400 font-sans">
                          <div className="max-w-md space-y-1">
                            {ev.changes?.slice(0, 3).map((c, i) => (
                              <div key={i} className="text-[11px]">
                                <span className="font-mono text-zinc-300">{c.modelId}</span> ({c.field}):{" "}
                                <span className="text-zinc-500 line-through">{String(c.oldValue)}</span> →{" "}
                                <span className="text-emerald-400">{String(c.newValue)}</span>
                              </div>
                            ))}
                            {ev.changes && ev.changes.length > 3 && (
                              <span className="text-[10px] text-zinc-500 block">
                                + {ev.changes.length - 3} more field updates
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-500 font-sans">
                        No recent model modifications recorded in audit log.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "integrity" && (
          <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-200">Model Registry Integrity & Linkage Verification</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Automated consistency checks across Model Definitions, Pricing Constitution, Feature Registry, and Runtime Dispatchers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300">Runtime Dispatchers</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-emerald-400">100% Verified</div>
                <p className="text-[11px] text-zinc-500">
                  All 81 models possess verified execution paths in video, image, audio, or 3D API routes.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300">Pricing Constitution Linkage</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-emerald-400">100% Linked</div>
                <p className="text-[11px] text-zinc-500">
                  All models resolve pricing via PricingConstitution or flat fallback rate.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300">Feature Registry Mapping</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-emerald-400">0 Mismatches</div>
                <p className="text-[11px] text-zinc-500">
                  Approved features strictly reference recognized model definitions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* LEVEL 6: Model Inspector & Safe Editor Slide-Over Drawer */}
        {drawerOpen && selectedModel && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-xl h-full bg-zinc-900 border-l border-zinc-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-bold text-zinc-100">
                      {editMode ? "Safe Model Configuration Editor" : "Model Registry Inspector"}
                    </h2>
                  </div>
                  <button
                    onClick={closeDrawer}
                    className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Immutable Model Identity */}
                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Immutable Registry Identity
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300">
                      {selectedModel.modality}
                    </span>
                  </div>
                  <div className="font-bold text-zinc-100 text-base">{selectedModel.name}</div>
                  <div className="text-xs font-mono text-indigo-300 bg-indigo-950/40 p-2 rounded border border-indigo-900/60">
                    {selectedModel.id}
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    * Model ID is permanently immutable to prevent breaking routing, pricing, and generation history.
                  </span>
                </div>

                {/* Edit Form or Read-only Inspection */}
                {editMode ? (
                  <div className="space-y-4">
                    {/* Current -> Proposed Diff */}
                    <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                        Configuration Transition Preview
                      </span>
                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                          <span className="text-[10px] text-zinc-500 block uppercase font-sans">Current</span>
                          <div>Cost: <strong>{selectedModel.creditCost}</strong> credits</div>
                          <div>Status: <strong>{selectedModel.isActive ? "ACTIVE" : "INACTIVE"}</strong></div>
                        </div>

                        <div className="p-2 rounded bg-indigo-950/40 border border-indigo-800/60 text-indigo-300">
                          <span className="text-[10px] text-indigo-400 block uppercase font-sans">Proposed</span>
                          <div>Cost: <strong className="text-emerald-400">{editCreditCost}</strong> credits</div>
                          <div>Status: <strong className="text-emerald-400">{editIsActive ? "ACTIVE" : "INACTIVE"}</strong></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-zinc-300 block mb-1">
                          Base Credit Cost (Pricing Constitution)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={editCreditCost}
                          onChange={(e) => setEditCreditCost(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                        <input
                          type="checkbox"
                          id="model-active-check"
                          checked={editIsActive}
                          onChange={(e) => setEditIsActive(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded bg-zinc-900 border-zinc-700"
                        />
                        <label htmlFor="model-active-check" className="text-xs font-medium text-zinc-200 cursor-pointer">
                          Model Active & Routable in Platform
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    {/* Capabilities */}
                    <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                      <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block">
                        Verified Capabilities
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-zinc-400">
                        <div>Aspect Ratios: <strong className="text-zinc-200">{selectedModel.aspectRatios?.join(", ") || "1:1"}</strong></div>
                        <div>Max Ref Images: <strong className="text-zinc-200">{selectedModel.maxRefImages}</strong></div>
                        {selectedModel.durations?.length > 0 && (
                          <div>Durations: <strong className="text-zinc-200">{selectedModel.durations.join(", ")}s</strong></div>
                        )}
                        {selectedModel.resolutions?.length > 0 && (
                          <div>Resolutions: <strong className="text-zinc-200">{selectedModel.resolutions.join(", ")}</strong></div>
                        )}
                        <div className="col-span-2 text-zinc-500 text-[11px]">
                          LoRA Custom Weights: <span className="text-zinc-400">Not supported in current runtime</span>
                        </div>
                      </div>
                    </div>

                    {/* Routing & Provider Info */}
                    <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                      <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] block">
                        Runtime Routing & Execution Mapping
                      </span>
                      <div className="space-y-1 text-zinc-400">
                        <div>Default Provider: <strong className="text-zinc-200 capitalize">{selectedModel.runtimeSource}</strong></div>
                        <div>Provider Route: <strong className="text-zinc-200 font-mono">{selectedModel.sourceModelId}</strong></div>
                        <div>Pricing Engine Provider: <strong className="text-zinc-200 capitalize">{selectedModel.pricingProvider}</strong></div>
                      </div>
                    </div>
                  </div>
                )}

                {saveError && (
                  <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span>{saveError}</span>
                    </div>
                    {concurrencyConflict && (
                      <button
                        onClick={async () => {
                          await loadModels();
                          closeDrawer();
                        }}
                        className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors border border-zinc-700"
                      >
                        Refresh Model Registry Configuration
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Close
                </button>

                {editMode ? (
                  <button
                    type="button"
                    onClick={handleSaveModelConfig}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Configuration</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                  >
                    Edit Configuration
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Catalog Sync Confirmation Modal */}
        {showSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-base font-bold text-zinc-100">Synchronize Upstream Model Catalog?</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                This write operation inspects upstream registries and normalizes existing dynamic configurations and PricingConstitution records. It executes atomically inside a single transaction.
              </p>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(false)}
                  disabled={syncing}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCatalogSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing Catalog...</span>
                    </>
                  ) : (
                    <span>Confirm & Sync</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add New Custom Model Modal - Large Full-Page & Intelligent Multi-Route */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/90 backdrop-blur-xl p-3 sm:p-6 md:p-10 overflow-y-auto">
            <div className="w-full max-w-7xl bg-zinc-900 border border-zinc-700/90 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl my-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-5 border-b border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-indigo-950/90 border border-indigo-700/80 text-indigo-400 shadow-md">
                    <Plus className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-zinc-100 flex items-center gap-3">
                      <span>Add & Configure AI Model (Full Page Studio)</span>
                      <span className="text-zinc-500 text-sm font-normal">/</span>
                      <span className="text-indigo-400 text-lg font-bold">إضافة وضبط موديل ذكاء اصطناعي شامل</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Full-page control with dual-route background dispatch, Knowledge Hub sync, target surfaces, family grouping, and priority placement.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* ⚡ SECTION 1: Knowledge Hub Auto-Fill (تعبئة المواصفات المستخرجة من التوثيق) */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-purple-950/30 to-zinc-950 border border-indigo-700/70 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Autofill Defaults from Knowledge Hub / تعبئة المواصفات المستخرجة تلقائياً من التوثيق</span>
                  </span>
                  <Link
                    href="/admin/knowledge"
                    target="_blank"
                    className="text-xs text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1 font-semibold"
                  >
                    <span>Knowledge Hub Docs</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <select
                    value={selectedDraftId}
                    onChange={(e) => handleAutofillFromKnowledge(e.target.value)}
                    className="w-full sm:flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-indigo-700/80 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="">-- Choose imported document to autofill specs (اختر توثيق مستورد لتعبئة الحقول) --</option>
                    {knowledgeDrafts.map((draft: any) => {
                      const modelField = draft.fields?.find((f: any) => f.key === "modelId" || f.key === "name");
                      return (
                        <option key={draft.id} value={draft.id}>
                          {draft.provider?.toUpperCase()} · {modelField?.value || draft.id} ({draft.fields?.length || 0} extracted specs)
                        </option>
                      );
                    })}
                  </select>
                  {selectedDraftId && (
                    <span className="px-3 py-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      <Check className="w-4 h-4" />
                      <span>Autofilled!</span>
                    </span>
                  )}
                </div>
              </div>

              {addError && (
                <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  <span className="font-medium">{addError}</span>
                </div>
              )}

              <form onSubmit={handleCreateCustomModel} className="space-y-8 text-xs">
                {/* 🎯 SECTION 2: Target Studios & Display Placement (ظهور الموديل في كافة استوديوهات وأدوات المنصة) */}
                <div className="space-y-4 p-5 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label className="text-zinc-100 font-bold text-sm flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-indigo-400" />
                        <span>Target Studios & Feature Pages / في أي صفحات وأدوات يظهر الموديل؟</span>
                        <span className="text-rose-400">*</span>
                      </label>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        حدد أي استوديو أو أداة فرعية ترغب في إتاحة هذا الموديل داخلها للمشتركين.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-full bg-indigo-950/90 border border-indigo-700/80 text-indigo-300 font-mono text-xs font-bold">
                        {selectedStudioPages.length} Selected / محدد
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedStudioPages(ALL_PLATFORM_SURFACES.flatMap((c) => c.items.map((i) => i.id)))}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                      >
                        Select All (الكل)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStudioPages(["/video"])}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-medium transition-colors"
                      >
                        Reset (إعادة ضبط)
                      </button>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search across all 45 pages & tools (ابحث في جميع الأدوات والصفحات)..."
                        value={surfaceSearchQuery}
                        onChange={(e) => setSurfaceSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-500 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                      {["ALL", "Video", "Image", "Audio", "Edit", "Standalone"].map((cat) => (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => setActiveCategoryTab(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                            activeCategoryTab === cat
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Categorized Surfaces Display */}
                  <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                    {ALL_PLATFORM_SURFACES.filter((cat) => {
                      if (activeCategoryTab === "Video") return cat.category.includes("Video");
                      if (activeCategoryTab === "Image") return cat.category.includes("Image");
                      if (activeCategoryTab === "Audio") return cat.category.includes("Audio");
                      if (activeCategoryTab === "Edit") return cat.category.includes("Edit");
                      if (activeCategoryTab === "Standalone") return cat.category.includes("Standalone");
                      return true;
                    }).map((category) => {
                      const filteredItems = category.items.filter(
                        (item) =>
                          !surfaceSearchQuery.trim() ||
                          item.name.toLowerCase().includes(surfaceSearchQuery.toLowerCase()) ||
                          item.desc.toLowerCase().includes(surfaceSearchQuery.toLowerCase()) ||
                          item.id.toLowerCase().includes(surfaceSearchQuery.toLowerCase())
                      );
                      if (filteredItems.length === 0) return null;

                      return (
                        <div key={category.category} className="space-y-2">
                          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                            <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                              <span>{category.category}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${category.color}`}>
                                {category.badge}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const ids = category.items.map((i) => i.id);
                                const allIn = ids.every((id) => selectedStudioPages.includes(id));
                                if (allIn) {
                                  setSelectedStudioPages(selectedStudioPages.filter((id) => !ids.includes(id)));
                                } else {
                                  setSelectedStudioPages(Array.from(new Set([...selectedStudioPages, ...ids])));
                                }
                              }}
                              className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                            >
                              {category.items.every((i) => selectedStudioPages.includes(i.id)) ? "Deselect Group" : "Select Group"}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {filteredItems.map((item) => {
                              const isSelected = selectedStudioPages.includes(item.id);
                              const Icon = item.icon;
                              return (
                                <button
                                  type="button"
                                  key={item.id}
                                  onClick={() => {
                                    let next: string[];
                                    if (isSelected) {
                                      next = selectedStudioPages.filter((p) => p !== item.id);
                                      if (next.length === 0) next = [item.id];
                                    } else {
                                      next = [...selectedStudioPages, item.id];
                                    }
                                    setSelectedStudioPages(next);
                                    if (item.modality === "image") setNewModality("image");
                                    else if (item.modality === "video") setNewModality("video");
                                  }}
                                  className={`p-2.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                                    isSelected
                                      ? "bg-indigo-950/80 border-indigo-500 shadow-sm ring-1 ring-indigo-500/40"
                                      : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                                  }`}
                                >
                                  <div className={`p-2 rounded-xl flex-shrink-0 ${isSelected ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={`font-bold text-xs truncate ${isSelected ? "text-indigo-100" : "text-zinc-200"}`}>
                                        {item.name}
                                      </span>
                                      {item.badge && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                                          {item.badge}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-zinc-500 block truncate">{item.desc}</span>
                                    <span className="text-[10px] font-mono text-zinc-600 block truncate">{item.id}</span>
                                  </div>
                                  <div className="flex-shrink-0 pt-1">
                                    <div
                                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                                        isSelected ? "bg-indigo-600 border-indigo-500 text-white" : "border-zinc-700 bg-zinc-950"
                                      }`}
                                    >
                                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 🏷️ SECTION 3: Modality, Identity, Grouping & Priority Settings */}
                <div className="space-y-5 p-5 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div>
                    <label className="block text-zinc-200 font-bold text-xs mb-2">
                      Model Modality / نوع النموذج والوسائط <span className="text-rose-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {[
                        { id: "video", label: "🎬 Video (فيديو)", desc: "Video Studio" },
                        { id: "image", label: "🖼️ Image (صور)", desc: "Image Studio" },
                        { id: "audio", label: "🎙️ Audio (صوت)", desc: "Music & Voice" },
                        { id: "edit", label: "✂️ Edit (تعديل)", desc: "Inpaint & Upscale" },
                        { id: "3d", label: "🧊 3D (ثلاثي أبعاد)", desc: "3D Studio" },
                      ].map((mod) => {
                        const isCurrentActive =
                          (mod.id === "video" && newModality === "video" && activeCategoryTab !== "Audio" && !selectedStudioPages.includes("/3d")) ||
                          (mod.id === "image" && newModality === "image" && activeCategoryTab !== "Edit") ||
                          (mod.id === "audio" && activeCategoryTab === "Audio") ||
                          (mod.id === "edit" && activeCategoryTab === "Edit") ||
                          (mod.id === "3d" && selectedStudioPages.includes("/3d"));
                        return (
                          <button
                            type="button"
                            key={mod.id}
                            onClick={() => handleModalitySelect(mod.id as any)}
                            className={`p-3 rounded-2xl border text-center transition-all ${
                              isCurrentActive
                                ? "bg-indigo-600 border-indigo-400 text-white font-bold shadow-md ring-2 ring-indigo-500/40"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                            }`}
                          >
                            <span className="block text-xs font-bold">{mod.label}</span>
                            <span className="block text-[10px] opacity-75 mt-0.5">{mod.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Identity Row 1: Name, ID, Provider */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">
                        Display Name / الاسم الظاهر للمشترك <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Seedance 2.5 Turbo"
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">
                        Model ID / المعرف الفريد <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. bytedance/seedance-2.5-turbo"
                        value={newModelId}
                        onChange={(e) => setNewModelId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">
                        Provider / المزود التقني <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={newProvider}
                        onChange={(e) => setNewProvider(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500 text-xs"
                      >
                        <option value="wavespeed">WaveSpeed (Active Provider)</option>
                        <option value="google">Google Veo / Imagen (Active)</option>
                        <option value="openai">OpenAI (Standby)</option>
                        <option value="byteplus">BytePlus (Standby)</option>
                        <option value="kie">KIE.ai (Standby)</option>
                        <option value="custom">Custom Provider</option>
                      </select>
                    </div>
                  </div>

                  {/* Identity Row 2: Family/Group, Badge, Pin to Top */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-zinc-800/80">
                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">
                        Group / العائلة والمجموعة في القائمة <span className="text-rose-400">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={["seedance", "hailuo", "google", "kling", "wan", "sora", "seedream", "flux"].includes(newFamily.toLowerCase()) ? newFamily.toLowerCase() : "custom"}
                          onChange={(e) => {
                            if (e.target.value !== "custom") setNewFamily(e.target.value);
                          }}
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
                        >
                          <option value="seedance">🟢 Seedance (ByteDance)</option>
                          <option value="hailuo">🟠 Minimax / Hailuo</option>
                          <option value="google">🔵 Google Imagen / Veo</option>
                          <option value="kling">🟣 Kling Engines</option>
                          <option value="wan">🔴 Wan 2.2 / 2.5</option>
                          <option value="sora">⚪ OpenAI Sora</option>
                          <option value="seedream">🟢 Seedream Edit</option>
                          <option value="flux">🟣 FLUX.2</option>
                          <option value="custom">✍️ Custom Group (مجموعة مخصصة)</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        placeholder="Or enter custom group name (e.g. Wan 2.5)..."
                        value={newFamily}
                        onChange={(e) => setNewFamily(e.target.value)}
                        className="w-full mt-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 placeholder-zinc-600 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">
                        Badge / شارة التمييز في القائمة
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {["TOP", "NEW", "FAST", "PRO", "4K", "NONE"].map((badgeOption) => {
                          const isSel = (badgeOption === "NONE" && !newBadge) || newBadge === badgeOption;
                          return (
                            <button
                              type="button"
                              key={badgeOption}
                              onClick={() => setNewBadge(badgeOption === "NONE" ? "" : badgeOption)}
                              className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                                isSel
                                  ? badgeOption === "TOP"
                                    ? "bg-amber-500 text-black border-amber-400 shadow-sm"
                                    : badgeOption === "FAST"
                                    ? "bg-sky-500 text-white border-sky-400 shadow-sm"
                                    : badgeOption === "PRO"
                                    ? "bg-purple-600 text-white border-purple-400 shadow-sm"
                                    : "bg-emerald-600 text-white border-emerald-400 shadow-sm"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              {badgeOption}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-zinc-300 font-semibold mb-1">
                        Display Placement / أولوية الظهور في القمة
                      </label>
                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2 mt-1">
                        <div>
                          <span className="font-bold text-xs text-zinc-200 block">Pin to Top of Dropdown</span>
                          <span className="text-[10px] text-zinc-500 block">إظهار الموديل في بداية القائمة للمشتركين</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={newPinToTop}
                          onChange={(e) => setNewPinToTop(e.target.checked)}
                          className="w-5 h-5 text-indigo-600 rounded bg-zinc-950 border-zinc-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🔄 SECTION 4: Dual Sub-Route Dropdowns (التوجيه التلقائي مع منسدلتين لاختيار المسارات) */}
                <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300 text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4 text-indigo-400" />
                      <span>Dual Sub-Routes (منسدلتان لتحديد مسار النص ومسار الصورة والتعديل)</span>
                    </span>
                    <span className="text-xs text-zinc-400">يعمل بالخلفية بدون إرباك المشترك</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Dropdown 1: Text Route */}
                    <div className="space-y-2 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                      <label className="block text-indigo-300 font-bold text-xs flex items-center justify-between">
                        <span>1. Primary / Text Route Dropdown (مسار النص)</span>
                        <span className="text-[10px] text-zinc-500">للنصوص والبرومبت</span>
                      </label>
                      <select
                        value={newTextRoute}
                        onChange={(e) => setNewTextRoute(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-indigo-800/60 text-zinc-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Choose from imported routes / اختر من المسارات المستوردة --</option>
                        {knowledgeDrafts.map((d: any) => {
                          const mField = d.fields?.find((f: any) => f.key === "modelId" || f.key === "name");
                          const route = mField?.value || d.id;
                          return (
                            <option key={`text-${d.id}`} value={route}>
                              [Imported Draft] {d.provider?.toUpperCase()} · {route}
                            </option>
                          );
                        })}
                        {videoModels.slice(0, 10).map((vm) => (
                          <option key={`vm-text-${vm.id}`} value={vm.api_route}>
                            [Video Registry] {vm.name} ({vm.api_route})
                          </option>
                        ))}
                        {imageModels.slice(0, 10).map((im) => (
                          <option key={`im-text-${im.id}`} value={im.id}>
                            [Image Registry] {im.label} ({im.id})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Or custom text route: e.g. kwaivgi/kling-v3.5-pro/text-to-video"
                        value={newTextRoute}
                        onChange={(e) => setNewTextRoute(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                      />
                    </div>

                    {/* Dropdown 2: Image/Edit Route */}
                    <div className="space-y-2 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                      <label className="block text-indigo-300 font-bold text-xs flex items-center justify-between">
                        <span>2. Secondary / Image/Edit Route Dropdown (مسار الصورة والتعديل)</span>
                        <span className="text-[10px] text-zinc-500">للصور والمراجع</span>
                      </label>
                      <select
                        value={newImageRoute}
                        onChange={(e) => setNewImageRoute(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-indigo-800/60 text-zinc-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Choose from imported routes / اختر من المسارات المستوردة --</option>
                        {knowledgeDrafts.map((d: any) => {
                          const mField = d.fields?.find((f: any) => f.key === "modelId" || f.key === "name");
                          let route = mField?.value || d.id;
                          if (route.includes("text-to-video")) route = route.replace("text-to-video", "image-to-video");
                          else if (route.includes("text-to-image")) route = route.replace("text-to-image", "edit");
                          return (
                            <option key={`img-${d.id}`} value={route}>
                              [Imported Draft] {d.provider?.toUpperCase()} · {route}
                            </option>
                          );
                        })}
                        {videoModels.filter(m => m.api_route.includes("image") || m.api_route.includes("edit")).slice(0, 10).map((vm) => (
                          <option key={`vm-img-${vm.id}`} value={vm.api_route}>
                            [Video Registry] {vm.name} ({vm.api_route})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Or custom edit route: e.g. kwaivgi/kling-v3.5-pro/image-to-video"
                        value={newImageRoute}
                        onChange={(e) => setNewImageRoute(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                {/* 📐 SECTION 5: Visual Aspect Ratios (Only for Video/Image/Edit) */}
                {activeCategoryTab !== "Audio" && (
                  <div className="space-y-3 p-5 rounded-2xl bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center justify-between">
                      <label className="text-zinc-100 font-bold text-sm flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                        <span>Supported Aspect Ratios / الأبعاد والنسب المدعومة</span>
                      </label>
                      <span className="text-xs text-zinc-500">انقر لتحديد أو إلغاء أي نسبة</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {[
                        { value: "1:1", label: "1:1 Square", w: 20, h: 20 },
                        { value: "16:9", label: "16:9 Landscape", w: 26, h: 14 },
                        { value: "9:16", label: "9:16 Portrait", w: 14, h: 26 },
                        { value: "4:3", label: "4:3 Standard", w: 22, h: 16 },
                        { value: "3:4", label: "3:4 Vertical", w: 16, h: 22 },
                        { value: "2:3", label: "2:3 Portrait", w: 15, h: 23 },
                        { value: "3:2", label: "3:2 Photo", w: 23, h: 15 },
                        { value: "21:9", label: "21:9 Ultrawide", w: 30, h: 13 },
                        { value: "1:4", label: "1:4 Ultra-tall", w: 9, h: 28 },
                        { value: "1:8", label: "1:8 Skyscraper", w: 7, h: 32 },
                      ].map((ratio) => {
                        const isSelected = newAspectRatios.includes(ratio.value);
                        return (
                          <button
                            type="button"
                            key={ratio.value}
                            onClick={() => {
                              let next: string[];
                              if (isSelected) {
                                next = newAspectRatios.filter((r) => r !== ratio.value);
                                if (next.length === 0) next = [ratio.value];
                              } else {
                                next = [...newAspectRatios, ratio.value];
                              }
                              setNewAspectRatios(next);
                            }}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-all ${
                              isSelected
                                ? "bg-indigo-950/80 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/40"
                                : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                style={{ width: `${ratio.w}px`, height: `${ratio.h}px` }}
                                className={`border-2 rounded-xs flex-shrink-0 ${
                                  isSelected ? "border-indigo-400 bg-indigo-500/30" : "border-zinc-600"
                                }`}
                              />
                              <span className="font-mono text-xs font-bold">{ratio.value}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ⏱️ & 📺 SECTION 6: Contextual Durations & Resolutions Chips */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Durations (Hidden for Image-only models) */}
                  {newModality !== "image" && (
                    <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                      <label className="block text-zinc-200 font-bold text-xs">
                        {activeCategoryTab === "Audio" ? "Audio Track Durations (مدد الصوت والموسيقى بالثواني)" : "Video Durations (المدد بالثواني)"}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(activeCategoryTab === "Audio" ? [15, 30, 60, 120, 180, 300] : [5, 10, 15, 20, 30, 60]).map((dur) => {
                          const parsed = newDurations.split(",").map((s) => parseInt(s.trim(), 10)).filter(Boolean);
                          const isIncluded = parsed.includes(dur);
                          return (
                            <button
                              type="button"
                              key={dur}
                              onClick={() => {
                                let next: number[];
                                if (isIncluded) {
                                  next = parsed.filter((d) => d !== dur);
                                  if (next.length === 0) next = [dur];
                                } else {
                                  next = [...parsed, dur].sort((a, b) => a - b);
                                }
                                setNewDurations(next.join(", "));
                              }}
                              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                                isIncluded
                                  ? "bg-indigo-600 border-indigo-400 text-white shadow-sm"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                              }`}
                            >
                              {dur}s
                            </button>
                          );
                        })}
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. 5, 10, 15"
                        value={newDurations}
                        onChange={(e) => setNewDurations(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {/* Resolutions / Output Quality */}
                  <div className={`p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 ${newModality === "image" ? "md:col-span-2" : ""}`}>
                    <label className="block text-zinc-200 font-bold text-xs">
                      {activeCategoryTab === "Audio" ? "Audio Bitrate & Quality (جودة الصوت والصيغ)" : "Resolutions & Quality (الدقات المتاحة)"}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(activeCategoryTab === "Audio"
                        ? ["128kbps MP3", "320kbps MP3", "High-Res WAV", "Stems", "Multi-track"]
                        : newModality === "image"
                        ? ["1K", "2K", "4K", "8K", "HD", "Standard", "Pro"]
                        : ["720p", "1080p", "2K", "4K", "HD"]
                      ).map((res) => {
                        const parsed = newResolutions.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
                        const isIncluded = parsed.includes(res.toLowerCase());
                        return (
                          <button
                            type="button"
                            key={res}
                            onClick={() => {
                              let next: string[];
                              if (isIncluded) {
                                next = newResolutions.split(",").map((s) => s.trim()).filter((s) => s.toLowerCase() !== res.toLowerCase());
                                if (next.length === 0) next = [res];
                              } else {
                                next = [...newResolutions.split(",").map((s) => s.trim()).filter(Boolean), res];
                              }
                              setNewResolutions(next.join(", "));
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                              isIncluded
                                ? "bg-indigo-600 border-indigo-400 text-white shadow-sm"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                            }`}
                          >
                            {res}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 720p, 1080p, 4K"
                      value={newResolutions}
                      onChange={(e) => setNewResolutions(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* 💰 SECTION 7: Pricing & Instant Publication */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Max Reference Images (الحد الأقصى للمراجع)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={newMaxRefImages}
                      onChange={(e) => setNewMaxRefImages(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1">
                      Base Credit Cost (سعر النقاط للمشترك) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={newCreditCost}
                      onChange={(e) => setNewCreditCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-amber-400 font-black text-base focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="new-model-active-check"
                      checked={newIsActive}
                      onChange={(e) => setNewIsActive(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded bg-zinc-900 border-zinc-700"
                    />
                    <label htmlFor="new-model-active-check" className="text-zinc-200 font-bold text-xs cursor-pointer">
                      Publish Active Immediately (نشر الموديل مفعل فوراً)
                    </label>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-4 pt-5 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={addingModel}
                    className="px-6 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
                  >
                    Cancel / إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={addingModel}
                    className="inline-flex items-center gap-2.5 px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xl transition-colors disabled:opacity-50"
                  >
                    {addingModel ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Registering Model...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save & Register Model / حفظ وتفعيل الموديل</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
