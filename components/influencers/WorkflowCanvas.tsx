"use client";

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Edit3,
  Image as ImageIcon,
  Loader2,
  MousePointer2,
  Move,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Video as VideoIcon,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/use-language";

export type CanvasNode = {
  id: string;
  type: "root" | "image" | "video";
  parentId?: string;
  x: number;
  y: number;
  title: string;
  imageUrl?: string;
  publicImageUrl?: string;
  videoUrl?: string;
  prompt?: string;
  influencerHandle?: string;
  model?: string;
  aspectRatio?: string;
  status: "idle" | "uploading" | "generating" | "ready" | "failed";
};

type WorkflowMode = "image" | "edit" | "video";

interface WorkflowCanvasProps {
  initialNodes?: CanvasNode[];
  influencerHandles: string[];
  onGenerateImageNode?: (nodeId: string, prompt: string, handle: string, model: string, aspect: string) => Promise<string>;
  onGenerateVideoNode?: (nodeId: string, prompt: string, model: string) => Promise<string>;
}

const IMAGE_VARIANTS = [
  "clean studio portrait, soft key light, neutral background",
  "casual street style portrait, natural daylight, city background",
  "luxury hotel lobby editorial photo, polished outfit, warm lighting",
  "fitness lifestyle portrait, athletic outfit, bright morning light",
  "coffee shop candid photo, relaxed expression, shallow depth of field",
  "beach resort portrait, golden hour, cinematic social media style",
  "professional brand campaign photo, confident pose, clean composition",
  "night city portrait, neon reflections, premium fashion look",
  "travel lifestyle photo, airport lounge setting, natural pose",
  "minimal fashion lookbook photo, full body framing, crisp details",
  "rooftop sunset portrait, elegant outfit, editorial composition",
  "modern apartment lifestyle photo, cozy daylight, natural expression",
];

function normalizeHandle(value: string | null, fallback: string) {
  if (!value) return fallback;
  const decoded = decodeURIComponent(value).trim();
  if (!decoded) return fallback;
  return decoded.startsWith("@") ? decoded : `@${decoded}`;
}

function getImageModelId(modelName: string, hasReference: boolean) {
  if (modelName.includes("Seedream")) return hasReference ? "seedream/5-pro-image-to-image" : "seedream/5-pro";
  if (modelName.includes("Flux")) return hasReference ? "flux-2/pro-image-to-image" : "flux-2/pro-text-to-image";
  if (modelName.includes("GPT")) return hasReference ? "gpt-image-2-image-to-image" : "gpt-image-2";
  return hasReference ? "qwen/image-to-image" : "qwen";
}

function getVideoModelRoute(modelName: string) {
  if (modelName.includes("Seedance")) return "bytedance/seedance-2.0/text-to-video";
  if (modelName.includes("2.6")) return "kwaivgi/kling-v2.6-std/text-to-video";
  return "kwaivgi/kling-v3.0-pro/text-to-video";
}

