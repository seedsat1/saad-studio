"use client";

export const dynamic = "force-dynamic";

import React, { useState, useRef, DragEvent } from "react";
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
  FileAudio,
  FileText,
  UploadCloud,
} from "lucide-react";
import {
  LLM_BRAIN_MODELS,
  HOOK_GENRES,
  HOOK_VIDEO_MODELS,
} from "@/lib/hook-studio-config";
import { useLanguage } from "@/lib/use-language";
import { useUser } from "@clerk/nextjs";

interface AttachedFile {
  id: string;
  name: string;
  type: "image" | "video" | "audio" | "file";
  url: string;
  file?: File;
}

interface ChatMessage {
  id: string;
  sender: "agent" | "user";
  text: string;
  timestamp: string;
  isSystem?: boolean;
  attachments?: AttachedFile[];
  generatedHook?: {
    phrase: string;
    angle: string;
    genre: string;
    duration: string;
    treatment?: string;
    scenes: Array<{
      id: number;
      title?: string;
      shotType?: string;
      lens?: string;
      cameraAngle?: string;
      movement?: string;
      lighting?: string;
      description?: string;
      audio?: string;
      prompt?: string;
      url?: string;
    }>;
    videoUrl: string;
    modelRecommendation?: string;
  };
  videoTask?: {
    status: "processing" | "completed" | "failed";
    taskId?: string;
    videoUrl?: string;
    error?: string;
  };
  imageTask?: {
    status: "processing" | "completed" | "failed";
    imageUrls?: string[];
    error?: string;
  };
}

const readUploadError = async (response: Response) => {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") return data.error;
  } catch {
    // Ignore and use the generic message below.
  }
  return `Upload failed with status ${response.status}`;
};

const uploadAttachedFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const uploadRes = await fetch("/api/media/upload", {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    throw new Error(await readUploadError(uploadRes));
  }

  const uploadData = await uploadRes.json();
  if (typeof uploadData?.publicUrl !== "string" || !uploadData.publicUrl.trim()) {
    throw new Error("Upload response did not contain publicUrl");
  }

  return uploadData.publicUrl as string;
};

const normalizeHookPrompt = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[!?.؟،,؛:]+/g, "")
    .replace(/\s+/g, " ");

const isArabicText = (value: string) => /[\u0600-\u06ff]/.test(value);

const formatHookStudioDirectorReply = ({
  isAr,
  hookText,
  angle,
  genre,
  duration,
  treatment,
  scenes,
  recommendedModel,
}: {
  isAr: boolean;
  hookText: string;
  angle: string;
  genre: string;
  duration: string;
  treatment: string;
  scenes: Array<{
    title?: string;
    shotType?: string;
    lens?: string;
    cameraAngle?: string;
    movement?: string;
    lighting?: string;
    description?: string;
    audio?: string;
    prompt?: string;
    id?: number;
  }>;
  recommendedModel: string;
}) => {
  const safeScenes = scenes.slice(0, 4);
  if (isAr) {
    return [
      `🎬 الهوك: "${hookText}"`,
      "",
      `🎯 زاوية المخرج: ${angle}`,
      `🎭 نوع الإنتاج: ${genre}`,
      `⏱️ مدة اللقطة: ${duration}`,
      "",
      `📝 المعالجة الإخراجية: ${treatment}`,
      "",
      "📋 خطة لقطات الستوريبورد (Storyboard):",
      ...safeScenes.map((scene, index) => {
        const title = scene.title || `مشهد ${index + 1}`;
        const details = [
          scene.shotType ? `🎥 اللقطة: ${scene.shotType}` : null,
          scene.lens ? `🔍 العدسة: ${scene.lens}` : null,
          scene.cameraAngle ? `📐 زاوية الكاميرا: ${scene.cameraAngle}` : null,
          scene.movement ? `⚙️ حركة الكاميرا: ${scene.movement}` : null,
          scene.lighting ? `💡 الإضاءة: ${scene.lighting}` : null,
          scene.description ? `📝 الوصف البصري: ${scene.description}` : null,
          scene.audio ? `🔊 هندسة الصوت: ${scene.audio}` : null,
          scene.prompt ? `✨ برومبت التوليد: ${scene.prompt}` : null,
        ].filter(Boolean).map(line => `   ${line}`).join("\n");
        return `\n${index + 1}. 🎬 ${title}:\n${details}`;
      }),
      "",
      `💡 الموديل الموصى به: ${recommendedModel}`,
    ].join("\n");
  }

  return [
    `🎬 Hook: "${hookText}"`,
    "",
    `🎯 Director Angle: ${angle}`,
    `🎭 Production Genre: ${genre}`,
    `⏱️ Target Duration: ${duration}`,
    "",
    `📝 Director Treatment: ${treatment}`,
    "",
    "📋 Storyboard Shot List:",
    ...safeScenes.map((scene, index) => {
      const title = scene.title || `Scene ${index + 1}`;
      const details = [
        scene.shotType ? `🎥 Shot Type: ${scene.shotType}` : null,
        scene.lens ? `Lens: ${scene.lens}` : null,
        scene.cameraAngle ? `📐 Camera Angle: ${scene.cameraAngle}` : null,
        scene.movement ? `⚙️ Movement: ${scene.movement}` : null,
        scene.lighting ? `💡 Lighting: ${scene.lighting}` : null,
        scene.description ? `📝 Visual Description: ${scene.description}` : null,
        scene.audio ? `🔊 Sound Design: ${scene.audio}` : null,
        scene.prompt ? `✨ Generation Prompt: ${scene.prompt}` : null,
      ].filter(Boolean).map(line => `   ${line}`).join("\n");
      return `\n${index + 1}. 🎬 ${title}:\n${details}`;
    }),
    "",
    `Recommended model: ${recommendedModel}`,
  ].join("\n");
};

