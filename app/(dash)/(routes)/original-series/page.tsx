"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useRef, useState, useMemo, type ComponentType } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useViewport,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type OnSelectionChangeParams,
  type NodeProps,
} from "@xyflow/react";

import { CanvasNode } from "@/components/canvas/CanvasNode";
import { NodeTypeIcon } from "@/components/canvas/node-icons";
import { CanvasContext, type CanvasContextValue } from "@/components/canvas/canvas-context";
import {
  NODE_CONFIGS,
  type CanvasNodeData,
  type CanvasNodeType,
  type CanvasNodeSettings,
  type ActivityEntry,
} from "@/components/canvas/canvas-types";

const nodeTypes = { canvasNode: CanvasNode as ComponentType<NodeProps> };

const defaultEdgeOptions = {
  type: "default",
  animated: false,
  style: {
    stroke: "rgba(99,102,241,0.55)",
    strokeWidth: 2.5,
    filter: "drop-shadow(0 0 6px rgba(99,102,241,0.4))",
  },
};

function makeNode(
  id: string,
  type: CanvasNodeType,
  position: { x: number; y: number },
  settingsOverride?: Partial<CanvasNodeSettings>,
  dataOverride?: Partial<CanvasNodeData>,
): Node<CanvasNodeData> {
  const cfg = NODE_CONFIGS[type];
  return {
    id,
    type: "canvasNode",
    position,
    data: {
      nodeType: type,
      label: `${cfg.label} #1`,
      description: cfg.description,
      status: "idle",
      settings: { ...cfg.defaultSettings, ...settingsOverride },
      creditCost: cfg.creditCost,
      ...dataOverride,
    },
  };
}

const GENERATED_KEY_VISUAL = "/ai-canvas-generated/luxury-jewelry-key-visual.png";
const GENERATED_CAMPAIGN_BOARD = "/ai-canvas-generated/luxury-jewelry-campaign-board.png";

const promptEdgeStyle = { stroke: "rgba(216,180,254,0.78)", strokeWidth: 2.5, filter: "drop-shadow(0 0 6px rgba(216,180,254,0.45))" };
const imageEdgeStyle = { stroke: "rgba(94,234,212,0.72)", strokeWidth: 2.5, filter: "drop-shadow(0 0 6px rgba(94,234,212,0.32))" };
const boardEdgeStyle = { stroke: "rgba(251,191,36,0.78)", strokeWidth: 3, filter: "drop-shadow(0 0 8px rgba(251,191,36,0.45))" };
const videoEdgeStyle = { stroke: "rgba(16,185,129,0.72)", strokeWidth: 2.5, filter: "drop-shadow(0 0 6px rgba(16,185,129,0.35))" };

const INITIAL_NODES: Node<CanvasNodeData>[] = [
  makeNode("brief", "sticky-note", { x: -1260, y: -260 }, {
    noteText: "Campaign production graph\n\nGoal: build a full luxury jewelry ad from controlled references.\n\nFlow:\n1. Add character, jewelry, location, and brand references.\n2. Use one master prompt to lock style and identity.\n3. Generate approved still frames.\n4. Assemble the campaign board.\n5. Animate selected frames and export the final package.",
  }, {
    label: "Production brief",
    description: "The workflow starts here",
  }),
  makeNode("character-ref", "add-reference", { x: -1260, y: 130 }, undefined, {
    label: "Character reference",
    description: "Actor/model identity sheet",
  }),
  makeNode("product-ref", "add-reference", { x: -1260, y: 470 }, undefined, {
    label: "Jewelry reference",
    description: "Ruby-gold necklace, earrings, bracelet, and ring",
  }),
  makeNode("location-ref", "add-reference", { x: -1260, y: 810 }, undefined, {
    label: "Desert location reference",
    description: "Warm dusk desert and atmospheric dust",
  }),
  makeNode("brand-ref", "add-reference", { x: -1260, y: 1150 }, undefined, {
    label: "Brand mood reference",
    description: "Editorial lighting, color, and premium tone",
  }),
  makeNode("master-prompt", "text-prompt", { x: -760, y: 230 }, {
    prompt: "Create an original luxury jewelry advertising campaign for a ruby-gold jewelry set. Keep one sophisticated woman consistent across all frames, wearing an elegant black evening dress in a warm dusk desert landscape. The necklace, earrings, bracelet, and ring must stay consistent, realistic, detailed, and premium. Visual language: golden sunset rim light, soft wind, atmospheric dust, shallow depth of field, ARRI Alexa commercial look, anamorphic lens, rich contrast, natural skin tones, editorial fashion composition. Generate a coherent ad sequence: wide hero, portrait, hand macro, necklace close-up, jewelry product study, walking silhouette, beauty profile, and final campaign board. No text, no logos, no watermark, no distorted hands, no extra fingers, no warped jewelry.",
  }, {
    label: "Master campaign prompt",
    description: "One prompt controls the whole graph",
  }),
  makeNode("shot-plan", "list", { x: -760, y: 610 }, {
    noteText: "01 Wide desert hero\n02 Beauty portrait with jewelry\n03 Hand macro with ruby ring\n04 Necklace and earrings close-up\n05 Jewelry product study\n06 Walking silhouette in wind\n07 Profile shot with sunset rim light\n08 Final campaign board / contact sheet",
  }, {
    label: "Shot list",
    description: "Planned frames before generation",
  }),
  makeNode("quality-rules", "sticky-note", { x: -760, y: 960 }, {
    noteText: "Consistency checks\n\n- Same character identity in every frame.\n- Jewelry design must not drift.\n- Warm gold/black/red palette only.\n- Keep hands natural and products readable.\n- Approved frames can be routed to video.",
  }, {
    label: "Approval rules",
    description: "Quality gate before downstream generation",
  }),
  makeNode("hero-frame", "text-to-image", { x: -260, y: -170 }, {
    prompt: "Wide hero shot using the connected character, jewelry, location, and brand references. Show the woman in the black dress holding the ruby jewelry in a warm desert sunset. Premium cinematic lighting, clean high-end campaign composition.",
    modelId: "nano-banana-pro",
    aspectRatio: "16:9",
  }, {
    label: "Nano Banana - hero frame",
    description: "Generated wide hero image",
    status: "done",
    outputImageUrl: GENERATED_KEY_VISUAL,
  }),
  makeNode("portrait-frame", "text-to-image", { x: -260, y: 200 }, {
    prompt: "Medium beauty portrait from the same campaign. Preserve the same woman, black evening dress, ruby-gold jewelry, golden rim light, and natural skin texture.",
    modelId: "nano-banana-pro",
    aspectRatio: "16:9",
  }, {
    label: "Nano Banana - portrait",
    description: "Identity and beauty frame",
  }),
  makeNode("hand-macro-frame", "text-to-image", { x: -260, y: 570 }, {
    prompt: "Cinematic macro close-up of a hand wearing the ruby ring and bracelet, touching dark desert sand. Realistic fingers, detailed gemstone reflections, premium jewelry lighting.",
    modelId: "nano-banana-pro",
    aspectRatio: "16:9",
  }, {
    label: "Nano Banana - hand macro",
    description: "Product detail frame",
  }),
  makeNode("necklace-frame", "text-to-image", { x: -260, y: 940 }, {
    prompt: "Close-up of the ruby necklace and earrings on the same woman, warm sunset light, soft shadows, elegant fashion ad framing, realistic stones and metal.",
    modelId: "nano-banana-pro",
    aspectRatio: "16:9",
  }, {
    label: "Nano Banana - necklace close",
    description: "Premium product close-up",
  }),
  makeNode("product-study-frame", "text-to-image", { x: 220, y: 200 }, {
    prompt: "Clean product reference board of the ruby-gold jewelry set on neutral background: necklace, earrings, ring, and bracelet. Keep the same design language from the campaign.",
    modelId: "nano-banana-pro",
    aspectRatio: "16:9",
  }, {
    label: "Nano Banana - product study",
    description: "Product continuity check",
  }),
  makeNode("campaign-board", "text-to-image", { x: 220, y: 620 }, {
    prompt: "Assemble the approved frames into a cinematic campaign production board/contact sheet. Include the wide hero, portrait, macro hand, necklace close-up, jewelry product study, walking silhouette, beauty profile, and final campaign composition. No labels, no logos, no text overlays.",
    modelId: "nano-banana-pro",
    aspectRatio: "16:9",
  }, {
    label: "Final image board",
    description: "Generated campaign board from the graph",
    status: "done",
    outputImageUrl: GENERATED_CAMPAIGN_BOARD,
  }),
  makeNode("motion-hero", "image-to-video", { x: 720, y: -70 }, {
    prompt: "Slow cinematic dolly push from the approved hero frame. Preserve character identity, jewelry design, desert sunset, and premium commercial pacing.",
    modelId: "kling/v2-5-turbo-image-to-video-pro",
    aspectRatio: "16:9",
    duration: 5,
  }, {
    label: "Kling - hero motion",
    description: "Animate the approved hero frame",
  }),
  makeNode("motion-detail", "image-to-video", { x: 720, y: 500 }, {
    prompt: "Macro camera glide over the approved jewelry close-up. Keep gemstone shape stable, natural hand anatomy, shallow focus, and warm premium lighting.",
    modelId: "kling/v2-5-turbo-image-to-video-pro",
    aspectRatio: "16:9",
    duration: 5,
  }, {
    label: "Kling - product motion",
    description: "Animate the product detail frames",
  }),
  makeNode("final-export", "export", { x: 1200, y: 310 }, undefined, {
    label: "Final campaign output",
    description: "Complete result from prompt to board and video routing",
    status: "done",
    outputImageUrl: GENERATED_CAMPAIGN_BOARD,
  }),
];

