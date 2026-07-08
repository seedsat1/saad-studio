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
  Maximize2,
  Minus,
  MousePointer,
  Move,
  Pencil,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  SlidersHorizontal,
  Settings,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  Type,
  Undo2,
  Upload,
  Video,
  Wand2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { getVideoCreditsByRoute } from "@/lib/credit-pricing";
import { getImageCreditCost, IMAGE_MODELS } from "@/lib/image-models";
import { cn } from "@/lib/utils";

type StudioMode = "sketch-video" | "draw-video" | "draw-edit";
type DrawTool = "pointer" | "brush" | "eraser" | "rectangle" | "arrow" | "text";
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
    name: "Gemini 2.5 Flash Image",
    description: "Google's advanced image editing model",
    imageInputField: "image_urls",
    quality: "1K",
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    description: "Best image edit model ever",
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
    id: "google/gemini-omni-flash",
    name: "Gemini Omni Flash",
    family: "Google",
    description: "Ultra-fast direct Google video generation & editing",
    color: "#4285f4",
    badge: "NEW",
    durations: [3, 4, 5, 6, 7, 8, 9, 10],
    resolutions: ["720p"],
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

const GENERATION_STYLES = [
  { id: "realistic", label: "Realistic Photo", prompt: "photorealistic, highly detailed, raw photo format, 8k resolution, cinematic lighting, natural shadows", image: "/preset/13 Fashion Editorial.webp" },
  { id: "cinematic", label: "Cinematic Film", prompt: "cinematic film style, anamorphic lens flares, movie frame composition, dramatic depth of field, volumetric haze", image: "/preset/Cinematic portrait.webp" },
  { id: "anime", label: "Anime / Ghibli", prompt: "modern anime style illustration, vibrant colors, hand-drawn detailing, beautiful sketch contours, Studio Ghibli style", image: "/preset/3 Anime · Ghibli.webp" },
  { id: "artistic", label: "Artistic Paint", prompt: "watercolor painting, expressive brush strokes, digital concept art style, masterpiece illustration", image: "/preset/6 Watercolor Painting.webp" },
  { id: "sketch", label: "Graphite Sketch", prompt: "pencil sketch, graphite pencil contours, cross-hatching shadows, clean paper texture", image: "/preset/7 Pencil Sketch.webp" }
] as const;

const DEMOS = [
  {
    id: "fuji",
    label: "Fuji Lawson (Draw to Video)",
    image: "/demo-draw-to-video-v3.png",
    mode: "draw-video" as StudioMode,
    prompt: "make the bicycle ride forward, pedestrians walk, and crane lift slowly",
    brushSize: 20,
    style: "realistic"
  },
  {
    id: "street",
    label: "Brooklyn Walking (Sketch to Video)",
    image: "/demo-remove-bg-v3.png",
    mode: "sketch-video" as StudioMode,
    prompt: "convert the sketch to a young man walking past Brooklyn brownstones",
    brushSize: 6,
    style: "cinematic"
  },
  {
    id: "bottle",
    label: "Orange Juice Hand (Draw to Edit)",
    image: "/demo-replace-before-v3.png",
    mode: "draw-edit" as StudioMode,
    editAction: "replace" as EditAction,
    prompt: "place the orange juice bottle in the person's hand",
    referenceImage: "/orange-juice-bottle.png",
    brushSize: 25,
    style: "realistic"
  }
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
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const head = Math.max(18, width * 2.3);
  const arrowLength = head * Math.cos(Math.PI / 6); // Length of arrowhead along the arrow axis

  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";

  // Stop the line at the base of the arrowhead
  let lineEndX = end.x;
  let lineEndY = end.y;
  if (distance > arrowLength) {
    lineEndX = end.x - arrowLength * Math.cos(angle);
    lineEndY = end.y - arrowLength * Math.sin(angle);
  }

  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(lineEndX, lineEndY);
  context.stroke();

  context.beginPath();
  context.moveTo(end.x, end.y);
  context.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6));
  context.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fill();
  context.restore();
}

function getCursorStyle(tool: DrawTool, brushSize: number) {
  switch (tool) {
    case "pointer":
      return "default";
    case "text":
      return "text";
    case "eraser":
      return `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l4.3 4.3c1 1 1 2.5 0 3.4l-9.6 9.6c-1 1-2.5 1-3.4 0z'/><path d='M19 21H5'/></svg>") 4 18, auto`;
    case "brush": {
      const size = Math.max(8, Math.min(64, brushSize));
      return `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='${size + 4}' height='${size + 4}' viewBox='0 0 ${size + 4} ${size + 4}' fill='none'><circle cx='${size / 2 + 2}' cy='${size / 2 + 2}' r='${size / 2}' stroke='white' stroke-width='1.5'/><circle cx='${size / 2 + 2}' cy='${size / 2 + 2}' r='${size / 2 - 1.5}' stroke='black' stroke-width='1'/></svg>") ${size / 2 + 2} ${size / 2 + 2}, auto`;
    }
    case "rectangle":
      return "crosshair";
    case "arrow":
      return `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M5 19 19 5'/><path d='M12 5h7v7'/></svg>") 19 5, auto`;
    default:
      return "default";
  }
}

interface TextLayer {
  id: string;
  text: string;
  x: number; // percentage
  y: number; // percentage
  color: string;
  fontSize: number;
  fontFamily: string;
}

