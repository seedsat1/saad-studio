"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useRef, useState, useMemo, type ComponentType, type ReactNode } from "react";
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

const promptEdgeStyle = { stroke: "rgba(216,180,254,0.78)", strokeWidth: 2.5, filter: "drop-shadow(0 0 6px rgba(216,180,254,0.45))" };
const imageEdgeStyle = { stroke: "rgba(94,234,212,0.72)", strokeWidth: 2.5, filter: "drop-shadow(0 0 6px rgba(94,234,212,0.32))" };
const boardEdgeStyle = { stroke: "rgba(251,191,36,0.78)", strokeWidth: 3, filter: "drop-shadow(0 0 8px rgba(251,191,36,0.45))" };
const videoEdgeStyle = { stroke: "rgba(16,185,129,0.72)", strokeWidth: 2.5, filter: "drop-shadow(0 0 6px rgba(16,185,129,0.35))" };
const analysisEdgeStyle = { stroke: "rgba(56,189,248,0.72)", strokeWidth: 2.5, filter: "drop-shadow(0 0 6px rgba(56,189,248,0.35))" };

function makeEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle: "prompt" | "image" | "video",
  targetHandle: "prompt" | "image" | "video",
  style: Edge["style"],
): Edge {
  return { id, source, target, sourceHandle, targetHandle, type: "default", style };
}

type SubgraphNodeSpec = {
  id: string;
  type: CanvasNodeType;
  label: string;
  description: string;
  position: { x: number; y: number };
  settings?: Partial<CanvasNodeSettings>;
};

type SubgraphEdgeSpec = {
  id: string;
  source: string;
  target: string;
  sourceHandle: "prompt" | "image" | "video";
  targetHandle: "prompt" | "image" | "video";
  style?: Edge["style"];
};

type SubgraphSpec = {
  nodes: SubgraphNodeSpec[];
  edges: SubgraphEdgeSpec[];
};

function makeSuperNode(
  id: string,
  label: string,
  description: string,
  position: { x: number; y: number },
  noteText: string,
  subgraph: SubgraphSpec,
): Node<CanvasNodeData> {
  return makeNode(id, "sticky-note", position, { noteText }, {
    label,
    description,
    isSuperNode: true,
    isExpanded: false,
    subgraph,
  });
}

type ArchitectShot = {
  name: string;
  purpose: string;
  prompt: string;
  lens?: string;
  camera?: string;
  lighting?: string;
  motion?: string;
  variations?: string[];
  animate?: boolean;
};

type WorkflowArchitecture = {
  title: string;
  adType: string;
  environmentStructure: string;
  directorBrainPrompt: string;
  visualDirectionPrompt: string;
  assetAnalysisPrompt: string;
  shotPlanningPrompt: string;
  layers: Array<{ name: string; note: string }>;
  shots: ArchitectShot[];
  finalAssemblyPrompt: string;
};

function slugifyId(input: string, fallback: string) {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return slug || fallback;
}

function extractJsonObject(input: string) {
  const trimmed = input.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object returned by the workflow architect.");
  return JSON.parse(trimmed.slice(start, end + 1)) as Partial<WorkflowArchitecture>;
}

function normalizeArchitecture(raw: Partial<WorkflowArchitecture>, brief: string): WorkflowArchitecture {
  const adType = raw.adType || brief;
  const title = raw.title || `${adType} Production System`;
  const shots = Array.isArray(raw.shots) && raw.shots.length > 0
    ? raw.shots.slice(0, 10).map((shot, index) => ({
        name: shot?.name || `Shot ${index + 1}`,
        purpose: shot?.purpose || "Commercial production frame",
        prompt: shot?.prompt || `Generate ${shot?.name || `shot ${index + 1}`} for ${brief}.`,
        lens: shot?.lens,
        camera: shot?.camera,
        lighting: shot?.lighting,
        motion: shot?.motion,
        variations: Array.isArray(shot?.variations) ? shot.variations.slice(0, 6) : [],
        animate: Boolean(shot?.animate ?? index < 2),
      }))
    : [
        { name: "Hero Shot", purpose: "Primary commercial frame", prompt: `Generate the strongest hero shot for ${brief}.`, animate: true },
        { name: "Establishing Shot", purpose: "World and environment setup", prompt: `Generate an establishing shot for ${brief}.`, animate: false },
        { name: "Macro Shot", purpose: "Premium product/detail close-up", prompt: `Generate a cinematic macro detail shot for ${brief}.`, animate: true },
        { name: "Beauty Shot", purpose: "Character/style/brand expression", prompt: `Generate a beauty/editorial shot for ${brief}.`, animate: false },
      ];

  return {
    title,
    adType,
    environmentStructure: raw.environmentStructure || "Environment chosen by Director Brain based on the creative intent.",
    directorBrainPrompt: raw.directorBrainPrompt || `Act as Director Brain for ${brief}. Define ad type, mood, cinematic style, lighting, lens, pacing, camera behavior, luxury level, and continuity rules.`,
    visualDirectionPrompt: raw.visualDirectionPrompt || `Translate ${brief} into visual direction: composition, palette, lens language, lighting, set design, motion rules, and negative constraints.`,
    assetAnalysisPrompt: raw.assetAnalysisPrompt || `Analyze uploaded character, product, and environment assets for ${brief}. Define consistency rules and production risks.`,
    shotPlanningPrompt: raw.shotPlanningPrompt || `Design a shot plan for ${brief}. Define shot purpose, framing, lens, lighting, movement, and pacing.`,
    layers: Array.isArray(raw.layers) && raw.layers.length > 0
      ? raw.layers.slice(0, 8).map(layer => ({ name: layer?.name || "Production Layer", note: layer?.note || "Runtime generated layer." }))
      : [
          { name: "Creative Direction", note: "Brief, Director Brain, commercial identity." },
          { name: "Assets", note: "Character, product, and environment references." },
          { name: "Cinematography", note: "Shot logic, lenses, camera behavior, pacing." },
          { name: "Generation", note: "Shot-specific still generation." },
          { name: "Variations", note: "Controlled expansion of approved shots." },
          { name: "Animation", note: "Motion system for selected frames." },
          { name: "Final Edit", note: "Commercial assembly and export." },
        ],
    shots,
    finalAssemblyPrompt: raw.finalAssemblyPrompt || `Assemble the generated stills and videos into a final commercial production board for ${brief}.`,
  };
}

async function requestWorkflowArchitecture(brief: string): Promise<WorkflowArchitecture> {
  // Keep the canvas usable even when the chat/assistant backend is unavailable.
  // The runtime graph is still generated from the brief, but it does not depend on /api/conversation.
  return normalizeArchitecture({}, brief);
}

