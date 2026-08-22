"use client";

import React, { useState, useEffect, useRef } from "react";
import MobileTopBar from "@/components/mobile/MobileTopBar";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileDesktopGuard from "@/components/mobile/MobileDesktopGuard";
import { downloadMediaFile } from "@/lib/client-download";
import SimpleToast from "@/components/SimpleToast";

interface VideoModelConfig {
  id: string;
  name: string;
  provider: string;
  note: string;
  description: string;
  ratePerSec: number;
  apiRoute: string;
  durations: number[];
  aspectRatios: string[];
  resolutions: string[];
  maxImages: number;
  hasAudio: boolean;
}

const VIDEO_MODELS: VideoModelConfig[] = [
  {
    id: "google-gemini-omni",
    name: "Gemini Omni",
    provider: "GOOGLE",
    note: "توليد سريع وثبات عالٍ",
    description: "محرك Google الرسمي للفيديو مع التزام فائق بالوصف ودعم المدخلات المتعددة.",
    ratePerSec: 3,
    apiRoute: "google/gemini-omni-flash",
    durations: [3, 4, 5, 6, 7, 8, 9, 10],
    aspectRatios: ["9:16", "16:9"],
    resolutions: ["720p"],
    maxImages: 3,
    hasAudio: true,
  },
  {
    id: "bytedance-seedance-mini",
    name: "Seedance Mini",
    provider: "BYTEDANCE",
    note: "الأسرع والأوفر للتجارب",
    description: "محرك سينمائي سريع واقتصادي بحركة انسيابية ممتازة ودعم صوت مدمج.",
    ratePerSec: 4,
    apiRoute: "bytedance/seedance-2.0-mini/text-to-video",
    durations: [4, 5, 6, 7, 8, 9, 10, 12, 15],
    aspectRatios: ["9:16", "1:1", "16:9"],
    resolutions: ["720p", "1080p"],
    maxImages: 9,
    hasAudio: true,
  },
];

