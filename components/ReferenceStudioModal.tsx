"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { confirmAction } from "@/lib/confirm-action";
import {
  Sparkles,
  User,
  Package,
  MapPin,
  Camera,
  Wand2,
  PenTool,
  UploadCloud,
  Check,
  Search,
  Pin,
  Plus,
  X,
  Loader2,
  History as HistoryIcon,
  Image as ImageIcon,
  Layers,
  Palette,
  Clapperboard,
} from "lucide-react";
import {
  HOOK_STYLES,
  HOOK_ELEMENTS,
  HOOK_LOCATIONS,
  HOOK_CAMERAS,
  HOOK_EFFECTS,
  HOOK_CHARACTERS,
  HOOK_SKETCHES,
} from "@/lib/hook-studio-config";
import {
  registerUserAsset,
  registerUserAssets,
  unregisterUserAsset,
} from "@/lib/user-asset-registry";

export interface ReferenceStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedStyle?: string | null;
  onSelectStyle?: (id: string | null) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  selectedLocationId?: string | null;
  onSelectLocation?: (id: string | null) => void;
  selectedCameraId?: string | null;
  onSelectCamera?: (id: string | null) => void;
  selectedEffectId?: string | null;
  onSelectEffect?: (id: string | null) => void;
  selectedCharacterId?: string | null;
  onSelectCharacter?: (id: string | null) => void;
  selectedSketchId?: string | null;
  onSelectSketch?: (id: string | null) => void;
  onSelectPalette?: (palette: { id: string; name: string; colors: string[] } | null) => void;
  onAttachFile?: (file: { id: string; url: string; name: string; type: "image" | "video" }) => void;
  isAr?: boolean;
}

export interface UploadedItem {
  id: string;
  url: string;
  name: string;
  type: "image" | "video";
  createdAt: number;
  categoryTab?: string;
}