function createWorkflowFromArchitecture(rawBrief: string, architecture: WorkflowArchitecture) {
  const brief = rawBrief.trim() || architecture.adType || "Commercial Ad";
  const shotNodes: SubgraphNodeSpec[] = [];
  const shotEdges: SubgraphEdgeSpec[] = [];
  const generationNodes: SubgraphNodeSpec[] = [];
  const generationEdges: SubgraphEdgeSpec[] = [];
  const variationNodes: SubgraphNodeSpec[] = [];
  const variationEdges: SubgraphEdgeSpec[] = [];
  const animationNodes: SubgraphNodeSpec[] = [];
  const animationEdges: SubgraphEdgeSpec[] = [];
  const finalEdges: SubgraphEdgeSpec[] = [];

  architecture.shots.forEach((shot, index) => {
    const shotId = `shot-${slugifyId(shot.name, String(index + 1))}`;
    const variationId = `${shotId}-variations`;
    const motionId = `${shotId}-motion`;
    const y = index * 230;
    const fullPrompt = [
      shot.prompt,
      shot.purpose && `Purpose: ${shot.purpose}`,
      shot.lens && `Lens: ${shot.lens}`,
      shot.camera && `Camera: ${shot.camera}`,
      shot.lighting && `Lighting: ${shot.lighting}`,
      shot.motion && `Motion intent: ${shot.motion}`,
      "Use Production Context Hub and Reference Package. No text, no logos, no watermark.",
    ].filter(Boolean).join("\n");

    shotNodes.push({
      id: `plan-${shotId}`,
      type: "sticky-note",
      label: `${shot.name} Logic`,
      description: shot.purpose || "Shot planning unit",
      position: { x: 0, y },
      settings: { noteText: [shot.purpose, shot.lens && `Lens: ${shot.lens}`, shot.camera && `Camera: ${shot.camera}`, shot.lighting && `Lighting: ${shot.lighting}`, shot.motion && `Motion: ${shot.motion}`].filter(Boolean).join("\n") },
    });
    generationNodes.push({
      id: shotId,
      type: "image-edit",
      label: shot.name,
      description: shot.purpose || "Runtime-generated shot",
      position: { x: 0, y },
      settings: { prompt: fullPrompt, modelId: "nano-banana-pro", aspectRatio: "16:9" },
    });
    generationEdges.push(
      { id: `context-${shotId}`, source: "production-context", target: shotId, sourceHandle: "prompt", targetHandle: "prompt", style: analysisEdgeStyle },
      { id: `reference-${shotId}`, source: "reference-package", target: shotId, sourceHandle: "image", targetHandle: "image", style: imageEdgeStyle },
    );
    finalEdges.push({ id: `${shotId}-assembly`, source: shotId, target: "shot-assembly-hub", sourceHandle: "image", targetHandle: "image", style: boardEdgeStyle });

    if (shot.variations && shot.variations.length > 0) {
      variationNodes.push({
        id: variationId,
        type: "variations",
        label: `${shot.name} Variations`,
        description: "AI-selected expansion path",
        position: { x: 0, y },
        settings: { prompt: `Create controlled variations for ${shot.name}: ${shot.variations.join(", ")}. Preserve Production Context, brand identity, asset consistency, lens logic, and commercial purpose.`, modelId: "nano-banana-pro", aspectRatio: "16:9" },
      });
      variationEdges.push(
        { id: `${shotId}-variation`, source: shotId, target: variationId, sourceHandle: "image", targetHandle: "image", style: boardEdgeStyle },
        { id: `context-${variationId}`, source: "production-context", target: variationId, sourceHandle: "prompt", targetHandle: "prompt", style: analysisEdgeStyle },
      );
      finalEdges.push({ id: `${variationId}-assembly`, source: variationId, target: "shot-assembly-hub", sourceHandle: "image", targetHandle: "image", style: boardEdgeStyle });
    }

    if (shot.animate) {
      const motionSource = shot.variations && shot.variations.length > 0 ? variationId : shotId;
      animationNodes.push({
        id: motionId,
        type: "image-to-video",
        label: `${shot.name} Motion`,
        description: "AI-selected motion system",
        position: { x: 0, y },
        settings: { prompt: `Animate ${shot.name}. ${shot.motion || "Use the camera behavior selected by the AI Workflow Architect."} Preserve identity, product shape, lighting continuity, and pacing.`, modelId: "kling/v2-5-turbo-image-to-video-pro", aspectRatio: "16:9", duration: 5 },
      });
      animationEdges.push(
        { id: `${motionSource}-motion`, source: motionSource, target: motionId, sourceHandle: "image", targetHandle: "image", style: videoEdgeStyle },
        { id: `context-${motionId}`, source: "production-context", target: motionId, sourceHandle: "prompt", targetHandle: "prompt", style: analysisEdgeStyle },
      );
      finalEdges.push({ id: `${motionId}-export`, source: motionId, target: "final-export", sourceHandle: "video", targetHandle: "video", style: videoEdgeStyle });
    }
  });

  const nodes: Node<CanvasNodeData>[] = [
    makeNode("creative-brief", "text-prompt", { x: -1620, y: 80 }, { prompt: brief }, { label: "Creative Brief", description: "User intent that generated this production system" }),
    makeSuperNode("commercial-director-system", "Commercial Director", "Director Brain, creative direction, brand logic, visual language", { x: -1160, y: 40 }, `Commercial Director System\n\n${architecture.title}\n\nAd type: ${architecture.adType}\nEnvironment: ${architecture.environmentStructure}\n\nOpen this system to inspect Director Brain, Visual Direction, Brand Logic, and Visual Language.`, {
      nodes: [
        { id: "director-brain", type: "assistant", label: "Director Brain", description: "Runtime commercial intelligence", position: { x: 0, y: 0 }, settings: { prompt: architecture.directorBrainPrompt } },
        { id: "visual-direction", type: "assistant", label: "Visual Direction", description: "Cinematic identity", position: { x: 430, y: -130 }, settings: { prompt: architecture.visualDirectionPrompt } },
        { id: "brand-logic", type: "assistant", label: "Brand Logic", description: "Commercial identity rules", position: { x: 430, y: 150 }, settings: { prompt: `Define brand memory, commercial promise, audience feeling, premium level, and continuity rules for ${architecture.adType}.` } },
        { id: "production-context", type: "assistant", label: "Production Context Hub", description: "Merged routing brain", position: { x: 860, y: 0 }, settings: { prompt: "Merge Director Brain, Visual Direction, Brand Logic, Asset Analysis, and Shot Director output into one compact production context for downstream nodes." } },
      ],
      edges: [
        { id: "director-visual", source: "director-brain", target: "visual-direction", sourceHandle: "prompt", targetHandle: "prompt", style: analysisEdgeStyle },
        { id: "director-brand", source: "director-brain", target: "brand-logic", sourceHandle: "prompt", targetHandle: "prompt", style: analysisEdgeStyle },
        { id: "visual-context", source: "visual-direction", target: "production-context", sourceHandle: "prompt", targetHandle: "prompt", style: analysisEdgeStyle },
        { id: "brand-context", source: "brand-logic", target: "production-context", sourceHandle: "prompt", targetHandle: "prompt", style: analysisEdgeStyle },
      ],
    }),
    makeSuperNode("consistency-system", "Consistency System", "Character, product, lighting, style memory", { x: -680, y: 40 }, "Consistency System\n\nOpen this system to upload assets and generate the reference package. Character grid is only a support reference, not the center of the workflow.", {
      nodes: [
        { id: "character-asset", type: "upload-image", label: "Character / Main Asset", description: "Upload required campaign input", position: { x: 0, y: 0 }, settings: { imageUrl: "" } },
        { id: "product-asset", type: "add-reference", label: "Product / Object Asset", description: "Upload product or hero object", position: { x: 0, y: 310 }, settings: { imageUrl: "" } },
        { id: "environment-asset", type: "add-reference", label: "Environment Asset", description: "Upload location or mood reference", position: { x: 0, y: 620 }, settings: { imageUrl: "" } },
        { id: "asset-analysis", type: "assistant", label: "Asset Analysis", description: "Production risks and consistency rules", position: { x: 430, y: 140 }, settings: { prompt: architecture.assetAnalysisPrompt } },
        { id: "reference-package", type: "image-edit", label: "Reference Package", description: "Single visual reference hub", position: { x: 860, y: 140 }, settings: { prompt: "Create a compact reference package for this specific commercial architecture. Include identity, product/object readability, environment cues, material details, and style anchors. No text, no logos.", modelId: "nano-banana-pro", aspectRatio: "16:9" } },
      ],
      edges: [
        { id: "character-analysis", source: "character-asset", target: "asset-analysis", sourceHandle: "image", targetHandle: "image", style: imageEdgeStyle },
        { id: "product-analysis", source: "product-asset", target: "asset-analysis", sourceHandle: "image", targetHandle: "image", style: imageEdgeStyle },
        { id: "environment-analysis", source: "environment-asset", target: "asset-analysis", sourceHandle: "image", targetHandle: "image", style: imageEdgeStyle },
        { id: "character-reference", source: "character-asset", target: "reference-package", sourceHandle: "image", targetHandle: "image", style: imageEdgeStyle },
        { id: "product-reference", source: "product-asset", target: "reference-package", sourceHandle: "image", targetHandle: "image", style: imageEdgeStyle },
        { id: "environment-reference", source: "environment-asset", target: "reference-package", sourceHandle: "image", targetHandle: "image", style: imageEdgeStyle },
      ],
    }),
    makeSuperNode("shot-system", "Shot System", "Shot hierarchy, lens logic, framing, motion planning", { x: -200, y: 40 }, `Shot System\n\n${architecture.shots.length} AI-selected shots.\n\nOpen this system to inspect the generated shot logic, lens choices, framing, and motion planning.`, {
      nodes: [
        { id: "shot-director", type: "assistant", label: "Shot Director", description: "AI-generated shot structure", position: { x: 0, y: 0 }, settings: { prompt: architecture.shotPlanningPrompt } },
        ...shotNodes.map(node => ({ ...node, position: { x: 430, y: node.position.y } })),
      ],
      edges: shotNodes.map(node => ({ id: `director-${node.id}`, source: "shot-director", target: node.id, sourceHandle: "prompt", targetHandle: "prompt", style: promptEdgeStyle })),
    }),
    makeSuperNode("generation-system", "Generation System", "Scene generation and controlled shot variations", { x: 280, y: 40 }, "Generation System\n\nOpen this system to run individual shot generation and variation nodes. Each shot is routed through Production Context and Reference Package.", {
      nodes: [
        { id: "production-context", type: "assistant", label: "Production Context Hub", description: "Paste or run context from Commercial Director", position: { x: 0, y: 0 }, settings: { prompt: "Production context from Commercial Director System." } },
        { id: "reference-package", type: "add-reference", label: "Reference Package", description: "Use output from Consistency System", position: { x: 0, y: 320 }, settings: { imageUrl: "" } },
        ...generationNodes.map(node => ({ ...node, position: { x: 430, y: node.position.y } })),
        ...variationNodes.map(node => ({ ...node, position: { x: 900, y: node.position.y } })),
      ],
      edges: [...generationEdges, ...variationEdges],
    }),
    makeSuperNode("animation-system", "Animation System", "Kling, camera movement, motion curves, timing", { x: 760, y: 40 }, "Animation System\n\nOpen this system to animate approved shots with the motion language selected by the AI Workflow Architect.", {
      nodes: [
        { id: "production-context", type: "assistant", label: "Motion Context", description: "Camera behavior and pacing rules", position: { x: 0, y: 0 }, settings: { prompt: "Motion context from Commercial Director and Shot System." } },
        ...animationNodes.map(node => ({ ...node, position: { x: 430, y: node.position.y } })),
      ],
      edges: animationEdges,
    }),
    makeSuperNode("final-edit-system", "Final Edit System", "Shot assembly, commercial board, export", { x: 1240, y: 40 }, "Final Edit System\n\nOpen this system to assemble generated stills and videos into the final commercial output.", {
      nodes: [
        { id: "shot-assembly-hub", type: "image-edit", label: "Shot Assembly Hub", description: "Collects generated shots", position: { x: 0, y: 0 }, settings: { prompt: "Create an organized contact sheet of approved shot outputs. Group by shot purpose and commercial pacing. No text, no logos.", modelId: "nano-banana-pro", aspectRatio: "16:9" } },
        { id: "commercial-assembly", type: "image-edit", label: "Final Commercial Assembly", description: "Assembles generated outputs", position: { x: 430, y: 0 }, settings: { prompt: architecture.finalAssemblyPrompt, modelId: "nano-banana-pro", aspectRatio: "16:9" } },
        { id: "final-export", type: "export", label: "Final Export", description: "Exports board and videos", position: { x: 860, y: 0 } },
      ],
      edges: [
        ...finalEdges,
        { id: "shot-hub-commercial-assembly", source: "shot-assembly-hub", target: "commercial-assembly", sourceHandle: "image", targetHandle: "image", style: boardEdgeStyle },
        { id: "assembly-export", source: "commercial-assembly", target: "final-export", sourceHandle: "image", targetHandle: "image", style: boardEdgeStyle },
      ],
    }),
  ];

  const edges: Edge[] = [
    makeEdge("brief-director-system", "creative-brief", "commercial-director-system", "prompt", "prompt", promptEdgeStyle),
    makeEdge("director-consistency-system", "commercial-director-system", "consistency-system", "prompt", "prompt", analysisEdgeStyle),
    makeEdge("director-shot-system", "commercial-director-system", "shot-system", "prompt", "prompt", analysisEdgeStyle),
    makeEdge("consistency-generation-system", "consistency-system", "generation-system", "image", "image", imageEdgeStyle),
    makeEdge("shot-generation-system", "shot-system", "generation-system", "prompt", "prompt", promptEdgeStyle),
    makeEdge("generation-animation-system", "generation-system", "animation-system", "image", "image", videoEdgeStyle),
    makeEdge("generation-final-system", "generation-system", "final-edit-system", "image", "image", boardEdgeStyle),
    makeEdge("animation-final-system", "animation-system", "final-edit-system", "video", "video", videoEdgeStyle),
  ];

  return { nodes, edges };
}