const INITIAL_EDGES: Edge[] = [
  { id: "brief-master", source: "brief", sourceHandle: "prompt", target: "master-prompt", targetHandle: "prompt", type: "default", style: promptEdgeStyle },
  { id: "master-hero", source: "master-prompt", sourceHandle: "prompt", target: "hero-frame", targetHandle: "prompt", type: "default", style: promptEdgeStyle },
  { id: "master-portrait", source: "master-prompt", sourceHandle: "prompt", target: "portrait-frame", targetHandle: "prompt", type: "default", style: promptEdgeStyle },
  { id: "master-hand", source: "master-prompt", sourceHandle: "prompt", target: "hand-macro-frame", targetHandle: "prompt", type: "default", style: promptEdgeStyle },
  { id: "master-necklace", source: "master-prompt", sourceHandle: "prompt", target: "necklace-frame", targetHandle: "prompt", type: "default", style: promptEdgeStyle },
  { id: "master-product", source: "master-prompt", sourceHandle: "prompt", target: "product-study-frame", targetHandle: "prompt", type: "default", style: promptEdgeStyle },
  { id: "plan-board", source: "shot-plan", sourceHandle: "prompt", target: "campaign-board", targetHandle: "prompt", type: "default", style: promptEdgeStyle },
  { id: "char-hero", source: "character-ref", sourceHandle: "image", target: "hero-frame", targetHandle: "image", type: "default", style: imageEdgeStyle },
  { id: "char-portrait", source: "character-ref", sourceHandle: "image", target: "portrait-frame", targetHandle: "image", type: "default", style: imageEdgeStyle },
  { id: "product-hand", source: "product-ref", sourceHandle: "image", target: "hand-macro-frame", targetHandle: "image", type: "default", style: imageEdgeStyle },
  { id: "product-necklace", source: "product-ref", sourceHandle: "image", target: "necklace-frame", targetHandle: "image", type: "default", style: imageEdgeStyle },
  { id: "product-study", source: "product-ref", sourceHandle: "image", target: "product-study-frame", targetHandle: "image", type: "default", style: imageEdgeStyle },
  { id: "location-hero", source: "location-ref", sourceHandle: "image", target: "hero-frame", targetHandle: "image", type: "default", style: imageEdgeStyle },
  { id: "brand-board", source: "brand-ref", sourceHandle: "image", target: "campaign-board", targetHandle: "image", type: "default", style: imageEdgeStyle },
  { id: "hero-board", source: "hero-frame", sourceHandle: "image", target: "campaign-board", targetHandle: "image", type: "default", style: boardEdgeStyle },
  { id: "portrait-board", source: "portrait-frame", sourceHandle: "image", target: "campaign-board", targetHandle: "image", type: "default", style: boardEdgeStyle },
  { id: "hand-board", source: "hand-macro-frame", sourceHandle: "image", target: "campaign-board", targetHandle: "image", type: "default", style: boardEdgeStyle },
  { id: "necklace-board", source: "necklace-frame", sourceHandle: "image", target: "campaign-board", targetHandle: "image", type: "default", style: boardEdgeStyle },
  { id: "study-board", source: "product-study-frame", sourceHandle: "image", target: "campaign-board", targetHandle: "image", type: "default", style: boardEdgeStyle },
  { id: "hero-motion", source: "hero-frame", sourceHandle: "image", target: "motion-hero", targetHandle: "image", type: "default", style: videoEdgeStyle },
  { id: "detail-motion", source: "hand-macro-frame", sourceHandle: "image", target: "motion-detail", targetHandle: "image", type: "default", style: videoEdgeStyle },
  { id: "board-export", source: "campaign-board", sourceHandle: "image", target: "final-export", targetHandle: "image", type: "default", style: boardEdgeStyle },
  { id: "hero-video-export", source: "motion-hero", sourceHandle: "video", target: "final-export", targetHandle: "video", type: "default", style: videoEdgeStyle },
  { id: "detail-video-export", source: "motion-detail", sourceHandle: "video", target: "final-export", targetHandle: "video", type: "default", style: videoEdgeStyle },
];

