"use client";

import React, { useState, useEffect, useCallback } from "react";
import MobileTopBar from "@/components/mobile/MobileTopBar";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileDesktopGuard from "@/components/mobile/MobileDesktopGuard";
import { downloadMediaFile } from "@/lib/client-download";
import SimpleToast from "@/components/SimpleToast";
import { useAuthenticatedFetch } from "@/hooks/use-authenticated-fetch";
import { useActiveProfile } from "@/lib/profile-context";

interface MediaItem {
  id: string;
  type: "video" | "image" | "audio";
  url: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  prompt?: string;
  model?: string;
  createdAt: string;
}

export default function MobileGalleryPage() {
  const [filter, setFilter] = useState<"all" | "video" | "image" | "audio">("all");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { fetchWithAuth } = useAuthenticatedFetch();
  const { activeProfile } = useActiveProfile();

  const fetchMedia = useCallback(async (overrideProfileId?: string) => {
    setLoading(true);
    try {
      const targetProfileId = overrideProfileId !== undefined
        ? overrideProfileId
        : (activeProfile?.id || (typeof window !== "undefined" ? localStorage.getItem("saad_active_profile_id") : ""));

      const params = new URLSearchParams({
        limit: "50",
        ...(targetProfileId ? { profileId: targetProfileId } : {}),
      });

      const res = await fetchWithAuth(`/api/assets?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data.assets) ? data.assets : Array.isArray(data.items) ? data.items : [];
        const mapped: MediaItem[] = rawList.map((it: any) => {
          const rawType = String(it.type || it.assetType || "").toLowerCase();
          const itemType: "video" | "image" | "audio" =
            rawType.includes("video") ? "video" : rawType.includes("audio") ? "audio" : "image";
          const mediaUrl = it.url || it.originalUrl || it.mediaUrl || "";

          return {
            id: it.id || String(Math.random()),
            type: itemType,
            url: mediaUrl,
            thumbnailUrl: it.thumbnailUrl || it.posterUrl || mediaUrl,
            posterUrl: it.posterUrl || undefined,
            prompt: it.prompt || "",
            model: it.model || it.modelUsed || "",
            createdAt: it.createdAt || new Date().toISOString(),
          };
        }).filter((it: MediaItem) => Boolean(it.url));
        setItems(mapped);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeProfile?.id, fetchWithAuth]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Synchronize on profile switch
  useEffect(() => {
    const handleProfileSwitch = (e: Event) => {
      const customEvent = e as CustomEvent<{ profileId?: string }>;
      const newProfileId = customEvent.detail?.profileId ?? (typeof window !== "undefined" ? localStorage.getItem("saad_active_profile_id") : "");
      setItems([]);
      fetchMedia(newProfileId || "");
    };

    window.addEventListener("saad-profile-switched", handleProfileSwitch);
    return () => {
      window.removeEventListener("saad-profile-switched", handleProfileSwitch);
    };
  }, [fetchMedia]);

  const filteredItems = items.filter((item) => filter === "all" || item.type === filter);

  const handleDownload = async (item: MediaItem) => {
    const ext = item.type === "video" ? "mp4" : item.type === "audio" ? "mp3" : "png";
    await downloadMediaFile(item.url, `saadstudio_${item.type}_${Date.now()}.${ext}`, {
      title: "وسائط استوديو سعد",
      fallbackExt: ext,
    });
    setToastMessage("تم بدء التنزيل وحفظ الملف في الألبوم 📲");
  };

  return (
    <div className="min-h-screen bg-[#05080F] text-[#EAF2FF] flex justify-center selection:bg-[#38C2F0] selection:text-black">
      <MobileDesktopGuard desktopFallbackHref="/gallery" toolName="معرض الوسائط" />
      <SimpleToast show={Boolean(toastMessage)} message={toastMessage || ""} onHide={() => setToastMessage(null)} />

      <div className="w-full max-w-[430px] min-h-screen relative overflow-hidden bg-gradient-to-b from-[#070D1F] via-[#0B1330] to-[#070D1F] pb-[120px]">
        {/* Top Bar */}
        <MobileTopBar title="المكتبة والمعرض" subtitle="وسائطك المحدثة — Saad Studio" />

        {/* Filter Pills */}
        <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto scrollbar-none">
          {[
            { id: "all", label: "الكل" },
            { id: "video", label: "الفيديوهات" },
            { id: "image", label: "الصور" },
            { id: "audio", label: "الصوتيات" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`flex-none py-2 px-4 rounded-full text-xs font-bold transition-all ${
                filter === tab.id
                  ? "bg-gradient-to-r from-[#38C2F0] to-[#8A65F7] text-[#04101F]"
                  : "bg-[#16244C]/50 text-slate-400 border border-[#38C2F0]/15"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Media Grid */}
        <div className="px-4 py-2">
          {loading && (
            <div className="py-20 text-center text-xs text-slate-400">
              <div className="w-8 h-8 mx-auto border-2 border-[#38C2F0] border-t-transparent rounded-full animate-spin mb-3" />
              جارٍ تحميل مكتبة الوسائط...
            </div>
          )}

          {!loading && filteredItems.length === 0 && (
            <div className="py-24 text-center px-6">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#16244C]/60 border border-[#38C2F0]/20 flex items-center justify-center text-[#38C2F0] mb-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
              <p className="text-sm font-bold text-slate-200">لا توجد وسائط مولدة بعد</p>
              <span className="text-xs text-slate-400 block mt-1 leading-relaxed">
                ابدأ بتوليد الصور أو الفيديوهات أو المقاطع الصوتية لتظهر هنا فوراً.
              </span>
            </div>
          )}

          {!loading && filteredItems.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedMedia(item)}
                  className="relative aspect-square rounded-2xl overflow-hidden border border-[#38C2F0]/20 bg-[#16244C]/40 group cursor-pointer"
                >
                  {item.type === "image" && (
                    <img src={item.url} alt={item.prompt || "image"} className="w-full h-full object-cover" />
                  )}
                  {item.type === "video" && (
                    <div className="relative w-full h-full">
                      <video
                        src={item.url}
                        poster={item.thumbnailUrl || item.posterUrl}
                        preload="metadata"
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                        <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5l11 7-11 7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                  {item.type === "audio" && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-[#1A2A57] to-[#0C1533]">
                      <div className="w-10 h-10 rounded-full bg-[#E0B252]/20 text-[#E0B252] flex items-center justify-center mb-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M4 12h3l2-5 3 12 2.5-8 1.5 3h4" />
                        </svg>
                      </div>
                      <span className="text-[10px] text-slate-300 line-clamp-2 leading-tight">
                        {item.prompt || "مقطع صوتي"}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(item);
                    }}
                    className="absolute bottom-2 left-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-95 transition-transform"
                    aria-label="تنزيل للألبوم"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M12 4v12M8 12l4 4 4-4M4 20h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Media Preview Modal */}
        {selectedMedia && (
          <div
            onClick={() => setSelectedMedia(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4"
          >
            <div className="relative max-w-sm w-full bg-[#0F1B3D] border border-[#38C2F0]/30 rounded-3xl overflow-hidden p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center text-xs text-slate-300 pb-2 border-b border-white/10">
                <span className="font-bold">معاينة وتنزيل</span>
                <button onClick={() => setSelectedMedia(null)} className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center font-bold">
                  ✕
                </button>
              </div>

              {selectedMedia.type === "image" && (
                <img src={selectedMedia.url} alt="preview" className="w-full max-h-[50vh] object-contain rounded-2xl" />
              )}
              {selectedMedia.type === "video" && (
                <video src={selectedMedia.url} controls autoPlay loop className="w-full max-h-[50vh] object-contain rounded-2xl" />
              )}
              {selectedMedia.type === "audio" && (
                <audio src={selectedMedia.url} controls autoPlay className="w-full mt-4" />
              )}

              {selectedMedia.prompt && (
                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed bg-[#070D1F]/60 p-2.5 rounded-xl border border-white/5">
                  {selectedMedia.prompt}
                </p>
              )}

              <button
                onClick={() => handleDownload(selectedMedia)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#38C2F0] to-[#8A65F7] text-[#04101F] font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M12 4v12M8 12l4 4 4-4M4 20h16" />
                </svg>
                حفظ في ألبوم الهاتف (Photos)
              </button>
            </div>
          </div>
        )}

        {/* Bottom Nav */}
        <div className="fixed bottom-0 inset-x-0 max-w-[430px] mx-auto z-40 bg-[#070D1F]/95 backdrop-blur-2xl border-t border-[#38C2F0]/20 p-2.5">
          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
}