function createCommercialWorkflow(rawBrief = "Luxury Jewelry Ad") {
  const brief = rawBrief.trim() || "Luxury Jewelry Ad";
  const nodes: Node<CanvasNodeData>[] = [
    makeNode("layer-creative", "sticky-note", { x: -1660, y: -360 }, {
      noteText: "Layer 1 - Creative Direction\n\nThe brief feeds the Director Brain. The Director Brain defines mood, lighting language, lens logic, pacing, camera behavior, luxury level, and commercial identity.",
    }, {
      label: "Layer 1 / Creative Direction",
      description: "Commercial strategy layer",
    }),
    makeNode("creative-brief", "text-prompt", { x: -1660, y: -60 }, {
      prompt: brief,
    }, {
      label: "Creative Brief",
      description: "Write the commercial idea here, then build or run the pipeline",
    }),
    makeNode("director-brain", "assistant", { x: -1180, y: -80 }, {
      prompt: "You are the Director Brain for Saad Studio AI Canvas. Transform the connected creative brief into a production direction document. Define: ad type, target feeling, mood, cinematic style, lighting language, lens style, camera behavior, pacing, luxury level, color world, commercial identity, continuity rules, and what every downstream node must preserve. Output concise production instructions that can be injected into image and video generation prompts.",
    }, {
      label: "Director Brain",
      description: "Central intelligence shared with every downstream node",
    }),
    makeNode("visual-direction", "assistant", { x: -760, y: -260 }, {
      prompt: "Convert the Director Brain output into visual direction. Include composition rules, frame hierarchy, color palette, styling, set language, lens choices, lighting ratios, and negative constraints. Keep it production-ready and specific.",
    }, {
      label: "Visual Direction",
      description: "Defines the visual identity of the commercial",
    }),
    makeNode("layer-assets", "sticky-note", { x: -1660, y: 300 }, {
      noteText: "Layer 2 - Assets\n\nUpload real inputs here. Character grid is only a reference asset, not the center of the system. The real center is Director Brain + Brand Identity + Shot Planning.",
    }, {
      label: "Layer 2 / Assets",
      description: "Character, product, and environment inputs",
    }),
    makeNode("character-asset", "upload-image", { x: -1660, y: 600 }, { imageUrl: "" }, {
      label: "Character Asset",
      description: "Upload model / actor / person reference",
    }),
    makeNode("product-asset", "add-reference", { x: -1660, y: 940 }, { imageUrl: "" }, {
      label: "Product Asset",
      description: "Upload product, wardrobe, prop, or hero object",
    }),
    makeNode("environment-asset", "add-reference", { x: -1660, y: 1280 }, { imageUrl: "" }, {
      label: "Environment Asset",
      description: "Upload location, set, mood, or lighting reference",
    }),
    makeNode("asset-analysis", "assistant", { x: -1180, y: 650 }, {
      prompt: "Create a production asset analysis from the connected brief and uploaded assets. Describe how the character, product, and environment should be used across the commercial. Define identity consistency, product readability, styling constraints, and risks to avoid.",
    }, {
      label: "Product / Character Analysis",
      description: "Turns uploaded assets into production rules",
    }),
    makeNode("character-grid-reference", "image-edit", { x: -760, y: 620 }, {
      prompt: "Generate a character reference grid from the uploaded character asset. Use this only as a consistency reference: full body front, side profile, rear view, face close-up, profile close-up, hands, wardrobe detail, walking pose, expression close-up. Clean production grid, no text, no logos.",
      modelId: "nano-banana-pro",
      aspectRatio: "1:1",
    }, {
      label: "Character Grid Reference",
      description: "Reference only, not the workflow center",
    }),
    makeNode("layer-cinema", "sticky-note", { x: -1180, y: 1060 }, {
      noteText: "Layer 3 - Cinematography\n\nShot Director converts the Director Brain into structured shots. No random grids. Each shot has purpose, lens behavior, framing, and motion logic.",
    }, {
      label: "Layer 3 / Cinematography",
      description: "Shot planning and camera logic",
    }),
    makeNode("shot-director", "assistant", { x: -760, y: 1060 }, {
      prompt: "You are the Shot Director. Build a structured commercial shot plan from the Director Brain, Visual Direction, and Asset Analysis. Required shots: Hero Shot, Establishing Shot, Macro Shot, Beauty Shot, Product Detail Shot, Motion Shot, Editorial Shot. For each shot define purpose, composition, lens, camera angle, lighting, movement, pacing, and consistency constraints.",
    }, {
      label: "Shot Director System",
      description: "Creates organized commercial shots",
    }),
    makeNode("auto-shot-expansion", "assistant", { x: -320, y: 1060 }, {
      prompt: "Expand every shot into production variations. For each shot produce: wide, medium, close-up, macro, side angle, and cinematic motion variation. Keep the same Director Brain identity, brand logic, and asset consistency. Output clear prompts that downstream image/video nodes can use.",
    }, {
      label: "Auto Shot Expansion",
      description: "Expands shots into renderable variations",
    }),
    makeNode("layer-generation", "sticky-note", { x: -320, y: -360 }, {
      noteText: "Layer 4 - Generation\n\nEach shot is generated separately. Run a shot node, inspect it, then run its variation or animation nodes downstream.",
    }, {
      label: "Layer 4 / Generation",
      description: "Still frame generation layer",
    }),
    makeNode("hero-shot", "image-edit", { x: -320, y: -60 }, {
      prompt: "Generate the Hero Shot from the Director Brain and Shot Director plan. Use connected assets and character grid only for consistency. Make the strongest commercial frame for the brief. 16:9, cinematic, no text, no logos.",
      modelId: "nano-banana-pro",
      aspectRatio: "16:9",
    }, {
      label: "Hero Shot",
      description: "Primary commercial image",
    }),
    makeNode("establishing-shot", "image-edit", { x: -320, y: 260 }, {
      prompt: "Generate the Establishing Shot. Show the world, product context, mood, and visual language before the commercial action begins. 16:9 cinematic advertising frame, no text, no logos.",
      modelId: "nano-banana-pro",
      aspectRatio: "16:9",
    }, {
      label: "Establishing Shot",
      description: "Sets location and commercial world",
    }),
    makeNode("macro-shot", "image-edit", { x: -320, y: 580 }, {
      prompt: "Generate the Macro Shot. Focus on product/material/detail interaction with cinematic shallow depth of field. Product must be readable and premium. Natural anatomy, no distortions, no text.",
      modelId: "nano-banana-pro",
      aspectRatio: "16:9",
    }, {
      label: "Macro Shot",
      description: "High-detail commercial close-up",
    }),
    makeNode("beauty-shot", "image-edit", { x: 140, y: -60 }, {
      prompt: "Generate the Beauty Shot. Prioritize face, styling, light on skin, fashion posture, premium brand mood, and identity consistency. 16:9 cinematic advertising frame, no text.",
      modelId: "nano-banana-pro",
      aspectRatio: "16:9",
    }, {
      label: "Beauty Shot",
      description: "Character and styling hero frame",
    }),
    makeNode("product-detail-shot", "image-edit", { x: 140, y: 260 }, {
      prompt: "Generate the Product Detail Shot. The product or wardrobe detail must be sharp, luxurious, and consistent with the uploaded asset. Strong commercial lighting, no text, no logos.",
      modelId: "nano-banana-pro",
      aspectRatio: "16:9",
    }, {
      label: "Product Detail Shot",
      description: "Product readability frame",
    }),
    makeNode("editorial-shot", "image-edit", { x: 140, y: 580 }, {
      prompt: "Generate the Editorial Shot. Make it feel like a high-end campaign still with strong composition, pose, color language, and brand identity. Keep asset consistency. No text.",
      modelId: "nano-banana-pro",
      aspectRatio: "16:9",
    }, {
      label: "Editorial Shot",
      description: "Campaign/editorial frame",
    }),
    makeNode("layer-variations", "sticky-note", { x: 600, y: -360 }, {
      noteText: "Layer 4B - Variations\n\nVariations are attached to approved shots. They are not random; they inherit Director Brain, Shot Director, and asset rules.",
    }, {
      label: "Layer 4B / Variations",
      description: "Controlled shot expansion",
    }),
    makeNode("hero-variations", "variations", { x: 600, y: -60 }, {
      prompt: "Create controlled Hero Shot variations: wide, medium, close-up, side angle, and cinematic motion-ready frame. Preserve the same identity, product, lighting language, and brand mood.",
      modelId: "nano-banana-pro",
      aspectRatio: "16:9",
    }, {
      label: "Hero Variations",
      description: "Auto expansion for hero shot",
    }),
    makeNode("macro-variations", "variations", { x: 600, y: 300 }, {
      prompt: "Create controlled macro/product variations from the approved macro shot. Explore angle, depth of field, highlight, and product readability while preserving consistency.",
      modelId: "nano-banana-pro",
      aspectRatio: "16:9",
    }, {
      label: "Macro Variations",
      description: "Auto expansion for product detail",
    }),
    makeNode("layer-animation", "sticky-note", { x: 1060, y: -360 }, {
      noteText: "Layer 5 - Animation\n\nAnimation nodes receive approved stills plus Director Brain pacing and camera behavior. They should preserve identity and product shape.",
    }, {
      label: "Layer 5 / Animation",
      description: "Motion production layer",
    }),
    makeNode("motion-shot", "image-to-video", { x: 1060, y: -60 }, {
      prompt: "Animate this approved commercial frame using the Director Brain motion language. Preserve identity, product shape, lighting continuity, and cinematic pacing. Use smooth premium camera movement.",
      modelId: "kling/v2-5-turbo-image-to-video-pro",
      aspectRatio: "16:9",
      duration: 5,
    }, {
      label: "Motion Shot",
      description: "Primary animated commercial clip",
    }),
    makeNode("macro-motion-shot", "image-to-video", { x: 1060, y: 300 }, {
      prompt: "Animate the approved macro/product frame with subtle premium camera movement, controlled focus, stable product shape, and no warping.",
      modelId: "kling/v2-5-turbo-image-to-video-pro",
      aspectRatio: "16:9",
      duration: 5,
    }, {
      label: "Macro Motion Shot",
      description: "Product detail animation",
    }),
    makeNode("layer-final", "sticky-note", { x: 1520, y: -360 }, {
      noteText: "Layer 6 - Final Edit\n\nThe final assembly receives stills and videos. Export only after generation and animation nodes produce real outputs.",
    }, {
      label: "Layer 6 / Final Edit",
      description: "Assembly and export layer",
    }),
    makeNode("commercial-assembly", "image-edit", { x: 1520, y: -40 }, {
      prompt: "Assemble the connected approved stills into a final commercial production board. Show the campaign logic: creative direction, hero, establishing, macro, beauty, product detail, editorial, and motion-ready frames. No text, no logos, no watermark.",
      modelId: "nano-banana-pro",
      aspectRatio: "16:9",
    }, {
      label: "Final Commercial Assembly",
      description: "Builds the final campaign board from real generated outputs",
    }),
    makeNode("final-export", "export", { x: 1980, y: 80 }, undefined, {
      label: "Final Export",
      description: "Exports generated still board and connected commercial videos",
    }),
  ];

  const edges: Edge[] = [
    makeEdge("brief-director", "creative-brief", "director-brain", "prompt", "prompt", promptEdgeStyle),
    makeEdge("director-visual", "director-brain", "visual-direction", "prompt", "prompt", analysisEdgeStyle),
    makeEdge("brief-analysis", "creative-brief", "asset-analysis", "prompt", "prompt", promptEdgeStyle),
    makeEdge("director-analysis", "director-brain", "asset-analysis", "prompt", "prompt", analysisEdgeStyle),
    makeEdge("character-grid-input", "character-asset", "character-grid-reference", "image", "image", imageEdgeStyle),
    makeEdge("visual-character-grid", "visual-direction", "character-grid-reference", "prompt", "prompt", analysisEdgeStyle),
    makeEdge("analysis-shot-director", "asset-analysis", "shot-director", "prompt", "prompt", analysisEdgeStyle),
    makeEdge("visual-shot-director", "visual-direction", "shot-director", "prompt", "prompt", analysisEdgeStyle),
    makeEdge("shot-expansion", "shot-director", "auto-shot-expansion", "prompt", "prompt", analysisEdgeStyle),
    ...["hero-shot", "establishing-shot", "macro-shot", "beauty-shot", "product-detail-shot", "editorial-shot"].flatMap(target => [
      makeEdge(`expansion-${target}`, "auto-shot-expansion", target, "prompt", "prompt", promptEdgeStyle),
      makeEdge(`character-${target}`, "character-asset", target, "image", "image", imageEdgeStyle),
      makeEdge(`product-${target}`, "product-asset", target, "image", "image", imageEdgeStyle),
      makeEdge(`environment-${target}`, "environment-asset", target, "image", "image", imageEdgeStyle),
      makeEdge(`grid-${target}`, "character-grid-reference", target, "image", "image", imageEdgeStyle),
    ]),
    makeEdge("hero-to-variations", "hero-shot", "hero-variations", "image", "image", boardEdgeStyle),
    makeEdge("macro-to-variations", "macro-shot", "macro-variations", "image", "image", boardEdgeStyle),
    makeEdge("expansion-hero-variations", "auto-shot-expansion", "hero-variations", "prompt", "prompt", promptEdgeStyle),
    makeEdge("expansion-macro-variations", "auto-shot-expansion", "macro-variations", "prompt", "prompt", promptEdgeStyle),
    makeEdge("hero-motion", "hero-variations", "motion-shot", "image", "image", videoEdgeStyle),
    makeEdge("macro-motion", "macro-variations", "macro-motion-shot", "image", "image", videoEdgeStyle),
    makeEdge("director-motion", "director-brain", "motion-shot", "prompt", "prompt", analysisEdgeStyle),
    makeEdge("director-macro-motion", "director-brain", "macro-motion-shot", "prompt", "prompt", analysisEdgeStyle),
    ...["hero-shot", "establishing-shot", "macro-shot", "beauty-shot", "product-detail-shot", "editorial-shot", "hero-variations", "macro-variations"].map(source =>
      makeEdge(`${source}-assembly`, source, "commercial-assembly", "image", "image", boardEdgeStyle),
    ),
    makeEdge("assembly-export", "commercial-assembly", "final-export", "image", "image", boardEdgeStyle),
    makeEdge("motion-export", "motion-shot", "final-export", "video", "video", videoEdgeStyle),
    makeEdge("macro-motion-export", "macro-motion-shot", "final-export", "video", "video", videoEdgeStyle),
  ];

  return { nodes, edges };
}