async function pollVideoTask(taskId: string): Promise<string> {
  const MAX = 70;
  for (let i = 0; i < MAX; i++) {
    await new Promise(r => setTimeout(r, 4000));
    let res: Response;
    try {
      res = await fetch(`/api/video?taskId=${encodeURIComponent(taskId)}`);
    } catch {
      continue;
    }
    if (!res.ok) continue;
    const pd = (await res.json().catch(() => null)) as {
      status?: string; outputs?: string[]; error?: string;
    } | null;
    if (!pd) continue;
    if (pd.status === "completed" && Array.isArray(pd.outputs) && pd.outputs.length > 0) {
      return pd.outputs[0] as string;
    }
    if (pd.status === "failed") {
      throw new Error(pd.error || "Video generation failed.");
    }
  }
  throw new Error("Video generation timed out (4 min). Check the video page for results.");
}

function topoSort(nodes: Node<CanvasNodeData>[], edges: Edge[]): Node<CanvasNodeData>[] {
  const inDeg = new Map<string, number>(nodes.map(n => [n.id, 0]));
  const adj = new Map<string, string[]>(nodes.map(n => [n.id, []]));
  for (const e of edges) {
    inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    adj.get(e.source)?.push(e.target);
  }
  const queue = nodes.filter(n => (inDeg.get(n.id) ?? 0) === 0);
  const sorted: Node<CanvasNodeData>[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    for (const nid of (adj.get(node.id) ?? [])) {
      const d = (inDeg.get(nid) ?? 0) - 1;
      inDeg.set(nid, d);
      if (d === 0) {
        const n = nodes.find(x => x.id === nid);
        if (n) queue.push(n);
      }
    }
  }
  return sorted;
}