interface UserCharacterRecord {
  id: string;
  name: string;
  description: string;
  referenceUrls: string[];
  coverUrl: string | null;
  status: string;
  provider: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface UserElementRecord extends UserCharacterRecord {}
interface UserLocationRecord extends UserCharacterRecord {}
interface UserEffectRecord extends UserCharacterRecord {}
interface UserCameraRecord extends UserCharacterRecord {}

interface UserPaletteRecord {
  id: string;
  name: string;
  colors: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_PRESET_ASSETS: UploadedItem[] = [
  {
    id: "preset-1",
    url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    name: "Red Sneakers Product",
    type: "image",
    createdAt: new Date("2026-07-15").getTime(),
  },
  {
    id: "preset-2",
    url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    name: "Wireless Headphones",
    type: "image",
    createdAt: new Date("2026-07-10").getTime(),
  },
  {
    id: "preset-3",
    url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
    name: "Luxury Smart Watch",
    type: "image",
    createdAt: new Date("2026-07-02").getTime(),
  },
  {
    id: "preset-4",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    name: "Portrait Model Shot",
    type: "image",
    createdAt: new Date("2026-06-25").getTime(),
  },
  {
    id: "preset-5",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
    name: "Fashion Studio Shoot",
    type: "image",
    createdAt: new Date("2026-06-18").getTime(),
  },
  {
    id: "preset-6",
    url: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=600&q=80",
    name: "Cosmetic Bottle",
    type: "image",
    createdAt: new Date("2026-06-05").getTime(),
  },
  {
    id: "preset-7",
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
    name: "Modern Architecture",
    type: "image",
    createdAt: new Date("2026-05-28").getTime(),
  },
  {
    id: "preset-8",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
    name: "Corporate Presenter",
    type: "image",
    createdAt: new Date("2026-05-14").getTime(),
  },
];

export function ReferenceStudioModal({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  selectedStyle,
  onSelectStyle,
  selectedElementId,
  onSelectElement,
  selectedLocationId,
  onSelectLocation,
  selectedCameraId,
  onSelectCamera,
  selectedEffectId,
  onSelectEffect,
  selectedCharacterId,
  onSelectCharacter,
  selectedSketchId,
  onSelectSketch,
  onSelectPalette,
  onAttachFile,
  isAr = true,
}: ReferenceStudioModalProps) {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [uploadedItems, setUploadedItems] = useState<UploadedItem[]>([]);
  const [serverAssets, setServerAssets] = useState<UploadedItem[]>(DEFAULT_PRESET_ASSETS);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // User-owned characters (from /api/characters, backed by UserCharacter table)
  const [userCharacters, setUserCharacters] = useState<UserCharacterRecord[]>([]);
  const [isLoadingUserChars, setIsLoadingUserChars] = useState(false);
  const [newCharName, setNewCharName] = useState("");
  const [newCharPreviews, setNewCharPreviews] = useState<Array<{ dataUrl: string; name: string }>>([]);
  const [isSavingChar, setIsSavingChar] = useState(false);
  const [createCharError, setCreateCharError] = useState<string | null>(null);
  const newCharFileInputRef = useRef<HTMLInputElement>(null);

  // User-owned elements (from /api/elements, backed by UserElement table)
  const [userElements, setUserElements] = useState<UserElementRecord[]>([]);
  const [isLoadingUserElems, setIsLoadingUserElems] = useState(false);
  const [newElemName, setNewElemName] = useState("");
  const [newElemPreviews, setNewElemPreviews] = useState<Array<{ dataUrl: string; name: string }>>([]);
  const [isSavingElem, setIsSavingElem] = useState(false);
  const [createElemError, setCreateElemError] = useState<string | null>(null);
  const newElemFileInputRef = useRef<HTMLInputElement>(null);

  // User-owned locations (from /api/locations, backed by UserLocation table)
  const [userLocations, setUserLocations] = useState<UserLocationRecord[]>([]);
  const [isLoadingUserLocs, setIsLoadingUserLocs] = useState(false);
  const [newLocName, setNewLocName] = useState("");
  const [newLocPreviews, setNewLocPreviews] = useState<Array<{ dataUrl: string; name: string }>>([]);
  const [isSavingLoc, setIsSavingLoc] = useState(false);
  const [createLocError, setCreateLocError] = useState<string | null>(null);
  const newLocFileInputRef = useRef<HTMLInputElement>(null);

  // User-owned effects (from /api/effects, backed by UserEffect table)
  const [userEffects, setUserEffects] = useState<UserEffectRecord[]>([]);
  const [isLoadingUserEffs, setIsLoadingUserEffs] = useState(false);
  const [newEffName, setNewEffName] = useState("");
  const [newEffDescription, setNewEffDescription] = useState("");
  const [newEffPreviews, setNewEffPreviews] = useState<Array<{ dataUrl: string; name: string }>>([]);
  const [isSavingEff, setIsSavingEff] = useState(false);
  const [createEffError, setCreateEffError] = useState<string | null>(null);
  const newEffFileInputRef = useRef<HTMLInputElement>(null);

  // User-owned cameras (from /api/cameras, backed by UserCamera table)
  const [userCameras, setUserCameras] = useState<UserCameraRecord[]>([]);
  const [isLoadingUserCams, setIsLoadingUserCams] = useState(false);
  const [newCamName, setNewCamName] = useState("");
  const [newCamDescription, setNewCamDescription] = useState("");
  const [newCamPreviews, setNewCamPreviews] = useState<Array<{ dataUrl: string; name: string }>>([]);
  const [isSavingCam, setIsSavingCam] = useState(false);
  const [createCamError, setCreateCamError] = useState<string | null>(null);
  const newCamFileInputRef = useRef<HTMLInputElement>(null);

  // User-owned color palettes (from /api/palettes, backed by UserPalette table)
  const [userPalettes, setUserPalettes] = useState<UserPaletteRecord[]>([]);
  const [isLoadingUserPals, setIsLoadingUserPals] = useState(false);
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null);
  const [newPalName, setNewPalName] = useState("");
  const [newPalColors, setNewPalColors] = useState<string[]>(["#0EA5E9", "#F43F5E", "#FACC15", "#22C55E"]);
  const [isSavingPal, setIsSavingPal] = useState(false);
  const [createPalError, setCreatePalError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("saad_studio_user_uploads");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setUploadedItems(parsed);
      }
    } catch (e) {
      console.warn("Failed to load reference uploads from localStorage", e);
    }
  }, []);

  const saveUploadedItems = (items: UploadedItem[]) => {
    setUploadedItems(items);
    try {
      localStorage.setItem("saad_studio_user_uploads", JSON.stringify(items.slice(0, 50)));
    } catch (e) {
      console.warn("Failed to save reference uploads to localStorage", e);
    }
  };

  const fetchUserAssets = async () => {
    setIsLoadingAssets(true);
    try {
      const res = await fetch("/api/assets?type=image", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (Array.isArray(data?.assets)) {
          const mapped: UploadedItem[] = data.assets.map((asset: any) => ({
            id: asset.id,
            url: asset.url,
            name: asset.prompt || asset.model || "Asset",
            type: asset.type || "image",
            createdAt: new Date(asset.createdAt || Date.now()).getTime(),
          }));
          setServerAssets(mapped);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user assets:", err);
      setServerAssets(DEFAULT_PRESET_ASSETS);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  useEffect(() => {
    if (isOpen && (!isAuthLoaded || isSignedIn)) {
      fetchUserAssets();
    }
  }, [isOpen, isAuthLoaded, isSignedIn]);

  const fetchUserCharacters = async () => {
    setIsLoadingUserChars(true);
    try {
      const res = await fetch("/api/characters", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (Array.isArray(data?.characters)) {
          setUserCharacters(data.characters as UserCharacterRecord[]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user characters:", err);
    } finally {
      setIsLoadingUserChars(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "character" && (!isAuthLoaded || isSignedIn)) {
      fetchUserCharacters();
    }
  }, [isOpen, activeTab, isAuthLoaded, isSignedIn]);

  const fetchUserElements = async () => {
    setIsLoadingUserElems(true);
    try {
      const res = await fetch("/api/elements", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (Array.isArray(data?.elements)) {
          const rows = data.elements as UserElementRecord[];
          setUserElements(rows);
          registerUserAssets("element", rows.map((r) => ({ id: r.id, name: r.name, description: r.description })));
        }
      }
    } catch (err) {
      console.error("Failed to fetch user elements:", err);
    } finally {
      setIsLoadingUserElems(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "element" && (!isAuthLoaded || isSignedIn)) {
      fetchUserElements();
    }
  }, [isOpen, activeTab, isAuthLoaded, isSignedIn]);

  const fetchUserLocations = async () => {
    setIsLoadingUserLocs(true);
    try {
      const res = await fetch("/api/locations", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (Array.isArray(data?.locations)) {
          const rows = data.locations as UserLocationRecord[];
          setUserLocations(rows);
          registerUserAssets("location", rows.map((r) => ({ id: r.id, name: r.name, description: r.description })));
        }
      }
    } catch (err) {
      console.error("Failed to fetch user locations:", err);
    } finally {
      setIsLoadingUserLocs(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "location" && (!isAuthLoaded || isSignedIn)) {
      fetchUserLocations();
    }
  }, [isOpen, activeTab, isAuthLoaded, isSignedIn]);

  const fetchUserEffects = async () => {
    setIsLoadingUserEffs(true);
    try {
      const res = await fetch("/api/effects", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (Array.isArray(data?.effects)) {
          const rows = data.effects as UserEffectRecord[];
          setUserEffects(rows);
          registerUserAssets("effect", rows.map((r) => ({ id: r.id, name: r.name, description: r.description })));
        }
      }
    } catch (err) {
      console.error("Failed to fetch user effects:", err);
    } finally {
      setIsLoadingUserEffs(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "effects" && (!isAuthLoaded || isSignedIn)) {
      fetchUserEffects();
    }
  }, [isOpen, activeTab, isAuthLoaded, isSignedIn]);

  const fetchUserCameras = async () => {
    setIsLoadingUserCams(true);
    try {
      const res = await fetch("/api/cameras", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (Array.isArray(data?.cameras)) {
          const rows = data.cameras as UserCameraRecord[];
          setUserCameras(rows);
          registerUserAssets("camera", rows.map((r) => ({ id: r.id, name: r.name, description: r.description })));
        }
      }
    } catch (err) {
      console.error("Failed to fetch user cameras:", err);
    } finally {
      setIsLoadingUserCams(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "camera" && (!isAuthLoaded || isSignedIn)) {
      fetchUserCameras();
    }
  }, [isOpen, activeTab, isAuthLoaded, isSignedIn]);

  const fetchUserPalettes = async () => {
    setIsLoadingUserPals(true);
    try {
      const res = await fetch("/api/palettes", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (Array.isArray(data?.palettes)) {
          setUserPalettes(data.palettes as UserPaletteRecord[]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user palettes:", err);
    } finally {
      setIsLoadingUserPals(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "color" && (!isAuthLoaded || isSignedIn)) {
      fetchUserPalettes();
    }
  }, [isOpen, activeTab, isAuthLoaded, isSignedIn]);

  const paletteToImageDataUrl = (name: string, colors: string[]): string => {
    const W = 800, H = 300;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx || colors.length === 0) return "";
    const stripe = W / colors.length;
    colors.forEach((hex, i) => {
      ctx.fillStyle = hex;
      ctx.fillRect(i * stripe, 0, Math.ceil(stripe) + 1, H);
    });
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, H - 56, W, 56);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Inter, Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(name, 24, H - 28);
    return canvas.toDataURL("image/png");
  };

  const submitNewPalette = async () => {
    if (isSavingPal) return;
    setCreatePalError(null);
    const name = newPalName.trim().slice(0, 60) || (isAr ? "لوحة بلا اسم" : "Untitled Palette");
    const validColors = newPalColors.filter((c) => /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c));
    if (validColors.length < 2) {
      setCreatePalError(isAr ? "أضف على الأقل لونين صالحين" : "Add at least 2 valid hex colors");
      return;
    }
    setIsSavingPal(true);
    try {
      const res = await fetch("/api/palettes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, colors: validColors }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.palette) {
        setCreatePalError(String(data?.error || (isAr ? "فشل الحفظ" : "Save failed")));
        return;
      }
      const created = data.palette as UserPaletteRecord;
      setUserPalettes((prev) => [created, ...prev]);
      setSelectedPaletteId(created.id);
      setNewPalName("");
      // Palette is prompt-only: inject hex codes as color-grading text, not as an image ref.
      onSelectPalette?.({ id: created.id, name: created.name, colors: created.colors });
    } catch (err: any) {
      setCreatePalError(err?.message || (isAr ? "فشل الحفظ" : "Save failed"));
    } finally {
      setIsSavingPal(false);
    }
  };

  const handleNewLocFilesSelected = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 8);
    const previews: Array<{ dataUrl: string; name: string }> = [];
    for (const f of list) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 8 * 1024 * 1024) {
        setCreateLocError(isAr ? "الحد الأقصى لكل صورة 8MB" : "Max 8MB per image");
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(f);
        previews.push({ dataUrl, name: f.name });
      } catch {}
    }
    setNewLocPreviews((prev) => [...prev, ...previews].slice(0, 8));
  };

  const submitNewLocation = async () => {
    if (isSavingLoc) return;
    setCreateLocError(null);
    const name = newLocName.trim().slice(0, 80) || (isAr ? "موقع بلا اسم" : "Untitled Location");
    if (newLocPreviews.length === 0) {
      setCreateLocError(isAr ? "أرفع صورة مرجعية واحدة على الأقل" : "Upload at least one reference image");
      return;
    }
    setIsSavingLoc(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          images: newLocPreviews.map((p) => ({ dataUrl: p.dataUrl, name: p.name })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.location) {
        setCreateLocError(String(data?.error || (isAr ? "فشل الحفظ" : "Save failed")));
        return;
      }
      const created = data.location as UserLocationRecord;
      setUserLocations((prev) => [created, ...prev]);
      registerUserAsset("location", { id: created.id, name: created.name, description: created.description });
      setNewLocName("");
      setNewLocPreviews([]);
      onSelectLocation?.(created.id);
      const createdRefs = (created.referenceUrls && created.referenceUrls.length > 0)
        ? created.referenceUrls
        : (created.coverUrl ? [created.coverUrl] : []);
      if (onAttachFile) {
        createdRefs.forEach((url, idx) => {
          onAttachFile({
            id: `loc-${created.id}-${idx}`,
            url,
            name: createdRefs.length > 1 ? `${created.name} (${idx + 1}/${createdRefs.length})` : created.name,
            type: "image",
          });
        });
      }
    } catch (err: any) {
      setCreateLocError(err?.message || (isAr ? "فشل الحفظ" : "Save failed"));
    } finally {
      setIsSavingLoc(false);
    }
  };

  const handleNewEffFilesSelected = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 8);
    const previews: Array<{ dataUrl: string; name: string }> = [];
    for (const f of list) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 8 * 1024 * 1024) {
        setCreateEffError(isAr ? "الحد الأقصى لكل صورة 8MB" : "Max 8MB per image");
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(f);
        previews.push({ dataUrl, name: f.name });
      } catch {}
    }
    setNewEffPreviews((prev) => [...prev, ...previews].slice(0, 8));
  };

  const submitNewEffect = async () => {
    if (isSavingEff) return;
    setCreateEffError(null);
    const name = newEffName.trim().slice(0, 80) || (isAr ? "إفكت بلا اسم" : "Untitled Effect");
    const description = newEffDescription.trim().slice(0, 1200);
    if (newEffPreviews.length === 0) {
      setCreateEffError(isAr ? "أرفع صورة مرجعية واحدة على الأقل" : "Upload at least one reference image");
      return;
    }
    setIsSavingEff(true);
    try {
      const res = await fetch("/api/effects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          images: newEffPreviews.map((p) => ({ dataUrl: p.dataUrl, name: p.name })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.effect) {
        setCreateEffError(String(data?.error || (isAr ? "فشل الحفظ" : "Save failed")));
        return;
      }
      const created = data.effect as UserEffectRecord;
      setUserEffects((prev) => [created, ...prev]);
      registerUserAsset("effect", { id: created.id, name: created.name, description: created.description });
      setNewEffName("");
      setNewEffDescription("");
      setNewEffPreviews([]);
      onSelectEffect?.(created.id);
      const createdRefs = (created.referenceUrls && created.referenceUrls.length > 0)
        ? created.referenceUrls
        : (created.coverUrl ? [created.coverUrl] : []);
      if (onAttachFile) {
        createdRefs.forEach((url, idx) => {
          onAttachFile({
            id: `eff-${created.id}-${idx}`,
            url,
            name: createdRefs.length > 1 ? `${created.name} (${idx + 1}/${createdRefs.length})` : created.name,
            type: "image",
          });
        });
      }
    } catch (err: any) {
      setCreateEffError(err?.message || (isAr ? "فشل الحفظ" : "Save failed"));
    } finally {
      setIsSavingEff(false);
    }
  };

  const handleNewCamFilesSelected = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 8);
    const previews: Array<{ dataUrl: string; name: string }> = [];
    for (const f of list) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 8 * 1024 * 1024) {
        setCreateCamError(isAr ? "الحد الأقصى لكل صورة 8MB" : "Max 8MB per image");
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(f);
        previews.push({ dataUrl, name: f.name });
      } catch {}
    }
    setNewCamPreviews((prev) => [...prev, ...previews].slice(0, 8));
  };

  const submitNewCamera = async () => {
    if (isSavingCam) return;
    setCreateCamError(null);
    const name = newCamName.trim().slice(0, 80) || (isAr ? "لقطة بلا اسم" : "Untitled Camera");
    const description = newCamDescription.trim().slice(0, 1200);
    if (newCamPreviews.length === 0) {
      setCreateCamError(isAr ? "أرفع صورة مرجعية واحدة على الأقل" : "Upload at least one reference image");
      return;
    }
    setIsSavingCam(true);
    try {
      const res = await fetch("/api/cameras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          images: newCamPreviews.map((p) => ({ dataUrl: p.dataUrl, name: p.name })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.camera) {
        setCreateCamError(String(data?.error || (isAr ? "فشل الحفظ" : "Save failed")));
        return;
      }
      const created = data.camera as UserCameraRecord;
      setUserCameras((prev) => [created, ...prev]);
      registerUserAsset("camera", { id: created.id, name: created.name, description: created.description });
      setNewCamName("");
      setNewCamDescription("");
      setNewCamPreviews([]);
      onSelectCamera?.(created.id);
      const createdRefs = (created.referenceUrls && created.referenceUrls.length > 0)
        ? created.referenceUrls
        : (created.coverUrl ? [created.coverUrl] : []);
      if (onAttachFile) {
        createdRefs.forEach((url, idx) => {
          onAttachFile({
            id: `cam-${created.id}-${idx}`,
            url,
            name: createdRefs.length > 1 ? `${created.name} (${idx + 1}/${createdRefs.length})` : created.name,
            type: "image",
          });
        });
      }
    } catch (err: any) {
      setCreateCamError(err?.message || (isAr ? "فشل الحفظ" : "Save failed"));
    } finally {
      setIsSavingCam(false);
    }
  };

  const handleNewElemFilesSelected = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 8);
    const previews: Array<{ dataUrl: string; name: string }> = [];
    for (const f of list) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 8 * 1024 * 1024) {
        setCreateElemError(isAr ? "الحد الأقصى لكل صورة 8MB" : "Max 8MB per image");
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(f);
        previews.push({ dataUrl, name: f.name });
      } catch {}
    }
    setNewElemPreviews((prev) => [...prev, ...previews].slice(0, 8));
  };

  const submitNewElement = async () => {
    if (isSavingElem) return;
    setCreateElemError(null);
    const name = newElemName.trim().slice(0, 80) || (isAr ? "عنصر بلا اسم" : "Untitled Element");
    if (newElemPreviews.length === 0) {
      setCreateElemError(isAr ? "أرفع صورة مرجعية واحدة على الأقل" : "Upload at least one reference image");
      return;
    }
    setIsSavingElem(true);
    try {
      const res = await fetch("/api/elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          images: newElemPreviews.map((p) => ({ dataUrl: p.dataUrl, name: p.name })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.element) {
        setCreateElemError(String(data?.error || (isAr ? "فشل الحفظ" : "Save failed")));
        return;
      }
      const created = data.element as UserElementRecord;
      setUserElements((prev) => [created, ...prev]);
      registerUserAsset("element", { id: created.id, name: created.name, description: created.description });
      setNewElemName("");
      setNewElemPreviews([]);
      onSelectElement?.(created.id);
      const createdRefs = (created.referenceUrls && created.referenceUrls.length > 0)
        ? created.referenceUrls
        : (created.coverUrl ? [created.coverUrl] : []);
      if (onAttachFile) {
        createdRefs.forEach((url, idx) => {
          onAttachFile({
            id: `elem-${created.id}-${idx}`,
            url,
            name: createdRefs.length > 1 ? `${created.name} (${idx + 1}/${createdRefs.length})` : created.name,
            type: "image",
          });
        });
      }
    } catch (err: any) {
      setCreateElemError(err?.message || (isAr ? "فشل الحفظ" : "Save failed"));
    } finally {
      setIsSavingElem(false);
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("read_failed"));
      reader.readAsDataURL(file);
    });

  const handleNewCharFilesSelected = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 8);
    const previews: Array<{ dataUrl: string; name: string }> = [];
    for (const f of list) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 8 * 1024 * 1024) {
        setCreateCharError(isAr ? "الحد الأقصى لكل صورة 8MB" : "Max 8MB per image");
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(f);
        previews.push({ dataUrl, name: f.name });
      } catch {}
    }
    setNewCharPreviews((prev) => [...prev, ...previews].slice(0, 8));
  };

  const deleteUserAsset = async (kind: "characters" | "elements" | "locations" | "effects" | "cameras" | "palettes", id: string) => {
    const labels = {
      characters: isAr ? "هذا الكاركتر" : "this character",
      elements: isAr ? "هذا العنصر" : "this element",
      locations: isAr ? "هذا الموقع" : "this location",
      effects: isAr ? "هذا الإفكت" : "this effect",
      cameras: isAr ? "هذه اللقطة" : "this camera",
      palettes: isAr ? "هذه اللوحة" : "this palette",
    };
    const ok = await confirmAction({ title: "Delete reference?", description: (isAr ? `حذف ${labels[kind]}؟ لا يمكن التراجع.` : `Delete ${labels[kind]}? This cannot be undone.`), confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    try {
      const res = await fetch(`/api/${kind}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(String(data?.error || (isAr ? "فشل الحذف" : "Delete failed")));
        return;
      }
      if (kind === "characters") {
        setUserCharacters((prev) => prev.filter((c) => c.id !== id));
        if (selectedCharacterId === id) onSelectCharacter?.(null);
      } else if (kind === "elements") {
        setUserElements((prev) => prev.filter((e) => e.id !== id));
        unregisterUserAsset("element", id);
        if (selectedElementId === id) onSelectElement?.(null);
      } else if (kind === "locations") {
        setUserLocations((prev) => prev.filter((l) => l.id !== id));
        unregisterUserAsset("location", id);
        if (selectedLocationId === id) onSelectLocation?.(null);
      } else if (kind === "effects") {
        setUserEffects((prev) => prev.filter((e) => e.id !== id));
        unregisterUserAsset("effect", id);
        if (selectedEffectId === id) onSelectEffect?.(null);
      } else if (kind === "cameras") {
        setUserCameras((prev) => prev.filter((c) => c.id !== id));
        unregisterUserAsset("camera", id);
        if (selectedCameraId === id) onSelectCamera?.(null);
      } else if (kind === "palettes") {
        setUserPalettes((prev) => prev.filter((p) => p.id !== id));
        if (selectedPaletteId === id) setSelectedPaletteId(null);
      }
    } catch (err: any) {
      alert(err?.message || (isAr ? "فشل الحذف" : "Delete failed"));
    }
  };

  const submitNewCharacter = async () => {
    if (isSavingChar) return;
    setCreateCharError(null);
    const name = newCharName.trim().slice(0, 80) || (isAr ? "كاركتر بلا اسم" : "Untitled Character");
    if (newCharPreviews.length === 0) {
      setCreateCharError(isAr ? "أرفع صورة مرجعية واحدة على الأقل" : "Upload at least one reference image");
      return;
    }
    setIsSavingChar(true);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          images: newCharPreviews.map((p) => ({ dataUrl: p.dataUrl, name: p.name })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.character) {
        setCreateCharError(String(data?.error || (isAr ? "فشل الحفظ" : "Save failed")));
        return;
      }
      const created = data.character as UserCharacterRecord;
      setUserCharacters((prev) => [created, ...prev]);
      setNewCharName("");
      setNewCharPreviews([]);
      onSelectCharacter?.(created.id);
      if (created.coverUrl && onAttachFile) {
        onAttachFile({
          id: `char-${created.id}`,
          url: created.coverUrl,
          name: created.name,
          type: "image",
        });
      }
    } catch (err: any) {
      setCreateCharError(err?.message || (isAr ? "فشل الحفظ" : "Save failed"));
    } finally {
      setIsSavingChar(false);
    }
  };

  const allCombinedAssets = useMemo(() => {
    const map = new Map<string, UploadedItem>();
    uploadedItems.forEach((item) => map.set(item.url, item));
    
    const assetsToUse = serverAssets.length > 0 ? serverAssets : DEFAULT_PRESET_ASSETS;
    assetsToUse.forEach((item) => {
      if (!map.has(item.url)) {
        map.set(item.url, item);
      }
    });
    const list = Array.from(map.values());
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [uploadedItems, serverAssets]);

  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return allCombinedAssets;
    const q = searchQuery.toLowerCase();
    return allCombinedAssets.filter((item) => item.name.toLowerCase().includes(q));
  }, [allCombinedAssets, searchQuery]);

  const groupedMonthAssets = useMemo(() => {
    const groups: { monthLabel: string; items: UploadedItem[] }[] = [];
    const map: Record<string, UploadedItem[]> = {};

    filteredAssets.forEach((item) => {
      const d = new Date(item.createdAt);
      const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
      if (!map[label]) {
        map[label] = [];
        groups.push({ monthLabel: label, items: map[label] });
      }
      map[label].push(item);
    });

    if (groups.length === 0) {
      const currentLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
      groups.push({ monthLabel: currentLabel, items: [] });
    }

    return groups;
  }, [filteredAssets]);

  const handleFilesSelected = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    const newItems: UploadedItem[] = [];
    const categoryTab = ["history", "stock"].includes(activeTab) ? "uploads" : activeTab;

    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith("video/");
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      newItems.push({
        id: `custom-${categoryTab}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        url,
        name: cleanName,
        type: isVideo ? "video" : "image",
        createdAt: Date.now(),
        categoryTab,
      });
    });

    const updated = [...newItems, ...uploadedItems];
    saveUploadedItems(updated);

    if (newItems[0]) {
      const first = newItems[0];
      setSelectedUploadId(first.id);

      if (categoryTab === "style") onSelectStyle?.(first.id);
      else if (categoryTab === "location") onSelectLocation?.(first.id);
      else if (categoryTab === "character") onSelectCharacter?.(first.id);
      else if (categoryTab === "element") onSelectElement?.(first.id);
      else if (categoryTab === "camera") onSelectCamera?.(first.id);
      else if (categoryTab === "effects") onSelectEffect?.(first.id);
      else if (categoryTab === "sketch") onSelectSketch?.(first.id);

      if (onAttachFile) {
        onAttachFile({
          id: first.id,
          url: first.url,
          name: first.name,
          type: first.type,
        });
      }
    }
  };

  const renderCustomCategoryItems = (
    catKey: string,
    badgeColor: string = "indigo",
    onSelectCustom?: (id: string, item: UploadedItem) => void,
    checkSelected?: (id: string) => boolean
  ) => {
    const customList = uploadedItems.filter((i) => i.categoryTab === catKey);
    if (customList.length === 0) return null;

    return customList.map((customItem) => {
      const isSelected = checkSelected
        ? checkSelected(customItem.id)
        : selectedUploadId === customItem.id;

      return (
        <div
          key={customItem.id}
          onClick={() => {
            setSelectedUploadId(customItem.id);
            onSelectCustom?.(customItem.id, customItem);
            if (onAttachFile) {
              onAttachFile({
                id: customItem.id,
                url: customItem.url,
                name: customItem.name,
                type: customItem.type,
              });
            }
          }}
          className={`relative group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
            isSelected
              ? `border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/10`
              : "border-slate-800 hover:border-slate-700 bg-[#0d1017]"
          }`}
        >
          <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900 relative">
            {customItem.type === "video" ? (
              <video
                src={customItem.url}
                className="w-full h-full object-cover pointer-events-none"
                muted
                controlsList="nodownload"
                data-idm-members="disabled"
                data-idm-skip="true"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <img
                src={customItem.url}
                alt={customItem.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            )}

            <div className="absolute top-2 left-2 bg-indigo-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow z-10 flex items-center gap-1">
              <span>{isAr ? "مرفوعك الخاص" : "Your Upload"}</span>
            </div>

            {isSelected && (
              <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-1 shadow z-10">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const filtered = uploadedItems.filter((i) => i.id !== customItem.id);
                saveUploadedItems(filtered);
              }}
              className="absolute bottom-2 right-2 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              title={isAr ? "حذف المرجع" : "Delete reference"}
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="p-2.5">
            <div className="text-xs font-bold text-slate-200 truncate">
              {customItem.name}
            </div>
            <div className="text-[10px] text-indigo-400 font-medium truncate mt-0.5">
              {isAr ? "مرجع مخصص" : "Custom Preset"}
            </div>
          </div>
        </div>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md transition-all animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-6xl w-full bg-[#090c14] border border-slate-800/90 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[88vh] transition-all animate-in zoom-in-95 duration-200"
      >
        {/* ── Left Rail Navigation ── */}
        <div className="w-full md:w-64 bg-[#0c0f18] border-b md:border-b-0 md:border-r border-slate-800/80 p-4 flex flex-col justify-between flex-shrink-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                {isAr ? "استوديو المراجع" : "Reference Studio"}
              </span>
              <button
                onClick={onClose}
                className="md:hidden p-1.5 rounded-full hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Top Items (History & Uploads) */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("history");
                  setSearchQuery("");
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "history"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-400 hover:bg-[#131724] hover:text-slate-200"
                }`}
              >
                <HistoryIcon className="w-4 h-4" />
                <span>{isAr ? "السجل التاريخي" : "History"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("uploads");
                  setSearchQuery("");
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "uploads"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-400 hover:bg-[#131724] hover:text-slate-200"
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isAr ? "الملفات المرفوعة" : "Uploads"}</span>
              </button>
            </div>

            <div className="pt-2 pb-1 px-2 border-t border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                {isAr ? "جميع المراجع" : "All references"}
              </span>
            </div>

            {/* All References List */}
            <div className="space-y-1 overflow-y-auto max-h-[45vh] md:max-h-[50vh] pr-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("stock");
                  setSearchQuery("");
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "stock"
                    ? "bg-[#161a29] text-white border border-slate-700"
                    : "text-slate-400 hover:bg-[#131724] hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-4 h-4 text-sky-400" />
                  <span>Stock</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("style");
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "style"
                    ? "bg-[#161a29] text-white border border-indigo-500/40"
                    : "text-slate-400 hover:bg-[#131724] hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Style</span>
                </div>
                <Pin className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("character");
                  setSearchQuery("");
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "character"
                    ? "bg-[#161a29] text-white border border-emerald-500/40"
                    : "text-slate-400 hover:bg-[#131724] hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span>Character</span>
                </div>
                <Pin className="w-3.5 h-3.5 text-slate-400 hover:text-emerald-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("element");
                  setSearchQuery("");
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "element"
                    ? "bg-[#161a29] text-white border border-purple-500/40"
                    : "text-slate-400 hover:bg-[#131724] hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-purple-400" />
                  <span>Element</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("location");
                  setSearchQuery("");
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "location"
                    ? "bg-[#161a29] text-white border border-sky-500/40"
                    : "text-slate-400 hover:bg-[#131724] hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-sky-400" />
                  <span>Location</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("color");
                  setSearchQuery("");
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "color"
                    ? "bg-[#161a29] text-white border border-rose-500/40"
                    : "text-slate-400 hover:bg-[#131724] hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Palette className="w-4 h-4 text-rose-400" />
                  <span>Color</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("effects");
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "effects"
                    ? "bg-[#161a29] text-white border border-pink-500/40"
                    : "text-slate-400 hover:bg-[#131724] hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wand2 className="w-4 h-4 text-pink-400" />
                  <span>Effects</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("camera");
                  setSearchQuery("");
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "camera"
                    ? "bg-[#161a29] text-white border border-amber-500/40"
                    : "text-slate-400 hover:bg-[#131724] hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>Camera</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("sketch");
                  setSearchQuery("");
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "sketch"
                    ? "bg-[#161a29] text-white border border-teal-500/40"
                    : "text-slate-400 hover:bg-[#131724] hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <PenTool className="w-4 h-4 text-teal-400" />
                  <span>Sketch</span>
                </div>
              </button>

              <a
                href="/storyboard"
                onClick={() => onClose()}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-slate-400 hover:bg-[#131724] hover:text-slate-200"
              >
                <div className="flex items-center gap-3">
                  <Clapperboard className="w-4 h-4 text-orange-400" />
                  <span>{isAr ? "استوديو الستوري بورد" : "Storyboard"}</span>
                </div>
                <span className="text-[9px] font-bold bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded">
                  {isAr ? "افتح" : "OPEN"}
                </span>
              </a>
            </div>
          </div>

          <div className="hidden md:block pt-4 border-t border-slate-800/80 text-[10px] text-slate-400 text-center">
            Saad Studio AI • Reference Engine
          </div>
        </div>

        {/* ── Center Content Area Grid ── */}
        <div className="flex-1 flex flex-col bg-[#080a10] overflow-hidden">
          {/* Top Search & Filter Bar */}
          <div className="p-4 border-b border-slate-800/80 bg-[#0b0e17] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={isAr ? "بحث في المراجع..." : "Search references..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121624] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Filter Sub-Tabs for Style or Effects */}
            {activeTab === "style" && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(["all", "illustration", "3d", "design"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeCategory === cat
                        ? "bg-indigo-600 text-white"
                        : "bg-[#131724] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {cat === "all" ? (isAr ? "الكل" : "All") : cat}
                  </button>
                ))}
              </div>
            )}

            {activeTab === "effects" && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(["all", "color", "lighting", "mood", "action"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeCategory === cat
                        ? "bg-pink-600 text-white"
                        : "bg-[#131724] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {cat === "all" ? (isAr ? "الكل" : "All") : cat}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="hidden md:flex p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grid Display Area */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Style Tab */}
            {activeTab === "style" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {renderCustomCategoryItems("style", "indigo", (id) => onSelectStyle?.(id), (id) => selectedStyle === id)}
                {HOOK_STYLES.filter((s) => {
                  const matchCat = activeCategory === "all" || s.category === activeCategory;
                  const matchSearch =
                    s.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.nameEn.toLowerCase().includes(searchQuery.toLowerCase());
                  return matchCat && matchSearch;
                }).map((styleItem) => {
                  const isSelected = selectedStyle === styleItem.id;
                  return (
                    <div
                      key={styleItem.id}
                      onClick={() => {
                        onSelectStyle?.(isSelected ? null : styleItem.id);
                      }}
                      className={`relative group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/10"
                          : "border-slate-800 hover:border-slate-700 bg-[#0d1017]"
                      }`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900 relative">
                        <img
                          src={styleItem.imageUrl}
                          alt={styleItem.nameAr}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-1 shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-bold text-slate-200 truncate">
                          {isAr ? styleItem.nameAr : styleItem.nameEn}
                        </div>
                        <div className="text-[10px] text-indigo-400 font-medium truncate mt-0.5">
                          {styleItem.nameEn}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Character Tab */}
            {activeTab === "character" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {/* User's own characters from /api/characters */}
                {userCharacters.map((uc) => {
                  const isSelected = selectedCharacterId === uc.id;
                  const cover = uc.coverUrl || uc.referenceUrls?.[0] || "";
                  return (
                    <div
                      key={uc.id}
                      onClick={() => {
                        onSelectCharacter?.(isSelected ? null : uc.id);
                        if (!isSelected && cover && onAttachFile) {
                          onAttachFile({
                            id: `char-${uc.id}`,
                            url: cover,
                            name: uc.name,
                            type: "image",
                          });
                        }
                      }}
                      className={`relative group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/10"
                          : "border-slate-800 hover:border-slate-700 bg-[#0d1017]"
                      }`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900 relative">
                        {cover ? (
                          <img
                            src={cover}
                            alt={uc.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <User className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-emerald-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow z-10">
                          {isAr ? "كاركتر خاص" : "My Character"}
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteUserAsset("characters", uc.id); }}
                          className="absolute bottom-2 right-2 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          title={isAr ? "حذف الكاركتر" : "Delete character"}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-bold text-slate-200 truncate">{uc.name}</div>
                        <div className="text-[10px] text-emerald-400 font-medium truncate mt-0.5">
                          {uc.referenceUrls?.length || 1} {isAr ? "مرجع" : "ref"}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isLoadingUserChars && userCharacters.length === 0 && (
                  <div className="aspect-[4/3] rounded-2xl border border-slate-800 bg-[#0d1017] flex items-center justify-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}

                {renderCustomCategoryItems("character", "emerald", (id) => onSelectCharacter?.(id), (id) => selectedCharacterId === id)}
                {HOOK_CHARACTERS.filter((c) => {
                  const search = searchQuery.toLowerCase();
                  return (
                    c.nameAr.toLowerCase().includes(search) ||
                    c.nameEn.toLowerCase().includes(search) ||
                    c.tag.toLowerCase().includes(search)
                  );
                }).map((charItem) => {
                  const isSelected = selectedCharacterId === charItem.id;
                  return (
                    <div
                      key={charItem.id}
                      onClick={() => {
                        onSelectCharacter?.(isSelected ? null : charItem.id);
                        if (!isSelected && onAttachFile) {
                          onAttachFile({
                            id: `char-${charItem.id}-${Date.now()}`,
                            url: charItem.imageUrl,
                            name: charItem.nameAr,
                            type: "image",
                          });
                        }
                      }}
                      className={`relative group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/10"
                          : "border-slate-800 hover:border-slate-700 bg-[#0d1017]"
                      }`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900 relative">
                        <img
                          src={charItem.imageUrl}
                          alt={charItem.nameAr}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-bold text-slate-200 truncate">
                          {isAr ? charItem.nameAr : charItem.nameEn}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-medium truncate mt-0.5">
                          {charItem.tag}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Element Tab */}
            {activeTab === "element" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {/* User's own elements from /api/elements */}
                {userElements.map((ue) => {
                  const isSelected = selectedElementId === ue.id;
                  const cover = ue.coverUrl || ue.referenceUrls?.[0] || "";
                  const refs = (ue.referenceUrls && ue.referenceUrls.length > 0)
                    ? ue.referenceUrls
                    : (cover ? [cover] : []);
                  return (
                    <div
                      key={ue.id}
                      onClick={() => {
                        onSelectElement?.(isSelected ? null : ue.id);
                        if (!isSelected && onAttachFile) {
                          refs.forEach((url, idx) => {
                            onAttachFile({
                              id: `elem-${ue.id}-${idx}`,
                              url,
                              name: refs.length > 1 ? `${ue.name} (${idx + 1}/${refs.length})` : ue.name,
                              type: "image",
                            });
                          });
                        }
                      }}
                      className={`relative group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/10"
                          : "border-slate-800 hover:border-slate-700 bg-[#0d1017]"
                      }`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900 relative">
                        {cover ? (
                          <img
                            src={cover}
                            alt={ue.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Package className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-purple-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow z-10">
                          {isAr ? "عنصر خاص" : "My Element"}
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full p-1 shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteUserAsset("elements", ue.id); }}
                          className="absolute bottom-2 right-2 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          title={isAr ? "حذف العنصر" : "Delete element"}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-bold text-slate-200 truncate">{ue.name}</div>
                        <div className="text-[10px] text-purple-400 font-medium truncate mt-0.5">
                          {ue.referenceUrls?.length || 1} {isAr ? "مرجع" : "ref"}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isLoadingUserElems && userElements.length === 0 && (
                  <div className="aspect-[4/3] rounded-2xl border border-slate-800 bg-[#0d1017] flex items-center justify-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}

                {renderCustomCategoryItems("element", "purple", (id) => onSelectElement?.(id), (id) => selectedElementId === id)}
                {HOOK_ELEMENTS.filter((el) => {
                  const search = searchQuery.toLowerCase();
                  return (
                    el.nameAr.toLowerCase().includes(search) ||
                    el.nameEn.toLowerCase().includes(search) ||
                    el.tag.toLowerCase().includes(search)
                  );
                }).map((elItem) => {
                  const isSelected = selectedElementId === elItem.id;
                  return (
                    <div
                      key={elItem.id}
                      onClick={() => {
                        onSelectElement?.(isSelected ? null : elItem.id);
                        if (!isSelected && onAttachFile) {
                          onAttachFile({
                            id: `elem-${elItem.id}-${Date.now()}`,
                            url: elItem.imageUrl,
                            name: elItem.nameAr,
                            type: "image",
                          });
                        }
                      }}
                      className={`relative group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/10"
                          : "border-slate-800 hover:border-slate-700 bg-[#0d1017]"
                      }`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900 relative">
                        <img
                          src={elItem.imageUrl}
                          alt={elItem.nameAr}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full p-1 shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-bold text-slate-200 truncate">
                          {isAr ? elItem.nameAr : elItem.nameEn}
                        </div>
                        <div className="text-[10px] text-purple-400 font-medium truncate mt-0.5">
                          {elItem.tag}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Location Tab */}
            {activeTab === "location" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {/* User's own locations from /api/locations */}
                {userLocations.map((ul) => {
                  const isSelected = selectedLocationId === ul.id;
                  const cover = ul.coverUrl || ul.referenceUrls?.[0] || "";
                  const refs = (ul.referenceUrls && ul.referenceUrls.length > 0)
                    ? ul.referenceUrls
                    : (cover ? [cover] : []);
                  return (
                    <div
                      key={ul.id}
                      onClick={() => {
                        onSelectLocation?.(isSelected ? null : ul.id);
                        if (!isSelected && onAttachFile) {
                          refs.forEach((url, idx) => {
                            onAttachFile({
                              id: `loc-${ul.id}-${idx}`,
                              url,
                              name: refs.length > 1 ? `${ul.name} (${idx + 1}/${refs.length})` : ul.name,
                              type: "image",
                            });
                          });
                        }
                      }}
                      className={`relative group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/10"
                          : "border-slate-800 hover:border-slate-700 bg-[#0d1017]"
                      }`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900 relative">
                        {cover ? (
                          <img
                            src={cover}
                            alt={ul.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <MapPin className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-sky-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow z-10">
                          {isAr ? "موقع خاص" : "My Location"}
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-sky-500 text-white rounded-full p-1 shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteUserAsset("locations", ul.id); }}
                          className="absolute bottom-2 right-2 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          title={isAr ? "حذف الموقع" : "Delete location"}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-bold text-slate-200 truncate">{ul.name}</div>
                        <div className="text-[10px] text-sky-400 font-medium truncate mt-0.5">
                          {ul.referenceUrls?.length || 1} {isAr ? "مرجع" : "ref"}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isLoadingUserLocs && userLocations.length === 0 && (
                  <div className="aspect-[4/3] rounded-2xl border border-slate-800 bg-[#0d1017] flex items-center justify-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}

                {renderCustomCategoryItems("location", "sky", (id) => onSelectLocation?.(id), (id) => selectedLocationId === id)}
                {HOOK_LOCATIONS.filter((loc) => {
                  const search = searchQuery.toLowerCase();
                  return (
                    loc.nameAr.toLowerCase().includes(search) ||
                    loc.nameEn.toLowerCase().includes(search) ||
                    loc.tag.toLowerCase().includes(search)
                  );
                }).map((locItem) => {
                  const isSelected = selectedLocationId === locItem.id;
                  return (
                    <div
                      key={locItem.id}
                      onClick={() => {
                        onSelectLocation?.(isSelected ? null : locItem.id);
                        if (!isSelected && onAttachFile) {
                          onAttachFile({
                            id: `loc-${locItem.id}-${Date.now()}`,
                            url: locItem.imageUrl,
                            name: locItem.nameAr,
                            type: "image",
                          });
                        }
                      }}
                      className={`relative group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/10"
                          : "border-slate-800 hover:border-slate-700 bg-[#0d1017]"
                      }`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900 relative">
                        <img
                          src={locItem.imageUrl}
                          alt={locItem.nameAr}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-sky-500 text-white rounded-full p-1 shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-bold text-slate-200 truncate">
                          {isAr ? locItem.nameAr : locItem.nameEn}
                        </div>
                        <div className="text-[10px] text-sky-400 font-medium truncate mt-0.5">
                          {locItem.tag}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Camera Tab */}
            {activeTab === "camera" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {/* User's own cameras from /api/cameras */}
                {userCameras.map((uc) => {
                  const isSelected = selectedCameraId === uc.id;
                  const cover = uc.coverUrl || uc.referenceUrls?.[0] || "";
                  const refs = (uc.referenceUrls && uc.referenceUrls.length > 0)
                    ? uc.referenceUrls
                    : (cover ? [cover] : []);
                  return (
                    <div
                      key={uc.id}
                      onClick={() => {
                        onSelectCamera?.(isSelected ? null : uc.id);
                        if (!isSelected && onAttachFile) {
                          refs.forEach((url, idx) => {
                            onAttachFile({
                              id: `cam-${uc.id}-${idx}`,
                              url,
                              name: refs.length > 1 ? `${uc.name} (${idx + 1}/${refs.length})` : uc.name,
                              type: "image",
                            });
                          });
                        }
                      }}
                      className={`relative group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/10"
                          : "border-slate-800 hover:border-slate-700 bg-[#0d1017]"
                      }`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900 relative">
                        {cover ? (
                          <img
                            src={cover}
                            alt={uc.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Camera className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-amber-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow z-10">
                          {isAr ? "لقطة خاصة" : "My Camera"}
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full p-1 shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteUserAsset("cameras", uc.id); }}
                          className="absolute bottom-2 right-2 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          title={isAr ? "حذف اللقطة" : "Delete camera"}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-bold text-slate-200 truncate">{uc.name}</div>
                        <div className="text-[10px] text-amber-400 font-medium truncate mt-0.5">
                          {uc.referenceUrls?.length || 1} {isAr ? "مرجع" : "ref"}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isLoadingUserCams && userCameras.length === 0 && (
                  <div className="aspect-[4/3] rounded-2xl border border-slate-800 bg-[#0d1017] flex items-center justify-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}

                {renderCustomCategoryItems("camera", "amber", (id) => onSelectCamera?.(id), (id) => selectedCameraId === id)}
                {HOOK_CAMERAS.filter((cam) => {
                  const search = searchQuery.toLowerCase();
                  return (
                    cam.nameAr.toLowerCase().includes(search) ||
                    cam.nameEn.toLowerCase().includes(search) ||
                    cam.tag.toLowerCase().includes(search)
                  );
                }).map((camItem) => {
                  const isSelected = selectedCameraId === camItem.id;
                  return (
                    <div
                      key={camItem.id}
                      onClick={() => {
                        // Camera is a prompt-only modifier (tag + description injected server-side).
                        // Do NOT attach thumbnail — it would confuse the model as a visual ref.
                        onSelectCamera?.(isSelected ? null : camItem.id);
                      }}
                      className={`relative group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/10"
                          : "border-slate-800 hover:border-slate-700 bg-[#0d1017]"
                      }`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900 relative">
                        <img
                          src={camItem.imageUrl}
                          alt={camItem.nameAr}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full p-1 shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-bold text-slate-200 truncate">
                          {isAr ? camItem.nameAr : camItem.nameEn}
                        </div>
                        <div className="text-[10px] text-amber-400 font-medium truncate mt-0.5">
                          {camItem.tag}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Effects Tab */}
            {activeTab === "effects" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {/* User's own effects from /api/effects */}
                {userEffects.map((ue) => {
                  const isSelected = selectedEffectId === ue.id;
                  const cover = ue.coverUrl || ue.referenceUrls?.[0] || "";
                  const refs = (ue.referenceUrls && ue.referenceUrls.length > 0)
                    ? ue.referenceUrls
                    : (cover ? [cover] : []);
                  return (
                    <div
                      key={ue.id}
                      onClick={() => {
                        onSelectEffect?.(isSelected ? null : ue.id);
                        if (!isSelected && onAttachFile) {
                          refs.forEach((url, idx) => {
                            onAttachFile({
                              id: `eff-${ue.id}-${idx}`,
                              url,
                              name: refs.length > 1 ? `${ue.name} (${idx + 1}/${refs.length})` : ue.name,
                              type: "image",
                            });
                          });
                        }
                      }}
                      className={`relative group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-pink-500 ring-2 ring-pink-500/20 bg-pink-500/10"
                          : "border-slate-800 hover:border-slate-700 bg-[#0d1017]"
                      }`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900 relative">
                        {cover ? (
                          <img
                            src={cover}
                            alt={ue.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Wand2 className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-pink-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow z-10">
                          {isAr ? "إفكت خاص" : "My Effect"}
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-pink-500 text-white rounded-full p-1 shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteUserAsset("effects", ue.id); }}
                          className="absolute bottom-2 right-2 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          title={isAr ? "حذف الإفكت" : "Delete effect"}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-bold text-slate-200 truncate">{ue.name}</div>
                        <div className="text-[10px] text-pink-400 font-medium truncate mt-0.5">
                          {ue.referenceUrls?.length || 1} {isAr ? "مرجع" : "ref"}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isLoadingUserEffs && userEffects.length === 0 && (
                  <div className="aspect-[4/3] rounded-2xl border border-slate-800 bg-[#0d1017] flex items-center justify-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}

                {renderCustomCategoryItems("effects", "pink", (id) => onSelectEffect?.(id), (id) => selectedEffectId === id)}
                {HOOK_EFFECTS.filter((eff) => {
                  const matchCat = activeCategory === "all" || eff.category === activeCategory;
                  const search = searchQuery.toLowerCase();
                  const matchSearch =
                    eff.nameAr.toLowerCase().includes(search) ||
                    eff.nameEn.toLowerCase().includes(search) ||
                    eff.tag.toLowerCase().includes(search);
                  return matchCat && matchSearch;
                }).map((effItem) => {
                  const isSelected = selectedEffectId === effItem.id;
                  return (
                    <div
                      key={effItem.id}
                      onClick={() => {
                        // Effect is a prompt-only modifier (tag + systemPromptAddon injected server-side).
                        // Do NOT attach thumbnail — it would confuse the model as a visual ref.
                        onSelectEffect?.(isSelected ? null : effItem.id);
                      }}
                      className={`relative group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-pink-500 ring-2 ring-pink-500/20 bg-pink-500/10"
                          : "border-slate-800 hover:border-slate-700 bg-[#0d1017]"
                      }`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900 relative">
                        <img
                          src={effItem.imageUrl}
                          alt={effItem.nameAr}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-pink-500 text-white rounded-full p-1 shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-bold text-slate-200 truncate">
                          {isAr ? effItem.nameAr : effItem.nameEn}
                        </div>
                        <div className="text-[10px] text-pink-400 font-medium truncate mt-0.5">
                          {effItem.tag}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sketch Tab */}
            {activeTab === "sketch" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {renderCustomCategoryItems("sketch", "teal", (id) => onSelectSketch?.(id), (id) => selectedSketchId === id)}
                {HOOK_SKETCHES.filter((sk) => {
                  const search = searchQuery.toLowerCase();
                  return (
                    sk.nameAr.toLowerCase().includes(search) ||
                    sk.nameEn.toLowerCase().includes(search) ||
                    sk.tag.toLowerCase().includes(search)
                  );
                }).map((sketchItem) => {
                  const isSelected = selectedSketchId === sketchItem.id;
                  return (
                    <div
                      key={sketchItem.id}
                      onClick={() => {
                        // Sketch is a prompt-only modifier (description injected server-side).
                        // Do NOT attach thumbnail — it would confuse the model as a visual ref.
                        onSelectSketch?.(isSelected ? null : sketchItem.id);
                      }}
                      className={`relative group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-teal-500 ring-2 ring-teal-500/20 bg-teal-500/10"
                          : "border-slate-800 hover:border-slate-700 bg-[#0d1017]"
                      }`}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900 relative">
                        <img
                          src={sketchItem.imageUrl}
                          alt={sketchItem.nameAr}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-teal-500 text-white rounded-full p-1 shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-bold text-slate-200 truncate">
                          {isAr ? sketchItem.nameAr : sketchItem.nameEn}
                        </div>
                        <div className="text-[10px] text-teal-400 font-medium truncate mt-0.5">
                          {sketchItem.tag}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Uploads & History Tabs */}
            {["uploads", "history", "stock"].includes(activeTab) && (
              <div className="space-y-6">
                {isLoadingAssets && serverAssets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                    <span className="text-xs font-semibold">
                      {isAr ? "جاري تحميل الوسائط المولدة..." : "Loading generated assets..."}
                    </span>
                  </div>
                ) : (
                  groupedMonthAssets.map((group, groupIdx) => (
                    <div key={group.monthLabel} className="space-y-3">
                      {/* Month Label matching Magnific UI screenshot */}
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                        <span>{group.monthLabel}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {group.items.length} {isAr ? "وسائط" : "media"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                        {/* Render + Upload Card on index 0 of first month group */}
                        {groupIdx === 0 && (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-sky-500/80 bg-[#121520] hover:bg-[#191d2c] flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer group"
                          >
                            <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-sky-500/20 text-slate-300 group-hover:text-sky-400 flex items-center justify-center transition-colors">
                              <Plus className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-slate-300 group-hover:text-white">
                              {isAr ? "رفع" : "Upload"}
                            </span>
                          </div>
                        )}

                        {/* Render Generated & Uploaded Assets */}
                        {group.items.map((item) => {
                          const isSelected = selectedUploadId === item.id || selectedUploadId === item.url;
                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                setSelectedUploadId(item.id);
                                if (onAttachFile) {
                                  onAttachFile({
                                    id: item.id,
                                    url: item.url,
                                    name: item.name,
                                    type: item.type,
                                  });
                                }
                              }}
                              className={`relative group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                                isSelected
                                  ? "border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/10"
                                  : "border-slate-800 hover:border-slate-700 bg-[#0d1017]"
                              }`}
                            >
                              <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900 relative">
                                {item.type === "video" ? (
                                  <video 
                                    src={item.url} 
                                    className="w-full h-full object-cover pointer-events-none" 
                                    muted 
                                    controlsList="nodownload"
                                    data-idm-members="disabled"
                                    data-idm-skip="true"
                                    onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                                  />
                                ) : (
                                  <img
                                    src={item.url}
                                    alt={item.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                                  />
                                )}

                                {isSelected && (
                                  <div className="absolute top-2 right-2 bg-sky-500 text-white rounded-full p-1 shadow z-10">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                )}

                                {/* Quick delete for local uploaded items */}
                                {uploadedItems.some((i) => i.id === item.id) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const filtered = uploadedItems.filter((i) => i.id !== item.id);
                                      saveUploadedItems(filtered);
                                    }}
                                    className="absolute top-2 left-2 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    title={isAr ? "حذف الملف" : "Delete file"}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <div className="p-2">
                                <div className="text-[11px] font-semibold text-slate-200 truncate">
                                  {item.name}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Color Tab */}
            {activeTab === "color" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {userPalettes.map((pal) => {
                  const isSelected = selectedPaletteId === pal.id;
                  return (
                    <div
                      key={pal.id}
                      onClick={() => {
                        const nextSelected = isSelected ? null : pal.id;
                        setSelectedPaletteId(nextSelected);
                        // Palette is prompt-only: inject hex codes as color-grading text.
                        // Do NOT attach the palette as an image ref — it would confuse the model.
                        if (nextSelected) {
                          onSelectPalette?.({ id: pal.id, name: pal.name, colors: pal.colors });
                        } else {
                          onSelectPalette?.(null);
                        }
                      }}
                      className={`relative group rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-500/10"
                          : "border-slate-800 hover:border-slate-700 bg-[#0d1017]"
                      }`}
                    >
                      <div className="aspect-[16/9] w-full flex overflow-hidden">
                        {pal.colors.map((c, idx) => (
                          <div key={idx} className="flex-1 h-full" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-rose-500 text-white rounded-full p-1 shadow">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteUserAsset("palettes", pal.id); }}
                        className="absolute bottom-2 right-2 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        title={isAr ? "حذف اللوحة" : "Delete palette"}
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="p-2.5">
                        <div className="text-xs font-bold text-slate-200 truncate">{pal.name}</div>
                        <div className="text-[10px] text-rose-400 font-mono truncate mt-0.5">
                          {pal.colors.slice(0, 4).join(" · ")}
                          {pal.colors.length > 4 ? " …" : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isLoadingUserPals && userPalettes.length === 0 && (
                  <div className="aspect-[16/9] rounded-2xl border border-slate-800 bg-[#0d1017] flex items-center justify-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}
                {!isLoadingUserPals && userPalettes.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center h-48 text-center p-6 bg-[#0c0f18] rounded-3xl border border-dashed border-slate-800">
                    <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mb-2">
                      <Palette className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-200">
                      {isAr ? "لا توجد لوحات ألوان بعد" : "No palettes yet"}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                      {isAr
                        ? "أنشئ لوحة ألوان من اللوحة اليمنى — سيتم إرفاقها كمرجع لوني للتوليدات"
                        : "Create a palette from the right panel — it'll be attached as a color reference for generations."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Media Upload Drop Zone (or Create form on Character/Element/Location/Color tab) ── */}
        <div className="w-full md:w-72 bg-[#0b0e17] p-5 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800/80 flex-shrink-0">
          {activeTab === "color" ? (
            <>
              <div className="space-y-4 overflow-y-auto pr-1">
                <div>
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block">
                    {isAr ? "إنشاء لوحة ألوان" : "Create Color Palette"}
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    {isAr
                      ? "أضف من 2 إلى 8 ألوان hex. تُحفظ في مكتبتك وتُرفق كمرجع لوني للتوليدات."
                      : "Add 2 to 8 hex colors. Saved to your library and attached as a color reference for generations."}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isAr ? "الاسم" : "Name"}
                  </label>
                  <input
                    type="text"
                    value={newPalName}
                    onChange={(e) => setNewPalName(e.target.value)}
                    placeholder={isAr ? "مثال: غروب دافئ، صيف باستيل…" : "e.g. warm sunset, pastel summer…"}
                    maxLength={60}
                    className="w-full bg-[#121624] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all"
                    disabled={isSavingPal}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {isAr ? "الألوان" : "Colors"} ({newPalColors.length}/8)
                    </label>
                    <button
                      type="button"
                      onClick={() => newPalColors.length < 8 && setNewPalColors([...newPalColors, "#FFFFFF"])}
                      disabled={isSavingPal || newPalColors.length >= 8}
                      className="text-[10px] font-bold text-rose-400 hover:text-rose-300 disabled:opacity-40 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {isAr ? "أضف لون" : "Add color"}
                    </button>
                  </div>

                  {/* Live preview strip */}
                  <div className="flex h-12 rounded-lg overflow-hidden border border-slate-800">
                    {newPalColors.map((c, i) => (
                      <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {newPalColors.map((color, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => {
                            const next = [...newPalColors];
                            next[idx] = e.target.value.toUpperCase();
                            setNewPalColors(next);
                          }}
                          disabled={isSavingPal}
                          className="w-9 h-9 rounded-lg border border-slate-800 bg-transparent cursor-pointer p-0"
                        />
                        <input
                          type="text"
                          value={color}
                          onChange={(e) => {
                            let v = e.target.value.trim().toUpperCase();
                            if (v && !v.startsWith("#")) v = "#" + v;
                            const next = [...newPalColors];
                            next[idx] = v;
                            setNewPalColors(next);
                          }}
                          maxLength={7}
                          disabled={isSavingPal}
                          className="flex-1 bg-[#121624] border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
                        />
                        <button
                          type="button"
                          onClick={() => setNewPalColors(newPalColors.filter((_, i) => i !== idx))}
                          disabled={isSavingPal || newPalColors.length <= 2}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:hover:bg-transparent"
                          title={isAr ? "حذف" : "Remove"}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {createPalError && (
                  <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                    {createPalError}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-4">
                <button
                  type="button"
                  onClick={submitNewPalette}
                  disabled={isSavingPal || newPalColors.filter((c) => /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c)).length < 2}
                  className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-rose-500/20"
                >
                  {isSavingPal ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isAr ? "جاري الحفظ…" : "Saving…"}</span>
                    </>
                  ) : (
                    <>
                      <Palette className="w-4 h-4" />
                      <span>{isAr ? "حفظ اللوحة" : "Save Palette"}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-[#151926]/60 hover:bg-[#1c2234] text-slate-400 hover:text-slate-200 font-semibold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
                >
                  {isAr ? "إغلاق الاستوديو" : "Close Studio"}
                </button>
              </div>
            </>
          ) : activeTab === "location" ? (
            <>
              <div className="space-y-4 overflow-y-auto pr-1">
                <div>
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest block">
                    {isAr ? "إنشاء موقع جديد" : "Create New Location"}
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    {isAr
                      ? "ارفع صور مكانك أو بيئتك المميزة. سيُحفظ في مكتبتك الخاصة ويُستخدم مرجعاً في التوليدات."
                      : "Upload photos of your venue or scene. Saved to your library and used as a reference in generations."}
                  </p>
                </div>

                <input
                  type="file"
                  ref={newLocFileInputRef}
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleNewLocFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isAr ? "الاسم" : "Name"}
                  </label>
                  <input
                    type="text"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                    placeholder={isAr ? "مثال: مكتبي، متجري، شقتي…" : "e.g. my office, my store…"}
                    maxLength={80}
                    className="w-full bg-[#121624] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all"
                    disabled={isSavingLoc}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isAr ? "الصور المرجعية" : "Reference photos"}
                  </label>
                  <div
                    onClick={() => !isSavingLoc && newLocFileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      if (!isSavingLoc && e.dataTransfer?.files) handleNewLocFilesSelected(e.dataTransfer.files);
                    }}
                    className="border-2 border-dashed border-slate-800 hover:border-sky-500/80 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#0f1320] hover:bg-[#13182a] group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-2 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 block mb-0.5">
                      {isAr ? "اسحب صور هنا" : "Drop photos here"}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      PNG, JPG, WEBP · {isAr ? "حتى 8 صور · 8MB/صورة" : "up to 8 · 8MB each"}
                    </span>
                  </div>

                  {newLocPreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {newLocPreviews.map((p, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                          <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setNewLocPreviews((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-red-600 text-white rounded-full p-0.5"
                            disabled={isSavingLoc}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {createLocError && (
                  <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                    {createLocError}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-4">
                <button
                  type="button"
                  onClick={submitNewLocation}
                  disabled={isSavingLoc || newLocPreviews.length === 0}
                  className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-sky-500/20"
                >
                  {isSavingLoc ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isAr ? "جاري الحفظ…" : "Saving…"}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{isAr ? "حفظ الموقع" : "Save Location"}</span>
                    </>
                  )}
                </button>

                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => {
                    handleNewLocFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isSavingLoc}
                  className="w-full bg-[#151926] hover:bg-[#1c2234] text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4 text-slate-400" />
                  <span>{isAr ? "التقاط صورة" : "Take photo"}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-[#151926]/60 hover:bg-[#1c2234] text-slate-400 hover:text-slate-200 font-semibold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
                >
                  {isAr ? "إغلاق الاستوديو" : "Close Studio"}
                </button>
              </div>
            </>
          ) : activeTab === "element" ? (
            <>
              <div className="space-y-4 overflow-y-auto pr-1">
                <div>
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">
                    {isAr ? "إنشاء عنصر جديد" : "Create New Element"}
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    {isAr
                      ? "ارفع صور منتجك أو عنصرك المميز. سيُحفظ في مكتبتك الخاصة ويُستخدم مرجعاً في التوليدات."
                      : "Upload photos of your product or unique prop. Saved to your library and used as a reference in generations."}
                  </p>
                </div>

                <input
                  type="file"
                  ref={newElemFileInputRef}
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleNewElemFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isAr ? "الاسم" : "Name"}
                  </label>
                  <input
                    type="text"
                    value={newElemName}
                    onChange={(e) => setNewElemName(e.target.value)}
                    placeholder={isAr ? "مثال: كوبي المميز، حقيبتي…" : "e.g. my mug, my tote bag…"}
                    maxLength={80}
                    className="w-full bg-[#121624] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
                    disabled={isSavingElem}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isAr ? "الصور المرجعية" : "Reference photos"}
                  </label>
                  <div
                    onClick={() => !isSavingElem && newElemFileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      if (!isSavingElem && e.dataTransfer?.files) handleNewElemFilesSelected(e.dataTransfer.files);
                    }}
                    className="border-2 border-dashed border-slate-800 hover:border-purple-500/80 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#0f1320] hover:bg-[#13182a] group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-2 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 block mb-0.5">
                      {isAr ? "اسحب صور هنا" : "Drop photos here"}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      PNG, JPG, WEBP · {isAr ? "حتى 8 صور · 8MB/صورة" : "up to 8 · 8MB each"}
                    </span>
                  </div>

                  {newElemPreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {newElemPreviews.map((p, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                          <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setNewElemPreviews((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-red-600 text-white rounded-full p-0.5"
                            disabled={isSavingElem}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {createElemError && (
                  <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                    {createElemError}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-4">
                <button
                  type="button"
                  onClick={submitNewElement}
                  disabled={isSavingElem || newElemPreviews.length === 0}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-purple-500/20"
                >
                  {isSavingElem ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isAr ? "جاري الحفظ…" : "Saving…"}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{isAr ? "حفظ العنصر" : "Save Element"}</span>
                    </>
                  )}
                </button>

                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => {
                    handleNewElemFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isSavingElem}
                  className="w-full bg-[#151926] hover:bg-[#1c2234] text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4 text-slate-400" />
                  <span>{isAr ? "التقاط صورة" : "Take photo"}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-[#151926]/60 hover:bg-[#1c2234] text-slate-400 hover:text-slate-200 font-semibold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
                >
                  {isAr ? "إغلاق الاستوديو" : "Close Studio"}
                </button>
              </div>
            </>
          ) : activeTab === "effects" ? (
            <>
              <div className="space-y-4 overflow-y-auto pr-1">
                <div>
                  <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest block">
                    {isAr ? "إنشاء إفكت جديد" : "Create New Effect"}
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    {isAr
                      ? "ارفع صور تعبّر عن اللوك (تدريج ألوان، إضاءة، مود). سيُحفظ في مكتبتك وتُرفَق صوره + وصفه كمرجع بصري ونصي في التوليدات."
                      : "Upload photos that capture the look (color grade, lighting, mood). Saved to your library and used as both visual and prompt reference in generations."}
                  </p>
                </div>

                <input
                  type="file"
                  ref={newEffFileInputRef}
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleNewEffFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isAr ? "الاسم" : "Name"}
                  </label>
                  <input
                    type="text"
                    value={newEffName}
                    onChange={(e) => setNewEffName(e.target.value)}
                    placeholder={isAr ? "مثال: لوك سينمائي دافئ" : "e.g. warm cinematic look"}
                    maxLength={80}
                    className="w-full bg-[#121624] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-all"
                    disabled={isSavingEff}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isAr ? "وصف اللوك (اختياري)" : "Look description (optional)"}
                  </label>
                  <textarea
                    value={newEffDescription}
                    onChange={(e) => setNewEffDescription(e.target.value)}
                    placeholder={isAr ? "مثال: ظلال تيل، هايلايت دافئ، جرين على البشرة، تباين متوسط" : "e.g. teal shadows, warm highlights, film grain, medium contrast"}
                    maxLength={1200}
                    rows={3}
                    className="w-full bg-[#121624] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-all resize-none"
                    disabled={isSavingEff}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isAr ? "الصور المرجعية" : "Reference photos"}
                  </label>
                  <div
                    onClick={() => !isSavingEff && newEffFileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      if (!isSavingEff && e.dataTransfer?.files) handleNewEffFilesSelected(e.dataTransfer.files);
                    }}
                    className="border-2 border-dashed border-slate-800 hover:border-pink-500/80 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#0f1320] hover:bg-[#13182a] group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-2 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 block mb-0.5">
                      {isAr ? "اسحب صور هنا" : "Drop photos here"}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      PNG, JPG, WEBP · {isAr ? "حتى 8 صور · 8MB/صورة" : "up to 8 · 8MB each"}
                    </span>
                  </div>

                  {newEffPreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {newEffPreviews.map((p, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                          <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setNewEffPreviews((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-red-600 text-white rounded-full p-0.5"
                            disabled={isSavingEff}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {createEffError && (
                  <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                    {createEffError}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-4">
                <button
                  type="button"
                  onClick={submitNewEffect}
                  disabled={isSavingEff || newEffPreviews.length === 0}
                  className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-pink-500/20"
                >
                  {isSavingEff ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isAr ? "جاري الحفظ…" : "Saving…"}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{isAr ? "حفظ الإفكت" : "Save Effect"}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-[#151926]/60 hover:bg-[#1c2234] text-slate-400 hover:text-slate-200 font-semibold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
                >
                  {isAr ? "إغلاق الاستوديو" : "Close Studio"}
                </button>
              </div>
            </>
          ) : activeTab === "camera" ? (
            <>
              <div className="space-y-4 overflow-y-auto pr-1">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                    {isAr ? "إنشاء لقطة جديدة" : "Create New Camera"}
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    {isAr
                      ? "ارفع صور تعبّر عن نوع اللقطة (الزاوية، الإطار، البُعد البؤري). سيُحفظ في مكتبتك وتُرفَق صوره + وصفه كمرجع بصري ونصي في التوليدات."
                      : "Upload photos that capture the shot type (angle, framing, focal length). Saved to your library and used as both visual and prompt reference in generations."}
                  </p>
                </div>

                <input
                  type="file"
                  ref={newCamFileInputRef}
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleNewCamFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isAr ? "الاسم" : "Name"}
                  </label>
                  <input
                    type="text"
                    value={newCamName}
                    onChange={(e) => setNewCamName(e.target.value)}
                    placeholder={isAr ? "مثال: لقطة درون علوية بعدسة عريضة" : "e.g. top-down drone shot, wide lens"}
                    maxLength={80}
                    className="w-full bg-[#121624] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
                    disabled={isSavingCam}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isAr ? "وصف اللقطة (اختياري)" : "Shot description (optional)"}
                  </label>
                  <textarea
                    value={newCamDescription}
                    onChange={(e) => setNewCamDescription(e.target.value)}
                    placeholder={isAr ? "مثال: زاوية منخفضة، عدسة 35mm، تكوين متمركز، مسافة قريبة" : "e.g. low angle, 35mm lens, centered composition, close distance"}
                    maxLength={1200}
                    rows={3}
                    className="w-full bg-[#121624] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all resize-none"
                    disabled={isSavingCam}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isAr ? "الصور المرجعية" : "Reference photos"}
                  </label>
                  <div
                    onClick={() => !isSavingCam && newCamFileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      if (!isSavingCam && e.dataTransfer?.files) handleNewCamFilesSelected(e.dataTransfer.files);
                    }}
                    className="border-2 border-dashed border-slate-800 hover:border-amber-500/80 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#0f1320] hover:bg-[#13182a] group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-2 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 block mb-0.5">
                      {isAr ? "اسحب صور هنا" : "Drop photos here"}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      PNG, JPG, WEBP · {isAr ? "حتى 8 صور · 8MB/صورة" : "up to 8 · 8MB each"}
                    </span>
                  </div>

                  {newCamPreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {newCamPreviews.map((p, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                          <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setNewCamPreviews((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-red-600 text-white rounded-full p-0.5"
                            disabled={isSavingCam}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {createCamError && (
                  <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                    {createCamError}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-4">
                <button
                  type="button"
                  onClick={submitNewCamera}
                  disabled={isSavingCam || newCamPreviews.length === 0}
                  className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-500/20"
                >
                  {isSavingCam ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isAr ? "جاري الحفظ…" : "Saving…"}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{isAr ? "حفظ اللقطة" : "Save Camera"}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-[#151926]/60 hover:bg-[#1c2234] text-slate-400 hover:text-slate-200 font-semibold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
                >
                  {isAr ? "إغلاق الاستوديو" : "Close Studio"}
                </button>
              </div>
            </>
          ) : activeTab === "character" ? (
            <>
              <div className="space-y-4 overflow-y-auto pr-1">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
                    {isAr ? "إنشاء كاركتر جديد" : "Create New Character"}
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    {isAr
                      ? "أضف اسماً وارفع صور مرجعية. سيُحفظ في مكتبتك الخاصة ويُستخدم مرجعاً في كل التوليدات."
                      : "Name it and upload reference photos. Saved to your library and used as a reference in every generation."}
                  </p>
                </div>

                <input
                  type="file"
                  ref={newCharFileInputRef}
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleNewCharFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isAr ? "الاسم" : "Name"}
                  </label>
                  <input
                    type="text"
                    value={newCharName}
                    onChange={(e) => setNewCharName(e.target.value)}
                    placeholder={isAr ? "مثال: سارة، أحمد، أوسكار…" : "e.g. Sara, Ahmed, Oscar…"}
                    maxLength={80}
                    className="w-full bg-[#121624] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                    disabled={isSavingChar}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {isAr ? "الصور المرجعية" : "Reference photos"}
                  </label>
                  <div
                    onClick={() => !isSavingChar && newCharFileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      if (!isSavingChar && e.dataTransfer?.files) handleNewCharFilesSelected(e.dataTransfer.files);
                    }}
                    className="border-2 border-dashed border-slate-800 hover:border-emerald-500/80 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#0f1320] hover:bg-[#13182a] group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-200 block mb-0.5">
                      {isAr ? "اسحب صور هنا" : "Drop photos here"}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      PNG, JPG, WEBP · {isAr ? "حتى 8 صور · 8MB/صورة" : "up to 8 · 8MB each"}
                    </span>
                  </div>

                  {newCharPreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {newCharPreviews.map((p, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                          <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setNewCharPreviews((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-0.5 right-0.5 bg-black/70 hover:bg-red-600 text-white rounded-full p-0.5"
                            disabled={isSavingChar}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {createCharError && (
                  <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                    {createCharError}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-4">
                <button
                  type="button"
                  onClick={submitNewCharacter}
                  disabled={isSavingChar || newCharPreviews.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  {isSavingChar ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isAr ? "جاري الحفظ…" : "Saving…"}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{isAr ? "حفظ الكاركتر" : "Save Character"}</span>
                    </>
                  )}
                </button>

                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => {
                    handleNewCharFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isSavingChar}
                  className="w-full bg-[#151926] hover:bg-[#1c2234] text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4 text-slate-400" />
                  <span>{isAr ? "التقاط صورة" : "Take photo"}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-[#151926]/60 hover:bg-[#1c2234] text-slate-400 hover:text-slate-200 font-semibold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
                >
                  {isAr ? "إغلاق الاستوديو" : "Close Studio"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  {isAr ? "رفع الوسائط المخصصة" : "Drop or upload media"}
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isAr
                    ? "اسحب أو ارفع ملفات صور وفيديوهات مرجعية خاصة بك لربطها فوراً مع محرك التوليد."
                    : "Drop an image or upload your own media to bind reference tag automatically."}
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    handleFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />

                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => {
                    handleFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer?.files) {
                      handleFilesSelected(e.dataTransfer.files);
                    }
                  }}
                  className="border-2 border-dashed border-slate-800 hover:border-indigo-500/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#0f1320] hover:bg-[#13182a] group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 block mb-1">
                    {isAr ? "اسحب الملف هنا" : "Drop media here"}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    PNG, JPG, MP4, WEBP (Max 50MB)
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-white hover:bg-slate-200 text-slate-900 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isAr ? "رفع وسائط" : "Upload media"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full bg-[#151926] hover:bg-[#1c2234] text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-slate-400" />
                  <span>{isAr ? "التقاط صورة" : "Take photo"}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-[#151926]/60 hover:bg-[#1c2234] text-slate-400 hover:text-slate-200 font-semibold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer"
                >
                  {isAr ? "إغلاق الاستوديو" : "Close Studio"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
