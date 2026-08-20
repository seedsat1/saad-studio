"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  Share2,
  Bot,
  Wand2,
  Sparkles,
  Send,
  Loader2,
  Image as ImageIcon,
  Upload,
  Copy,
  Check,
  Languages,
  Trash2,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Hash,
  Eye,
  Edit3,
  Flame,
  CheckCircle2,
  AlertCircle,
  Settings,
  History,
  CheckCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  SocialMediaPostRecord,
  SocialAccountsConfig,
  SocialPlatformType,
  PlatformContentItem,
} from "@/lib/social-media";

const DEFAULT_POST: SocialMediaPostRecord = {
  id: "draft_init",
  topicPrompt: "إطلاق الميزات والنماذج الإبداعية الجديدة في منصة سعد ستوديو",
  language: "ar",
  imageModel: "nano-banana-pro",
  imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80",
  status: "draft",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  platforms: {
    twitter: {
      platform: "twitter",
      content: "🔥 نقلة نوعية في الذكاء الاصطناعي الإبداعي! أطلقنا أحدث النماذج فائقة الواقعية في منصة سعد ستوديو مع معالجة سينمائية بدقة 4K في ثوانٍ.\n\nجرّب الآن واستمتع بتجربة إبداعية لا مثيل لها: https://saadstudio.app",
      hashtags: ["#سعد_ستوديو", "#ذكاء_اصطناعي", "#SaadStudio", "#AIArt"],
      charCount: 220,
    },
    instagram: {
      platform: "instagram",
      content: "✨ صمم أعمالك السينمائية والفنية بالذكاء الاصطناعي كما لم ترها من قبل!\n\nيسرنا الإعلان عن ترقية محركات التوليد على منصة سعد ستوديو بدقة 4K فائقة وتحكم كامل في الإضاءة والألوان.\n\n💡 اكتشف الأدوات الجديدة الآن.\n🔗 الرابط في البايو!",
      hashtags: ["#سعد_ستوديو", "#تصميم_بالذكاء_الاصطناعي", "#إبداع", "#SaadStudio", "#GenerativeAI", "#Midjourney", "#Flux"],
      charCount: 240,
    },
    linkedin: {
      platform: "linkedin",
      content: "يسعدنا أن نعلن عن إطلاق حزمة ميزات وتحديثات جديدة في منصة Saad Studio لتمكين صناع المحتوى والوكالات الإبداعية.\n\n📌 أبرز الميزات:\n• دقة 4K سينمائية فائقة وتماسك بصري كامل.\n• استوديو توليد الفيديو وتحرير الصوت المتكامل.\n• تسريع وتيرة الإنتاج وتقليل وقت المعالجة.\n\nاكتشف الإمكانيات الكاملة عبر: https://saadstudio.app",
      hashtags: ["#SaadStudio", "#ArtificialIntelligence", "#GenerativeAI", "#TechInnovation"],
      charCount: 310,
    },
    telegram: {
      platform: "telegram",
      content: "🚀 *تحديث رسمي من سعد ستوديو*\n\nيسعدنا إطلاق نماذج التوليد الجديدة بدقة 4K ومعالجة لحظية لكافة مشاريعك الفنية والسينمائية!\n\n🔗 *جرب التحديث الجديد الآن:*\n[دخول المنصة](https://saadstudio.app)",
      hashtags: ["#سعد_ستوديو", "#تحديث"],
      charCount: 160,
    },
    tiktok: {
      platform: "tiktok",
      content: "🎬 فكرة سيناريو فيديو قصير (15-30 ثانية):\n\n[المشهد 1 (0-3s)]: لقطة خاطفة لنتيجة سينمائية خرافية 4K.\n[المشهد 2 (3-12s)]: تصوير شاشة سريع لكتابة البرومبت في سعد ستوديو والضغط على توليد.\n[المشهد 3 (12-25s)]: استعراض تفاصيل الصورة والإضاءة المذهلة.\n[الصوت]: تعليق صوتي يحث المتابعين على تجربة المنصة مجاناً عبر الرابط في البايو.",
      hashtags: ["#fyp", "#viral", "#saadstudio", "#ai_tools"],
      charCount: 280,
    },
  },
};