export default function DrawToVideoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const videoUploadRef = useRef<HTMLInputElement>(null);
  const drawingRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const undoRef = useRef<{ drawing: string; background: string }[]>([]);
  const redoRef = useRef<{ drawing: string; background: string }[]>([]);
  const uploadRef = useRef<HTMLInputElement>(null);
  const referenceUploadRef = useRef<HTMLInputElement>(null);
  const sourceBeforeGenerationRef = useRef("");
  const startImageDataRef = useRef<ImageData | null>(null);
  
  const draggingTextIdRef = useRef<string | null>(null);
  const dragTextOffsetRef = useRef({ x: 0, y: 0 });

  const [baseVideoUrl, setBaseVideoUrl] = useState<string>("");
  const [baseVideoFile, setBaseVideoFile] = useState<File | null>(null);
  const [baseVideoPlaying, setBaseVideoPlaying] = useState(false);

  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  
  // Studio States
  const [studioMode, setStudioMode] = useState<StudioMode>("draw-video");
  const [tool, setTool] = useState<DrawTool>("brush");
  const [color, setColor] = useState("#ff3b45");
  const [brushSize, setBrushSize] = useState(25);
  const [prompt, setPrompt] = useState("");
  const [editAction, setEditAction] = useState<EditAction>("animate");
  
  // Model Parameters
  const [selectedModelId, setSelectedModelId] = useState(VIDEO_MODELS[2].id);
  const [selectedEditModelId, setSelectedEditModelId] = useState<EditModel["id"]>(EDIT_MODELS[0].id);
  const [duration, setDuration] = useState(6);
  const [resolution, setResolution] = useState("768P");
  const [aspect, setAspect] = useState<AspectRatio>("16:9");
  const [editQuality, setEditQuality] = useState("2K");
  
  // Layout menus
  const [modelOpen, setModelOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [aspectOpen, setAspectOpen] = useState(false);
  
  // Custom Style State
  const [selectedStyleId, setSelectedStyleId] = useState<typeof GENERATION_STYLES[number]["id"]>("realistic");
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);

  const selectedStyle = useMemo(() => {
    return GENERATION_STYLES.find((s) => s.id === selectedStyleId) || GENERATION_STYLES[0];
  }, [selectedStyleId]);

  // Assets & Status
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [, rerenderHistory] = useState(0);

  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [textEditingId, setTextEditingId] = useState<string | null>(null);

  // Draggable Reference Product Card states
  const [cardPos, setCardPos] = useState({ x: 70, y: 35 });
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const cardStart = useRef({ x: 0, y: 0 });

  const onCardMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDraggingCard(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    cardStart.current = { x: cardPos.x, y: cardPos.y };
  }, [cardPos]);

  useEffect(() => {
    if (!isDraggingCard) return;
    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const parent = canvasRef.current?.parentElement;
      if (parent) {
        const bounds = parent.getBoundingClientRect();
        const percentX = cardStart.current.x + (dx / bounds.width) * 100;
        const percentY = cardStart.current.y + (dy / bounds.height) * 100;
        setCardPos({
          x: Math.max(0, Math.min(90, percentX)),
          y: Math.max(0, Math.min(90, percentY)),
        });
      }
    };
    const onMouseUp = () => {
      setIsDraggingCard(false);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDraggingCard]);

  // Model & Pricing Calculators
  const selectedModel = VIDEO_MODELS.find((model) => model.id === selectedModelId) || VIDEO_MODELS[0];
  const selectedEditModel = EDIT_MODELS.find((model) => model.id === selectedEditModelId) || EDIT_MODELS[0];
  const selectedEditPricingModel = IMAGE_MODELS.find((model) => model.id === selectedEditModel.id);
  const editQualityOptions = selectedEditPricingModel?.qualityParam || [];
  const selectedAspect = ASPECTS.find((item) => item.id === aspect) || ASPECTS[2];
  
  const imageEditCredits = selectedEditPricingModel
    ? getImageCreditCost(
        selectedEditPricingModel,
        1,
        studioMode === "draw-edit" && editQualityOptions.length ? editQuality : selectedEditModel.quality
      )
    : 1;
  const estimatedCredits = studioMode === "draw-edit"
    ? Math.ceil(imageEditCredits)
    : Math.ceil(
        getVideoCreditsByRoute(selectedModel.id, { duration, resolution })
        + (studioMode === "draw-video" && editAction !== "animate" ? imageEditCredits : 0),
      );

  const handleModeChange = (mode: StudioMode) => {
    setStudioMode(mode);
    setTool("brush");
    setVideoUrl("");
    setImageUrl("");
    setError("");
    if (mode === "sketch-video") {
      setBrushSize(6);
      setColor("#ff3b45");
      setEditAction("animate");
    } else if (mode === "draw-video") {
      setBrushSize(25);
      setColor("rgba(229, 255, 0, 0.45)");
      setEditAction("animate");
    } else {
      setBrushSize(25);
      setColor("rgba(6, 182, 212, 0.55)");
      setEditAction("replace");
    }
  };

  const loadDemo = (demoId: string) => {
    const demo = DEMOS.find((d) => d.id === demoId);
    if (!demo) return;
    handleModeChange(demo.mode);
    setPrompt(demo.prompt);
    setBrushSize(demo.brushSize);
    setSelectedStyleId(demo.style as typeof GENERATION_STYLES[number]["id"]);
    
    if (demo.editAction) {
      setEditAction(demo.editAction);
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return;

    const image = new Image();
    image.onload = () => {
      setBackgroundImage(demo.image);
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      const imgCanvas = imageCanvasRef.current;
      const imgContext = imgCanvas?.getContext("2d", { willReadFrequently: true });
      if (imgCanvas && imgContext) {
        imgCanvas.width = canvas.width;
        imgCanvas.height = canvas.height;
        imgContext.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
        imgContext.drawImage(image, 0, 0, imgCanvas.width, imgCanvas.height);
      }
      
      undoRef.current = [];
      redoRef.current = [];
      snapshot();
    };
    image.src = demo.image;

    if (demo.referenceImage) {
      setReferenceImages([demo.referenceImage]);
      setCardPos({ x: 70, y: 35 });
    } else {
      setReferenceImages([]);
    }
  };

  const snapshot = useCallback(() => {
    const canvas = canvasRef.current;
    const imgCanvas = imageCanvasRef.current;
    if (!canvas || !imgCanvas) return;
    const drawingData = canvas.toDataURL("image/png");
    const bgData = imgCanvas.toDataURL("image/png");
    
    const lastItem = undoRef.current.at(-1);
    if (lastItem && lastItem.drawing === drawingData && lastItem.background === bgData) return;
    
    undoRef.current = [...undoRef.current.slice(-29), { drawing: drawingData, background: bgData }];
    redoRef.current = [];
    sourceBeforeGenerationRef.current = drawingData;
    rerenderHistory((value) => value + 1);
  }, []);

  const restore = useCallback((data: { drawing: string; background: string }) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (canvas && context) {
      const image = new Image();
      image.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      };
      image.src = data.drawing;
    }
    
    const imgCanvas = imageCanvasRef.current;
    const imgContext = imgCanvas?.getContext("2d", { willReadFrequently: true });
    if (imgCanvas && imgContext) {
      const image = new Image();
      image.onload = () => {
        imgContext.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
        imgContext.drawImage(image, 0, 0, imgCanvas.width, imgCanvas.height);
      };
      image.src = data.background;
    }
  }, []);

  const resetBlank = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    const imgCanvas = imageCanvasRef.current;
    const imgContext = imgCanvas?.getContext("2d", { willReadFrequently: true });
    
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (imgCanvas && imgContext) {
      imgContext.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
    }
    
    setBackgroundImage("");
    setReferenceImages([]);
    setBaseVideoUrl("");
    setBaseVideoFile(null);
    setBaseVideoPlaying(false);
    undoRef.current = [];
    redoRef.current = [];
    snapshot();
  }, [snapshot]);

  // Sync canvas size on aspect change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const previous = sourceBeforeGenerationRef.current || (canvas.width ? canvas.toDataURL("image/png") : "");
    const { width, height } = canvasDimensions(aspect);
    canvas.width = width;
    canvas.height = height;
    
    const imgCanvas = imageCanvasRef.current;
    if (imgCanvas) {
      imgCanvas.width = width;
      imgCanvas.height = height;
    }
    
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.clearRect(0, 0, width, height);
    if (previous && undoRef.current.length) {
      const image = new Image();
      image.onload = () => {
        context.drawImage(image, 0, 0, width, height);
        
        if (backgroundImage) {
          const imgContext = imgCanvas?.getContext("2d", { willReadFrequently: true });
          if (imgCanvas && imgContext) {
            const bgImage = new Image();
            bgImage.onload = () => {
              imgContext.clearRect(0, 0, width, height);
              imgContext.drawImage(bgImage, 0, 0, width, height);
              snapshot();
            };
            bgImage.src = backgroundImage;
          } else {
            snapshot();
          }
        } else {
          snapshot();
        }
      };
      image.src = previous;
    } else {
      if (backgroundImage) {
        const imgContext = imgCanvas?.getContext("2d", { willReadFrequently: true });
        if (imgCanvas && imgContext) {
          const bgImage = new Image();
          bgImage.onload = () => {
            imgContext.clearRect(0, 0, width, height);
            imgContext.drawImage(bgImage, 0, 0, width, height);
            snapshot();
          };
          bgImage.src = backgroundImage;
        } else {
          snapshot();
        }
      } else {
        snapshot();
      }
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.getAttribute("contenteditable") === "true"
      ) {
        return;
      }
      
      if ((e.key === "Delete" || e.key === "Backspace") && selectedTextId) {
        e.preventDefault();
        setTextLayers((prev) => prev.filter((l) => l.id !== selectedTextId));
        setSelectedTextId(null);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedTextId]);

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
    if (videoPlayerRef.current && !videoPlayerRef.current.paused) {
      videoPlayerRef.current.pause();
      setBaseVideoPlaying(false);
    }
    if (tool === "pointer") {
      // Clear text selection if clicking empty canvas space
      setSelectedTextId(null);
      return;
    }
    if (tool === "text") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const newLayer: TextLayer = {
        id: Math.random().toString(36).substring(2, 9),
        text: "Double-click to edit",
        x: (point.x / canvas.width) * 100,
        y: (point.y / canvas.height) * 100,
        color: color,
        fontSize: Math.max(16, brushSize * 1.5),
        fontFamily: "sans-serif",
      };
      setTextLayers((prev) => [...prev, newLayer]);
      setSelectedTextId(newLayer.id);
      setTextEditingId(newLayer.id);
      setTool("pointer");
      return;
    }
    
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (canvas && context) {
      startImageDataRef.current = context.getImageData(0, 0, canvas.width, canvas.height);
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    startRef.current = point;
    lastRef.current = point;
  }, [brushSize, color, pointFromEvent, snapshot, tool]);

  const getBrushStyle = useCallback((context: CanvasRenderingContext2D, mode: StudioMode, activeColor: string) => {
    if (mode === "draw-video") {
      return "rgba(229, 255, 0, 0.55)"; // Glowing motion yellow
    } else if (mode === "draw-edit") {
      if (editAction === "remove") return "rgba(239, 68, 68, 0.55)"; // Inpaint remove red
      return "rgba(6, 182, 212, 0.55)"; // Inpaint replace/add cyan
    }
    return activeColor;
  }, [editAction]);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastRef.current) return;
    const context = canvasRef.current?.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    const point = pointFromEvent(event);

    if (["brush", "eraser"].includes(tool)) {
      context.save();
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = tool === "eraser" ? brushSize * 2.5 : brushSize;
      context.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
      
      if (tool === "eraser") {
        context.strokeStyle = "rgba(0,0,0,1)";
      } else {
        context.strokeStyle = getBrushStyle(context, studioMode, color);
      }
      
      context.beginPath();
      context.moveTo(lastRef.current.x, lastRef.current.y);
      context.lineTo(point.x, point.y);
      context.stroke();
      context.restore();

      // Erase background image if using eraser
      if (tool === "eraser") {
        const imgContext = imageCanvasRef.current?.getContext("2d", { willReadFrequently: true });
        if (imgContext) {
          imgContext.save();
          imgContext.lineCap = "round";
          imgContext.lineJoin = "round";
          imgContext.lineWidth = brushSize * 2.5;
          imgContext.globalCompositeOperation = "destination-out";
          imgContext.strokeStyle = "rgba(0,0,0,1)";
          imgContext.beginPath();
          imgContext.moveTo(lastRef.current.x, lastRef.current.y);
          imgContext.lineTo(point.x, point.y);
          imgContext.stroke();
          imgContext.restore();
        }
      }

      lastRef.current = point;
    } else if (["rectangle", "arrow"].includes(tool)) {
      if (startImageDataRef.current) {
        context.putImageData(startImageDataRef.current, 0, 0);
      }
      if (tool === "rectangle" && startRef.current) {
        context.save();
        context.strokeStyle = getBrushStyle(context, studioMode, color);
        context.lineWidth = brushSize;
        context.strokeRect(startRef.current.x, startRef.current.y, point.x - startRef.current.x, point.y - startRef.current.y);
        context.restore();
      } else if (tool === "arrow" && startRef.current) {
        const arrowColor = studioMode === "draw-video" ? "rgba(229, 255, 0, 0.85)" : "rgba(6, 182, 212, 0.85)";
        drawArrow(context, startRef.current, point, arrowColor, brushSize);
      }
    }
  }, [brushSize, color, pointFromEvent, tool, studioMode, getBrushStyle]);

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !startRef.current) return;
    const context = canvasRef.current?.getContext("2d", { willReadFrequently: true });
    const end = pointFromEvent(event);
    
    if (context) {
      if (["rectangle", "arrow"].includes(tool) && startImageDataRef.current) {
        context.putImageData(startImageDataRef.current, 0, 0);
      }
      if (tool === "rectangle") {
        context.save();
        context.strokeStyle = getBrushStyle(context, studioMode, color);
        context.lineWidth = brushSize;
        context.strokeRect(startRef.current.x, startRef.current.y, end.x - startRef.current.x, end.y - startRef.current.y);
        context.restore();
      }
      if (tool === "arrow") {
        const arrowColor = studioMode === "draw-video" ? "rgba(229, 255, 0, 0.85)" : "rgba(6, 182, 212, 0.85)";
        drawArrow(context, startRef.current, end, arrowColor, brushSize);
      }
    }
    
    drawingRef.current = false;
    startRef.current = null;
    lastRef.current = null;
    startImageDataRef.current = null;
    snapshot();
  }, [brushSize, color, pointFromEvent, snapshot, tool, studioMode, getBrushStyle]);

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
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return;
    const image = new Image();
    image.onload = () => {
      setBackgroundImage(data);
      setBaseVideoUrl("");
      setBaseVideoFile(null);
      setBaseVideoPlaying(false);
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      const imgCanvas = imageCanvasRef.current;
      const imgContext = imgCanvas?.getContext("2d", { willReadFrequently: true });
      if (imgCanvas && imgContext) {
        imgCanvas.width = canvas.width;
        imgCanvas.height = canvas.height;
        imgContext.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
        imgContext.drawImage(image, 0, 0, imgCanvas.width, imgCanvas.height);
      }
      
      undoRef.current = [];
      redoRef.current = [];
      snapshot();
    };
    image.src = data;
  }, [snapshot]);

  const importVideo = useCallback(async (file: File) => {
    if (!file.type.startsWith("video/")) return;
    setBaseVideoFile(file);
    const url = URL.createObjectURL(file);
    setBaseVideoUrl(url);
    setBaseVideoPlaying(false);
    
    // Clear image background
    setBackgroundImage("");
    const imgCanvas = imageCanvasRef.current;
    const imgContext = imgCanvas?.getContext("2d", { willReadFrequently: true });
    if (imgCanvas && imgContext) {
      imgContext.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
    }
    
    // Reset drawing canvas
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Select Google Gemini Omni Flash by default when video is uploaded
    setSelectedModelId("google/gemini-omni-flash");
    
    undoRef.current = [];
    redoRef.current = [];
    snapshot();
  }, [snapshot]);

  useEffect(() => {
    return () => {
      if (baseVideoUrl) {
        URL.revokeObjectURL(baseVideoUrl);
      }
    };
  }, [baseVideoUrl]);

  const generate = useCallback(async () => {
    const promptNeeded = studioMode !== "draw-edit" || editAction !== "remove";
    if (!canvasRef.current || (promptNeeded && !prompt.trim()) || isGenerating) return;
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
      
      if (baseVideoUrl && videoPlayerRef.current) {
        sourceContext.drawImage(videoPlayerRef.current, 0, 0, sourceCanvas.width, sourceCanvas.height);
      } else if (imageCanvasRef.current) {
        sourceContext.drawImage(imageCanvasRef.current, 0, 0);
      }
      sourceContext.drawImage(canvasRef.current, 0, 0);

      // Render vector text layers onto the exported source canvas
      textLayers.forEach((layer) => {
        sourceContext.save();
        sourceContext.fillStyle = layer.color;
        const screenCanvasHeight = canvasRef.current?.clientHeight || 1;
        const scale = sourceCanvas.height / screenCanvasHeight;
        const scaledFontSize = layer.fontSize * scale;
        sourceContext.font = `700 ${scaledFontSize}px ${layer.fontFamily}`;
        sourceContext.textBaseline = "middle";
        sourceContext.textAlign = "center";
        const pxX = (layer.x / 100) * sourceCanvas.width;
        const pxY = (layer.y / 100) * sourceCanvas.height;
        sourceContext.fillText(layer.text, pxX, pxY);
        sourceContext.restore();
      });

      const source = sourceCanvas.toDataURL("image/png");
      sourceBeforeGenerationRef.current = source;
      const actionInstruction = {
        animate: `Animate the supplied image according to this instruction: ${prompt.trim()}. Treat arrows and drawn marks as motion and camera-direction guidance. Remove all annotation marks from the result and preserve subject identity and scene composition.`,
        add: `Add this element to the supplied image: ${prompt.trim()}. Place it in the area indicated by the drawn marks.${referenceImages.length ? " The other supplied images are the visual references for the element; preserve their design, colors, branding, and proportions." : ""} Make it photorealistic, correctly scaled, lit, and integrated with the scene. Remove all annotation marks and preserve everything else.`,
        remove: `Remove this element from the supplied image: ${prompt.trim()}. The drawn marks identify the target area. Reconstruct the hidden background naturally, remove all annotation marks, and preserve everything else.`,
        replace: `Replace the marked element in the supplied image according to this instruction: ${prompt.trim()}. The drawn marks identify the old element and target area.${referenceImages.length ? " The other supplied images are the visual references for the replacement; preserve their design, colors, branding, and proportions." : ""} Integrate the replacement naturally, remove all annotation marks, and preserve everything else.`,
      }[editAction];
      const referencePayload = referenceImages.length > 0
        ? { imageUrls: [source, ...referenceImages] }
        : { imageUrl: source };

      if (studioMode === "draw-edit") {
        const response = await fetch("/api/generate/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `${actionInstruction}. Style: ${selectedStyle.prompt}`,
            modelId: selectedEditModel.id,
            aspectRatio: aspect === "auto" ? "16:9" : aspect,
            resolution: editQualityOptions.length ? editQuality : selectedEditModel.quality,
            quality: editQualityOptions.length ? editQuality : selectedEditModel.quality,
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
              prompt: `${actionInstruction}. Style: ${selectedStyle.prompt}`,
              modelId: selectedEditModel.id,
              aspectRatio: aspect === "auto" ? "16:9" : aspect,
              resolution: editQualityOptions.length ? editQuality : selectedEditModel.quality,
              quality: editQualityOptions.length ? editQuality : selectedEditModel.quality,
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
        
        let baseVideoDataUrl = "";
        if (baseVideoFile) {
          baseVideoDataUrl = await readFile(baseVideoFile);
        }

        const isGoogleModel = selectedModel.id.includes("google/");
        const response = await fetch("/api/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelRoute: selectedModel.id,
            payload: {
              prompt: `${prefix} ${prompt.trim()}. Style: ${selectedStyle.prompt}`,
              image_url: videoSource,
              video_url: (baseVideoDataUrl && isGoogleModel) ? baseVideoDataUrl : undefined,
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
    baseVideoUrl,
    baseVideoFile,
    duration,
    editAction,
    estimatedCredits,
    getSafeErrorMessage,
    guardGeneration,
    isGenerating,
    prompt,
    referenceImages,
    resolution,
    selectedEditModel,
    selectedModel,
    studioMode,
    selectedStyle,
    textLayers,
  ]);

  const toolItems: { id: DrawTool; icon: typeof Pencil; label: string }[] = [
    { id: "pointer", icon: MousePointer, label: "Select" },
    { id: "brush", icon: Pencil, label: "Draw" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "arrow", icon: ArrowUpRight, label: "Arrow" },
    { id: "text", icon: Type, label: "Text" },
  ];

  const visibleAspects = studioMode === "draw-edit"
    ? ASPECTS.filter((item) => item.id !== "auto")
    : ASPECTS.filter((item) => selectedModel.aspects.includes(item.id));

  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        .ratio-card {
          width: 58px;
          height: 58px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          background: rgba(255, 255, 255, 0.01);
          color: #94a3b8;
        }
        .ratio-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.03);
          color: white;
        }
        .ratio-card.active {
          border-color: #8b5cf6;
          background: rgba(139, 92, 246, 0.08);
          color: #c084fc;
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.15);
        }
        .ratio-card .ratio-shape {
          border: 1.5px solid currentColor;
          border-radius: 2.5px;
        }
        .ratio-auto .ratio-shape {
          width: 24px;
          height: 24px;
          border-style: dashed;
        }
        .ratio-1-1 .ratio-shape {
          width: 24px;
          height: 24px;
        }
        .ratio-16-9 .ratio-shape {
          width: 30px;
          height: 18px;
        }
        .ratio-9-16 .ratio-shape {
          width: 18px;
          height: 30px;
        }
        .ratio-4-3 .ratio-shape {
          width: 26px;
          height: 20px;
        }
        .ratio-3-4 .ratio-shape {
          width: 20px;
          height: 26px;
        }
        .ratio-label {
          margin-top: 4px;
          font-size: 9px;
          font-weight: 700;
          color: inherit;
        }
      `}</style>

      <div
        className="flex h-[calc(100vh-4rem)] overflow-hidden bg-[#060c18] text-white select-none relative"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255, 255, 255, 0.02) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {/* Soft background glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-violet-600/[0.04] blur-[120px]" />
          <div className="absolute -right-32 top-60 h-[400px] w-[400px] rounded-full bg-pink-500/[0.03] blur-[100px]" />
        </div>

        {/* ─── Breadcrumb Title (Top Left) ─── */}
        <div className="absolute top-5 left-6 z-30 flex items-center gap-2">
          <Link href="/apps" className="text-xs text-zinc-500 hover:text-zinc-300 font-bold transition-colors uppercase tracking-wider">
            Apps
          </Link>
          <span className="text-zinc-600 text-xs">/</span>
          <span className="text-zinc-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            Draw to Video
            <span className="text-zinc-500 font-mono text-[9px] ml-0.5">&gt;</span>
          </span>
        </div>

        {/* ─── Floating Top Mode Switcher (Top Center) ─── */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full bg-zinc-950/60 backdrop-blur-md p-1 border border-white/10 shadow-xl">
          {MODES.map((tab) => {
            const Icon = tab.icon;
            const isActive = studioMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleModeChange(tab.id)}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-300",
                  isActive
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="rounded bg-violet-400 px-1 py-0.2 text-[8px] font-black text-slate-950 uppercase">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Main Content Viewport ─── */}
        <div className="flex-1 flex flex-col justify-between items-center p-8 pt-18 pb-4 relative h-full min-w-0">
          
          {/* Floating Left Demo Preset Bar */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2.5 bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-2xl">
            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block px-1 mb-1">Demos</span>
            {DEMOS.map((demo) => (
              <button
                key={demo.id}
                type="button"
                onClick={() => loadDemo(demo.id)}
                className={cn(
                  "group h-12 w-18 rounded-xl overflow-hidden border transition-all duration-200 hover:scale-105 active:scale-95 relative bg-zinc-900",
                  studioMode === demo.mode ? "border-violet-500 ring-2 ring-violet-500/20" : "border-white/10"
                )}
                title={`Load ${demo.label}`}
              >
                <img src={demo.image} alt={demo.label} className="h-full w-full object-cover opacity-60 group-hover:opacity-80 transition" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex items-end justify-center p-0.5" />
                <span className="absolute bottom-0.5 inset-x-0 text-[8px] font-extrabold text-white text-center leading-tight truncate px-0.5">
                  {demo.label.split(" (")[0]}
                </span>
              </button>
            ))}
          </div>

          {/* Centered Canvas Container */}
          <div className="flex-1 flex items-center justify-center w-full min-h-0 relative">
            <div
              className="relative rounded-2xl overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.7)] border border-white/10 bg-zinc-950 flex items-center justify-center group"
              style={{
                aspectRatio: selectedAspect.css,
                width: "100%",
                height: "100%",
                maxHeight: "68vh",
                maxWidth: "85%",
              }}
            >
              {/* Checkerboard transparency or grid backdrop */}
              <div 
                className="absolute inset-0 w-full h-full bg-contain bg-center bg-no-repeat"
                style={{
                  backgroundColor: studioMode === "sketch-video" ? "#f6f1e7" : (studioMode === "draw-edit" && editAction === "remove" ? "#18181b" : "#121620"),
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }}
              />
              
              {studioMode === "draw-edit" && editAction === "remove" && (
                <div 
                  className="absolute inset-0 opacity-20 pointer-events-none" 
                  style={{
                    backgroundImage: "linear-gradient(45deg, #27272a 25%, transparent 25%), linear-gradient(-45deg, #27272a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272a 75%), linear-gradient(-45deg, transparent 75%, #27272a 75%)",
                    backgroundSize: "20px 20px",
                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px"
                  }}
                />
              )}

              {/* Draggable Reference product card */}
              {studioMode === "draw-edit" && (editAction === "add" || editAction === "replace") && referenceImages.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: `${cardPos.x}%`,
                    top: `${cardPos.y}%`,
                    cursor: isDraggingCard ? "grabbing" : "grab",
                    zIndex: 30,
                  }}
                  onMouseDown={onCardMouseDown}
                  className="flex flex-col items-center bg-white p-1.5 rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.5)] border border-slate-200 select-none w-24 group"
                >
                  <div className="relative w-full h-20 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                    <img src={referenceImages[0]} alt="Reference Product" className="max-h-full max-w-full object-contain pointer-events-none" />
                    {referenceImages.length > 1 && (
                      <div className="absolute bottom-1 right-1 bg-violet-600 text-white text-[9px] font-black px-1.5 rounded shadow-sm">
                        +{referenceImages.length - 1}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReferenceImages([]);
                      }}
                      className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition"
                    >
                      <Trash2 className="h-2 w-2" />
                    </button>
                  </div>
                  <span className="mt-1 text-[8px] font-bold text-slate-800 tracking-tight text-center truncate w-full">
                    {referenceImages.length} {referenceImages.length > 1 ? "Objects" : "Object"}
                  </span>
                </div>
              )}

              {/* Active Drawing Canvas */}
              {(videoUrl || imageUrl) ? (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/80 z-20"
                  style={studioMode === "draw-edit" && imageUrl ? {
                    backgroundColor: "#18181b",
                    backgroundImage: "linear-gradient(45deg, #27272a 25%, transparent 25%), linear-gradient(-45deg, #27272a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272a 75%), linear-gradient(-45deg, transparent 75%, #27272a 75%)",
                    backgroundSize: "20px 20px",
                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px"
                  } : undefined}
                >
                  {videoUrl ? (
                    <video src={videoUrl} controls autoPlay loop playsInline className="max-h-full max-w-full rounded" />
                  ) : (
                    <NextImage src={imageUrl} alt="Result" width={1600} height={900} unoptimized className="max-h-full w-auto max-w-full object-contain rounded" />
                  )}
                  
                  <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVideoUrl("");
                        setImageUrl("");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/85 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900 transition-all duration-200"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Back to canvas</span>
                    </button>

                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setBackgroundImage(imageUrl);
                          setImageUrl("");
                          setVideoUrl("");
                          
                          // Clear annotation drawing canvas
                          const canvas = canvasRef.current;
                          const context = canvas?.getContext("2d", { willReadFrequently: true });
                          if (canvas && context) {
                            context.clearRect(0, 0, canvas.width, canvas.height);
                          }
                          
                          // Draw new background image onto the background canvas
                          const imgCanvas = imageCanvasRef.current;
                          const imgContext = imgCanvas?.getContext("2d", { willReadFrequently: true });
                          if (imgCanvas && imgContext) {
                            const image = new Image();
                            image.onload = () => {
                              imgContext.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
                              imgContext.drawImage(image, 0, 0, imgCanvas.width, imgCanvas.height);
                              snapshot();
                            };
                            image.src = imageUrl;
                          } else {
                            snapshot();
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all duration-200"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Apply to Canvas (تطبيق على لوحة الرسم)</span>
                      </button>
                    )}
                  </div>

                  <a
                    href={videoUrl || imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="absolute top-4 right-4 rounded-lg border border-white/10 bg-slate-950/85 p-2 text-white hover:bg-slate-900 transition-all duration-200"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <>
                  {baseVideoUrl ? (
                    <video
                      ref={videoPlayerRef}
                      src={baseVideoUrl}
                      className="absolute inset-0 w-full h-full z-0 pointer-events-none object-fill"
                      loop
                      muted
                      playsInline
                      onPlay={() => setBaseVideoPlaying(true)}
                      onPause={() => setBaseVideoPlaying(false)}
                    />
                  ) : (
                    <canvas
                      ref={imageCanvasRef}
                      className="absolute inset-0 h-full w-full pointer-events-none z-0"
                    />
                  )}
                  <canvas
                    ref={canvasRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    className="absolute inset-0 h-full w-full touch-none z-10 opacity-90"
                    style={{ cursor: getCursorStyle(tool, brushSize) }}
                  />

                  {/* Text layers overlay */}
                  {textLayers.map((layer) => {
                    const isSelected = layer.id === selectedTextId;
                    const isEditing = layer.id === textEditingId;

                    return (
                      <div
                        key={layer.id}
                        style={{
                          position: "absolute",
                          left: `${layer.x}%`,
                          top: `${layer.y}%`,
                          transform: "translate(-50%, -50%)",
                          color: layer.color,
                          fontSize: `${layer.fontSize}px`,
                          fontFamily: layer.fontFamily,
                          fontWeight: "bold",
                          zIndex: 32,
                          cursor: isEditing ? "text" : "move",
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setSelectedTextId(layer.id);
                          if (isEditing) return;
                          draggingTextIdRef.current = layer.id;
                          const rect = e.currentTarget.getBoundingClientRect();
                          dragTextOffsetRef.current = {
                            x: e.clientX - (rect.left + rect.width / 2),
                            y: e.clientY - (rect.top + rect.height / 2),
                          };
                          e.currentTarget.setPointerCapture(e.pointerId);
                        }}
                        onPointerMove={(e) => {
                          if (draggingTextIdRef.current !== layer.id) return;
                          e.stopPropagation();
                          const parentRect = e.currentTarget.parentElement?.getBoundingClientRect();
                          if (parentRect) {
                            const newX = ((e.clientX - parentRect.left - dragTextOffsetRef.current.x) / parentRect.width) * 100;
                            const newY = ((e.clientY - parentRect.top - dragTextOffsetRef.current.y) / parentRect.height) * 100;
                            setTextLayers((prev) =>
                              prev.map((l) => (l.id === layer.id ? { ...l, x: Math.max(0, Math.min(100, newX)), y: Math.max(0, Math.min(100, newY)) } : l))
                            );
                          }
                        }}
                        onPointerUp={(e) => {
                          if (draggingTextIdRef.current === layer.id) {
                            e.stopPropagation();
                            draggingTextIdRef.current = null;
                          }
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setTextEditingId(layer.id);
                        }}
                        className="select-none flex items-center justify-center whitespace-nowrap"
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={layer.text}
                            onChange={(e) =>
                              setTextLayers((prev) => prev.map((l) => (l.id === layer.id ? { ...l, text: e.target.value } : l)))
                            }
                            onBlur={() => setTextEditingId(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setTextEditingId(null);
                            }}
                            className="bg-zinc-950/90 text-inherit border border-violet-500 rounded px-1.5 outline-none font-bold text-center"
                            style={{ fontSize: "inherit", fontFamily: "inherit" }}
                            autoFocus
                          />
                        ) : (
                          <span>{layer.text}</span>
                        )}

                        {/* Dashed Bounding Box Handles */}
                        {isSelected && !isEditing && (
                          <div className="absolute -inset-x-4 -inset-y-2.5 border-2 border-dashed border-sky-400 pointer-events-none rounded">
                            <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-sky-500 rounded-sm animate-pulse" />
                            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-sky-500 rounded-sm animate-pulse" />
                            <span className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-sky-500 rounded-sm animate-pulse" />
                            <span className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-sky-500 rounded-sm animate-pulse" />
                            {/* Top Rotation handle line */}
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-sky-400" />
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-sky-500 rounded-sm" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {/* Upload Initial Prompt Button (If Canvas is Empty) */}
              {!videoUrl && !imageUrl && !backgroundImage && !baseVideoUrl && undoRef.current.length <= 1 && (
                <div className="absolute flex flex-col sm:flex-row gap-4 items-center justify-center z-20">
                  <button
                    type="button"
                    onClick={() => uploadRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-slate-950/85 p-6 text-center text-zinc-500 backdrop-blur-sm hover:border-violet-500/30 hover:text-white transition w-56"
                  >
                    <ImagePlus className="mb-2 h-6 w-6 text-violet-400" />
                    <span className="text-xs font-bold text-zinc-300">Upload base image</span>
                    <span className="mt-1 text-[10px] text-zinc-500 font-medium">Supports PNG, JPG, WEBP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => videoUploadRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-slate-950/85 p-6 text-center text-zinc-500 backdrop-blur-sm hover:border-violet-500/30 hover:text-white transition w-56"
                  >
                    <Video className="mb-2 h-6 w-6 text-indigo-400" />
                    <span className="text-xs font-bold text-zinc-300">Upload base video</span>
                    <span className="mt-1 text-[10px] text-zinc-500 font-medium">Supports MP4, WebM, MOV</span>
                  </button>
                </div>
              )}

              {/* Generating Loading Overlay */}
              {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-md z-50">
                  <div className="text-center p-6 bg-slate-950/80 border border-white/10 rounded-2xl shadow-2xl">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-400" />
                    <p className="mt-3 text-sm font-bold text-white">Generating with {studioMode === "draw-edit" ? selectedEditModel.name : selectedModel.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">Processing media... This may take a few minutes.</p>
                  </div>
                </div>
              )}

              {/* ─── Floating Canvas Toolbar (Docked Bottom Center) ─── */}
              {!videoUrl && !imageUrl && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-zinc-950/90 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 shadow-2xl transition duration-200">
                  {toolItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = tool === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTool(item.id)}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200",
                          isActive
                            ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                        )}
                        title={item.label}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}

                  {baseVideoUrl && (
                    <>
                      <span className="w-px h-4 bg-white/10 mx-0.5" />
                      <button
                        type="button"
                        onClick={() => {
                          const vid = videoPlayerRef.current;
                          if (vid) {
                            if (vid.paused) {
                              void vid.play();
                            } else {
                              vid.pause();
                            }
                          }
                        }}
                        className="flex h-7 px-2.5 items-center gap-1 rounded-full border border-white/10 text-[10px] font-bold text-zinc-400 hover:border-violet-500/30 hover:text-white transition"
                        title={baseVideoPlaying ? "Pause Video" : "Play Video"}
                      >
                        {baseVideoPlaying ? (
                          <>
                            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span>Pause Video</span>
                          </>
                        ) : (
                          <>
                            <span className="h-2 w-2 bg-zinc-500 rounded-full" />
                            <span>Play Video</span>
                          </>
                        )}
                      </button>
                    </>
                  )}

                  <span className="w-px h-4 bg-white/10 mx-0.5" />

                  {/* Brush Color Picker */}
                  <div className="relative flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setPaletteOpen((v) => !v)}
                      className="flex h-6 w-6 items-center justify-center rounded hover:bg-white/5 transition"
                      title="Brush Color"
                    >
                      <span className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-md" style={{ background: color }} />
                    </button>
                    {paletteOpen && (
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-36 rounded-xl border border-white/10 bg-[#0d121f] p-2 shadow-2xl">
                        <p className="mb-1.5 text-[8px] font-black uppercase tracking-widest text-zinc-500 text-center">Color</p>
                        <div className="flex justify-center gap-1.5">
                          {COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setColor(c);
                                if (selectedTextId) {
                                  setTextLayers((prev) =>
                                    prev.map((l) => (l.id === selectedTextId ? { ...l, color: c } : l))
                                  );
                                }
                                setPaletteOpen(false);
                              }}
                              className="h-5 w-5 rounded-full border border-white/10 transition hover:scale-110 cursor-pointer"
                              style={{ background: c }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="w-px h-4 bg-white/10 mx-0.5" />

                  {/* Undo */}
                  <button
                    type="button"
                    onClick={undo}
                    disabled={undoRef.current.length <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:text-white disabled:opacity-20 transition"
                    title="Undo"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </button>

                  {/* Redo */}
                  <button
                    type="button"
                    onClick={redo}
                    disabled={!redoRef.current.length}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:text-white disabled:opacity-20 transition"
                    title="Redo"
                  >
                    <Redo2 className="h-3.5 w-3.5" />
                  </button>

                  <span className="w-px h-4 bg-white/10 mx-0.5" />

                  {/* Clear Canvas */}
                  <button
                    type="button"
                    onClick={resetBlank}
                    className="flex h-7 px-2.5 items-center gap-1 rounded-full border border-white/10 text-[10px] font-bold text-zinc-400 hover:border-rose-500/30 hover:text-rose-400 transition"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* ─── Floating Bottom Prompt Composer ─── */}
          <div className="w-full max-w-2xl mt-4 z-20">
            <div className="bg-[#050914]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 flex flex-col gap-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block ml-1">
                {studioMode === "sketch-video" 
                  ? "Describe the final polished scene"
                  : studioMode === "draw-video" 
                    ? "Describe the motion and camera action"
                    : "Describe the edit action (e.g. place a white mug)"}
              </span>

              {/* Composer Prompt Textarea */}
              <textarea
                placeholder={
                  studioMode === "sketch-video"
                    ? "Describe what the sketch should turn into..."
                    : studioMode === "draw-video"
                      ? "Bicycle rides forward, camera pans left..."
                      : editAction === "remove"
                        ? "Optional: Describe what to remove (e.g. the bird) or leave empty to delete marked area directly..."
                        : "Put the orange juice in the person's hand..."
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
                className="w-full bg-transparent border-none text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-0 resize-none h-14"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void generate();
                  }
                }}
              />

              {/* Bottom Actions Row */}
              <div className="flex items-center justify-between mt-1 border-t border-white/5 pt-2">
                
                {/* Left Side: Upload / Preview Base Image or Video */}
                <div className="flex items-center gap-2">
                  {backgroundImage || baseVideoUrl ? (
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full pl-2 pr-1.5 py-0.5 text-xs text-zinc-300">
                      <span className="text-[10px] font-bold truncate max-w-[120px]">
                        {baseVideoUrl ? "Video loaded" : "Base loaded"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setBackgroundImage("");
                          setBaseVideoUrl("");
                          setBaseVideoFile(null);
                          setBaseVideoPlaying(false);
                        }}
                        className="h-5 w-5 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-rose-400 transition"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => uploadRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white transition text-[11px] font-bold"
                      >
                        <Upload className="h-3 w-3" />
                        <span>Upload image</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => videoUploadRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white transition text-[11px] font-bold"
                      >
                        <Video className="h-3 w-3" />
                        <span>Upload video</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Side: Generate trigger */}
                <button
                  type="button"
                  onClick={generate}
                  disabled={isGenerating || (studioMode !== "draw-edit" || editAction !== "remove" ? !prompt.trim() : false)}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black uppercase text-xs shadow-md shadow-violet-500/20 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Working</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {studioMode === "draw-edit"
                          ? editAction === "remove"
                            ? "Remove Object (حذف مباشر)"
                            : editAction === "replace"
                              ? "Replace Object (معالجة واستبدال)"
                              : editAction === "add"
                                ? "Add Object (إضافة مباشرة)"
                                : "Generate Edit (معالجة الصورة)"
                          : "Generate Video (توليد فيديو)"}
                      </span>
                      <span className="font-sans font-black flex items-center gap-0.5 bg-black/15 px-1.5 py-0.5 rounded text-[10px]">
                        ✦ {estimatedCredits}
                      </span>
                    </>
                  )}
                </button>

              </div>
            </div>
          </div>

        </div>

        {/* ─── Right Settings Panel ─── */}
        <aside className="w-[340px] shrink-0 border-l border-white/10 bg-black/25 flex flex-col h-full overflow-y-auto z-10">
          
          {/* Sidebar Header */}
          <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-200">
              <SlidersHorizontal className="h-4 w-4 text-violet-400" />
              <span>Studio Parameters</span>
            </div>
            {/* Live Credits Badge */}
            <div className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-[9px] font-bold text-violet-300 uppercase tracking-wider">
              {estimatedCredits} credits
            </div>
          </div>

          {/* Settings Body */}
          <div className="p-4 flex flex-col gap-4 flex-1">
            
            {/* AI Model Section */}
            <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-3">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">AI Model</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setModelOpen((v) => !v)}
                  className="flex h-9 w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-zinc-950 px-3 text-xs font-semibold text-zinc-200 hover:bg-white/5"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400 animate-pulse" />
                    <span className="truncate">{studioMode === "draw-edit" ? selectedEditModel.name : selectedModel.name}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-zinc-500" />
                </button>
                {modelOpen && (
                  <div className="absolute top-10 left-0 z-30 max-h-[220px] w-full overflow-y-auto rounded-lg border border-white/10 bg-[#0d121f] p-1.5 shadow-2xl">
                    {(studioMode === "draw-edit" ? EDIT_MODELS : VIDEO_MODELS).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          if (studioMode === "draw-edit") {
                            setSelectedEditModelId(m.id as EditModel["id"]);
                          } else {
                            setSelectedModelId(m.id);
                          }
                          setModelOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center rounded-md px-2.5 py-2 text-left text-xs font-medium hover:bg-white/5 transition",
                          (studioMode === "draw-edit" ? selectedEditModel.id : selectedModel.id) === m.id ? "text-violet-300 bg-white/5" : "text-zinc-400"
                        )}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Artistic Styles Presets */}
            <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-3">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Artistic Style</span>
              <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-0.5">
                {GENERATION_STYLES.map((style) => {
                  const isActive = selectedStyleId === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setSelectedStyleId(style.id)}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-1 rounded-xl border p-1 h-14 text-center transition-all duration-200 overflow-hidden bg-zinc-950",
                        isActive
                          ? "border-violet-500 bg-violet-500/10 shadow-[0_0_12px_rgba(139,92,246,0.25)] text-violet-300 font-bold"
                          : "border-white/5 hover:border-white/10 text-zinc-400 hover:text-white"
                      )}
                    >
                      <img src={style.image} alt={style.label} className="absolute inset-0 h-full w-full object-cover opacity-25 group-hover:opacity-40 transition-opacity" />
                      <div className="absolute inset-0 bg-black/60" />
                      <span className="relative text-[9px] tracking-tight">{style.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aspect Ratio Cards (Saad Studio Shape Style) */}
            <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-3">
              <span className="mb-2.5 block text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Aspect Ratio</span>
              <div className="flex flex-wrap gap-2.5 justify-center">
                {visibleAspects.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAspect(item.id)}
                    className={cn(
                      "ratio-card",
                      item.id === "auto" ? "ratio-auto" : `ratio-${item.id.replace(":", "-")}`,
                      aspect === item.id && "active"
                    )}
                  >
                    <span className="ratio-shape" />
                    <span className="ratio-label">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Inpaint Mode Actions and Product Upload */}
            {studioMode === "draw-edit" ? (
              <div className="flex flex-col gap-3">
                
                {/* Edit Action switcher */}
                <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-3">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Edit Action</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {EDIT_ACTIONS.map((action) => {
                      const isActive = editAction === action.id;
                      return (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => {
                            setEditAction(action.id);
                            if (action.id === "remove") {
                              setColor("rgba(239, 68, 68, 0.55)");
                            } else {
                              setColor("rgba(6, 182, 212, 0.55)");
                            }
                          }}
                          className={cn(
                            "rounded-lg border px-2 py-1.5 text-center text-xs font-bold transition-all duration-200",
                            isActive
                              ? "border-violet-500 bg-violet-500/10 text-violet-300"
                              : "border-white/5 hover:border-white/10 text-zinc-400 hover:text-white"
                          )}
                          title={action.hint}
                        >
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[9px] text-zinc-500 leading-normal">
                    {EDIT_ACTIONS.find((action) => action.id === editAction)?.hint}
                  </p>
                </div>

                {/* Image Quality selection for Edit mode */}
                {editQualityOptions.length > 0 && (
                  <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-3">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Image Quality</span>
                    <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-950 p-0.5 border border-white/5">
                      {editQualityOptions.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setEditQuality(q)}
                          className={cn(
                            "rounded-md py-1 text-[10px] font-bold transition-all duration-200 uppercase",
                            editQuality === q
                              ? "bg-violet-600 text-white shadow-sm"
                              : "text-zinc-400 hover:text-white"
                          )}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product/Object Reference uploader */}
                {(editAction === "add" || editAction === "replace") && (
                  <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Object / Product Reference</span>
                      {referenceImages.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setReferenceImages([])}
                          className="text-[9px] font-bold text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    {referenceImages.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {referenceImages.map((imgUrl, index) => (
                          <div
                            key={index}
                            className="relative group aspect-square rounded-lg border border-white/10 overflow-hidden bg-slate-950 p-1 flex items-center justify-center"
                          >
                            <img src={imgUrl} alt={`Ref ${index}`} className="max-h-full max-w-full object-contain rounded" />
                            <button
                              type="button"
                              onClick={() => setReferenceImages((prev) => prev.filter((_, idx) => idx !== index))}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => referenceUploadRef.current?.click()}
                          className="aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 bg-zinc-950 text-zinc-500 hover:border-violet-500/30 hover:text-white transition"
                        >
                          <Plus className="h-4 w-4" />
                          <span className="text-[8px] font-bold">Add</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => referenceUploadRef.current?.click()}
                        className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 bg-zinc-950 py-3 text-zinc-500 hover:border-violet-500/30 hover:text-white transition"
                      >
                        <ImagePlus className="h-4 w-4 text-zinc-400" />
                        <span className="text-[9px] font-bold">Upload product image</span>
                      </button>
                    )}
                  </div>
                )}

              </div>
            ) : (
              // Video specific options (Duration & Quality)
              <div className="flex flex-col gap-3">
                
                {/* Duration select */}
                <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-3">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Video Duration</span>
                  <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-950 p-0.5 border border-white/5">
                    {selectedModel.durations.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setDuration(v)}
                        className={cn(
                          "rounded-md py-1 text-xs font-bold transition-all duration-200",
                          duration === v
                            ? "bg-violet-600 text-white shadow-sm"
                            : "text-zinc-400 hover:text-white"
                        )}
                      >
                        {v}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolution selection */}
                <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-3">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Resolution</span>
                  {selectedModel.resolutions.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-950 p-0.5 border border-white/5">
                      {selectedModel.resolutions.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setResolution(v)}
                          className={cn(
                            "rounded-md py-1 text-[10px] font-bold transition-all duration-200 uppercase",
                            resolution === v
                              ? "bg-violet-600 text-white shadow-sm"
                              : "text-zinc-400 hover:text-white"
                          )}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs text-zinc-500 border border-white/5 text-center">
                      Provider Native Quality
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Brush Settings Size slider */}
            {/* Text Formatting Controls */}
            {selectedTextId && (
              <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-3">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Text settings</span>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-zinc-400">Font Family</span>
                    <select
                      value={textLayers.find(l => l.id === selectedTextId)?.fontFamily || "sans-serif"}
                      onChange={(e) => {
                        const newFont = e.target.value;
                        setTextLayers((prev) => prev.map((l) => l.id === selectedTextId ? { ...l, fontFamily: newFont } : l));
                      }}
                      className="bg-zinc-950 border border-white/10 rounded px-2 py-1 text-xs text-white"
                    >
                      <option value="sans-serif">Sans Serif</option>
                      <option value="serif">Serif</option>
                      <option value="monospace">Monospace</option>
                      <option value="cursive">Cursive</option>
                      <option value="system-ui">System UI</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-zinc-400 font-bold">Font Size ({textLayers.find(l => l.id === selectedTextId)?.fontSize || 32}px)</span>
                    <input
                      type="range"
                      min={12}
                      max={120}
                      value={textLayers.find(l => l.id === selectedTextId)?.fontSize || 32}
                      onChange={(e) => {
                        const newSize = Number(e.target.value);
                        setTextLayers((prev) => prev.map((l) => l.id === selectedTextId ? { ...l, fontSize: newSize } : l));
                      }}
                      className="h-1 w-full rounded bg-zinc-800 accent-violet-500 cursor-pointer"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTextLayers((prev) => prev.filter(l => l.id !== selectedTextId));
                      setSelectedTextId(null);
                    }}
                    className="mt-1 flex w-full items-center justify-center gap-1.5 rounded bg-rose-600/10 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-600/20 border border-rose-500/20 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Text Layer</span>
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-zinc-400">
                <span>Brush Size</span>
                <span className="font-bold text-violet-400">{brushSize} px</span>
              </div>
              <input
                type="range"
                min={2}
                max={100}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="h-1 w-full rounded bg-zinc-800 accent-violet-500 cursor-pointer"
              />
            </div>

          </div>
        </aside>

        {/* Global Error Banner */}
        {error && (
          <div className="fixed bottom-4 left-6 z-30 max-w-sm rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300 shadow-2xl backdrop-blur-md">
            <div className="flex gap-2 items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>{error}</span>
            </div>
          </div>
        )}

      </div>

      {/* Hidden file inputs */}
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
        ref={videoUploadRef}
        type="file"
        accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importVideo(file);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={referenceUploadRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (event) => {
          const files = event.target.files;
          if (files && files.length > 0) {
            const list: string[] = [];
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              if (file.type.startsWith("image/")) {
                const data = await readFile(file);
                list.push(data);
              }
            }
            if (list.length > 0) {
              setReferenceImages((prev) => [...prev, ...list]);
            }
          }
          event.currentTarget.value = "";
        }}
      />
    </>
  );
}