export function WorkflowCanvas({
  initialNodes,
  influencerHandles = ["@gavi", "@sophie", "@katrina", "@kat"],
  onGenerateImageNode,
  onGenerateVideoNode,
}: WorkflowCanvasProps) {
  const { lang } = useLanguage();
  const isArabic = lang !== "en";
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sourceInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const initialHandle = useMemo(
    () => normalizeHandle(searchParams?.get("talent"), influencerHandles[0] || "@gavi"),
    [searchParams, influencerHandles],
  );

  const copy = isArabic
    ? {
        addNode: "إضافة صورة",
        activeTalent: "الموهبة",
        imageCount: "عدد الصور",
        nodes: "العقد",
        basePrompt: "فكرة المجموعة",
        promptPlaceholder: "مثال: حملة أزياء، أماكن مختلفة، صور واقعية للسوشيال ميديا",
        generateSet: "ولّد مجموعة صور",
        generatingSet: "جاري توليد المجموعة...",
        aspect: "الأبعاد",
        imageModel: "نموذج الصور",
        videoModel: "نموذج الفيديو",
        imageNode: "صورة",
        videoNode: "فيديو",
        referenceNode: "الشخصية الأصلية",
        clickToGenerate: "اكتب وصفاً ثم ولّد",
        nodePrompt: "وصف هذه الصورة",
        generate: "توليد",
        toVideo: "حوّل إلى فيديو",
        toVideoShort: "فيديو",
        videoPrompt: "حركة الفيديو",
        videoPromptPlaceholder: "مثال: تنظر للكاميرا، حركة شعر خفيفة، لقطة سينمائية",
        emptyTitle: "ابدأ عمل كانفاس جديد",
        emptySubtitle: "الكانفاس يبدأ فارغاً. ارفع صورة الشخصية أو أنشئ عملاً فارغاً، وبعدها ابني الصور والفيديو داخل نفس اللوحة.",
        uploadSource: "رفع صورة الشخصية",
        createBlank: "إنشاء عمل فارغ",
        replaceSource: "استبدال الصورة",
        removeSource: "مسح الصورة",
        deleteWork: "حذف العمل",
        sourceRequired: "ارفع صورة الشخصية أولاً حتى تكون الهوية واضحة قبل توليد مجموعة صور.",
        uploadFailed: "فشل رفع الصورة. جرّب صورة أخرى أو افحص إعدادات التخزين.",
        uploading: "جاري رفع الصورة...",
        failed: "فشل",
      }
    : {
        addNode: "Add Image",
        activeTalent: "Talent",
        imageCount: "Image count",
        nodes: "nodes",
        basePrompt: "Set idea",
        promptPlaceholder: "Example: fashion campaign, different places, realistic social media photos",
        generateSet: "Generate Image Set",
        generatingSet: "Generating set...",
        aspect: "Aspect",
        imageModel: "Image model",
        videoModel: "Video model",
        imageNode: "Image",
        videoNode: "Video",
        referenceNode: "Source Talent",
        clickToGenerate: "Write a prompt and generate",
        nodePrompt: "Node prompt",
        generate: "Generate",
        toVideo: "Turn into Video",
        toVideoShort: "Video",
        videoPrompt: "Video motion",
        videoPromptPlaceholder: "Example: looking at camera, gentle hair movement, cinematic shot",
        emptyTitle: "Start a New Canvas Work",
        emptySubtitle: "The canvas starts empty. Upload the talent reference or create a blank work, then build images and videos in the same board.",
        uploadSource: "Upload Talent Image",
        createBlank: "Create Blank Work",
        replaceSource: "Replace Image",
        removeSource: "Remove Image",
        deleteWork: "Delete Work",
        sourceRequired: "Upload the talent image first so the workflow has a clear identity before generating a set.",
        uploadFailed: "Image upload failed. Try another image or check storage settings.",
        uploading: "Uploading image...",
        failed: "Failed",
      };

  const [nodes, setNodes] = useState<CanvasNode[]>(initialNodes || []);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(initialNodes?.[0]?.id || null);
  const [selectedHandle, setSelectedHandle] = useState(initialHandle);
  const [selectedImageModel, setSelectedImageModel] = useState("Nano Banana Pro");
  const [selectedVideoModel, setSelectedVideoModel] = useState("Kling 3.0 Pro");
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("image");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [batchCount, setBatchCount] = useState(8);
  const [batchPrompt, setBatchPrompt] = useState("");
  const [nodePrompt, setNodePrompt] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [canvasError, setCanvasError] = useState("");
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const activeNode = nodes.find((node) => node.id === activeNodeId) || null;
  const sourceNode = nodes.find((node) => node.type === "root") || null;

  const updateNode = (nodeId: string, patch: Partial<CanvasNode>) => {
    setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)));
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/media/upload", { method: "POST", body: formData });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.publicUrl) throw new Error(data?.error || copy.uploadFailed);
    return data.publicUrl as string;
  };

  const createSourceNode = (imageUrl?: string, status: CanvasNode["status"] = "idle") => {
    const id = `root-${Date.now()}`;
    const newNode: CanvasNode = {
      id,
      type: "root",
      x: 60,
      y: 260,
      title: copy.referenceNode,
      imageUrl,
      influencerHandle: selectedHandle,
      status,
    };
    setCanvasError("");
    setNodes([newNode]);
    setActiveNodeId(id);
    return id;
  };

  const handleSourceFileChange = async (event: React.ChangeEvent<HTMLInputElement>, targetNodeId?: string) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    const nodeId = targetNodeId || createSourceNode(previewUrl, "uploading");
    if (targetNodeId) updateNode(targetNodeId, { imageUrl: previewUrl, publicImageUrl: undefined, status: "uploading" });

    try {
      const publicImageUrl = await uploadFile(file);
      updateNode(nodeId, { publicImageUrl, status: "ready" });
      setCanvasError("");
    } catch {
      updateNode(nodeId, { status: "failed" });
      setCanvasError(copy.uploadFailed);
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => {
      const idsToDelete = new Set([nodeId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const node of prev) {
          if (node.parentId && idsToDelete.has(node.parentId) && !idsToDelete.has(node.id)) {
            idsToDelete.add(node.id);
            changed = true;
          }
        }
      }
      const next = prev.filter((node) => !idsToDelete.has(node.id));
      if (!next.some((node) => node.id === activeNodeId)) setActiveNodeId(next[0]?.id || null);
      return next;
    });
  };

  const handleMouseDownNode = (event: React.MouseEvent, nodeId: string) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("textarea") || target.closest("select") || target.closest("input")) return;

    const node = nodes.find((item) => item.id === nodeId);
    if (!node || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setDraggingNodeId(nodeId);
    dragOffsetRef.current = {
      x: event.clientX - rect.left - node.x,
      y: event.clientY - rect.top - node.y,
    };
    setActiveNodeId(nodeId);
    setNodePrompt(node.prompt || "");
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!draggingNodeId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    updateNode(draggingNodeId, {
      x: Math.max(10, event.clientX - rect.left - dragOffsetRef.current.x),
      y: Math.max(10, event.clientY - rect.top - dragOffsetRef.current.y),
    });
  };

  const handleAddImageNode = (parentId = activeNodeId || "") => {
    const parent = nodes.find((node) => node.id === parentId) || sourceNode;
    if (!parent) {
      setCanvasError(copy.sourceRequired);
      return;
    }

    const id = `image-${Date.now()}`;
    const newNode: CanvasNode = {
      id,
      type: "image",
      parentId: parent.id,
      x: parent.x + 340,
      y: parent.y,
      title: copy.imageNode,
      influencerHandle: parent.influencerHandle || selectedHandle,
      aspectRatio,
      status: "idle",
    };
    setCanvasError("");
    setNodes((prev) => [...prev, newNode]);
    setActiveNodeId(id);
  };

  const generateImage = async (prompt: string, referenceUrl?: string) => {
    const hasReference = Boolean(referenceUrl);
    const response = await fetch("/api/image/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        model: getImageModelId(selectedImageModel, hasReference),
        aspectRatio,
        quality: "1K",
        imageUrl: referenceUrl,
      }),
    });
    const data = await response.json().catch(() => null);
    const url = data?.mediaUrl || data?.url || data?.imageUrl || data?.imageUrls?.[0];
    if (!response.ok || !url) throw new Error(data?.error || "Image generation failed");
    return url as string;
  };

  const handleGenerateNodeImage = async (nodeId: string, promptOverride?: string) => {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;
    const referenceUrl = sourceNode?.publicImageUrl;
    if (!referenceUrl) {
      setCanvasError(copy.sourceRequired);
      return;
    }

    const prompt = promptOverride?.trim() || nodePrompt.trim() || node.prompt || `${selectedHandle} realistic lifestyle photo`;
    updateNode(nodeId, { status: "generating", prompt });

    try {
      const url = onGenerateImageNode
        ? await onGenerateImageNode(nodeId, prompt, selectedHandle, selectedImageModel, aspectRatio)
        : await generateImage(prompt.includes("@") ? prompt : `${selectedHandle} ${prompt}`, referenceUrl);
      updateNode(nodeId, { status: "ready", imageUrl: url, publicImageUrl: url });
      setCanvasError("");
    } catch {
      updateNode(nodeId, { status: "failed" });
    }
  };

  const handleGenerateImageSet = async () => {
    const root = sourceNode;
    if (!root?.publicImageUrl) {
      setCanvasError(copy.sourceRequired);
      return;
    }

    setCanvasError("");
    const basePrompt = batchPrompt.trim() || "realistic social media photo set, different locations and outfits";
    const count = Math.min(Math.max(batchCount, 1), IMAGE_VARIANTS.length);
    const rows = Math.ceil(count / 2);
    const createdNodes: CanvasNode[] = Array.from({ length: count }).map((_, index) => {
      const column = index < rows ? 0 : 1;
      const row = index % rows;
      return {
        id: `set-${Date.now()}-${index}`,
        type: "image",
        parentId: root.id,
        x: root.x + 340 + column * 320,
        y: 70 + row * 340,
        title: `${copy.imageNode} ${index + 1}`,
        prompt: `${selectedHandle} ${basePrompt}, ${IMAGE_VARIANTS[index]}`,
        influencerHandle: selectedHandle,
        aspectRatio,
        status: "generating",
      };
    });

    setBatchGenerating(true);
    setNodes((prev) => [...prev, ...createdNodes]);

    for (const node of createdNodes) {
      try {
        const url = await generateImage(node.prompt || `${selectedHandle} ${basePrompt}`, root.publicImageUrl);
        updateNode(node.id, { status: "ready", imageUrl: url, publicImageUrl: url });
      } catch {
        updateNode(node.id, { status: "failed" });
      }
    }

    setBatchGenerating(false);
  };

  const pollVideoResult = async (taskId: string) => {
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const response = await fetch(`/api/video?taskId=${encodeURIComponent(taskId)}`).catch(() => null);
      const data = await response?.json().catch(() => null);
      if (data?.status === "completed" && data?.videoUrl) return data.videoUrl as string;
      if (data?.status === "failed") throw new Error(data?.error || "Video generation failed");
    }
    throw new Error("Video generation timed out");
  };

  const handleCreateVideoFromImage = async (imageNode: CanvasNode) => {
    const imageUrl = imageNode.publicImageUrl || imageNode.imageUrl;
    if (!imageUrl) return;

    const id = `video-${Date.now()}`;
    const prompt = videoPrompt.trim() || `${imageNode.influencerHandle || selectedHandle} looking at camera, gentle motion, cinematic lighting`;
    const newNode: CanvasNode = {
      id,
      type: "video",
      parentId: imageNode.id,
      x: imageNode.x + 340,
      y: imageNode.y,
      title: copy.videoNode,
      imageUrl,
      publicImageUrl: imageUrl,
      prompt,
      influencerHandle: imageNode.influencerHandle,
      status: "generating",
    };

    setNodes((prev) => [...prev, newNode]);
    setActiveNodeId(id);

    try {
      let videoUrl = "";
      if (onGenerateVideoNode) {
        videoUrl = await onGenerateVideoNode(id, prompt, selectedVideoModel);
      } else {
        const response = await fetch("/api/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelRoute: getVideoModelRoute(selectedVideoModel),
            payload: {
              prompt,
              duration: 5,
              aspect_ratio: aspectRatio,
              image_url: imageUrl,
              resolution: "720p",
            },
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || (!data?.taskId && !data?.videoUrl)) throw new Error(data?.error || "Video generation failed");
        videoUrl = data.videoUrl || (await pollVideoResult(data.taskId));
      }
      updateNode(id, { status: "ready", videoUrl });
      setCanvasError("");
    } catch {
      updateNode(id, { status: "failed" });
    }
  };

  const handlePromptGenerate = async () => {
    if (workflowMode === "video") {
      if (activeNode?.type === "image" && activeNode.imageUrl) {
        await handleCreateVideoFromImage(activeNode);
      } else {
        setCanvasError(isArabic ? "اختر صورة ناتجة أولاً حتى تحولها إلى فيديو." : "Select a generated image first to turn it into video.");
      }
      return;
    }

    if (workflowMode === "edit") {
      if (activeNode?.type === "image") {
        await handleGenerateNodeImage(activeNode.id, batchPrompt);
      } else {
        handleAddImageNode(sourceNode?.id || undefined);
      }
      return;
    }

    await handleGenerateImageSet();
  };

  const workflowModeOptions: Array<{ id: WorkflowMode; label: string; icon: typeof ImageIcon }> = [
    { id: "image", label: isArabic ? "صورة" : "Image", icon: ImageIcon },
    { id: "edit", label: isArabic ? "تعديل" : "Edit", icon: Edit3 },
    { id: "video", label: isArabic ? "فيديو" : "Video", icon: VideoIcon },
  ];

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-[760px] h-[calc(100vh-4rem)] overflow-hidden bg-[#07080f] select-none"
      id="tour-canvas-board"
      onMouseMove={handleMouseMove}
      onMouseUp={() => setDraggingNodeId(null)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0c_1px,transparent_1px)] [background-size:28px_28px] opacity-80 pointer-events-none" />

      <input
        ref={sourceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleSourceFileChange(event)}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => activeNode && handleSourceFileChange(event, activeNode.id)}
      />

      <div className="absolute left-3 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-1 rounded-xl border border-white/10 bg-black/75 p-1.5 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          title={isArabic ? "اختيار وتحريك" : "Select and move"}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white"
        >
          <MousePointer2 size={15} />
        </button>
        <button
          type="button"
          title={copy.uploadSource}
          onClick={() => sourceInputRef.current?.click()}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <Upload size={15} />
        </button>
        <button
          type="button"
          title={copy.addNode}
          onClick={() => handleAddImageNode(sourceNode?.id || undefined)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          title={workflowModeOptions.find((mode) => mode.id === "image")?.label}
          onClick={() => setWorkflowMode("image")}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 hover:text-white",
            workflowMode === "image" ? "bg-pink-500 text-white" : "text-zinc-400",
          )}
        >
          <ImageIcon size={15} />
        </button>
        <button
          type="button"
          title={workflowModeOptions.find((mode) => mode.id === "video")?.label}
          onClick={() => setWorkflowMode("video")}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 hover:text-white",
            workflowMode === "video" ? "bg-purple-600 text-white" : "text-zinc-400",
          )}
        >
          <VideoIcon size={15} />
        </button>
      </div>

      <div className="absolute top-20 left-4 right-4 z-30 bg-[#0d0f19]/95 border border-white/10 p-3 rounded-2xl shadow-2xl backdrop-blur-xl">
        <div className="grid grid-cols-1 2xl:grid-cols-[auto_auto_auto_auto_auto_1fr_auto] gap-3 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500">Mode</label>
            <div className="h-9 rounded-xl border border-white/10 bg-black/60 p-1 flex items-center gap-1">
              {workflowModeOptions.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setWorkflowMode(mode.id)}
                    className={cn(
                      "h-7 px-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition",
                      workflowMode === mode.id ? "bg-white text-black" : "text-zinc-400 hover:text-white hover:bg-white/10",
                    )}
                  >
                    <Icon size={12} />
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500">{copy.activeTalent}</label>
            <select
              value={selectedHandle}
              onChange={(event) => setSelectedHandle(event.target.value)}
              className="h-9 bg-black/60 border border-white/10 rounded-xl px-3 text-xs text-pink-300 font-mono outline-none dir-ltr"
            >
              {Array.from(new Set([selectedHandle, ...influencerHandles])).map((handle) => (
                <option key={handle} value={handle} className="bg-[#0d0f19] text-pink-300">
                  {handle}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500">{copy.imageCount}</label>
            <select
              value={batchCount}
              onChange={(event) => setBatchCount(Number(event.target.value))}
              className="h-9 bg-black/60 border border-white/10 rounded-xl px-3 text-xs text-white outline-none"
            >
              {[4, 6, 8, 10, 12].map((count) => (
                <option key={count} value={count} className="bg-[#0d0f19]">
                  {count}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500">{copy.aspect}</label>
            <select
              value={aspectRatio}
              onChange={(event) => setAspectRatio(event.target.value)}
              className="h-9 bg-black/60 border border-white/10 rounded-xl px-3 text-xs text-white outline-none"
            >
              {["9:16", "1:1", "16:9", "3:4"].map((ratio) => (
                <option key={ratio} value={ratio} className="bg-[#0d0f19]">
                  {ratio}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500">{copy.imageModel}</label>
            <select
              value={selectedImageModel}
              onChange={(event) => setSelectedImageModel(event.target.value)}
              className="h-9 bg-black/60 border border-white/10 rounded-xl px-3 text-xs text-purple-200 outline-none"
            >
              {["Nano Banana Pro", "Seedream 5.0 Pro", "Flux 2 Pro", "GPT Image 2"].map((model) => (
                <option key={model} value={model} className="bg-[#0d0f19]">
                  {model}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500">{copy.basePrompt}</label>
            <input
              value={batchPrompt}
              onChange={(event) => setBatchPrompt(event.target.value)}
              placeholder={copy.promptPlaceholder}
              className={cn(
                "h-9 w-full bg-black/60 border border-white/10 rounded-xl px-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-pink-500",
                isArabic ? "text-right" : "text-left",
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => sourceInputRef.current?.click()}
              className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-bold flex items-center gap-1.5"
            >
              <Upload size={14} />
              {copy.uploadSource}
            </button>
            <button
              type="button"
              onClick={handlePromptGenerate}
              disabled={batchGenerating}
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-lg shadow-pink-500/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {batchGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {batchGenerating ? copy.generatingSet : copy.generateSet}
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
          <span>
            {nodes.length} {copy.nodes}
          </span>
          <span className="h-1 w-1 rounded-full bg-zinc-700" />
          <span>
            {copy.videoModel}: {selectedVideoModel}
          </span>
          {canvasError && <span className="text-pink-300">{canvasError}</span>}
        </div>
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {nodes.map((node) => {
          if (!node.parentId) return null;
          const parentNode = nodes.find((item) => item.id === node.parentId);
          if (!parentNode) return null;
          const startX = parentNode.x + 256;
          const startY = parentNode.y + 168;
          const endX = node.x;
          const endY = node.y + 168;
          return (
            <path
              key={`path-${node.id}`}
              d={`M ${startX} ${startY} C ${startX + 120} ${startY}, ${endX - 120} ${endY}, ${endX} ${endY}`}
              fill="none"
              stroke="url(#line-gradient)"
              strokeWidth="2"
              strokeDasharray="5,6"
            />
          );
        })}
        <defs>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative z-10 w-full h-full p-8 pt-44 overflow-auto">
        {nodes.length === 0 && (
          <div className="absolute left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0d0f19]/95 p-7 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/15 text-pink-300">
              <Upload size={24} />
            </div>
            <h2 className="text-2xl font-extrabold text-white">{copy.emptyTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{copy.emptySubtitle}</p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => sourceInputRef.current?.click()}
                className="h-11 px-5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-sm font-bold text-white flex items-center gap-2"
              >
                <Upload size={16} />
                {copy.uploadSource}
              </button>
              <button
                type="button"
                onClick={() => createSourceNode()}
                className="h-11 px-5 rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-zinc-200 hover:bg-white/10 flex items-center gap-2"
              >
                <Plus size={16} />
                {copy.createBlank}
              </button>
            </div>
            {canvasError && <p className="mt-4 text-xs font-bold text-pink-300">{canvasError}</p>}
          </div>
        )}

        {nodes.map((node) => {
          const isRoot = node.type === "root";
          const isVideo = node.type === "video";
          const isImage = node.type === "image";
          const isActive = activeNodeId === node.id;
          const isFirstImageNode = isImage && nodes.find((item) => item.type === "image")?.id === node.id;

          return (
            <div
              key={node.id}
              id={
                isRoot
                  ? "tour-canvas-root-node"
                  : isVideo
                    ? "tour-video-motion-node"
                    : isFirstImageNode
                      ? "tour-canvas-child-nodes"
                      : undefined
              }
              style={{ left: `${node.x}px`, top: `${node.y}px` }}
              onMouseDown={(event) => handleMouseDownNode(event, node.id)}
              className={cn(
                "absolute w-64 bg-[#0e101a]/95 border rounded-2xl shadow-2xl backdrop-blur-md transition-shadow duration-200 overflow-hidden group cursor-grab active:cursor-grabbing",
                isActive ? "border-pink-500 ring-2 ring-pink-500/30" : "border-white/10 hover:border-white/20",
              )}
            >
              <div className="px-3.5 py-2 bg-white/[0.04] border-b border-white/5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Move size={12} className="text-zinc-500 shrink-0" />
                  <span className="text-[10px] font-extrabold text-pink-400 uppercase tracking-wider">
                    {isVideo ? copy.videoNode : isRoot ? copy.referenceNode : copy.imageNode}
                  </span>
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs font-bold text-zinc-300 truncate max-w-[92px]">{node.title}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteNode(node.id);
                    }}
                    className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-white/10"
                    aria-label={isRoot ? copy.deleteWork : "Delete node"}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              <div className="relative h-72 bg-black flex items-center justify-center overflow-hidden">
                {(node.status === "generating" || node.status === "uploading") && (
                  <div className="absolute inset-0 z-20 bg-black/60 flex flex-col items-center justify-center gap-2 text-xs font-bold text-pink-200">
                    <Loader2 size={28} className="animate-spin" />
                    {node.status === "uploading" ? copy.uploading : copy.generatingSet}
                  </div>
                )}
                {node.status === "failed" && (
                  <div className="absolute top-3 right-3 z-20 px-2 py-1 rounded-lg bg-red-500/90 text-white text-[10px] font-bold">
                    {copy.failed}
                  </div>
                )}
                {isVideo && node.videoUrl ? (
                  <video src={node.videoUrl} controls className="w-full h-full object-cover" />
                ) : node.imageUrl ? (
                  <img src={node.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4 space-y-2">
                    {isVideo ? (
                      <VideoIcon size={34} className="mx-auto text-zinc-600" />
                    ) : (
                      <ImageIcon size={34} className="mx-auto text-zinc-600" />
                    )}
                    <span className="text-xs font-bold text-zinc-500 block">
                      {isRoot ? copy.uploadSource : copy.clickToGenerate}
                    </span>
                  </div>
                )}

                {node.influencerHandle && (
                  <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md text-white font-extrabold text-xs border border-white/10 dir-ltr">
                    {node.influencerHandle}
                  </div>
                )}

                {isImage && node.imageUrl && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleCreateVideoFromImage(node);
                    }}
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-purple-600/95 hover:bg-purple-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5"
                  >
                    <VideoIcon size={12} />
                    {copy.toVideoShort}
                  </button>
                )}

                {!isVideo && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleAddImageNode(node.id);
                    }}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-pink-500 hover:bg-pink-400 text-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition transform hover:scale-110"
                    aria-label={copy.addNode}
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>

              {isActive && (
                <div className="p-3 bg-[#0a0b12] border-t border-white/10 space-y-3 animate-in fade-in duration-200">
                  {isRoot && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => replaceInputRef.current?.click()}
                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <Upload size={12} />
                          {copy.replaceSource}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateNode(node.id, { imageUrl: undefined, publicImageUrl: undefined, status: "idle" })}
                          disabled={!node.imageUrl}
                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
                        >
                          <Trash2 size={12} />
                          {copy.removeSource}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateImageSet}
                        disabled={batchGenerating || !node.publicImageUrl}
                        className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md hover:opacity-90 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {batchGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {copy.generateSet}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNode(node.id)}
                        className="w-full px-3 py-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-red-500/15"
                      >
                        <Trash2 size={12} />
                        {copy.deleteWork}
                      </button>
                    </>
                  )}

                  {isImage && (
                    <>
                      <textarea
                        value={nodePrompt || node.prompt || ""}
                        onChange={(event) => setNodePrompt(event.target.value)}
                        placeholder={copy.nodePrompt}
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white placeholder-zinc-500 outline-none resize-none"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleGenerateNodeImage(node.id)}
                          disabled={node.status === "generating"}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md hover:opacity-90 transition flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Wand2 size={12} />
                          {copy.generate}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreateVideoFromImage(node)}
                          disabled={!node.imageUrl || node.status === "generating"}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-purple-200 text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-40"
                        >
                          <Play size={12} />
                          {copy.toVideo}
                        </button>
                      </div>
                    </>
                  )}

                  {isVideo && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <VideoIcon size={14} className="text-purple-300" />
                      {node.status === "ready" ? copy.videoNode : copy.generatingSet}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-30 max-w-3xl mx-auto bg-[#0d0f19]/95 border border-white/10 rounded-2xl p-3 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="rounded-xl border border-white/10 bg-black/50 p-1 flex items-center gap-1">
              {workflowModeOptions.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={`bottom-${mode.id}`}
                    type="button"
                    onClick={() => setWorkflowMode(mode.id)}
                    className={cn(
                      "h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition",
                      workflowMode === mode.id ? "bg-white text-black" : "text-zinc-400 hover:text-white hover:bg-white/10",
                    )}
                  >
                    <Icon size={13} />
                    {mode.label}
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-zinc-500">
              {workflowMode === "video" ? copy.videoModel : copy.imageModel}:{" "}
              <span className="text-zinc-300">{workflowMode === "video" ? selectedVideoModel : selectedImageModel}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={workflowMode === "video" ? videoPrompt : batchPrompt}
              onChange={(event) => {
                if (workflowMode === "video") setVideoPrompt(event.target.value);
                else setBatchPrompt(event.target.value);
              }}
              placeholder={
                workflowMode === "video"
                  ? copy.videoPromptPlaceholder
                  : isArabic
                    ? "اكتب المشهد هنا - مثال: @gavi في مقهى فاخر، إضاءة سينمائية، لقطة عمودية"
                    : "Describe the scene - e.g. @gavi in a luxury cafe, cinematic light, vertical shot"
              }
              className={cn(
                "h-10 flex-1 bg-black/60 border border-white/10 rounded-xl px-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-purple-500",
                isArabic ? "text-right" : "text-left",
              )}
            />
            {workflowMode === "video" && (
              <select
                value={selectedVideoModel}
                onChange={(event) => setSelectedVideoModel(event.target.value)}
                className="h-10 bg-black/60 border border-white/10 rounded-xl px-3 text-xs text-purple-200 outline-none"
              >
                {["Kling 3.0 Pro", "Seedance 2.0", "Kling 2.6"].map((model) => (
                  <option key={model} value={model} className="bg-[#0d0f19]">
                    {model}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={handlePromptGenerate}
              disabled={batchGenerating}
              className="h-10 px-5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {batchGenerating ? <Loader2 size={14} className="animate-spin" /> : workflowMode === "video" ? <VideoIcon size={14} /> : <Sparkles size={14} />}
              {workflowMode === "video" ? copy.toVideo : copy.generate}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
