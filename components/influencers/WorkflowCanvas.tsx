"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Sparkles, Wand2, Image as ImageIcon, Video as VideoIcon, Play, RefreshCw, X, Move, Layers, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type CanvasNode = {
  id: string;
  type: "root" | "image" | "video" | "faceswap";
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
  status: "idle" | "generating" | "ready";
};

interface WorkflowCanvasProps {
  initialNodes?: CanvasNode[];
  influencerHandles: string[];
  onGenerateImageNode?: (nodeId: string, prompt: string, handle: string, model: string, aspect: string) => Promise<string>;
  onGenerateVideoNode?: (nodeId: string, prompt: string, model: string) => Promise<string>;
}

export function WorkflowCanvas({
  initialNodes,
  influencerHandles = ["@gavi", "@sophie", "@katrina", "@kat"],
  onGenerateImageNode,
  onGenerateVideoNode,
}: WorkflowCanvasProps) {
  const [nodes, setNodes] = useState<CanvasNode[]>(
    initialNodes || [
      {
        id: "root-1",
        type: "root",
        x: 80,
        y: 160,
        title: "الصورة المرجعية لـ @gavi",
        imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500",
        influencerHandle: "@gavi",
        status: "ready",
      },
      {
        id: "child-1",
        type: "image",
        parentId: "root-1",
        x: 420,
        y: 60,
        title: "صورة ملابس رياضية",
        imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500",
        prompt: "@gavi wearing sports top outfit, marble background",
        influencerHandle: "@gavi",
        status: "ready",
      },
      {
        id: "child-2",
        type: "image",
        parentId: "root-1",
        x: 420,
        y: 380,
        title: "صورة فستان ساحلي",
        imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500",
        prompt: "@gavi in red dress on seaside balcony",
        influencerHandle: "@gavi",
        status: "ready",
      },
      {
        id: "child-3",
        type: "video",
        parentId: "child-2",
        x: 780,
        y: 380,
        title: "فيديو حركي للشاطئ",
        imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500",
        prompt: "She turns to camera, smiles softly at the seaside",
        status: "ready",
      },
    ]
  );

  const [activeNodeId, setActiveNodeId] = useState<string | null>("child-2");
  const [promptText, setPromptText] = useState("");
  const [selectedHandle, setSelectedHandle] = useState("@gavi");
  const [selectedModel, setSelectedModel] = useState("Nano Banana Pro");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Dragging Nodes state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("textarea") || (e.target as HTMLElement).closest("select")) {
      return;
    }
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setDraggingNodeId(nodeId);
    dragOffsetRef.current = {
      x: e.clientX - node.x,
      y: e.clientY - node.y,
    };
    setActiveNodeId(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId) return;
    const newX = Math.max(10, e.clientX - dragOffsetRef.current.x);
    const newY = Math.max(10, e.clientY - dragOffsetRef.current.y);

    setNodes((prev) =>
      prev.map((n) => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n))
    );
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
  };

  const handleAddChildNode = (parentId: string, type: "image" | "video") => {
    const parent = nodes.find((n) => n.id === parentId);
    const newId = `node-${Date.now()}`;
    const newNode: CanvasNode = {
      id: newId,
      type,
      parentId,
      x: (parent?.x || 200) + 360,
      y: (parent?.y || 200) + (type === "video" ? 40 : 0),
      title: type === "image" ? "عقدة صورة جديدة" : "عقدة فيديو جديدة",
      influencerHandle: parent?.influencerHandle || selectedHandle,
      status: "idle",
    };
    setNodes((prev) => [...prev, newNode]);
    setActiveNodeId(newId);
  };

  const handleAddNewRootNode = () => {
    const newId = `node-${Date.now()}`;
    const newNode: CanvasNode = {
      id: newId,
      type: "image",
      x: 200,
      y: 200,
      title: "عقدة صورة مستقلة",
      influencerHandle: selectedHandle,
      status: "idle",
    };
    setNodes((prev) => [...prev, newNode]);
    setActiveNodeId(newId);
  };

  const handleGenerate = async (nodeId: string) => {
    const targetNode = nodes.find((n) => n.id === nodeId);
    if (!targetNode) return;

    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, status: "generating", prompt: promptText } : n))
    );

    try {
      let resultUrl = "";
      if (targetNode.type === "video" && onGenerateVideoNode) {
        resultUrl = await onGenerateVideoNode(nodeId, promptText || "Motion render", selectedModel);
      } else if (onGenerateImageNode) {
        resultUrl = await onGenerateImageNode(nodeId, promptText || "@gavi pose", selectedHandle, selectedModel, aspectRatio);
      } else {
        await new Promise((r) => setTimeout(r, 1400));
        resultUrl = targetNode.imageUrl || "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500";
      }

      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                status: "ready",
                imageUrl: resultUrl,
              }
            : n
        )
      );
    } catch {
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, status: "ready" } : n)));
    }
  };

  const handleEnhancePrompt = () => {
    setIsEnhancing(true);
    setTimeout(() => {
      setPromptText((prev) =>
        prev ? `${prev}, highly detailed photorealistic skin texture, natural soft daylight, 85mm lens portrait` : `${selectedHandle} in a luxury beach resort, ultra-realistic UGC style photo`
      );
      setIsEnhancing(false);
    }, 500);
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId && n.parentId !== nodeId));
    if (activeNodeId === nodeId) setActiveNodeId(null);
  };

  return (
    <div
      className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#07080f] select-none"
      id="tour-canvas-board"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0c_1px,transparent_1px)] [background-size:28px_28px] opacity-80 pointer-events-none" />

      {/* Top Floating Control Bar matching screenshot 4 & 5 */}
      <div className="absolute top-4 left-6 z-30 flex items-center gap-3 bg-[#0d0f19]/90 border border-white/10 p-2 rounded-2xl shadow-2xl backdrop-blur-xl">
        <button
          onClick={handleAddNewRootNode}
          className="px-3.5 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-pink-500/20"
        >
          <Plus size={14} />
          إضافة عقدة جديدة (+ Node)
        </button>

        <div className="h-4 w-px bg-white/10" />

        <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
          <span>المؤثر النشط:</span>
          <select
            value={selectedHandle}
            onChange={(e) => setSelectedHandle(e.target.value)}
            className="bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-pink-300 font-mono outline-none dir-ltr"
          >
            {influencerHandles.map((h) => (
              <option key={h} value={h} className="bg-[#0d0f19] text-pink-300">
                {h}
              </option>
            ))}
          </select>
        </div>

        <div className="h-4 w-px bg-white/10" />

        <span className="text-[11px] font-semibold text-zinc-400">
          عدد العقد: <strong className="text-white">{nodes.length}</strong>
        </span>
      </div>

      {/* Canvas SVG Connector Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {nodes.map((node) => {
          if (!node.parentId) return null;
          const parentNode = nodes.find((n) => n.id === node.parentId);
          if (!parentNode) return null;

          const startX = parentNode.x + 240;
          const startY = parentNode.y + 160;
          const endX = node.x;
          const endY = node.y + 160;
          const controlX1 = startX + 120;
          const controlY1 = startY;
          const controlX2 = endX - 120;
          const controlY2 = endY;

          return (
            <g key={`path-${node.id}`}>
              <path
                d={`M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`}
                fill="none"
                stroke="url(#line-gradient)"
                strokeWidth="2.5"
                strokeDasharray="6,6"
                className="animate-pulse"
              />
              <circle cx={startX} cy={startY} r="4" fill="#ec4899" />
              <circle cx={endX} cy={endY} r="4" fill="#a855f7" />
            </g>
          );
        })}
        <defs>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>

      {/* Render Node Cards */}
      <div className="relative z-10 w-full h-full p-8 overflow-auto">
        <div id="tour-canvas-child-nodes">
          {nodes.map((node) => {
            const isRoot = node.type === "root";
            const isVideo = node.type === "video";

            return (
              <div
                key={node.id}
                id={isRoot ? "tour-canvas-root-node" : isVideo ? "tour-video-motion-node" : undefined}
                style={{ left: `${node.x}px`, top: `${node.y}px` }}
                onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                className={cn(
                  "absolute w-64 bg-[#0e101a]/95 border rounded-2xl shadow-2xl backdrop-blur-md transition-shadow duration-200 overflow-hidden group cursor-grab active:cursor-grabbing",
                  activeNodeId === node.id ? "border-pink-500 ring-2 ring-pink-500/30" : "border-white/10 hover:border-white/20"
                )}
              >
                {/* Node Top Header */}
                <div className="px-3.5 py-2 bg-white/[0.04] border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Move size={12} className="text-zinc-500" />
                    <span className="text-[10px] font-extrabold text-pink-400 uppercase tracking-wider">
                      {isVideo ? "فيديو" : "صورة"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-zinc-300 truncate max-w-[100px]">{node.title}</span>
                    {!isRoot && (
                      <button
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

                {/* Node Media Thumbnail Area */}
                <div className="relative h-72 bg-black flex items-center justify-center overflow-hidden">
                  {node.imageUrl ? (
                    <img src={node.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4 space-y-2">
                      <ImageIcon size={32} className="mx-auto text-zinc-600" />
                      <span className="text-xs font-bold text-zinc-500 block">انقر للتوليد</span>
                    </div>
                  )}

                  {/* Handles Overlay Badge */}
                  {node.influencerHandle && (
                    <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md text-white font-extrabold text-xs border border-white/10 dir-ltr">
                      {node.influencerHandle}
                    </div>
                  )}

                  {/* Add Child Node Floating Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddChildNode(node.id, "image");
                    }}
                    title="إضافة عقدة صورة فرعية"
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-pink-500 hover:bg-pink-400 text-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition transform hover:scale-110"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Prompt & Config Bar inside active card */}
                {activeNodeId === node.id && !isRoot && (
                  <div className="p-3 bg-[#0a0b12] border-t border-white/10 space-y-3 animate-in fade-in duration-200">
                    <textarea
                      value={promptText || node.prompt || ""}
                      onChange={(e) => setPromptText(e.target.value)}
                      placeholder="...اكتب نص التوليد واستدعِ @handle"
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white placeholder-zinc-500 outline-none resize-none dir-rtl"
                    />

                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleEnhancePrompt}
                        disabled={isEnhancing}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-bold border border-purple-500/30 flex items-center gap-1 transition"
                      >
                        <Sparkles size={10} />
                        Enhance
                      </button>

                      <button
                        onClick={() => handleGenerate(node.id)}
                        disabled={node.status === "generating"}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md hover:opacity-90 transition flex items-center gap-1 disabled:opacity-50"
                      >
                        <Wand2 size={12} />
                        توليد
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
