"use client";

import React, { useState, useEffect, useRef } from "react";
import MobileTopBar from "@/components/mobile/MobileTopBar";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileDesktopGuard from "@/components/mobile/MobileDesktopGuard";
import { downloadMediaFile } from "@/lib/client-download";
import SimpleToast from "@/components/SimpleToast";

interface ImageModelConfig {
  id: string;
  name: string;
  provider: string;
  note: string;
  description: string;
  ratePerImage: number;
  apiRoute: string;
  aspectRatios: string[];
  qualities: string[];
  maxImages: number;
}

const IMAGE_MODELS: ImageModelConfig[] = [
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    provider: "GOOGLE",
    note: "التزام فائق ودقة 4K",
    description: "محرك Google الرسمي فائق الدقة، ممتاز للرسوم التوضيحية والصور الواقعية وتفاصيل الخامات.",
    ratePerImage: 2,
    apiRoute: "nano-banana-pro",
    aspectRatios: ["1:1", "4:5", "9:16", "16:9"],
    qualities: ["1K", "2K", "4K"],
    maxImages: 6,
  },
  {
    id: "gpt-image-2-text-to-image",
    name: "GPT Image 2",
    provider: "OPENAI",
    note: "تضمين نصوص وتكوين متقدم",
    description: "محرك OpenAI الأحدث لتوليد الصور وتضمين النصوص والطباعة بدقة سينمائية.",
    ratePerImage: 2,
    apiRoute: "gpt-image-2-text-to-image",
    aspectRatios: ["1:1", "4:5", "9:16", "16:9"],
    qualities: ["1K", "2K", "4K"],
    maxImages: 4,
  },
];

const VISUAL_STYLES = [
  "فيكتور مسطّح",
  "سينمائي واقعي",
  "بطاقة أخبار",
  "تصوير منتج",
  "ثلاثي الأبعاد",
  "إنفوجرافيك",
  "بورتريه استوديو",
  "بدون أسلوب",
];

