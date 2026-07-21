"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import {
  Sparkles,
  Bot,
  User,
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
  Mic,
  FileVideo,
  X,
  Volume2,
  Image as ImageIcon,
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

  // Sidebar States (mapped from Figma)
  const [selectedVideoModel, setSelectedVideoModel] = useState("seedance-2.0-pro");
  const [selectedThinkingModel, setSelectedThinkingModel] = useState("kimi-k3-pro");
  const [selectedDuration, setSelectedDuration] = useState("15s");
  const [selectedRatio, setSelectedRatio] = useState("16:9");
  const [selectedQuality, setSelectedQuality] = useState("1080p");
  const [selectedGenre, setSelectedGenre] = useState("cinematic");
  const [selectedHookAngle, setSelectedHookAngle] = useState("curiosity");

  // Chat/Prompt States
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGeneratePreview, setShowGeneratePreview] = useState(true);

  // File/Attachment list mock
  const [attachments, setAttachments] = useState<Array<{ name: string; size: string }>>([
    { name: "0716.mp4", size: "12.4 MB" },
  ]);

  // Hook details values
  const activeVideoModelObj =
    HOOK_VIDEO_MODELS.find((m) => m.id === selectedVideoModel) || HOOK_VIDEO_MODELS[0];
  const activeGenreObj =
    HOOK_GENRES.find((g) => g.id === selectedGenre) || HOOK_GENRES[0];

  // Helper translations
  const t = {
    videoModel: isAr ? "نموذج الفيديو" : "VIDEO MODEL",
    thinkingModel: isAr ? "نموذج التفكير" : "THINKING MODEL",
    settings: isAr ? "الإعدادات" : "SETTINGS",
    duration: isAr ? "المدة" : "DURATION",
    ratio: isAr ? "الأبعاد" : "RATIO",
    quality: isAr ? "الجودة" : "QUALITY",
    genre: isAr ? "النوع" : "GENRE",
    hookAngle: isAr ? "زاوية الهوك" : "HOOK ANGLE",
    systemAgent: isAr ? "عميل النظام • نشط" : "SYSTEM AGENT • Active",
    welcomeText: isAr
      ? "مرحباً! أنا عميل هوك ستوديو. أرسل لي فكرة الفيديو وسأولد لك هوك احترافي. اختر الموديلات وحدد الإعدادات من الشريط الجانبي."
      : "Hello! I am Hook Studio Agent. Send me your video concept and I will generate a professional hook. Choose models and set options in the sidebar.",
    userPromptText: isAr
      ? "أريد هوك لفيديو عن منتج تقني جديد — سماعات ذكية بتقنية الذكاء الاصطناعي تتكيف مع مزاجك"
      : "I want a video hook for a new tech product — smart AI headphones that adapt to your mood",
    generatedHookHeader: isAr ? "🎬 الهوك المولد" : "🎬 Generated Video Hook",
    storyboardReady: isAr ? "● الاستوديو جاهز" : "● STORYBOARD READY",
    hookPhrase: isAr
      ? "\"ماذا لو أخبرتك أن سماعاتك تعرف مشاعرك قبل أن تعرفها أنت؟\""
      : "\"What if I told you your headphones know your feelings before you do?\"",
    angleLabel: isAr ? "الزاوية" : "ANGLE",
    genreLabel: isAr ? "النوع" : "GENRE",
    durationLabel: isAr ? "المدة" : "DURATION",
    angleVal: isAr ? "فجوة الفضول" : "Curiosity Gap",
    genreVal: isAr ? "سينمائي / تقني" : "Cinematic / Tech",
    durationVal: isAr ? "15 ثانية" : "15 seconds",
    scenesDesc: isAr
      ? "المشاهد جاهزة — تم إنشاء 4 مشاهد افتراضية. اضغط على توليد الفيديو للبدء."
      : "Storyboard ready — 4 scenes generated. Click Generate Video to render.",
    sceneText: isAr ? "مشهد" : "Scene",
    btnGenerate: isAr ? "توليد الفيديو" : "Generate Video",
    btnRegenerate: isAr ? "إعادة التوليد" : "Regenerate Hook",
    inputDropdown: isAr ? "اسأل هوك ستوديو" : "Ask Hook Studio",
    badgeInstant: isAr ? "فوري" : "Instant",
    inputPlaceholder: isAr ? "اسأل هوك ستوديو..." : "Ask Hook Studio...",
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  return (
    <div
      className={`h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden bg-[#0a0c10] text-[#e2e8f0] flex selection:bg-indigo-600 selection:text-white ${
        isAr ? "dir-rtl" : "dir-ltr"
      }`}
    >
      {/* Left / Center: Main Chat Workspace */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#090b0e]">
        {/* Scrollable Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800/80">
          {/* Message 1: Agent Welcome */}
          <div className="flex items-start gap-3.5 max-w-3xl">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="space-y-1.5">
              <div className="bg-[#121620] border border-slate-800/50 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-200 leading-relaxed shadow-sm">
                {t.welcomeText}
              </div>
              <span className="text-[10px] text-slate-500 font-medium px-1 uppercase tracking-wider block">
                {t.systemAgent}
              </span>
            </div>
          </div>

          {/* Message 2: User Prompt input mockup */}
          <div className="flex items-start justify-end gap-3.5 max-w-3xl ml-auto">
            <div className="space-y-1.5 text-right">
              <div className="bg-[#241a4a]/80 border border-purple-900/30 rounded-2xl rounded-tr-none p-3.5 text-xs text-purple-200 leading-relaxed shadow-sm">
                {t.userPromptText}
              </div>
            </div>
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
              U
            </div>
          </div>

          {/* Message 3: Generated Hook Card */}
          {showGeneratePreview && (
            <div className="flex items-start gap-3.5 max-w-3xl">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>

              {/* Advanced Figma Studio Card */}
              <div className="bg-[#11141d]/90 border border-slate-800/80 rounded-3xl p-5 space-y-4 shadow-2xl backdrop-blur-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white tracking-wide">
                    {t.generatedHookHeader}
                  </h3>
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {t.storyboardReady}
                  </span>
                </div>

                {/* Highlighted Hook text */}
                <div className="bg-[#080a0e] border border-slate-800/70 rounded-xl p-4 text-center font-bold text-sm md:text-base text-emerald-300 leading-relaxed shadow-inner">
                  {t.hookPhrase}
                </div>

                {/* Stats Table Grid */}
                <div className="grid grid-cols-3 gap-2 text-center bg-[#0d1017] border border-slate-800/60 rounded-xl p-3.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                      {t.angleLabel}
                    </span>
                    <span className="text-xs font-bold text-slate-200">{t.angleVal}</span>
                  </div>
                  <div className="border-x border-slate-800/60">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                      {t.genreLabel}
                    </span>
                    <span className="text-xs font-bold text-slate-200">{t.genreVal}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                      {t.durationLabel}
                    </span>
                    <span className="text-xs font-bold text-slate-200">{t.durationVal}</span>
                  </div>
                </div>

                {/* Desc */}
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t.scenesDesc}
                </p>

                {/* Figma Grid: 4 Generated Scenes thumbnails */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((num) => (
                    <div
                      key={num}
                      className="bg-[#080a0f] border border-slate-800 rounded-xl overflow-hidden group hover:border-indigo-500/50 transition-all shadow-md relative"
                    >
                      <div className="aspect-video w-full bg-slate-950 relative overflow-hidden">
                        <img
                          src={`/figma-scene-${num}.png`}
                          alt={`Scene ${num}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      <div className="p-2 text-center border-t border-slate-800/50">
                        <span className="text-[10px] font-bold text-slate-400">
                          {t.sceneText} {num}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions bottom row */}
                <div className="flex items-center gap-3 pt-2">
                  <button className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t.btnGenerate}</span>
                  </button>
                  <button className="flex-1 py-2.5 rounded-xl bg-[#1a1f2c] border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-2">
                    <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t.btnRegenerate}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Chat Input Bar Area */}
        <div className="p-4 md:p-6 bg-[#080a0e] border-t border-slate-900 flex-shrink-0 space-y-3">
          {/* Attachment list view */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="bg-[#121620] border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs shadow-sm"
                >
                  <FileVideo className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-slate-300 font-medium">{file.name}</span>
                  <span className="text-[10px] text-slate-500">({file.size})</span>
                  <button
                    onClick={() => handleRemoveAttachment(idx)}
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input control block */}
          <div className="bg-[#121620] border border-slate-800/80 rounded-2xl p-2 flex items-center justify-between gap-3 shadow-lg focus-within:border-indigo-500/70 transition-all">
            {/* Target Select with Instant Badge */}
            <div className="flex items-center gap-1.5 pl-2">
              <span className="text-xs font-bold text-slate-200">{t.inputDropdown}</span>
              <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                {t.badgeInstant}
              </span>
            </div>

            {/* Input field */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.inputPlaceholder}
              className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none py-1"
            />

            {/* Mic and Send actions */}
            <div className="flex items-center gap-2 pr-1">
              <button className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all">
                <Mic className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/10">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Settings Sidebar (Strictly styled according to Figma layout) */}
      <div className="w-80 border-l border-slate-800 bg-[#0b0e14] p-5 space-y-6 hidden md:block overflow-y-auto flex-shrink-0 scrollbar-thin">
        {/* Section: Video Model */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
            {t.videoModel}
          </label>
          <select
            value={selectedVideoModel}
            onChange={(e) => setSelectedVideoModel(e.target.value)}
            className="w-full bg-[#121620] text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
          >
            {HOOK_VIDEO_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Section: Thinking Model */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
            {t.thinkingModel}
          </label>
          <select
            value={selectedThinkingModel}
            onChange={(e) => setSelectedThinkingModel(e.target.value)}
            className="w-full bg-[#121620] text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
          >
            {LLM_BRAIN_MODELS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Section Separator: Settings */}
        <div className="pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">
            {t.settings}
          </span>

          <div className="space-y-4">
            {/* Duration */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                {t.duration}
              </label>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(e.target.value)}
                className="w-full bg-[#121620] text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                <option value="5s">5s</option>
                <option value="10s">10s</option>
                <option value="15s">15s</option>
              </select>
            </div>

            {/* Ratio */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                {t.ratio}
              </label>
              <select
                value={selectedRatio}
                onChange={(e) => setSelectedRatio(e.target.value)}
                className="w-full bg-[#121620] text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
              </select>
            </div>

            {/* Quality */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                {t.quality}
              </label>
              <select
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value)}
                className="w-full bg-[#121620] text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
                <option value="4k">4K</option>
              </select>
            </div>

            {/* Genre */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                {t.genre}
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full bg-[#121620] text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                {HOOK_GENRES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {isAr ? g.nameAr : g.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Hook Angle */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                {t.hookAngle}
              </label>
              <select
                value={selectedHookAngle}
                onChange={(e) => setSelectedHookAngle(e.target.value)}
                className="w-full bg-[#121620] text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                <option value="curiosity">{isAr ? "فجوة الفضول" : "Curiosity Gap"}</option>
                <option value="shock">{isAr ? "هوك الصدمة" : "Shock Hook"}</option>
                <option value="mystery">{isAr ? "الغموض البصري" : "Visual Mystery"}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