const DEFAULT_WORKFLOW = createCommercialWorkflow();
const INITIAL_NODES: Node<CanvasNodeData>[] = DEFAULT_WORKFLOW.nodes;
const INITIAL_EDGES: Edge[] = DEFAULT_WORKFLOW.edges;
const CANVAS_WORKSPACE_KEY = "ai-canvas-workspace-v1";

type CanvasWorkspace = {
  name: string;
  nodes: Node<CanvasNodeData>[];
  edges: Edge[];
};

type ProductionAssetKind = "character" | "product" | "environment" | "logo" | "style";

type ProductionAsset = {
  id: string;
  kind: ProductionAssetKind;
  name: string;
  url: string;
};

const ASSET_KIND_LABELS: Record<ProductionAssetKind, string> = {
  character: "Character",
  product: "Product",
  environment: "Environment",
  logo: "Logo",
  style: "Style Ref",
};

async function uploadProductionAsset(file: File): Promise<string> {
  const signRes = await fetch("/api/media/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type || "application/octet-stream" }),
  });

  const signJson = await signRes.json().catch(() => ({})) as {
    signedUrl?: string;
    publicUrl?: string;
    error?: string;
  };

  if (!signRes.ok || !signJson.signedUrl || !signJson.publicUrl) {
    throw new Error(signJson.error || "Failed to prepare asset upload.");
  }

  const uploadRes = await fetch(signJson.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  if (!uploadRes.ok) throw new Error("Failed to upload asset.");
  return signJson.publicUrl;
}

