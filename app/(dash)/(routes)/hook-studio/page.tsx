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
  ChevronDown,
  ChevronUp,
  Loader2,
  Wand2,
  Send,
  Eye,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  LLM_BRAIN_MODELS,
  HOOK_GENRES,
  HOOK_VIDEO_MODELS,
  VideoModelSpec,
} from "@/lib/hook-studio-config";

interface GeneratedHookConcept {
  id: string;
  title: string;
  genre: string;
  script: string;
  visualPrompt: string;
  recommendedModel: VideoModelSpec;
  duration: number;
  aspectRatio: string;
}

export default function HookStudioPage() {
  const [selectedBrain, setSelectedBrain] = useState("kimi-k3-pro");
  const [selectedGenre, setSelectedGenre] = useState("cinematic");
  const [prompt, setPrompt] = useState("");
  const [longScript, setLongScript] = useState("");
  const [refImages, setRefImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");

  // UI States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [concepts, setConcepts] = useState<GeneratedHookConcept[]>([]);
  const [activeGeneratingId, setActiveGeneratingId] = useState<string | null>(null);

  // Advanced tweak drawer per concept
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});

  // Production Gallery
  const [history, setHistory] = useState<
    Array<{
      id: string;
      prompt: string;
      modelName: string;
      url?: string;
      date: string;
    }>
  >([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeBrain =
    LLM_BRAIN_MODELS.find((b) => b.id === selectedBrain) || LLM_BRAIN_MODELS[0];
  const activeGenre =
    HOOK_GENRES.find((g) => g.id === selectedGenre) || HOOK_GENRES[0];

  const handleAddImage = () => {
    if (!imageUrlInput.trim() || refImages.length >= 4) return;
    setRefImages([...refImages, imageUrlInput.trim()]);
    setImageUrlInput("");
  };

  const handleAnalyzeAndBuildHooks = async () => {
    if (!prompt.trim()) return;
    setIsAnalyzing(true);
    setThinkingStep(1);
    setConcepts([]);

    // Simulate real-time agent reasoning steps
    setTimeout(() => setThinkingStep(2), 1200);
    setTimeout(() => setThinkingStep(3), 2400);

    setTimeout(() => {
      const generated: GeneratedHookConcept[] = [
        {
          id: "hook-1",
          title: "الهوك الأول: الغموض البصري المفاجئ (Visual Mystery Hook)",
          genre: activeGenre.nameAr,
          script: `افتتاحية صامتة لمدة ثانية واحدة مع تركيز بؤري حاد، تليها عبارة: "${prompt.slice(0, 45)}..."`,
          visualPrompt: `Cinematic 4K shot of ${prompt}. Dramatic lighting, extreme camera zoom, depth of field, ${activeGenre.systemPromptAddon}`,
          recommendedModel: HOOK_VIDEO_MODELS[0], // Seedance 2.0 Pro
          duration: 5,
          aspectRatio: "9:16",
        },
        {
          id: "hook-2",
          title: "الهوك الثاني: الصدمة والتساؤل التشويقي (Shock & Curiosity)",
          genre: activeGenre.nameAr,
          script: `حركة كاميرا سريعة تركز على الانفعال البصري الأول، ثم تظهر جملة تساؤلية تجبر المشاهد على الاستمرار.`,
          visualPrompt: `High tension intense shot of ${prompt}. Dynamic camera movement, rich atmosphere, 8k resolution, ${activeGenre.systemPromptAddon}`,
          recommendedModel: HOOK_VIDEO_MODELS[4], // Kling 3.0 Pro
          duration: 5,
          aspectRatio: "9:16",
        },
        {
          id: "hook-3",
          title: "الهوك الثالث: القصة السينمائية السريعة (Fast Storyboard Hook)",
          genre: activeGenre.nameAr,
          script: `مشهد افتتاحي مصمم عبر GPT Image 2 ومتحرك بتقنية Seedance 2.0 لإبراز تفاصيل القصة بأعلى واقعية.`,
          visualPrompt: `Photorealistic cinematic master shot of ${prompt}. Detailed textures, volumetric lighting, epic framing`,
          recommendedModel: HOOK_VIDEO_MODELS[9], // GPT Image 2
          duration: 5,
          aspectRatio: "16:9",
        },
      ];
      setConcepts(generated);
      setIsAnalyzing(false);
      setThinkingStep(0);
    }, 3200);
  };

  const handleGenerateVideoForConcept = async (concept: GeneratedHookConcept) => {
    setActiveGeneratingId(concept.id);

    try {
      const res = await fetch("/api/hook-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: concept.visualPrompt,
          llmBrain: selectedBrain,
          genre: selectedGenre,
          modelId: concept.recommendedModel.id,
          duration: concept.duration,
          aspectRatio: concept.aspectRatio,
          quality: "pro",
          refImages,
          longScript,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const newEntry = {
          id: data.generationId || String(Date.now()),
          prompt: concept.script,
          modelName: concept.recommendedModel.name,
          url:
            data.mediaUrl ||
            "https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4",
          date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setHistory([newEntry, ...history]);
      }
    } catch (err) {
      console.error("Video generation error:", err);
    } finally {
      setActiveGeneratingId(null);
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 dir-rtl p-4 md:p-10 space-y-10 selection:bg-indigo-500 selection:text-white">
      {/* Agent Status Header */}
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/30 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Bot className="w-7 h-7 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-950 rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">وكيل الهوكات السينمائية (Hook AI Agent)</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                متصل وجاهز v2.5
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              صانع الهوكات الفيروسية الذكي: يستلم الفكرة والسكربت ويولد أفضل المقاطع السينمائية تلقائياً
            </p>
          </div>
        </div>

        {/* Brain Selector */}
        <div className="flex items-center gap-3 bg-slate-950/80 p-2 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium px-2">عقل الوكيل:</span>
          <div className="flex items-center gap-1.5">
            {LLM_BRAIN_MODELS.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBrain(b.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  selectedBrain === b.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                {b.id.includes("gpt") && <Bot className="w-3.5 h-3.5 text-emerald-400" />}
                {b.id.includes("kimi") && <Zap className="w-3.5 h-3.5 text-amber-400" />}
                {b.id.includes("gemini") && <Sparkles className="w-3.5 h-3.5 text-blue-400" />}
                {b.id.includes("claude") && <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />}
                <span>{b.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Agent Workspace Interface */}
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Interactive Prompt Card */}
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-2xl">
          {/* Genre Selection Chips */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-400" />
              <span>اختر النمط والجو البصري (Genre Vibe)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {HOOK_GENRES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGenre(g.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all border flex items-center gap-2 ${
                    selectedGenre === g.id
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/25"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  {g.id === "cinematic" && <Film className="w-3.5 h-3.5 text-amber-400" />}
                  {g.id === "drama" && <Clapperboard className="w-3.5 h-3.5 text-rose-400" />}
                  {g.id === "horror" && <Ghost className="w-3.5 h-3.5 text-purple-400" />}
                  {g.id === "romance" && <Heart className="w-3.5 h-3.5 text-pink-400" />}
                  {g.id === "action" && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                  {g.id === "scifi" && <Cpu className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{g.nameAr}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Textarea */}
          <div className="relative space-y-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="اكتب فكرة الفديو أو ما تريد إظهاره هنا... مثلاً: رجل يكتشف كتاباً مشعاً في مكتبة قديمة مهجورة بالليل..."
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-all resize-none shadow-inner"
            />

            {/* Attachments Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="+ رابط صورة مرجعية"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 w-48"
                  />
                  {imageUrlInput.trim() && (
                    <button
                      onClick={handleAddImage}
                      className="absolute left-1 top-1 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-lg"
                    >
                      إضافة
                    </button>
                  )}
                </div>

                {refImages.map((url, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] bg-slate-800 text-indigo-300 px-2.5 py-1 rounded-xl flex items-center gap-1 border border-slate-700"
                  >
                    <span>صورة {idx + 1}</span>
                    <button
                      onClick={() => setRefImages(refImages.filter((_, i) => i !== idx))}
                      className="text-rose-400 hover:text-rose-300 mr-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* Long Script Collapsible */}
              <button
                onClick={() => setLongScript(longScript ? "" : "سكربت...")}
                className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{longScript ? "إلغاء السكربت الطويل" : "+ إرفاق سكربت طويل"}</span>
              </button>
            </div>

            {longScript !== "" && (
              <textarea
                value={longScript}
                onChange={(e) => setLongScript(e.target.value)}
                placeholder="ألصق السكربت كاملاً ليقوم الوكيل بتحليله واستخراج الزوايا الفيروسية تلقائياً..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-none mt-2"
              />
            )}
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleAnalyzeAndBuildHooks}
            disabled={isAnalyzing || !prompt.trim()}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 text-sm"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>الوكيل يحلل القصة ويبني الهوكات الآن...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>استشارة وكيل الهوكات وتوليد الأفكار السينمائية 🚀</span>
              </>
            )}
          </button>
        </div>

        {/* Live Agent Reasoning Pipeline Stream */}
        {isAnalyzing && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl backdrop-blur-xl">
            <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-2">
              <Bot className="w-4 h-4 animate-spin" />
              <span>خطوات تفكير الوكيل (Agent Reasoning Stream):</span>
            </h4>
            <div className="space-y-3 text-xs">
              <div
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                  thinkingStep >= 1
                    ? "bg-indigo-950/40 border-indigo-500/60 text-indigo-200"
                    : "bg-slate-950 border-slate-800 text-slate-600"
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${thinkingStep >= 1 ? "text-indigo-400" : "text-slate-700"}`} />
                <span>1. تحليل القصة والسكربت عبر عقل <strong>{activeBrain.name}</strong> واستخراج الزاوية الفيروسية...</span>
              </div>

              <div
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                  thinkingStep >= 2
                    ? "bg-purple-950/40 border-purple-500/60 text-purple-200"
                    : "bg-slate-950 border-slate-800 text-slate-600"
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${thinkingStep >= 2 ? "text-purple-400" : "text-slate-700"}`} />
                <span>2. تخطيط الستوريبورد والإضاءة السينمائية لتهيئتها لـ <strong>GPT Image 2 & Seedance 2.0</strong>...</span>
              </div>

              <div
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                  thinkingStep >= 3
                    ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-200"
                    : "bg-slate-950 border-slate-800 text-slate-600"
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${thinkingStep >= 3 ? "text-emerald-400" : "text-slate-700"}`} />
                <span>3. اختيار أفضل موديلات التوليد تلقائياً وبناء 3 خيارات هوك ممتازة...</span>
              </div>
            </div>
          </div>
        )}

        {/* Generated Hook Concepts Output Cards */}
        {concepts.length > 0 && !isAnalyzing && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>اقتراحات الوكيل (اختر الهوك المناسب للتوليد):</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {concepts.map((concept) => {
                const isGeneratingThis = activeGeneratingId === concept.id;
                const isDrawerOpen = !!showAdvanced[concept.id];

                return (
                  <div
                    key={concept.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between hover:border-indigo-500/50 transition-all shadow-xl backdrop-blur-xl"
                  >
                    <div className="space-y-3">
                      <span className="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full inline-block">
                        {concept.title}
                      </span>

                      <p className="text-xs text-slate-200 leading-relaxed font-medium">
                        {concept.script}
                      </p>

                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-1">
                        <span className="text-[10px] text-slate-500 block">الموديل المقترح تلقائياً:</span>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                          <span>{concept.recommendedModel.name}</span>
                          <span className="text-indigo-400 font-mono text-[11px]">
                            {concept.recommendedModel.creditCost} كريدت
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Generate Action Button */}
                    <div className="space-y-3 pt-2">
                      <button
                        onClick={() => handleGenerateVideoForConcept(concept)}
                        disabled={isGeneratingThis}
                        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
                      >
                        {isGeneratingThis ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>جاري التوليد عبر الموديل...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>توليد فيديو الهوك الآن ({concept.recommendedModel.creditCost} كريدت)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Media Production Gallery */}
        {history.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
            <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Video className="w-5 h-5 text-indigo-400" />
              <span>معرض نتائج الهوكات (Production Gallery)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 overflow-hidden shadow-lg"
                >
                  <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
                    <video src={item.url} controls autoPlay loop muted className="w-full h-full object-cover" />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-200 line-clamp-2">{item.prompt}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-800">
                          {item.modelName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{item.date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyText(item.prompt, item.id)}
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
          </div>
        )}
      </div>
    </div>
  );
}
