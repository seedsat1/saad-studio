"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Sparkles,
  Grid,
  Image as ImageIcon,
  Video as VideoIcon,
  Layers,
  Wand2,
  HelpCircle,
  Folder,
  Zap,
  Flame,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InfluencerRoster, InfluencerItem } from "@/components/influencers/InfluencerRoster";
import { WorkflowCanvas } from "@/components/influencers/WorkflowCanvas";
import { InfluencerTourModal } from "@/components/influencers/InfluencerTourModal";
import { InfluencerAssistantSidebar } from "@/components/influencers/InfluencerAssistantSidebar";
import { FaceSwapStudio } from "@/components/influencers/FaceSwapStudio";
import { MotionControlStudio } from "@/components/influencers/MotionControlStudio";
import { NsfwStudio } from "@/components/influencers/NsfwStudio";
import { ImageStudio } from "@/components/influencers/ImageStudio";
import { VideoStudio } from "@/components/influencers/VideoStudio";
import { UpscaleStudio } from "@/components/influencers/UpscaleStudio";
import { LibraryStudio } from "@/components/influencers/LibraryStudio";

type TabType = "canvas" | "image" | "video" | "motion" | "faceswap" | "upscale" | "nsfw" | "library" | "influencers";

function getInitialTab(): TabType {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (
      tabParam &&
      ["canvas", "image", "video", "motion", "faceswap", "upscale", "nsfw", "library", "influencers"].includes(tabParam)
    ) {
      return tabParam as TabType;
    }
  }
  return "canvas";
}