function assetTargetMatches(kind: ProductionAssetKind, node: Node<CanvasNodeData> | SubgraphNodeSpec) {
  const id = node.id.toLowerCase();
  const label = String("data" in node ? node.data.label : node.label).toLowerCase();
  const haystack = `${id} ${label}`;

  if (kind === "character") return haystack.includes("character") || haystack.includes("main-asset") || haystack.includes("main asset");
  if (kind === "product") return haystack.includes("product") || haystack.includes("object") || haystack.includes("prop");
  if (kind === "environment") return haystack.includes("environment") || haystack.includes("location") || haystack.includes("mood");
  if (kind === "logo") return haystack.includes("logo") || haystack.includes("brand");
  return haystack.includes("style") || haystack.includes("visual") || haystack.includes("reference");
}

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
type NodeLibraryTab = "All" | "BASICS" | "MEDIA" | "IMAGE" | "VIDEO" | "TEXT";

const NODE_LIBRARY_SECTIONS: Array<{ title: string; items: LibItem[] }> = [
  {
    title: "BASICS",
    items: [
      { type: "text-prompt"    as const, label: "Text",            icon: "T",   color: "#8b5cf6" },
      { type: "text-to-image"  as const, label: "Image Generator", icon: "🖼",  color: "#f59e0b" },
      { type: "text-to-video"  as const, label: "Video Generator", icon: "🎬",  color: "#10b981" },
      { type: "assistant"      as const, label: "Assistant",       icon: "✨",  color: "#6366f1" },
      { type: "upscale"        as const, label: "Image Upscaler",  icon: "⬆",  color: "#14b8a6" },
      { type: "connector"      as const, label: "Connector",       icon: "↔",  color: "#14b8a6" },
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
      { type: "connector"      as const, label: "Connector",       icon: "↔",  color: "#14b8a6" },
      { type: "sticky-note"    as const, label: "Sticky Note",     icon: "📝",  color: "#fbbf24" },
      { type: "stickers"       as const, label: "Stickers",        icon: "😊",  color: "#f43f5e" },
      { type: "export"         as const, label: "Export",          icon: "📥",  color: "#84cc16" },
    ],
  },
];

function uniqueLibItems(items: LibItem[]) {
  const seen = new Set<CanvasNodeType>();
  return items.filter(item => {
    if (seen.has(item.type)) return false;
    seen.add(item.type);
    return true;
  });
}

