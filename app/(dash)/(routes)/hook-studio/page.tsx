"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import {
  Sparkles,
  Video,
  Play,
  Download,
  Copy,
  Check,
  Paperclip,
  Loader2,
  Send,
  Plus,
  Trash2,
} from "lucide-react";
import {
  LLM_BRAIN_MODELS,
  HOOK_GENRES,
  HOOK_VIDEO_MODELS,
} from "@/lib/hook-studio-config";
import { useLanguage } from "@/lib/use-language";

export default function HookStudioPage() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  // Prompt Form State
  const [prompt, setPrompt] = useState("");
  const [selectedBrain, setSelectedBrain] = useState("kimi-k3-pro");
  const [selectedModelId, setSelectedModelId] = useState("seedance-2.0-pro");
  const [selectedGenre, setSelectedGenre] = useState("cinematic");
  const [longScript, setLongScript] = useState("");
  const [refImages, setRefImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Status
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Production Gallery Data
  const [gallery, setGallery] = useState<
    Array<{
      id: string;
      prompt: string;
      modelName: string;
      genre: string;
      url: string;
      date: string;
      credits: number;
    }>
  >([
    {
      id: "demo-1",
      prompt: isAr
        ? "افتتاحية سينمائية درامية لرجل يكتشف خريطة سرية تحت الأرض في مدينة عتيقة"
        : "Dramatic cinematic opening of a man discovering an ancient secret map underground",
      modelName: "Seedance 2.0",
      genre: isAr ? "سينمائي" : "Cinematic",
      url: "https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4",
      date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      credits: 15,
    },
  ]);

  const activeModel =
    HOOK_VIDEO_MODELS.find((m) => m.id === selectedModelId) || HOOK_VIDEO_MODELS[0];
  const activeGenre =
    HOOK_GENRES.find((g) => g.id === selectedGenre) || HOOK_GENRES[0];

  const handleAddImage = () => {
    if (!imageUrlInput.trim() || refImages.length >= 4) return;
    setRefImages([...refImages, imageUrlInput.trim()]);
    setImageUrlInput("");
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    try {
      const res = await fetch("/api/hook-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          llmBrain: selectedBrain,
          genre: selectedGenre,
          modelId: selectedModelId,
          refImages,
          longScript,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const newEntry = {
          id: data.generationId || String(Date.now()),
          prompt,
          modelName: activeModel.name,
          genre: isAr ? activeGenre.nameAr : activeGenre.nameEn,
          url:
            data.mediaUrl ||
            "https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4",
          date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          credits: activeModel.creditCost,
        };
        setGallery([newEntry, ...gallery]);
        setPrompt("");
      }
    } catch (err) {
      console.error("Generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      className={`h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col space-y-4 selection:bg-indigo-500 selection:text-white ${
        isAr ? "dir-rtl" : "dir-ltr"
      }`}
    >
      {/* Fixed Header & Command Console (Non-scrollable) */}
      <div className="flex-shrink-0 max-w-5xl mx-auto w-full space-y-3">
        {/* Title Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">
                {isAr ? "هوك ستوديو" : "Hook Studio"}
              </h1>
              <p className="text-[11px] text-slate-400">
                {isAr ? "توليد هوكات الفيديوهات" : "Video Hook Studio"}
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
            {activeModel.name} • {activeModel.creditCost} {isAr ? "رصيد" : "credits"}
          </span>
        </div>

        {/* Single Floating Command Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 md:p-4 shadow-xl backdrop-blur-2xl space-y-3 transition-all focus-within:border-indigo-500/70">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              isAr
                ? "اكتب فكرة الهوك هنا..."
                : "Type your hook concept here..."
            }
            rows={2}
            className="w-full bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all resize-none shadow-inner"
          />

          {/* Reference Image Pills */}
          {refImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {refImages.map((url, idx) => (
                <span
                  key={idx}
                  className="text-[11px] bg-slate-950 text-indigo-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 border border-slate-800"
                >
                  <span className="truncate max-w-[120px]">{url}</span>
                  <button
                    onClick={() => setRefImages(refImages.filter((_, i) => i !== idx))}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Script Drawer */}
          {longScript !== "" && (
            <textarea
              value={longScript}
              onChange={(e) => setLongScript(e.target.value)}
              placeholder={isAr ? "ألصق السكربت هنا..." : "Paste script here..."}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-none"
            />
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={selectedBrain}
                onChange={(e) => setSelectedBrain(e.target.value)}
                className="bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] font-semibold cursor-pointer"
              >
                {LLM_BRAIN_MODELS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="bg-slate-950 text-indigo-300 border border-slate-800 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] font-semibold cursor-pointer"
              >
                {HOOK_VIDEO_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.creditCost}c)
                  </option>
                ))}
              </select>

              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="bg-slate-950 text-slate-300 border border-slate-800 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] font-semibold cursor-pointer"
              >
                {HOOK_GENRES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {isAr ? g.nameAr : g.nameEn}
                  </option>
                ))}
              </select>

              {/* Attach Dropdown Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1 text-[11px]"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{isAr ? "مرفقات" : "Attach"}</span>
                </button>

                {showAttachMenu && (
                  <div className="absolute top-9 right-0 z-30 w-60 bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-2xl space-y-2 text-xs">
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        placeholder={isAr ? "رابط صورة مرجعية" : "Reference image URL"}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-200"
                      />
                      <button
                        onClick={() => {
                          handleAddImage();
                          setShowAttachMenu(false);
                        }}
                        className="px-2 py-1 bg-indigo-600 text-white rounded-lg font-bold text-[11px]"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setLongScript(longScript ? "" : "script...");
                        setShowAttachMenu(false);
                      }}
                      className="w-full text-right p-1.5 rounded-lg bg-slate-950 text-slate-300 hover:text-indigo-400 text-[11px]"
                    >
                      {longScript ? (isAr ? "إلغاء السكربت" : "Clear Script") : (isAr ? "+ سكربت طويل" : "+ Long Script")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isAr ? "توليد..." : "Generating..."}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{isAr ? `توليد الهوك` : `Generate`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ONLY Gallery Section is Scrollable (`flex-1 overflow-y-auto min-h-0`) */}
      <div className="flex-1 overflow-y-auto min-h-0 max-w-6xl mx-auto w-full space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">
              {isAr ? "معرض الإنتاج" : "Production Gallery"}
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {gallery.length} {isAr ? "عنصر" : "items"}
          </span>
        </div>

        {gallery.length === 0 ? (
          <div className="h-64 rounded-2xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
            <Play className="w-8 h-8 stroke-1 text-slate-700" />
            <p className="text-xs">
              {isAr
                ? "لا يوجد فيديوهات بعد. اكتب فكرتك بالأعلى واضغط توليد."
                : "No generated hooks yet. Type your prompt above and click generate."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
            {gallery.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 space-y-3 overflow-hidden shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
                    <video
                      src={item.url}
                      controls
                      autoPlay
                      loop
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed font-medium">
                    {item.prompt}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800">
                      {item.modelName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{item.date}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyPrompt(item.prompt, item.id)}
                      className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={item.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
