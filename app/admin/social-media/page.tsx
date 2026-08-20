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
  Clapperboard,
  Palette,
  Film,
  Video as VideoIcon,
  Play,
  Layers,
  Maximize2,
  Download,
  Zap,
  SlidersHorizontal,
  Globe,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  SocialMediaPostRecord,
  SocialAccountsConfig,
  SocialPlatformType,
  PlatformContentItem,
  StoryboardShowcaseRecord,
  StoryboardThemeType,
} from "@/lib/social-media";

// Clean Brand Vector Icons
function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function TwitterXIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

function LinkedInIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.25c-.9 0-1.63.73-1.63 1.63s.73 1.63 1.63 1.63 1.63-.73 1.63-1.63-.73-1.63-1.63-1.63z"/>
    </svg>
  );
}

function TelegramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
    </svg>
  );
}

function TikTokIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.97v7.6c0 1.25-.33 2.5-.98 3.56-1.07 1.76-2.92 2.97-4.99 3.23-1.74.22-3.53-.16-5.04-1.06-1.73-1.03-2.96-2.8-3.35-4.78-.4-2.02.13-4.18 1.44-5.77 1.29-1.58 3.27-2.5 5.3-2.5.34 0 .68.03 1.02.08v4.11c-.48-.15-.99-.2-1.5-.14-1.01.12-1.92.74-2.39 1.63-.47.9-.45 1.99.04 2.87.49.89 1.43 1.48 2.45 1.52 1.02.04 2.03-.43 2.58-1.28.32-.5.48-1.09.48-1.68V.02h2.01z"/>
    </svg>
  );
}

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
      content: "أطلقنا أحدث النماذج الإبداعية لتوليد الصور والفيديو بدقة فائقة عبر سعد ستوديو! 🚀 جرّب الآن واصنع محتواك.",
      hashtags: ["#SaadStudio", "#AIArt", "#ذكاء_اصطناعي"],
      charCount: 95,
    },
    facebook: {
      platform: "facebook",
      content: "نقلة نوعية في عالم الذكاء الاصطناعي الإبداعي! أطلقنا أحدث النماذج فائقة الواقعية في منصة سعد ستوديو. من توليد الصور السينمائية بدقة 4K إلى الفيديو الاحترافي.\n\nجرّب الآن واستمتع بسرعة إنتاجية لا مثيل لها 🚀",
      hashtags: ["#سعد_ستوديو", "#ذكاء_اصطناعي", "#SaadStudio"],
      charCount: 215,
    },
    instagram: {
      platform: "instagram",
      content: "عالم جديد من الإبداع البصري مع سعد ستوديو ✨\n\nتوليد صور وفيديوهات سينمائية بضغطة زر واحدة. الرابط في البايو للتجربة المباشرة 🚀",
      hashtags: ["#SaadStudio", "#AIArt", "#DigitalArt", "#GenerativeAI", "#MidjourneyAlternative", "#CGI"],
      charCount: 140,
    },
    linkedin: {
      platform: "linkedin",
      content: "يسعدنا الإعلان عن إطلاق التحديث الجديد لمنصة Saad Studio! 🌟\n\nتتضمن الميزات:\n• توليد صور وفيديوهات سينمائية فائقة الدقة.\n• إضافة المونتاج لـ Premiere Pro.\n• أتمتة صناعة المحتوى بالذكاء الاصطناعي.",
      hashtags: ["#SaadStudio", "#AI", "#Innovation", "#VideoEditing"],
      charCount: 220,
    },
    telegram: {
      platform: "telegram",
      content: "🚀 **تحديث جديد في سعد ستوديو**\n\nأصبح بإمكانك الآن توليد صور وفيديوهات سينمائية ونشرها فوراً عبر كافة قنواتك!\n\nرابط المنصة: https://saadstudio.app",
      hashtags: ["#سعد_ستوديو", "#تحديث"],
      charCount: 155,
    },
    tiktok: {
      platform: "tiktok",
      content: "🎬 **HOOK (0-3s):** كيف تسوي فيديو سينمائي بالذكاء الاصطناعي في 5 ثواني بس؟\n\n🎥 **SCENE:** استعراض لوحة التحكم في سعد ستوديو واختيار نموذج Grok Imagine أو Kling.\n\n🗣️ **VOICEOVER:** هذا الموقع بيغير طريقة تصميمك للأبد! ادخل سعد ستوديو وجرب الرابط بالبايو.",
      hashtags: ["#SaadStudio", "#AIAnimation", "#تيك_توك", "#ذكاء_اصطناعي"],
      charCount: 260,
    },
  },
};