function downstreamSort(startId: string, nodes: Node<CanvasNodeData>[], edges: Edge[]): Node<CanvasNodeData>[] {
  const seen = new Set<string>();
  const queue = [startId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const edge of edges.filter(e => e.source === id)) {
      if (!seen.has(edge.target)) {
        seen.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  const sorted = topoSort(nodes.filter(n => seen.has(n.id)), edges.filter(e => seen.has(e.source) && seen.has(e.target)));
  return sorted.filter(n => seen.has(n.id));
}

// ─── Floating toolbar helpers ─────────────────────────────────────────────────
function ToolBtn({
  children, onClick, title, active, disabled, accent,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  accent?: string;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: active ? (accent ? `rgba(99,102,241,0.18)` : "rgba(255,255,255,0.09)") : "transparent",
        border: active ? `1px solid ${accent ?? "rgba(255,255,255,0.15)"}` : "1px solid transparent",
        color: active ? (accent ?? "#a5b4fc") : disabled ? "#1a2c3e" : "#3d5573",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.13s",
      }}
      onMouseEnter={e => {
        if (!disabled) {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.background = "rgba(255,255,255,0.07)";
          b.style.color = "#94a3b8";
        }
      }}
      onMouseLeave={e => {
        if (!disabled) {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.background = active ? (accent ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.09)") : "transparent";
          b.style.color = active ? (accent ?? "#a5b4fc") : "#3d5573";
        }
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.06)", margin: "3px 0" }} />;
}

// ─── Node Library Panel ───────────────────────────────────────────────────────
type LibItem = { type: CanvasNodeType; label: string; icon: string; color: string };
const NODE_LIBRARY_SECTIONS: Array<{ title: string; items: LibItem[] }> = [
  {
    title: "BASICS",
    items: [
      { type: "text-prompt"    as const, label: "Text",            icon: "T",   color: "#8b5cf6" },
      { type: "text-to-image"  as const, label: "Image Generator", icon: "🖼",  color: "#f59e0b" },
      { type: "text-to-video"  as const, label: "Video Generator", icon: "🎬",  color: "#10b981" },
      { type: "assistant"      as const, label: "Assistant",       icon: "✨",  color: "#6366f1" },
      { type: "upscale"        as const, label: "Image Upscaler",  icon: "⬆",  color: "#14b8a6" },
      { type: "list"           as const, label: "List",            icon: "≡",   color: "#64748b" },
    ],
  },
  {
    title: "MEDIA",
    items: [
      { type: "upload-image"   as const, label: "Upload",          icon: "📤",  color: "#3b82f6" },
      { type: "assets"         as const, label: "Assets",          icon: "📂",  color: "#84cc16" },
      { type: "stock"          as const, label: "Stock",           icon: "🔍",  color: "#06b6d4" },
    ],
  },
  {
    title: "REFERENCES",
    items: [
      { type: "add-reference"  as const, label: "Add Reference",   icon: "🔗",  color: "#3b82f6" },
    ],
  },
  {
    title: "IMAGE",
    items: [
      { type: "text-to-image"  as const, label: "Image Generator", icon: "🖼",  color: "#f59e0b" },
      { type: "upscale"        as const, label: "Image Upscaler",  icon: "⬆",  color: "#14b8a6" },
      { type: "image-edit"     as const, label: "Image Editor",    icon: "✏️", color: "#ec4899" },
      { type: "variations"     as const, label: "Variations",      icon: "🔀",  color: "#ec4899" },
      { type: "designer"       as const, label: "Designer",        icon: "🎨",  color: "#f97316" },
      { type: "image-to-svg"   as const, label: "Image to SVG",    icon: "⬡",  color: "#a855f7" },
      { type: "svg-generator"  as const, label: "SVG Generator",   icon: "⬡",  color: "#06b6d4" },
    ],
  },
  {
    title: "VIDEO",
    items: [
      { type: "image-to-video" as const, label: "Image to Video",  icon: "🎬",  color: "#10b981" },
      { type: "text-to-video"  as const, label: "Text to Video",   icon: "🎬",  color: "#10b981" },
      { type: "speak"          as const, label: "Speak",           icon: "🗣️", color: "#22c55e" },
      { type: "video-combiner" as const, label: "Video Combiner",  icon: "🎞️", color: "#3b82f6" },
      { type: "video-upscale"  as const, label: "Video Upscaler",  icon: "⬆️", color: "#14b8a6" },
      { type: "video-to-video" as const, label: "Video to Video",  icon: "🔄",  color: "#6366f1" },
      { type: "media-extractor"as const, label: "Media Extractor", icon: "📽️", color: "#f59e0b" },
    ],
  },
  {
    title: "AUDIO",
    items: [
      { type: "voiceover"      as const, label: "Voiceover",       icon: "🎙️", color: "#f59e0b" },
      { type: "sound-effects"  as const, label: "Sound Effects",   icon: "🔊",  color: "#ef4444" },
      { type: "music-generator"as const, label: "Music Generator", icon: "🎵",  color: "#8b5cf6" },
    ],
  },
  {
    title: "TEXT",
    items: [
      { type: "text-prompt"    as const, label: "Text",            icon: "T",   color: "#8b5cf6" },
      { type: "assistant"      as const, label: "Assistant",       icon: "✨",  color: "#6366f1" },
    ],
  },
  {
    title: "UTILITIES",
    items: [
      { type: "list"           as const, label: "List",            icon: "≡",   color: "#64748b" },
      { type: "sticky-note"    as const, label: "Sticky Note",     icon: "📝",  color: "#fbbf24" },
      { type: "stickers"       as const, label: "Stickers",        icon: "😊",  color: "#f43f5e" },
      { type: "export"         as const, label: "Export",          icon: "📥",  color: "#84cc16" },
    ],
  },
];

function NodeLibraryPanel({
  onAdd, onClose,
}: {
  onAdd: (t: CanvasNodeType) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const allItems = NODE_LIBRARY_SECTIONS.flatMap(s => s.items) as LibItem[];
  const filtered: LibItem[] | null = q.trim()
    ? allItems.filter(i => i.label.toLowerCase().includes(q.toLowerCase()))
    : null;

  return (
    <div
      style={{
        position: "absolute", left: 68, top: "50%",
        transform: "translateY(-50%)",
        width: 270,
        background: "rgba(10,17,30,0.98)",
        backdropFilter: "blur(28px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 16,
        boxShadow: "0 24px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.05)",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        maxHeight: "min(440px, calc(100vh - 140px))",
        zIndex: 200,
      }}
    >
      {/* Search */}
      <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, padding: "7px 10px" }}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="5.5" cy="5.5" r="4" stroke="#3d5573" strokeWidth="1.4"/>
            <path d="M8.5 8.5L12 12" stroke="#3d5573" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#94a3b8", fontSize: 12.5, fontFamily: "inherit" }}
          />
        </div>
      </div>

      {/* Category icon tabs */}
      <div style={{ display: "flex", gap: 2, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {[
          { icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="1" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/></svg>, label: "All" },
          { icon: <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7h5M7 4.5v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>, label: "Basic" },
          { icon: <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 5.5l3 2-3 2v-4z" fill="currentColor"/></svg>, label: "Image" },
          { icon: <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M2 7h7M2 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>, label: "Text" },
          { icon: <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 11V5l4 4 3-5 3 3 2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: "Video" },
        ].map((tab, i: number) => (
          <button key={i} title={tab.label} style={{ width: 28, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: i === 0 ? "rgba(255,255,255,0.07)" : "transparent", border: "1px solid transparent", color: i === 0 ? "#94a3b8" : "#3d5573", cursor: "pointer" }}>
            {tab.icon}
          </button>
        ))}
      </div>

      {/* Node list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {filtered
          ? filtered.map(item => (
              <NodeLibItem key={item.type} item={item} onAdd={onAdd} onClose={onClose} />
            ))
          : NODE_LIBRARY_SECTIONS.map(sec => (
              <div key={sec.title}>
                <div style={{ padding: "4px 14px 6px", color: "#3a5573", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{sec.title}</div>
                {sec.items.map(item => (
                  <NodeLibItem key={item.type} item={item} onAdd={onAdd} onClose={onClose} />
                ))}
              </div>
            ))
        }
      </div>

      {/* Footer shortcuts */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "7px 14px", display: "flex", gap: 14 }}>
        {[["N", "Open"], ["↑↓", "Navigate"], ["↵", "Insert"]].map(([k, v]) => (
          <span key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, padding: "1px 6px", fontSize: 9, color: "#5a7a9a", fontWeight: 600 }}>{k}</span>
            <span style={{ color: "#3a5573", fontSize: 9.5 }}>{v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function NodeLibItem({
  item, onAdd, onClose,
}: {
  item: { type: CanvasNodeType; label: string; icon: string; color: string };
  onAdd: (t: CanvasNodeType) => void;
  onClose: () => void;
}) {
  const cfg = NODE_CONFIGS[item.type];
  return (
    <button
      onClick={() => { onAdd(item.type); onClose(); }}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 11,
        padding: "8px 14px", background: "transparent", border: "none",
        cursor: "pointer", fontFamily: "inherit", textAlign: "left",
        transition: "background 0.1s",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = `${item.color}0f`;
      }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${item.color}18`, border: `1px solid ${item.color}35` }}>
        <NodeTypeIcon type={item.type} size={14} color={item.color} strokeWidth={1.75} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#bdd0e8", fontSize: 12.5, fontWeight: 500 }}>{item.label}</div>
        <div style={{ color: "#2d4560", fontSize: 10, marginTop: 1.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cfg.description}</div>
      </div>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, opacity: 0.35, flexShrink: 0 }} />
    </button>
  );
}

// ─── Zoom bar (must be inside ReactFlow context) ──────────────────────────────
function ZoomBar() {
  const { zoomIn, zoomOut, zoomTo, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const [open, setOpen] = useState(false);
  const pct = Math.round(zoom * 100);

  const actions = [
    { label: "Zoom in",      shortcut: "⌘ +", fn: () => zoomIn({ duration: 200 }) },
    { label: "Zoom out",     shortcut: "⌘ −", fn: () => zoomOut({ duration: 200 }) },
    { label: "Zoom 100%",    shortcut: "⌘ 0", fn: () => zoomTo(1, { duration: 250 }) },
    { label: "Zoom to fit",  shortcut: "D",   fn: () => fitView({ padding: 0.3, duration: 350 }) },
  ];

  return (
    <div style={{ position: "relative" }}>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(9,16,28,0.98)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12,
            overflow: "hidden", minWidth: 210,
            boxShadow: "0 16px 48px rgba(0,0,0,0.85)",
            zIndex: 300,
          }}>
            {actions.map(a => (
              <button key={a.label}
                onClick={() => { a.fn(); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 16px", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", fontFamily: "inherit", color: "#94a3b8", fontSize: 12.5 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <span>{a.label}</span>
                <span style={{ color: "#1e3048", fontSize: 10.5 }}>{a.shortcut}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(9,16,28,0.92)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
          color: "#3d5573", fontSize: 12, fontWeight: 500,
          padding: "6px 11px", cursor: "pointer", fontFamily: "inherit",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          transition: "color 0.12s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#3d5573"; }}
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M9 9L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M3.5 5.5h4M5.5 3.5v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        {pct}%
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
          <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function AICanvasInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CanvasNodeData>>(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const nodesRef = useRef<Node<CanvasNodeData>[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai-canvas-v5");
      if (!saved) return;
      const parsed = JSON.parse(saved) as { nodes?: Node<CanvasNodeData>[]; edges?: Edge[] };
      if (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) setNodes(parsed.nodes);
      if (Array.isArray(parsed.edges)) setEdges(parsed.edges);
    } catch {
      // Keep the built-in template if saved canvas data is unavailable.
    }
  }, [setNodes, setEdges]);

  const patchNode = useCallback(
    (id: string, patch: Partial<CanvasNodeData>) => {
      setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
    },
    [setNodes],
  );

  const addActivity = useCallback(
    (entry: Omit<ActivityEntry, "id" | "timestamp">) => {
      setActivity(prev =>
        [{ ...entry, id: crypto.randomUUID(), timestamp: new Date() }, ...prev].slice(0, 200),
      );
    },
    [],
  );

  const executeNode = useCallback(
    async (nodeId: string): Promise<void> => {
      const allNodes = nodesRef.current;
      const allEdges = edgesRef.current;
      const node = allNodes.find(n => n.id === nodeId);
      if (!node) return;

      const cfg = NODE_CONFIGS[node.data.nodeType];
      const data = node.data;
      const s = data.settings;

      if (data.nodeType === "text-prompt" || data.nodeType === "upload-image") {
        addActivity({ nodeId, nodeLabel: data.label, level: "info", message: "Source node — no execution needed." });
        return;
      }

      patchNode(nodeId, { status: "running", errorMessage: undefined });
      addActivity({ nodeId, nodeLabel: data.label, level: "info", message: `Starting ${data.label}...` });

      try {
        const inEdges = allEdges.filter(e => e.target === nodeId);
        const inputImageUrls: string[] = [];
        let inputImageUrl: string | undefined;
        let inputVideoUrl: string | undefined;
        let inputPrompt: string | undefined;

        for (const edge of inEdges) {
          const src = allNodes.find(n => n.id === edge.source);
          if (!src) continue;
          const sd = src.data;
          if (sd.nodeType === "text-prompt") inputPrompt = sd.settings.prompt;
          else if (["upload-image", "add-reference", "assets", "stock"].includes(sd.nodeType) && sd.settings.imageUrl) {
            inputImageUrls.push(sd.settings.imageUrl);
          }
          else if (sd.outputImageUrl) inputImageUrls.push(sd.outputImageUrl);
          else if (sd.outputVideoUrl) inputVideoUrl = sd.outputVideoUrl;
        }

        const prompt = inputPrompt || s.prompt || "";
        if (s.imageUrl) inputImageUrls.push(s.imageUrl);
        inputImageUrl = inputImageUrls[0];
        const imageUrl = inputImageUrl;
        const videoUrl = inputVideoUrl || s.videoUrl;

        let outputImageUrl: string | undefined;
        let outputVideoUrl: string | undefined;
        let outputAudioUrl: string | undefined;
        let outputText: string | undefined;

        switch (data.nodeType) {
          case "text-to-image": {
            if (!prompt) throw new Error("Prompt required. Connect a Text Prompt node or set prompt in settings.");
            const res = await fetch("/api/generate/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt, modelId: s.modelId || "nano-banana-pro", aspectRatio: s.aspectRatio || "1:1", negativePrompt: s.negativePrompt, imageUrls: inputImageUrls }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { imageUrl?: string; mediaUrl?: string; imageUrls?: string[] };
            outputImageUrl = d.imageUrl || d.mediaUrl || d.imageUrls?.[0];
            if (!outputImageUrl) throw new Error("No output URL returned from the image API.");
            break;
          }
          case "image-edit": {
            if (!imageUrl) throw new Error("Image input required. Connect an Upload Image or Text to Image node.");
            if (!prompt) throw new Error("Prompt required. Connect a Text Prompt node or set prompt in settings.");
            const res = await fetch("/api/generate/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt, modelId: s.modelId || "nano-banana-pro", aspectRatio: s.aspectRatio || "1:1", imageUrl, imageUrls: inputImageUrls }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { imageUrl?: string; mediaUrl?: string; imageUrls?: string[] };
            outputImageUrl = d.imageUrl || d.mediaUrl || d.imageUrls?.[0];
            if (!outputImageUrl) throw new Error("No output URL returned from the image API.");
            break;
          }
          case "upscale": {
            if (!imageUrl) throw new Error("Image input required. Connect an image node.");
            const res = await fetch("/api/generate/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: "enhance and upscale image to maximum quality", modelId: s.modelId || "image-upscale", imageUrl }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { imageUrl?: string; mediaUrl?: string; imageUrls?: string[] };
            outputImageUrl = d.imageUrl || d.mediaUrl || d.imageUrls?.[0];
            if (!outputImageUrl) throw new Error("No output URL returned from the upscale API.");
            break;
          }
          case "image-to-video": {
            if (!imageUrl) throw new Error("Image input required. Connect an image node.");
            const createRes = await fetch("/api/video", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                modelRoute: s.modelId || "kwaivgi/kling-v3.0-pro/text-to-video",
                payload: { prompt, image_urls: [imageUrl], duration: s.duration || 5, aspect_ratio: s.aspectRatio || "16:9", mode: "std" },
              }),
            });
            if (!createRes.ok) { const err = await createRes.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${createRes.status}`); }
            const createData = await createRes.json() as { taskId?: string };
            if (!createData.taskId) throw new Error("No taskId returned. Check KIE_API_KEY and model route.");
            addActivity({ nodeId, nodeLabel: data.label, level: "info", message: `Task ${createData.taskId} created. Polling (1-3 min)...` });
            outputVideoUrl = await pollVideoTask(createData.taskId);
            break;
          }
          case "video-to-video": {
            if (!videoUrl) throw new Error("Video input required. Connect a video node.");
            const createRes = await fetch("/api/video", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                modelRoute: s.modelId || "kwaivgi/kling-v3.0-pro/text-to-video",
                payload: { prompt, video: videoUrl, duration: s.duration || 5, mode: "std" },
              }),
            });
            if (!createRes.ok) { const err = await createRes.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${createRes.status}`); }
            const createData = await createRes.json() as { taskId?: string };
            if (!createData.taskId) throw new Error("No taskId returned. Check KIE_API_KEY and model route.");
            addActivity({ nodeId, nodeLabel: data.label, level: "info", message: `Task ${createData.taskId} created. Polling...` });
            outputVideoUrl = await pollVideoTask(createData.taskId);
            break;
          }
          case "text-to-video": {
            const createRes = await fetch("/api/video", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                modelRoute: s.modelId || "kwaivgi/kling-v3.0-pro/text-to-video",
                payload: { prompt, duration: s.duration || 5, aspect_ratio: s.aspectRatio || "16:9", mode: "std" },
              }),
            });
            if (!createRes.ok) { const err = await createRes.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${createRes.status}`); }
            const createData = await createRes.json() as { taskId?: string };
            if (!createData.taskId) throw new Error("No taskId returned. Check KIE_API_KEY and model route.");
            addActivity({ nodeId, nodeLabel: data.label, level: "info", message: `Task ${createData.taskId} created. Polling (1-3 min)...` });
            outputVideoUrl = await pollVideoTask(createData.taskId);
            break;
          }
          case "assistant": {
            if (!prompt) throw new Error("Prompt required. Connect a Text node or set prompt in settings.");
            const res = await fetch("/api/conversation", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: prompt }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { response?: string; text?: string; content?: string; answer?: string };
            outputText = d.response || d.text || d.content || d.answer || "Done";
            break;
          }
          case "voiceover":
          case "speak": {
            const ttsText = prompt;
            if (!ttsText) throw new Error("Text required. Connect a Text node or set prompt in settings.");
            const res = await fetch("/api/generate/audio", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ actionType: "tts", text: ttsText, voice: s.ttsVoice || "Aria", model: "elevenlabs/text-to-speech-multilingual-v2" }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { audioUrl?: string };
            outputAudioUrl = d.audioUrl;
            if (!outputAudioUrl) throw new Error("No audio URL returned.");
            break;
          }
          case "sound-effects": {
            if (!prompt) throw new Error("Prompt required for sound effect generation.");
            const res = await fetch("/api/generate/audio", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ actionType: "music", prompt, model: "elevenlabs/sound-effect-v2", musicDuration: 10 }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { audioUrl?: string };
            outputAudioUrl = d.audioUrl;
            if (!outputAudioUrl) throw new Error("No audio URL returned.");
            break;
          }
          case "music-generator": {
            if (!prompt) throw new Error("Prompt required for music generation.");
            const res = await fetch("/api/music", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt, model: "elevenlabs/music", duration: s.duration || 30 }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { audioUrl?: string; url?: string; mediaUrl?: string };
            outputAudioUrl = d.audioUrl || d.url || d.mediaUrl;
            if (!outputAudioUrl) throw new Error("No audio URL returned from music API.");
            break;
          }
          case "video-upscale": {
            if (!videoUrl) throw new Error("Video input required. Connect a video node.");
            const res = await fetch("/api/generate/upscale", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ videoUrl }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { videoUrl?: string; url?: string; outputUrl?: string };
            outputVideoUrl = d.videoUrl || d.url || d.outputUrl;
            if (!outputVideoUrl) throw new Error("No video URL returned from upscale API.");
            break;
          }
          case "variations": {
            if (!imageUrl) throw new Error("Image input required. Connect an image node.");
            const res = await fetch("/api/generate/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: prompt || "create a variation of this image", modelId: s.modelId || "nano-banana-pro", imageUrl, imageUrls: inputImageUrls, aspectRatio: s.aspectRatio || "1:1" }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { imageUrl?: string; mediaUrl?: string; imageUrls?: string[] };
            outputImageUrl = d.imageUrl || d.mediaUrl || d.imageUrls?.[0];
            if (!outputImageUrl) throw new Error("No output URL returned.");
            break;
          }
          case "designer": {
            if (!prompt) throw new Error("Prompt required. Connect a Text node or set prompt in settings.");
            const res = await fetch("/api/generate/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt, modelId: s.modelId || "gpt-image/1.5-text-to-image", aspectRatio: s.aspectRatio || "1:1" }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { imageUrl?: string; mediaUrl?: string; imageUrls?: string[] };
            outputImageUrl = d.imageUrl || d.mediaUrl || d.imageUrls?.[0];
            if (!outputImageUrl) throw new Error("No output URL returned.");
            break;
          }
          case "image-to-svg": {
            if (!imageUrl) throw new Error("Image input required. Connect an image node.");
            const res = await fetch("/api/generate/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: "convert to clean vector SVG illustration", modelId: "recraft/svg-text-to-image", imageUrl }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { imageUrl?: string; mediaUrl?: string; imageUrls?: string[] };
            outputImageUrl = d.imageUrl || d.mediaUrl || d.imageUrls?.[0];
            if (!outputImageUrl) throw new Error("No output URL returned.");
            break;
          }
          case "svg-generator": {
            if (!prompt) throw new Error("Prompt required for SVG generation.");
            const res = await fetch("/api/generate/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt, modelId: "recraft/svg-text-to-image", aspectRatio: s.aspectRatio || "1:1" }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { imageUrl?: string; mediaUrl?: string; imageUrls?: string[] };
            outputImageUrl = d.imageUrl || d.mediaUrl || d.imageUrls?.[0];
            if (!outputImageUrl) throw new Error("No output URL returned.");
            break;
          }
          case "stickers": {
            if (!prompt) throw new Error("Prompt required for sticker generation.");
            const res = await fetch("/api/generate/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: `sticker style, ${prompt}, white background, clean outline`, modelId: s.modelId || "nano-banana-pro", aspectRatio: "1:1" }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { imageUrl?: string; mediaUrl?: string; imageUrls?: string[] };
            outputImageUrl = d.imageUrl || d.mediaUrl || d.imageUrls?.[0];
            if (!outputImageUrl) throw new Error("No output URL returned.");
            break;
          }
          case "video-combiner": {
            if (!videoUrl && !imageUrl) throw new Error("Video or image input required. Connect a media node.");
            const createRes = await fetch("/api/video", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                modelRoute: s.modelId || "kwaivgi/kling-v3.0-pro/text-to-video",
                payload: { prompt: prompt || "combine and extend this video", ...(videoUrl ? { video: videoUrl } : { image_urls: [imageUrl] }), duration: s.duration || 5, mode: "std" },
              }),
            });
            if (!createRes.ok) { const err = await createRes.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${createRes.status}`); }
            const createData = await createRes.json() as { taskId?: string };
            if (!createData.taskId) throw new Error("No taskId returned.");
            addActivity({ nodeId, nodeLabel: data.label, level: "info", message: `Task ${createData.taskId} created. Polling...` });
            outputVideoUrl = await pollVideoTask(createData.taskId);
            break;
          }
          case "media-extractor": {
            if (!videoUrl) throw new Error("Video input required. Connect a video node.");
            const res = await fetch("/api/generate/audio", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ actionType: "video2audio", videoUrl }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})) as Record<string, string>; throw new Error(err.message || err.error || `HTTP ${res.status}`); }
            const d = await res.json() as { audioUrl?: string };
            outputAudioUrl = d.audioUrl;
            if (!outputAudioUrl) throw new Error("No audio URL returned from media extractor.");
            break;
          }
          case "list":
          case "sticky-note":
          case "add-reference":
          case "assets":
          case "stock": {
            addActivity({ nodeId, nodeLabel: data.label, level: "info", message: `${data.label} is a utility node — no generation needed.` });
            patchNode(nodeId, { status: "idle" });
            return;
          }
          case "export": {
            outputImageUrl = imageUrl;
            outputVideoUrl = videoUrl;
            if (!outputImageUrl && !outputVideoUrl) throw new Error("No input connected. Connect an image or video node to export.");
            break;
          }
          default: {
            addActivity({ nodeId, nodeLabel: data.label, level: "warn", message: "Unknown node type — skipped." });
            patchNode(nodeId, { status: "idle" });
            return;
          }
        }

        patchNode(nodeId, { status: "done", outputImageUrl, outputVideoUrl, outputAudioUrl, outputText, errorMessage: undefined });
        addActivity({ nodeId, nodeLabel: data.label, level: "success", message: `${data.label} completed.`, outputUrl: outputImageUrl || outputVideoUrl || outputAudioUrl });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        patchNode(nodeId, { status: "error", errorMessage: msg });
        addActivity({ nodeId, nodeLabel: data.label, level: "error", message: msg });
        throw err;
      }
    },
    [patchNode, addActivity],
  );

  const runNode = useCallback(
    (id: string) => { setIsRunning(true); executeNode(id).finally(() => setIsRunning(false)); },
    [executeNode],
  );

  const runSelectedNode = useCallback(() => {
    if (!selectedNodeId) { addActivity({ nodeId: "", nodeLabel: "Canvas", level: "warn", message: "Select a node first, then click Run Node." }); return; }
    runNode(selectedNodeId);
  }, [selectedNodeId, runNode, addActivity]);

  const runDownstream = useCallback(async () => {
    if (!selectedNodeId) {
      addActivity({ nodeId: "", nodeLabel: "Canvas", level: "warn", message: "Select a node first, then click Run Downstream." });
      return;
    }
    const allNodes = nodesRef.current;
    const allEdges = edgesRef.current;
    const sorted = downstreamSort(selectedNodeId, allNodes, allEdges);
    if (sorted.length === 0) {
      addActivity({ nodeId: selectedNodeId, nodeLabel: "Canvas", level: "warn", message: "No downstream nodes connected to the selected node." });
      return;
    }
    setIsRunning(true);
    addActivity({ nodeId: selectedNodeId, nodeLabel: "Downstream", level: "info", message: `Running ${sorted.length} downstream node(s)...` });
    try {
      for (const node of sorted) {
        if (["text-prompt", "upload-image", "list", "sticky-note", "add-reference", "assets", "stock"].includes(node.data.nodeType)) continue;
        await executeNode(node.id);
      }
      addActivity({ nodeId: selectedNodeId, nodeLabel: "Downstream", level: "success", message: "Downstream workflow completed." });
    } catch {
      addActivity({ nodeId: selectedNodeId, nodeLabel: "Downstream", level: "error", message: "Downstream workflow stopped due to a node error." });
    } finally {
      setIsRunning(false);
    }
  }, [selectedNodeId, executeNode, addActivity]);

  const runFullPipeline = useCallback(async () => {
    const allNodes = nodesRef.current;
    const allEdges = edgesRef.current;
    if (allNodes.length === 0) { addActivity({ nodeId: "", nodeLabel: "Canvas", level: "warn", message: "Canvas is empty. Add nodes first." }); return; }
    setIsRunning(true);
    addActivity({ nodeId: "", nodeLabel: "Pipeline", level: "info", message: "Starting full pipeline..." });
    const sorted = topoSort(allNodes, allEdges);
    try {
      for (const node of sorted) {
        if (["text-prompt", "upload-image", "list", "sticky-note", "add-reference", "assets", "stock"].includes(node.data.nodeType)) continue;
        await executeNode(node.id);
        await new Promise(r => setTimeout(r, 0));
      }
      addActivity({ nodeId: "", nodeLabel: "Pipeline", level: "success", message: "Full pipeline completed." });
    } catch {
      addActivity({ nodeId: "", nodeLabel: "Pipeline", level: "error", message: "Pipeline stopped due to a node error." });
    } finally {
      setIsRunning(false);
    }
  }, [executeNode, addActivity]);

  const deleteNode = useCallback(
    (id: string) => {
      setNodes(nds => nds.filter(n => n.id !== id));
      setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
      if (selectedNodeId === id) setSelectedNodeId(null);
    },
    [setNodes, setEdges, selectedNodeId],
  );

  const addNodeAfter = useCallback(
    (sourceId: string, nodeType: CanvasNodeType) => {
      const src = nodesRef.current.find(n => n.id === sourceId);
      if (!src) return;
      const cfg = NODE_CONFIGS[nodeType];
      const id  = `node-${Date.now()}`;
      const typeCount = nodesRef.current.filter(n => n.data.nodeType === nodeType).length + 1;
      const pos = { x: src.position.x + 430, y: src.position.y };
      const newNode: Node<CanvasNodeData> = {
        id, type: "canvasNode", position: pos,
        data: { nodeType, label: `${cfg.label} #${typeCount}`, description: cfg.description, status: "idle", settings: { ...cfg.defaultSettings }, creditCost: cfg.creditCost },
      };
      setNodes(nds => [...nds, newNode]);
      const srcCfg = NODE_CONFIGS[src.data.nodeType];
      const sh = srcCfg.hasVideoOutput ? "video" : srcCfg.hasTextOutput ? "prompt" : "image";
      const th = cfg.hasVideoInput ? "video" : cfg.hasPromptInput ? "prompt" : "image";
      setEdges(eds => [...eds, {
        id: `e-${sourceId}-${id}`,
        source: sourceId, sourceHandle: sh,
        target: id,       targetHandle: th,
        type: "default",
        style: { stroke: "rgba(99,102,241,0.42)", strokeWidth: 2 },
      }]);
    },
    [setNodes, setEdges],
  );

  const updateNodeSettings = useCallback(
    (id: string, patch: Partial<CanvasNodeSettings>) => {
      setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, settings: { ...n.data.settings, ...patch } } } : n));
    },
    [setNodes],
  );

  const addNode = useCallback(
    (type: CanvasNodeType) => {
      const cfg = NODE_CONFIGS[type];
      const count = nodesRef.current.length;
      const typeCount = nodesRef.current.filter(n => n.data.nodeType === type).length + 1;
      const pos = { x: 120 + (count % 5) * 260, y: 100 + Math.floor(count / 5) * 200 };
      const id = `node-${Date.now()}`;
      const newNode: Node<CanvasNodeData> = {
        id, type: "canvasNode", position: pos,
        data: { nodeType: type, label: `${cfg.label} #${typeCount}`, description: cfg.description, status: "idle", settings: { ...cfg.defaultSettings }, creditCost: cfg.creditCost },
      };
      setNodes(nds => [...nds, newNode]);
    },
    [setNodes],
  );

  const saveCanvasState = useCallback(() => {
    try {
      localStorage.setItem("ai-canvas-v5", JSON.stringify({ nodes: nodesRef.current, edges: edgesRef.current }));
      addActivity({ nodeId: "", nodeLabel: "Canvas", level: "success", message: "Canvas saved to local storage." });
    } catch {
      addActivity({ nodeId: "", nodeLabel: "Canvas", level: "error", message: "Failed to save canvas." });
    }
  }, [addActivity]);

  const resetToTemplate = useCallback(() => {
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    setSelectedNodeId(null);
    try {
      localStorage.setItem("ai-canvas-v5", JSON.stringify({ nodes: INITIAL_NODES, edges: INITIAL_EDGES }));
    } catch {}
    addActivity({ nodeId: "", nodeLabel: "Template", level: "success", message: "Loaded the full campaign workflow map." });
  }, [setNodes, setEdges, addActivity]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => setEdges(eds => addEdge(connection, eds)),
    [setEdges],
  );

  const onSelectionChange = useCallback(
    ({ nodes: sel }: OnSelectionChangeParams) => { setSelectedNodeId(sel.length === 1 ? sel[0].id : null); },
    [],
  );

  const canvasCtx = useMemo<CanvasContextValue>(
    () => ({ runNode, deleteNode, updateNodeSettings, addNodeAfter }),
    [runNode, deleteNode, updateNodeSettings, addNodeAfter],
  );

  return (
    <CanvasContext.Provider value={canvasCtx}>
      <div style={{ position: "relative", width: "100%", height: "calc(100vh - 64px)", overflow: "hidden", background: "#060c18" }}>

        {/* ── Full-screen canvas ── */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionLineStyle={{ stroke: "rgba(99,102,241,0.7)", strokeWidth: 2.5, filter: "drop-shadow(0 0 8px rgba(99,102,241,0.5))" }}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.15}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
          style={{ width: "100%", height: "100%", background: "#060c18" }}
        >
          <Background variant={BackgroundVariant.Dots} gap={32} size={1} color="rgba(255,255,255,0.04)" />
          <Panel position="top-center" style={{ marginTop: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(7,12,24,0.78)",
                backdropFilter: "blur(18px)",
                boxShadow: "0 10px 36px rgba(0,0,0,0.45)",
                padding: "9px 12px",
              }}
            >
              <span style={{ color: "#67e8f9", fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                AI Canvas
              </span>
              <span style={{ height: 18, width: 1, background: "rgba(255,255,255,0.12)" }} />
              <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 700 }}>
                Untitled workflow
              </span>
              <span style={{ color: "rgba(148,163,184,0.72)", fontSize: 12 }}>
                {nodes.length} nodes
              </span>
            </div>
          </Panel>
          <Panel position="bottom-center" style={{ margin: "0 0 14px 0" }}>
            <ZoomBar />
          </Panel>
          <MiniMap
            style={{ background: "rgba(8,13,26,0.92)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, bottom: 20, right: 20 }}
            nodeColor={n => {
              const d = n.data as CanvasNodeData;
              if (d?.status === "done")    return "rgba(16,185,129,0.7)";
              if (d?.status === "running") return "rgba(245,158,11,0.7)";
              if (d?.status === "error")   return "rgba(239,68,68,0.7)";
              return "rgba(99,102,241,0.45)";
            }}
            maskColor="rgba(4,9,18,0.65)"
          />
        </ReactFlow>

        {/* ── Floating vertical toolbar ── */}
        <div
          style={{
            position: "absolute", top: "50%", left: 18,
            transform: "translateY(-50%)",
            zIndex: 100,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            background: "rgba(9,16,28,0.95)",
            backdropFilter: "blur(20px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16, padding: "8px 0",
            boxShadow: "0 8px 40px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.04) inset",
          }}
        >
          {/* Canvas label */}
          <div style={{ padding: "6px 12px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 4, textAlign: "center" }}>
            <div style={{ color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
              </svg>
            </div>
            {nodes.length > 0 && (
              <div style={{ color: "#2a3f56", fontSize: 9, fontWeight: 600, letterSpacing: "0.05em", marginTop: 3 }}>{nodes.length}</div>
            )}
          </div>

          {/* + Add node */}
          <div style={{ position: "relative" }}>
            <ToolBtn
              active={showAddMenu}
              title="Add node"
              onClick={() => setShowAddMenu(v => !v)}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </ToolBtn>

            {showAddMenu && (
              <NodeLibraryPanel
                onAdd={addNode}
                onClose={() => setShowAddMenu(false)}
              />
            )}
          </div>

          <Divider />

          {/* Run pipeline */}
          <ToolBtn
            title={isRunning ? "Running…" : "Run pipeline"}
            active={isRunning}
            onClick={runFullPipeline}
            disabled={isRunning}
            accent="#6366f1"
          >
            {isRunning
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28 56" strokeLinecap="round"/></svg>
              : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 2l9 5-9 5V2z" fill="currentColor"/></svg>
            }
          </ToolBtn>

          <Divider />

          {/* Save canvas */}
          <ToolBtn title="Save canvas" onClick={saveCanvasState}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="9" y="1" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="1" y="9" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="9" y="9" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </ToolBtn>

          <ToolBtn title="Load clean reference workflow template" onClick={resetToTemplate}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M2 7h10M2 10.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M3.2 2.2h7.6v9.6H3.2z" stroke="currentColor" strokeWidth="1.1" opacity=".45"/>
            </svg>
          </ToolBtn>

          {/* Run selected */}
          <ToolBtn title="Run selected node" onClick={runSelectedNode} disabled={!selectedNodeId}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5.5 5l3.5 2-3.5 2V5z" fill="currentColor"/>
            </svg>
          </ToolBtn>

          <ToolBtn title="Run downstream from selected node" onClick={runDownstream} disabled={!selectedNodeId || isRunning} accent="#14b8a6">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h4.5M6.5 3.5l2 2M6.5 3.5l2-2M2 10.5h4.5M6.5 10.5l2 2M6.5 10.5l2-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.5 7H12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </ToolBtn>

          <Divider />

          {/* Clear activity log */}
          <ToolBtn title="Clear log" onClick={() => setActivity([])}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M2 4h10M5 4V2.5h4V4M6 7v3M8 7v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M3 4l.7 7.5h6.6L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </ToolBtn>

          {/* Activity log indicator */}
          {activity.length > 0 && (
            <div style={{ width: 32, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{
                fontSize: 8.5, fontWeight: 700, color: "#344d65",
                background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)",
                borderRadius: 10, padding: "1px 6px", letterSpacing: "0.04em",
              }}>{activity.length}</span>
            </div>
          )}
        </div>

        {/* Click-outside to close add menu */}
        {showAddMenu && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
            onClick={() => setShowAddMenu(false)}
          />
        )}

        {/* Spin animation for running state */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </CanvasContext.Provider>
  );
}

export default function AICanvasPage() {
  return (
    <ReactFlowProvider>
      <AICanvasInner />
    </ReactFlowProvider>
  );
}
