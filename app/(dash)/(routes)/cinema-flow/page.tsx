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
import { normalizeMediaUrl } from "@/lib/storage";

interface CharacterRecord {
  id: string;
  name: string;
  description: string;
  coverUrl: string | null;
  status: string;
  createdAt: string;
}

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
  
  // Characters library states
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  const [activeCharacter, setActiveCharacter] = useState<CharacterRecord | null>(null);
  const [activeImageReference, setActiveImageReference] = useState<MediaAsset | null>(null);

  // Interactive controls states
  const [filterModel, setFilterModel] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filterOpen, setFilterOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [gridColumns, setGridColumns] = useState<3 | 4>(4);
  const [showPromptsOnHover, setShowPromptsOnHover] = useState(true);

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [selectedImageModel, setSelectedImageModel] = useState("nano-banana-2-lite");
  const [selectedVideoModel, setSelectedVideoModel] = useState("google/gemini-omni-flash");
  const [videoDuration, setVideoDuration] = useState<number>(10);
  const [videoQuality, setVideoQuality] = useState<string>("1080p");
  const [modelSettingsOpen, setModelSettingsOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("1:1");

  // Layout states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch user characters
  const loadCharacters = async () => {
    try {
      setLoadingCharacters(true);
      const res = await fetch("/api/characters", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setCharacters(data);
      }
    } catch (err) {
      console.error("Failed to load characters in Cinema Flow", err);
    } finally {
      setLoadingCharacters(false);
    }
  };

  // Delete gallery asset
  const handleDeleteAsset = async (id: string) => {
    try {
      const res = await fetch("/api/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setAssets(prev => prev.filter(asset => asset.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to delete asset.");
      }
    } catch (err) {
      console.error("Error deleting asset:", err);
      alert("Error deleting asset.");
    }
  };

  // Delete character record
  const handleDeleteCharacter = async (id: string) => {
    try {
      const res = await fetch(`/api/characters/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCharacters(prev => prev.filter(c => c.id !== id));
        if (activeCharacter?.id === id) {
          setActiveCharacter(null);
        }
      } else {
        alert("Failed to delete character.");
      }
    } catch (err) {
      console.error("Error deleting character:", err);
      alert("Error deleting character.");
    }
  };

  const handleFileSelection = async (file: File) => {
    const fileName = file.name.toLowerCase();
    const isImageOrVideo = file.type.startsWith("image/") || 
                            file.type.startsWith("video/") ||
                            fileName.endsWith(".heic") ||
                            fileName.endsWith(".heif") ||
                            fileName.endsWith(".png") ||
                            fileName.endsWith(".jpg") ||
                            fileName.endsWith(".jpeg") ||
                            fileName.endsWith(".webp") ||
                            fileName.endsWith(".gif") ||
                            fileName.endsWith(".mp4") ||
                            fileName.endsWith(".mov") ||
                            fileName.endsWith(".webm") ||
                            fileName.endsWith(".m4v");

    if (!isImageOrVideo) {
      alert("Please select or drop an image or video file.");
      return;
    }

    try {
      setUploadingFile(true);

      const formData = new FormData();
      formData.append("file", file);

      // Upload to generic local R2 storage endpoint
      const uploadRes = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage");
      }

      const uploadData = await uploadRes.json();
      const publicUrl = uploadData.publicUrl;

      if (!publicUrl) {
        throw new Error("Upload response did not contain publicUrl");
      }

      // Save to database gallery using our POST endpoint
      const saveRes = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: publicUrl,
          filename: file.name,
          mimeType: file.type || "image/png",
        }),
      });

      if (saveRes.ok) {
        const saveData = await saveRes.json();
        if (saveData.asset) {
          // Add to local state
          setAssets(prev => [saveData.asset, ...prev]);
          // Set as active reference
          setActiveImageReference(saveData.asset);
          setActiveCharacter(null);
        }
      } else {
        const tempAsset = {
          id: Math.random().toString(),
          url: publicUrl,
          type: (file.type || "").startsWith("video") ? "video" : "image",
          prompt: file.name,
        };
        setActiveImageReference(tempAsset as any);
        setActiveCharacter(null);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload file.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);

    // 1. Check if dropped files (e.g. from local computer)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleFileSelection(file);
      return;
    }

    // 2. Check if dropped serialized asset from gallery
    const draggedAssetData = e.dataTransfer.getData("text/plain");
    if (draggedAssetData) {
      try {
        const asset = JSON.parse(draggedAssetData);
        if (asset && asset.url) {
          if (asset.coverUrl !== undefined) {
            setActiveCharacter(asset);
            setActiveImageReference(null);
          } else {
            setActiveImageReference(asset);
            setActiveCharacter(null);
          }
        }
      } catch (_) {}
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleFileSelection(file);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Direct download failed, opening in new tab instead:", error);
      window.open(url, "_blank");
    }
  };

  useEffect(() => {
    loadAssets();
    loadCharacters();
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

  // Filtered and sorted assets based on activeTab, searchQuery, filterModel and sortOrder
  const filteredAssets = assets
    .filter((asset) => {
      const matchesSearch = asset.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            asset.model?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter by model engine
      if (filterModel !== "all") {
        const matchesModel = asset.model?.toLowerCase().includes(filterModel.toLowerCase());
        if (!matchesModel) return false;
      }

      if (activeTab === "all") return matchesSearch;
      if (activeTab === "image") return asset.type === "image" && matchesSearch;
      if (activeTab === "video") return asset.type === "video" && matchesSearch;
      if (activeTab === "character") return asset.model?.toLowerCase().includes("character") && matchesSearch;
      if (activeTab === "upload") return asset.model?.toLowerCase() === "upload" && matchesSearch;
      return matchesSearch;
    })
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
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

    if (activeImageReference) {
      userMsg.assetUrl = activeImageReference.url;
      userMsg.assetType = "image";
    } else if (activeCharacter) {
      userMsg.assetUrl = normalizeMediaUrl(activeCharacter.coverUrl) || undefined;
      userMsg.assetType = "image";
    }

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setInputText("");
    setActiveImageReference(null);
    setActiveCharacter(null);

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
        text: "Sorry, you don't have enough credits to run this model."
      }]);
      setIsAgentTyping(false);
      return;
    }

    const modelLabel = activeCharacter 
      ? "Gemini 3 Pro Character Identity" 
      : (selectedImageModel === "nano-banana-2-lite" ? "Gemini 3.1 Flash Lite" : "Gemini 3.1 Flash");

    setChatMessages(prev => [...prev, {
      id: Math.random().toString(),
      sender: "agent",
      text: "جاري التوليد... يرجى الانتظار.",
      isGenerating: true
    }]);

    try {
      let res;
      let finalPrompt = promptText;

      // If ordinary image reference is selected, append reference image details to prompt
      if (activeImageReference?.url) {
        finalPrompt = `${promptText}\n\n[Reference Image: ${activeImageReference.url}]`;
      }

      if (activeCharacter) {
        // Route generation to Character Studio generation endpoint
        res = await fetch(`/api/characters/${activeCharacter.id}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: finalPrompt,
            size: "1024*1024",
            modelId: "gemini-3-pro-image-preview",
            aspect_ratio: aspectRatio,
            quality: "1K",
            style: "Auto",
            rendering_speed: "Quality"
          })
        });
      } else {
        // Standard image generation endpoint
        res = await fetch("/api/generate/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: finalPrompt,
            modelId: selectedImageModel,
            aspectRatio,
            numImages: 1
          })
        });
      }

      const data = await res.json().catch(() => ({}));
      const imageUrl = data.imageUrl || (Array.isArray(data.imageUrls) ? data.imageUrls[0] : null);

      if (!res.ok || !imageUrl) {
        throw new Error(data.error ?? "Failed to generate image.");
      }

      // Add to store
      addAsset({
        type: "image",
        url: imageUrl,
        prompt: finalPrompt,
        model: activeCharacter ? "Gemini 3 Pro Character" : selectedImageModel,
      });

      // Update local state
      const newAsset: MediaAsset = {
        id: data.generationId || Math.random().toString(),
        type: "image",
        url: imageUrl,
        prompt: finalPrompt,
        model: activeCharacter ? `Character: ${activeCharacter.name}` : selectedImageModel,
        date: "Today",
        createdAt: new Date().toISOString()
      };

      setAssets(prev => [newAsset, ...prev]);

      // Add success message
      setChatMessages(prev => {
        const filtered = prev.filter(m => !m.isGenerating);
        return [...filtered, {
          id: Math.random().toString(),
          sender: "agent",
          text: "تم التوليد بنجاح! تم حفظ الصورة في معرض أعمالك.",
          assetUrl: imageUrl,
          assetType: "image"
        }];
      });

    } catch (err: any) {
      setChatMessages(prev => {
        const filtered = prev.filter(m => !m.isGenerating);
        return [...filtered, {
          id: Math.random().toString(),
          sender: "agent",
          text: `Generation failed: ${err.message}`
        }];
      });
    } finally {
      setIsAgentTyping(false);
    }
  };

  // Trigger Google Video Generation
  const executeVideoGeneration = async (promptText: string) => {
    // Dynamic cost calculation based on model and duration
    let rate = 2.0; // Default (Gemini Omni Flash)
    let modelName = "Gemini Omni Flash";

    if (selectedVideoModel.includes("kling")) {
      rate = 2.5;
      modelName = "Kling 3.0 Pro";
    } else if (selectedVideoModel === "bytedance/seedance-v2/text-to-video") {
      rate = 4.5333;
      modelName = "Seedance 2.0";
    } else if (selectedVideoModel === "bytedance/seedance-v2/text-to-video-mini") {
      rate = 2.5333;
      modelName = "Seedance 2.0 Mini";
    } else if (selectedVideoModel === "bytedance/seedance-v2/text-to-video-fast") {
      rate = 6.0;
      modelName = "Seedance 2.0 Fast";
    }

    const cost = Number((rate * videoDuration).toFixed(2));
    const passed = await guardGeneration("video", cost);
    if (!passed) {
      setChatMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: "agent",
        text: "Sorry, you don't have enough credits to run this model."
      }]);
      setIsAgentTyping(false);
      return;
    }

    setChatMessages(prev => [...prev, {
      id: Math.random().toString(),
      sender: "agent",
      text: "جاري التوليد... يرجى الانتظار.",
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
            duration: videoDuration,
            aspectRatio: aspectRatio,
            resolution: videoQuality
          }
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.taskId) {
        throw new Error(data.error ?? "Failed to generate video.");
      }

      // Start polling
      startPollingVideo(data.taskId, promptText);

    } catch (err: any) {
      setChatMessages(prev => {
        const filtered = prev.filter(m => !m.isGenerating);
        return [...filtered, {
          id: Math.random().toString(),
          sender: "agent",
          text: `Generation failed: ${err.message}`
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
          throw new Error(data.error ?? "Failed to generate video.");
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
            date: "Today",
            createdAt: new Date().toISOString()
          };

          setAssets(prev => [newAsset, ...prev]);

          setChatMessages(prev => {
            const filtered = prev.filter(m => !m.isGenerating);
            return [...filtered, {
              id: Math.random().toString(),
              sender: "agent",
              text: "تم التوليد بنجاح! تم حفظ الفيديو في معرض أعمالك.",
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
            text: `Generation failed: ${err.message}`
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
              <span className="text-xs font-bold tracking-wider text-violet-400 flex items-center gap-1.5">
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
                      background: isActive ? "rgba(139,92,246,0.1)" : "transparent",
                      color: isActive ? "#a78bfa" : "#94a3b8"
                    }}
                  >
                    <TabIcon size={15} className={isActive ? "text-violet-400" : "text-zinc-500"} />
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
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/40 text-xs focus:outline-none text-zinc-200"
            />
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Sliders (Filter) Button */}
            <div className="relative">
              <button 
                onClick={() => setFilterOpen(!filterOpen)}
                className={`p-2 rounded-lg border text-zinc-400 hover:text-white hover:bg-white/5 transition-all ${filterOpen ? 'bg-violet-500/20 border-violet-500/40 text-violet-400' : 'bg-white/[0.03] border-white/5'}`}
                title="تصفية وترتيب المعرض"
              >
                <Sliders size={14} />
              </button>

              {filterOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl p-3 shadow-xl z-20 flex flex-col gap-2.5">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">الترتيب الزمني</div>
                  <div className="flex bg-white/[0.03] rounded-lg p-0.5 border border-white/5">
                    <button 
                      onClick={() => setSortOrder("newest")}
                      className={`flex-1 text-[10px] py-1 rounded-md transition-all ${sortOrder === "newest" ? 'bg-violet-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                    >
                      الأحدث أولاً
                    </button>
                    <button 
                      onClick={() => setSortOrder("oldest")}
                      className={`flex-1 text-[10px] py-1 rounded-md transition-all ${sortOrder === "oldest" ? 'bg-violet-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                    >
                      الأقدم أولاً
                    </button>
                  </div>

                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1">تصفية حسب النموذج</div>
                  <select
                    value={filterModel}
                    onChange={(e) => setFilterModel(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/5 rounded-lg px-2 py-1.5 text-[10px] text-zinc-200 focus:outline-none"
                  >
                    <option value="all">جميع النماذج</option>
                    <option value="nano-banana">Nano Banana</option>
                    <option value="gemini-omni-flash">Gemini Video</option>
                  </select>
                </div>
              )}
            </div>

            {/* Help Button */}
            <button 
              onClick={() => setHelpModalOpen(true)}
              className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5"
              title="دليل مساحة العمل"
            >
              <HelpCircle size={14} />
            </button>

            {/* Settings Button */}
            <button 
              onClick={() => setSettingsModalOpen(true)}
              className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5"
              title="إعدادات مساحة العمل"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        {/* Media Grid Container */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "character" ? (
            /* Character library list view */
            loadingCharacters ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
                <span className="text-xs">Loading characters library...</span>
              </div>
            ) : characters.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2 text-center">
                <Users className="h-10 w-10 text-zinc-700 stroke-[1.5]" />
                <div>
                  <p className="text-xs font-semibold text-zinc-400">No Character Identities Found</p>
                  <p className="text-[10px] text-zinc-600 mt-1 max-w-xs">
                    You have not created any characters yet. Go to <a href="/character" className="text-violet-400 underline">Character Studio</a> to create persistent identities.
                  </p>
                </div>
              </div>
            ) : (
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${gridColumns === 4 ? 'xl:grid-cols-4' : ''} gap-4`}>
                {characters.map((character) => (
                  <div
                    key={character.id}
                    draggable={true}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify(character))}
                    className="group relative rounded-xl overflow-hidden border border-white/5 hover:border-violet-500/30 bg-[#0e0e11] transition-all aspect-square flex flex-col justify-between"
                  >
                    {/* Character avatar */}
                    <div className="flex-1 overflow-hidden relative bg-black flex items-center justify-center">
                      {character.coverUrl ? (
                        <img
                          src={normalizeMediaUrl(character.coverUrl)}
                          alt={character.name}
                          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-700 bg-black/40"><Users className="h-9 w-9" /></div>
                      )}

                      {/* Character actions overlay */}
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all p-3 flex flex-col justify-between">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to delete ${character.name}?`)) {
                                await handleDeleteCharacter(character.id);
                              }
                            }}
                            className="p-1 rounded bg-red-500/80 hover:bg-red-500 text-white transition-all"
                            title="Delete identity"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                            {character.description || "Persistent character identity."}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCharacter(character);
                              setActiveImageReference(null);
                            }}
                            className="w-full py-1 rounded bg-violet-600 hover:bg-violet-700 text-white font-bold text-[10px] transition-all"
                          >
                            Use as Reference
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Character footer */}
                    <div className="flex-shrink-0 p-2.5 border-t border-white/5 bg-zinc-950/60 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-200 font-bold truncate">
                        {character.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-mono">
                        {character.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Standard media assets list view */
            loadingAssets ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
                <span className="text-xs">Loading media gallery...</span>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2 text-center">
                <ImageIcon className="h-10 w-10 text-zinc-700 stroke-[1.5]" />
                <div>
                  <p className="text-xs font-semibold text-zinc-400">No Media Found</p>
                  <p className="text-[10px] text-zinc-600 mt-1 max-w-xs">
                    No images or videos match the current filters. Start chatting with the agent on the right to generate your first asset!
                  </p>
                </div>
              </div>
            ) : (
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${gridColumns === 4 ? 'xl:grid-cols-4' : ''} gap-4`}>
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    draggable={true}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify(asset))}
                    className="group relative rounded-xl overflow-hidden border border-white/5 hover:border-violet-500/30 bg-[#0e0e11] cursor-pointer transition-all aspect-square flex flex-col justify-between"
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

                      {/* Action hover overlay with Ref & Delete buttons */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all p-3 flex flex-col justify-between">
                        <div className="flex justify-end gap-1.5">
                          {asset.type === "image" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveImageReference(asset);
                                setActiveCharacter(null);
                              }}
                              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold transition-all"
                              title="Use as character style/subject reference"
                            >
                              Use as Ref
                            </button>
                          )}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm("Are you sure you want to delete this asset?")) {
                                await handleDeleteAsset(asset.id);
                              }
                            }}
                            className="p-1 rounded bg-red-500/80 hover:bg-red-500 text-white transition-all animate-fade-in"
                            title="Delete asset"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {showPromptsOnHover && (
                          <p className="text-[10px] text-zinc-200 line-clamp-2 leading-relaxed mt-auto">
                            {asset.prompt}
                          </p>
                        )}
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
            )
          )}
        </div>

        {/* Bottom disclaimer */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-white/5 text-[10px] text-zinc-600 bg-zinc-950/40">
          Cinema Flow can make mistakes, so double check it
        </div>
      </div>

      {/* 3. Right Panel - AI Chat Agent */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="w-[380px] flex-shrink-0 border-l border-white/5 bg-[#0e0e11] flex flex-col overflow-hidden relative"
      >
        <AnimatePresence>
          {(isDraggingOver || uploadingFile) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-violet-500/40 m-2 rounded-xl pointer-events-none"
            >
              <div className="h-16 w-16 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20 mb-4 animate-bounce">
                {uploadingFile ? <Loader2 className="h-8 w-8 animate-spin" /> : <Paperclip className="h-8 w-8" />}
              </div>
              <p className="text-sm font-bold text-zinc-200">
                {uploadingFile ? "Uploading media..." : "Drop to Attach Reference"}
              </p>
              <p className="text-xs text-zinc-500 mt-1.5">
                Drop your image, video, or character here to use as reference.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        
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
                  {/* Message Text Bubble */}
                  {msg.text && (
                    <div
                      className={`rounded-2xl p-3 text-xs leading-relaxed ${
                        msg.sender === "user" 
                          ? "bg-violet-600 text-white rounded-br-none" 
                          : "bg-white/[0.04] border border-white/5 text-zinc-200 rounded-bl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}

                  {/* standalone attachment card (no text container background framing) */}
                  {msg.assetUrl && (
                    <div 
                      className="rounded-xl overflow-hidden border border-white/10 aspect-video bg-black flex items-center justify-center relative w-72 max-w-full shadow-lg cursor-pointer hover:border-violet-500/50 transition group"
                      onClick={() => {
                        setActiveImageReference({
                          id: msg.id,
                          url: msg.assetUrl!,
                          type: msg.assetType === "video" ? "video" : "image",
                          prompt: msg.text || "Chat generated reference",
                          createdAt: new Date().toISOString()
                        } as any);
                        setActiveCharacter(null);
                      }}
                      title="تعيين كصورة مرجعية"
                    >
                      {msg.assetType === "video" ? (
                        <video src={msg.assetUrl} controls className="w-full h-full object-cover" />
                      ) : (
                        <img src={msg.assetUrl} alt="Chat attachment" className="w-full h-full object-cover" />
                      )}
                      {/* Hover overlay indicator */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-medium gap-1 pointer-events-none">
                        <Sparkles size={12} className="text-violet-400 animate-pulse" />
                        <span>استخدام كصورة مرجعية</span>
                      </div>
                    </div>
                  )}
                  
                  <span className="text-[9px] text-zinc-500 px-1">
                    {msg.sender === "user" ? "You" : "Cinema Flow Agent"}
                  </span>
                </div>
              ))}

              {/* Loading Agent Typing state */}
              {isAgentTyping && (
                <div className="flex flex-col gap-1.5 max-w-[85%] self-start items-start">
                  <div className="rounded-2xl p-3 bg-white/[0.04] border border-white/5 flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin text-violet-400" />
                    <span className="text-[11px] text-zinc-400">Agent is typing...</span>
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
                <span className="text-xs font-bold text-zinc-200">Active Model Settings</span>
                <button onClick={() => setModelSettingsOpen(false)} className="text-zinc-500 hover:text-white">
                  <X size={12} />
                </button>
              </div>

              {/* Image model selection */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500">Image Engine</span>
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
                <span className="text-[10px] text-zinc-500">Video Engine</span>
                <select
                  value={selectedVideoModel}
                  onChange={(e) => setSelectedVideoModel(e.target.value)}
                  className="bg-white/[0.04] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="google/gemini-omni-flash">Gemini Omni Flash</option>
                  <option value="kwaivgi/kling-v3.0-pro/text-to-video">Kling 3.0 Pro</option>
                  <option value="bytedance/seedance-v2/text-to-video">Seedance 2.0</option>
                  <option value="bytedance/seedance-v2/text-to-video-mini">Seedance 2.0 Mini</option>
                  <option value="bytedance/seedance-v2/text-to-video-fast">Seedance 2.0 Fast</option>
                </select>
              </div>

              {/* Video Duration selection */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500">Video Duration</span>
                <select
                  value={videoDuration}
                  onChange={(e) => setVideoDuration(Number(e.target.value))}
                  className="bg-white/[0.04] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="5">5 seconds</option>
                  <option value="10">10 seconds</option>
                  <option value="15">15 seconds</option>
                </select>
              </div>

              {/* Video Quality selection */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500">Video Quality</span>
                <select
                  value={videoQuality}
                  onChange={(e) => setVideoQuality(e.target.value)}
                  className="bg-white/[0.04] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="720p">720p (Standard)</option>
                  <option value="1080p">1080p (High)</option>
                  <option value="4k">4K (Ultra)</option>
                </select>
              </div>

              {/* Aspect Ratio */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500">Aspect Ratio</span>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="bg-white/[0.04] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="1:1">1:1 (Square)</option>
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="9:16">9:16 (Portrait)</option>
                  <option value="4:3">4:3 (Academy)</option>
                  <option value="3:4">3:4 (Vertical Photo)</option>
                  <option value="21:9">21:9 (Cinematic Widescreen)</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat input box */}
        <div className="flex-shrink-0 p-4 border-t border-white/5 bg-zinc-950/20">
          {/* Active Reference Badges */}
          {(activeCharacter || activeImageReference) && (
            <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-white/5">
              {activeCharacter && (
                <div className="relative group/ref rounded-xl overflow-hidden border border-white/10 aspect-square w-16 bg-black flex items-center justify-center shadow-lg">
                  {activeCharacter.coverUrl ? (
                    <img src={normalizeMediaUrl(activeCharacter.coverUrl)} alt={activeCharacter.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-zinc-500"><Users size={16} /></div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-center text-white truncate px-1 py-0.5 font-bold">
                    {activeCharacter.name}
                  </div>
                  <button 
                    onClick={() => setActiveCharacter(null)} 
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
              {activeImageReference && (
                <div className="relative group/ref rounded-xl overflow-hidden border border-white/10 aspect-video w-24 bg-black flex items-center justify-center shadow-lg">
                  {activeImageReference.type === "video" ? (
                    <video src={activeImageReference.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={activeImageReference.url} alt="Attached reference" className="w-full h-full object-cover" />
                  )}
                  <button 
                    onClick={() => setActiveImageReference(null)} 
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>
          )}

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
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="image/*,video/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-white"
                  title="Add source"
                >
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
                  className="rounded-lg p-1 bg-violet-600 hover:bg-violet-700 text-white transition-all"
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
                  Model: <span className="font-mono text-violet-400">{selectedAsset.model || "Nano Banana"}</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(selectedAsset.url, selectedAsset.prompt || "asset")}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 transition-all"
                  >
                    <Download size={13} />
                    Download File
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <AnimatePresence>
        {helpModalOpen && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-8 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0e0e11] border border-white/10 rounded-2xl max-w-lg w-full overflow-hidden flex flex-col p-6 gap-4"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <HelpCircle className="text-violet-400" size={16} />
                  Workspace Guide — Cinema Flow
                </span>
                <button onClick={() => setHelpModalOpen(false)} className="text-zinc-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="text-xs text-zinc-400 leading-relaxed flex flex-col gap-3">
                <p>
                  Welcome to <strong>Cinema Flow</strong>! This is your ultimate AI-driven creative workspace powered by Google.
                </p>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col gap-2 text-[11px]">
                  <span className="font-bold text-violet-400">💡 How to Start?</span>
                  <span>Chat with the agent on the right; it will refine prompts and trigger models automatically.</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col gap-2 text-[11px]">
                  <span className="font-bold text-violet-400">🖼️ Image Generation:</span>
                  <span>Triggers when you ask for an image, costing 0.40 to 0.60 credits.</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col gap-2 text-[11px]">
                  <span className="font-bold text-violet-400">🎬 Video Generation:</span>
                  <span>Triggers when you ask for a video (10s clip) via Gemini Omni Flash, costing 30.0 credits.</span>
                </div>
              </div>

              <button
                onClick={() => setHelpModalOpen(false)}
                className="w-full py-2 bg-violet-600 hover:bg-violet-700 rounded-xl text-xs font-bold text-white transition-all mt-2"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {settingsModalOpen && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-8 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0e0e11] border border-white/10 rounded-2xl max-w-md w-full overflow-hidden flex flex-col p-6 gap-4"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <Settings className="text-violet-400" size={16} />
                  Workspace Settings
                </span>
                <button onClick={() => setSettingsModalOpen(false)} className="text-zinc-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {/* Grid layout settings */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-zinc-400 font-bold">Gallery Layout</span>
                  <div className="flex bg-white/[0.03] rounded-lg p-0.5 border border-white/5">
                    <button 
                      onClick={() => setGridColumns(4)}
                      className={`flex-1 text-[11px] py-1.5 rounded-md transition-all ${gridColumns === 4 ? 'bg-violet-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                    >
                      Compact (4 columns)
                    </button>
                    <button 
                      onClick={() => setGridColumns(3)}
                      className={`flex-1 text-[11px] py-1.5 rounded-md transition-all ${gridColumns === 3 ? 'bg-violet-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                    >
                      Comfortable (3 columns)
                    </button>
                  </div>
                </div>

                {/* Show details on hover */}
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-zinc-400">Show prompt descriptions on hover</span>
                  <input
                    type="checkbox"
                    checked={showPromptsOnHover}
                    onChange={(e) => setShowPromptsOnHover(e.target.checked)}
                    className="w-4 h-4 rounded accent-violet-600 cursor-pointer"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 mt-2">
                  <button
                    onClick={() => {
                      loadAssets();
                      setSettingsModalOpen(false);
                    }}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold text-zinc-200 transition-all"
                  >
                    Sync & Refresh Media Library
                  </button>
                  
                  <button
                    onClick={() => {
                      setChatMessages([]);
                      setSettingsModalOpen(false);
                    }}
                    className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 transition-all"
                  >
                    Clear Current Agent Chat Session
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSettingsModalOpen(false)}
                className="w-full py-2 bg-violet-600 hover:bg-violet-700 rounded-xl text-xs font-bold text-white transition-all mt-2"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