export default function InfluencersPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);

  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Sync active tab from URL query search params (?tab=...)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (
        tabParam &&
        ["canvas", "image", "video", "motion", "faceswap", "upscale", "nsfw", "library", "influencers"].includes(tabParam)
      ) {
        setActiveTab(tabParam as TabType);
      }
    }
  }, []);

  const handleTabChange = (tabKey: TabType) => {
    setActiveTab(tabKey);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabKey);
      window.history.pushState({}, "", url.toString());
    }
  };

  // Default Influencers List
  const [influencers, setInfluencers] = useState<InfluencerItem[]>([
    {
      id: "inf-1",
      name: "Gavi",
      handle: "@gavi",
      coverUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500",
      isDefault: true,
    },
    {
      id: "inf-2",
      name: "Sophie",
      handle: "@sophie",
      coverUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500",
    },
    {
      id: "inf-3",
      name: "Katrina",
      handle: "@katrina",
      coverUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500",
    },
    {
      id: "inf-4",
      name: "Kat",
      handle: "@kat",
      coverUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500",
    },
  ]);

  // Load backend registered characters safely after auth hydration
  useEffect(() => {
    if (!isLoaded) return;
    if (isLoaded && !isSignedIn) return;

    fetch("/api/characters")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data?.characters) && data.characters.length > 0) {
          const loaded: InfluencerItem[] = data.characters.map((c: any) => ({
            id: c.id,
            name: c.name,
            handle: c.name.startsWith("@") ? c.name : `@${c.name.toLowerCase().replace(/\s+/g, "")}`,
            coverUrl: c.coverUrl || c.referenceUrls?.[0] || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500",
          }));
          setInfluencers((prev) => {
            const existingHandles = new Set(prev.map((i) => i.handle));
            const newItems = loaded.filter((i) => !existingHandles.has(i.handle));
            return [...prev, ...newItems];
          });
        }
      })
      .catch(() => null);
  }, [isLoaded, isSignedIn]);

  const handleAddInfluencer = async (name: string, handle: string, file: File) => {
    const formData = new FormData();
    formData.append("name", handle);
    formData.append("description", `AI Influencer ${name}`);
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });

    const res = await fetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: handle,
        description: `AI Influencer ${name}`,
        images: [{ dataUrl, name: file.name }],
      }),
    });

    const data = await res.json().catch(() => null);
    const cover = data?.character?.coverUrl || dataUrl;

    const newItem: InfluencerItem = {
      id: data?.character?.id || `inf-${Date.now()}`,
      name,
      handle,
      coverUrl: cover,
    };

    setInfluencers((prev) => [newItem, ...prev]);
  };

  const influencerHandles = influencers.map((i) => i.handle);
  const influencerImageUrls = influencers.reduce<Record<string, string>>((acc, item) => {
    acc[item.handle] = item.coverUrl;
    return acc;
  }, {});

  return (
    <div className="w-full flex flex-col bg-[#05070f] text-white min-h-[calc(100vh-4rem)]">
      {/* Top Header Navigation Bar matching screenshots and video 100% */}
      <div className="relative h-16 border-b border-white/10 bg-[#090b14]/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between shrink-0 z-[60]">
        {/* Navigation Tabs - Excludes MCP & CLI completely */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTabChange("canvas");
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer",
              activeTab === "canvas" ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md ring-2 ring-pink-500/40" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
            )}
          >
            <Layers size={14} />
            Canvas
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTabChange("image");
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer",
              activeTab === "image" ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md ring-2 ring-pink-500/40" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
            )}
          >
            <ImageIcon size={14} />
            Image
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTabChange("video");
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer",
              activeTab === "video" ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md ring-2 ring-pink-500/40" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
            )}
          >
            <VideoIcon size={14} />
            Video
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTabChange("motion");
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer",
              activeTab === "motion" ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md ring-2 ring-pink-500/40" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
            )}
          >
            <Zap size={14} />
            Motion Control
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTabChange("faceswap");
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer",
              activeTab === "faceswap" ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md ring-2 ring-pink-500/40" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
            )}
          >
            <Sparkles size={14} />
            Face Swap
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTabChange("upscale");
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer",
              activeTab === "upscale" ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md ring-2 ring-pink-500/40" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
            )}
          >
            <ArrowUpRight size={14} />
            Upscale
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTabChange("nsfw");
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer",
              activeTab === "nsfw" ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md ring-2 ring-pink-500/40" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
            )}
          >
            <Flame size={14} className="text-pink-400" />
            NSFW
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTabChange("library");
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer",
              activeTab === "library" ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md ring-2 ring-pink-500/40" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
            )}
          >
            <Folder size={14} />
            Library
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTabChange("influencers");
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer",
              activeTab === "influencers" ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md ring-2 ring-pink-500/40" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
            )}
          >
            <Grid size={14} />
            Influencers
          </button>
        </div>

        {/* Right Side Header Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsTourOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-pink-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle size={14} />
            الجولة التعريفية
          </button>

          <button
            type="button"
            id="tour-assistant-trigger"
            onClick={() => setIsAssistantOpen(!isAssistantOpen)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 text-white text-xs font-bold shadow-lg shadow-purple-500/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} />
            ✦ Assistant
          </button>
        </div>
      </div>

      {/* Workspace Content rendering based on activeTab */}
      <div className="flex-1 overflow-y-auto relative pb-12">
        {activeTab === "influencers" && (
          <InfluencerRoster
            influencers={influencers}
            onAddInfluencer={handleAddInfluencer}
            onSelectInfluencerForCanvas={(handle) => {
              handleTabChange("canvas");
            }}
          />
        )}

        {activeTab === "canvas" && (
          <WorkflowCanvas influencerHandles={influencerHandles} />
        )}

        {activeTab === "faceswap" && (
          <FaceSwapStudio influencerHandles={influencerHandles} influencerImageUrls={influencerImageUrls} />
        )}

        {activeTab === "motion" && (
          <MotionControlStudio influencerHandles={influencerHandles} />
        )}

        {activeTab === "nsfw" && (
          <NsfwStudio influencerHandles={influencerHandles} />
        )}

        {activeTab === "image" && (
          <ImageStudio influencerHandles={influencerHandles} />
        )}

        {activeTab === "video" && (
          <VideoStudio influencerHandles={influencerHandles} />
        )}

        {activeTab === "upscale" && (
          <UpscaleStudio />
        )}

        {activeTab === "library" && (
          <LibraryStudio />
        )}
      </div>

      {/* Floating Interactive Tour Modal */}
      <InfluencerTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onSelectTab={(tabKey) => handleTabChange(tabKey as any)}
      />

      {/* Floating AI Assistant Sidebar */}
      <InfluencerAssistantSidebar
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onExecuteCommand={(cmd) => {
          if (cmd.includes("فيديو") || cmd.includes("video")) handleTabChange("video");
          else if (cmd.includes("كانفاس") || cmd.includes("canvas")) handleTabChange("canvas");
        }}
      />
    </div>
  );
}
