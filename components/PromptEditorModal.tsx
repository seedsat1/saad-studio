"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Wand2,
  Dices,
  ArrowUp,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  Film,
  Image as ImageIcon,
  SendHorizontal,
  Bot,
  Zap,
} from "lucide-react";

interface PromptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt: string;
  onApply: (prompt: string) => void;
  mediaType?: "video" | "image";
  lang?: string;
}

interface CopilotMessage {
  id: string;
  sender: "user" | "copilot";
  text: string;
  timestamp: number;
}

export function PromptEditorModal({
  isOpen,
  onClose,
  initialPrompt,
  onApply,
  mediaType = "video",
  lang = "ar",
}: PromptEditorModalProps) {
  const isArabic = lang === "ar";
  const [draftPrompt, setDraftPrompt] = useState(initialPrompt || "");
  const [instruction, setInstruction] = useState("");
  const [loadingMode, setLoadingMode] = useState<"enhance" | "random" | "chat" | null>(null);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Sync draft prompt when modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftPrompt(initialPrompt || "");
      setErrorMsg(null);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialPrompt]);

  // Handle global keyboard shortcuts inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleApply();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, draftPrompt]);

  // Auto-scroll chat window
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, loadingMode]);

  const handleApply = () => {
    onApply(draftPrompt);
    onClose();
  };

  const handleCopy = async () => {
    if (!draftPrompt) return;
    try {
      await navigator.clipboard.writeText(draftPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const callCopilotApi = async (
    mode: "enhance" | "random" | "chat",
    customInstruction?: string
  ) => {
    setLoadingMode(mode);
    setErrorMsg(null);

    const userPromptPayload = draftPrompt.trim();
    const instPayload = (customInstruction ?? instruction).trim();

    if (mode === "chat" && instPayload) {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          sender: "user",
          text: instPayload,
          timestamp: Date.now(),
        },
      ]);
      setInstruction("");
    }

    try {
      const res = await fetch("/api/prompt/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPromptPayload,
          mode,
          instruction: instPayload,
          type: mediaType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.result) {
        throw new Error(data.error || "Failed to generate prompt");
      }

      const generated = data.result;
      setDraftPrompt(generated);

      let copilotFeedback = "";
      if (mode === "random") {
        copilotFeedback = isArabic
          ? "🪄 تم توليد وصف إبداعي جديد بالكامل:"
          : "🪄 Generated a fresh creative prompt:";
      } else if (mode === "enhance") {
        copilotFeedback = isArabic
          ? "✨ تم تحسين وتفصيل الوصف بإضافة المؤثرات والإضاءة وحركة الكاميرا:"
          : "✨ Enhanced prompt with cinematic lighting, camera motion, and texture:";
      } else {
        copilotFeedback = isArabic
          ? `💡 تم تطبيق التعديل: "${instPayload}"`
          : `💡 Applied adjustment: "${instPayload}"`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          sender: "copilot",
          text: `${copilotFeedback}\n\n${generated}`,
          timestamp: Date.now(),
        },
      ]);
    } catch (err: any) {
      const message = err?.message || (isArabic ? "حدث خطأ أثناء الاتصال بالمساعد الذكي" : "Failed to contact AI Copilot");
      setErrorMsg(message);
    } finally {
      setLoadingMode(null);
    }
  };

  const quickStyleTags = mediaType === "video"
    ? [
        { label: isArabic ? "🎥 زاوية درون ديناميكية" : "🎥 FPV Drone", val: "Add dynamic high-speed FPV drone flythrough with motion blur" },
        { label: isArabic ? "🌧️ ليل ممطر وسايبربانك" : "🌧️ Rainy Cyberpunk", val: "Set in a rainy cyberpunk metropolis at night with volumetric neon reflections" },
        { label: isArabic ? "🌅 إضاءة الساعة الذهبية" : "🌅 Golden Hour", val: "Bath the scene in warm cinematic golden hour sunlight with soft lens flares" },
        { label: isArabic ? "🎬 حركة كاميرا بطيئة 4K" : "🎬 Slow-Mo 4K", val: "Capture in ultra smooth 120fps slow-motion cinematic macro detail" },
      ]
    : [
        { label: isArabic ? "🎨 رسم فني زيتي غني" : "🎨 Oil Painting", val: "Render as a rich textured Renaissance oil painting with chiaroscuro lighting" },
        { label: isArabic ? "📸 تصوير ستوديو احترافي" : "📸 Studio Portrait", val: "85mm commercial studio photography, Rembrandt dual-softbox lighting, 8k" },
        { label: isArabic ? "✨ خيال علمي مستقبلي" : "✨ Sci-Fi Glow", val: "Futuristic sci-fi aesthetic with bioluminescent glow and raytraced reflections" },
        { label: isArabic ? "🌸 ألوان مائية حالمة" : "🌸 Dreamy Watercolor", val: "Dreamy ethereal pastel watercolor illustration with delicate splash splatters" },
      ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative z-10 flex flex-col w-full max-w-5xl h-[88vh] max-h-[760px] bg-[#121215] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-inner">
                  {mediaType === "video" ? <Film size={15} /> : <ImageIcon size={15} />}
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    {isArabic ? "محرر ومساعد الوصف الذكي" : "Prompt Editor"}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
                      Ctrl+E
                    </span>
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body - 2 Columns Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x lg:divide-white/10">
              
              {/* Left Column: Direct Textarea Editor (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col min-h-0 bg-[#0d0d10] p-4 sm:p-5">
                <div className="flex items-center justify-between pb-2 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    {isArabic ? "نص الوصف (Prompt)" : "Prompt Text"}
                  </span>
                  <div className="flex items-center gap-2">
                    {draftPrompt && (
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                        title={isArabic ? "نسخ النص" : "Copy text"}
                      >
                        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span className="text-[11px]">{copied ? (isArabic ? "تم النسخ" : "Copied") : (isArabic ? "نسخ" : "Copy")}</span>
                      </button>
                    )}
                    {draftPrompt && (
                      <button
                        type="button"
                        onClick={() => setDraftPrompt("")}
                        className="flex items-center gap-1 hover:text-red-400 transition-colors"
                        title={isArabic ? "مسح النص" : "Clear"}
                      >
                        <RotateCcw size={12} />
                        <span className="text-[11px]">{isArabic ? "مسح" : "Clear"}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 relative min-h-[220px]">
                  <textarea
                    ref={textareaRef}
                    value={draftPrompt}
                    onChange={(e) => setDraftPrompt(e.target.value)}
                    maxLength={2500}
                    placeholder={
                      mediaType === "video"
                        ? (isArabic ? "اكتب أو صف مشهد الفيديو الخاص بك بالتفصيل..." : "Describe your video...")
                        : (isArabic ? "اكتب أو صف الصورة المطلوبة بالتفصيل..." : "Describe your image...")
                    }
                    className="w-full h-full resize-none bg-black/40 border border-white/10 focus:border-cyan-500/50 rounded-xl p-4 text-sm text-white placeholder:text-slate-500 focus:outline-none leading-relaxed custom-scrollbar shadow-inner"
                  />
                  {loadingMode && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-xs rounded-xl flex items-center justify-center gap-2 text-cyan-300 text-sm font-medium animate-pulse">
                      <Loader2 size={18} className="animate-spin text-cyan-400" />
                      <span>{isArabic ? "جاري صياغة وتحسين الوصف بواسطة الذكاء الاصطناعي..." : "AI Copilot is composing your prompt..."}</span>
                    </div>
                  )}
                </div>

                {/* Character Counter */}
                <div className="flex items-center justify-between pt-2.5 text-[11px] text-slate-500">
                  <span>
                    {draftPrompt.length} / 2500 {isArabic ? "حرف" : "characters"}
                  </span>
                  {errorMsg && (
                    <span className="text-red-400 truncate max-w-[280px]">
                      {errorMsg}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Column: AI Prompt Copilot (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col min-h-0 bg-[#121217] p-4 sm:p-5">
                {/* Copilot Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      <Sparkles size={13} />
                    </div>
                    <span className="text-xs font-bold text-slate-200">
                      {isArabic ? "مساعد الذكاء الاصطناعي (AI Copilot)" : "AI Copilot"}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Gemini Flash
                  </span>
                </div>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-2 gap-2 py-3">
                  <button
                    type="button"
                    disabled={!!loadingMode}
                    onClick={() => callCopilotApi("random")}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/10 text-slate-200 hover:text-white text-xs font-medium transition-all disabled:opacity-50"
                  >
                    {loadingMode === "random" ? (
                      <Loader2 size={13} className="animate-spin text-cyan-400" />
                    ) : (
                      <Dices size={13} className="text-pink-400" />
                    )}
                    <span>{isArabic ? "وصف عشوائي" : "Random prompt"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!!loadingMode || !draftPrompt.trim()}
                    onClick={() => callCopilotApi("enhance")}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500/15 to-cyan-500/15 hover:from-purple-500/25 hover:to-cyan-500/25 active:scale-[0.98] border border-purple-500/30 text-purple-200 hover:text-white text-xs font-semibold transition-all disabled:opacity-40"
                  >
                    {loadingMode === "enhance" ? (
                      <Loader2 size={13} className="animate-spin text-purple-400" />
                    ) : (
                      <Wand2 size={13} className="text-cyan-300" />
                    )}
                    <span>{isArabic ? "تحسين تلقائي" : "Auto prompt"}</span>
                  </button>
                </div>

                {/* Interactive Chat / Suggestion Stream */}
                <div
                  ref={chatScrollRef}
                  className="flex-1 overflow-y-auto min-h-[140px] space-y-2.5 pr-1 text-xs custom-scrollbar"
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 space-y-2.5">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                        <Bot size={20} />
                      </div>
                      <p className="text-xs font-medium text-slate-400 max-w-[240px]">
                        {isArabic
                          ? "اسألني أي شيء لتطوير وصفك أو اختر من الأفكار السريعة أدناه"
                          : "Ask me anything about your prompt or pick a style tag below"}
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl border leading-relaxed ${
                          m.sender === "user"
                            ? "bg-white/5 border-white/10 text-slate-200 ml-6"
                            : "bg-purple-950/20 border-purple-500/20 text-purple-100 mr-2"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 font-semibold text-[10px] text-slate-400">
                          {m.sender === "user" ? (
                            <span>{isArabic ? "طلبك" : "You"}</span>
                          ) : (
                            <span className="text-purple-400 flex items-center gap-1">
                              <Sparkles size={11} />
                              {isArabic ? "المساعد الذكي" : "AI Copilot"}
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick Style Chips */}
                <div className="pt-2 pb-2">
                  <div className="flex flex-wrap gap-1.5">
                    {quickStyleTags.map((tag, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={!!loadingMode}
                        onClick={() => callCopilotApi("chat", tag.val)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 hover:text-white transition-colors"
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instruction Input at Bottom */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (instruction.trim() && !loadingMode) {
                      callCopilotApi("chat");
                    }
                  }}
                  className="relative pt-1"
                >
                  <input
                    type="text"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    disabled={!!loadingMode}
                    placeholder={
                      isArabic
                        ? "صف فكرتك أو التعديل المطلوب..."
                        : "Describe your creative idea..."
                    }
                    className="w-full bg-black/50 border border-white/15 focus:border-purple-500/50 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-all shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={!instruction.trim() || !!loadingMode}
                    className="absolute right-1.5 top-2.5 w-7 h-7 rounded-lg bg-white/10 hover:bg-purple-600 disabled:opacity-30 disabled:hover:bg-white/10 text-white flex items-center justify-center transition-all"
                    aria-label="Send"
                  >
                    {loadingMode === "chat" ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <ArrowUp size={14} />
                    )}
                  </button>
                </form>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/10 bg-white/[0.02]">
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                <Zap size={13} className="text-amber-400" />
                <span>
                  {isArabic
                    ? "اضغط Ctrl+Enter لتطبيق الوصف فوراً"
                    : "Press Ctrl+Enter to apply prompt directly"}
                </span>
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>

                <button
                  type="button"
                  onClick={handleApply}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] shadow-lg shadow-blue-500/20 border border-blue-400/30 transition-all"
                >
                  <Check size={14} strokeWidth={2.5} />
                  <span>{isArabic ? "تطبيق الوصف" : "Apply prompt"}</span>
                </button>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
