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
  isProcessing?: boolean;
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
          const isProcessing = Boolean(
            it.isProcessing ||
            it.status === "processing" ||
            it.status === "pending" ||
            it.status === "created" ||
            (typeof mediaUrl === "string" && mediaUrl.startsWith("task:"))
          );

          // Ensure poster is a genuine image, never an mp4 or video file
          const isVideoFile = (u: string) => /\.(mp4|mov|webm|mkv|m4v|avi|ogv)(\?.*)?$/i.test(u.trim());
          const candidatePoster = [it.posterUrl, it.thumbnailUrl, it.startImageUrl]
            .find((u) => typeof u === "string" && u.trim().length > 0 && !isVideoFile(u));

          return {
            id: it.id || String(Math.random()),
            type: itemType,
            url: isProcessing ? "" : mediaUrl,
            thumbnailUrl: candidatePoster || (itemType === "image" ? mediaUrl : undefined),
            posterUrl: candidatePoster || undefined,
            prompt: it.prompt || "",
            model: it.model || it.modelUsed || "",
            createdAt: it.createdAt || new Date().toISOString(),
            isProcessing,
          };
        }).filter((it: MediaItem) => Boolean(it.url || it.isProcessing));
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

  // Auto-refresh when items are processing
  useEffect(() => {
    const hasProcessing = items.some((it) => it.isProcessing);
    if (!hasProcessing) return;

    const timer = setInterval(() => {
      fetchMedia();
    }, 4000);

    return () => clearInterval(timer);
  }, [items, fetchMedia]);

  const filteredItems = items.filter((item) => filter === "all" || item.type === filter);

  const [downloading, setDownloading] = useState(false);
  const [preloadedFile, setPreloadedFile] = useState<File | null>(null);

  // Preload media file as soon as the modal is opened for instant native sharing
  useEffect(() => {
    if (!selectedMedia?.url) {
      setPreloadedFile(null);
      return;
    }

    let active = true;
    const fetchBlob = async () => {
      try {
        const ext = selectedMedia.type === "video" ? "mp4" : selectedMedia.type === "audio" ? "mp3" : "png";
        const filename = `saadstudio_${selectedMedia.type}_${Date.now()}.${ext}`;
        const mimeType = selectedMedia.type === "video" ? "video/mp4" : selectedMedia.type === "audio" ? "audio/mpeg" : "image/png";

        let res = await fetch(selectedMedia.url).catch(() => null);
        if (!res || !res.ok) {
          res = await fetch(`/api/download?url=${encodeURIComponent(selectedMedia.url)}&filename=${encodeURIComponent(filename)}`).catch(() => null);
        }
        if (res && res.ok && active) {
          const blob = await res.blob();
          const file = new File([blob], filename, { type: mimeType });
          if (active) setPreloadedFile(file);
        }
      } catch {
        // ignore background preload
      }
    };

    fetchBlob();
    return () => {
      active = false;
    };
  }, [selectedMedia?.url, selectedMedia?.type]);

  const handleDownload = async (item: MediaItem) => {
    if (downloading) return;
    setDownloading(true);
    setToastMessage("جارٍ تجهيز وحفظ الملف... ⏳");
    const ext = item.type === "video" ? "mp4" : item.type === "audio" ? "mp3" : "png";
    const filename = `saadstudio_${item.type}_${Date.now()}.${ext}`;

    try {
      // 1. If preloadedFile is available, invoke navigator.share immediately (instant user activation)
      if (preloadedFile && typeof navigator !== "undefined" && typeof navigator.share === "function") {
        if (typeof navigator.canShare === "function" && navigator.canShare({ files: [preloadedFile] })) {
          await navigator.share({
            files: [preloadedFile],
            title: item.prompt || "استوديو سعد",
          });
          setToastMessage("تم فتح خيارات الحفظ 📲");
          setDownloading(false);
          return;
        }
      }

      const ok = await downloadMediaFile(item.url, filename, {
        title: item.prompt || "استوديو سعد",
        fallbackExt: ext,
      });
      if (ok) {
        setToastMessage("تم فتح خيارات الحفظ والتنزيل 📲");
      }
    } catch {
      const dlUrl = `/api/download?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(filename)}`;
      window.location.assign(dlUrl);
      setToastMessage("جاري التنزيل المباشر للهاتف 📲");
    } finally {
      setDownloading(false);
    }
  };

  const handleDirectDownload = (item: MediaItem) => {
    const ext = item.type === "video" ? "mp4" : item.type === "audio" ? "mp3" : "png";
    const filename = `saadstudio_${item.type}_${Date.now()}.${ext}`;
    const dlUrl = `/api/download?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(filename)}`;
    window.location.assign(dlUrl);
    setToastMessage("تم بدء التنزيل المباشر للملف 📥");
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
              <p className="text-sm font-bold text-slate-200 mb-1">لا توجد وسائط بعد</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                الوسائط المولدة من صفحات الصور والفيديو والصوت ستظهر هنا تلقائياً.
              </p>
            </div>
          )}

          {!loading && filteredItems.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              {filteredItems.map((item) => {
                if (item.isProcessing) {
                  return (
                    <div
                      key={item.id}
                      className="relative aspect-square rounded-2xl overflow-hidden border border-[#38C2F0]/40 bg-gradient-to-br from-[#16244C]/90 to-[#0B1330] flex flex-col items-center justify-center p-3 text-center"
                    >
                      <div className="w-8 h-8 border-2 border-[#38C2F0] border-t-transparent rounded-full animate-spin mb-2" />
                      <span className="text-[11px] font-bold text-[#38C2F0]">جارٍ التوليد...</span>
                      <span className="text-[9px] text-slate-400 mt-1 line-clamp-2 px-1 leading-snug">
                        {item.prompt || (item.type === "video" ? "فيديو ذكاء اصطناعي" : "وسائط ذكاء اصطناعي")}
                      </span>
                      <span className="text-[8px] text-cyan-400/80 font-mono mt-1">قيد المعالجة ⏳</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedMedia(item)}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-[#38C2F0]/20 bg-[#16244C]/40 group cursor-pointer"
                  >
                    {item.type === "image" && (
                      <img src={item.url} alt={item.prompt || "image"} className="w-full h-full object-cover" />
                    )}
                    {item.type === "video" && (
                      <div className="relative w-full h-full bg-[#070D1F]">
                        {item.posterUrl ? (
                          <img
                            src={item.posterUrl}
                            alt={item.prompt || "غلاف الفيديو"}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <video
                            src={item.url ? `${item.url}#t=0.001` : undefined}
                            preload="metadata"
                            playsInline
                            muted
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                          <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-lg">
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
                );
              })}
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
                <video
                  src={selectedMedia.url}
                  poster={selectedMedia.posterUrl}
                  controls
                  autoPlay
                  playsInline
                  loop
                  className="w-full max-h-[50vh] object-contain rounded-2xl bg-black"
                />
              )}
              {selectedMedia.type === "audio" && (
                <audio src={selectedMedia.url} controls autoPlay className="w-full mt-4" />
              )}

              {selectedMedia.prompt && (
                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed bg-[#070D1F]/60 p-2.5 rounded-xl border border-white/5">
                  {selectedMedia.prompt}
                </p>
              )}

              <div className="space-y-2 pt-1">
                <button
                  disabled={downloading}
                  onClick={() => handleDownload(selectedMedia)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#38C2F0] to-[#8A65F7] text-[#04101F] font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 shadow-lg shadow-[#38C2F0]/15"
                >
                  {downloading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#04101F] border-t-transparent rounded-full animate-spin" />
                      <span>جارٍ تجهيز الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        <path d="M12 4v12M8 12l4 4 4-4M4 20h16" />
                      </svg>
                      <span>حفظ في ألبوم الصور (Photos / Share) 📲</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDirectDownload(selectedMedia)}
                  className="w-full py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold text-[11px] flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>تنزيل مباشر كملف ({selectedMedia.type === "video" ? "MP4" : selectedMedia.type === "audio" ? "MP3" : "PNG"}) 📥</span>
                </button>
              </div>

              {selectedMedia.type === "video" && (
                <p className="text-[10px] text-slate-400 text-center leading-relaxed px-1">
                  💡 على هواتف iPhone: اضغط <span className="text-[#38C2F0]">"حفظ في ألبوم الصور"</span> ثم اختر <span className="text-white font-bold">"Save Video" (حفظ الفيديو)</span> من قائمة المشاركة لحفظه في تطبيق الصور فوراً.
                </p>
              )}
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