export default function MobileVideoPage() {
  const [selectedModel, setSelectedModel] = useState<VideoModelConfig>(VIDEO_MODELS[0]);
  const [mode, setMode] = useState<"t2v" | "i2v" | "ref">("t2v");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [duration, setDuration] = useState<number>(5);
  const [ratio, setRatio] = useState<string>("9:16");
  const [resolution, setResolution] = useState<string>("720p");
  const [motionIntensity, setMotionIntensity] = useState<number>(6);
  const [generateAudio, setGenerateAudio] = useState<boolean>(true);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState("تحليل الوصف");
  const [eta, setEta] = useState(30);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep duration within selected model range
  useEffect(() => {
    if (!selectedModel.durations.includes(duration)) {
      setDuration(selectedModel.durations[0] || 5);
    }
    if (!selectedModel.aspectRatios.includes(ratio)) {
      setRatio(selectedModel.aspectRatios[0] || "9:16");
    }
  }, [selectedModel]);

  const resolutionMultiplier = resolution === "1080p" ? 1.5 : resolution === "4k" ? 2.4 : 1.0;
  const estimatedCost = Math.round(selectedModel.ratePerSec * duration * (selectedModel.id === "google-gemini-omni" ? 1 : resolutionMultiplier));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remainingSlots = selectedModel.maxImages - refImages.length;
    const toProcess = Array.from(files).slice(0, Math.max(0, remainingSlots));

    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === "string") {
          setRefImages((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = "";
  };

  const removeRefImage = (index: number) => {
    setRefImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleEnhancePrompt = async () => {
    if (isEnhancing) return;
    if (!prompt.trim()) {
      setToastMessage("يرجى كتابة فكرة أو وصف المشهد أولاً ليتم تحسينه");
      return;
    }
    setIsEnhancing(true);
    try {
      const res = await fetch("/api/prompt/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode: "enhance", type: "video" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل تحسين الوصف");
      }
      const data = await res.json();
      if (data.result) {
        setPrompt(data.result);
        setToastMessage("تم تحسين وصف الفيديو بذكاء سينمائي ✨");
      }
    } catch (err: any) {
      setToastMessage(err.message || "تعذر تحسين الوصف حالياً");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (loading) return;
    if (!prompt.trim() && refImages.length === 0) {
      setToastMessage("يرجى كتابة وصف المشهد أو رفع صورة مرجعية");
      return;
    }

    setLoading(true);
    setProgress(0);
    setResultVideoUrl(null);
    setStepText("تحليل الوصف وتجهيز المحرك");

    const steps = [
      "تحليل الوصف",
      "بناء الإطار الأولي",
      "توليد وتنسيق الحركة",
      "معالجة واستقرار الإطارات",
      "تصدير الفيديو النهائي",
    ];

    let currentProgress = 0;
    const progressTimer = setInterval(() => {
      currentProgress = Math.min(95, currentProgress + Math.random() * 8 + 3);
      setProgress(Math.round(currentProgress));
      setStepText(steps[Math.min(steps.length - 1, Math.floor((currentProgress / 100) * steps.length))]);
      setEta(Math.max(2, Math.round(duration * 4 * (1 - currentProgress / 100))));
    }, 500);

    try {
      const payload: Record<string, any> = {
        prompt,
        model: selectedModel.apiRoute,
        duration,
        aspectRatio: ratio,
        resolution,
        sound: selectedModel.hasAudio && generateAudio,
        startImage: refImages[0] || undefined,
        referenceImages: refImages.length > 0 ? refImages : undefined,
        negativePrompt: negativePrompt || undefined,
      };

      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        clearInterval(progressTimer);
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "فشل إرسال طلب توليد الفيديو");
      }

      const data = await res.json();
      let videoUrl = data.videoUrl || data.url || (Array.isArray(data.outputs) && data.outputs[0]);

      // If task is processing/pending, poll GET /api/video?taskId=...
      if (!videoUrl && data.taskId) {
        const taskId = data.taskId;
        const maxPollAttempts = 120; // 4 minutes
        let attempts = 0;

        while (!videoUrl && attempts < maxPollAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          attempts++;

          try {
            const pollRes = await fetch(`/api/video?taskId=${encodeURIComponent(taskId)}`, { cache: "no-store" });
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              if (pollData.status === "failed") {
                throw new Error(pollData.error || "فشل توليد الفيديو من المزود");
              }
              if (pollData.status === "completed" || pollData.status === "succeeded") {
                videoUrl =
                  pollData.videoUrl ||
                  pollData.url ||
                  (Array.isArray(pollData.outputs) && pollData.outputs[0]);
                break;
              }
            }
          } catch (pollErr: any) {
            if (pollErr.message?.includes("فشل توليد الفيديو")) throw pollErr;
            // continue polling on transient network hiccup
          }
        }
      }

      clearInterval(progressTimer);

      if (!videoUrl) {
        throw new Error("استغرق التوليد وقتاً أطول من المتوقع، يرجى مراجعة المعرض بعد قليل");
      }

      setProgress(100);
      setResultVideoUrl(videoUrl);
      setToastMessage("تم توليد الفيديو بنجاح! 🎉");
    } catch (err: any) {
      clearInterval(progressTimer);
      setToastMessage(err.message || "حدث خطأ أثناء التوليد");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToCameraRoll = async () => {
    if (!resultVideoUrl) return;
    await downloadMediaFile(resultVideoUrl, `saadstudio_video_${Date.now()}.mp4`, {
      title: "فيديو استوديو سعد",
      fallbackExt: "mp4",
    });
  };

  return (
    <div className="min-h-screen bg-[#05080F] text-[#EAF2FF] flex justify-center selection:bg-[#38C2F0] selection:text-black">
      <MobileDesktopGuard desktopFallbackHref="/video" toolName="استوديو الفيديو" />
      <SimpleToast show={Boolean(toastMessage)} message={toastMessage || ""} onHide={() => setToastMessage(null)} />

      <div className="w-full max-w-[430px] min-h-screen relative overflow-hidden bg-gradient-to-b from-[#070D1F] via-[#0B1330] to-[#070D1F] pb-[280px]">
        {/* Top bar */}
        <MobileTopBar title="توليد فيديو" subtitle="استوديو الهاتف — Saad Studio" />

        {/* Viewfinder Stage */}
        <div className="px-4 pt-4 pb-2">
          <div
            className={`relative w-full max-h-[44vh] mx-auto rounded-[20px] overflow-hidden border border-[#38C2F0]/30 bg-gradient-to-br from-[#16244C] to-[#0B1330] flex items-center justify-center transition-all duration-300 ${
              ratio === "1:1" ? "aspect-square" : ratio === "16:9" ? "aspect-video" : "aspect-[9/16]"
            } ${loading ? "border-[#8A65F7]" : ""}`}
          >
            {/* Brackets */}
            <span className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#38C2F0]/80 rounded-tl-lg" />
            <span className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#38C2F0]/80 rounded-tr-lg" />
            <span className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#38C2F0]/80 rounded-bl-lg" />
            <span className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#38C2F0]/80 rounded-br-lg" />

            <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] tracking-widest text-slate-400 font-mono uppercase bg-black/30 px-2 py-0.5 rounded-full">
              {ratio} · {resolution.toUpperCase()}
            </span>

            {/* Empty state */}
            {!loading && !resultVideoUrl && (
              <div className="text-center px-6">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#38C2F0]/10 border border-[#38C2F0]/20 flex items-center justify-center text-[#38C2F0] mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <rect x="3" y="6" width="12" height="12" rx="2" />
                    <path d="M15 10l6-3v10l-6-3z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-slate-200">المعاينة تظهر هنا</p>
                <span className="text-xs text-slate-400 block mt-1 leading-relaxed">
                  اكتب وصف المشهد، اختر المحرك،<br />ثم اضغط «ولّد الفيديو»
                </span>
              </div>
            )}

            {/* Live generation spinner */}
            {loading && (
              <div className="text-center px-6 w-full">
                <div className="relative w-20 h-20 mx-auto mb-3">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 78 78">
                    <circle className="text-white/10" strokeWidth="5" stroke="currentColor" fill="none" cx="39" cy="39" r="33" />
                    <circle
                      className="text-[#38C2F0] transition-all duration-300"
                      strokeWidth="5"
                      strokeDasharray={207}
                      strokeDashoffset={207 - (207 * progress) / 100}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      cx="39"
                      cy="39"
                      r="33"
                    />
                  </svg>
                  <b className="absolute inset-0 flex items-center justify-center font-mono text-base font-bold text-slate-100">
                    {progress}%
                  </b>
                </div>
                <p className="text-xs font-bold text-slate-200">{stepText}</p>
                <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">~ {eta}s متبقية</span>
              </div>
            )}

            {/* Generated result video */}
            {!loading && resultVideoUrl && (
              <div className="relative w-full h-full group">
                <video src={resultVideoUrl} controls autoPlay loop playsInline className="w-full h-full object-cover" />
                <button
                  onClick={handleSaveToCameraRoll}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-[#38C2F0] text-[#04101F] text-xs font-black shadow-lg flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M12 4v12M8 12l4 4 4-4M4 20h16" />
                  </svg>
                  حفظ في الألبوم
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mode Selector */}
        <section className="px-4 pt-3">
          <div className="flex gap-1.5 bg-[#16244C]/50 p-1.5 rounded-2xl border border-[#38C2F0]/15">
            <button
              onClick={() => setMode("t2v")}
              className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                mode === "t2v" ? "bg-gradient-to-r from-[#38C2F0] to-[#8A65F7] text-[#04101F]" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7V5h16v2M12 5v14M9 19h6" />
              </svg>
              نص إلى فيديو
            </button>
            <button
              onClick={() => setMode("i2v")}
              className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                mode === "i2v" ? "bg-gradient-to-r from-[#38C2F0] to-[#8A65F7] text-[#04101F]" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="8.5" cy="9.5" r="1.5" />
                <path d="M4 16l4.5-4 5 4.5" />
              </svg>
              صورة إلى فيديو
            </button>
            <button
              onClick={() => setMode("ref")}
              className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                mode === "ref" ? "bg-gradient-to-r from-[#38C2F0] to-[#8A65F7] text-[#04101F]" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" />
              </svg>
              شخصية وحركة
            </button>
          </div>
        </section>

        {/* Reference images upload */}
        {mode !== "t2v" && (
          <section className="px-4 pt-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-slate-400">الصور المرجعية</h2>
              <em className="text-[11px] not-italic text-[#38C2F0] font-mono">
                {refImages.length} من {selectedModel.maxImages}
              </em>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {refImages.length < selectedModel.maxImages && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 flex-none rounded-xl border border-dashed border-[#38C2F0]/40 bg-[#16244C]/40 text-[#38C2F0] flex items-center justify-center active:scale-95 transition-transform"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              )}
              {refImages.map((img, idx) => (
                <div key={idx} className="relative w-16 h-16 flex-none rounded-xl overflow-hidden border border-[#38C2F0]/30 group">
                  <img src={img} alt="ref" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeRefImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Prompt Input */}
        <section className="px-4 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-slate-400">وصف المشهد</h2>
            <em className="text-[11px] not-italic text-[#38C2F0]">كن دقيقاً بالحركة والإضاءة</em>
          </div>
          <div className="border border-[#38C2F0]/20 rounded-2xl bg-[#16244C]/40 overflow-hidden focus-within:border-[#38C2F0]/50 transition-colors">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={1200}
              placeholder="مثال: لقطة سينمائية لمهندس داخل مصنع متطور، الكاميرا تتقدم ببطء للأمام، إضاءة سينمائية جانبية، حركة واقعية هادئة"
              className="w-full min-h-[96px] p-3.5 bg-transparent border-0 resize-none text-slate-100 text-sm leading-relaxed outline-none placeholder:text-slate-500"
            />
            <div className="flex items-center gap-2 px-3 py-2 border-t border-[#38C2F0]/15 bg-[#070D1F]/40">
              <button
                onClick={handleEnhancePrompt}
                disabled={isEnhancing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#38C2F0]/30 bg-[#38C2F0]/10 text-[#38C2F0] text-xs font-bold active:scale-95 disabled:opacity-50 transition-transform"
              >
                {isEnhancing ? (
                  <div className="w-3 h-3 border-2 border-[#38C2F0] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z" />
                  </svg>
                )}
                {isEnhancing ? "جارٍ التحسين..." : "حسّن الوصف"}
              </button>
              <span className="mr-auto text-[11px] text-slate-400 font-mono">{prompt.length} / 1200</span>
            </div>
          </div>
        </section>

        {/* Model Selection (Gemini Omni & Seedance Mini) */}
        <section className="px-4 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-slate-400">المحرك المعتمد</h2>
            <span className="text-[10px] font-semibold text-[#38C2F0] px-2 py-0.5 rounded-full bg-[#38C2F0]/10 border border-[#38C2F0]/20">
              {selectedModel.name}
            </span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {VIDEO_MODELS.map((m) => {
              const isSelected = selectedModel.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedModel(m)}
                  className={`flex-1 min-w-[170px] p-3 rounded-2xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "border-[#38C2F0] bg-gradient-to-br from-[#38C2F0]/15 to-[#8A65F7]/10 shadow-lg shadow-cyan-950/30"
                      : "border-[#38C2F0]/15 bg-[#16244C]/45 hover:border-[#38C2F0]/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <strong className="block text-sm font-bold text-slate-100">{m.name}</strong>
                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#8A65F7]/25 text-[#DCD0FF] border border-[#8A65F7]/40 shrink-0">
                      {m.provider}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug my-1.5 min-h-[30px] line-clamp-2">
                    {m.description}
                  </p>
                  <span className="text-xs text-[#C9A227] font-bold font-mono">
                    {m.ratePerSec} نقاط / ثانية
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Aspect Ratio */}
        <section className="px-4 pt-3">
          <h2 className="text-xs font-bold text-slate-400 mb-2">الأبعاد</h2>
          <div className="flex gap-2">
            {selectedModel.aspectRatios.map((r) => (
              <button
                key={r}
                onClick={() => setRatio(r)}
                className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                  ratio === r
                    ? "border-[#38C2F0] bg-[#38C2F0]/15 text-[#38C2F0]"
                    : "border-[#38C2F0]/15 bg-[#16244C]/40 text-slate-400"
                }`}
              >
                {r === "9:16" ? "عمودي" : r === "16:9" ? "أفقي" : "مربع"}
                <i className="block not-italic text-[10px] font-mono text-slate-400 mt-0.5">{r}</i>
              </button>
            ))}
          </div>
        </section>

        {/* Film Strip Duration Selector */}
        <section className="px-4 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-slate-400">المدة</h2>
            <em className="text-[11px] not-italic text-[#38C2F0]">كل إطار = ثانية</em>
          </div>
          <div className="flex gap-1 p-2 rounded-2xl border border-[#38C2F0]/20 bg-[#070D1F]/60 relative overflow-x-auto scrollbar-none">
            {selectedModel.durations.map((sec) => {
              const isLit = sec <= duration;
              return (
                <button
                  key={sec}
                  onClick={() => setDuration(sec)}
                  className={`flex-1 min-w-[28px] h-10 rounded-lg border text-xs font-mono font-bold flex items-center justify-center transition-all ${
                    isLit
                      ? "border-[#38C2F0] bg-gradient-to-br from-[#38C2F0]/40 to-[#8A65F7]/30 text-white"
                      : "border-[#38C2F0]/10 bg-[#16244C]/50 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {sec}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 px-1">
            <span>المدة المختارة: <b className="text-[#38C2F0] font-mono" dir="ltr">{duration}s</b></span>
            <span>الحد الأقصى: <b className="text-slate-300 font-mono" dir="ltr">{selectedModel.durations[selectedModel.durations.length - 1]}s</b></span>
          </div>
        </section>

        {/* Resolution Selector */}
        <section className="px-4 pt-3">
          <h2 className="text-xs font-bold text-slate-400 mb-2">الدقة</h2>
          <div className="flex gap-2">
            {selectedModel.resolutions.map((res) => (
              <button
                key={res}
                onClick={() => setResolution(res)}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                  resolution === res
                    ? "border-[#38C2F0] bg-[#38C2F0]/15 text-[#38C2F0]"
                    : "border-[#38C2F0]/15 bg-[#16244C]/40 text-slate-400"
                }`}
              >
                {res.toUpperCase()}
                <i className="block not-italic text-[10px] font-mono text-slate-400 mt-0.5">
                  {res === "720p" ? "معاينة قياسية" : "عالية الدقة"}
                </i>
              </button>
            ))}
          </div>

          {/* Advanced Settings */}
          <details className="mt-3 border border-[#38C2F0]/15 rounded-2xl bg-[#16244C]/30 overflow-hidden group">
            <summary className="p-3 text-xs font-bold text-slate-300 cursor-pointer list-none flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38C2F0" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 8h14M5 16h14" />
                  <circle cx="9" cy="8" r="2" fill="#0F1B3D" />
                  <circle cx="15" cy="16" r="2" fill="#0F1B3D" />
                </svg>
                إعدادات متقدمة
              </span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7D8CB0" strokeWidth="2" className="transition-transform group-open:rotate-180">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <div className="p-3.5 border-t border-[#38C2F0]/15 space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5">ما لا تريد ظهوره (Negative Prompt)</label>
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="تشوه الوجه، نصوص، اهتزاز، عيوب بصرية"
                  className="w-full p-2.5 rounded-xl border border-[#38C2F0]/20 bg-[#070D1F]/60 text-slate-200 text-xs outline-none focus:border-[#38C2F0]/50"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>شدة الحركة</span>
                  <span className="font-mono text-[#38C2F0]">{motionIntensity} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={motionIntensity}
                  onChange={(e) => setMotionIntensity(+e.target.value)}
                  className="w-full accent-[#38C2F0] bg-transparent"
                />
              </div>
              {selectedModel.hasAudio && (
                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-semibold text-slate-200">توليد صوت مدمج مع الفيديو</span>
                    <small className="block text-[10px] text-slate-400">موسيقى ومؤثرات صوتية متزامنة</small>
                  </div>
                  <button
                    onClick={() => setGenerateAudio(!generateAudio)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${generateAudio ? "bg-gradient-to-r from-[#38C2F0] to-[#8A65F7]" : "bg-slate-700"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${generateAudio ? "right-0.5" : "left-0.5"}`} />
                  </button>
                </div>
              )}
            </div>
          </details>
        </section>

        {/* Fixed Generate Bar */}
        <div className="fixed bottom-0 inset-x-0 max-w-[430px] mx-auto z-50 p-3.5 bg-[#070D1F]/95 backdrop-blur-2xl border-t border-[#38C2F0]/20">
          <div className="flex items-baseline justify-between text-xs text-slate-400 mb-2 px-1">
            <span>التكلفة التقديرية</span>
            <b className="text-[#C9A227] font-mono text-base">
              {estimatedCost} <small className="text-[11px] font-normal text-slate-400 font-sans">نقطة</small>
            </b>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#38C2F0] to-[#8A65F7] text-[#04101F] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-[0.985] disabled:opacity-50 transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M8 5l11 7-11 7z" />
            </svg>
            {loading ? "جارٍ التوليد الآن..." : "ولّد الفيديو"}
          </button>
          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
}
