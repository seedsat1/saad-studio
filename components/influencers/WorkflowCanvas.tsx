"use client";

import { useState, useRef } from "react";
import { Plus, Sparkles, Wand2, Image as ImageIcon, Video as VideoIcon, Play, RefreshCw, X, ArrowRight, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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
        x: 100,
        y: 180,
        title: "صورة مرجعية",
        imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500",
        influencerHandle: "@gavi",
        status: "ready",
      },
      {
        id: "child-1",
        type: "image",
        parentId: "root-1",
        x: 450,
        y: 80,
        title: "صورة فستان وردي",
        imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500",
        prompt: "@gavi in a pink bear hoodie pose",
        influencerHandle: "@gavi",
        status: "ready",
      },
      {
        id: "child-2",
        type: "image",
        parentId: "root-1",
        x: 450,
        y: 320,
        title: "صورة الشاطئ",
        imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500",
        prompt: "@gavi in a red dress on beach balcony at sunset",
        influencerHandle: "@gavi",
        status: "ready",
      },
      {
        id: "child-3",
        type: "video",
        parentId: "child-2",
        x: 820,
        y: 320,
        title: "فيديو حركة الشاطئ",
        imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500",
        prompt: "She turns to camera, smiles and plays with hair softly",
        status: "ready",
      },
    ]
  );

  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [promptText, setPromptText] = useState("");
  const [selectedHandle, setSelectedHandle] = useState("@gavi");
  const [selectedModel, setSelectedModel] = useState("Nano Banana Pro");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [isEnhancing, setIsEnhancing] = useState(false);

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
      influencerHandle: parent?.influencerHandle || "@gavi",
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
        await new Promise((r) => setTimeout(r, 1200));
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

  return (
    <div className="relative w-full h-[calc(100vh-6rem)] overflow-hidden bg-[#07080f] select-none" id="tour-canvas-board">
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />

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
          const controlX1 = startX + 100;
          const controlY1 = startY;
          const controlX2 = endX - 100;
          const controlY2 = endY;

          return (
            <g key={`path-${node.id}`}>
              <path
                d={`M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`}
                fill="none"
                stroke="url(#line-gradient)"
                strokeWidth="2"
                strokeDasharray="6,6"
                className="animate-pulse"
              />
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
            const isRoot = node.id === "root-1";
            const isVideo = node.type === "video";

            return (
              <div
                key={node.id}
                id={isRoot ? "tour-canvas-root-node" : isVideo ? "tour-video-motion-node" : undefined}
                style={{ left: `${node.x}px`, top: `${node.y}px` }}
                className={cn(
                  "absolute w-64 bg-[#0e101a]/95 border rounded-2xl shadow-2xl backdrop-blur-md transition-all duration-300 overflow-hidden group",
                  activeNodeId === node.id ? "border-pink-500 ring-2 ring-pink-500/30" : "border-white/10 hover:border-white/20"
                )}
                onClick={() => setActiveNodeId(node.id)}
              >
                {/* Node Top Header */}
                <div className="px-3.5 py-2 bg-white/[0.03] border-b border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-pink-400 uppercase tracking-wider">
                    {isVideo ? "فيديو" : "صورة"}
                  </span>
                  <span className="text-xs font-bold text-zinc-300 truncate max-w-[120px]">{node.title}</span>
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
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md hover:opacity-90 transition flex items-center gap-1"
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