const isCasualHookStudioMessage = (value: string, hasAttachments: boolean) => {
  const normalized = normalizeHookPrompt(value);
  if (!normalized) return false;

  const casualMessages = new Set([
    "اهلا",
    "أهلا",
    "اهلاً",
    "أهلاً",
    "هلا",
    "مرحبا",
    "السلام عليكم",
    "السلام عليكم ورحمة الله",
    "شلونك",
    "كيفك",
    "hi",
    "hello",
    "hey",
    "good morning",
    "good evening",
  ].map(normalizeHookPrompt));

  if (casualMessages.has(normalized)) return true;

  const generationTerms = [
    "hook",
    "video",
    "reel",
    "ad",
    "storyboard",
    "generate",
    "create",
    "make",
    "write",
    "فيديو",
    "هوك",
    "اعلان",
    "إعلان",
    "ريل",
    "ستوريبورد",
    "مشهد",
    "برومبت",
    "فكرة",
    "اكتب",
    "اكتبلي",
    "ولد",
    "ولّد",
    "انشئ",
    "أنشئ",
    "اصنع",
    "اعمل",
    "سوي",
  ].map(normalizeHookPrompt);

  const asksForGeneration = generationTerms.some((term) => normalized.includes(term));
  return !asksForGeneration && !hasAttachments && normalized.length <= 24;
};

const getMentionedUrl = (value: string) =>
  value.match(/https?:\/\/[^\s]+|www\.[^\s]+/i)?.[0]?.replace(/[),.،]+$/, "") || "";

const isAdvisoryHookStudioMessage = (value: string, hasAttachments: boolean) => {
  const normalized = normalizeHookPrompt(value);
  if (!normalized) return false;

  const asksForAdvice = [
    "ماذا تقترح",
    "شنو تقترح",
    "ما تقترح",
    "اقترح",
    "اقتراح",
    "رايك",
    "رأيك",
    "what do you suggest",
    "suggest",
    "recommend",
    "idea for",
  ].some((term) => normalized.includes(normalizeHookPrompt(term)));

  const hasCampaignContext =
    hasAttachments ||
    Boolean(getMentionedUrl(value)) ||
    ["موقعي", "موقع", "اعلان", "إعلان", "ad", "campaign", "website"].some((term) =>
      normalized.includes(normalizeHookPrompt(term)),
    );

  const asksForImmediateGeneration = [
    "ولد الفيديو",
    "ولّد الفيديو",
    "generate video",
    "render video",
    "ابدأ التوليد",
  ].some((term) => normalized.includes(normalizeHookPrompt(term)));

  return asksForAdvice && hasCampaignContext && !asksForImmediateGeneration;
};