export default function MobileImagePage() {
  const [selectedModel, setSelectedModel] = useState<ImageModelConfig>(IMAGE_MODELS[0]);
  const [mode, setMode] = useState<"t2i" | "edit" | "elem">("t2i");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("فيكتور مسطّح");
  const [ratio, setRatio] = useState("1:1");
  const [batchCount, setBatchCount] = useState<number>(4);
  const [quality, setQuality] = useState("2K");
  const [refImages, setRefImages] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImageIndices, setSelectedImageIndices] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const costPerImage = quality === "4K" ? 4 : 2;
  const estimatedCost = costPerImage * batchCount;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remainingSlots = selectedModel.maxImages - refImages.length;
    const toProcess = Array.from(files).slice(0, Math.max(0, remainingSlots));

    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setRefImages((prev) => [...prev, reader.result as string].slice(0, selectedModel.maxImages));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeRefImage = (index: number) => {
    setRefImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleImagePick = (idx: number) => {
    setSelectedImageIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleEnhancePrompt = async () => {
    if (isEnhancing) return;
    if (!prompt.trim()) {
      setToastMessage("يرجى كتابة وصف الصورة أولاً ليتم تحسينه");
      return;
    }
    setIsEnhancing(true);
    try {
      const res = await fetch("/api/prompt/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode: "enhance", type: "image" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل تحسين الوصف");
      }
      const data = await res.json();
      if (data.result) {
        setPrompt(data.result);
        setToastMessage("تم تحسين وصف الصورة بذكاء ✨");
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
      setToastMessage("يرجى كتابة وصف الصورة أو رفع مرجع");
      return;
    }

    setLoading(true);
    setGeneratedImages([]);
    setSelectedImageIndices([]);

    try {
      const fullPrompt = selectedStyle !== "بدون أسلوب" ? `${prompt}, style: ${selectedStyle}` : prompt;

      const payload: Record<string, any> = {
        prompt: fullPrompt,
        model: selectedModel.apiRoute,
        modelId: selectedModel.id,
        aspectRatio: ratio,
        quality,
        numImages: batchCount,
        numOutputs: batchCount,
        negativePrompt: negativePrompt || undefined,
        imageUrl: refImages[0] || undefined,
        imageUrls: refImages.length > 0 ? refImages : undefined,
        inputImages: refImages.length > 0 ? refImages : undefined,
      };

      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "فشل توليد الصور");
      }

      const data = await res.json();
      const urls: string[] = [];

      if (Array.isArray(data.images)) {
        urls.push(...data.images.map((img: any) => (typeof img === "string" ? img : img.url)));
      } else if (Array.isArray(data.outputs)) {
        urls.push(...data.outputs.map((img: any) => (typeof img === "string" ? img : img.url)));
      } else if (data.imageUrl || data.url) {
        urls.push(data.imageUrl || data.url);
      }

      if (urls.length === 0) {
        throw new Error("لم يتم استلام أي صور من المحرك");
      }

      setGeneratedImages(urls);
      setToastMessage(`تم توليد ${urls.length} صور بنجاح! 🎉`);
    } catch (err: any) {
      setToastMessage(err.message || "حدث خطأ أثناء التوليد");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSelected = async () => {
    if (generatedImages.length === 0) return;
    const targetImages =
      selectedImageIndices.length > 0
        ? selectedImageIndices.map((idx) => generatedImages[idx]).filter(Boolean)
        : generatedImages;

    for (let i = 0; i < targetImages.length; i++) {
      await downloadMediaFile(targetImages[i], `saadstudio_image_${Date.now()}_${i + 1}.png`, {
        title: "صورة استوديو سعد",
        fallbackExt: "png",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#05080F] text-[#EAF2FF] flex justify-center selection:bg-[#38C2F0] selection:text-black">
      <MobileDesktopGuard desktopFallbackHref="/image" toolName="استوديو الصور" />
      <SimpleToast show={Boolean(toastMessage)} message={toastMessage || ""} onHide={() => setToastMessage(null)} />

      <div className="w-full max-w-[430px] min-h-screen relative overflow-hidden bg-gradient-to-b from-[#070D1F] via-[#0B1330] to-[#070D1F] pb-[160px]">
        {/* Top bar */}
        <MobileTopBar title="توليد صور" subtitle="استوديو الهاتف — Saad Studio" />

        {/* Contact Sheet Stage */}
        <div className="px-4 pt-4 pb-2">
          <div className="relative p-3 rounded-[20px] border border-[#38C2F0]/30 bg-gradient-to-br from-[#101C40] to-[#0A1128]">
            <div className="flex items-center gap-2 mb-2.5 text-[10px] tracking-widest text-slate-400 font-mono uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38C2F0]" />
              <span>CONTACT SHEET · {ratio} · {quality}</span>
              {loading && (
                <span className="mr-auto flex items-center gap-1.5 text-[#8A65F7] animate-pulse">
                  <i className="w-1.5 h-1.5 rounded-full bg-[#8A65F7]" />
                  GENERATING
                </span>
              )}
            </div>

            {/* Grid Cells */}
            <div
              className={`grid gap-2 ${
                batchCount === 1 ? "grid-cols-1" : batchCount === 2 ? "grid-cols-2" : "grid-cols-2"
              }`}
            >
              {Array.from({ length: batchCount }).map((_, idx) => {
                const imgUrl = generatedImages[idx];
                const isPicked = selectedImageIndices.includes(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => imgUrl && toggleImagePick(idx)}
                    className={`relative rounded-xl overflow-hidden border transition-all duration-300 flex items-center justify-center cursor-pointer ${
                      ratio === "4:5"
                        ? "aspect-[4/5]"
                        : ratio === "9:16"
                        ? "aspect-[9/16]"
                        : ratio === "16:9"
                        ? "aspect-video"
                        : "aspect-square"
                    } ${
                      isPicked
                        ? "border-[#38C2F0] shadow-md shadow-cyan-500/20"
                        : "border-[#38C2F0]/15 bg-[#1A2A57]/60"
                    }`}
                  >
                    <span className="absolute top-1.5 left-2 font-mono text-[9px] text-slate-400 z-10">
                      {String(idx + 1).padStart(2, "0")}
                    </span>

                    {/* Placeholder */}
                    {!imgUrl && !loading && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38C2F0" strokeWidth="1.5" className="opacity-40">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <circle cx="8.5" cy="9.5" r="1.5" />
                        <path d="M4 17l5-4.5 5 4.5 3-2.5 3 2.5" />
                      </svg>
                    )}

                    {/* Loading Shimmer */}
                    {loading && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-[#38C2F0]/20 to-[#8A65F7]/20 animate-pulse" />
                    )}

                    {/* Image result */}
                    {imgUrl && <img src={imgUrl} alt="output" className="w-full h-full object-cover" />}

                    {/* Pick Checkbox */}
                    {imgUrl && (
                      <div
                        className={`absolute bottom-2 right-2 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isPicked
                            ? "bg-[#38C2F0] border-[#38C2F0] text-[#04101F]"
                            : "border-white/50 bg-black/40 text-transparent"
                        }`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                          <path d="M5 12l5 5L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center mt-3 text-xs text-slate-400 font-mono">
              <span>
                محدد: <b className="text-[#38C2F0]">{selectedImageIndices.length}</b> من {batchCount}
              </span>
              {generatedImages.length > 0 && (
                <button
                  onClick={handleSaveSelected}
                  className="px-3 py-1 rounded-full border border-[#38C2F0]/30 bg-[#38C2F0]/10 text-[#38C2F0] text-xs font-bold active:scale-95 transition-transform"
                >
                  حفظ المحدد في الألبوم
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <section className="px-4 pt-3">
          <div className="flex gap-1.5 bg-[#16244C]/50 p-1.5 rounded-2xl border border-[#38C2F0]/15">
            <button
              onClick={() => setMode("t2i")}
              className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                mode === "t2i" ? "bg-gradient-to-r from-[#38C2F0] to-[#8A65F7] text-[#04101F]" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7V5h16v2M12 5v14M9 19h6" />
              </svg>
              نص إلى صورة
            </button>
            <button
              onClick={() => setMode("edit")}
              className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                mode === "edit" ? "bg-gradient-to-r from-[#38C2F0] to-[#8A65F7] text-[#04101F]" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 20l4-1 10-10-3-3L5 16z" />
                <path d="M14 6l4 4" />
              </svg>
              تعديل صورة
            </button>
            <button
              onClick={() => setMode("elem")}
              className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                mode === "elem" ? "bg-gradient-to-r from-[#38C2F0] to-[#8A65F7] text-[#04101F]" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" />
              </svg>
              عناصر ثابتة
            </button>
          </div>
        </section>

        {/* Reference images upload */}
        {mode !== "t2i" && (
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
                <div key={idx} className="relative w-16 h-16 flex-none rounded-xl overflow-hidden border border-[#38C2F0]/30">
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
            <h2 className="text-xs font-bold text-slate-400">وصف الصورة</h2>
            <em className="text-[11px] not-italic text-[#38C2F0]">صف الأسلوب والإضاءة والتكوين</em>
          </div>
          <div className="border border-[#38C2F0]/20 rounded-2xl bg-[#16244C]/40 overflow-hidden focus-within:border-[#38C2F0]/50 transition-colors">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={1500}
              placeholder="مثال: رسم فيكتور مسطح لميناء بحري ورافعات شحن حديثة، ألوان أزرق داكن وذهبي، إضاءة سينمائية نظيفة، بدون تشوهات"
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
              <span className="mr-auto text-[11px] text-slate-400 font-mono">{prompt.length} / 1500</span>
            </div>
          </div>
        </section>

        {/* Visual Styles */}
        <section className="px-4 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-slate-400">الأسلوب البصري</h2>
            <em className="text-[11px] not-italic text-[#8A65F7]">{selectedStyle}</em>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {VISUAL_STYLES.map((style) => (
              <button
                key={style}
                onClick={() => setSelectedStyle(style)}
                className={`flex-none py-2 px-3.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                  selectedStyle === style
                    ? "border-[#8A65F7] bg-[#8A65F7]/20 text-[#DCD0FF]"
                    : "border-[#38C2F0]/15 bg-[#16244C]/40 text-slate-400"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </section>

        {/* Model Selection (Nano Banana Pro & GPT Image 2) */}
        <section className="px-4 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-slate-400">المحرك المعتمد</h2>
            <span className="text-[10px] font-semibold text-[#38C2F0] px-2 py-0.5 rounded-full bg-[#38C2F0]/10 border border-[#38C2F0]/20">
              {selectedModel.name}
            </span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {IMAGE_MODELS.map((m) => {
              const isSelected = selectedModel.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedModel(m)}
                  className={`flex-1 min-w-[170px] p-3 rounded-2xl border cursor-pointer transition-all duration-200 relative ${
                    isSelected
                      ? "border-[#38C2F0] bg-gradient-to-br from-[#38C2F0]/15 to-[#8A65F7]/10 shadow-lg shadow-cyan-950/30"
                      : "border-[#38C2F0]/15 bg-[#16244C]/45 hover:border-[#38C2F0]/30"
                  }`}
                >
                  <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#8A65F7] text-white absolute -top-2 left-3">
                    {m.provider}
                  </span>
                  <strong className="block text-sm font-bold text-slate-100 mt-1">{m.name}</strong>
                  <p className="text-[11px] text-slate-400 leading-snug my-1.5 min-h-[30px] line-clamp-2">
                    {m.description}
                  </p>
                  <span className="text-xs text-[#C9A227] font-bold font-mono">
                    {costPerImage} نقاط / صورة
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
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                  ratio === r
                    ? "border-[#38C2F0] bg-[#38C2F0]/15 text-[#38C2F0]"
                    : "border-[#38C2F0]/15 bg-[#16244C]/40 text-slate-400"
                }`}
              >
                {r === "1:1" ? "مربع" : r === "4:5" ? "منشور" : r === "9:16" ? "ستوري" : "غلاف"}
                <i className="block not-italic text-[10px] font-mono text-slate-400 mt-0.5">{r}</i>
              </button>
            ))}
          </div>
        </section>

        {/* Batch Counter (1, 2, 4, 6) */}
        <section className="px-4 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-slate-400">عدد الخيارات</h2>
            <em className="text-[11px] not-italic text-slate-400">كل خيار يُحتسب منفردًا</em>
          </div>
          <div className="flex gap-2">
            {[1, 2, 4, 6].map((n) => (
              <button
                key={n}
                onClick={() => setBatchCount(n)}
                className={`flex-1 py-2 rounded-xl border text-xs font-mono font-bold transition-all text-center ${
                  batchCount === n
                    ? "border-[#38C2F0] bg-[#38C2F0]/15 text-[#38C2F0]"
                    : "border-[#38C2F0]/15 bg-[#16244C]/40 text-slate-400"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* Quality Selector */}
        <section className="px-4 pt-3">
          <h2 className="text-xs font-bold text-slate-400 mb-2">الجودة</h2>
          <div className="flex gap-2">
            {selectedModel.qualities.map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                  quality === q
                    ? "border-[#38C2F0] bg-[#38C2F0]/15 text-[#38C2F0]"
                    : "border-[#38C2F0]/15 bg-[#16244C]/40 text-slate-400"
                }`}
              >
                {q}
                <i className="block not-italic text-[10px] font-mono text-slate-400 mt-0.5">
                  {q === "1K" ? "مسودة" : q === "2K" ? "إنتاج" : "فائقة"}
                </i>
              </button>
            ))}
          </div>
        </section>

        {/* Fixed Generate Bar */}
        <div className="fixed bottom-0 inset-x-0 max-w-[430px] mx-auto z-50 p-3.5 bg-[#070D1F]/95 backdrop-blur-2xl border-t border-[#38C2F0]/20">
          <div className="flex items-baseline justify-between text-xs text-slate-400 mb-2 px-1">
            <span>التكلفة التقديرية — {batchCount} صور</span>
            <b className="text-[#C9A227] font-mono text-base">
              {estimatedCost} <small className="text-[11px] font-normal text-slate-400 font-sans">نقطة</small>
            </b>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#38C2F0] to-[#8A65F7] text-[#04101F] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-[0.985] disabled:opacity-50 transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
              <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z" />
            </svg>
            {loading ? "جارٍ توليد الصور..." : "ولّد الصور"}
          </button>
          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
}
