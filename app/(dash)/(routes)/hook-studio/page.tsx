"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Bot,
  Zap,
  BrainCircuit,
  Film,
  Clapperboard,
  Ghost,
  Heart,
  Flame,
  Cpu,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Play,
  Download,
  Copy,
  Check,
  Plus,
  Trash2,
  Sliders,
  Layers,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  LLM_BRAIN_MODELS,
  HOOK_GENRES,
  HOOK_VIDEO_MODELS,
  VideoModelSpec,
} from "@/lib/hook-studio-config";

export default function HookStudioPage() {
  const [selectedBrain, setSelectedBrain] = useState("gemini-2.5-pro");
  const [selectedGenre, setSelectedGenre] = useState("cinematic");
  const [selectedModelId, setSelectedModelId] = useState("seedance-2.0-pro");
  const [prompt, setPrompt] = useState("");
  const [longScript, setLongScript] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [duration, setDuration] = useState(5);
  const [quality, setQuality] = useState("pro");

  // Reference uploads
  const [refImages, setRefImages] = useState<string[]>([]);
  const [refVideos, setRefVideos] = useState<string[]>([]);
  const [refAudios, setRefAudios] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");

  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      prompt: string;
      modelName: string;
      genre: string;
      url?: string;
      date: string;
    }>
  >([]);

  const activeModel =
    HOOK_VIDEO_MODELS.find((m) => m.id === selectedModelId) || HOOK_VIDEO_MODELS[0];

  const handleAddRefImage = () => {
    if (!imageUrlInput.trim()) return;
    if (refImages.length >= activeModel.maxRefImages) return;
    setRefImages([...refImages, imageUrlInput.trim()]);
    setImageUrlInput("");
  };

  const handleRemoveRefImage = (index: number) => {
    setRefImages(refImages.filter((_, i) => i !== index));
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
          duration,
          aspectRatio,
          quality,
          refImages,
          refVideos,
          refAudios,
          longScript,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const newEntry = {
          id: data.generationId || String(Date.now()),
          prompt,
          modelName: activeModel.name,
          genre: selectedGenre,
          url: data.mediaUrl || "https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4",
          date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setHistory([newEntry, ...history]);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 dir-rtl p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                هوك ستوديو المتطور (Hook Studio AI)
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                صانع هوكات الفيديوهات الفيروسية المدعوم بأفضل الموديلات الذكية والمراجع المتعددة
              </p>
            </div>
          </div>
        </div>

        {/* LLM Brain Selector */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-md">
          {LLM_BRAIN_MODELS.map((brain) => (
            <button
              key={brain.id}
              onClick={() => setSelectedBrain(brain.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedBrain === brain.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              {brain.id.includes("gpt") && <Bot className="w-3.5 h-3.5 text-emerald-400" />}
              {brain.id.includes("gemini") && <Sparkles className="w-3.5 h-3.5" />}
              {brain.id.includes("claude") && <BrainCircuit className="w-3.5 h-3.5" />}
              {brain.id.includes("kimi") && <Zap className="w-3.5 h-3.5" />}
              <span>{brain.name}</span>

            </button>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Input & Control Panel */}
        <div className="lg:col-span-7 space-y-6">
          {/* Genre Selection */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>اختر طابع القصة والنمط السينمائي (Genre Preset)</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {HOOK_GENRES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGenre(g.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-right transition-all ${
                    selectedGenre === g.id
                      ? `bg-gradient-to-r ${g.gradient} text-white font-bold border-indigo-500 shadow-md`
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {g.id === "cinematic" && <Film className="w-4 h-4 text-amber-400" />}
                  {g.id === "drama" && <Clapperboard className="w-4 h-4 text-rose-400" />}
                  {g.id === "horror" && <Ghost className="w-4 h-4 text-purple-400" />}
                  {g.id === "romance" && <Heart className="w-4 h-4 text-pink-400" />}
                  {g.id === "action" && <Flame className="w-4 h-4 text-orange-400" />}
                  {g.id === "scifi" && <Cpu className="w-4 h-4 text-cyan-400" />}
                  <div className="text-xs">
                    <div>{g.nameAr}</div>
                    <div className="text-[10px] opacity-60 font-mono">{g.nameEn}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Model Registry Selection */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>اختر موديل التوليد (WaveSpeed Models)</span>
              </h3>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                {activeModel.creditCost} كريدت
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
              {HOOK_VIDEO_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModelId(m.id)}
                  className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                    selectedModelId === m.id
                      ? "bg-indigo-900/30 border-indigo-500/80 text-white shadow-lg"
                      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-200">{m.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300">
                      {m.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{m.description}</p>
                </button>
              ))}
            </div>

            {/* Model Capability Limits Badge Bar */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
                <span className="block text-slate-500 text-[10px]">الصور المرجعية</span>
                <strong className="text-indigo-400">{activeModel.maxRefImages} صور</strong>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
                <span className="block text-slate-500 text-[10px]">فيديوهات المرجع</span>
                <strong className="text-indigo-400">
                  {activeModel.maxRefVideos > 0
                    ? `${activeModel.maxRefVideos} (حتى ${activeModel.maxRefVideoSeconds}ث)`
                    : "غير مدعوم"}
                </strong>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
                <span className="block text-slate-500 text-[10px]">صوتيات المرجع</span>
                <strong className="text-indigo-400">
                  {activeModel.maxRefAudios > 0
                    ? `${activeModel.maxRefAudios} (حتى ${activeModel.maxRefAudioSeconds}ث)`
                    : "غير مدعوم"}
                </strong>
              </div>
            </div>
          </div>

          {/* Prompt & References Area */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="اكتب فكرة الفديو هنا... مثلاً: افتتاحية سينمائية مشوقة لرجل يكتشف خريطة سرية تحت الأرض في مدينة عتيقة..."
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all resize-none"
            />

            {/* Long Script Accordion / Textarea */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>السكربت الطويل (اختياري للتحليل واستخراج الهوك)</span>
              </label>
              <textarea
                value={longScript}
                onChange={(e) => setLongScript(e.target.value)}
                placeholder="ألصق السكربت الكامل هنا إذا أردت تحليله تلقائياً بالذكاء الاصطناعي..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-none"
              />
            </div>

            {/* Image References Upload Input */}
            {activeModel.maxRefImages > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>الصور المرجعية (حتى {activeModel.maxRefImages} صور)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="رابط الصورة المرجعية (https://...)"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAddRefImage}
                    disabled={refImages.length >= activeModel.maxRefImages}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold rounded-xl text-slate-200 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة</span>
                  </button>
                </div>

                {refImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {refImages.map((url, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300"
                      >
                        <span className="truncate max-w-[150px]">{url}</span>
                        <button
                          onClick={() => handleRemoveRefImage(idx)}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quality & Aspect Ratio Options */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">الأبعاد:</span>
                {activeModel.aspectRatios.map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                      aspectRatio === ratio
                        ? "bg-indigo-600 text-white font-bold"
                        : "bg-slate-950 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>

              {activeModel.durations[0] > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">المدة:</span>
                  {activeModel.durations.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                        duration === d
                          ? "bg-indigo-600 text-white font-bold"
                          : "bg-slate-950 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {d}ث
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تحليل وتوليد الهوك السينمائي...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>توليد الهوك الآن ({activeModel.creditCost} كريدت)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Preview & Gallery Output */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-400" />
                <span>معرض الإنتاج الهوكات (Hook Gallery)</span>
              </span>
              <span className="text-xs text-slate-500">{history.length} نتاج</span>
            </h3>

            {history.length === 0 ? (
              <div className="h-96 rounded-2xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
                <Play className="w-10 h-10 stroke-1 text-slate-700" />
                <p className="text-xs">لم يتم توليد أي هوك بعد. اختر النمط والموديل واكتب الفكرة لتبدأ التوليد الفوري.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-4 space-y-3"
                  >
                    <div className="aspect-video bg-black rounded-xl overflow-hidden relative group">
                      <video
                        src={item.url}
                        controls
                        autoPlay
                        loop
                        muted
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-slate-200 line-clamp-2">{item.prompt}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800">
                            {item.modelName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{item.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => copyPrompt(item.prompt, item.id)}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
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
                          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
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
      </div>
    </div>
  );
}