export default function HookStudioPage() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const { user } = useUser();

  // Sidebar Configuration States
  const [selectedVideoModel, setSelectedVideoModel] = useState("seedance-2.0-pro");
  const [selectedThinkingModel, setSelectedThinkingModel] = useState("kimi-k3-pro");
  const [selectedDuration, setSelectedDuration] = useState("15s");
  const [selectedRatio, setSelectedRatio] = useState("16:9");
  const [selectedQuality, setSelectedQuality] = useState("1080p");
  const [generateAudio, setGenerateAudio] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState("advertising");
  const [selectedHookAngle, setSelectedHookAngle] = useState("brand-reveal");

  // Prompt Form State
  const [inputText, setInputText] = useState("");
  const [logoError, setLogoError] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{
    type: "image" | "video" | "audio";
    url: string;
    title?: string;
  } | null>(null);

  // Chat Feed Messages & latest storyboard state
  const [latestStoryboard, setLatestStoryboard] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "agent",
      isSystem: true,
      text: isAr
        ? "مرحباً! أنا عميل هوك ستوديو. أرسل لي فكرة الفيديو وسأولد لك هوك احترافي. اختر الموديلات وحدد الإعدادات من الشريط الجانبي."
        : "Hello! I am Hook Studio Agent. Send me your video concept and I will generate a professional hook. Choose models and set options in the sidebar.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
    {
      id: "user-demo",
      sender: "user",
      text: isAr
        ? "أريد هوك لفيديو عن منتج تقني جديد — سماعات ذكية بتقنية الذكاء الاصطناعي تتكيف مع مزاجك"
        : "I want a video hook for a new tech product — smart AI headphones that adapt to your mood",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      attachments: [
        {
          id: "demo-vid",
          name: "0716.mp4",
          type: "video",
          url: "https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4",
        },
      ],
    },
    {
      id: "agent-response-demo",
      sender: "agent",
      text: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      generatedHook: {
        phrase: isAr
          ? "\"ماذا لو أخبرتك أن سماعاتك تعرف مشاعرك قبل أن تعرفها أنت؟\""
          : "\"What if I told you your headphones know your feelings before you do?\"",
        angle: isAr ? "زاوية إخراجية" : "Director Angle",
        genre: isAr ? "سينمائي / تقني" : "Cinematic / Tech",
        duration: "15s",
        treatment: isAr
          ? "معالجة إخراجية تجريبية لمنتج تقني بنبرة سينمائية سريعة."
          : "Sample director treatment for a cinematic tech product spot.",
        scenes: [
          { id: 1, title: "Scene 1", prompt: "Opening product reveal." },
          { id: 2, title: "Scene 2", prompt: "User reaction and emotional beat." },
          { id: 3, title: "Scene 3", prompt: "Feature transformation moment." },
          { id: 4, title: "Scene 4", prompt: "Final call to action." },
        ],
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4",
        modelRecommendation: isAr
          ? "نوصي باستخدام Seedance 2.0 للحصول على معالجة سينمائية متعددة المراجع وثبات مذهل للألوان والتحكم بالمنتجات."
          : "We recommend using Seedance 2.0 for cinematic multi-reference processing and stunning color and product consistency.",
      },
    },
  ]);

  const getRecommendedModelDescription = (genre: string, text: string) => {
    const lowercaseText = text.toLowerCase();
    
    if (genre === "action" || lowercaseText.includes("أكشن") || lowercaseText.includes("حركة") || lowercaseText.includes("action")) {
      return isAr 
        ? "نوصي باستخدام Kling 3.0 للحصول على أفضل معالجة للمشاهد السريعة وتوليد حركة كاميرا أكشن واقعية." 
        : "We recommend using Kling 3.0 for the best handling of high-speed action sequences and realistic camera movements.";
    }
    
    if (genre === "scifi" || lowercaseText.includes("خيال علمي") || lowercaseText.includes("مستقبل") || lowercaseText.includes("scifi") || lowercaseText.includes("hologram")) {
      return isAr 
        ? "نوصي باستخدام Seedream 5.0 لإنتاج مؤثرات بصرية مذهلة وإضاءات نيون فائقة الدقة." 
        : "We recommend using Seedream 5.0 to produce breathtaking visual effects and high-fidelity neon lights.";
    }
    
    if (genre === "cinematic" || lowercaseText.includes("سينمائي") || lowercaseText.includes("epic")) {
      return isAr
        ? "نوصي باستخدام Seedance 2.0 للحصول على معالجة سينمائية متعددة المراجع وثبات مذهل للألوان."
        : "We recommend using Seedance 2.0 for cinematic multi-reference processing and stunning color consistency.";
    }
    
    return isAr
      ? "نوصي باستخدام Seedance 2.0 كخيار متوازن وممتاز للمشاهد الحوارية والقصصية العامة."
      : "We recommend using Seedance 2.0 as a balanced and excellent choice for narrative and general scenes.";
  };

  const activeVideoModelObj =
    HOOK_VIDEO_MODELS.find((m) => m.id === selectedVideoModel) || HOOK_VIDEO_MODELS[0];
  const activeGenreObj =
    HOOK_GENRES.find((g) => g.id === selectedGenre) || HOOK_GENRES[0];
  const isImageModel = activeVideoModelObj.durations[0] === 0;

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
    generatedHookHeader: isAr ? "🎬 الهوك المولد" : "🎬 Generated Video Hook",
    storyboardReady: isAr ? "● الاستوديو جاهز" : "● STORYBOARD READY",
    angleLabel: isAr ? "الزاوية" : "ANGLE",
    genreLabel: isAr ? "النوع" : "GENRE",
    durationLabel: isAr ? "المدة" : "DURATION",
    scenesDesc: isAr
      ? "خطة المشاهد جاهزة — راجع المعالجة ثم اضغط توليد الفيديو للبدء."
      : "Scene plan ready — review the director treatment, then generate the video.",
    sceneText: isAr ? "مشهد" : "Scene",
    btnGenerate: isAr ? "توليد الفيديو" : "Generate Video",
    btnRegenerate: isAr ? "إعادة التوليد" : "Regenerate Hook",
    inputDropdown: isAr ? "اسأل هوك ستوديو" : "Ask Hook Studio",
    badgeInstant: isAr ? "فوري" : "Instant",
    inputPlaceholder: isAr ? "اسأل هوك ستوديو..." : "Ask Hook Studio...",
    dragPromptText: isAr ? "اسحب وأفلت الملفات هنا (صور، فيديوهات، صوتيات)" : "Drag & drop files here (images, videos, audio)",
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (files: FileList) => {
    const newFiles: AttachedFile[] = [];
    const counts = {
      image: attachedFiles.filter((item) => item.type === "image").length,
      video: attachedFiles.filter((item) => item.type === "video").length,
      audio: attachedFiles.filter((item) => item.type === "audio").length,
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let type: AttachedFile["type"] = "file";
      if (file.type.startsWith("image/")) type = "image";
      else if (file.type.startsWith("video/")) type = "video";
      else if (file.type.startsWith("audio/")) type = "audio";
      else continue;

      const maxAllowed =
        type === "image"
          ? activeVideoModelObj.maxRefImages
          : type === "video"
            ? activeVideoModelObj.maxRefVideos
            : type === "audio"
              ? activeVideoModelObj.maxRefAudios
              : 0;

      if (maxAllowed <= 0 || counts[type] >= maxAllowed) continue;
      counts[type] += 1;

      newFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type,
        url: URL.createObjectURL(file),
        file,
      });
    }
    setAttachedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const getDirectorFallbackTreatment = (prompt: string) =>
    isArabicText(prompt)
      ? "معالجة إخراجية قصيرة تربط المرجع البصري برسالة الإعلان، وتحوّل الفكرة إلى افتتاحية قوية، لحظة إثبات، ثم دعوة واضحة للفعل."
      : "A concise director treatment that connects the visual reference to the campaign message, then moves from a strong opening to proof and a clear call to action.";

  const getFallbackScenes = (prompt: string) =>
    isArabicText(prompt)
      ? [
          { id: 1, title: "الافتتاحية", prompt: "لقطة قريبة للمرجع/الموديل مع إحساس بصري فاخر يثبت هوية الإعلان." },
          { id: 2, title: "المشكلة", prompt: "إظهار لحظة احتياج أو فضول عند الجمهور قبل تقديم الحل." },
          { id: 3, title: "الحل", prompt: "ظهور Saad Studio كأداة تحول الفكرة إلى إنتاج بصري جاهز." },
          { id: 4, title: "الدعوة", prompt: "نهاية واضحة بشعار الموقع ودعوة تجربة مباشرة." },
        ]
      : [
          { id: 1, title: "Opening", prompt: "Close visual reference shot that establishes a premium campaign identity." },
          { id: 2, title: "Tension", prompt: "Show the audience need or curiosity before the solution appears." },
          { id: 3, title: "Solution", prompt: "Reveal Saad Studio turning the idea into polished production." },
          { id: 4, title: "CTA", prompt: "End with the site brand and a clear try-it-now action." },
        ];

  const getCasualReply = (prompt: string) =>
    isArabicText(prompt)
      ? "أهلاً بك. اكتب فكرة الفيديو أو المنتج أو نوع الهوك الذي تريده، وسأجهز لك هوك وستوريبورد مناسب."
      : "Hello. Send me the video idea, product, or hook direction you want, and I will prepare a focused hook and storyboard.";

  const getAdvisoryReply = (prompt: string, attachmentCount: number) => {
    const siteUrl = getMentionedUrl(prompt) || "saadstudio.app";
    if (isArabicText(prompt)) {
      const referenceLine =
        attachmentCount > 0
          ? "اعتمد الصورة المرفقة كموديل/مرجع بصري ثابت في الإعلان."
          : "أضف صورة أو فيديو مرجعي حتى أثبت الهوية البصرية في الإعلان.";
      return [
        `اقتراحي لإعلان ${siteUrl}:`,
        "",
        "الفكرة الأقوى: إعلان قصير يبيّن أن المستخدم يدخل بفكرة بسيطة، ثم Saad Studio يحولها إلى فيديو/هوك جاهز خلال لحظات.",
        referenceLine,
        "",
        "هوك مناسب:",
        "“عندك فكرة؟ خلّي Saad Studio يحولها لإعلان جاهز قبل ما تضيع اللحظة.”",
        "",
        "السيناريو المقترح: لقطة افتتاحية قريبة للموديل/المرجع، بعدها ظهور واجهة الموقع، ثم نتائج فيديو سريعة، وفي النهاية دعوة واضحة: جرّب Saad Studio الآن.",
        "",
        "إذا تريد، اكتب: ولّد هذا الإعلان، وسأحوّله إلى هوك وستوريبورد قابل للتوليد.",
      ].join("\n");
    }

    return [
      `My suggestion for ${siteUrl}:`,
      "",
      "Use a short ad where the viewer starts with a simple idea, then Saad Studio turns it into a ready video hook in moments.",
      attachmentCount > 0
        ? "Use the attached image as the main visual/model reference."
        : "Add an image or video reference so the ad can keep a clear visual identity.",
      "",
      "Hook:",
      "“Got an idea? Let Saad Studio turn it into a ready ad before the moment is gone.”",
      "",
      "Storyboard: close opening shot with the reference, quick reveal of the site interface, fast generated-video results, then a call to action: Try Saad Studio now.",
      "",
      "Type: generate this ad, and I will turn it into a hook and storyboard ready for video generation.",
    ].join("\n");
  };

  // Poll video task status helper
  const pollVideoTaskStatus = (msgId: string, taskId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 60) {
        clearInterval(interval);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  text: isAr ? "❌ انتهت مهلة التوليد. يرجى المحاولة مرة أخرى." : "❌ Generation timed out. Please try again.",
                  videoTask: {
                    status: "failed",
                    error: "Timeout",
                  },
                }
              : m
          )
        );
        return;
      }

      try {
        const res = await fetch(`/api/video?taskId=${encodeURIComponent(taskId)}`);
        const data = await res.json();
        
        if (res.ok && data) {
          if (data.status === "completed" && data.outputs && data.outputs[0]) {
            clearInterval(interval);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId
                  ? {
                      ...m,
                      text: isAr ? "✨ تم توليد الفيديو بنجاح!" : "✨ Video generated successfully!",
                      videoTask: {
                        status: "completed",
                        videoUrl: data.outputs[0],
                      },
                    }
                  : m
              )
            );
          } else if (data.status === "failed") {
            clearInterval(interval);
            const errorMsg = data.error || (isAr ? "فشل توليد الفيديو من المزود" : "Provider failed to generate video");
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId
                  ? {
                      ...m,
                      text: `❌ ${errorMsg}`,
                      videoTask: {
                        status: "failed",
                        error: errorMsg,
                      },
                    }
                  : m
              )
            );
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 4000);
  };

  // Video execution handler (Triggered by button click or text command "نفذ")
  const executeStoryboardVideo = async (messageId: string, hookData: any) => {
    const taskIdTemp = Math.random().toString(36).substr(2, 9);
    const executionMsgId = `exec-${taskIdTemp}`;
    
    const executionMsg: ChatMessage = {
      id: executionMsgId,
      sender: "agent",
      text: isAr ? "جاري البدء في إنتاج وتوليد الفيديو..." : "Starting video generation...",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      videoTask: {
        status: "processing",
      }
    };
    
    setMessages((prev) => [...prev, executionMsg]);
    
    try {
      const res = await fetch("/api/hook-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: hookData.phrase || "Execute Storyboard",
          llmBrain: selectedThinkingModel,
          genre: selectedGenre,
          modelId: selectedVideoModel,
          duration: Number.parseInt(selectedDuration, 10),
          aspectRatio: selectedRatio,
          quality: selectedQuality,
          generateAudio,
          hookAngle: selectedHookAngle,
          scenePrompts: hookData.scenes,
          executeStoryboard: true,
          refImages: hookData.refImages || [],
          refVideos: hookData.refVideos || [],
          refAudios: hookData.refAudios || [],
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.taskId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === executionMsgId
              ? {
                  ...m,
                  text: isAr ? `جاري توليد وإنتاج الفيديو بالذكاء الاصطناعي... \nالموديل: ${data.modelUsed || activeVideoModelObj.name}` : `Generating video using AI... \nModel: ${data.modelUsed || activeVideoModelObj.name}`,
                  videoTask: {
                    status: "processing",
                    taskId: data.taskId,
                  },
                }
              : m
          )
        );
        pollVideoTaskStatus(executionMsgId, data.taskId);
      } else {
        const errorText = data.error || (isAr ? "فشل بدء توليد الفيديو" : "Failed to start video generation");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === executionMsgId
              ? {
                  ...m,
                  text: `❌ ${errorText}`,
                  videoTask: {
                    status: "failed",
                    error: errorText,
                  },
                }
              : m
          )
        );
      }
    } catch (err: any) {
      console.error(err);
      const errorText = err.message || (isAr ? "حدث خطأ أثناء الاتصال بالخادم" : "Error connecting to server");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === executionMsgId
            ? {
                ...m,
                text: `❌ ${errorText}`,
                videoTask: {
                  status: "failed",
                  error: errorText,
                },
              }
            : m
        )
      );
    }
  };

  // Image execution handler (Triggered by button click or text command "نفذ صور")
  const executeStoryboardImages = async (messageId: string, hookData: any) => {
    const taskIdTemp = Math.random().toString(36).substr(2, 9);
    const executionMsgId = `exec-img-${taskIdTemp}`;
    
    const executionMsg: ChatMessage = {
      id: executionMsgId,
      sender: "agent",
      text: isAr ? "جاري البدء في توليد صور المشاهد بالذكاء الاصطناعي..." : "Starting generation of scene images...",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      imageTask: {
        status: "processing",
      }
    };
    
    setMessages((prev) => [...prev, executionMsg]);
    
    try {
      const res = await fetch("/api/hook-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: hookData.phrase || "Execute Storyboard Stills",
          llmBrain: selectedThinkingModel,
          genre: selectedGenre,
          modelId: selectedVideoModel,
          duration: 0,
          aspectRatio: selectedRatio,
          quality: selectedQuality,
          generateAudio: false,
          hookAngle: selectedHookAngle,
          scenePrompts: hookData.scenes,
          executeStoryboard: true,
          executeAsImage: true,
          refImages: hookData.refImages || [],
          refVideos: hookData.refVideos || [],
          refAudios: hookData.refAudios || [],
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.imageUrls) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === executionMsgId
              ? {
                  ...m,
                  text: isAr ? "✅ اكتمل توليد صور المشاهد بنجاح!" : "✅ Scene images generated successfully!",
                  imageTask: {
                    status: "completed",
                    imageUrls: data.imageUrls,
                  },
                }
              : m
          )
        );
      } else {
        const errorText = data.error || (isAr ? "فشل توليد صور المشاهد" : "Failed to generate scene images");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === executionMsgId
              ? {
                  ...m,
                  text: `❌ ${errorText}`,
                  imageTask: {
                    status: "failed",
                    error: errorText,
                  },
                }
              : m
          )
        );
      }
    } catch (err: any) {
      console.error(err);
      const errorText = err.message || (isAr ? "حدث خطأ أثناء الاتصال بالخادم" : "Error connecting to server");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === executionMsgId
            ? {
                ...m,
                text: `❌ ${errorText}`,
                imageTask: {
                  status: "failed",
                  error: errorText,
                },
              }
            : m
        )
      );
    }
  };

  const isExecutionCommand = (text: string) => {
    const normalized = normalizeHookPrompt(text);
    return ["نفذ", "نفذ الفيديو", "نفذ صور", "نفذ الصور", "توليد", "توليد صور", "ولد صور", "ولّد صور", "ابدأ التوليد", "شغل", "شغل التوليد", "ولّد", "ولد", "execute", "run", "generate", "generate images", "generate video"].some(cmd => normalized.includes(cmd));
  };

  // Generation Handler
  const handleSendMessage = async () => {
    if (!inputText.trim() && attachedFiles.length === 0) return;

    // Check if the input is an execution command
    if (isExecutionCommand(inputText)) {
      if (latestStoryboard) {
        const userMessage: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          sender: "user",
          text: inputText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputText("");

        const lowerInput = userMessage.text.toLowerCase();
        if (lowerInput.includes("صور") || lowerInput.includes("صوره") || lowerInput.includes("image") || lowerInput.includes("still")) {
          executeStoryboardImages(userMessage.id, latestStoryboard);
        } else if (lowerInput.includes("فيديو") || lowerInput.includes("فديو") || lowerInput.includes("video")) {
          executeStoryboardVideo(userMessage.id, latestStoryboard);
        } else {
          // Ask user what they want with choice buttons
          const askMessage: ChatMessage = {
            id: Math.random().toString(36).substr(2, 9),
            sender: "agent",
            text: isAr
              ? "هل ترغب في إنتاج الستوريبورد كفيديو كامل أم كـ 4 صور منفصلة للمشاهد؟"
              : "Would you like to produce the storyboard as a full video or as 4 scene images?",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            generatedHook: latestStoryboard,
          };
          setMessages((prev) => [...prev, askMessage]);
        }
      } else {
        const userMessage: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          sender: "user",
          text: inputText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputText("");
        
        const agentMessage: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          sender: "agent",
          text: isAr
            ? "يرجى طلب ستوري بورد أولاً قبل إصدار أمر التنفيذ."
            : "Please request a storyboard first before executing.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, agentMessage]);
      }
      return;
    }

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender: "user",
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      attachments: [...attachedFiles],
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setAttachedFiles([]);

    if (isCasualHookStudioMessage(userMessage.text, Boolean(userMessage.attachments?.length))) {
      const agentMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        sender: "agent",
        text: getCasualReply(userMessage.text),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, agentMessage]);
      return;
    }

    if (isAdvisoryHookStudioMessage(userMessage.text, Boolean(userMessage.attachments?.length))) {
      const agentMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        sender: "agent",
        text: getAdvisoryReply(userMessage.text, userMessage.attachments?.length || 0),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, agentMessage]);
      return;
    }

    setIsGenerating(true);

    try {
      const uploaded = await Promise.all(
        (userMessage.attachments || [])
          .filter((item) => item.file)
          .map(async (item) => ({
            type: item.type,
            url: await uploadAttachedFile(item.file as File),
          }))
      );
      const refImages = uploaded.filter((item) => item.type === "image").map((item) => item.url);
      const refVideos = uploaded.filter((item) => item.type === "video").map((item) => item.url);
      const refAudios = uploaded.filter((item) => item.type === "audio").map((item) => item.url);

      const res = await fetch("/api/hook-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage.text,
          llmBrain: selectedThinkingModel,
          genre: selectedGenre,
          modelId: selectedVideoModel,
          duration: Number.parseInt(selectedDuration, 10),
          aspectRatio: selectedRatio,
          quality: selectedQuality,
          generateAudio,
          hookAngle: selectedHookAngle,
          refImages,
          refVideos,
          refAudios,
          onlyStoryboard: true, // Generate storyboard first
        }),
      });

      const data = await res.json();
      if (res.ok && data.mode === "chat" && typeof data.message === "string") {
        const agentMessage: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          sender: "agent",
          text: data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, agentMessage]);
        return;
      }

      if (res.ok && data.success) {
        const scenes = Array.isArray(data.scenePrompts) && data.scenePrompts.length > 0
          ? data.scenePrompts.slice(0, 4).map((scene: any, index: number) => ({
              id: index + 1,
              title: typeof scene?.title === "string" ? scene.title : `${t.sceneText} ${index + 1}`,
              shotType: scene.shotType || "Medium Shot",
              lens: scene.lens || "35mm",
              cameraAngle: scene.cameraAngle || "Eye Level",
              movement: scene.movement || "Static",
              lighting: scene.lighting || "Soft Light",
              description: scene.description || "",
              audio: scene.audio || "",
              prompt: typeof scene?.prompt === "string" ? scene.prompt : String(scene || ""),
            }))
          : getFallbackScenes(userMessage.text);
        const hookText = data.hookText || (isAr
          ? "ماذا لو كان إعلانك القادم جاهزاً قبل أن تضيع الفكرة؟"
          : "What if your next ad was ready before the idea faded?");
        const angle = data.angle || (isAr ? "زاوية إخراجية" : "Director Angle");
        const genre = data.genreLabel || (isAr ? activeGenreObj.nameAr : activeGenreObj.nameEn);
        const treatment = data.directorTreatment || getDirectorFallbackTreatment(userMessage.text);
        const recommendedModel = data.recommendedModel || getRecommendedModelDescription(selectedGenre, userMessage.text);
        
        const generatedHookObj = {
          phrase: isAr
            ? `"${hookText || "ماذا لو أخبرتك أن المحتوى الفيروسي يصنع بالذكاء الاصطناعي؟"}"`
            : `"${hookText || "What if I told you viral hooks are generated by AI?"}"`,
          angle,
          genre,
          duration: selectedDuration,
          treatment,
          scenes,
          videoUrl: "",
          modelRecommendation: recommendedModel,
          refImages,
          refVideos,
          refAudios,
        };

        // Update latest storyboard in state
        setLatestStoryboard(generatedHookObj);

        const agentMessage: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          sender: "agent",
          text: formatHookStudioDirectorReply({
            isAr,
            hookText,
            angle,
            genre,
            duration: selectedDuration,
            treatment,
            scenes,
            recommendedModel,
          }),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          generatedHook: generatedHookObj,
        };
        setMessages((prev) => [...prev, agentMessage]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishToGallery = (hook: NonNullable<ChatMessage["generatedHook"]>) => {
    // Gallery is visual only inside sidebar, but we keep this hook function just in case
    console.log("Publishing to gallery:", hook);
  };

  const handleDownload = async (url: string, filename: string = "media-file") => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, "_blank");
    }
  };

  const visibleMessages = messages.filter(
    (msg) => !["welcome", "user-demo", "agent-response-demo"].includes(msg.id),
  );
  const hookStudioEmptyTitle = isAr ? "هوك ستوديو" : "Hook Studio";
  const showEmptyHookStudioTitle =
    visibleMessages.length === 0 && !inputText.trim() && attachedFiles.length === 0;

  return (
    <div
      className={`h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden bg-[#07090e] text-[#e2e8f0] flex selection:bg-indigo-600 selection:text-white ${
        isAr ? "dir-rtl" : "dir-ltr"
      }`}
    >
      {/* Left/Center: Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#06080b]">
        {/* Chat Feed Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800/80">
          {showEmptyHookStudioTitle && (
            <div className="flex min-h-full items-center justify-center pb-28">
              <div
                className="select-none text-center text-[clamp(34px,5vw,72px)] font-black tracking-normal text-slate-800/70"
                dir={isAr ? "rtl" : "ltr"}
              >
                {hookStudioEmptyTitle}
              </div>
            </div>
          )}

          {visibleMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 max-w-4xl ${
                msg.sender === "user" ? "ml-auto flex-row-reverse text-right" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg overflow-hidden ${
                  msg.sender === "user"
                    ? "bg-slate-800 text-slate-300 text-xs font-bold"
                    : "bg-[#0c0f16] border border-slate-800"
                }`}
              >
                {msg.sender === "user" ? (
                  user?.imageUrl ? (
                    <img src={user.imageUrl} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4" />
                  )
                ) : logoError ? (
                  <Bot className="w-4.5 h-4.5 text-indigo-400" />
                ) : (
                  <img
                    src="/EveLogo.png"
                    alt="AI Agent Logo"
                    className="w-full h-full object-contain p-1"
                    onError={() => setLogoError(true)}
                  />
                )}
              </div>

              {/* Message Content */}
              <div className="space-y-2 max-w-2xl w-full">
                {/* Standard Text Bubble */}
                {msg.text && (
                  <div
                    className={`rounded-2xl p-3.5 text-xs leading-relaxed shadow-sm border ${
                      msg.sender === "user"
                        ? "bg-[#181232]/85 border-purple-900/20 text-purple-100 rounded-tr-none"
                        : "bg-[#111520] border-slate-800/50 text-slate-200 rounded-tl-none whitespace-pre-line"
                    }`}
                  >
                    {msg.text}

                    {/* Storyboard Action Buttons inside storyboard chat bubble */}
                    {msg.sender === "agent" && msg.generatedHook && !msg.videoTask && !msg.imageTask && (
                      <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col gap-2">
                        <span className="text-slate-400 text-[11px] mb-1">
                          {isImageModel
                            ? (isAr ? "النموذج المختار مخصص للصور فقط. اضغط أدناه لتوليد لقطات المشاهد:" : "Selected model is for images only. Click below to generate scene stills:")
                            : (isAr ? "هل ترغب في إنتاج الستوريبورد كفيديو كامل أم كـ 4 صور منفصلة للمشاهد؟" : "Would you like to generate this storyboard as a full video or as 4 scene stills?")
                          }
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {!isImageModel && (
                            <button
                              onClick={() => executeStoryboardVideo(msg.id, msg.generatedHook)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95 text-xs"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>{isAr ? "🎬 إنتاج فيديو كامل (15 ك)" : "🎬 Produce Full Video (15c)"}</span>
                            </button>
                          )}
                          <button
                            onClick={() => executeStoryboardImages(msg.id, msg.generatedHook)}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95 text-xs"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>{isAr ? "📸 توليد صور المشاهد (4 ك)" : "📸 Generate Scene Stills (4c)"}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Video Generation Inline Player & Status */}
                {msg.videoTask && (
                  <div className="bg-[#111520] border border-slate-800/50 rounded-2xl p-4 space-y-3 max-w-md shadow-lg">
                    {msg.videoTask.status === "processing" && (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                        <span className="text-xs text-slate-300 font-medium">
                          {isAr ? "جاري توليد وإنتاج الفيديو..." : "Generating video..."}
                        </span>
                      </div>
                    )}
                    
                    {msg.videoTask.status === "completed" && msg.videoTask.videoUrl && (
                      <div className="space-y-3">
                        <div 
                          onClick={() => setPreviewMedia({ type: "video", url: msg.videoTask!.videoUrl!, title: "Generated Hook" })}
                          className="relative rounded-xl overflow-hidden group cursor-zoom-in border border-slate-800"
                        >
                          <video src={msg.videoTask.videoUrl} className="object-cover w-full h-48 group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-75 group-hover:opacity-100 transition-opacity">
                            <Play className="w-8 h-8 text-white fill-white" />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            onClick={() => handleDownload(msg.videoTask!.videoUrl!, "generated-hook.mp4")}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{isAr ? "تحميل" : "Download"}</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              const newEntry = {
                                id: Math.random().toString(36).substr(2, 9),
                                prompt: msg.text || "Storyboard Hook",
                                modelName: activeVideoModelObj.name,
                                genre: isAr ? activeGenreObj.nameAr : activeGenreObj.nameEn,
                                url: msg.videoTask!.videoUrl!,
                                date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                credits: activeVideoModelObj.creditCost,
                              };
                              console.log("Published to gallery:", newEntry);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isAr ? "نشر في المعرض" : "Publish to Gallery"}</span>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {msg.videoTask.status === "failed" && (
                      <div className="text-xs text-red-400 font-medium">
                        {isAr ? "فشل التوليد: " : "Generation failed: "}
                        {msg.videoTask.error || (isAr ? "حدث خطأ غير متوقع" : "Unexpected error occurred")}
                      </div>
                    )}
                  </div>
                )}

                {/* Image Generation Inline Grid & Status */}
                {msg.imageTask && (
                  <div className="bg-[#111520] border border-slate-800/50 rounded-2xl p-4 space-y-3 max-w-xl shadow-lg">
                    {msg.imageTask.status === "processing" && (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        <span className="text-xs text-slate-300 font-medium">
                          {isAr ? "جاري توليد صور المشاهد بالذكاء الاصطناعي..." : "Generating scene stills..."}
                        </span>
                      </div>
                    )}

                    {msg.imageTask.status === "failed" && (
                      <div className="text-xs text-rose-500 font-medium">
                        {isAr ? "فشل توليد الصور: " : "Failed to generate images: "}
                        {msg.imageTask.error || (isAr ? "حدث خطأ غير متوقع" : "Unexpected error occurred")}
                      </div>
                    )}

                    {msg.imageTask.status === "completed" && msg.imageTask.imageUrls && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          {msg.imageTask.imageUrls.map((url, index) => (
                            <div key={index} className="relative group rounded-xl overflow-hidden border border-slate-800 aspect-video">
                              <img src={url} alt={`Scene ${index + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setPreviewMedia({ type: "image", url, title: isAr ? `مشهد ${index + 1}` : `Scene ${index + 1}` })}
                                  className="p-1.5 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white transition-colors"
                                  title={isAr ? "عرض الصورة" : "View Image"}
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDownload(url, `scene-${index + 1}`)}
                                  className="p-1.5 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white transition-colors"
                                  title={isAr ? "تحميل الصورة" : "Download Image"}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {isAr ? "تم توليد الصور كلقطات ثابتة للمشاهد الأربعة بنجاح." : "Images generated as scene stills successfully."}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline Message Attachments (Images, Videos, Audios uploaded by user) */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-1 justify-end">
                    {msg.attachments.map((file) => (
                      <div
                        key={file.id}
                        className="bg-[#0f121d] border border-slate-800 rounded-2xl p-2 max-w-sm overflow-hidden shadow-lg space-y-2"
                      >
                        {file.type === "image" && (
                          <img
                            src={file.url}
                            alt={file.name}
                            onClick={() => setPreviewMedia({ type: "image", url: file.url, title: file.name })}
                            className="rounded-xl max-h-48 object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                          />
                        )}
                        {file.type === "video" && (
                          <div 
                            onClick={() => setPreviewMedia({ type: "video", url: file.url, title: file.name })}
                            className="relative rounded-xl max-h-48 overflow-hidden group cursor-zoom-in"
                          >
                            <video src={file.url} className="object-cover max-h-48 w-full group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-75 group-hover:opacity-100 transition-opacity">
                              <Play className="w-7 h-7 text-white fill-white" />
                            </div>
                          </div>
                        )}
                        {file.type === "audio" && (
                          <div 
                            onClick={() => setPreviewMedia({ type: "audio", url: file.url, title: file.name })}
                            className="flex items-center justify-between p-2.5 bg-[#090b0f] border border-slate-800 rounded-xl cursor-zoom-in hover:border-slate-700 transition-all text-xs w-full max-w-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Volume2 className="w-4 h-4 text-indigo-400" />
                              <span className="text-slate-300 font-medium truncate max-w-[140px]">{file.name}</span>
                            </div>
                            <Download className="w-3.5 h-3.5 text-slate-500 hover:text-white" />
                          </div>
                        )}
                        {file.type === "file" && (
                          <div 
                            onClick={() => setPreviewMedia({ type: "video", url: file.url, title: file.name })}
                            className="flex items-center gap-2 p-2 bg-[#090b0e] rounded-xl text-xs cursor-pointer hover:bg-slate-900 transition-all"
                          >
                            <FileVideo className="w-4 h-4 text-indigo-400" />
                            <span className="text-slate-300 font-medium">{file.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* System Subtitle */}
                {msg.isSystem && (
                  <span className="text-[10px] text-slate-500 font-medium px-1 uppercase tracking-wider block">
                    {t.systemAgent}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Drag & Drop Prompt Console Container */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`p-4 md:p-6 bg-[#07090d] border-t border-slate-900 flex-shrink-0 space-y-3 relative transition-all duration-200 ${
            isDragOver ? "bg-[#0f1322] border-indigo-500/50 scale-[0.99] border-t-2" : ""
          }`}
        >
          {/* Drag Overlay Helper Text */}
          {isDragOver && (
            <div className="absolute inset-0 bg-[#0b0e17]/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-indigo-400 gap-2 pointer-events-none">
              <UploadCloud className="w-8 h-8 animate-bounce" />
              <span className="text-xs font-bold">{t.dragPromptText}</span>
            </div>
          )}

          {/* Prompt Console Bar - Styled Box Container */}
          <div className="bg-[#11151f] border border-slate-800/80 rounded-2xl p-3 flex flex-col gap-3 shadow-lg focus-within:border-indigo-500/70 transition-all w-full animate-in fade-in duration-200">
            
            {/* Integrated Attachments Row inside the box (Figma Layout) */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-3 pb-2 border-b border-slate-900/40">
                {attachedFiles.map((file) => {
                  const isImageOrVideo = file.type === "image" || file.type === "video";
                  
                  if (isImageOrVideo) {
                    return (
                      <div key={file.id} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-800 bg-[#06080c] flex-shrink-0 group">
                        {file.type === "image" ? (
                          <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                        ) : (
                          <video src={file.url} className="w-full h-full object-cover" />
                        )}
                        <button
                          onClick={() => handleRemoveAttachment(file.id)}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/70 hover:bg-rose-600 flex items-center justify-center text-white transition-all shadow-sm"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  } else {
                    return (
                      <div
                        key={file.id}
                        className="bg-[#181d2a] border border-slate-800/60 rounded-full px-3.5 py-1.5 flex items-center gap-2 text-xs shadow-sm flex-shrink-0"
                      >
                        {file.type === "audio" ? (
                          <FileAudio className="w-3.5 h-3.5 text-indigo-400" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        <span className="text-slate-300 font-medium truncate max-w-[150px]">
                          {file.name}
                        </span>
                        <button
                          onClick={() => handleRemoveAttachment(file.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  }
                })}
              </div>
            )}

            {/* Input Row */}
            <div className="flex items-center justify-between gap-3 w-full">
              {/* Target Select */}
              <div className="flex items-center gap-1.5 pl-1 select-none">
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                placeholder={t.inputPlaceholder}
                className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none py-1"
              />

              {/* Actions */}
              <div className="flex items-center gap-2 pr-1">
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,video/*,audio/*"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
                  title="Attach files"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={isGenerating || (!inputText.trim() && attachedFiles.length === 0)}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all shadow-md shadow-indigo-600/10"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Settings Sidebar */}
      <div className="w-80 border-l border-slate-800 bg-[#090b10] p-5 space-y-6 hidden md:block overflow-y-auto flex-shrink-0 scrollbar-thin">
        {/* Section: Video Model */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
            {t.videoModel}
          </label>
          <select
            value={selectedVideoModel}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedVideoModel(val);
              const targetModel = HOOK_VIDEO_MODELS.find((m) => m.id === val);
              if (targetModel) {
                if (targetModel.durations.length > 0) {
                  setSelectedDuration(`${targetModel.durations[0]}s`);
                }
                if (targetModel.aspectRatios.length > 0) {
                  setSelectedRatio(targetModel.aspectRatios[0]);
                }
                if (targetModel.qualityModes.length > 0) {
                  setSelectedQuality(targetModel.qualityModes[0]);
                }
              }
            }}
            className="w-full bg-[#11141e] text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
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
            className="w-full bg-[#11141e] text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
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
                className="w-full bg-[#11141e] text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                {activeVideoModelObj.durations.map((d) => (
                  <option key={d} value={`${d}s`}>
                    {d}s
                  </option>
                ))}
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
                className="w-full bg-[#11141e] text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                {activeVideoModelObj.aspectRatios.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
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
                className="w-full bg-[#11141e] text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                {activeVideoModelObj.qualityModes.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>

            {/* Native Audio */}
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#11141e] px-3 py-2.5 text-xs text-slate-200">
              <span className="font-semibold">{isAr ? "توليد صوت أصلي" : "Native audio"}</span>
              <input
                type="checkbox"
                checked={generateAudio}
                onChange={(e) => setGenerateAudio(e.target.checked)}
                className="h-4 w-4 accent-indigo-500 cursor-pointer"
              />
            </label>

            {/* Genre */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                {t.genre}
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full bg-[#11141e] text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
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
                className="w-full bg-[#11141e] text-xs text-slate-200 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                <option value="curiosity">{isAr ? "فجوة الفضول" : "Curiosity Gap"}</option>
                <option value="shock">{isAr ? "هوك الصدمة" : "Shock Hook"}</option>
                <option value="mystery">{isAr ? "الغموض البصري" : "Visual Mystery"}</option>
                <option value="brand-reveal">{isAr ? "كشف العلامة" : "Brand Reveal"}</option>
                <option value="emotional-drama">{isAr ? "دراما عاطفية" : "Emotional Drama"}</option>
                <option value="heritage-pride">{isAr ? "فخر تراثي" : "Heritage Pride"}</option>
                <option value="fear-tension">{isAr ? "توتر ورعب" : "Fear & Tension"}</option>
                <option value="product-proof">{isAr ? "إثبات المنتج" : "Product Proof"}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Fullscreen Lightbox Modal ── */}
      {previewMedia && (
        <div 
          onClick={() => setPreviewMedia(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md transition-all animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-[#080b11] border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] transition-all animate-in zoom-in-95 duration-200"
          >
            {/* Close Button top-right */}
            <button 
              onClick={() => setPreviewMedia(null)}
              className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-black/50 hover:bg-rose-600 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header info */}
            {previewMedia.title && (
              <div className="p-5 border-b border-slate-800/60 bg-[#0c0f16]/95">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Media Preview</span>
                <span className="text-sm font-bold text-slate-200 truncate block">{previewMedia.title}</span>
              </div>
            )}

            {/* Media Body */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-black/40">
              {previewMedia.type === "image" && (
                <img 
                  src={previewMedia.url} 
                  alt={previewMedia.title || "Image Preview"} 
                  className="max-h-[60vh] object-contain rounded-2xl shadow-xl"
                />
              )}
              {previewMedia.type === "video" && (
                <video 
                  src={previewMedia.url} 
                  controls 
                  autoPlay
                  className="max-h-[60vh] w-full object-contain rounded-2xl shadow-xl"
                />
              )}
              {previewMedia.type === "audio" && (
                <div className="bg-[#11141e] border border-slate-800 rounded-3xl p-10 flex flex-col items-center gap-5 w-full max-w-md shadow-xl text-center">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Volume2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Now Playing</span>
                    <span className="text-sm font-bold text-slate-200 truncate max-w-xs block">{previewMedia.title}</span>
                  </div>
                  <audio src={previewMedia.url} controls className="w-full mt-2" />
                </div>
              )}
            </div>

            {/* Footer action */}
            <div className="p-4 border-t border-slate-800/60 bg-[#0c0f16]/95 flex justify-end">
              <button
                onClick={() => handleDownload(previewMedia.url, previewMedia.title || "downloaded-file")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-5 rounded-xl flex items-center gap-2 transition-colors text-xs"
              >
                <Download className="w-4 h-4" />
                <span>{isAr ? "تحميل الملف" : "Download File"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
