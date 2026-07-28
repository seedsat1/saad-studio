"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Grid,
  Image as ImageIcon,
  Video as VideoIcon,
  Layers,
  HelpCircle,
  Folder,
  Zap,
  Flame,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/use-language";
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
import { getTalentStudioCopy } from "@/components/influencers/talent-studio-i18n";

export type TabType = "canvas" | "image" | "video" | "motion" | "faceswap" | "upscale" | "nsfw" | "library" | "influencers";

const TAB_KEYS: TabType[] = ["canvas", "image", "video", "motion", "faceswap", "upscale", "nsfw", "library", "influencers"];

function isTabType(value: string | null | undefined): value is TabType {
  return !!value && TAB_KEYS.includes(value as TabType);
}

function getTabFromPathname(pathname: string, search?: string): TabType {
  const parts = pathname.split("/").filter(Boolean);
  const lastPart = parts[parts.length - 1];
  if (isTabType(lastPart) && lastPart !== "influencers") return lastPart;

  const params = new URLSearchParams(search || "");
  const tabParam = params.get("tab");
  if (isTabType(tabParam)) return tabParam;

  return "influencers";
}

function getInitialTab(): TabType {
  if (typeof window !== "undefined") {
    return getTabFromPathname(window.location.pathname, window.location.search);
  }
  return "influencers";
}

interface InfluencersPageProps {
  defaultTab?: TabType;
}

const TAB_NAV_ITEMS: Array<{
  key: TabType;
  Icon: LucideIcon;
  iconClassName?: string;
}> = [
  { key: "canvas", Icon: Layers },
  { key: "image", Icon: ImageIcon },
  { key: "video", Icon: VideoIcon },
  { key: "motion", Icon: Zap },
  { key: "faceswap", Icon: Sparkles },
  { key: "upscale", Icon: ArrowUpRight },
  { key: "nsfw", Icon: Flame, iconClassName: "text-pink-400" },
  { key: "library", Icon: Folder },
  { key: "influencers", Icon: Grid },
];

function getTabHref(tabKey: TabType) {
  return tabKey === "influencers" ? "/influencers" : `/influencers/${tabKey}`;
}

export default function InfluencersStudioPage({ defaultTab }: InfluencersPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const copy = getTalentStudioCopy(lang);
  const { isLoaded, isSignedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>(() => defaultTab || getInitialTab());
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  useEffect(() => {
    const tabFromRoute = defaultTab || getTabFromPathname(pathname || "/influencers", searchParams?.toString());
    setActiveTab(tabFromRoute);
  }, [defaultTab, pathname, searchParams]);

  const navigateToTab = useCallback((tabKey: TabType, handle?: string) => {
    setActiveTab(tabKey);
    const href = handle ? `${getTabHref(tabKey)}?talent=${encodeURIComponent(handle)}` : getTabHref(tabKey);
    if (typeof window !== "undefined") {
      if (handle) window.sessionStorage.setItem("talent-studio-active-handle", handle);
      window.location.assign(href);
      return;
    }
    router.push(href);
  }, [router]);

  const previewTourTab = useCallback((tabKey: string) => {
    if (isTabType(tabKey)) setActiveTab(tabKey);
  }, []);

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

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    fetch("/api/characters")
      .then((res) => (res.ok ? res.json() : null))
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
            return [...prev, ...loaded.filter((i) => !existingHandles.has(i.handle))];
          });
        }
      })
      .catch(() => null);
  }, [isLoaded, isSignedIn]);

  const handleAddInfluencer = async (name: string, handle: string, file: File) => {
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
        description: `AI Talent ${name}`,
        images: [{ dataUrl, name: file.name }],
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || copy.createFailed);
    }
    const cover = data?.character?.coverUrl || dataUrl;

    setInfluencers((prev) => [
      {
        id: data?.character?.id || `talent-${Date.now()}`,
        name,
        handle,
        coverUrl: cover,
      },
      ...prev,
    ]);
  };

  const handleDeleteInfluencer = async (id: string) => {
    const target = influencers.find((item) => item.id === id);
    if (!target) return;

    if (!target.isDefault && !target.id.startsWith("inf-")) {
      const res = await fetch(`/api/characters/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete talent.");
      }
    }

    setInfluencers((prev) => prev.filter((item) => item.id !== id));
  };

  const influencerHandles = influencers.map((i) => i.handle);
  const influencerImageUrls = useMemo(() => influencers.reduce<Record<string, string>>((acc, item) => {
    acc[item.handle] = item.coverUrl;
    return acc;
  }, {}), [influencers]);

  return (
    <div className="w-full flex flex-col bg-[#05070f] text-white min-h-[calc(100vh-4rem)]">
      <div className="relative h-16 border-b border-white/10 bg-[#090b14]/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between shrink-0 z-[60]">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {TAB_NAV_ITEMS.map(({ key, Icon, iconClassName }) => (
            <a
              key={key}
              href={getTabHref(key)}
              onClick={() => setActiveTab(key)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer",
                activeTab === key
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md ring-2 ring-pink-500/40"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
              )}
            >
              <Icon size={14} className={iconClassName} />
              {copy.tabs[key]}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsTourOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-pink-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle size={14} />
            {copy.tour}
          </button>

          <button
            type="button"
            id="tour-assistant-trigger"
            onClick={() => setIsAssistantOpen((open) => !open)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 text-white text-xs font-bold shadow-lg shadow-purple-500/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} />
            {copy.assistant}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative pb-12">
        {activeTab === "influencers" && (
          <InfluencerRoster
            influencers={influencers}
            onAddInfluencer={handleAddInfluencer}
            onDeleteInfluencer={handleDeleteInfluencer}
            onSelectInfluencerForCanvas={(handle, action) => {
              if (isTabType(action)) navigateToTab(action, handle);
              else navigateToTab("canvas", handle);
            }}
          />
        )}

        {activeTab === "canvas" && <WorkflowCanvas influencerHandles={influencerHandles} />}
        {activeTab === "faceswap" && <FaceSwapStudio influencerHandles={influencerHandles} influencerImageUrls={influencerImageUrls} />}
        {activeTab === "motion" && <MotionControlStudio influencerHandles={influencerHandles} />}
        {activeTab === "nsfw" && <NsfwStudio influencerHandles={influencerHandles} />}
        {activeTab === "image" && <ImageStudio influencerHandles={influencerHandles} />}
        {activeTab === "video" && <VideoStudio influencerHandles={influencerHandles} />}
        {activeTab === "upscale" && <UpscaleStudio />}
        {activeTab === "library" && <LibraryStudio />}
      </div>

      <InfluencerTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onSelectTab={previewTourTab}
      />

      <InfluencerAssistantSidebar
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onExecuteCommand={(cmd) => {
          const normalized = cmd.toLowerCase();
          if (normalized.includes("video") || normalized.includes("فيديو")) navigateToTab("video");
          else if (normalized.includes("canvas") || normalized.includes("كانفاس")) navigateToTab("canvas");
        }}
      />
    </div>
  );
}