function NodeLibraryPanel({
  onAdd, onClose,
}: {
  onAdd: (t: CanvasNodeType) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [activeCategory, setActiveCategory] = useState<NodeLibraryTab>("All");
  const activeSections = activeCategory === "All"
    ? NODE_LIBRARY_SECTIONS
    : NODE_LIBRARY_SECTIONS.filter(s => s.title === activeCategory);
  const visibleItems = uniqueLibItems(activeSections.flatMap(s => s.items));
  const filtered: LibItem[] | null = q.trim()
    ? visibleItems.filter(i => i.label.toLowerCase().includes(q.toLowerCase()))
    : null;
  const tabs: Array<{ icon: ReactNode; label: string; category: NodeLibraryTab }> = [
    { icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="1" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3"/></svg>, label: "All nodes", category: "All" },
    { icon: <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7h5M7 4.5v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>, label: "Basics", category: "BASICS" },
    { icon: <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 4.5h4.2l1-1.5H12a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>, label: "Media", category: "MEDIA" },
    { icon: <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M3.5 9l2-2 2 1.7 1.5-1.2 1.8 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9.8" cy="5.2" r="1" fill="currentColor"/></svg>, label: "Image", category: "IMAGE" },
    { icon: <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M5.5 2h3M7 2v10M4.5 12h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>, label: "Text", category: "TEXT" },
    { icon: <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 5.5l3 1.5-3 1.5v-3z" fill="currentColor"/></svg>, label: "Video", category: "VIDEO" },
  ];

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
        {tabs.map(tab => {
          const active = activeCategory === tab.category;
          return (
          <button
            key={tab.category}
            type="button"
            title={tab.label}
            aria-pressed={active}
            onClick={() => setActiveCategory(tab.category)}
            style={{ width: 28, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: active ? "rgba(255,255,255,0.08)" : "transparent", border: active ? "1px solid rgba(103,232,249,0.22)" : "1px solid transparent", color: active ? "#94e8ff" : "#3d5573", cursor: "pointer" }}
          >
            {tab.icon}
          </button>
          );
        })}
      </div>

      {/* Node list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {filtered
          ? filtered.length > 0
            ? filtered.map(item => (
                <NodeLibItem key={item.type} item={item} onAdd={onAdd} onClose={onClose} />
              ))
            : <div style={{ padding: "18px 14px", color: "#5f7896", fontSize: 12 }}>No nodes found.</div>
          : activeSections.map(sec => (
              <div key={sec.title}>
                <div style={{ padding: "4px 14px 6px", color: "#3a5573", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{sec.title}</div>
                {uniqueLibItems(sec.items).map(item => (
                  <NodeLibItem key={item.type} item={item} onAdd={onAdd} onClose={onClose} />
                ))}
              </div>
            ))
        }
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

function ProductionAssetsPanel({
  assets,
  uploadingKind,
  onUpload,
  onClose,
}: {
  assets: ProductionAsset[];
  uploadingKind: ProductionAssetKind | null;
  onUpload: (kind: ProductionAssetKind, file?: File | null) => void;
  onClose: () => void;
}) {
  const fileRefs = useRef<Record<ProductionAssetKind, HTMLInputElement | null>>({
    character: null,
    product: null,
    environment: null,
    logo: null,
    style: null,
  });

  return (
    <div
      style={{
        marginTop: 10,
        width: 360,
        borderRadius: 16,
        border: "1px solid rgba(103,232,249,0.14)",
        background: "rgba(7,12,24,0.86)",
        backdropFilter: "blur(18px)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.42)",
        padding: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ color: "#67e8f9", fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>
          Universal Assets
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ color: "rgba(148,163,184,0.7)", fontSize: 10 }}>{assets.length} routed</div>
          <button
            onClick={onClose}
            style={{
              height: 24,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#94a3b8",
              padding: "0 9px",
              fontSize: 10,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Hide
          </button>
        </div>
      </div>
      <div style={{ color: "rgba(148,163,184,0.72)", fontSize: 11, lineHeight: 1.45, marginBottom: 10 }}>
        Upload assets here. The AI Canvas routes them into consistency, shot planning, generation, and animation systems automatically.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {(Object.keys(ASSET_KIND_LABELS) as ProductionAssetKind[]).map(kind => {
          const asset = assets.find(item => item.kind === kind);
          const busy = uploadingKind === kind;
          return (
            <div key={kind} style={{ position: "relative" }}>
              <input
                ref={el => { fileRefs.current[kind] = el; }}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => {
                  onUpload(kind, e.target.files?.[0]);
                  e.currentTarget.value = "";
                }}
              />
              <button
                onClick={() => fileRefs.current[kind]?.click()}
                disabled={Boolean(uploadingKind)}
                style={{
                  width: "100%",
                  minHeight: 54,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 12,
                  border: asset ? "1px solid rgba(45,212,191,0.32)" : "1px solid rgba(255,255,255,0.09)",
                  background: asset ? "rgba(20,184,166,0.1)" : "rgba(3,7,18,0.58)",
                  color: asset ? "#ccfbf1" : "#cbd5e1",
                  padding: 8,
                  cursor: uploadingKind ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                {asset ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.url} alt={asset.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(34,211,238,0.08)", color: "#67e8f9", fontSize: 17 }}>
                    +
                  </span>
                )}
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 11.5, fontWeight: 800 }}>
                    {busy ? "Uploading..." : ASSET_KIND_LABELS[kind]}
                  </span>
                  <span style={{ display: "block", color: "rgba(148,163,184,0.65)", fontSize: 9.5, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 94 }}>
                    {asset ? asset.name : "Click to upload"}
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
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
  const { fitView, screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CanvasNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [canvasNameInput, setCanvasNameInput] = useState("My Canvas");
  const [canvasName, setCanvasName] = useState("My Canvas");
  const [hasOpenedCanvas, setHasOpenedCanvas] = useState(false);
  const [savedWorkspace, setSavedWorkspace] = useState<CanvasWorkspace | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showWorkflowBuilder, setShowWorkflowBuilder] = useState(false);
  const [showAssetsPanel, setShowAssetsPanel] = useState(false);
  const [briefInput, setBriefInput] = useState("Luxury Jewelry Ad");
  const [assets, setAssets] = useState<ProductionAsset[]>([]);
  const [uploadingAssetKind, setUploadingAssetKind] = useState<ProductionAssetKind | null>(null);

  const nodesRef = useRef<Node<CanvasNodeData>[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CANVAS_WORKSPACE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<CanvasWorkspace>;
      if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return;
      setSavedWorkspace({
        name: parsed.name || "My Canvas",
        nodes: parsed.nodes,
        edges: parsed.edges,
      });
      setCanvasNameInput(parsed.name || "My Canvas");
    } catch {
      // Start from the creation screen if saved workspace data is unavailable.
    }
  }, []);

  useEffect(() => {
    try {
      const savedAssets = localStorage.getItem("ai-canvas-assets-v1");
      if (!savedAssets) return;
      const parsed = JSON.parse(savedAssets) as ProductionAsset[];
      if (Array.isArray(parsed)) setAssets(parsed);
    } catch {}
  }, []);

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

  const routeAssetToWorkflow = useCallback((asset: ProductionAsset) => {
    let routedCount = 0;
    setNodes(nds => nds.map(node => {
      let changed = false;
      let nextNode = node;

      if (assetTargetMatches(asset.kind, node) && ["upload-image", "add-reference", "assets", "stock"].includes(node.data.nodeType)) {
        routedCount += 1;
        changed = true;
        nextNode = {
          ...nextNode,
          data: {
            ...nextNode.data,
            settings: { ...nextNode.data.settings, imageUrl: asset.url },
          },
        };
      }

      const subgraph = nextNode.data.subgraph as SubgraphSpec | undefined;
      if (subgraph?.nodes?.length) {
        const nestedNodes = subgraph.nodes.map(spec => {
          if (!assetTargetMatches(asset.kind, spec)) return spec;
          routedCount += 1;
          changed = true;
          return {
            ...spec,
            settings: { ...spec.settings, imageUrl: asset.url },
          };
        });
        if (changed) {
          nextNode = {
            ...nextNode,
            data: {
              ...nextNode.data,
              subgraph: { ...subgraph, nodes: nestedNodes },
            },
          };
        }
      }

      return changed ? nextNode : node;
    }));
    addActivity({
      nodeId: "",
      nodeLabel: "Universal Assets",
      level: "success",
      message: `${ASSET_KIND_LABELS[asset.kind]} routed to ${routedCount || "matching"} production system target(s).`,
      outputUrl: asset.url,
    });
  }, [setNodes, addActivity]);

  const uploadAndRouteAsset = useCallback(async (kind: ProductionAssetKind, file?: File | null) => {
    if (!file) return;
    setUploadingAssetKind(kind);
    try {
      const url = await uploadProductionAsset(file);
      const asset: ProductionAsset = {
        id: crypto.randomUUID(),
        kind,
        name: file.name,
        url,
      };
      setAssets(prev => {
        const next = [asset, ...prev.filter(item => item.kind !== kind)].slice(0, 20);
        try {
          localStorage.setItem("ai-canvas-assets-v1", JSON.stringify(next));
        } catch {}
        return next;
      });
      routeAssetToWorkflow(asset);
    } catch (err) {
      addActivity({
        nodeId: "",
        nodeLabel: "Universal Assets",
        level: "error",
        message: err instanceof Error ? err.message : "Asset upload failed.",
      });
    } finally {
      setUploadingAssetKind(null);
    }
  }, [addActivity, routeAssetToWorkflow]);

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
        const inputPrompts: string[] = [];
        let inputImageUrl: string | undefined;
        let inputVideoUrl: string | undefined;

        for (const edge of inEdges) {
          const src = allNodes.find(n => n.id === edge.source);
          if (!src) continue;
          const sd = src.data;
          if (sd.nodeType === "text-prompt" && sd.settings.prompt) inputPrompts.push(sd.settings.prompt);
          else if (sd.outputText) inputPrompts.push(sd.outputText);
          else if ((sd.nodeType === "list" || sd.nodeType === "sticky-note") && sd.settings.noteText) inputPrompts.push(sd.settings.noteText);
          else if (["upload-image", "add-reference", "assets", "stock"].includes(sd.nodeType) && sd.settings.imageUrl) {
            inputImageUrls.push(sd.settings.imageUrl);
          }
          else if (sd.outputImageUrl) inputImageUrls.push(sd.outputImageUrl);
          else if (sd.outputVideoUrl) inputVideoUrl = sd.outputVideoUrl;
        }

        const prompt = [...inputPrompts, s.prompt].filter(Boolean).join("\n\n");
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
              body: JSON.stringify({ prompt, modelId: s.modelId || "nano-banana-pro", aspectRatio: s.aspectRatio || "1:1", quality: s.quality || "1K", resolution: s.quality || "1K", negativePrompt: s.negativePrompt, imageUrls: inputImageUrls }),
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
              body: JSON.stringify({ prompt, modelId: s.modelId || "nano-banana-pro", aspectRatio: s.aspectRatio || "1:1", quality: s.quality || "1K", resolution: s.quality || "1K", imageUrl, imageUrls: inputImageUrls }),
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
            outputText = [
              "Production direction captured locally.",
              "",
              prompt,
            ].join("\n");
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
              body: JSON.stringify({ prompt: prompt || "create a variation of this image", modelId: s.modelId || "nano-banana-pro", imageUrl, imageUrls: inputImageUrls, aspectRatio: s.aspectRatio || "1:1", quality: s.quality || "1K", resolution: s.quality || "1K" }),
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
              body: JSON.stringify({ prompt, modelId: s.modelId || "gpt-image/1.5-text-to-image", aspectRatio: s.aspectRatio || "1:1", quality: s.quality || "1K", resolution: s.quality || "1K" }),
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
              body: JSON.stringify({ prompt, modelId: "recraft/svg-text-to-image", aspectRatio: s.aspectRatio || "1:1", quality: s.quality || "1K", resolution: s.quality || "1K" }),
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
              body: JSON.stringify({ prompt: `sticker style, ${prompt}, white background, clean outline`, modelId: s.modelId || "nano-banana-pro", aspectRatio: "1:1", quality: s.quality || "1K", resolution: s.quality || "1K" }),
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
          case "connector": {
            outputImageUrl = imageUrl;
            outputVideoUrl = videoUrl;
            outputText = prompt || undefined;
            if (!outputImageUrl && !outputVideoUrl && !outputText) {
              throw new Error("Connector needs an input connection.");
            }
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
      }
    },
    [patchNode, addActivity],
  );

  const runNode = useCallback(
    (id: string) => {
      setIsRunning(true);
      executeNode(id)
        .catch(() => {
          // The node already stores the error state and activity entry.
        })
        .finally(() => setIsRunning(false));
    },
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

  const openCanvasWorkspace = useCallback((mode: "blank" | "saved" | "template") => {
    const name = canvasNameInput.trim() || "My Canvas";
    setCanvasName(name);
    setHasOpenedCanvas(true);
    setSelectedNodeId(null);

    if (mode === "saved" && savedWorkspace) {
      setNodes(savedWorkspace.nodes);
      setEdges(savedWorkspace.edges);
      setTimeout(() => fitView({ padding: 0.22, duration: 450 }), 80);
      return;
    }

    if (mode === "template") {
      const workflow = createCommercialWorkflow(name);
      setNodes(workflow.nodes);
      setEdges(workflow.edges);
      assets.forEach(routeAssetToWorkflow);
      try {
        localStorage.setItem(CANVAS_WORKSPACE_KEY, JSON.stringify({ name, nodes: workflow.nodes, edges: workflow.edges }));
      } catch {}
      setTimeout(() => fitView({ padding: 0.2, duration: 450 }), 80);
      return;
    }

    setNodes([]);
    setEdges([]);
    try {
      localStorage.setItem(CANVAS_WORKSPACE_KEY, JSON.stringify({ name, nodes: [], edges: [] }));
    } catch {}
  }, [assets, canvasNameInput, fitView, routeAssetToWorkflow, savedWorkspace, setEdges, setNodes]);

  const deleteNode = useCallback(
    (id: string) => {
      setNodes(nds => nds.filter(n => n.id !== id));
      setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
      if (selectedNodeId === id) setSelectedNodeId(null);
    },
    [setNodes, setEdges, selectedNodeId],
  );

  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) {
      addActivity({ nodeId: "", nodeLabel: "Canvas", level: "warn", message: "Select a node first, then press Delete." });
      return;
    }
    const node = nodesRef.current.find(n => n.id === selectedNodeId);
    deleteNode(selectedNodeId);
    addActivity({
      nodeId: selectedNodeId,
      nodeLabel: node?.data.label || "Canvas",
      level: "info",
      message: `${node?.data.label || "Selected node"} deleted.`,
    });
  }, [selectedNodeId, deleteNode, addActivity]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        Boolean(target?.isContentEditable);
      if (isTyping) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        if (!selectedNodeId) return;
        event.preventDefault();
        deleteSelectedNode();
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setShowAddMenu(value => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelectedNode, selectedNodeId]);

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

  const collapseSuperNode = useCallback((systemId: string) => {
    const prefix = `${systemId}__`;
    setNodes(nds => nds
      .filter(n => n.data.parentSystemId !== systemId)
      .map(n => n.id === systemId ? { ...n, data: { ...n.data, isExpanded: false } } : n));
    setEdges(eds => eds.filter(e => e.data?.parentSystemId !== systemId && !e.id.startsWith(prefix)));
  }, [setNodes, setEdges]);

  const expandSuperNode = useCallback((systemId: string) => {
    const system = nodesRef.current.find(n => n.id === systemId);
    const subgraph = system?.data.subgraph as SubgraphSpec | undefined;
    if (!system || !subgraph?.nodes?.length) return;
    if (system.data.isExpanded) {
      collapseSuperNode(systemId);
      return;
    }

    const prefix = `${systemId}__`;
    const expandedNodes = subgraph.nodes.map(spec =>
      makeNode(
        `${prefix}${spec.id}`,
        spec.type,
        { x: system.position.x + spec.position.x, y: system.position.y + 360 + spec.position.y },
        spec.settings,
        {
          label: spec.label,
          description: spec.description,
          parentSystemId: systemId,
        },
      ),
    );
    const expandedEdges = subgraph.edges.map(edge => ({
      id: `${prefix}${edge.id}`,
      source: `${prefix}${edge.source}`,
      target: `${prefix}${edge.target}`,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: "default",
      style: edge.style,
      data: { parentSystemId: systemId },
    } satisfies Edge));

    setNodes(nds => [
      ...nds
        .filter(n => n.data.parentSystemId !== systemId)
        .map(n => n.id === systemId ? { ...n, data: { ...n.data, isExpanded: true } } : n),
      ...expandedNodes,
    ]);
    setEdges(eds => [
      ...eds.filter(e => e.data?.parentSystemId !== systemId && !e.id.startsWith(prefix)),
      ...expandedEdges,
    ]);
    addActivity({ nodeId: systemId, nodeLabel: system.data.label, level: "info", message: `${system.data.label} expanded into its internal production nodes.` });
    setTimeout(() => fitView({ padding: 0.18, duration: 450 }), 60);
  }, [setNodes, setEdges, addActivity, fitView, collapseSuperNode]);

  const addNode = useCallback(
    (type: CanvasNodeType) => {
      const cfg = NODE_CONFIGS[type];
      const typeCount = nodesRef.current.filter(n => n.data.nodeType === type).length + 1;
      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      const pos = {
        x: Math.round(center.x - (type === "text-prompt" ? 170 : type === "connector" ? 95 : 240)),
        y: Math.round(center.y - (type === "text-prompt" ? 80 : type === "connector" ? 21 : 150)),
      };
      const id = `node-${Date.now()}`;
      const newNode: Node<CanvasNodeData> = {
        id, type: "canvasNode", position: pos,
        data: { nodeType: type, label: `${cfg.label} #${typeCount}`, description: cfg.description, status: "idle", settings: { ...cfg.defaultSettings }, creditCost: cfg.creditCost },
      };
      setNodes(nds => [...nds, newNode]);
      setSelectedNodeId(id);
      addActivity({ nodeId: id, nodeLabel: newNode.data.label, level: "info", message: `${newNode.data.label} added at the current view.` });
    },
    [setNodes, screenToFlowPosition, addActivity],
  );

  const saveCanvasState = useCallback(() => {
    try {
      const workspace = { name: canvasName, nodes: nodesRef.current, edges: edgesRef.current };
      localStorage.setItem(CANVAS_WORKSPACE_KEY, JSON.stringify(workspace));
      setSavedWorkspace(workspace);
      addActivity({ nodeId: "", nodeLabel: "Canvas", level: "success", message: "Canvas saved to local storage." });
    } catch {
      addActivity({ nodeId: "", nodeLabel: "Canvas", level: "error", message: "Failed to save canvas." });
    }
  }, [addActivity, canvasName]);

  const buildWorkflowFromBrief = useCallback(async () => {
    const brief = briefInput.trim() || "Luxury Jewelry Ad";
    setIsRunning(true);
    setActivity([]);
    addActivity({
      nodeId: "creative-brief",
      nodeLabel: "AI Workflow Architect",
      level: "info",
      message: `Designing runtime node graph for: ${brief}.`,
    });
    try {
      const architecture = await requestWorkflowArchitecture(brief);
      const workflow = createWorkflowFromArchitecture(brief, architecture);
      setNodes(workflow.nodes);
      setEdges(workflow.edges);
      assets.forEach(routeAssetToWorkflow);
      setSelectedNodeId(null);
      const workspace = { name: canvasName, nodes: workflow.nodes, edges: workflow.edges };
      localStorage.setItem(CANVAS_WORKSPACE_KEY, JSON.stringify(workspace));
      setSavedWorkspace(workspace);
      addActivity({
        nodeId: "creative-brief",
        nodeLabel: "AI Workflow Architect",
        level: "success",
        message: `Generated ${workflow.nodes.length} nodes for ${architecture.adType}.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Workflow Architect failed.";
      const fallback = createCommercialWorkflow(brief);
      setNodes(fallback.nodes);
      setEdges(fallback.edges);
      assets.forEach(routeAssetToWorkflow);
      setSelectedNodeId(null);
      try {
        const workspace = { name: canvasName, nodes: fallback.nodes, edges: fallback.edges };
        localStorage.setItem(CANVAS_WORKSPACE_KEY, JSON.stringify(workspace));
        setSavedWorkspace(workspace);
      } catch {}
      addActivity({
        nodeId: "creative-brief",
        nodeLabel: "AI Workflow Architect",
        level: "warn",
        message: `${message} Loaded the local operating-system fallback so the canvas remains usable.`,
      });
    } finally {
      setIsRunning(false);
      setTimeout(() => fitView({ padding: 0.18, duration: 450 }), 80);
    }
  }, [briefInput, setNodes, setEdges, addActivity, fitView, assets, routeAssetToWorkflow, canvasName]);

  const resetToTemplate = useCallback(() => {
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    assets.forEach(routeAssetToWorkflow);
    setSelectedNodeId(null);
    try {
      const workspace = { name: canvasName, nodes: INITIAL_NODES, edges: INITIAL_EDGES };
      localStorage.setItem(CANVAS_WORKSPACE_KEY, JSON.stringify(workspace));
      setSavedWorkspace(workspace);
    } catch {}
    addActivity({ nodeId: "", nodeLabel: "Template", level: "success", message: "Loaded the commercial production operating system template." });
    setTimeout(() => fitView({ padding: 0.18, duration: 450 }), 80);
  }, [setNodes, setEdges, addActivity, fitView, assets, routeAssetToWorkflow, canvasName]);

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
  const selectedNode = selectedNodeId ? nodes.find(node => node.id === selectedNodeId) : null;
  const selectedSuperNode = selectedNode?.data.isSuperNode ? selectedNode : null;

  if (!hasOpenedCanvas) {
    return (
      <CanvasContext.Provider value={canvasCtx}>
        <div
          style={{
            minHeight: "calc(100vh - 64px)",
            background:
              "radial-gradient(circle at 28% 18%, rgba(34,211,238,0.14), transparent 32%), radial-gradient(circle at 76% 26%, rgba(99,102,241,0.14), transparent 34%), #060c18",
            color: "#e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "min(760px, 100%)",
              borderRadius: 24,
              border: "1px solid rgba(148,163,184,0.16)",
              background: "linear-gradient(180deg, rgba(15,23,42,0.82), rgba(3,7,18,0.92))",
              boxShadow: "0 30px 120px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
              padding: 28,
            }}
          >
            <div style={{ color: "#67e8f9", fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 14 }}>
              Saad Studio AI Canvas
            </div>
            <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.05, letterSpacing: 0, fontWeight: 900 }}>
              Create My Canvas
            </h1>
            <p style={{ margin: "14px 0 24px", color: "rgba(203,213,225,0.72)", fontSize: 15, lineHeight: 1.6, maxWidth: 560 }}>
              Start with a clean production workspace. No scattered nodes appear until you create or open a canvas.
            </p>

            <label style={{ display: "block", color: "#93c5fd", fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
              Canvas name
            </label>
            <input
              autoFocus
              value={canvasNameInput}
              onChange={event => setCanvasNameInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter") openCanvasWorkspace("blank");
              }}
              placeholder="My Canvas"
              style={{
                width: "100%",
                height: 52,
                borderRadius: 14,
                border: "1px solid rgba(148,163,184,0.18)",
                background: "rgba(2,6,23,0.72)",
                color: "#f8fafc",
                outline: "none",
                padding: "0 16px",
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "inherit",
              }}
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 22 }}>
              <button
                type="button"
                onClick={() => openCanvasWorkspace("blank")}
                style={{
                  height: 44,
                  borderRadius: 13,
                  border: "1px solid rgba(34,211,238,0.34)",
                  background: "linear-gradient(135deg, rgba(8,145,178,0.96), rgba(79,70,229,0.92))",
                  color: "#fff",
                  padding: "0 18px",
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Create empty canvas
              </button>
              {savedWorkspace && (
                <button
                  type="button"
                  onClick={() => openCanvasWorkspace("saved")}
                  style={{
                    height: 44,
                    borderRadius: 13,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#e2e8f0",
                    padding: "0 16px",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Open saved canvas
                </button>
              )}
              <button
                type="button"
                onClick={() => openCanvasWorkspace("template")}
                style={{
                  height: 44,
                  borderRadius: 13,
                  border: "1px solid rgba(251,191,36,0.22)",
                  background: "rgba(251,191,36,0.08)",
                  color: "#fde68a",
                  padding: "0 16px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Start with production template
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 24 }}>
              {[
                ["Clean start", "No default graph on entry"],
                ["Named workspace", "Your canvas title is saved"],
                ["Production ready", "Build nodes only when needed"],
              ].map(([title, body]) => (
                <div key={title} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.035)", padding: 13 }}>
                  <div style={{ color: "#f8fafc", fontSize: 12.5, fontWeight: 850 }}>{title}</div>
                  <div style={{ color: "rgba(148,163,184,0.72)", fontSize: 11.5, marginTop: 5, lineHeight: 1.35 }}>{body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CanvasContext.Provider>
    );
  }

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
          deleteKeyCode={["Backspace", "Delete"]}
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
          {showWorkflowBuilder && (
          <Panel position="top-left" style={{ marginTop: 14, marginLeft: 18 }}>
            <div
              style={{
                width: 360,
                borderRadius: 16,
                border: "1px solid rgba(103,232,249,0.16)",
                background: "rgba(7,12,24,0.86)",
                backdropFilter: "blur(18px)",
                boxShadow: "0 18px 60px rgba(0,0,0,0.48)",
                padding: 12,
              }}
            >
              <div style={{ color: "#67e8f9", fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>
                Dynamic Workflow Builder
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={briefInput}
                  onChange={e => setBriefInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") buildWorkflowFromBrief();
                  }}
                  placeholder="Luxury Jewelry Ad"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 38,
                    borderRadius: 11,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(3,7,18,0.72)",
                    color: "#e2e8f0",
                    outline: "none",
                    padding: "0 12px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={buildWorkflowFromBrief}
                  disabled={isRunning}
                  style={{
                    height: 38,
                    borderRadius: 11,
                    border: "1px solid rgba(34,211,238,0.28)",
                    background: "linear-gradient(135deg, rgba(8,145,178,0.95), rgba(79,70,229,0.9))",
                    color: "white",
                    padding: "0 13px",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: isRunning ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: isRunning ? 0.55 : 1,
                  }}
                >
                  {isRunning ? "Thinking" : "Build AI Graph"}
                </button>
              </div>
              <div style={{ marginTop: 8, color: "rgba(148,163,184,0.72)", fontSize: 11, lineHeight: 1.45 }}>
                Calls the AI Workflow Architect to generate the node graph, shot logic, camera language, motion system, routes, and final assembly for this specific intent.
              </div>
            </div>
          </Panel>
          )}
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
                {canvasName}
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

          <ToolBtn
            active={showWorkflowBuilder}
            title={showWorkflowBuilder ? "Hide workflow builder" : "Open workflow builder"}
            onClick={() => setShowWorkflowBuilder(v => !v)}
            accent="#38bdf8"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M2 7h6M2 10.5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M10.5 6.2l1.3.8-1.3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </ToolBtn>

          <ToolBtn
            active={showAssetsPanel}
            title={showAssetsPanel ? "Hide assets" : "Open assets"}
            onClick={() => setShowAssetsPanel(v => !v)}
            accent="#22d3ee"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="3" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M4 5.2h3M4 7h5.5M4 8.8h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M10.8 2.2v3M9.3 3.7h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </ToolBtn>

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

          <ToolBtn
            title={selectedSuperNode?.data.isExpanded ? "Collapse selected system" : "Open selected system"}
            onClick={() => selectedSuperNode && expandSuperNode(selectedSuperNode.id)}
            disabled={!selectedSuperNode}
            active={Boolean(selectedSuperNode?.data.isExpanded)}
            accent="#67e8f9"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="2" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8" y="2" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="5" y="8" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M6 4h2M7 6v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </ToolBtn>

          <ToolBtn title="Delete selected node (Delete)" onClick={deleteSelectedNode} disabled={!selectedNodeId} accent="#ef4444">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M2 4h10M5 4V2.5h4V4M6 7v3M8 7v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M3 4l.7 7.5h6.6L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
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

        {showAssetsPanel && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 109 }}
              onClick={() => setShowAssetsPanel(false)}
            />
            <div style={{ position: "absolute", left: 72, top: 118, zIndex: 170 }}>
              <ProductionAssetsPanel
                assets={assets}
                uploadingKind={uploadingAssetKind}
                onUpload={uploadAndRouteAsset}
                onClose={() => setShowAssetsPanel(false)}
              />
            </div>
          </>
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
