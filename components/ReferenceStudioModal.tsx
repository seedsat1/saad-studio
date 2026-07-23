"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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

export interface ReferenceStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedStyle?: string | null;
  onSelectStyle?: (id: string) => void;
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
  onAttachFile?: (file: { id: string; url: string; name: string; type: "image" | "video" }) => void;
  isAr?: boolean;
}

export interface UploadedItem {
  id: string;
  url: string;
  name: string;
  type: "image" | "video";
  createdAt: number;
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
  onAttachFile,
  isAr = true,
}: ReferenceStudioModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [uploadedItems, setUploadedItems] = useState<UploadedItem[]>([]);
  const [serverAssets, setServerAssets] = useState<UploadedItem[]>(DEFAULT_PRESET_ASSETS);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("saad_studio_user_uploads");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setUploadedItems(parsed);
      }
    } catch {}
  }, []);

  const saveUploadedItems = (items: UploadedItem[]) => {
    setUploadedItems(items);
    try {
      localStorage.setItem("saad_studio_user_uploads", JSON.stringify(items.slice(0, 50)));
    } catch {}
  };

  const fetchUserAssets = async () => {
    setIsLoadingAssets(true);
    try {
      const res = await fetch("/api/assets", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : Array.isArray(data?.assets) ? data.assets : [];
        if (rawList.length > 0) {
          const mapped: UploadedItem[] = rawList
            .filter((item: any) => item.url && (item.type === "image" || item.type === "video"))
            .map((item: any) => ({
              id: item.id || `asset-${Math.random()}`,
              url: item.url,
              name: item.prompt ? String(item.prompt).slice(0, 35) : "Generated Asset",
              type: item.type === "video" ? "video" : "image",
              createdAt: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
            }));
          setServerAssets(mapped);
        } else {
          setServerAssets(DEFAULT_PRESET_ASSETS);
        }
      } else {
        setServerAssets(DEFAULT_PRESET_ASSETS);
      }
    } catch (err) {
      console.error("Failed to fetch user assets:", err);
      setServerAssets(DEFAULT_PRESET_ASSETS);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUserAssets();
    }
  }, [isOpen]);

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
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith("video/");
      newItems.push({
        id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        url,
        name: file.name,
        type: isVideo ? "video" : "image",
        createdAt: Date.now(),
      });
    });

    const updated = [...newItems, ...uploadedItems];
    saveUploadedItems(updated);

    if (newItems[0] && onAttachFile) {
      onAttachFile(newItems[0]);
    }
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
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
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
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
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
                <Pin className="w-3.5 h-3.5 text-slate-500 hover:text-indigo-400" />
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
                <Pin className="w-3.5 h-3.5 text-slate-500 hover:text-emerald-400" />
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
            </div>
          </div>

          <div className="hidden md:block pt-4 border-t border-slate-800/80 text-[10px] text-slate-500 text-center">
            Saad Studio AI • Reference Engine
          </div>
        </div>

        {/* ── Center Content Area Grid ── */}
        <div className="flex-1 flex flex-col bg-[#080a10] overflow-hidden">
          {/* Top Search & Filter Bar */}
          <div className="p-4 border-b border-slate-800/80 bg-[#0b0e17] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
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
                        onSelectStyle?.(styleItem.id);
                        if (onAttachFile) {
                          onAttachFile({
                            id: `style-${styleItem.id}-${Date.now()}`,
                            url: styleItem.imageUrl,
                            name: styleItem.nameAr,
                            type: "image",
                          });
                        }
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
                        onSelectCamera?.(isSelected ? null : camItem.id);
                        if (!isSelected && onAttachFile) {
                          onAttachFile({
                            id: `cam-${camItem.id}-${Date.now()}`,
                            url: camItem.imageUrl,
                            name: camItem.nameAr,
                            type: "image",
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
                        onSelectEffect?.(isSelected ? null : effItem.id);
                        if (!isSelected && onAttachFile) {
                          onAttachFile({
                            id: `eff-${effItem.id}-${Date.now()}`,
                            url: effItem.imageUrl,
                            name: effItem.nameAr,
                            type: "image",
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
                        onSelectSketch?.(isSelected ? null : sketchItem.id);
                        if (!isSelected && onAttachFile) {
                          onAttachFile({
                            id: `sketch-${sketchItem.id}-${Date.now()}`,
                            url: sketchItem.imageUrl,
                            name: sketchItem.nameAr,
                            type: "image",
                          });
                        }
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
            {["uploads", "history"].includes(activeTab) && (
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
                        <span className="text-[10px] text-slate-500 font-medium">
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
                                  <video src={item.url} className="w-full h-full object-cover" muted />
                                ) : (
                                  <img
                                    src={item.url}
                                    alt={item.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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

            {/* Fallback for Stock / Color Tabs */}
            {["stock", "color"].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-[#0c0f18] rounded-3xl border border-dashed border-slate-800">
                <div className="w-14 h-14 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-200">
                  {isAr ? "مكتبة وسائط مرجعية جاهزة" : "Reference Media Vault"}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                  {isAr
                    ? "يمكنك اختيار أي ملف مرفوع أو سحب ملف جديد من اللوحة اليمنى للتطبيق المباشر"
                    : "Select any reference asset or drop custom media from the right panel."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Media Upload Drop Zone ── */}
        <div className="w-full md:w-72 bg-[#0b0e17] p-5 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800/80 flex-shrink-0">
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
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
              className="border-2 border-dashed border-slate-800 hover:border-indigo-500/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#0f1320] hover:bg-[#13182a] group"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-200 block mb-1">
                {isAr ? "اسحب الملف هنا" : "Drop media here"}
              </span>
              <span className="text-[10px] text-slate-500 block">
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
        </div>
      </div>
    </div>
  );
}
