"use client";

import { useState } from "react";
import { X, Sparkles, Send, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfluencerAssistantSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand?: (command: string) => void;
}

export function InfluencerAssistantSidebar({ isOpen, onClose, onExecuteCommand }: InfluencerAssistantSidebarProps) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    {
      role: "assistant",
      text: "أهلاً بك! كيف يمكنني المساعدة؟ صف ما تريد وسأقوم بإنشاء العقدة المناسبة وتوليدها - أو اسألني أي شيء عن المؤثرين لديك، أو لوحتك، أو النموذج الذي يناسب مهمتك.",
    },
  ]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!prompt.trim()) return;
    const text = prompt.trim();
    setMessages((prev) => [...prev, { role: "user", text }]);
    setPrompt("");

    if (onExecuteCommand) {
      onExecuteCommand(text);
    }

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `تم استلام أمرك: "${text}". جارٍ معالجة التوليد وبناء العقدة المناسبة في الكانفاس...`,
        },
      ]);
    }, 600);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 sm:w-96 bg-[#0c0d16]/95 border-r sm:border-l border-pink-500/30 shadow-2xl backdrop-blur-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="h-16 px-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
          <span>مساعد الذكاء الاصطناعي</span>
          <Sparkles size={16} className="text-pink-400 animate-pulse" />
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-right scrollbar-none">
        <div className="flex flex-col items-center justify-center pt-6 pb-2 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 shadow-lg shadow-pink-500/20">
            <div className="w-full h-full bg-[#0c0d16] rounded-[14px] flex items-center justify-center text-pink-400">
              <Sparkles size={28} />
            </div>
          </div>
          <h4 className="text-white font-bold text-base">كيف يمكنني المساعدة؟</h4>
          <p className="text-xs text-zinc-400 leading-relaxed text-center px-2">
            صف ما تريد وسأقوم بإنشاء العقدة المناسبة وتوليدها - أو اسألني أي شيء عن المؤثرين لديك، أو لوحتك، أو النموذج الذي يناسب مهمة معينة.
          </p>
        </div>

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "p-3.5 rounded-2xl text-xs leading-relaxed max-w-[90%]",
              msg.role === "user"
                ? "mr-auto bg-purple-600/20 text-purple-200 border border-purple-500/30 text-left dir-ltr"
                : "ml-auto bg-white/5 text-zinc-200 border border-white/10 dir-rtl"
            )}
          >
            {msg.text}
          </div>
        ))}
      </div>

      {/* Footer Input Box matching screenshot 3 100% */}
      <div className="p-4 border-t border-white/10 bg-white/[0.01]">
        <div className="relative flex items-center bg-[#07080f] border border-pink-500/40 rounded-xl p-1 shadow-inner focus-within:border-pink-500">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="...صف ما تريد إنشاءه"
            className="w-full bg-transparent px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none text-right dir-rtl"
          />
          <button
            onClick={handleSend}
            disabled={!prompt.trim()}
            className="p-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-30 transition shrink-0"
          >
            <Send size={14} className="rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
}