const DEFAULT_STORYBOARD: StoryboardShowcaseRecord = {
  id: "sb_init",
  title: "سير عمل Kling 3.0 و Nano Banana السينمائي",
  theme: "cyberpunk",
  conceptPrompt: "Day-to-night transformation of a 3D animator working at his desk in Saad Studio",
  language: "ar",
  video: {
    url: "",
    model: "kling-3.0/video",
    modelBadge: "Kling 3.0 Pro",
    prompt: "Cinematic 3D animation, locked static camera, same bedroom workstation. Stylized character typing on glowing laptop. Fast smooth day to night transition with ambient lighting shifting from golden sunlight to neon cyberpunk glow, 8k render masterpiece.",
  },
  referenceFrames: {
    frame1: {
      url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80",
      label: "الإطار 1: ضوء الصباح (Morning Light)",
      modelBadge: "Google Nano Banana Pro",
      prompt: "3D stylized character sitting at bedroom desk typing on computer, warm morning sunlight streaming through window, soft cozy lighting, Pixar aesthetic, 8k octane render.",
    },
    frame2: {
      url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80",
      label: "الإطار 2: توهج ليلي سيبراني (Cyber Glow)",
      modelBadge: "Google Nano Banana Pro",
      prompt: "Same 3D stylized character sitting at bedroom desk typing on computer at night, glowing neon cyan and warm amber screen reflections, atmospheric bedroom, 8k octane render.",
    },
  },
  promptBlueprint: {
    camera: "Locked Static Camera, 35mm Anamorphic, f/1.8",
    lighting: "Volumetric daylight transitioning into cyber neon amber and green glow",
    composition: "Rule of thirds, centered workstation desk with depth",
    fullText: "locked static camera, same bedroom scene. Stick figure tech bro sits at the desk pressing on the laptop continuously. Frame 1: morning daylight through the window. Frame 2: nighttime lighting with warm yellow and green glow. Minimal motion, simple loop, same composition, same character, fast day-to-night transition.",
  },
  assets: {
    character: {
      url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
      label: "عنصر الشخصية (Character)",
      prompt: "Stylized 3D cartoon tech creator character with red beanie and yellow shirt, full body character sheet, clean solid background.",
    },
    environment: {
      url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80",
      label: "عنصر الغرفة (Room / Scene)",
      prompt: "Cozy modern creator bedroom workstation with dual monitors, bookshelf, warm ambient night lamps, empty scene background plate.",
    },
  },
  captionText: "كيف تصنع فيديو تحول سينمائي كامل من النهار إلى الليل بالذكاء الاصطناعي؟ 🚀 استخدمنا محرك Kling 3.0 مع Nano Banana في سعد ستوديو للوصول لهذه النتيجة الخرافية! جرب البرومبت المرفق الآن 🎬",
  hashtags: ["#SaadStudio", "#KlingAI", "#NanoBanana", "#AIAnimation", "#AIVideo", "#CGI", "#ViralReels", "#Filmmaking"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default function AdminSocialMediaPage() {
  const [activeTab, setActiveTab] = useState<"agent" | "storyboard" | "history" | "config">("agent");
  const [activePlatform, setActivePlatform] = useState<SocialPlatformType>("twitter");
  const [selectedLanguage, setSelectedLanguage] = useState<"ar" | "en">("ar");
  const [selectedMediaType, setSelectedMediaType] = useState<"image" | "video">("image");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<"1:1" | "9:16" | "16:9" | "4:5">("16:9");
  const [selectedImageModel, setSelectedImageModel] = useState<"nano-banana-pro" | "grok-imagine" | "gpt-image-2">("nano-banana-pro");
  const [selectedVideoModel, setSelectedVideoModel] = useState<"kling-3.0/video" | "bytedance/seedance-2" | "google/gemini-omni-flash">("kling-3.0/video");

  // Agent states
  const [agentPrompt, setAgentPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingImg, setGeneratingImg] = useState(false);
  const [generatingVid, setGeneratingVid] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [currentPost, setCurrentPost] = useState<SocialMediaPostRecord>(DEFAULT_POST);
  const [customImgPrompt, setCustomImgPrompt] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<{ url: string; type: "image" | "video"; title?: string } | null>(null);

  const handleDownloadMedia = async (url: string, filename = "saad-studio-visual") => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const isVideo = url.includes(".mp4") || url.includes("video");
      a.download = `${filename}-${Date.now()}.${isVideo ? "mp4" : "png"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };
  // Interactive Creative Director Consultation states
  const [consulting, setConsulting] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);
  const [consultationMessages, setConsultationMessages] = useState<Array<{
    role: "user" | "assistant";
    content: string;
    options?: string[];
    config?: any;
    ready?: boolean;
  }>>([]);
  const [consultationInput, setConsultationInput] = useState("");

  const handleStartConsultation = async (topicToUse?: string) => {
    const topic = topicToUse || agentPrompt;
    if (!topic.trim()) return;

    setConsulting(true);
    setShowConsultation(true);
    setConsultationMessages([
      { role: "user", content: topic.trim() },
    ]);

    try {
      const res = await fetch("/api/admin/social-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "consult",
          topic: topic.trim(),
          language: selectedLanguage,
          messages: [{ role: "user", content: topic.trim() }],
        }),
      });
      const data = await res.json();
      if (res.ok && data?.message) {
        setConsultationMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            options: data.suggestedOptions || [],
            config: data.recommendedConfig || null,
            ready: Boolean(data.isReadyToGenerate),
          },
        ]);
        if (data.recommendedConfig) {
          if (data.recommendedConfig.mediaType) setSelectedMediaType(data.recommendedConfig.mediaType);
          if (data.recommendedConfig.imageModel) setSelectedImageModel(data.recommendedConfig.imageModel);
          if (data.recommendedConfig.videoModel) setSelectedVideoModel(data.recommendedConfig.videoModel);
          if (data.recommendedConfig.aspectRatio) setSelectedAspectRatio(data.recommendedConfig.aspectRatio);
        }
      }
    } catch (e) {
      alert("Error in consultation: " + String(e));
    } finally {
      setConsulting(false);
    }
  };

  const handleSendConsultationReply = async (replyText: string) => {
    if (!replyText.trim()) return;

    const updated = [
      ...consultationMessages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: replyText.trim() },
    ];

    setConsultationMessages((prev) => [
      ...prev,
      { role: "user", content: replyText.trim() },
    ]);
    setConsultationInput("");
    setConsulting(true);

    try {
      const res = await fetch("/api/admin/social-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "consult",
          topic: agentPrompt,
          language: selectedLanguage,
          messages: updated,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.message) {
        setConsultationMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            options: data.suggestedOptions || [],
            config: data.recommendedConfig || null,
            ready: Boolean(data.isReadyToGenerate),
          },
        ]);
        if (data.recommendedConfig) {
          if (data.recommendedConfig.mediaType) setSelectedMediaType(data.recommendedConfig.mediaType);
          if (data.recommendedConfig.imageModel) setSelectedImageModel(data.recommendedConfig.imageModel);
          if (data.recommendedConfig.videoModel) setSelectedVideoModel(data.recommendedConfig.videoModel);
          if (data.recommendedConfig.aspectRatio) setSelectedAspectRatio(data.recommendedConfig.aspectRatio);
          if (data.recommendedConfig.refinedPrompt) setAgentPrompt(data.recommendedConfig.refinedPrompt);
        }
      }
    } catch (e) {
      alert("Error in consultation: " + String(e));
    } finally {
      setConsulting(false);
    }
  };

  // Storyboard Studio states
  const [storyboardsHistory, setStoryboardsHistory] = useState<StoryboardShowcaseRecord[]>([]);
  const [currentStoryboard, setCurrentStoryboard] = useState<StoryboardShowcaseRecord>(DEFAULT_STORYBOARD);
  const [storyboardPrompt, setStoryboardPrompt] = useState("");
  const [selectedSbTheme, setSelectedSbTheme] = useState<StoryboardThemeType>("cyberpunk");
  const [selectedSbTemplate, setSelectedSbTemplate] = useState<"day-night" | "car-call" | "character-3d" | "workflow-battle">("day-night");
  const [selectedSbImageModel, setSelectedSbImageModel] = useState<"nano-banana-pro" | "grok-imagine" | "gpt-image-2">("nano-banana-pro");
  const [selectedSbVideoModel, setSelectedSbVideoModel] = useState<"kling-3.0/video" | "bytedance/seedance-2" | "google/gemini-omni-flash">("kling-3.0/video");
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false);
  const [generatingSbVideo, setGeneratingSbVideo] = useState(false);
  const [generatingSbFrame1, setGeneratingSbFrame1] = useState(false);
  const [generatingSbFrame2, setGeneratingSbFrame2] = useState(false);

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
          mediaType: selectedMediaType,
          imageModel: selectedImageModel,
          videoModel: selectedVideoModel,
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

  const handleGenerateStoryboard = async (promptToUse?: string) => {
    const p = promptToUse || storyboardPrompt.trim() || "Day-to-night transformation of a 3D animator working at his desk in Saad Studio";
    setGeneratingStoryboard(true);
    try {
      const res = await fetch("/api/admin/social-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_storyboard",
          prompt: p,
          language: selectedLanguage,
          theme: selectedSbTheme,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.storyboard) {
        setCurrentStoryboard(data.storyboard);
        await fetchData();
      } else {
        alert(data?.error || "تعذر توليد الستوري بورد، يرجى المحاولة مجدداً.");
      }
    } catch (e) {
      alert("Error generating storyboard: " + String(e));
    } finally {
      setGeneratingStoryboard(false);
    }
  };

  const handleGenerateSbVideo = async () => {
    const p = currentStoryboard.video.prompt || "Cinematic 3D animation day to night transition 8k";
    setGeneratingSbVideo(true);
    try {
      const res = await fetch("/api/admin/social-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_video",
          prompt: p,
          model: selectedSbVideoModel,
          aspectRatio: "16:9",
        }),
      });
      const data = await res.json();
      if (res.ok && data?.videoUrl) {
        setCurrentStoryboard((prev) => ({
          ...prev,
          video: {
            ...prev.video,
            url: data.videoUrl,
            model: selectedSbVideoModel,
            modelBadge: selectedSbVideoModel.includes("kling") ? "Kling 3.0 Pro" : selectedSbVideoModel.includes("seedance") ? "Seedance 2 Turbo" : "Omni Flash",
          },
        }));
      } else {
        alert(data?.error || "تعذر توليد فيديو الستوري بورد.");
      }
    } catch (e) {
      alert("Error: " + String(e));
    } finally {
      setGeneratingSbVideo(false);
    }
  };

  const handleGenerateSbFrame = async (frameKey: "frame1" | "frame2") => {
    const prompt = currentStoryboard.referenceFrames[frameKey].prompt;
    if (frameKey === "frame1") setGeneratingSbFrame1(true);
    else setGeneratingSbFrame2(true);

    try {
      const res = await fetch("/api/admin/social-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_image",
          prompt,
          model: selectedSbImageModel,
          aspectRatio: "16:9",
        }),
      });
      const data = await res.json();
      if (res.ok && data?.imageUrl) {
        setCurrentStoryboard((prev) => ({
          ...prev,
          referenceFrames: {
            ...prev.referenceFrames,
            [frameKey]: {
              ...prev.referenceFrames[frameKey],
              url: data.imageUrl,
              modelBadge: selectedSbImageModel === "nano-banana-pro" ? "Nano Banana Pro" : selectedSbImageModel === "grok-imagine" ? "Grok Imagine 2.0" : "GPT-Image-2",
            },
          },
        }));
      } else {
        alert(data?.error || "تعذر توليد الإطار المرجعي.");
      }
    } catch (e) {
      alert("Error: " + String(e));
    } finally {
      if (frameKey === "frame1") setGeneratingSbFrame1(false);
      else setGeneratingSbFrame2(false);
    }
  };

  const handleDeleteStoryboard = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الستوري بورد؟")) return;
    try {
      const res = await fetch(`/api/admin/social-media?id=${id}&type=storyboard`, { method: "DELETE" });
      if (res.ok) {
        setStoryboardsHistory((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      alert("Failed to delete storyboard");
    }
  };

  const handleCopyBlueprint = () => {
    navigator.clipboard.writeText(currentStoryboard.promptBlueprint.fullText);
    setCopiedKey("sb_blueprint");
    setTimeout(() => setCopiedKey(null), 2500);
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
              <span>Social Media AI Agent & Storyboard Studio</span>
            </h1>
            <p className="text-xs md:text-sm text-zinc-400">
              صياغة ونشر المحتوى التسويقي التلقائي، وتصميم فيديوهات الستوري بورد والمقارنة البصرية الفيروسية (Viral AI Showcases).
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center p-1 rounded-2xl bg-zinc-950 border border-white/10 shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab("agent")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "agent"
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>الوكيل الذكي (AI Agent)</span>
            </button>
            <button
              onClick={() => setActiveTab("storyboard")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "storyboard"
                  ? "bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white shadow-md shadow-fuchsia-500/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Clapperboard className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>🎬 ستوري بورد واستعراض الـ AI (Showcase Studio)</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
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
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
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
                  {/* 1. Creative Dialogue Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!showConsultation) {
                        void handleStartConsultation();
                      } else {
                        setShowConsultation(false);
                      }
                    }}
                    disabled={consulting || !agentPrompt.trim()}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shrink-0 border ${
                      showConsultation
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-lg shadow-cyan-500/20"
                        : "bg-white/[0.04] hover:bg-white/[0.08] text-white border-cyan-500/30 hover:border-cyan-400/60"
                    }`}
                  >
                    {consulting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                        <span>جاري التحاور...</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
                        <span>حاور الوكيل الإبداعي قبل التوليد 💬</span>
                      </>
                    )}
                  </button>

                  {/* 2. Direct Quick Generation */}
                  <button
                    type="button"
                    onClick={() => handleGenerate()}
                    disabled={generating || !agentPrompt.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all shrink-0"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري التوليد الفوري...</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-3.5 h-3.5" />
                        <span>توليد مباشر فوري ✨</span>
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
                    <span>نشر لفيسبوك</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePublishDirect("telegram")}
                    disabled={publishing || !config.telegramBotToken}
                    className="px-3.5 py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-40 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
                    title={!config.telegramBotToken ? "اضبط بيانات تيليجرام أولاً في تبويب الإعدادات" : "نشر مباشر لقناة تيليجرام"}
                  >
                    <Send className="w-3.5 h-3.5 text-cyan-400" />
                    <span>تيليجرام</span>
                  </button>
                </div>
              </div>

              {/* INTERACTIVE CREATIVE CONSULTATION PANEL */}
              {showConsultation && (
                <div className="rounded-2xl border border-cyan-500/30 bg-black/70 p-4 space-y-4 backdrop-blur-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>المخرج الإبداعي ومستشار السوشيال ميديا (AI Creative Director)</span>
                        </h4>
                        <p className="text-[10px] text-zinc-400">تحاور مع الوكيل لتخصيص النبرة، الطابع البصري، ونماذج التوليد قبل التنفيذ.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowConsultation(false)}
                      className="text-zinc-500 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10"
                    >
                      إغلاق الحوار
                    </button>
                  </div>

                  {/* Messages Flow */}
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {consultationMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col space-y-1.5 ${
                          msg.role === "user" ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                            msg.role === "user"
                              ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-br-none shadow-md"
                              : "bg-zinc-900/90 border border-white/10 text-zinc-100 rounded-bl-none shadow-md"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>

                        {/* Interactive Clickable Option Pills from Assistant */}
                        {msg.role === "assistant" && msg.options && msg.options.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {msg.options.map((opt, oIdx) => (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => void handleSendConsultationReply(opt)}
                                disabled={consulting}
                                className="px-3 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 text-[11px] font-semibold text-cyan-300 transition-all flex items-center gap-1"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                                <span>{opt}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {consulting && (
                      <div className="flex items-center gap-2 text-xs text-cyan-400 p-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>المخرج الإبداعي يفكر في استراتيجية المحتوى واللقطات...</span>
                      </div>
                    )}
                  </div>

                  {/* Consultation Input & Final Approve Button */}
                  <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative flex-1 w-full">
                      <input
                        type="text"
                        value={consultationInput}
                        onChange={(e) => setConsultationInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && consultationInput.trim()) {
                            void handleSendConsultationReply(consultationInput);
                          }
                        }}
                        placeholder="أجب على أسئلة الوكيل أو اطلب تعديلاً معيناً..."
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-cyan-400/50"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleSendConsultationReply(consultationInput)}
                      disabled={consulting || !consultationInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold text-xs transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5 text-cyan-400" />
                      <span>إرسال ردك</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowConsultation(false);
                        void handleGenerate();
                      }}
                      disabled={generating}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 shrink-0"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>اعتماد الرؤية وبدء التوليد 🚀</span>
                    </button>
                  </div>
                </div>
              )}

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
                    <div className="flex items-center gap-1 p-1 bg-black/60 border border-white/10 rounded-2xl text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedMediaType("image")}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                          selectedMediaType === "image"
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>صورة سينمائية</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedMediaType("video")}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                          selectedMediaType === "video"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>فيديو سينمائي</span>
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail / Video Preview with Dynamic Aspect Ratio & Lightbox Controls */}
                  {(() => {
                    const aspectClass = selectedAspectRatio === "9:16"
                      ? "aspect-[9/16] max-h-[460px] w-auto mx-auto"
                      : selectedAspectRatio === "1:1"
                        ? "aspect-square max-h-[440px] w-auto mx-auto"
                        : selectedAspectRatio === "4:5"
                          ? "aspect-[4/5] max-h-[460px] w-auto mx-auto"
                          : "aspect-video w-full";

                    if (currentPost.mediaType === "video" && currentPost.videoUrl) {
                      return (
                        <div className={`rounded-2xl overflow-hidden border border-purple-500/30 relative bg-black shadow-2xl group ${aspectClass}`}>
                          <video
                            src={currentPost.videoUrl}
                            controls
                            autoPlay
                            loop
                            muted
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => setPreviewModalUrl({ url: currentPost.videoUrl!, type: "video", title: currentPost.topicPrompt })}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                              title="معاينة الفيديو بالحجم الكامل"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadMedia(currentPost.videoUrl!, "saad-studio-video")}
                              className="p-1.5 rounded-lg bg-purple-500/80 hover:bg-purple-500 text-white"
                              title="تنزيل الفيديو"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    if (currentPost.imageUrl) {
                      return (
                        <div className={`rounded-2xl overflow-hidden border border-white/15 relative bg-black shadow-2xl group ${aspectClass}`}>
                          <img
                            src={currentPost.imageUrl}
                            alt="Social post visual"
                            className="w-full h-full object-contain cursor-pointer"
                            onClick={() => setPreviewModalUrl({ url: currentPost.imageUrl!, type: "image", title: currentPost.topicPrompt })}
                          />
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] text-zinc-300 border border-white/10 font-mono">
                            {currentPost.imageModel || "nano-banana-pro"}
                          </div>
                          {/* Hover Action Bar */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 pointer-events-none group-hover:pointer-events-auto">
                            <button
                              type="button"
                              onClick={() => setPreviewModalUrl({ url: currentPost.imageUrl!, type: "image", title: currentPost.topicPrompt })}
                              className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-transform hover:scale-105"
                              title="تكبير ومعاينة الصورة بالحجم الكامل"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadMedia(currentPost.imageUrl!, "saad-studio-image")}
                              className="p-2.5 rounded-xl bg-cyan-500/80 hover:bg-cyan-500 backdrop-blur-md text-white transition-transform hover:scale-105"
                              title="تنزيل الصورة عالية الدقة"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(currentPost.imageUrl!);
                                setCopiedKey("img_url");
                                setTimeout(() => setCopiedKey(null), 2000);
                              }}
                              className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-transform hover:scale-105"
                              title="نسخ رابط الصورة"
                            >
                              {copiedKey === "img_url" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="rounded-2xl border border-dashed border-white/10 aspect-video flex flex-col items-center justify-center text-zinc-500 text-xs gap-2 bg-black/40">
                        <ImageIcon className="w-8 h-8 text-zinc-600" />
                        <span>اضغط على زر التوليد لصناعة المشهد السينمائي</span>
                      </div>
                    );
                  })()}

                  {/* Social Media Aspect Ratio Selector */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <span className="text-zinc-400 font-semibold text-xs">أبعاد المشهد (Aspect Ratio):</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: "16:9", label: "16:9 Landscape", sub: "يوتيوب، تويتر، لينكدإن" },
                        { id: "9:16", label: "9:16 Vertical", sub: "ريلز، تيك توك، ستوري" },
                        { id: "1:1", label: "1:1 Square", sub: "فيسبوك، انستغرام فييد" },
                        { id: "4:5", label: "4:5 Portrait", sub: "انستغرام بورتريه" },
                      ].map((ratio) => (
                        <button
                          key={ratio.id}
                          type="button"
                          onClick={() => setSelectedAspectRatio(ratio.id as any)}
                          className={`p-2 rounded-xl font-bold transition-all text-right flex flex-col ${
                            selectedAspectRatio === ratio.id
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                              : "text-zinc-400 hover:text-white bg-black/40 border border-white/5"
                          }`}
                        >
                          <span className="text-xs">{ratio.label}</span>
                          <span className="text-[9px] text-zinc-500 font-normal">{ratio.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Model Selector based on Media Type */}
                  {selectedMediaType === "image" ? (
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <span className="text-zinc-400 font-semibold text-xs">محرك توليد الصورة:</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedImageModel("nano-banana-pro")}
                          className={`p-2 rounded-xl font-bold transition-all text-center flex flex-col items-center gap-1 ${
                            selectedImageModel === "nano-banana-pro"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                              : "text-zinc-400 hover:text-white bg-black/40 border border-white/5"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[10px] leading-tight">Nano Banana Pro</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedImageModel("grok-imagine")}
                          className={`p-2 rounded-xl font-bold transition-all text-center flex flex-col items-center gap-1 ${
                            selectedImageModel === "grok-imagine"
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                              : "text-zinc-400 hover:text-white bg-black/40 border border-white/5"
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-[10px] leading-tight">Grok Imagine 2.0</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedImageModel("gpt-image-2")}
                          className={`p-2 rounded-xl font-bold transition-all text-center flex flex-col items-center gap-1 ${
                            selectedImageModel === "gpt-image-2"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                              : "text-zinc-400 hover:text-white bg-black/40 border border-white/5"
                          }`}
                        >
                          <Bot className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] leading-tight">GPT-Image-2</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-2 border-t border-purple-500/20">
                      <span className="text-purple-300 font-semibold text-xs">محرك توليد الفيديو:</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedVideoModel("kling-3.0/video")}
                          className={`p-2 rounded-xl font-bold transition-all text-center flex flex-col items-center gap-1 ${
                            selectedVideoModel === "kling-3.0/video"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                              : "text-zinc-400 hover:text-white bg-black/40 border border-white/5"
                          }`}
                        >
                          <Film className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-[10px] leading-tight">Kling 3.0 Pro</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedVideoModel("bytedance/seedance-2")}
                          className={`p-2 rounded-xl font-bold transition-all text-center flex flex-col items-center gap-1 ${
                            selectedVideoModel === "bytedance/seedance-2"
                              ? "bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm"
                              : "text-zinc-400 hover:text-white bg-black/40 border border-white/5"
                          }`}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400" />
                          <span className="text-[10px] leading-tight">Seedance 2</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedVideoModel("google/gemini-omni-flash")}
                          className={`p-2 rounded-xl font-bold transition-all text-center flex flex-col items-center gap-1 ${
                            selectedVideoModel === "google/gemini-omni-flash"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm"
                              : "text-zinc-400 hover:text-white bg-black/40 border border-white/5"
                          }`}
                        >
                          <Globe className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-[10px] leading-tight">Omni Flash</span>
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
                      <span>رفع وسائط</span>
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
                        {generatingImg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 text-cyan-400" />}
                        <span>إعادة توليد الصورة</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateVideoOnly}
                        disabled={generatingVid}
                        className="px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-500/10"
                      >
                        {generatingVid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-purple-400" />}
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
                    { id: "facebook", label: "Facebook", icon: FacebookIcon, color: "text-blue-400" },
                    { id: "twitter", label: "X / Twitter", icon: TwitterXIcon, color: "text-white" },
                    { id: "instagram", label: "Instagram", icon: InstagramIcon, color: "text-pink-400" },
                    { id: "linkedin", label: "LinkedIn", icon: LinkedInIcon, color: "text-sky-400" },
                    { id: "telegram", label: "Telegram", icon: TelegramIcon, color: "text-cyan-400" },
                    { id: "tiktok", label: "TikTok", icon: TikTokIcon, color: "text-rose-400" },
                  ].map((tab) => {
                    const IconComp = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActivePlatform(tab.id as any)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          activePlatform === tab.id
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                            : "text-zinc-400 hover:text-white bg-transparent"
                        }`}
                      >
                        <IconComp className={`w-3.5 h-3.5 ${tab.color}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
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
                    {(() => {
                      const prevAspect = selectedAspectRatio === "9:16"
                        ? "aspect-[9/16] max-h-[460px] w-auto mx-auto"
                        : selectedAspectRatio === "1:1"
                          ? "aspect-square max-h-[420px] w-auto mx-auto"
                          : selectedAspectRatio === "4:5"
                            ? "aspect-[4/5] max-h-[460px] w-auto mx-auto"
                            : "aspect-video w-full";

                      if (currentPost.mediaType === "video" && currentPost.videoUrl) {
                        return (
                          <div className={`rounded-2xl overflow-hidden border border-zinc-700 bg-black ${prevAspect}`}>
                            <video src={currentPost.videoUrl} controls autoPlay loop muted className="w-full h-full object-contain" />
                          </div>
                        );
                      }
                      if (currentPost.imageUrl) {
                        return (
                          <div
                            className={`rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-900 cursor-pointer ${prevAspect}`}
                            onClick={() => setPreviewModalUrl({ url: currentPost.imageUrl!, type: "image", title: currentPost.topicPrompt })}
                          >
                            <img src={currentPost.imageUrl} alt="Facebook visual" className="w-full h-full object-contain" />
                          </div>
                        );
                      }
                      return null;
                    })()}

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

                    {(() => {
                      const prevAspect = selectedAspectRatio === "9:16"
                        ? "aspect-[9/16] max-h-[460px] w-auto mx-auto"
                        : selectedAspectRatio === "1:1"
                          ? "aspect-square max-h-[420px] w-auto mx-auto"
                          : selectedAspectRatio === "4:5"
                            ? "aspect-[4/5] max-h-[460px] w-auto mx-auto"
                            : "aspect-video w-full";

                      if (currentPost.mediaType === "video" && currentPost.videoUrl) {
                        return (
                          <div className={`rounded-2xl overflow-hidden border border-zinc-800 bg-black ${prevAspect}`}>
                            <video src={currentPost.videoUrl} controls autoPlay loop muted className="w-full h-full object-contain" />
                          </div>
                        );
                      }
                      if (currentPost.imageUrl) {
                        return (
                          <div
                            className={`rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer ${prevAspect}`}
                            onClick={() => setPreviewModalUrl({ url: currentPost.imageUrl!, type: "image", title: currentPost.topicPrompt })}
                          >
                            <img src={currentPost.imageUrl} alt="X post visual" className="w-full h-full object-contain" />
                          </div>
                        );
                      }
                      return null;
                    })()}

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
                    {(() => {
                      const prevAspect = selectedAspectRatio === "9:16"
                        ? "aspect-[9/16] max-h-[460px] w-auto mx-auto"
                        : selectedAspectRatio === "4:5"
                          ? "aspect-[4/5] max-h-[460px] w-auto mx-auto"
                          : "aspect-square w-full";

                      if (currentPost.mediaType === "video" && currentPost.videoUrl) {
                        return (
                          <div className={`bg-black w-full overflow-hidden ${prevAspect}`}>
                            <video src={currentPost.videoUrl} controls autoPlay loop muted className="w-full h-full object-contain" />
                          </div>
                        );
                      }
                      if (currentPost.imageUrl) {
                        return (
                          <div
                            className={`bg-zinc-900 w-full overflow-hidden cursor-pointer ${prevAspect}`}
                            onClick={() => setPreviewModalUrl({ url: currentPost.imageUrl!, type: "image", title: currentPost.topicPrompt })}
                          >
                            <img src={currentPost.imageUrl} alt="Instagram visual" className="w-full h-full object-contain" />
                          </div>
                        );
                      }
                      return (
                        <div className="aspect-square bg-zinc-900 flex items-center justify-center text-zinc-600 text-xs">
                          No media selected
                        </div>
                      );
                    })()}

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

        {/* TAB 2: VIRAL STORYBOARD & AI SHOWCASE STUDIO */}
        {activeTab === "storyboard" && (
          <div className="space-y-6">
            {/* Top Prompt Command Box */}
            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-950 to-[#0d0d1d] p-5 md:p-6 shadow-2xl backdrop-blur-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-fuchsia-400 uppercase tracking-wider">
                  <Clapperboard className="w-4 h-4" />
                  <span>توجيه مخرج الستوري بورد (AI Storyboard & Showcase Director)</span>
                </div>

                {/* Language Switcher */}
                <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 rounded-xl p-1 text-xs">
                  <Languages className="w-3.5 h-3.5 text-fuchsia-400 ml-1.5" />
                  <button
                    type="button"
                    onClick={() => setSelectedLanguage("ar")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      selectedLanguage === "ar"
                        ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30"
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
                        ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30"
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
                  value={storyboardPrompt}
                  onChange={(e) => setStoryboardPrompt(e.target.value)}
                  placeholder="اكتب فكرة الستوري بورد أو الاستعراض (مثال: تحول سينمائي من النهار إلى الليل لمطور يعمل على لابتوب في سعد ستوديو مع إضاءة نيون سايبربانك)..."
                  className="w-full rounded-2xl border border-white/10 bg-black/50 p-4 text-xs md:text-sm text-white placeholder-zinc-500 outline-none focus:border-fuchsia-400/50 transition-colors leading-relaxed"
                />
              </div>

              {/* Storyboard Template Selector (4 Visual Formats) */}
              <div className="space-y-2 pt-1">
                <span className="text-zinc-400 font-bold text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span>اختر نمط القالب الفيروسي (Showcase Template):</span>
                </span>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {[
                    {
                      id: "day-night",
                      title: "تحول النهار إلى الليل",
                      desc: "مشهدان متطابقان بالكاميرا (نهار / ليل)",
                      preset: "تحول سينمائي من النهار إلى الليل في سعد ستوديو",
                    },
                    {
                      id: "car-call",
                      title: "مكالمة السيارة وشاشة الهاتف",
                      desc: "تصوير داخل سيارة مع شاشة خضراء",
                      preset: "مكالمة فيديو داخل سيارة متحركة مع شاشة هاتف خضراء",
                    },
                    {
                      id: "character-3d",
                      title: "تفكيك شخصية 3D",
                      desc: "استعراض الشخصية والطبقات وتفكيك الغرفة",
                      preset: "تفكيك شخصية 3D كرتونية مع خلفية الغرفة",
                    },
                    {
                      id: "workflow-battle",
                      title: "سير عمل ومقارنة النماذج",
                      desc: "مقارنة صورة Nano Banana مع فيديو Kling",
                      preset: "سير عمل Kling 3.0 مع Nano Banana السينمائي",
                    },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setSelectedSbTemplate(tpl.id as any);
                        setStoryboardPrompt(tpl.preset);
                      }}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col gap-1 ${
                        selectedSbTemplate === tpl.id
                          ? "bg-fuchsia-500/20 border-fuchsia-500/50 text-white shadow-lg shadow-fuchsia-500/15 ring-1 ring-fuchsia-400/40"
                          : "bg-black/40 border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="text-xs font-bold text-fuchsia-300">{tpl.title}</span>
                      <span className="text-[10px] text-zinc-400 leading-tight">{tpl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Selectors for Storyboard Frames & Video */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                {/* 1. Frames Image Model */}
                <div className="space-y-1.5">
                  <span className="text-zinc-400 font-semibold text-xs flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>محرك توليد الكوادر المرجعية (Frames Engine):</span>
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "nano-banana-pro", label: "Nano Banana Pro", color: "text-amber-300", bg: "bg-amber-500/20 border-amber-500/40" },
                      { id: "grok-imagine", label: "Grok Imagine 2.0", color: "text-cyan-300", bg: "bg-cyan-500/20 border-cyan-500/40" },
                      { id: "gpt-image-2", label: "GPT-Image-2", color: "text-emerald-300", bg: "bg-emerald-500/20 border-emerald-500/40" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedSbImageModel(m.id as any)}
                        className={`p-2 rounded-xl text-center text-xs font-bold transition-all border ${
                          selectedSbImageModel === m.id
                            ? `${m.bg} ${m.color} shadow-sm`
                            : "bg-black/40 border-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <span className="text-[10px] block truncate">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Video Model Engine */}
                <div className="space-y-1.5">
                  <span className="text-zinc-400 font-semibold text-xs flex items-center gap-1">
                    <Film className="w-3.5 h-3.5 text-purple-400" />
                    <span>محرك إخراج فيديو الستوري بورد (Video Engine):</span>
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "kling-3.0/video", label: "Kling 3.0 Pro", color: "text-purple-300", bg: "bg-purple-500/20 border-purple-500/40" },
                      { id: "bytedance/seedance-2", label: "Seedance 2 Turbo", color: "text-pink-300", bg: "bg-pink-500/20 border-pink-500/40" },
                      { id: "google/gemini-omni-flash", label: "Gemini Omni Flash", color: "text-blue-300", bg: "bg-blue-500/20 border-blue-500/40" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedSbVideoModel(m.id as any)}
                        className={`p-2 rounded-xl text-center text-xs font-bold transition-all border ${
                          selectedSbVideoModel === m.id
                            ? `${m.bg} ${m.color} shadow-sm`
                            : "bg-black/40 border-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <span className="text-[10px] block truncate">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Theme Selector */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5 bg-black/50 border border-white/10 rounded-xl p-1 text-[10px]">
                  <span className="text-zinc-400 font-bold px-1.5 flex items-center gap-1">
                    <Palette className="w-3 h-3 text-fuchsia-400" />
                    <span>الثيم البصري (Theme):</span>
                  </span>
                  {[
                    { id: "cyberpunk", label: "🌌 سايبربانك" },
                    { id: "luxury-gold", label: "💎 ذهب ملكي" },
                    { id: "hologram", label: "🚀 هولوجرام" },
                    { id: "cinema-master", label: "🎬 سينما ماستر" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedSbTheme(t.id as any);
                        setCurrentStoryboard((prev) => ({ ...prev, theme: t.id as any }));
                      }}
                      className={`px-2 py-1 rounded-lg font-bold transition-all ${
                        selectedSbTheme === t.id
                          ? "bg-fuchsia-500/25 text-fuchsia-300 border border-fuchsia-500/40"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => handleGenerateStoryboard()}
                  disabled={generatingStoryboard}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-600 hover:from-fuchsia-400 hover:to-indigo-500 disabled:opacity-40 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-500/25 transition-all"
                >
                  {generatingStoryboard ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري توليد مشاهد الستوري بورد وتفكيك العناصر...</span>
                    </>
                  ) : (
                    <>
                      <Clapperboard className="w-4 h-4" />
                      <span>توليد ستوري بورد سينمائي متكامل ✨</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handlePublishDirect("facebook")}
                    disabled={publishing || !config.bufferAccessToken}
                    className="px-3.5 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>نشر لفيسبوك عبر Buffer 📘</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePublishDirect("telegram")}
                    disabled={publishing || !config.telegramBotToken}
                    className="px-3.5 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Send className="w-3.5 h-3.5 text-cyan-400" />
                    <span>تيليجرام ✈️</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Split Screen Studio: Left Controls & Script | Right 9:16 Luxury Storyboard Canvas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: STORYBOARD BLUEPRINT & ASSETS CONTROLS (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* 1. Title & Details */}
                <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-xl space-y-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-white font-bold text-xs flex items-center gap-2">
                      <Film className="w-4 h-4 text-fuchsia-400" />
                      <span>تفاصيل الستوري بورد والحملة</span>
                    </label>
                    <span className="text-[10px] font-mono text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded-full border border-fuchsia-500/20">
                      9:16 Canvas
                    </span>
                  </div>

                  <input
                    type="text"
                    value={currentStoryboard.title}
                    onChange={(e) => setCurrentStoryboard({ ...currentStoryboard, title: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-white font-bold text-xs outline-none focus:border-fuchsia-400/50"
                  />

                  {/* Camera & Lighting Parameters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-bold text-[10px] uppercase">إعدادات الكاميرا (Camera)</label>
                      <input
                        type="text"
                        value={currentStoryboard.promptBlueprint.camera}
                        onChange={(e) =>
                          setCurrentStoryboard({
                            ...currentStoryboard,
                            promptBlueprint: { ...currentStoryboard.promptBlueprint, camera: e.target.value },
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-zinc-200 font-mono text-[11px] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-bold text-[10px] uppercase">الإضاءة والأجواء (Lighting)</label>
                      <input
                        type="text"
                        value={currentStoryboard.promptBlueprint.lighting}
                        onChange={(e) =>
                          setCurrentStoryboard({
                            ...currentStoryboard,
                            promptBlueprint: { ...currentStoryboard.promptBlueprint, lighting: e.target.value },
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-zinc-200 font-mono text-[11px] outline-none"
                      />
                    </div>
                  </div>

                  {/* Full Blueprint Text */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-zinc-400 font-bold text-[10px] uppercase">البرومبت السينمائي الكامل (Blueprint Prompt)</label>
                      <button
                        type="button"
                        onClick={handleCopyBlueprint}
                        className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300 font-bold flex items-center gap-1"
                      >
                        {copiedKey === "sb_blueprint" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === "sb_blueprint" ? "تم النسخ!" : "نسخ البرومبت"}</span>
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={currentStoryboard.promptBlueprint.fullText}
                      onChange={(e) =>
                        setCurrentStoryboard({
                          ...currentStoryboard,
                          promptBlueprint: { ...currentStoryboard.promptBlueprint, fullText: e.target.value },
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-fuchsia-200 font-mono text-xs outline-none focus:border-fuchsia-400/50 leading-relaxed resize-y"
                    />
                  </div>
                </div>

                {/* 2. Video Model & Video Generator Card */}
                <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-xl space-y-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-white font-bold text-xs flex items-center gap-2">
                      <VideoIcon className="w-4 h-4 text-purple-400" />
                      <span>فيديو الستوري بورد النهائي ({currentStoryboard.video.modelBadge})</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateSbVideo}
                      disabled={generatingSbVideo}
                      className="px-3 py-1 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center gap-1.5 hover:bg-purple-500/30 transition-all"
                    >
                      {generatingSbVideo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-purple-400" />}
                      <span>توليد فيديو {currentStoryboard.video.modelBadge}</span>
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={currentStoryboard.video.prompt}
                    onChange={(e) =>
                      setCurrentStoryboard({
                        ...currentStoryboard,
                        video: { ...currentStoryboard.video, prompt: e.target.value },
                      })
                    }
                    placeholder="برومبت حركة الفيديو..."
                    className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-zinc-300 font-mono text-xs outline-none leading-relaxed"
                  />
                </div>

                {/* 3. Viral Caption & Hashtags */}
                <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-xl space-y-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-white font-bold text-xs flex items-center gap-2">
                      <Flame className="w-4 h-4 text-rose-400" />
                      <span>الكابشن الفيروسي (Reels & TikTok Caption)</span>
                    </label>
                    <span className="text-[10px] text-zinc-500">جاهز للنسخ</span>
                  </div>

                  <textarea
                    rows={3}
                    value={currentStoryboard.captionText}
                    onChange={(e) => setCurrentStoryboard({ ...currentStoryboard, captionText: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-zinc-200 text-xs outline-none leading-relaxed"
                  />

                  <div className="flex flex-wrap gap-1 text-cyan-400 text-xs font-mono">
                    {currentStoryboard.hashtags.map((tag, i) => (
                      <span key={i} className="bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const copyStr = `${currentStoryboard.captionText}\n\n${currentStoryboard.hashtags.join(" ")}\n\nPrompt Blueprint:\n${currentStoryboard.promptBlueprint.fullText}`;
                        navigator.clipboard.writeText(copyStr);
                        setCopiedKey("sb_full_caption");
                        setTimeout(() => setCopiedKey(null), 2500);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-zinc-200 font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      {copiedKey === "sb_full_caption" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                      <span>{copiedKey === "sb_full_caption" ? "تم نسخ المحتوى والهاشتاغات!" : "نسخ الكابشن والبرومبت"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: THE LUXURY VERTICAL 9:16 STORYBOARD CANVAS (7 cols) */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="w-full flex items-center justify-between pb-3 px-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-fuchsia-400" />
                    <span className="text-sm font-bold text-white">معاينة القالب العمودي الفاخر (9:16 Vertical Storyboard)</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full border bg-black/60 text-fuchsia-300 border-fuchsia-500/30 shadow-sm">
                    {currentStoryboard.theme.toUpperCase()} THEME
                  </span>
                </div>

                {/* THE 9:16 VERTICAL CONTAINER */}
                <div
                  className={`w-full max-w-[460px] rounded-[36px] p-4 sm:p-5 text-white shadow-2xl space-y-3.5 font-sans relative overflow-hidden transition-all duration-300 ${
                    currentStoryboard.theme === "cyberpunk"
                      ? "bg-[#090a12] border-2 border-fuchsia-500/40 shadow-fuchsia-500/10 ring-1 ring-cyan-500/30"
                      : currentStoryboard.theme === "luxury-gold"
                      ? "bg-[#060913] border-2 border-amber-400/40 shadow-amber-500/15"
                      : currentStoryboard.theme === "hologram"
                      ? "bg-[#040814] border-2 border-cyan-500/40 shadow-cyan-500/15 ring-1 ring-emerald-500/30"
                      : "bg-[#000000] border-2 border-rose-500/40 shadow-rose-500/15"
                  }`}
                >
                  {/* CARD 1: TOP MAIN VIDEO PLAYER */}
                  <div className="rounded-2xl overflow-hidden border border-white/15 bg-black/80 relative aspect-video shadow-lg group">
                    {currentStoryboard.video.url ? (
                      <video
                        src={currentStoryboard.video.url}
                        controls
                        autoPlay
                        loop
                        muted
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => currentStoryboard.video.url && setPreviewModalUrl({ url: currentStoryboard.video.url, type: "video", title: currentStoryboard.title })}
                      />
                    ) : (
                      <div className="w-full h-full relative">
                        <img
                          src={currentStoryboard.referenceFrames.frame2.url || currentStoryboard.referenceFrames.frame1.url}
                          alt="Video Preview Plate"
                          className="w-full h-full object-cover brightness-75 cursor-pointer"
                          onClick={() => {
                            const fallbackUrl = currentStoryboard.referenceFrames.frame2.url || currentStoryboard.referenceFrames.frame1.url;
                            if (fallbackUrl) setPreviewModalUrl({ url: fallbackUrl, type: "image", title: currentStoryboard.title });
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 p-4 text-center">
                          <button
                            type="button"
                            onClick={handleGenerateSbVideo}
                            disabled={generatingSbVideo}
                            className="px-4 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 backdrop-blur-md transition-all"
                          >
                            {generatingSbVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                            <span>توليد فيديو {selectedSbVideoModel.includes("kling") ? "Kling 3.0 Pro" : selectedSbVideoModel.includes("seedance") ? "Seedance 2 Turbo" : "Omni Flash"}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Top-Left / Bottom-Left Model Badge */}
                    <div className="absolute bottom-2.5 left-2.5 px-3 py-1 rounded-lg bg-black/80 border border-white/20 text-[11px] font-bold text-white backdrop-blur-md shadow-md flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                      <span>{selectedSbVideoModel.includes("kling") ? "Kling 3.0 Pro" : selectedSbVideoModel.includes("seedance") ? "Seedance 2 Turbo" : "Omni Flash"}</span>
                    </div>

                    {/* Hover Zoom & Download */}
                    {currentStoryboard.video.url && (
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/70 backdrop-blur-md p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => currentStoryboard.video.url && setPreviewModalUrl({ url: currentStoryboard.video.url, type: "video", title: currentStoryboard.title })}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                          title="تكبير ومعاينة"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => currentStoryboard.video.url && handleDownloadMedia(currentStoryboard.video.url, "storyboard-video")}
                          className="p-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-white"
                          title="تنزيل الفيديو"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* CARD 2: DYNAMIC COMPARISON REFERENCE FRAMES ACCORDING TO TEMPLATE */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Frame 1 */}
                    <div className="rounded-2xl overflow-hidden border border-white/15 bg-black/60 relative aspect-[4/3] shadow-md group">
                      <img
                        src={currentStoryboard.referenceFrames.frame1.url}
                        alt="Frame 1 Plate"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => currentStoryboard.referenceFrames.frame1.url && setPreviewModalUrl({ url: currentStoryboard.referenceFrames.frame1.url, type: "image", title: "Frame 1" })}
                      />
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                        <span className="px-2 py-0.5 rounded-md bg-black/80 border border-white/10 text-[9px] font-bold text-cyan-300 backdrop-blur-md">
                          {selectedSbTemplate === "day-night"
                            ? "☀️ كادر النهار (Daylight)"
                            : selectedSbTemplate === "car-call"
                            ? "🚗 داخل السيارة (In-Car)"
                            : selectedSbTemplate === "character-3d"
                            ? "🧩 الشخصية (Character)"
                            : "🍌 Nano Banana Pro"}
                        </span>
                      </div>
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => currentStoryboard.referenceFrames.frame1.url && setPreviewModalUrl({ url: currentStoryboard.referenceFrames.frame1.url, type: "image", title: "Frame 1" })}
                          className="p-1 rounded-lg bg-black/70 border border-white/20 text-white"
                          title="معاينة وتكبير"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerateSbFrame("frame1")}
                          disabled={generatingSbFrame1}
                          title="إعادة توليد الإطار 1"
                          className="p-1 rounded-lg bg-black/70 border border-white/20 text-white"
                        >
                          <RefreshCw className={`w-3 h-3 ${generatingSbFrame1 ? "animate-spin text-cyan-400" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {/* Frame 2 */}
                    <div className="rounded-2xl overflow-hidden border border-white/15 bg-black/60 relative aspect-[4/3] shadow-md group">
                      <img
                        src={currentStoryboard.referenceFrames.frame2.url}
                        alt="Frame 2 Plate"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => currentStoryboard.referenceFrames.frame2.url && setPreviewModalUrl({ url: currentStoryboard.referenceFrames.frame2.url, type: "image", title: "Frame 2" })}
                      />
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                        <span className="px-2 py-0.5 rounded-md bg-black/80 border border-white/10 text-[9px] font-bold text-amber-300 backdrop-blur-md">
                          {selectedSbTemplate === "day-night"
                            ? "🌙 كادر الليل (Midnight)"
                            : selectedSbTemplate === "car-call"
                            ? "📱 شاشة خضراء (Green Screen)"
                            : selectedSbTemplate === "character-3d"
                            ? "🏠 الغرفة (Environment)"
                            : "⚡ Grok Imagine 2.0"}
                        </span>
                      </div>
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => currentStoryboard.referenceFrames.frame2.url && setPreviewModalUrl({ url: currentStoryboard.referenceFrames.frame2.url, type: "image", title: "Frame 2" })}
                          className="p-1 rounded-lg bg-black/70 border border-white/20 text-white"
                          title="معاينة وتكبير"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerateSbFrame("frame2")}
                          disabled={generatingSbFrame2}
                          title="إعادة توليد الإطار 2"
                          className="p-1 rounded-lg bg-black/70 border border-white/20 text-white"
                        >
                          <RefreshCw className={`w-3 h-3 ${generatingSbFrame2 ? "animate-spin text-amber-400" : ""}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CARD 3: THE PROMPT BLUEPRINT BOX */}
                  <div
                    className={`p-3.5 rounded-2xl border text-[11px] leading-relaxed font-mono shadow-inner space-y-1.5 relative ${
                      currentStoryboard.theme === "cyberpunk"
                        ? "bg-black/60 border-fuchsia-500/30 text-zinc-200"
                        : currentStoryboard.theme === "luxury-gold"
                        ? "bg-black/60 border-amber-500/30 text-amber-100"
                        : currentStoryboard.theme === "hologram"
                        ? "bg-black/60 border-cyan-500/30 text-cyan-100"
                        : "bg-zinc-950 border-rose-500/30 text-zinc-100"
                    }`}
                  >
                    <p className="line-clamp-4 select-all">{currentStoryboard.promptBlueprint.fullText}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px] text-zinc-400">
                      <span>Camera: {currentStoryboard.promptBlueprint.camera}</span>
                      <button
                        type="button"
                        onClick={handleCopyBlueprint}
                        className="text-fuchsia-400 hover:text-white font-bold flex items-center gap-1"
                      >
                        {copiedKey === "sb_blueprint" ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        <span>{copiedKey === "sb_blueprint" ? "Copied" : "Copy Prompt"}</span>
                      </button>
                    </div>
                  </div>

                  {/* CARD 4: ASSETS BREAKDOWN (CHARACTER & ROOM) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Character Asset */}
                    <div className="rounded-2xl overflow-hidden border border-white/15 bg-black/50 relative aspect-[4/3] shadow-md group">
                      <img
                        src={currentStoryboard.assets.character.url}
                        alt="Character Asset"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => currentStoryboard.assets.character.url && setPreviewModalUrl({ url: currentStoryboard.assets.character.url, type: "image", title: currentStoryboard.assets.character.label })}
                      />
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/80 border border-white/15 text-[9px] font-bold text-white">
                        {currentStoryboard.assets.character.label}
                      </div>
                    </div>

                    {/* Room Environment Asset */}
                    <div className="rounded-2xl overflow-hidden border border-white/15 bg-black/50 relative aspect-[4/3] shadow-md group">
                      <img
                        src={currentStoryboard.assets.environment.url}
                        alt="Room Asset"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => currentStoryboard.assets.environment.url && setPreviewModalUrl({ url: currentStoryboard.assets.environment.url, type: "image", title: currentStoryboard.assets.environment.label })}
                      />
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/80 border border-white/15 text-[9px] font-bold text-white">
                        {currentStoryboard.assets.environment.label}
                      </div>
                    </div>
                  </div>

                  {/* BRAND WATERMARK FOOTER */}
                  <div className="pt-2 text-center border-t border-white/10 flex items-center justify-center gap-2 text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
                    <Image src="/logo-saad.png?v=5" alt="Saad Studio" width={14} height={14} unoptimized />
                    <span className="font-bold text-white">STORYBOARD</span>
                    <span>•</span>
                    <span className="text-cyan-400 font-bold">SAAD STUDIO AI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SAVED STORYBOARDS GALLERY */}
            {storyboardsHistory.length > 0 && (
              <div className="space-y-3 pt-6 border-t border-white/10">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-fuchsia-400" />
                  <span>معرض الستوري بورد المحفوظ ({storyboardsHistory.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {storyboardsHistory.map((sb) => (
                    <div
                      key={sb.id}
                      className="rounded-3xl border border-white/10 bg-zinc-950/70 p-4 space-y-3 hover:border-fuchsia-500/40 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="rounded-xl overflow-hidden aspect-video bg-black/40 border border-white/10 relative">
                          <img
                            src={sb.referenceFrames.frame2.url || sb.referenceFrames.frame1.url}
                            alt="Storyboard Preview"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/80 text-[9px] font-bold text-fuchsia-300 border border-white/10">
                            {sb.video.modelBadge}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-white line-clamp-1">{sb.title}</h4>
                        <p className="text-[11px] text-zinc-400 line-clamp-2">{sb.promptBlueprint.fullText}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => setCurrentStoryboard(sb)}
                          className="text-[11px] text-fuchsia-400 hover:text-fuchsia-300 font-bold"
                        >
                          عرض وتعديل ➜
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStoryboard(sb.id)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: POSTS HISTORY */}
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

        {/* FULLSCREEN LIGHTBOX & MEDIA PREVIEW MODAL */}
        {previewModalUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setPreviewModalUrl(null)}
          >
            <div
              className="relative max-w-5xl w-full max-h-[92vh] flex flex-col items-center gap-3 bg-zinc-950/90 border border-white/15 p-4 rounded-3xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex items-center justify-between px-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white truncate max-w-md">
                    {previewModalUrl.title || "معاينة الوسائط عالية الدقة"}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 uppercase">
                    {selectedAspectRatio}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadMedia(previewModalUrl.url, "saad-studio-hd")}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تنزيل عالي الدقة HD</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl(null)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white text-xs font-bold px-3 transition-colors"
                  >
                    إغلاق ✕
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl max-h-[78vh] w-full flex items-center justify-center bg-black/60 p-2">
                {previewModalUrl.type === "video" ? (
                  <video src={previewModalUrl.url} controls autoPlay className="max-h-[72vh] max-w-full w-auto rounded-xl object-contain shadow-2xl" />
                ) : (
                  <img src={previewModalUrl.url} alt="HD preview" className="max-h-[72vh] max-w-full w-auto object-contain rounded-xl shadow-2xl" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
