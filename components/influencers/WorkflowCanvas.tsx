"use client";

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Image as ImageIcon,
  Loader2,
  Move,
  Play,
  Plus,
  Sparkles,
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
  videoUrl?: string;
  prompt?: string;
  influencerHandle?: string;
  model?: string;
  aspectRatio?: string;
  status: "idle" | "generating" | "ready" | "failed";
};

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

function getImageModelId(modelName: string) {
  if (modelName.includes("Seedream")) return "seedream/5-pro";
  if (modelName.includes("Flux")) return "flux-2/pro-text-to-image";
  if (modelName.includes("GPT")) return "gpt-image-2";
  return "qwen";
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
  const initialHandle = useMemo(
    () => normalizeHandle(searchParams?.get("talent"), influencerHandles[0] || "@gavi"),
    [searchParams, influencerHandles]
  );

  const copy = isArabic
    ? {
        addNode: "إضافة عقدة",
        activeTalent: "الموهبة",
        imageCount: "عدد الصور",
        nodes: "العقد",
        basePrompt: "فكرة المجموعة",
        promptPlaceholder: "مثال: حملة أزياء فاخرة، أماكن مختلفة، صور واقعية للسوشيال ميديا",
        generateSet: "ولّد مجموعة صور",
        generatingSet: "جاري توليد المجموعة...",
        aspect: "الأبعاد",
        imageModel: "نموذج الصور",
        videoModel: "نموذج الفيديو",
        imageNode: "صورة",
        videoNode: "فيديو",
        referenceNode: "الشخصية الأصلية",
        clickToGenerate: "اكتب وصفاً ثم ولّد",
        nodePrompt: "وصف هذه العقدة",
        generate: "توليد",
        toVideo: "حوّل إلى فيديو",
        videoPrompt: "حركة الفيديو",
        videoPromptPlaceholder: "مثال: تنظر للكاميرا، حركة شعر خفيفة، مشهد سينمائي",
        failed: "فشل",
      }
    : {
        addNode: "Add Node",
        activeTalent: "Talent",
        imageCount: "Image count",
        nodes: "nodes",
        basePrompt: "Set idea",
        promptPlaceholder: "Example: luxury fashion campaign, different places, realistic social media photos",
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
        videoPrompt: "Video motion",
        videoPromptPlaceholder: "Example: looking at camera, gentle hair movement, cinematic shot",
        failed: "Failed",
      };

  const [nodes, setNodes] = useState<CanvasNode[]>(
    initialNodes || [
      {
        id: "root-1",
        type: "root",
        x: 60,
        y: 260,
        title: copy.referenceNode,
        imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500",
        influencerHandle: initialHandle,
        status: "ready",
      },
    ]
  );
  const [activeNodeId, setActiveNodeId] = useState<string | null>("root-1");
  const [selectedHandle, setSelectedHandle] = useState(initialHandle);
  const [selectedImageModel, setSelectedImageModel] = useState("Nano Banana Pro");
  const [selectedVideoModel, setSelectedVideoModel] = useState("Kling 3.0 Pro");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [batchCount, setBatchCount] = useState(8);
  const [batchPrompt, setBatchPrompt] = useState("");
  const [nodePrompt, setNodePrompt] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const activeNode = nodes.find((node) => node.id === activeNodeId) || null;

  const updateNode = (nodeId: string, patch: Partial<CanvasNode>) => {
    setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)));
  };

  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("textarea") || target.closest("select") || target.closest("input")) return;

    const node = nodes.find((item) => item.id === nodeId);
    if (!node || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setDraggingNodeId(nodeId);
    dragOffsetRef.current = {
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y,
    };
    setActiveNodeId(nodeId);
    setNodePrompt(node.prompt || "");
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    updateNode(draggingNodeId, {
      x: Math.max(10, e.clientX - rect.left - dragOffsetRef.current.x),
      y: Math.max(10, e.clientY - rect.top - dragOffsetRef.current.y),
    });
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((node) => node.id !== nodeId && node.parentId !== nodeId));
    if (activeNodeId === nodeId) setActiveNodeId("root-1");
  };

  const handleAddImageNode = (parentId = activeNodeId || "root-1") => {
    const parent = nodes.find((node) => node.id === parentId) || nodes[0];
    const id = `image-${Date.now()}`;
    const newNode: CanvasNode = {
      id,
      type: "image",
      parentId: parent?.id || "root-1",
      x: (parent?.x || 60) + 340,
      y: parent?.y || 260,
      title: copy.imageNode,
      influencerHandle: parent?.influencerHandle || selectedHandle,
      aspectRatio,
      status: "idle",
    };
    setNodes((prev) => [...prev, newNode]);
    setActiveNodeId(id);
  };

  const generateImage = async (prompt: string) => {
    const res = await fetch("/api/image/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        model: getImageModelId(selectedImageModel),
        aspectRatio,
        quality: "1K",
      }),
    });
    const data = await res.json().catch(() => null);
    const url = data?.mediaUrl || data?.url || data?.imageUrl;
    if (!res.ok || !url) throw new Error(data?.error || "Image generation failed");
    return url as string;
  };

  const handleGenerateNodeImage = async (nodeId: string) => {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;

    const prompt = nodePrompt.trim() || node.prompt || `${selectedHandle} realistic lifestyle photo`;
    updateNode(nodeId, { status: "generating", prompt });

    try {
      const url = onGenerateImageNode
        ? await onGenerateImageNode(nodeId, prompt, selectedHandle, selectedImageModel, aspectRatio)
        : await generateImage(prompt.includes("@") ? prompt : `${selectedHandle} ${prompt}`);
      updateNode(nodeId, { status: "ready", imageUrl: url });
    } catch {
      updateNode(nodeId, { status: "failed" });
    }
  };

  const handleGenerateImageSet = async () => {
    const root = nodes.find((node) => node.type === "root") || nodes[0];
    if (!root) return;

    const basePrompt = batchPrompt.trim() || "realistic social media photo set, different locations and outfits";
    const count = Math.min(Math.max(batchCount, 1), IMAGE_VARIANTS.length);
    const createdNodes: CanvasNode[] = Array.from({ length: count }).map((_, index) => {
      const column = index < Math.ceil(count / 2) ? 0 : 1;
      const row = index % Math.ceil(count / 2);
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
        const url = await generateImage(node.prompt || `${selectedHandle} ${basePrompt}`);
        updateNode(node.id, { status: "ready", imageUrl: url });
      } catch {
        updateNode(node.id, { status: "failed" });
      }
    }

    setBatchGenerating(false);
  };

  const pollVideoResult = async (taskId: string) => {
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const res = await fetch(`/api/video?taskId=${encodeURIComponent(taskId)}`).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (data?.status === "completed" && data?.videoUrl) return data.videoUrl as string;
      if (data?.status === "failed") throw new Error(data?.error || "Video generation failed");
    }
    throw new Error("Video generation timed out");
  };

  const handleCreateVideoFromImage = async (imageNode: CanvasNode) => {
    if (!imageNode.imageUrl) return;

    const id = `video-${Date.now()}`;
    const prompt = videoPrompt.trim() || `${imageNode.influencerHandle || selectedHandle} looking at camera, gentle motion, cinematic lighting`;
    const newNode: CanvasNode = {
      id,
      type: "video",
      parentId: imageNode.id,
      x: imageNode.x + 340,
      y: imageNode.y,
      title: copy.videoNode,
      imageUrl: imageNode.imageUrl,
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
        const res = await fetch("/api/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelRoute: getVideoModelRoute(selectedVideoModel),
            payload: {
              prompt,
              duration: 5,
              aspect_ratio: aspectRatio,
              image_url: imageNode.imageUrl,
              resolution: "720p",
            },
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || (!data?.taskId && !data?.videoUrl)) throw new Error(data?.error || "Video generation failed");
        videoUrl = data.videoUrl || (await pollVideoResult(data.taskId));
      }
      updateNode(id, { status: "ready", videoUrl });
    } catch {
      updateNode(id, { status: "failed" });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-[760px] h-[calc(100vh-8rem)] overflow-hidden bg-[#07080f] select-none"
      id="tour-canvas-board"
      onMouseMove={handleMouseMove}
      onMouseUp={() => setDraggingNodeId(null)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0c_1px,transparent_1px)] [background-size:28px_28px] opacity-80 pointer-events-none" />

      <div className="absolute top-4 left-4 right-4 z-30 bg-[#0d0f19]/95 border border-white/10 p-3 rounded-2xl shadow-2xl backdrop-blur-xl">
        <div className="grid grid-cols-1 xl:grid-cols-[auto_auto_auto_auto_1fr_auto] gap-3 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500">{copy.activeTalent}</label>
            <select
              value={selectedHandle}
              onChange={(e) => setSelectedHandle(e.target.value)}
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
              onChange={(e) => setBatchCount(Number(e.target.value))}
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
              onChange={(e) => setAspectRatio(e.target.value)}
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
              onChange={(e) => setSelectedImageModel(e.target.value)}
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
              onChange={(e) => setBatchPrompt(e.target.value)}
              placeholder={copy.promptPlaceholder}
              className={cn(
                "h-9 w-full bg-black/60 border border-white/10 rounded-xl px-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-pink-500",
                isArabic ? "text-right" : "text-left"
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddImageNode()}
              className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-bold flex items-center gap-1.5"
            >
              <Plus size={14} />
              {copy.addNode}
            </button>
            <button
              type="button"
              onClick={handleGenerateImageSet}
              disabled={batchGenerating}
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-lg shadow-pink-500/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {batchGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {batchGenerating ? copy.generatingSet : copy.generateSet}
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-500">
          <span>
            {nodes.length} {copy.nodes}
          </span>
          <span className="h-1 w-1 rounded-full bg-zinc-700" />
          <span>{copy.videoModel}: {selectedVideoModel}</span>
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

      <div className="relative z-10 w-full h-full p-8 pt-28 overflow-auto">
        {nodes.map((node) => {
          const isRoot = node.type === "root";
          const isVideo = node.type === "video";
          const isActive = activeNodeId === node.id;

          return (
            <div
              key={node.id}
              id={isRoot ? "tour-canvas-root-node" : isVideo ? "tour-video-motion-node" : undefined}
              style={{ left: `${node.x}px`, top: `${node.y}px` }}
              onMouseDown={(e) => handleMouseDownNode(e, node.id)}
              className={cn(
                "absolute w-64 bg-[#0e101a]/95 border rounded-2xl shadow-2xl backdrop-blur-md transition-shadow duration-200 overflow-hidden group cursor-grab active:cursor-grabbing",
                isActive ? "border-pink-500 ring-2 ring-pink-500/30" : "border-white/10 hover:border-white/20"
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
                  {!isRoot && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-white/10"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div className="relative h-72 bg-black flex items-center justify-center overflow-hidden">
                {node.status === "generating" && (
                  <div className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center">
                    <Loader2 size={28} className="animate-spin text-pink-300" />
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
                    {isVideo ? <VideoIcon size={34} className="mx-auto text-zinc-600" /> : <ImageIcon size={34} className="mx-auto text-zinc-600" />}
                    <span className="text-xs font-bold text-zinc-500 block">{copy.clickToGenerate}</span>
                  </div>
                )}

                {node.influencerHandle && (
                  <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md text-white font-extrabold text-xs border border-white/10 dir-ltr">
                    {node.influencerHandle}
                  </div>
                )}

                {!isVideo && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddImageNode(node.id);
                    }}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-pink-500 hover:bg-pink-400 text-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition transform hover:scale-110"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>

              {isActive && (
                <div className="p-3 bg-[#0a0b12] border-t border-white/10 space-y-3 animate-in fade-in duration-200">
                  {!isRoot && !isVideo && (
                    <>
                      <textarea
                        value={nodePrompt || node.prompt || ""}
                        onChange={(e) => setNodePrompt(e.target.value)}
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

                  {isRoot && (
                    <button
                      type="button"
                      onClick={handleGenerateImageSet}
                      disabled={batchGenerating}
                      className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md hover:opacity-90 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {batchGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {copy.generateSet}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeNode?.type === "image" && activeNode.imageUrl && (
        <div className="absolute bottom-4 left-4 right-4 z-30 max-w-2xl mx-auto bg-[#0d0f19]/95 border border-white/10 rounded-2xl p-3 shadow-2xl backdrop-blur-xl">
          <label className="text-[10px] font-bold text-zinc-500">{copy.videoPrompt}</label>
          <div className="flex gap-2 mt-1">
            <input
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              placeholder={copy.videoPromptPlaceholder}
              className={cn(
                "h-10 flex-1 bg-black/60 border border-white/10 rounded-xl px-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-purple-500",
                isArabic ? "text-right" : "text-left"
              )}
            />
            <select
              value={selectedVideoModel}
              onChange={(e) => setSelectedVideoModel(e.target.value)}
              className="h-10 bg-black/60 border border-white/10 rounded-xl px-3 text-xs text-purple-200 outline-none"
            >
              {["Kling 3.0 Pro", "Seedance 2.0", "Kling 2.6"].map((model) => (
                <option key={model} value={model} className="bg-[#0d0f19]">
                  {model}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleCreateVideoFromImage(activeNode)}
              className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <VideoIcon size={14} />
              {copy.toVideo}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
