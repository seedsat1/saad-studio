"use client";

import Link from "next/link";
import NextImage from "next/image";
import {
  ArrowLeft,
  ArrowUpRight,
  Brush,
  Check,
  ChevronDown,
  Download,
  Eraser,
  ImagePlus,
  Info,
  Loader2,
  Minus,
  Move,
  Pencil,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  Sparkles,
  Square,
  Trash2,
  Type,
  Undo2,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { getVideoCreditsByRoute } from "@/lib/credit-pricing";
import { getImageCreditCost, IMAGE_MODELS } from "@/lib/image-models";

type StudioMode = "sketch-video" | "draw-video" | "draw-edit";
type DrawTool = "brush" | "eraser" | "rectangle" | "arrow" | "text";
type EditAction = "animate" | "add" | "remove" | "replace";
type AspectRatio = "auto" | "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

type StudioModel = {
  id: string;
  name: string;
  family: string;
  description: string;
  color: string;
  badge?: string;
  durations: number[];
  resolutions: string[];
  aspects: AspectRatio[];
  audio?: boolean;
};

type EditModel = {
  id: "google/nano-banana-edit" | "nano-banana-pro";
  name: string;
  description: string;
  imageInputField: "image_urls" | "image_input";
  quality: "1K" | "2K";
};

const EDIT_MODELS: EditModel[] = [
  {
    id: "google/nano-banana-edit",
    name: "Nano Banana",
    description: "Google's advanced image editing model",
    imageInputField: "image_urls",
    quality: "1K",
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    description: "Best 4K image model ever",
    imageInputField: "image_input",
    quality: "2K",
  },
];

const VIDEO_MODELS: StudioModel[] = [
  {
    id: "google/gemini-omni-video",
    name: "Google Veo 3.1",
    family: "Google",
    description: "High-quality cinematic video generation",
    color: "#4285f4",
    badge: "TOP",
    durations: [8],
    resolutions: ["720p", "1080p", "4k"],
    aspects: ["16:9", "9:16"],
    audio: true,
  },
  {
    id: "kling/v2-5-turbo-image-to-video-pro",
    name: "Kling 2.5 Turbo I2V",
    family: "Kling",
    description: "Fast cinematic image animation",
    color: "#06b6d4",
    badge: "FAST",
    durations: [5, 10],
    resolutions: [],
    aspects: ["auto"],
  },
  {
    id: "minimax/hailuo-2.3/i2v-standard",
    name: "Minimax Hailuo 2.3 Fast",
    family: "Hailuo",
    description: "Fastest dynamic video generation",
    color: "#f59e0b",
    badge: "FAST",
    durations: [6, 10],
    resolutions: ["768P", "1080P"],
    aspects: ["auto"],
  },
  {
    id: "minimax/hailuo-2.3/i2v-pro",
    name: "Minimax Hailuo 2.3",
    family: "Hailuo",
    description: "High-quality dynamic video generation",
    color: "#f59e0b",
    badge: "PRO",
    durations: [6, 10],
    resolutions: ["768P", "1080P"],
    aspects: ["auto"],
  },
  {
    id: "openai/sora-2/image-to-video",
    name: "OpenAI Sora 2 I2V",
    family: "Sora",
    description: "Cinematic image-to-video generation",
    color: "#8b5cf6",
    badge: "TOP",
    durations: [10, 15],
    resolutions: [],
    aspects: ["16:9", "9:16"],
  },
  {
    id: "x-ai/grok-imagine-video/edit-video",
    name: "Grok Imagine I2V",
    family: "Grok",
    description: "Intelligent motion and camera work",
    color: "#f43f5e",
    badge: "NEW",
    durations: [6, 10, 15, 20, 30],
    resolutions: ["480p", "720p"],
    aspects: ["1:1", "16:9", "9:16"],
  },
];

const MODES: { id: StudioMode; label: string; icon: typeof Pencil; badge?: string }[] = [
  { id: "sketch-video", label: "Sketch to Video", icon: Brush, badge: "NEW" },
  { id: "draw-video", label: "Draw to Video", icon: Wand2 },
  { id: "draw-edit", label: "Draw to Edit", icon: Pencil },
];

const ASPECTS: { id: AspectRatio; label: string; css: string }[] = [
  { id: "auto", label: "Source", css: "16 / 9" },
  { id: "1:1", label: "1:1", css: "1 / 1" },
  { id: "16:9", label: "16:9", css: "16 / 9" },
  { id: "9:16", label: "9:16", css: "9 / 16" },
  { id: "4:3", label: "4:3", css: "4 / 3" },
  { id: "3:4", label: "3:4", css: "3 / 4" },
];

const COLORS = ["#ffffff", "#22c55e", "#f59e0b", "#3157f4", "#ff3b45"];

const EDIT_ACTIONS: { id: EditAction; label: string; icon: typeof Pencil; hint: string }[] = [
  { id: "animate", label: "Animate", icon: Move, hint: "Draw arrows to control movement and camera direction." },
  { id: "add", label: "Add", icon: Plus, hint: "Mark the target area, then describe the element to add." },
  { id: "remove", label: "Remove", icon: Minus, hint: "Paint or outline the element that must disappear." },
  { id: "replace", label: "Replace", icon: RefreshCw, hint: "Mark the old element and describe its replacement." },
];

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readError(response: Response) {
  const data = await response.json().catch(() => null) as { error?: string } | null;
  return data?.error || `Request failed (${response.status}).`;
}

async function pollVideoTask(taskId: string): Promise<string> {
  for (let attempt = 0; attempt < 100; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const response = await fetch(`/api/video?taskId=${encodeURIComponent(taskId)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(await readError(response));
    const data = await response.json() as { status?: string; outputs?: string[]; error?: string | null };
    if (data.status === "completed" && data.outputs?.[0]) return data.outputs[0];
    if (data.status === "failed") throw new Error(data.error || "Video generation failed.");
  }
  throw new Error("Video generation timed out.");
}

function canvasDimensions(aspect: AspectRatio) {
  if (aspect === "1:1") return { width: 1080, height: 1080 };
  if (aspect === "9:16") return { width: 720, height: 1280 };
  if (aspect === "4:3") return { width: 1200, height: 900 };
  if (aspect === "3:4") return { width: 900, height: 1200 };
  return { width: 1280, height: 720 };
}

function drawArrow(
  context: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
  width: number,
) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const head = Math.max(18, width * 2.3);
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
  context.beginPath();
  context.moveTo(end.x, end.y);
  context.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6));
  context.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fill();
  context.restore();
}

export default function DrawToVideoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const undoRef = useRef<string[]>([]);
  const redoRef = useRef<string[]>([]);
  const uploadRef = useRef<HTMLInputElement>(null);
  const referenceUploadRef = useRef<HTMLInputElement>(null);
  const sourceBeforeGenerationRef = useRef("");

  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const [studioMode, setStudioMode] = useState<StudioMode>("draw-video");
  const [tool, setTool] = useState<DrawTool>("brush");
  const [color, setColor] = useState("#ff3b45");
  const [brushSize, setBrushSize] = useState(8);
  const [prompt, setPrompt] = useState("");
  const [editAction, setEditAction] = useState<EditAction>("animate");
  const [selectedModelId, setSelectedModelId] = useState(VIDEO_MODELS[5].id);
  const [selectedEditModelId, setSelectedEditModelId] = useState<EditModel["id"]>(EDIT_MODELS[0].id);
  const [duration, setDuration] = useState(6);
  const [resolution, setResolution] = useState("720p");
  const [aspect, setAspect] = useState<AspectRatio>("16:9");
  const [modelOpen, setModelOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [referenceImage, setReferenceImage] = useState("");
  const [, rerenderHistory] = useState(0);

  const selectedModel = VIDEO_MODELS.find((model) => model.id === selectedModelId) || VIDEO_MODELS[0];
  const selectedEditModel = EDIT_MODELS.find((model) => model.id === selectedEditModelId) || EDIT_MODELS[0];
  const selectedEditPricingModel = IMAGE_MODELS.find((model) => model.id === selectedEditModel.id);
  const selectedAspect = ASPECTS.find((item) => item.id === aspect) || ASPECTS[2];
  const imageEditCredits = selectedEditPricingModel
    ? getImageCreditCost(selectedEditPricingModel, 1, selectedEditModel.quality)
    : 1;
  const estimatedCredits = studioMode === "draw-edit"
    ? Math.ceil(imageEditCredits)
    : Math.ceil(
        getVideoCreditsByRoute(selectedModel.id, { duration, resolution })
        + (studioMode === "draw-video" && editAction !== "animate" ? imageEditCredits : 0),
      );

  const snapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");
    if (undoRef.current.at(-1) === data) return;
    undoRef.current = [...undoRef.current.slice(-29), data];
    redoRef.current = [];
    sourceBeforeGenerationRef.current = data;
    rerenderHistory((value) => value + 1);
  }, []);

  const restore = useCallback((data: string) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = data;
  }, []);

  const resetBlank = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setBackgroundImage("");
    setReferenceImage("");
    undoRef.current = [];
    redoRef.current = [];
    snapshot();
  }, [snapshot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const previous = sourceBeforeGenerationRef.current || (canvas.width ? canvas.toDataURL("image/png") : "");
    const { width, height } = canvasDimensions(aspect);
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);
    if (previous && undoRef.current.length) {
      const image = new Image();
      image.onload = () => {
        context.drawImage(image, 0, 0, width, height);
        snapshot();
      };
      image.src = previous;
    } else {
      snapshot();
    }
  }, [aspect, imageUrl, snapshot, studioMode, videoUrl]);

  useEffect(() => {
    const nextDuration = selectedModel.durations.includes(duration) ? duration : selectedModel.durations[0];
    const nextResolution = selectedModel.resolutions.length === 0
      ? ""
      : selectedModel.resolutions.includes(resolution) ? resolution : selectedModel.resolutions[0];
    const nextAspect = selectedModel.aspects.includes(aspect) ? aspect : selectedModel.aspects[0];
    setDuration(nextDuration);
    setResolution(nextResolution);
    setAspect(nextAspect);
  }, [selectedModelId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedModel.family === "Hailuo" && duration === 10 && resolution === "1080P") {
      setResolution("768P");
    }
  }, [duration, resolution, selectedModel.family]);

  useEffect(() => {
    if (studioMode === "draw-edit" && aspect === "auto") {
      setAspect("16:9");
    }
  }, [aspect, studioMode]);

  const pointFromEvent = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  }, []);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = pointFromEvent(event);
    if (tool === "text") {
      const value = window.prompt("Enter text");
      if (!value) return;
      const context = canvasRef.current?.getContext("2d");
      if (!context) return;
      context.save();
      context.fillStyle = color;
      context.font = `700 ${Math.max(28, brushSize * 5)}px sans-serif`;
      context.fillText(value.slice(0, 80), point.x, point.y);
      context.restore();
      snapshot();
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    startRef.current = point;
    lastRef.current = point;
  }, [brushSize, color, pointFromEvent, snapshot, tool]);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastRef.current || !["brush", "eraser"].includes(tool)) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const point = pointFromEvent(event);
    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = tool === "eraser" ? brushSize * 2.5 : brushSize;
    context.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = color;
    context.beginPath();
    context.moveTo(lastRef.current.x, lastRef.current.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    context.restore();
    lastRef.current = point;
  }, [brushSize, color, pointFromEvent, tool]);

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !startRef.current) return;
    const context = canvasRef.current?.getContext("2d");
    const end = pointFromEvent(event);
    if (context && tool === "rectangle") {
      context.save();
      context.strokeStyle = color;
      context.lineWidth = brushSize;
      context.strokeRect(startRef.current.x, startRef.current.y, end.x - startRef.current.x, end.y - startRef.current.y);
      context.restore();
    }
    if (context && tool === "arrow") drawArrow(context, startRef.current, end, color, brushSize);
    drawingRef.current = false;
    startRef.current = null;
    lastRef.current = null;
    snapshot();
  }, [brushSize, color, pointFromEvent, snapshot, tool]);

  const undo = useCallback(() => {
    if (undoRef.current.length <= 1) return;
    const current = undoRef.current.pop();
    if (current) redoRef.current.push(current);
    restore(undoRef.current.at(-1)!);
    rerenderHistory((value) => value + 1);
  }, [restore]);

  const redo = useCallback(() => {
    const next = redoRef.current.pop();
    if (!next) return;
    undoRef.current.push(next);
    restore(next);
    rerenderHistory((value) => value + 1);
  }, [restore]);

  const importImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const data = await readFile(file);
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const image = new Image();
    image.onload = () => {
      setBackgroundImage(data);
      context.clearRect(0, 0, canvas.width, canvas.height);
      undoRef.current = [];
      redoRef.current = [];
      snapshot();
    };
    image.src = data;
  }, [snapshot]);

  const generate = useCallback(async () => {
    if (!canvasRef.current || !prompt.trim() || isGenerating) return;
    const gate = await guardGeneration({
      requiredCredits: estimatedCredits,
      action: `apps:${studioMode}`,
    });
    if (!gate.ok) {
      if (gate.reason === "error") setError(gate.message || "Unable to start generation.");
      return;
    }

    setIsGenerating(true);
    setError("");
    setVideoUrl("");
    setImageUrl("");

    try {
      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = canvasRef.current.width;
      sourceCanvas.height = canvasRef.current.height;
      const sourceContext = sourceCanvas.getContext("2d");
      if (!sourceContext) throw new Error("Canvas export is unavailable.");
      sourceContext.fillStyle = studioMode === "sketch-video" ? "#f6f1e7" : "#151515";
      sourceContext.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
      if (backgroundImage) {
        const base = new Image();
        await new Promise<void>((resolve, reject) => {
          base.onload = () => resolve();
          base.onerror = () => reject(new Error("Unable to decode the uploaded image."));
          base.src = backgroundImage;
        });
        const scale = Math.min(sourceCanvas.width / base.width, sourceCanvas.height / base.height);
        const width = base.width * scale;
        const height = base.height * scale;
        sourceContext.drawImage(base, (sourceCanvas.width - width) / 2, (sourceCanvas.height - height) / 2, width, height);
      }
      sourceContext.drawImage(canvasRef.current, 0, 0);
      const source = sourceCanvas.toDataURL("image/png");
      sourceBeforeGenerationRef.current = source;
      const actionInstruction = {
        animate: `Animate the supplied image according to this instruction: ${prompt.trim()}. Treat arrows and drawn marks as motion and camera-direction guidance. Remove all annotation marks from the result and preserve subject identity and scene composition.`,
        add: `Add this element to the supplied image: ${prompt.trim()}. Place it in the area indicated by the drawn marks.${referenceImage ? " The second supplied image is the exact visual reference for the element; preserve its design, colors, branding, and proportions." : ""} Make it photorealistic, correctly scaled, lit, and integrated with the scene. Remove all annotation marks and preserve everything else.`,
        remove: `Remove this element from the supplied image: ${prompt.trim()}. The drawn marks identify the target area. Reconstruct the hidden background naturally, remove all annotation marks, and preserve everything else.`,
        replace: `Replace the marked element in the supplied image according to this instruction: ${prompt.trim()}. The drawn marks identify the old element and target area.${referenceImage ? " The second supplied image is the exact visual reference for the replacement; preserve its design, colors, branding, and proportions." : ""} Integrate the replacement naturally, remove all annotation marks, and preserve everything else.`,
      }[editAction];
      const referencePayload = referenceImage
        ? { imageUrls: [source, referenceImage] }
        : { imageUrl: source };

      if (studioMode === "draw-edit") {
        const response = await fetch("/api/generate/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: actionInstruction,
            modelId: selectedEditModel.id,
            aspectRatio: aspect === "auto" ? "16:9" : aspect,
            resolution: selectedEditModel.quality,
            quality: selectedEditModel.quality,
            numImages: 1,
            ...referencePayload,
            imageInputField: selectedEditModel.imageInputField,
          }),
        });
        if (!response.ok) throw new Error(await readError(response));
        const data = await response.json() as { imageUrl?: string; mediaUrl?: string; imageUrls?: string[] };
        const output = data.imageUrl || data.mediaUrl || data.imageUrls?.[0];
        if (!output) throw new Error("Image edit returned no output.");
        setImageUrl(output);
      } else {
        const prefix = studioMode === "sketch-video"
          ? "Transform this sketch into a polished cinematic scene, then animate it. Preserve the sketched composition and subject placement."
          : editAction === "animate"
            ? actionInstruction
            : "Animate the edited reference image naturally. Preserve all added, removed, or replaced elements and keep the scene visually consistent.";
        let videoSource = source;
        if (studioMode === "draw-video" && editAction !== "animate") {
          const editResponse = await fetch("/api/generate/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: actionInstruction,
              modelId: selectedEditModel.id,
              aspectRatio: aspect === "auto" ? "16:9" : aspect,
              resolution: selectedEditModel.quality,
              quality: selectedEditModel.quality,
              numImages: 1,
              ...referencePayload,
              imageInputField: selectedEditModel.imageInputField,
            }),
          });
          if (!editResponse.ok) throw new Error(await readError(editResponse));
          const editData = await editResponse.json() as { imageUrl?: string; mediaUrl?: string; imageUrls?: string[] };
          videoSource = editData.imageUrl || editData.mediaUrl || editData.imageUrls?.[0] || "";
          if (!videoSource) throw new Error("The image edit stage returned no output.");
        }
        const providerAspect =
          selectedModel.family === "Sora"
            ? (aspect === "9:16" ? "portrait" : "landscape")
            : aspect === "auto" ? "16:9" : aspect;
        const response = await fetch("/api/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelRoute: selectedModel.id,
            payload: {
              prompt: `${prefix} ${prompt.trim()}`,
              image_url: videoSource,
              duration,
              ...(resolution ? { resolution } : {}),
              aspect_ratio: providerAspect,
            },
          }),
        });
        if (!response.ok) throw new Error(await readError(response));
        const data = await response.json() as { taskId?: string };
        if (!data.taskId) throw new Error("Video provider returned no task ID.");
        setVideoUrl(await pollVideoTask(data.taskId));
      }
    } catch (generationError) {
      setError(getSafeErrorMessage(generationError));
    } finally {
      setIsGenerating(false);
    }
  }, [
    aspect,
    backgroundImage,
    duration,
    editAction,
    estimatedCredits,
    getSafeErrorMessage,
    guardGeneration,
    isGenerating,
    prompt,
    referenceImage,
    resolution,
    selectedEditModel,
    selectedModel,
    studioMode,
  ]);

  const toolItems: { id: DrawTool; icon: typeof Pencil; label: string }[] = [
    { id: "brush", icon: Pencil, label: "Draw" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "arrow", icon: ArrowUpRight, label: "Arrow" },
    { id: "text", icon: Type, label: "Text" },
  ];
  const visibleAspects = studioMode === "draw-edit"
    ? ASPECTS.filter((item) => item.id !== "auto")
    : ASPECTS.filter((item) => selectedModel.aspects.includes(item.id));
  const displayedQuality = studioMode === "draw-edit" ? selectedEditModel.quality : resolution || "Provider native";

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,#102349_0,#070b18_38%,#040711_78%)] px-3 py-5 text-white md:px-6">
      <div className="mx-auto max-w-[1580px]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/apps" className="mb-4 inline-flex items-center gap-2 text-xs text-cyan-300/70 hover:text-cyan-200">
              <ArrowLeft className="h-4 w-4" /> Back to Apps
            </Link>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-400 shadow-[0_0_32px_rgba(34,211,238,.2)]">
                <Wand2 className="h-5 w-5 text-[#06101b]" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.32em] text-cyan-300">Saad Motion Lab</p>
                <h1 className="text-2xl font-black tracking-tight">Visual Direction Studio</h1>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] px-4 py-2 text-right">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Live estimate</p>
            <span className="text-sm font-black text-cyan-200">{estimatedCredits} credits</span>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[26px] border border-cyan-300/10 bg-[#080d1b]/95 p-4 shadow-[0_30px_90px_rgba(0,0,0,.45)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-600">Choose workflow</p>
              <p className="mt-1 text-xs text-slate-400">Create with Saad Studio&apos;s drawing and AI editing pipeline.</p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto">
              {MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setStudioMode(mode.id);
                      setVideoUrl("");
                      setImageUrl("");
                      setError("");
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-xs font-bold transition ${
                      studioMode === mode.id
                        ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100 shadow-[0_8px_24px_rgba(34,211,238,.08)]"
                        : "border-white/5 bg-white/[0.025] text-slate-500 hover:border-white/15 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {mode.label}
                    {mode.badge && <span className="rounded bg-violet-400/15 px-1.5 py-0.5 text-[8px] font-black text-violet-300">{mode.badge}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative mx-auto flex min-h-[620px] items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-[radial-gradient(circle_at_center,#152344_0,#080d19_62%)] p-4">
            {(videoUrl || imageUrl) ? (
              <div className="relative flex h-full w-full items-center justify-center bg-black">
                {videoUrl ? (
                  <video src={videoUrl} controls autoPlay loop playsInline className="max-h-[72vh] max-w-full" />
                ) : (
                  <NextImage src={imageUrl} alt="Edited result" width={1600} height={900} unoptimized className="max-h-[72vh] w-auto max-w-full object-contain" />
                )}
                <a
                  href={videoUrl || imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="absolute right-4 top-4 rounded-lg border border-white/10 bg-black/70 p-2 text-white hover:bg-black"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setVideoUrl("");
                    setImageUrl("");
                  }}
                  className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-xs font-bold text-white hover:bg-black"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to canvas
                </button>
              </div>
            ) : (
              <div
                className="relative h-[68vh] max-h-[590px] max-w-full overflow-hidden rounded-lg shadow-[0_24px_70px_rgba(0,0,0,.45)]"
                style={{
                  aspectRatio: selectedAspect.css,
                  backgroundColor: studioMode === "sketch-video" ? "#f6f1e7" : "#151515",
                  backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "contain",
                }}
              >
                <canvas
                  ref={canvasRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  className="absolute inset-0 h-full w-full touch-none"
                  style={{ cursor: "crosshair" }}
                />
              </div>
            )}

            {!videoUrl && !imageUrl && undoRef.current.length <= 1 && (
              <button
                type="button"
                onClick={() => uploadRef.current?.click()}
                className="absolute inset-0 m-auto flex h-32 w-72 flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-300/25 bg-[#07101f]/85 text-slate-500 backdrop-blur-sm hover:border-cyan-300/60 hover:text-cyan-200"
              >
                <ImagePlus className="mb-2 h-6 w-6" />
                <span className="text-sm font-bold">Upload image or start drawing</span>
                <span className="mt-1 text-[10px]">PNG, JPG, WEBP</span>
              </button>
            )}

            {isGenerating && (
              <div className="absolute inset-0 grid place-items-center bg-black/70 backdrop-blur-sm">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-lime-300" />
                  <p className="mt-3 text-sm font-bold">Generating with {studioMode === "draw-edit" ? selectedEditModel.name : selectedModel.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">This can take a few minutes.</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 rounded-2xl border border-white/5 bg-[#0c1328] p-4 lg:grid-cols-3">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Frame ratio</p>
                <span className="text-[10px] font-bold text-cyan-300">{aspect}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {visibleAspects.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAspect(item.id)}
                    className={`rounded-xl border px-2 py-2.5 text-[10px] font-black transition ${
                      aspect === item.id
                        ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100"
                        : "border-white/5 bg-white/[0.025] text-slate-500 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {visibleAspects.length === 1 && (
                <p className="mt-2 text-[9px] text-slate-600">This model inherits the source image ratio.</p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Duration</p>
                <span className="text-[10px] font-bold text-violet-300">{studioMode === "draw-edit" ? "Still image" : `${duration}s`}</span>
              </div>
              {studioMode === "draw-edit" ? (
                <div className="rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2.5 text-[10px] font-bold text-slate-500">No video duration</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {selectedModel.durations.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDuration(value)}
                      className={`rounded-xl border py-2.5 text-[10px] font-black transition ${
                        duration === value
                          ? "border-violet-400/50 bg-violet-400/10 text-violet-200"
                          : "border-white/5 bg-white/[0.025] text-slate-500 hover:text-white"
                      }`}
                    >
                      {value}s
                    </button>
                  ))}
                </div>
              )}
              {studioMode !== "draw-edit" && selectedModel.durations.length === 1 && (
                <p className="mt-2 text-[9px] text-slate-600">Fixed by the selected provider.</p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Output quality</p>
                <span className="text-[10px] font-bold text-cyan-300">{displayedQuality}</span>
              </div>
              {studioMode === "draw-edit" ? (
                <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 px-3 py-2.5 text-[10px] font-black text-cyan-100">{selectedEditModel.quality}</div>
              ) : selectedModel.resolutions.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {selectedModel.resolutions.map((value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={selectedModel.family === "Hailuo" && duration === 10 && value === "1080P"}
                      onClick={() => setResolution(value)}
                      className={`rounded-xl border py-2.5 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-25 ${
                        resolution === value
                          ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100"
                          : "border-white/5 bg-white/[0.025] text-slate-500 hover:text-white"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2.5 text-[10px] font-bold text-slate-500">Provider native quality</div>
              )}
              {selectedModel.family === "Hailuo" && duration === 10 && (
                <p className="mt-2 text-[9px] text-amber-300/70">10 seconds is available at 768P only.</p>
              )}
            </div>
          </div>

          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importImage(file);
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={referenceUploadRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file?.type.startsWith("image/")) {
                void readFile(file).then(setReferenceImage);
              }
              event.currentTarget.value = "";
            }}
          />

          <div className="mt-3 grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-end">
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModelOpen((value) => !value)}
                className="flex h-11 min-w-48 items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#202020] px-4 text-sm font-bold disabled:opacity-50"
              >
                <span className="truncate">{studioMode === "draw-edit" ? selectedEditModel.name : selectedModel.name}</span>
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              </button>
              {modelOpen && (
                <div className="absolute bottom-14 left-0 z-30 max-h-[560px] w-[390px] overflow-y-auto rounded-2xl border border-white/10 bg-[#181818] p-2 shadow-2xl">
                  <p className="px-3 pb-2 pt-1 text-xs font-semibold text-zinc-400">Select model</p>
                  {(studioMode === "draw-edit" ? EDIT_MODELS : VIDEO_MODELS).map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        if (studioMode === "draw-edit") {
                          setSelectedEditModelId(model.id as EditModel["id"]);
                        } else {
                          setSelectedModelId(model.id);
                        }
                        setModelOpen(false);
                      }}
                      className={`flex w-full gap-3 rounded-xl p-3 text-left hover:bg-white/5 ${
                        (studioMode === "draw-edit" ? selectedEditModel.id : selectedModel.id) === model.id ? "bg-white/10" : ""
                      }`}
                    >
                      <span
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-lg font-black"
                        style={{ color: studioMode === "draw-edit" ? "#b7f52a" : (model as StudioModel).color }}
                      >
                        {studioMode === "draw-edit" ? "G" : (model as StudioModel).family.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          {model.name}
                          {"badge" in model && model.badge && <span className="rounded bg-lime-400/15 px-1.5 py-0.5 text-[9px] font-black text-lime-300">{model.badge}</span>}
                          {(studioMode === "draw-edit" ? selectedEditModel.id : selectedModel.id) === model.id && <Check className="ml-auto h-4 w-4 text-zinc-300" />}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-zinc-500">{model.description}</span>
                        {studioMode !== "draw-edit" && (
                          <span className="mt-2 flex flex-wrap gap-2 text-[9px] text-zinc-400">
                            <b className="rounded bg-black/30 px-1.5 py-1">{(model as StudioModel).resolutions.join("-")}</b>
                            {(model as StudioModel).audio && <b className="rounded bg-lime-400/10 px-1.5 py-1 text-lime-300">audio</b>}
                            <b className="rounded bg-black/30 px-1.5 py-1">{(model as StudioModel).durations.join("/")}s</b>
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}

            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex w-full max-w-3xl flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-[#202020] p-1">
                {EDIT_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => setEditAction(action.id)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
                        editAction === action.id ? "bg-gradient-to-r from-cyan-300 to-violet-400 text-[#06101b]" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                      }`}
                      title={action.hint}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
              <p className="w-full max-w-3xl px-1 text-[10px] text-zinc-500">
                {EDIT_ACTIONS.find((action) => action.id === editAction)?.hint}
                {studioMode !== "draw-edit" && editAction !== "animate" && " A new video will be generated from the edited reference frame."}
              </p>
              {(editAction === "add" || editAction === "replace") && (
                <div className="flex w-full max-w-3xl items-center gap-3 rounded-xl border border-dashed border-white/15 bg-[#202020] p-2">
                  {referenceImage ? (
                    <>
                      <NextImage src={referenceImage} alt="Element reference" width={56} height={56} unoptimized className="h-14 w-14 rounded-lg bg-black object-contain" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white">Element reference attached</p>
                        <p className="mt-1 text-[10px] text-zinc-500">The model will preserve its design, colors, branding, and proportions.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReferenceImage("")}
                        className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-rose-300"
                        title="Remove reference"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => referenceUploadRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 py-2 text-xs font-bold text-zinc-300 hover:text-white"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Upload the element or product image
                    </button>
                  )}
                </div>
              )}
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value.slice(0, 1600))}
                placeholder={{
                  animate: "Describe the movement and camera action...",
                  add: "What should be added? Example: Add a red sports car inside the marked area.",
                  remove: "What should be removed? Example: Remove the person inside the red outline.",
                  replace: "What should be replaced? Example: Replace the marked chair with a modern black sofa.",
                }[editAction]}
                rows={2}
                className="w-full max-w-3xl resize-none rounded-xl border border-white/10 bg-[#202020] px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-lime-300/40"
              />
              <div className="flex items-center rounded-xl border border-white/10 bg-[#202020] p-1">
                <button type="button" onClick={() => uploadRef.current?.click()} className="tool-icon" title="Upload image"><ImagePlus className="h-4 w-4" /></button>
                {toolItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} type="button" onClick={() => setTool(item.id)} className={`tool-icon ${tool === item.id ? "tool-icon-active" : ""}`} title={item.label}>
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
                <div className="relative">
                  <button type="button" onClick={() => setPaletteOpen((value) => !value)} className="tool-icon" title="Color">
                    <span className="h-4 w-4 rounded-full" style={{ background: color }} />
                  </button>
                  {paletteOpen && (
                    <div className="absolute bottom-12 left-1/2 w-56 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#262626] p-4 shadow-2xl">
                      <div className="flex justify-center gap-4">
                        {COLORS.map((value) => (
                          <button key={value} type="button" onClick={() => setColor(value)} className="h-4 w-4 rounded-full ring-offset-4 ring-offset-[#262626]" style={{ background: value, boxShadow: color === value ? `0 0 0 2px ${value}` : undefined }} />
                        ))}
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                        Brush
                        <input
                          type="range"
                          min={2}
                          max={40}
                          value={brushSize}
                          onChange={(event) => setBrushSize(Number(event.target.value))}
                          className="min-w-0 flex-1 accent-lime-300"
                        />
                        <span className="w-5 text-right text-zinc-300">{brushSize}</span>
                      </div>
                    </div>
                  )}
                </div>
                <span className="mx-1 h-6 w-px bg-white/10" />
                <button type="button" onClick={undo} disabled={undoRef.current.length <= 1} className="tool-icon disabled:opacity-25" title="Undo"><Undo2 className="h-4 w-4" /></button>
                <button type="button" onClick={redo} disabled={!redoRef.current.length} className="tool-icon disabled:opacity-25" title="Redo"><Redo2 className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="relative flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={generate}
                disabled={!prompt.trim() || isGenerating}
                className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-violet-400 px-5 text-sm font-black text-[#06101b] shadow-[0_10px_28px_rgba(34,211,238,.14)] hover:brightness-110 disabled:opacity-40"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : studioMode === "draw-edit" ? <Sparkles className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {studioMode === "draw-edit" ? "Generate Edit" : "Generate Video"}
                <span className="text-xs">{estimatedCredits} cr</span>
              </button>
              <button type="button" onClick={resetBlank} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-[#202020] text-zinc-400 hover:text-rose-300" title="Clear canvas">
                <Trash2 className="h-4 w-4" />
              </button>
              <button type="button" className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-[#202020] text-zinc-400" title="Information">
                <Info className="h-4 w-4" />
              </button>

            </div>
          </div>

          {error && <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}
        </section>
      </div>

      <style jsx>{`
        .tool-icon {
          display: grid;
          width: 36px;
          height: 36px;
          place-items: center;
          border-radius: 8px;
          color: #d4d4d8;
          transition: 150ms ease;
        }
        .tool-icon:hover {
          background: rgba(255, 255, 255, 0.07);
          color: white;
        }
        .tool-icon-active {
          background: white;
          color: black;
        }
      `}</style>
    </main>
  );
}