export default function AdminSocialMediaPage() {
  const [activeTab, setActiveTab] = useState<"agent" | "history" | "config">("agent");
  const [activePlatform, setActivePlatform] = useState<SocialPlatformType>("twitter");
  const [selectedLanguage, setSelectedLanguage] = useState<"ar" | "en">("ar");
  const [selectedMediaType, setSelectedMediaType] = useState<"image" | "video">("image");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<"1:1" | "9:16" | "16:9" | "4:5">("16:9");
  const [selectedImageModel, setSelectedImageModel] = useState<"nano-banana-pro" | "gpt-image-2">("nano-banana-pro");
  const [selectedVideoModel, setSelectedVideoModel] = useState<"google-omni-veo" | "kling-video" | "seedance-video">("google-omni-veo");

  // Agent states
  const [agentPrompt, setAgentPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingImg, setGeneratingImg] = useState(false);
  const [generatingVid, setGeneratingVid] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [currentPost, setCurrentPost] = useState<SocialMediaPostRecord>(DEFAULT_POST);
  const [customImgPrompt, setCustomImgPrompt] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // History & Config states
  const [postsHistory, setPostsHistory] = useState<SocialMediaPostRecord[]>([]);
  const [config, setConfig] = useState<SocialAccountsConfig>({});
  const [loadingData, setLoadingData] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/admin/social-media");
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.posts)) setPostsHistory(data.posts);
        if (data.config) setConfig(data.config);
      }
    } catch {
      // Gracefully handle
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleGenerate = async (promptToUse?: string) => {
    const p = promptToUse || agentPrompt;
    if (!p.trim()) return;

    setGenerating(true);
    setPublishResult(null);
    try {
      const res = await fetch("/api/admin/social-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          prompt: p.trim(),
          language: selectedLanguage,
          imageModel: selectedImageModel,
          aspectRatio: selectedAspectRatio,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.post) {
        setCurrentPost(data.post);
        await fetchData();
      } else {
        alert(data.error || "Failed to generate social media content");
      }
    } catch (e) {
      alert("Error generating content: " + String(e));
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateImageOnly = async () => {
    const p = customImgPrompt.trim() || currentPost.topicPrompt || agentPrompt.trim() || "Cinematic futuristic creative AI visual art masterpiece 8k";
    setGeneratingImg(true);
    try {
      const res = await fetch("/api/admin/social-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_image",
          prompt: p,
          model: selectedImageModel,
          aspectRatio: selectedAspectRatio,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.imageUrl) {
        setCurrentPost((prev) => ({ ...prev, imageUrl: data.imageUrl, mediaType: "image", aspectRatio: selectedAspectRatio, imageModel: selectedImageModel }));
        setCustomImgPrompt("");
      } else {
        alert(data?.error || "تعذر توليد الصورة، يرجى المحاولة مجدداً.");
      }
    } catch (e) {
      alert("Error generating image: " + String(e));
    } finally {
      setGeneratingImg(false);
    }
  };

  const handleGenerateVideoOnly = async () => {
    const p = customImgPrompt.trim() || currentPost.topicPrompt || agentPrompt.trim() || "Cinematic futuristic high resolution AI motion video 4k";
    setGeneratingVid(true);
    try {
      const res = await fetch("/api/admin/social-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_video",
          prompt: p,
          model: selectedVideoModel,
          aspectRatio: selectedAspectRatio,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.videoUrl) {
        setCurrentPost((prev) => ({ ...prev, videoUrl: data.videoUrl, mediaType: "video", aspectRatio: selectedAspectRatio, videoModel: selectedVideoModel }));
        setCustomImgPrompt("");
      } else {
        alert(data?.error || "تعذر توليد الفيديو، يرجى المحاولة مجدداً.");
      }
    } catch (e) {
      alert("Error generating video: " + String(e));
    } finally {
      setGeneratingVid(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assetType", "image");

      const res = await fetch("/api/studio/upload-url", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const { publicUrl } = await res.json();
        if (publicUrl) {
          setCurrentPost((prev) => ({ ...prev, imageUrl: publicUrl }));
        }
      }
    } catch {
      alert("Upload failed");
    } finally {
      setUploadingImg(false);
    }
  };

  const handleCopyPlatformContent = (platform: SocialPlatformType) => {
    const pData = currentPost.platforms[platform];
    if (!pData) return;
    const textToCopy = `${pData.content}\n\n${(pData.hashtags || []).join(" ")}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedKey(platform);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handlePublishDirect = async (platform: "facebook" | "buffer" | "telegram" | "discord" | "all") => {
    setPublishing(true);
    setPublishResult(null);
    try {
      const res = await fetch("/api/admin/social-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          post: currentPost,
          platform,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setPublishResult("تم نشر المحتوى بنجاح إلى القنوات المستهدفة! ✨");
        await fetchData();
      } else {
        setPublishResult("فشل في النشر: " + (data?.error || "تأكد من إعداد مفاتيح القنوات"));
      }
    } catch (e) {
      setPublishResult("خطأ في الاتصال: " + String(e));
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch("/api/admin/social-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_config",
          config,
        }),
      });
      if (res.ok) {
        alert("تم حفظ إعدادات وقنوات السوشيال ميديا بنجاح! ✅");
      }
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنشور؟")) return;
    try {
      const res = await fetch(`/api/admin/social-media?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPostsHistory((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      alert("Failed to delete");
    }
  };

  const currentPlatformData = currentPost.platforms[activePlatform] || {
    platform: activePlatform,
    content: "",
    hashtags: [],
    charCount: 0,
  };

  return (
    <AdminShell activeRoute="/admin/social-media">
      <div className="p-4 md:p-8 space-y-6 w-full max-w-[1920px] mx-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Share2 className="w-6 h-6 text-cyan-400" />
              <span>Social Media AI Agent & Hub</span>
            </h1>
            <p className="text-xs md:text-sm text-zinc-400">
              صياغة ونشر المحتوى التسويقي التلقائي عبر فيسبوك، X، انستغرام، لينكد إن، وتيليجرام مع توليد صور وفيديوهات فائقة الدقة.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center p-1 rounded-2xl bg-zinc-950 border border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab("agent")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "agent"
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>الوكيل الذكي (AI Agent)</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "history"
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>سجل المنشورات ({postsHistory.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "config"
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>إعدادات القنوات</span>
            </button>
          </div>
        </div>

        {/* TAB 1: AI SOCIAL AGENT COMPOSER */}
        {activeTab === "agent" && (
          <div className="space-y-6">
            {/* Top Prompt Command Box */}
            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-950 to-[#0b101d] p-5 md:p-6 shadow-2xl backdrop-blur-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <Wand2 className="w-4 h-4" />
                  <span>توجيه وكيل السوشيال ميديا (AI Social Prompt)</span>
                </div>

                {/* Language Switcher */}
                <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 rounded-xl p-1 text-xs">
                  <Languages className="w-3.5 h-3.5 text-cyan-400 ml-1.5" />
                  <button
                    type="button"
                    onClick={() => setSelectedLanguage("ar")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      selectedLanguage === "ar"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    🇸🇦 العربية
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLanguage("en")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      selectedLanguage === "en"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>
              </div>

              {/* Textarea Input */}
              <div className="relative">
                <textarea
                  rows={2}
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="اكتب فكرة البوست التسويقي هنا (مثال: أطلقنا نموذج Grok Imagine 2.0 الجديد لتوليد صور سينمائية فائقة الواقعية في سعد ستوديو، مع تحسين سرعة المعالجة ودقة الـ 4K)..."
                  className="w-full rounded-2xl border border-white/10 bg-black/50 p-4 text-xs md:text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-400/50 transition-colors leading-relaxed"
                />
              </div>

              {/* Quick Preset Ideas & Generate Button */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-white/5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-zinc-400">أفكار سريعة:</span>
                  {[
                    "إطلاق نموذج Grok Imagine 2.0 في سعد ستوديو",
                    "دليل البرومبت السينمائي وإضاءات الـ 8K",
                    "نصائح لتحسين جودة التوليد بالذكاء الاصطناعي",
                    "عرض باقة الاشتراك والوصول غير المحدود",
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAgentPrompt(preset);
                        void handleGenerate(preset);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-cyan-500/10 hover:border-cyan-500/30 text-[10px] text-zinc-300 transition-all flex items-center gap-1"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                      <span>{preset}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerate()}
                    disabled={generating || !agentPrompt.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all shrink-0"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الصياغة والتوليد...</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-3.5 h-3.5" />
                        <span>توليد المنشورات لكافة المنصات ✨</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePublishDirect("facebook")}
                    disabled={publishing || !config.bufferAccessToken}
                    className="px-3.5 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-40 text-blue-300 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
                    title={!config.bufferAccessToken ? "اضبط مفتاح Buffer في تبويب الإعدادات لنشر البوست فوراً لفيسبوك" : "نشر مباشر لصفحة فيسبوك عبر Buffer"}
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>نشر لفيسبوك 📘</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePublishDirect("telegram")}
                    disabled={publishing || !config.telegramBotToken}
                    className="px-3.5 py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-40 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
                    title={!config.telegramBotToken ? "اضبط بيانات تيليجرام أولاً في تبويب الإعدادات" : "نشر مباشر لقناة تيليجرام"}
                  >
                    <Send className="w-3.5 h-3.5 text-cyan-400" />
                    <span>تيليجرام ✈️</span>
                  </button>
                </div>
              </div>

              {publishResult && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{publishResult}</span>
                </div>
              )}
            </div>

            {/* 3-Column Studio Grid: Left Media Studio | Middle Content Editor | Right Live Device Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* COLUMN 1: VISUAL MEDIA STUDIO (4 cols / 33%) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-cyan-400" />
                      <span className="text-white font-bold text-xs">الوسائط البصرية (Media)</span>
                    </div>

                    {/* Media Type Switcher: Image vs Video */}
                    <div className="flex items-center gap-1 p-0.5 bg-black/60 border border-white/10 rounded-xl text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedMediaType("image")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                          selectedMediaType === "image"
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        🖼️ صورة
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedMediaType("video")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                          selectedMediaType === "video"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        🎬 فيديو AI
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail / Video Preview */}
                  {currentPost.mediaType === "video" && currentPost.videoUrl ? (
                    <div className="rounded-2xl overflow-hidden border border-purple-500/30 aspect-video relative bg-black shadow-inner">
                      <video
                        src={currentPost.videoUrl}
                        controls
                        autoPlay
                        loop
                        muted
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : currentPost.imageUrl ? (
                    <div className="rounded-2xl overflow-hidden border border-white/15 aspect-video relative bg-black/40 shadow-inner">
                      <img
                        src={currentPost.imageUrl}
                        alt="Social post visual"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 aspect-video flex flex-col items-center justify-center text-zinc-500 text-xs gap-1.5 bg-black/30">
                      <ImageIcon className="w-6 h-6 text-zinc-600" />
                      <span>لم يتم توليد أو رفع وسائط بعد</span>
                    </div>
                  )}

                  {/* Social Media Aspect Ratio Selector */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <span className="text-zinc-400 font-semibold text-[11px]">أبعاد المنصة (Aspect Ratio):</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: "9:16", label: "📱 9:16 Reels/TikTok", desc: "قصص وريلز وتيك توك" },
                        { id: "1:1", label: "🔲 1:1 Square Feed", desc: "مربع فيسبوك وانستغرام" },
                        { id: "4:5", label: "🖼️ 4:5 Portrait", desc: "طولي انستغرام فييد" },
                        { id: "16:9", label: "🖥️ 16:9 Landscape", desc: "عرضي لليوتيوب وتويتر" },
                      ].map((ratio) => (
                        <button
                          key={ratio.id}
                          type="button"
                          title={ratio.desc}
                          onClick={() => setSelectedAspectRatio(ratio.id as any)}
                          className={`px-2 py-1.5 rounded-xl font-bold transition-all text-[10px] text-center ${
                            selectedAspectRatio === ratio.id
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                              : "text-zinc-400 hover:text-white bg-black/40 border border-white/5"
                          }`}
                        >
                          {ratio.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Model Selector based on Media Type */}
                  {selectedMediaType === "image" ? (
                    <div className="space-y-1.5 pt-2 border-t border-white/5 text-[11px]">
                      <span className="text-zinc-400 font-semibold">نموذج الصورة:</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedImageModel("nano-banana-pro")}
                          className={`px-2 py-1.5 rounded-xl font-bold transition-all text-[10px] ${
                            selectedImageModel === "nano-banana-pro"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "text-zinc-400 hover:text-white bg-black/40 border border-white/5"
                          }`}
                        >
                          🍌 Nano Banana Pro
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedImageModel("gpt-image-2")}
                          className={`px-2 py-1.5 rounded-xl font-bold transition-all text-[10px] ${
                            selectedImageModel === "gpt-image-2"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "text-zinc-400 hover:text-white bg-black/40 border border-white/5"
                          }`}
                        >
                          🧠 GPT-Image-2
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-2 border-t border-purple-500/20 text-[11px]">
                      <span className="text-purple-300 font-semibold">نموذج توليد الفيديو:</span>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedVideoModel("google-omni-veo")}
                          className={`px-2 py-1.5 rounded-xl font-bold transition-all text-[10px] text-center ${
                            selectedVideoModel === "google-omni-veo"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                              : "text-zinc-400 hover:text-white bg-black/40 border border-white/5"
                          }`}
                        >
                          🌐 Omni
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedVideoModel("kling-video")}
                          className={`px-2 py-1.5 rounded-xl font-bold transition-all text-[10px] text-center ${
                            selectedVideoModel === "kling-video"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                              : "text-zinc-400 hover:text-white bg-black/40 border border-white/5"
                          }`}
                        >
                          ⚡ Kling Pro
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedVideoModel("seedance-video")}
                          className={`px-2 py-1.5 rounded-xl font-bold transition-all text-[10px] text-center ${
                            selectedVideoModel === "seedance-video"
                              ? "bg-pink-500/20 text-pink-300 border border-pink-500/40"
                              : "text-zinc-400 hover:text-white bg-black/40 border border-white/5"
                          }`}
                        >
                          🌊 Seedance
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImg}
                      className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      {uploadingImg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-cyan-400" />}
                      <span>رفع ملف</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {selectedMediaType === "image" ? (
                      <button
                        type="button"
                        onClick={handleGenerateImageOnly}
                        disabled={generatingImg}
                        className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        {generatingImg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
                        <span>توليد صورة</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateVideoOnly}
                        disabled={generatingVid}
                        className="px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-500/10"
                      >
                        {generatingVid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                        <span>توليد فيديو</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* COLUMN 2: CONTENT EDITOR & CUSTOMIZER (4 cols / 33%) */}
              <div className="lg:col-span-4 space-y-4">
                {/* Platform Selector Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-950 border border-white/10 overflow-x-auto">
                  {[
                    { id: "facebook", label: "📘 Facebook" },
                    { id: "twitter", label: "𝕏 Twitter" },
                    { id: "instagram", label: "📸 Instagram" },
                    { id: "linkedin", label: "💼 LinkedIn" },
                    { id: "telegram", label: "✈️ Telegram" },
                    { id: "tiktok", label: "🎵 TikTok" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActivePlatform(tab.id as any)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                        activePlatform === tab.id
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Platform Text Customizer Card */}
                <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-xl space-y-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-white font-bold text-xs flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-cyan-400" />
                      <span>نص المنشور ({activePlatform.toUpperCase()})</span>
                    </label>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                      {currentPlatformData.content.length} حرف
                    </span>
                  </div>

                  <textarea
                    rows={8}
                    value={currentPlatformData.content}
                    onChange={(e) => {
                      const newContent = e.target.value;
                      setCurrentPost((prev) => ({
                        ...prev,
                        platforms: {
                          ...prev.platforms,
                          [activePlatform]: {
                            ...currentPlatformData,
                            content: newContent,
                            charCount: newContent.length,
                          },
                        },
                      }));
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-3.5 text-white outline-none focus:border-cyan-400/50 leading-relaxed text-xs resize-y"
                  />

                  {/* Hashtags Input */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <Hash className="w-3 h-3 text-cyan-400" />
                      <span>الهاشتاغات (Hashtags)</span>
                    </label>
                    <input
                      type="text"
                      value={(currentPlatformData.hashtags || []).join(" ")}
                      onChange={(e) => {
                        const tags = e.target.value.split(" ").filter((t) => t.trim().length > 0);
                        setCurrentPost((prev) => ({
                          ...prev,
                          platforms: {
                            ...prev.platforms,
                            [activePlatform]: {
                              ...currentPlatformData,
                              hashtags: tags,
                            },
                          },
                        }));
                      }}
                      placeholder="#سعد_ستوديو #ذكاء_اصطناعي #SaadStudio"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-cyan-300 font-mono text-xs outline-none focus:border-cyan-400/50"
                    />
                  </div>

                  {/* Copy Button */}
                  <div className="pt-2 flex items-center justify-between border-t border-white/5">
                    <span className="text-[10px] text-zinc-500">جاهز للنشر الفوري</span>
                    <button
                      type="button"
                      onClick={() => handleCopyPlatformContent(activePlatform)}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-zinc-200 font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      {copiedKey === activePlatform ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">تم النسخ!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-cyan-400" />
                          <span>نسخ المنشور والهاشتاغات</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* COLUMN 3: LIVE INTERACTIVE PLATFORM PREVIEW (4 cols / 33%) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span>المعاينة الحية التفاعلية</span>
                  </h3>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase">
                    {activePlatform}
                  </span>
                </div>

                {/* 0. FACEBOOK PREVIEW */}
                {activePlatform === "facebook" && (
                  <div className="rounded-3xl border border-white/10 bg-[#18191a] p-5 text-white shadow-2xl space-y-3 font-sans w-full">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center overflow-hidden">
                          <Image src="/logo-saad.png?v=5" alt="Saad Studio" width={28} height={28} unoptimized />
                        </div>
                        <div>
                          <div className="flex items-center gap-1 font-bold text-sm">
                            <span>Saad Studio</span>
                            <span className="text-blue-400 text-xs">●</span>
                          </div>
                          <div className="text-[11px] text-zinc-400">منذ دقائق • 🌐 عام</div>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-zinc-500">•••</span>
                    </div>

                    <p className="text-xs md:text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">
                      {currentPlatformData.content}
                    </p>

                    {currentPlatformData.hashtags && currentPlatformData.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 text-blue-400 text-xs font-semibold">
                        {currentPlatformData.hashtags.map((tag, i) => (
                          <span key={i}>{tag}</span>
                        ))}
                      </div>
                    )}

                    {/* Media Render (Video or Image) */}
                    {currentPost.mediaType === "video" && currentPost.videoUrl ? (
                      <div className="rounded-2xl overflow-hidden border border-zinc-700 aspect-video bg-black">
                        <video src={currentPost.videoUrl} controls autoPlay loop muted className="w-full h-full object-cover" />
                      </div>
                    ) : currentPost.imageUrl ? (
                      <div className="rounded-2xl overflow-hidden border border-zinc-700 aspect-video bg-zinc-900">
                        <img src={currentPost.imageUrl} alt="Facebook visual" className="w-full h-full object-cover" />
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between text-zinc-400 text-xs pt-2 border-t border-zinc-800">
                      <span>👍❤️ 520 تفاعل</span>
                      <span>💬 48 تعليق • 🔄 26 مشاركة</span>
                    </div>
                  </div>
                )}

                {/* 1. TWITTER / X PREVIEW */}
                {activePlatform === "twitter" && (
                  <div className="rounded-3xl border border-white/10 bg-black p-5 text-white shadow-2xl space-y-3 font-sans w-full">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center overflow-hidden">
                          <Image src="/logo-saad.png?v=5" alt="Saad Studio" width={28} height={28} unoptimized />
                        </div>
                        <div>
                          <div className="flex items-center gap-1 font-bold text-sm">
                            <span>Saad Studio AI</span>
                            <span className="text-cyan-400 text-xs">✓</span>
                          </div>
                          <div className="text-xs text-zinc-500">@SaadStudioAI • الآن</div>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-zinc-500">𝕏</span>
                    </div>

                    <p className="text-xs md:text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">
                      {currentPlatformData.content}
                    </p>

                    {currentPlatformData.hashtags && currentPlatformData.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 text-cyan-400 text-xs font-semibold">
                        {currentPlatformData.hashtags.map((tag, i) => (
                          <span key={i}>{tag}</span>
                        ))}
                      </div>
                    )}

                    {currentPost.mediaType === "video" && currentPost.videoUrl ? (
                      <div className="rounded-2xl overflow-hidden border border-zinc-800 aspect-video bg-black">
                        <video src={currentPost.videoUrl} controls autoPlay loop muted className="w-full h-full object-cover" />
                      </div>
                    ) : currentPost.imageUrl ? (
                      <div className="rounded-2xl overflow-hidden border border-zinc-800 aspect-video bg-zinc-900">
                        <img src={currentPost.imageUrl} alt="X post visual" className="w-full h-full object-cover" />
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between text-zinc-500 text-xs pt-2 border-t border-zinc-900">
                      <span>💬 24</span>
                      <span>🔄 89</span>
                      <span>❤️ 340</span>
                      <span>📊 12.4K</span>
                    </div>
                  </div>
                )}

                {/* 2. INSTAGRAM PREVIEW */}
                {activePlatform === "instagram" && (
                  <div className="rounded-3xl border border-white/10 bg-[#09090b] text-white shadow-2xl overflow-hidden font-sans w-full">
                    {/* Header */}
                    <div className="p-4 flex items-center justify-between border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-fuchsia-600 p-0.5">
                          <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center overflow-hidden">
                            <Image src="/logo-saad.png?v=5" alt="Logo" width={22} height={22} unoptimized />
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-xs">saadstudio.ai</div>
                          <div className="text-[10px] text-zinc-400">Original audio</div>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500">•••</span>
                    </div>

                    {/* Media */}
                    {currentPost.mediaType === "video" && currentPost.videoUrl ? (
                      <div className="aspect-square bg-black w-full overflow-hidden">
                        <video src={currentPost.videoUrl} controls autoPlay loop muted className="w-full h-full object-cover" />
                      </div>
                    ) : currentPost.imageUrl ? (
                      <div className="aspect-square bg-zinc-900 w-full overflow-hidden">
                        <img src={currentPost.imageUrl} alt="Instagram visual" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-square bg-zinc-900 flex items-center justify-center text-zinc-600 text-xs">
                        No media selected
                      </div>
                    )}

                    {/* Footer / Caption */}
                    <div className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-base">
                        <div className="flex items-center gap-3">
                          <span>❤️</span>
                          <span>💬</span>
                          <span>✈️</span>
                        </div>
                        <span>🔖</span>
                      </div>
                      <div className="font-bold text-[11px]">3,420 likes</div>
                      <div className="text-zinc-200 leading-relaxed whitespace-pre-wrap">
                        <strong className="mr-1">saadstudio.ai</strong>
                        {currentPlatformData.content}
                      </div>
                      <div className="text-cyan-400 text-[11px] leading-relaxed">
                        {(currentPlatformData.hashtags || []).join(" ")}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. LINKEDIN PREVIEW */}
                {activePlatform === "linkedin" && (
                  <div className="rounded-3xl border border-white/10 bg-[#1b1f23] p-5 text-white shadow-2xl space-y-3 font-sans w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/20 flex items-center justify-center overflow-hidden">
                        <Image src="/logo-saad.png?v=5" alt="Logo" width={28} height={28} unoptimized />
                      </div>
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <span>Saad Studio — AI Creative Suite</span>
                          <span className="text-zinc-400 text-[10px]">🏢 Company</span>
                        </div>
                        <div className="text-[10px] text-zinc-400">12,500 followers • Promoted</div>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      {currentPlatformData.content}
                    </p>

                    <div className="text-cyan-400 text-xs font-semibold">
                      {(currentPlatformData.hashtags || []).join(" ")}
                    </div>

                    {currentPost.mediaType === "video" && currentPost.videoUrl ? (
                      <div className="rounded-xl overflow-hidden border border-zinc-700 aspect-video bg-black">
                        <video src={currentPost.videoUrl} controls autoPlay loop muted className="w-full h-full object-cover" />
                      </div>
                    ) : currentPost.imageUrl ? (
                      <div className="rounded-xl overflow-hidden border border-zinc-700 aspect-video bg-zinc-900">
                        <img src={currentPost.imageUrl} alt="LinkedIn visual" className="w-full h-full object-cover" />
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between text-zinc-400 text-xs pt-2 border-t border-zinc-700/60">
                      <span>👍 Like (450)</span>
                      <span>💬 Comment</span>
                      <span>🔄 Repost</span>
                      <span>✈️ Send</span>
                    </div>
                  </div>
                )}

                {/* 4. TELEGRAM PREVIEW */}
                {activePlatform === "telegram" && (
                  <div className="rounded-3xl border border-white/10 bg-[#17212b] p-5 text-white shadow-2xl space-y-3 font-sans w-full">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                          <Send className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        <span className="font-bold text-xs text-cyan-300">Saad Studio Official Channel</span>
                      </div>
                      <span className="text-[10px] text-zinc-500">18.4K subscribers</span>
                    </div>

                    <div className="rounded-2xl bg-[#242f3d] p-4 space-y-3 border border-white/5">
                      {currentPost.mediaType === "video" && currentPost.videoUrl ? (
                        <div className="rounded-xl overflow-hidden aspect-video bg-black">
                          <video src={currentPost.videoUrl} controls autoPlay loop muted className="w-full h-full object-cover" />
                        </div>
                      ) : currentPost.imageUrl ? (
                        <div className="rounded-xl overflow-hidden aspect-video bg-black/40">
                          <img src={currentPost.imageUrl} alt="Telegram visual" className="w-full h-full object-cover" />
                        </div>
                      ) : null}
                      <p className="text-xs text-zinc-100 leading-relaxed whitespace-pre-wrap font-sans">
                        {currentPlatformData.content}
                      </p>
                      <div className="text-cyan-300 text-xs font-mono">
                        {(currentPlatformData.hashtags || []).join(" ")}
                      </div>
                      <div className="text-right text-[10px] text-zinc-400 font-mono">
                        14:20 • 4.2K views
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. TIKTOK SCRIPT PREVIEW */}
                {activePlatform === "tiktok" && (
                  <div className="rounded-3xl border border-white/10 bg-[#09090b] p-5 text-white shadow-2xl space-y-3 font-sans w-full">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-rose-400" />
                        <span className="font-bold text-xs text-rose-300">TikTok & Shorts Viral Script</span>
                      </div>
                      <span className="text-[10px] text-zinc-500">15-30s Duration</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/5 font-mono text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      {currentPlatformData.content}
                    </div>

                    <div className="text-rose-400 text-xs font-mono">
                      {(currentPlatformData.hashtags || []).join(" ")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POSTS HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">سجل المنشورات والأرشيف</h2>
              <button
                type="button"
                onClick={fetchData}
                disabled={loadingData}
                className="p-2 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 hover:text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
              </button>
            </div>

            {loadingData ? (
              <div className="py-12 text-center text-zinc-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                <span>جاري تحميل السجل...</span>
              </div>
            ) : postsHistory.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-white/10 bg-zinc-950/60 text-zinc-500 space-y-2">
                <Share2 className="w-8 h-8 mx-auto text-zinc-600" />
                <div className="text-sm font-bold text-zinc-300">لا توجد منشورات سابقة حتى الآن</div>
                <p className="text-xs text-zinc-500">ابدأ بتوجيه الوكيل لتوليد وحفظ منشورات السوشيال ميديا.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {postsHistory.map((p) => (
                  <div key={p.id} className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-xl space-y-3.5 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      {p.imageUrl && (
                        <div className="rounded-xl overflow-hidden aspect-video bg-black/40 border border-white/10">
                          <img src={p.imageUrl} alt="Post thumbnail" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="font-semibold text-cyan-400">
                          {p.language === "ar" ? "🇸🇦 العربية" : "🇬🇧 English"}
                        </span>
                        <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-zinc-200 line-clamp-3 font-sans leading-relaxed">
                        {p.platforms.twitter?.content || p.platforms.instagram?.content || p.topicPrompt}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPost(p);
                          setActiveTab("agent");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-300 font-bold text-xs"
                      >
                        عرض وتعديل
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePost(p.id)}
                        className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SOCIAL INTEGRATIONS CONFIG */}
        {activeTab === "config" && (
          <div className="max-w-2xl mx-auto rounded-3xl border border-white/10 bg-zinc-950/70 p-6 md:p-8 backdrop-blur-xl space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>إعدادات وقنوات النشر المباشر</span>
              </h2>
              <p className="text-xs text-zinc-400">
                اربط قنواتك لنشر البوستات تلقائياً بضغطة زر واحدة من خلال الوكيل الذكي.
              </p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-5 text-xs">
              {/* Buffer API for Facebook, Instagram & X */}
              <div className="p-4 rounded-2xl bg-black/40 border border-blue-500/30 space-y-3">
                <div className="font-bold text-blue-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-blue-400" />
                    <span>ربط Buffer (لنشر فيسبوك، إنستغرام، و X)</span>
                  </div>
                  <a
                    href="https://publish.buffer.com/settings/api"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>الحصول على API Key من Buffer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold text-[10px] uppercase">Buffer Access Token</label>
                  <input
                    type="password"
                    value={config.bufferAccessToken || ""}
                    onChange={(e) => setConfig({ ...config, bufferAccessToken: e.target.value })}
                    placeholder="1/abcdef1234567890..."
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2.5 text-white outline-none focus:border-blue-400/50"
                  />
                  <p className="text-[10px] text-zinc-500">
                    ضع المفتاح هنا لتتمكن من نشر البوستات فوراً إلى صفحة فيسبوك وقنواتك المربوطة في Buffer.
                  </p>
                </div>
              </div>

              {/* Telegram Bot */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <div className="font-bold text-cyan-300 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  <span>بوت وقناة تيليجرام (Telegram Channel Broadcast)</span>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold text-[10px] uppercase">Telegram Bot Token</label>
                  <input
                    type="password"
                    value={config.telegramBotToken || ""}
                    onChange={(e) => setConfig({ ...config, telegramBotToken: e.target.value })}
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2.5 text-white outline-none focus:border-cyan-400/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold text-[10px] uppercase">Channel Username / Chat ID</label>
                  <input
                    type="text"
                    value={config.telegramChatId || ""}
                    onChange={(e) => setConfig({ ...config, telegramChatId: e.target.value })}
                    placeholder="@SaadStudioChannel or -100123456789"
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2.5 text-white outline-none focus:border-cyan-400/50"
                  />
                </div>
              </div>

              {/* Discord Webhook */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <div className="font-bold text-indigo-300 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>رابط سيرفر ديسكورد (Discord Webhook URL)</span>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold text-[10px] uppercase">Webhook URL</label>
                  <input
                    type="password"
                    value={config.discordWebhookUrl || ""}
                    onChange={(e) => setConfig({ ...config, discordWebhookUrl: e.target.value })}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2.5 text-white outline-none focus:border-cyan-400/50"
                  />
                </div>
              </div>

              {/* Custom Webhook (Make / Zapier / Ayrshare) */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <div className="font-bold text-amber-300 flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  <span>بوابة النشر الشامل (Make / Zapier / Ayrshare Webhook)</span>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold text-[10px] uppercase">Automation Webhook URL</label>
                  <input
                    type="password"
                    value={config.customWebhookUrl || ""}
                    onChange={(e) => setConfig({ ...config, customWebhookUrl: e.target.value })}
                    placeholder="https://hook.eu1.make.com/... or Ayrshare API URL"
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2.5 text-white outline-none focus:border-cyan-400/50"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
                >
                  {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>حفظ الإعدادات</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
