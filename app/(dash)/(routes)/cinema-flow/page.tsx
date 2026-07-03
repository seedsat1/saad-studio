"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Sliders, Play, Plus, HelpCircle, Settings, X, Edit,
  Send, Sparkles, AlertCircle, Loader2, Image as ImageIcon,
  Film, Trash2, Users, Layers, Download, CheckCircle, Lightbulb,
  Sprout, BookOpen, Paperclip, ChevronLeft, ChevronRight
} from "lucide-react";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { useAssetStore } from "@/hooks/use-asset-store";

interface MediaAsset {
  id: string;
  type: "image" | "video" | string;
  url?: string;
  prompt?: string;
  model?: string;
  createdAt?: string;
  date?: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  isGenerating?: boolean;
  assetUrl?: string;
  assetType?: "image" | "video";
}

export default function CinemaFlowPage() {
  const { user } = useUser();
  const { guardGeneration } = useGenerationGate();
  const { addAsset } = useAssetStore();
  const firstName = user?.firstName ?? "Ellen";

  // Gallery states
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "image" | "video" | "character" | "scene" | "upload">("all");
  
  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [selectedImageModel, setSelectedImageModel] = useState("nano-banana-2-lite");
  const [selectedVideoModel, setSelectedVideoModel] = useState("google/gemini-omni-flash");
  const [modelSettingsOpen, setModelSettingsOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("1:1");

  // Layout states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user assets on load
  const loadAssets = async () => {
    try {
      setLoadingAssets(true);
      const res = await fetch("/api/assets");
      const data = await res.json();
      if (Array.isArray(data)) {
        setAssets(data);
      } else if (data && Array.isArray(data.assets)) {
        setAssets(data.assets);
      }
    } catch (err) {
      console.error("Failed to load assets in Cinema Flow", err);
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isAgentTyping]);

  // Tab configurations
  const tabs = [
    { id: "all", label: "All Media", icon: Layers },
    { id: "image", label: "Images", icon: ImageIcon },
    { id: "video", label: "Videos", icon: Film },
    { id: "character", label: "Characters", icon: Users },
    { id: "scene", label: "Scenes", icon: Layers },
    { id: "upload", label: "Uploads", icon: Paperclip },
  ];

  // Filtered assets based on activeTab and searchQuery
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.model?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "image") return asset.type === "image" && matchesSearch;
    if (activeTab === "video") return asset.type === "video" && matchesSearch;
    if (activeTab === "character") return asset.model?.toLowerCase().includes("character") && matchesSearch;
    return matchesSearch; // Fallback
  });

  // Suggestion actions
  const handleSuggestionClick = (type: "brainstorm" | "started" | "capabilities") => {
    if (type === "brainstorm") {
      sendChatMessage("ساعدني في العصف الذهني لفكرة إعلان مبتكر وجذاب!");
    } else if (type === "started") {
      sendChatMessage("كيف يمكنني البدء في إنشاء وتعديل وسائط إبداعية هنا؟");
    } else {
      sendChatMessage("ما هي النماذج والأدوات الإبداعية التي تدعمها في Cinema Flow؟");
    }
  };

  // Chat submit
  const sendChatMessage = async (text: string) => {
    if (!text.trim()) return;

    // 1. Add User Message
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text: text.trim(),
    };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setInputText("");

    // 2. Set Agent Typing state
    setIsAgentTyping(true);

    try {
      // Send chat history to backend Gemini API
      const chatRes = await fetch("/api/cinema-flow/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const chatData = await chatRes.json();
      if (!chatRes.ok || !chatData.text) {
        throw new Error(chatData.error ?? "فشل الاتصال بمساعد السينما الذكي.");
      }

      const replyText = chatData.text;

      if (replyText.startsWith("IMAGE_GEN:")) {
        const refinedPrompt = replyText.replace("IMAGE_GEN:", "").trim();
        await executeImageGeneration(refinedPrompt);
      } else if (replyText.startsWith("VIDEO_GEN:")) {
        const refinedPrompt = replyText.replace("VIDEO_GEN:", "").trim();
        await executeVideoGeneration(refinedPrompt);
      } else {
        // Normal conversational reply
        setChatMessages(prev => [...prev, {
          id: Math.random().toString(),
          sender: "agent",
          text: replyText
        }]);
        setIsAgentTyping(false);
      }
    } catch (err: any) {
      setChatMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: "agent",
        text: `حدث خطأ أثناء معالجة الطلب: ${err.message}`
      }]);
      setIsAgentTyping(false);
    }
  };

  // Trigger Google Image Generation
  const executeImageGeneration = async (promptText: string) => {
    // Deduct standard credits
    const cost = selectedImageModel === "nano-banana-2-lite" ? 0.40 : 0.60;
    const passed = await guardGeneration("image", cost);
    if (!passed) {
      setChatMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: "agent",
        text: "عذراً، رصيدك غير كافٍ لتشغيل نموذج التوليد الحالي."
      }]);
      setIsAgentTyping(false);
      return;
    }

    setChatMessages(prev => [...prev, {
      id: Math.random().toString(),
      sender: "agent",
      text: `جاري تشغيل نموذج الصور (${selectedImageModel === "nano-banana-2-lite" ? "Gemini 3.1 Flash Lite" : "Gemini 3.1 Flash"}) لتوليد اللقطة... يرجى الانتظار.`,
      isGenerating: true
    }]);

    try {
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          modelId: selectedImageModel,
          aspectRatio,
          numImages: 1
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error ?? "فشل توليد الصورة.");
      }

      // Add to store
      addAsset({
        type: "image",
        url: data.imageUrl,
        prompt: promptText,
        model: selectedImageModel,
      });

      // Update local state
      const newAsset: MediaAsset = {
        id: data.generationId || Math.random().toString(),
        type: "image",
        url: data.imageUrl,
        prompt: promptText,
        model: selectedImageModel,
        date: "Today"
      };

      setAssets(prev => [newAsset, ...prev]);

      // Add success message
      setChatMessages(prev => {
        // Remove generating indicator and replace
        const filtered = prev.filter(m => !m.isGenerating);
        return [...filtered, {
          id: Math.random().toString(),
          sender: "agent",
          text: "رائع! تم توليد الصورة بنجاح وتحديث معرض الوسائط الوسطى.",
          assetUrl: data.imageUrl,
          assetType: "image"
        }];
      });

    } catch (err: any) {
      setChatMessages(prev => {
        const filtered = prev.filter(m => !m.isGenerating);
        return [...filtered, {
          id: Math.random().toString(),
          sender: "agent",
          text: `فشل التوليد: ${err.message}`
        }];
      });
    } finally {
      setIsAgentTyping(false);
    }
  };

  // Trigger Google Video Generation
  const executeVideoGeneration = async (promptText: string) => {
    const cost = 30.0; // Standard 10 seconds Gemini Omni Flash cost
    const passed = await guardGeneration("video", cost);
    if (!passed) {
      setChatMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: "agent",
        text: "عذراً، رصيدك غير كافٍ لتشغيل نموذج التوليد الحالي."
      }]);
      setIsAgentTyping(false);
      return;
    }

    setChatMessages(prev => [...prev, {
      id: Math.random().toString(),
      sender: "agent",
      text: "جاري تشغيل محرك الفيديو Gemini Omni Flash لتوليد اللقطة المطلوبة (10 ثوانٍ)...",
      isGenerating: true
    }]);

    try {
      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelRoute: selectedVideoModel,
          payload: {
            prompt: promptText,
            duration: 10,
            aspectRatio: "16:9"
          }
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.taskId) {
        throw new Error(data.error ?? "فشل توليد الفيديو.");
      }

      // Start polling
      startPollingVideo(data.taskId, promptText);

    } catch (err: any) {
      setChatMessages(prev => {
        const filtered = prev.filter(m => !m.isGenerating);
        return [...filtered, {
          id: Math.random().toString(),
          sender: "agent",
          text: `فشل التوليد: ${err.message}`
        }];
      });
      setIsAgentTyping(false);
    }
  };

  // Poll video status
  const startPollingVideo = (taskId: string, promptText: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    const check = async () => {
      try {
        const res = await fetch(`/api/video?taskId=${encodeURIComponent(taskId)}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok || data.status === "failed") {
          throw new Error(data.error ?? "فشل طلب التوليد.");
        }

        if (data.status === "completed" && data.outputs?.[0]) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          
          addAsset({
            type: "video",
            url: data.outputs[0],
            prompt: promptText,
            model: "Gemini Omni Flash",
            duration: "10s",
            providerRequestId: taskId
          });

          const newAsset: MediaAsset = {
            id: taskId,
            type: "video",
            url: data.outputs[0],
            prompt: promptText,
            model: "Gemini Omni Flash",
            date: "Today"
          };

          setAssets(prev => [newAsset, ...prev]);

          setChatMessages(prev => {
            const filtered = prev.filter(m => !m.isGenerating);
            return [...filtered, {
              id: Math.random().toString(),
              sender: "agent",
              text: "تم بنجاح توليد الفيديو الإبداعي وتحديث المعرض السحابي الوسطي!",
              assetUrl: data.outputs[0],
              assetType: "video"
            }];
          });
          setIsAgentTyping(false);
        }
      } catch (err: any) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setChatMessages(prev => {
          const filtered = prev.filter(m => !m.isGenerating);
          return [...filtered, {
            id: Math.random().toString(),
            sender: "agent",
            text: `فشل أثناء المتابعة: ${err.message}`
          }];
        });
        setIsAgentTyping(false);
      }
    };

    pollIntervalRef.current = setInterval(check, 4000);
  };

  return (
    <div 
      className="flex-1 flex bg-[#09090b] text-white overflow-hidden font-sans"
      style={{ height: "calc(100vh - 56px)" }}
    >
      
      {/* 1. Left Sidebar - Asset Controls */}
      <div 
        className="flex-shrink-0 border-r border-white/5 bg-[#0e0e11]/80 flex flex-col justify-between transition-all duration-300"
        style={{ width: isSidebarCollapsed ? 64 : 240 }}
      >
        <div className="p-4 flex flex-col gap-6">
          {/* Logo / Header */}
          <div className="flex items-center justify-between">
            {!isSidebarCollapsed && (
              <span className="text-xs font-bold tracking-wider text-orange-400 flex items-center gap-1.5">
                <Sparkles size={14} />
                CINEMA FLOW
              </span>
            )}
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-white"
            >
              {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {/* Navigation Menu */}
          <ul className="flex flex-col gap-1">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id as any)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: isActive ? "rgba(249,115,22,0.1)" : "transparent",
                      color: isActive ? "#fb923c" : "#94a3b8"
                    }}
                  >
                    <TabIcon size={15} className={isActive ? "text-orange-400" : "text-zinc-500"} />
                    {!isSidebarCollapsed && <span>{tab.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer controls */}
        <div className="p-4 flex flex-col gap-2">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-white hover:bg-white/5">
            <Trash2 size={15} />
            {!isSidebarCollapsed && <span>Trash</span>}
          </button>
        </div>
      </div>

      {/* 2. Center Panel - Media Grid */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#09090b]">
        {/* Top bar with Search & Filter */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 focus:border-orange-500/40 text-xs focus:outline-none text-zinc-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5">
              <Sliders size={14} />
            </button>
            <button className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5">
              <HelpCircle size={14} />
            </button>
            <button className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5">
              <Settings size={14} />
            </button>
          </div>
        </div>

        {/* Media Grid Container */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingAssets ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
              <span className="text-xs">جاري تحميل معرض الوسائط...</span>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2 text-center">
              <ImageIcon className="h-10 w-10 text-zinc-700 stroke-[1.5]" />
              <div>
                <p className="text-xs font-semibold text-zinc-400">لا توجد وسائط</p>
                <p className="text-[10px] text-zinc-600 mt-1 max-w-xs">
                  لم نجد أي صور أو فيديوهات تطابق الفلتر الحالي. ابدأ المحادثة مع الإيجنت على اليمين لتوليد أول وسائطك!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className="group relative rounded-xl overflow-hidden border border-white/5 hover:border-orange-500/30 bg-[#0e0e11] cursor-pointer transition-all aspect-square flex flex-col justify-between"
                >
                  {/* Media Content */}
                  <div className="flex-1 overflow-hidden relative bg-black flex items-center justify-center">
                    {asset.type === "video" ? (
                      <>
                        <video src={asset.url} className="w-full h-full object-cover" muted />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-all">
                          <div className="rounded-full p-2 bg-black/50 text-white ring-1 ring-white/20">
                            <Play size={16} fill="white" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <img
                        src={asset.url}
                        alt={asset.prompt}
                        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}

                    {/* Action hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all p-3 flex flex-col justify-end">
                      <p className="text-[10px] text-zinc-200 line-clamp-2 leading-relaxed">
                        {asset.prompt}
                      </p>
                    </div>
                  </div>

                  {/* Asset Footer metadata */}
                  <div className="flex-shrink-0 p-2.5 border-t border-white/5 bg-zinc-950/60 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[120px]">
                      {asset.model || "Nano Banana"}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-500">
                      {asset.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom disclaimer */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-white/5 text-[10px] text-zinc-600 bg-zinc-950/40">
          Cinema Flow can make mistakes, so double check it
        </div>
      </div>

      {/* 3. Right Panel - AI Chat Agent */}
      <div className="w-[380px] flex-shrink-0 border-l border-white/5 bg-[#0e0e11] flex flex-col overflow-hidden relative">
        
        {/* Chat Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Edit size={12} className="text-zinc-500" />
            <span className="text-xs font-bold text-zinc-200">Untitled session</span>
          </div>
          <button className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-white">
            <X size={14} />
          </button>
        </div>

        {/* Message feed or Welcome state */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {chatMessages.length === 0 ? (
            /* Welcome / Initial suggestions screen */
            <div className="flex-1 flex flex-col justify-center gap-6 py-10">
              <div>
                <h2 className="text-lg font-bold text-zinc-100">Hi {firstName}</h2>
                <p className="text-sm font-medium text-zinc-500 mt-1">What would you like to do?</p>
              </div>

              {/* Suggestions Cards */}
              <div className="flex flex-col gap-2.5">
                <button 
                  onClick={() => handleSuggestionClick("brainstorm")}
                  className="w-full flex items-center gap-4 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] text-left transition-all group"
                >
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-all">
                    <Lightbulb size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-200 leading-tight">Brainstorm with me</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">خطط لأفكار وسيناريوهات إبداعية</p>
                  </div>
                </button>

                <button 
                  onClick={() => handleSuggestionClick("started")}
                  className="w-full flex items-center gap-4 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] text-left transition-all group"
                >
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-all">
                    <Sprout size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-200 leading-tight">How do I get started?</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">تعرف على خطوات التوليد البسيطة</p>
                  </div>
                </button>

                <button 
                  onClick={() => handleSuggestionClick("capabilities")}
                  className="w-full flex items-center gap-4 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] text-left transition-all group"
                >
                  <div className="h-9 w-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition-all">
                    <BookOpen size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-200 leading-tight">Teach me about what you can do</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">استكشف النماذج والقدرات المتاحة</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Chat feed history */
            <div className="flex flex-col gap-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-1.5 max-w-[85%] ${msg.sender === "user" ? "self-end items-end" : "self-start items-start"}`}
                >
                  <div
                    className={`rounded-2xl p-3 text-xs leading-relaxed ${
                      msg.sender === "user" 
                        ? "bg-orange-500 text-white rounded-br-none" 
                        : "bg-white/[0.04] border border-white/5 text-zinc-200 rounded-bl-none"
                    }`}
                  >
                    {msg.text}

                    {/* Integrated dynamic generated media preview in chat */}
                    {msg.assetUrl && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-white/10 aspect-video bg-black flex items-center justify-center relative">
                        {msg.assetType === "video" ? (
                          <video src={msg.assetUrl} controls className="w-full h-full object-cover" />
                        ) : (
                          <img src={msg.assetUrl} alt="Generated output" className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  <span className="text-[9px] text-zinc-500 px-1">
                    {msg.sender === "user" ? "You" : "Cinema Flow Agent"}
                  </span>
                </div>
              ))}

              {/* Loading Agent Typing state */}
              {isAgentTyping && (
                <div className="flex flex-col gap-1.5 max-w-[85%] self-start items-start">
                  <div className="rounded-2xl p-3 bg-white/[0.04] border border-white/5 flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin text-orange-400" />
                    <span className="text-[11px] text-zinc-400">جاري الكتابة والتوليد...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Model Parameter drawer toggle */}
        <AnimatePresence>
          {modelSettingsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-[80px] left-4 right-4 bg-zinc-900 border border-white/10 rounded-2xl p-4 shadow-xl z-10 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-zinc-200">إعدادات النماذج النشطة</span>
                <button onClick={() => setModelSettingsOpen(false)} className="text-zinc-500 hover:text-white">
                  <X size={12} />
                </button>
              </div>

              {/* Image model selection */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500">محرك الصور (Image Engine)</span>
                <select
                  value={selectedImageModel}
                  onChange={(e) => setSelectedImageModel(e.target.value)}
                  className="bg-white/[0.04] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="nano-banana-2-lite">Nano Banana 2 Lite (Fastest)</option>
                  <option value="nano-banana-2">Nano Banana 2 (4K)</option>
                  <option value="nano-banana-pro">Nano Banana Pro</option>
                </select>
              </div>

              {/* Video model selection */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500">محرك الفيديو (Video Engine)</span>
                <select
                  value={selectedVideoModel}
                  onChange={(e) => setSelectedVideoModel(e.target.value)}
                  className="bg-white/[0.04] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                  disabled
                >
                  <option value="google/gemini-omni-flash">Gemini Omni Flash (10s)</option>
                </select>
              </div>

              {/* Aspect Ratio */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500">أبعاد الصورة (Aspect Ratio)</span>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="bg-white/[0.04] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="1:1">1:1 (مربع)</option>
                  <option value="16:9">16:9 (عريض)</option>
                  <option value="9:16">9:16 (عمودي)</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat input box */}
        <div className="flex-shrink-0 p-4 border-t border-white/5 bg-zinc-950/20">
          <div className="relative rounded-2xl bg-white/[0.03] border border-white/5 p-2 flex flex-col gap-1.5">
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage(inputText);
                }
              }}
              placeholder="What do you want to create?"
              className="w-full bg-transparent p-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
            />

            <div className="flex items-center justify-between border-t border-white/5 pt-2 px-1">
              <div className="flex items-center gap-2">
                <button className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-white" title="Add source">
                  <Plus size={14} />
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <button 
                  onClick={() => setModelSettingsOpen(!modelSettingsOpen)}
                  className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-white" 
                  title="Parameters"
                >
                  <Sliders size={14} />
                </button>
                <button
                  onClick={() => sendChatMessage(inputText)}
                  className="rounded-lg p-1 bg-orange-500 hover:bg-orange-600 text-white transition-all"
                >
                  <Send size={12} fill="white" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Asset Preview Modal overlay */}
      <AnimatePresence>
        {selectedAsset && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-8 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0e0e11] border border-white/10 rounded-2xl max-w-3xl w-full overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <span className="text-xs font-bold text-zinc-200 truncate max-w-md">
                  {selectedAsset.prompt}
                </span>
                <button 
                  onClick={() => setSelectedAsset(null)}
                  className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Media content */}
              <div className="flex-1 bg-black overflow-hidden flex items-center justify-center aspect-video max-h-[500px]">
                {selectedAsset.type === "video" ? (
                  <video src={selectedAsset.url} controls autoPlay loop className="w-full h-full object-contain" />
                ) : (
                  <img src={selectedAsset.url} alt={selectedAsset.prompt} className="w-full h-full object-contain" />
                )}
              </div>

              {/* Modal Footer actions */}
              <div className="px-5 py-4 border-t border-white/5 bg-zinc-950/60 flex items-center justify-between">
                <span className="text-[10px] text-zinc-400">
                  Model: <span className="font-mono text-orange-400">{selectedAsset.model || "Nano Banana"}</span>
                </span>

                <div className="flex items-center gap-2">
                  <a
                    href={selectedAsset.url}
                    download="asset"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 transition-all"
                  >
                    <Download size={13} />
                    Download File
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
