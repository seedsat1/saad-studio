"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Aperture,
  Edit3,
  Image as ImageIcon,
  Loader2,
  MousePointer2,
  Move,
  Play,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  Type as TypeIcon,
  Upload,
  Video as VideoIcon,
  Volume2,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/use-language";

export type CanvasNode = {
  id: string;
  type: "root" | "text" | "image" | "video" | "upscale";
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

type ConnectionKind = "text" | "image" | "video";

type CanvasConnection = {
  id: string;
  sourceId: string;
  targetId: string;
  kind: ConnectionKind;
};

type ConnectingState = {
  sourceId: string;
  kind: ConnectionKind;
  x: number;
  y: number;
};
type ConnectionToolType = "image" | "video" | "upscale";

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

const DEFAULT_NODE_WIDTH = 380;
const ROOT_NODE_WIDTH = 230;
const TEXT_NODE_HEIGHT = 176;
const DEFAULT_NODE_HEIGHT = 330;
const ROOT_NODE_HEIGHT = 260;
const ROOT_X = 120;
const IMAGE_X = 560;
const VIDEO_X = 1040;
const BOARD_TOP = 130;
const ROW_GAP = 420;
const IMAGE_COLUMN_GAP = 430;

function getNodeOutputKind(node: CanvasNode): ConnectionKind {
  if (node.type === "text") return "text";
  if (node.type === "video") return "video";
  return "image";
}

function getAcceptedInputKinds(node: CanvasNode): ConnectionKind[] {
  if (node.type === "image") return ["image", "text"];
  if (node.type === "video") return ["image", "text"];
  if (node.type === "upscale") return ["image"];
  return [];
}

function canConnectNodes(source: CanvasNode, target: CanvasNode) {
  if (source.id === target.id) return false;
  return getAcceptedInputKinds(target).includes(getNodeOutputKind(source));
}

function getNodeWidth(node: CanvasNode) {
  return node.type === "root" ? ROOT_NODE_WIDTH : DEFAULT_NODE_WIDTH;
}

function getNodeBodyHeight(node: CanvasNode) {
  if (node.type === "text") return TEXT_NODE_HEIGHT;
  if (node.type === "root") return ROOT_NODE_HEIGHT;
  return DEFAULT_NODE_HEIGHT;
}

function getNodeCenterY(node: CanvasNode) {
  return 40 + getNodeBodyHeight(node) / 2;
}

function getImageNodePosition(index: number, count: number) {
  const rows = Math.ceil(count / 2);
  const column = index < rows ? 0 : 1;
  const row = index % rows;
  return {
    x: IMAGE_X + column * IMAGE_COLUMN_GAP,
    y: BOARD_TOP + row * ROW_GAP,
  };
}

function getRootNodeY(imageCount: number) {
  const rows = Math.max(1, Math.ceil(imageCount / 2));
  return BOARD_TOP + ((rows - 1) * ROW_GAP) / 2;
}

function collectDescendantIds(nodes: CanvasNode[], parentId: string) {
  const ids = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.parentId && (node.parentId === parentId || ids.has(node.parentId)) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    }
  }
  return ids;
}

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
  const [connections, setConnections] = useState<CanvasConnection[]>(() =>
    (initialNodes || [])
      .filter((node) => node.parentId)
      .map((node) => {
        const source = (initialNodes || []).find((item) => item.id === node.parentId);
        return {
          id: `conn-${node.parentId}-${node.id}`,
          sourceId: node.parentId || "",
          targetId: node.id,
          kind: source ? getNodeOutputKind(source) : "image",
        };
      }),
  );
  const [activeNodeId, setActiveNodeId] = useState<string | null>(initialNodes?.[0]?.id || null);
  const [selectedHandle, setSelectedHandle] = useState(initialHandle);
  const [selectedImageModel, setSelectedImageModel] = useState("Nano Banana Pro");
  const [selectedVideoModel, setSelectedVideoModel] = useState("Kling 3.0 Pro");
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("image");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [batchCount, setBatchCount] = useState(8);
  const [batchPrompt, setBatchPrompt] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [canvasError, setCanvasError] = useState("");
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<ConnectingState | null>(null);

  useEffect(() => {
    const clearPointerState = () => {
      setDraggingNodeId(null);
      setConnectingFrom(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearPointerState();
    };
    window.addEventListener("mouseup", clearPointerState);
    window.addEventListener("blur", clearPointerState);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mouseup", clearPointerState);
      window.removeEventListener("blur", clearPointerState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const activeNode = nodes.find((node) => node.id === activeNodeId) || null;
  const sourceNode = nodes.find((node) => node.type === "root") || null;

  const getPointerPosition = (event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return {
      x: rect ? event.clientX - rect.left : event.clientX,
      y: rect ? event.clientY - rect.top : event.clientY,
    };
  };

  const upsertConnection = (source: CanvasNode, target: CanvasNode) => {
    const kind = getNodeOutputKind(source);
    if (!canConnectNodes(source, target)) {
      setCanvasError(isArabic ? "هذا الربط غير مناسب لنوع الأداة." : "This connection does not match the target tool input.");
      return;
    }
    setConnections((prev) =>
      prev
        .filter((connection) => !(connection.targetId === target.id && connection.kind === kind))
        .concat({
          id: `conn-${source.id}-${target.id}-${kind}-${Date.now()}`,
          sourceId: source.id,
          targetId: target.id,
          kind,
        }),
    );
    const sourceImageUrl = kind === "image" ? source.publicImageUrl || source.imageUrl : "";
    updateNode(target.id, {
      parentId: source.id,
      influencerHandle: target.influencerHandle || source.influencerHandle || selectedHandle,
      imageUrl: sourceImageUrl || target.imageUrl,
      publicImageUrl: sourceImageUrl || target.publicImageUrl,
    });
    setActiveNodeId(target.id);
    setCanvasError("");
  };

  const getParentNode = (node?: CanvasNode | null) => {
    if (!node?.parentId) return null;
    return nodes.find((item) => item.id === node.parentId) || null;
  };

  const getIncomingNodes = (node?: CanvasNode | null, kind?: ConnectionKind) => {
    if (!node) return [];
    return connections
      .filter((connection) => connection.targetId === node.id && (!kind || connection.kind === kind))
      .map((connection) => nodes.find((item) => item.id === connection.sourceId))
      .filter((item): item is CanvasNode => Boolean(item));
  };

  const getUpstreamTextPrompt = (node?: CanvasNode | null) => {
    const directText = getIncomingNodes(node, "text").find((item) => item.prompt?.trim());
    if (directText?.prompt?.trim()) return directText.prompt.trim();
    let current = getParentNode(node);
    while (current) {
      if (current.type === "text" && current.prompt?.trim()) return current.prompt.trim();
      current = getParentNode(current);
    }
    return "";
  };

  const getEffectivePrompt = (node: CanvasNode, fallback: string, preferredPrompt = "") => {
    return preferredPrompt.trim() || node.prompt?.trim() || getUpstreamTextPrompt(node) || batchPrompt.trim() || fallback;
  };

  const getInputImageUrl = (node?: CanvasNode | null) => {
    if (!node) return "";
    const connectedImageUrl = getIncomingNodes(node, "image")
      .map((source) => source.publicImageUrl || source.imageUrl)
      .find(Boolean);
    if ((node.type === "video" || node.type === "upscale") && connectedImageUrl) return connectedImageUrl;
    if (node.publicImageUrl || node.imageUrl) return node.publicImageUrl || node.imageUrl || "";
    if (connectedImageUrl) return connectedImageUrl;
    let current = getParentNode(node);
    while (current) {
      const url = current.publicImageUrl || current.imageUrl;
      if (url) return url;
      current = getParentNode(current);
    }
    return sourceNode?.publicImageUrl || sourceNode?.imageUrl || "";
  };

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
      x: ROOT_X,
      y: getRootNodeY(batchCount),
      title: copy.referenceNode,
      imageUrl,
      influencerHandle: selectedHandle,
      status,
    };
    setCanvasError("");
    setNodes([newNode]);
    setConnections([]);
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
      const idsToDelete = collectDescendantIds(prev, nodeId);
      idsToDelete.add(nodeId);
      setConnections((existing) => existing.filter((connection) => !idsToDelete.has(connection.sourceId) && !idsToDelete.has(connection.targetId)));
      const next = prev.filter((node) => !idsToDelete.has(node.id));
      if (!next.some((node) => node.id === activeNodeId)) setActiveNodeId(next[0]?.id || null);
      return next;
    });
  };

  const handleAutoArrange = () => {
    setNodes((prev) => {
      const root = prev.find((node) => node.type === "root");
      const imageNodes = prev.filter((node) => node.type === "image");
      const imagePositions = new Map<string, { x: number; y: number }>();
      imageNodes.forEach((node, index) => imagePositions.set(node.id, getImageNodePosition(index, imageNodes.length || 1)));

      return prev.map((node) => {
        if (node.type === "root") {
          return { ...node, x: ROOT_X, y: getRootNodeY(imageNodes.length || batchCount) };
        }
        if (node.type === "image") {
          const position = imagePositions.get(node.id);
          return position ? { ...node, ...position, parentId: node.parentId || root?.id } : node;
        }
        if (node.type === "video" && node.parentId) {
          const imagePosition = imagePositions.get(node.parentId);
          if (imagePosition) return { ...node, x: VIDEO_X, y: imagePosition.y };
        }
        return node;
      });
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
  };

  const handleStartConnection = (event: React.MouseEvent, sourceNode: CanvasNode) => {
    event.preventDefault();
    event.stopPropagation();
    const point = getPointerPosition(event);
    setConnectingFrom({
      sourceId: sourceNode.id,
      kind: getNodeOutputKind(sourceNode),
      x: point.x,
      y: point.y,
    });
    setActiveNodeId(sourceNode.id);
  };

  const handleCompleteConnection = (event: React.MouseEvent, targetNode: CanvasNode) => {
    event.preventDefault();
    event.stopPropagation();
    if (!connectingFrom) return;
    const source = nodes.find((node) => node.id === connectingFrom.sourceId);
    if (source) upsertConnection(source, targetNode);
    setConnectingFrom(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (connectingFrom && containerRef.current) {
      const point = getPointerPosition(event);
      setConnectingFrom((prev) => (prev ? { ...prev, x: point.x, y: point.y } : prev));
    }
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
    const sourceImageCount = nodes.filter((node) => node.type === "image" && node.parentId === (sourceNode?.id || parent.id)).length;
    const position = parent.type === "root" ? getImageNodePosition(sourceImageCount, Math.max(sourceImageCount + 1, batchCount)) : { x: parent.x + IMAGE_COLUMN_GAP, y: parent.y };
    const newNode: CanvasNode = {
      id,
      type: "image",
      parentId: parent.id,
      x: position.x,
      y: position.y,
      title: copy.imageNode,
      influencerHandle: parent.influencerHandle || selectedHandle,
      aspectRatio,
      status: "idle",
    };
    setCanvasError("");
    setNodes((prev) =>
      prev
        .map((node) => (node.type === "root" ? { ...node, x: ROOT_X, y: getRootNodeY(Math.max(sourceImageCount + 1, batchCount)) } : node))
        .concat(newNode),
    );
    setConnections((prev) =>
      prev.concat({
        id: `conn-${parent.id}-${id}-${Date.now()}`,
        sourceId: parent.id,
        targetId: id,
        kind: getNodeOutputKind(parent),
      }),
    );
    setActiveNodeId(id);
  };

  const handleAddCanvasTool = (type: "text" | "video" | "upscale") => {
    const parent = activeNode || sourceNode;
    const id = `${type}-${Date.now()}`;
    const toolCount = nodes.filter((node) => node.type === type).length + 1;
    const x = type === "video" ? VIDEO_X : type === "upscale" ? VIDEO_X : IMAGE_X;
    const y = BOARD_TOP + Math.max(0, nodes.filter((node) => node.type !== "root").length) * 36;
    const title =
      type === "text"
        ? `Text #${toolCount}`
        : type === "video"
          ? `Video Generator #${toolCount}`
          : `Image Upscaler #${toolCount}`;
    const parentImageUrl = type !== "text" ? getInputImageUrl(parent) : "";
    const newNode: CanvasNode = {
      id,
      type,
      parentId: parent?.id,
      x,
      y,
      title,
      imageUrl: parentImageUrl || undefined,
      publicImageUrl: parentImageUrl || undefined,
      prompt: type === "text" ? "" : type === "video" ? videoPrompt : "enhance and upscale image to maximum quality",
      influencerHandle: parent?.influencerHandle || selectedHandle,
      aspectRatio,
      status: "idle",
    };
    setCanvasError("");
    setNodes((prev) => [...prev, newNode]);
    if (parent) {
      setConnections((prev) =>
        prev.concat({
          id: `conn-${parent.id}-${id}-${Date.now()}`,
          sourceId: parent.id,
          targetId: id,
          kind: getNodeOutputKind(parent),
        }),
      );
    }
    setActiveNodeId(id);
  };

  const handleCreateToolFromConnection = (event: React.MouseEvent, type: ConnectionToolType) => {
    event.preventDefault();
    event.stopPropagation();
    if (!connectingFrom) return;

    const source = nodes.find((node) => node.id === connectingFrom.sourceId);
    if (!source) {
      setConnectingFrom(null);
      return;
    }

    const id = `${type}-${Date.now()}`;
    const toolCount = nodes.filter((node) => node.type === type).length + 1;
    const x = Math.max(source.x + getNodeWidth(source) + 170, connectingFrom.x + 72);
    const y = Math.max(BOARD_TOP, connectingFrom.y - getNodeCenterY({ ...source, type } as CanvasNode));
    const parentImageUrl = type === "image" ? "" : getInputImageUrl(source);
    const title =
      type === "image"
        ? `${copy.imageNode} ${toolCount}`
        : type === "video"
          ? `Video Generator #${toolCount}`
          : `Image Upscaler #${toolCount}`;

    const newNode: CanvasNode = {
      id,
      type,
      parentId: source.id,
      x,
      y,
      title,
      imageUrl: parentImageUrl || undefined,
      publicImageUrl: parentImageUrl || undefined,
      prompt:
        type === "video"
          ? videoPrompt
          : type === "upscale"
            ? "enhance and upscale image to maximum quality"
            : batchPrompt || `${selectedHandle} realistic lifestyle image`,
      influencerHandle: source.influencerHandle || selectedHandle,
      aspectRatio,
      status: "idle",
    };

    setCanvasError("");
    setNodes((prev) => [...prev, newNode]);
    setConnections((prev) =>
      prev
        .filter((connection) => !(connection.targetId === id && connection.kind === getNodeOutputKind(source)))
        .concat({
          id: `conn-${source.id}-${id}-${Date.now()}`,
          sourceId: source.id,
          targetId: id,
          kind: getNodeOutputKind(source),
        }),
    );
    setActiveNodeId(id);
    setConnectingFrom(null);
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
    const referenceUrl = getInputImageUrl(node) || sourceNode?.publicImageUrl;

    const prompt = promptOverride?.trim() || getEffectivePrompt(node, `${selectedHandle} realistic lifestyle photo`, batchPrompt);
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
    const createdAt = Date.now();
    const createdNodes: CanvasNode[] = Array.from({ length: count }).map((_, index) => {
      const position = getImageNodePosition(index, count);
      return {
        id: `set-${createdAt}-${index}`,
        type: "image",
        parentId: root.id,
        x: position.x,
        y: position.y,
        title: `${copy.imageNode} ${index + 1}`,
        prompt: `${selectedHandle} ${basePrompt}, ${IMAGE_VARIANTS[index]}`,
        influencerHandle: selectedHandle,
        aspectRatio,
        status: "generating",
      };
    });

    setBatchGenerating(true);
    setNodes((prev) => {
      const descendantIds = collectDescendantIds(prev, root.id);
      setConnections((existing) =>
        existing
          .filter((connection) => !descendantIds.has(connection.sourceId) && !descendantIds.has(connection.targetId))
          .concat(
            createdNodes.map((node) => ({
              id: `conn-${root.id}-${node.id}`,
              sourceId: root.id,
              targetId: node.id,
              kind: "image" as ConnectionKind,
            })),
          ),
      );
      return prev
        .filter((node) => !descendantIds.has(node.id))
        .map((node) => (node.id === root.id ? { ...node, x: ROOT_X, y: getRootNodeY(count) } : node))
        .concat(createdNodes);
    });
    setActiveNodeId(createdNodes[0]?.id || root.id);

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
    const imageUrl = getInputImageUrl(imageNode);
    if (!imageUrl) return;

    const id = `video-${Date.now()}`;
    const prompt = getEffectivePrompt(imageNode, `${imageNode.influencerHandle || selectedHandle} looking at camera, gentle motion, cinematic lighting`, videoPrompt);
    const newNode: CanvasNode = {
      id,
      type: "video",
      parentId: imageNode.id,
      x: VIDEO_X,
      y: imageNode.y,
      title: copy.videoNode,
      imageUrl,
      publicImageUrl: imageUrl,
      prompt,
      influencerHandle: imageNode.influencerHandle,
      status: "generating",
    };

    setNodes((prev) => prev.filter((node) => !(node.type === "video" && node.parentId === imageNode.id)).concat(newNode));
    setConnections((prev) =>
      prev
        .filter((connection) => !(connection.targetId.startsWith("video-") && connection.sourceId === imageNode.id))
        .concat({
          id: `conn-${imageNode.id}-${id}`,
          sourceId: imageNode.id,
          targetId: id,
          kind: "image",
        }),
    );
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

  const handleGenerateExistingVideoNode = async (videoNode: CanvasNode) => {
    const imageUrl = getInputImageUrl(videoNode);
    if (!imageUrl) {
      setCanvasError(isArabic ? "Ø§Ø±Ø¨Ø· Ø¹Ù‚Ø¯Ø© Ø§Ù„ÙÙŠØ¯ÙŠÙˆ Ø¨ØµÙˆØ±Ø© Ø£ÙˆÙ„Ø§Ù‹." : "Connect the video node to an image first.");
      return;
    }
    const prompt = getEffectivePrompt(videoNode, `${videoNode.influencerHandle || selectedHandle} looking at camera, gentle motion, cinematic lighting`, videoPrompt);
    updateNode(videoNode.id, { status: "generating", prompt });

    try {
      let videoUrl = "";
      if (onGenerateVideoNode) {
        videoUrl = await onGenerateVideoNode(videoNode.id, prompt, selectedVideoModel);
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
      updateNode(videoNode.id, { status: "ready", videoUrl });
      setCanvasError("");
    } catch {
      updateNode(videoNode.id, { status: "failed" });
    }
  };

  const handleGenerateUpscaleNode = async (upscaleNode: CanvasNode) => {
    const imageUrl = getInputImageUrl(upscaleNode);
    if (!imageUrl) {
      setCanvasError(isArabic ? "Ø§Ø±Ø¨Ø· Ø§Ù„Ù€ Upscaler Ø¨ØµÙˆØ±Ø© Ø£ÙˆÙ„Ø§Ù‹." : "Connect the upscaler to an image first.");
      return;
    }

    updateNode(upscaleNode.id, { status: "generating", imageUrl, publicImageUrl: imageUrl });
    try {
      const response = await fetch("/api/generate/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, scale: 2, resolution: "720" }),
      });
      const data = await response.json().catch(() => null);
      const outputUrl = data?.mediaUrl || data?.imageUrl || data?.url;
      if (!response.ok || !outputUrl) throw new Error(data?.error || "Upscale failed");
      updateNode(upscaleNode.id, { status: "ready", imageUrl: outputUrl, publicImageUrl: outputUrl });
      setCanvasError("");
    } catch {
      updateNode(upscaleNode.id, { status: "failed" });
    }
  };

  const handlePromptGenerate = async () => {
    if (workflowMode === "video") {
      if (activeNode?.type === "image" && activeNode.imageUrl) {
        await handleCreateVideoFromImage(activeNode);
      } else if (activeNode?.type === "video" && getInputImageUrl(activeNode)) {
        await handleGenerateExistingVideoNode(activeNode);
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

  const getConnectionToolOptions = (kind: ConnectionKind) => {
    const imageGenerator = {
      type: "image" as ConnectionToolType,
      label: isArabic ? "مولد صور" : "Image Generator",
      description: isArabic ? "يستعمل هذا المصدر كمرجع للصور" : "Use this output as the image reference",
      icon: ImageIcon,
    };
    const videoGenerator = {
      type: "video" as ConnectionToolType,
      label: isArabic ? "مولد فيديو" : "Video Generator",
      description: isArabic ? "حوّل الصورة أو البرومبت إلى فيديو" : "Turn image or prompt into video",
      icon: VideoIcon,
    };
    const imageUpscaler = {
      type: "upscale" as ConnectionToolType,
      label: isArabic ? "رفع الدقة" : "Image Upscaler",
      description: isArabic ? "استلم الصورة وارفع وضوحها" : "Enhance the connected image",
      icon: Aperture,
    };

    if (kind === "image") return [imageGenerator, videoGenerator, imageUpscaler];
    if (kind === "text") return [imageGenerator, videoGenerator];
    return [];
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-[760px] h-[calc(100vh-4rem)] overflow-hidden bg-[#07080f] select-none"
      id="tour-canvas-board"
      onMouseMove={handleMouseMove}
      onMouseUp={() => {
        setDraggingNodeId(null);
        setConnectingFrom(null);
      }}
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
          title={isArabic ? "Arrange workflow" : "Arrange workflow"}
          onClick={handleAutoArrange}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <Move size={15} />
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
          title="Text node"
          onClick={() => handleAddCanvasTool("text")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <TypeIcon size={15} />
        </button>
        <button
          type="button"
          title="Video generator"
          onClick={() => handleAddCanvasTool("video")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <VideoIcon size={15} />
        </button>
        <button
          type="button"
          title="Image upscaler"
          onClick={() => handleAddCanvasTool("upscale")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <Aperture size={15} />
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

      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {connections.map((connection) => {
          const source = nodes.find((item) => item.id === connection.sourceId);
          const target = nodes.find((item) => item.id === connection.targetId);
          if (!source || !target) return null;
          const startX = source.x + getNodeWidth(source);
          const startY = source.y + getNodeCenterY(source);
          const endX = target.x;
          const endY = target.y + getNodeCenterY(target);
          return (
            <path
              key={connection.id}
              d={`M ${startX} ${startY} C ${startX + 120} ${startY}, ${endX - 120} ${endY}, ${endX} ${endY}`}
              fill="none"
              stroke="url(#line-gradient)"
              strokeWidth="2"
              strokeDasharray="5,6"
            />
          );
        })}
        {connectingFrom &&
          (() => {
            const source = nodes.find((item) => item.id === connectingFrom.sourceId);
            if (!source) return null;
            const startX = source.x + getNodeWidth(source);
            const startY = source.y + getNodeCenterY(source);
            return (
              <path
                d={`M ${startX} ${startY} C ${startX + 120} ${startY}, ${connectingFrom.x - 120} ${connectingFrom.y}, ${connectingFrom.x} ${connectingFrom.y}`}
                fill="none"
                stroke="url(#line-gradient)"
                strokeWidth="2.5"
              />
            );
          })()}
        <defs>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>

      {connectingFrom &&
        (() => {
          const options = getConnectionToolOptions(connectingFrom.kind);
          const left = Math.min(Math.max(connectingFrom.x + 22, 70), 1220);
          const top = Math.max(connectingFrom.y - 82, 78);
          if (options.length === 0) return null;
          return (
            <div
              className="absolute z-30 w-72 rounded-2xl border border-pink-500/40 bg-[#101119]/95 p-2 shadow-2xl shadow-pink-950/30 backdrop-blur-xl"
              style={{ left: `${left}px`, top: `${top}px` }}
              onMouseDown={(event) => event.stopPropagation()}
              onMouseUp={(event) => event.stopPropagation()}
            >
              <div className="px-2 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-pink-300">
                {isArabic ? "اربط الخرج مع أداة" : "Connect output to a tool"}
              </div>
              <div className="space-y-1">
                {options.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.type}
                      type="button"
                      onMouseDown={(event) => handleCreateToolFromConnection(event, option.type)}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left hover:border-pink-400/60 hover:bg-pink-500/10"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-500/15 text-pink-200">
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-extrabold text-white">{option.label}</span>
                        <span className="block truncate text-xs text-zinc-400">{option.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

      <div className="relative z-10 w-full h-full p-8 pt-20 overflow-auto">
        {nodes.length > 0 && (
          <div className="pointer-events-none absolute left-0 top-6 min-w-[1530px] text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
            <div className="absolute" style={{ left: `${ROOT_X}px` }}>
              {copy.referenceNode}
            </div>
            <div className="absolute" style={{ left: `${IMAGE_X}px` }}>
              {copy.imageNode}
            </div>
            <div className="absolute" style={{ left: `${VIDEO_X}px` }}>
              {copy.videoNode}
            </div>
          </div>
        )}

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
          const isText = node.type === "text";
          const isUpscale = node.type === "upscale";
          const isActive = activeNodeId === node.id;
          const inputImageUrl = getInputImageUrl(node);
          const outputKind = getNodeOutputKind(node);
          const acceptedInputKinds = getAcceptedInputKinds(node);
          const canAcceptConnection = Boolean(connectingFrom && acceptedInputKinds.includes(connectingFrom.kind) && connectingFrom.sourceId !== node.id);
          const nodeWidth = getNodeWidth(node);
          const nodeBodyHeight = getNodeBodyHeight(node);
          const isFirstImageNode = isImage && nodes.find((item) => item.type === "image")?.id === node.id;
          const nodeKindLabel = isText
            ? node.title
            : isVideo
              ? node.title || "Video Generator"
              : isUpscale
                ? node.title || "Image Upscaler"
                : isRoot
                  ? node.title
                  : node.title || "Image Generator";
          const NodeIcon = isText ? TypeIcon : isVideo ? VideoIcon : isUpscale ? Aperture : ImageIcon;

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
              style={{ left: `${node.x}px`, top: `${node.y}px`, width: `${nodeWidth}px` }}
              onMouseDown={(event) => handleMouseDownNode(event, node.id)}
              className={cn(
                "absolute bg-[#171717]/95 border shadow-2xl backdrop-blur-md transition-shadow duration-200 group cursor-grab active:cursor-grabbing",
                isText ? "rounded-2xl" : isRoot ? "rounded-2xl" : "rounded-[18px]",
                isActive ? "border-blue-500 ring-2 ring-blue-500/30" : "border-white/10 hover:border-blue-500/70",
              )}
            >
              {acceptedInputKinds.length > 0 && (
                <button
                  type="button"
                  className={cn(
                    "absolute -left-5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border shadow-lg transition",
                    canAcceptConnection
                      ? "border-pink-400 bg-pink-500 text-white ring-4 ring-pink-500/20"
                      : "border-white/10 bg-[#262626] text-zinc-300 hover:bg-[#303030]",
                  )}
                  onMouseUp={(event) => handleCompleteConnection(event, node)}
                  onMouseDown={(event) => event.stopPropagation()}
                  aria-label="Input connector"
                >
                  {acceptedInputKinds.includes("image") ? <ImageIcon size={14} /> : <TypeIcon size={14} />}
                </button>
              )}
              <button
                type="button"
                className="absolute -right-5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#262626] text-zinc-300 shadow-lg hover:bg-[#303030]"
                onMouseDown={(event) => handleStartConnection(event, node)}
                aria-label="Output connector"
                title={`${outputKind} output`}
              >
                {outputKind === "text" ? <TypeIcon size={14} /> : outputKind === "video" ? <VideoIcon size={14} /> : <ImageIcon size={14} />}
              </button>

              <div className="absolute -top-7 left-3 flex items-center gap-2 text-xs font-extrabold text-white">
                <NodeIcon size={13} className="text-zinc-300" />
                <span>{nodeKindLabel}</span>
              </div>

              <div className="px-3.5 py-2 bg-white/[0.03] border-b border-white/5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Move size={12} className="text-zinc-500 shrink-0" />
                  <span className="text-[10px] font-extrabold text-pink-400 uppercase tracking-wider">
                    {isText ? "Text" : isVideo ? copy.videoNode : isUpscale ? "Upscale" : isRoot ? copy.referenceNode : copy.imageNode}
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

              <div className="relative bg-[#1b1b1b] flex items-center justify-center overflow-hidden" style={{ height: `${nodeBodyHeight}px` }}>
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
                {isText ? (
                  <textarea
                    value={node.prompt || ""}
                    onChange={(event) => updateNode(node.id, { prompt: event.target.value })}
                    placeholder={isArabic ? "Ø§ÙƒØªØ¨ ÙˆØµÙ Ø§Ù„Ù…Ø´Ù‡Ø¯ Ø£Ùˆ Ø¨Ø±ÙˆÙ…Ø¨Øª Ø§Ù„Ø¹Ù‚Ø¯Ø©..." : "Try \"Happy dog with sunglasses and floating ring\""}
                    className="h-full w-full resize-none bg-transparent p-4 text-sm text-white outline-none placeholder:text-zinc-600"
                    onMouseDown={(event) => event.stopPropagation()}
                  />
                ) : isVideo && node.videoUrl ? (
                  <video src={node.videoUrl} controls className="w-full h-full object-cover" />
                ) : node.imageUrl ? (
                  <img src={node.imageUrl} alt="" className="w-full h-full object-cover opacity-90" />
                ) : (isVideo || isUpscale) && inputImageUrl ? (
                  <img src={inputImageUrl} alt="" className="w-full h-full object-cover opacity-45 grayscale" />
                ) : (
                  <div className="text-center p-4 space-y-2">
                    {isVideo ? (
                      <VideoIcon size={34} className="mx-auto text-zinc-600" />
                    ) : isUpscale ? (
                      <Aperture size={34} className="mx-auto text-zinc-600" />
                    ) : (
                      <ImageIcon size={34} className="mx-auto text-zinc-600" />
                    )}
                    <span className="text-xs font-bold text-zinc-500 block">
                      {isRoot ? copy.uploadSource : isVideo ? "Describe the video you want to generate..." : isUpscale ? "Drop an image here to upscale..." : "Describe the image you want to generate..."}
                    </span>
                  </div>
                )}

                {node.influencerHandle && (
                  <div className="absolute left-3 top-3 px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md text-white font-extrabold text-xs border border-white/10 dir-ltr">
                    {node.influencerHandle}
                  </div>
                )}

                {isRoot && (
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        replaceInputRef.current?.click();
                      }}
                      className="flex h-8 flex-1 items-center justify-center rounded-lg border border-white/10 bg-black/70 text-zinc-200 hover:bg-black/85"
                      title={copy.replaceSource}
                      aria-label={copy.replaceSource}
                    >
                      <Upload size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        updateNode(node.id, { imageUrl: undefined, publicImageUrl: undefined, status: "idle" });
                      }}
                      disabled={!node.imageUrl}
                      className="flex h-8 flex-1 items-center justify-center rounded-lg border border-white/10 bg-black/70 text-zinc-200 hover:bg-black/85 disabled:opacity-40"
                      title={copy.removeSource}
                      aria-label={copy.removeSource}
                    >
                      <Trash2 size={13} />
                    </button>
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

                {!isText && !isRoot && (
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2">
                    {isImage && (
                      <>
                        <div className="flex h-7 items-center rounded-full bg-black/55 text-xs font-bold text-zinc-300">
                          <button type="button" className="px-2 text-zinc-500" onClick={(event) => event.stopPropagation()}>
                            -
                          </button>
                          <span className="px-1">x{batchCount}</span>
                          <button type="button" className="px-2" onClick={(event) => event.stopPropagation()}>
                            +
                          </button>
                        </div>
                        <span className="h-7 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-zinc-300">{aspectRatio}</span>
                        <span className="h-7 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-zinc-300">Auto</span>
                      </>
                    )}
                    {isVideo && (
                      <>
                        <span className="h-7 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-zinc-300">x1</span>
                        <span className="h-7 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-zinc-300">{aspectRatio === "9:16" ? "9:16" : "16:9"}</span>
                        <span className="h-7 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-zinc-300">5-6s</span>
                        <span className="flex h-7 items-center gap-1 rounded-full bg-black/55 px-3 text-xs font-bold text-zinc-300">
                          <Volume2 size={12} />
                          Sound
                        </span>
                      </>
                    )}
                    {isUpscale && (
                      <>
                        <span className="h-7 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-zinc-300">x1</span>
                        <span className="h-7 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-zinc-300">Precision</span>
                        <span className="h-7 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-zinc-300">2x</span>
                        <span className="h-7 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-zinc-300">Balanced</span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={(event) => event.stopPropagation()}
                      className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-zinc-400 hover:text-white"
                      aria-label="Node settings"
                    >
                      <Settings size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isRoot) sourceInputRef.current?.click();
                        else if (isImage) handleGenerateNodeImage(node.id);
                        else if (isVideo) handleGenerateExistingVideoNode(node);
                        else if (isUpscale) handleGenerateUpscaleNode(node);
                      }}
                      disabled={((isVideo || isUpscale) && !inputImageUrl) || node.status === "generating"}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-black hover:bg-white disabled:opacity-40"
                      aria-label={copy.generate}
                    >
                      {node.status === "generating" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    </button>
                  </div>
                )}
              </div>

              {isActive && !isRoot && (
                <div className="p-3 bg-[#0a0b12] border-t border-white/10 space-y-3 animate-in fade-in duration-200">
                  {isRoot && (
                    <div className="grid grid-cols-1 gap-2">
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
                        onClick={() => handleDeleteNode(node.id)}
                        className="w-full px-3 py-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-red-500/15"
                      >
                        <Trash2 size={12} />
                        {copy.deleteWork}
                      </button>
                    </div>
                  )}

                  {isImage && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateNodeImage(node.id)}
                        disabled={node.status === "generating"}
                        className="px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md hover:opacity-90 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Wand2 size={12} />
                        {copy.generate}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreateVideoFromImage(node)}
                        disabled={!getInputImageUrl(node) || node.status === "generating"}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-purple-200 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        <Play size={12} />
                        {copy.toVideo}
                      </button>
                    </div>
                  )}

                  {isVideo && (
                    <button
                      type="button"
                      onClick={() => handleGenerateExistingVideoNode(node)}
                      disabled={!getInputImageUrl(node) || node.status === "generating"}
                      className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md hover:opacity-90 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {node.status === "generating" ? <Loader2 size={14} className="animate-spin" /> : <VideoIcon size={14} />}
                      {copy.toVideo}
                    </button>
                  )}

                  {isUpscale && (
                    <button
                      type="button"
                      onClick={() => handleGenerateUpscaleNode(node)}
                      disabled={!getInputImageUrl(node) || node.status === "generating"}
                      className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md hover:opacity-90 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {node.status === "generating" ? <Loader2 size={14} className="animate-spin" /> : <Aperture size={14} />}
                      {isArabic ? "رفع الدقة" : "Upscale image"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-30 mx-auto max-w-5xl rounded-2xl border border-white/10 bg-[#0d0f19]/95 p-3 shadow-2xl backdrop-blur-xl">
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

          <div className="grid grid-cols-2 gap-2 md:grid-cols-[120px_90px_90px_160px_1fr]">
            <select
              value={selectedHandle}
              onChange={(event) => setSelectedHandle(event.target.value)}
              className="h-9 rounded-xl border border-white/10 bg-black/60 px-3 text-xs font-mono text-pink-300 outline-none dir-ltr"
              aria-label={copy.activeTalent}
            >
              {Array.from(new Set([selectedHandle, ...influencerHandles])).map((handle) => (
                <option key={handle} value={handle} className="bg-[#0d0f19] text-pink-300">
                  {handle}
                </option>
              ))}
            </select>
            <select
              value={batchCount}
              onChange={(event) => setBatchCount(Number(event.target.value))}
              className="h-9 rounded-xl border border-white/10 bg-black/60 px-3 text-xs text-white outline-none"
              aria-label={copy.imageCount}
            >
              {[4, 6, 8, 10, 12].map((count) => (
                <option key={count} value={count} className="bg-[#0d0f19]">
                  {count}
                </option>
              ))}
            </select>
            <select
              value={aspectRatio}
              onChange={(event) => setAspectRatio(event.target.value)}
              className="h-9 rounded-xl border border-white/10 bg-black/60 px-3 text-xs text-white outline-none"
              aria-label={copy.aspect}
            >
              {["9:16", "1:1", "16:9", "3:4"].map((ratio) => (
                <option key={ratio} value={ratio} className="bg-[#0d0f19]">
                  {ratio}
                </option>
              ))}
            </select>
            <select
              value={selectedImageModel}
              onChange={(event) => setSelectedImageModel(event.target.value)}
              className="h-9 rounded-xl border border-white/10 bg-black/60 px-3 text-xs text-purple-200 outline-none"
              aria-label={copy.imageModel}
            >
              {["Nano Banana Pro", "Seedream 5.0 Pro", "Flux 2 Pro", "GPT Image 2"].map((model) => (
                <option key={model} value={model} className="bg-[#0d0f19]">
                  {model}
                </option>
              ))}
            </select>
            <div className="hidden items-center justify-end gap-3 text-[11px] text-zinc-500 md:flex">
              <span>
                {nodes.length} {copy.nodes}
              </span>
              {canvasError && <span className="font-bold text-pink-300">{canvasError}</span>}
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
