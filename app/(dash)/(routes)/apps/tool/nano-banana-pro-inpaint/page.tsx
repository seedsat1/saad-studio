"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Upload,
  Loader2,
  Sparkles,
  Check,
  AlertCircle,
  Undo2,
  Redo2,
  Download,
  Eraser,
  PenTool,
  Plus,
  HelpCircle,
} from "lucide-react";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { cn } from "@/lib/utils";

const CREDIT_COST = 3;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NanoBananaInpaintPage(props: any) {
  const isEmbedded = props?.isEmbedded === true;
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  // Core Media States
  const [mediaUrl, setMediaUrl] = useState<string>("/explore/gallery-soul-cinema-3.jpg");
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number | null>(null);

  // Dynamic media aspect ratio calculation
  useEffect(() => {
    if (!mediaUrl) {
      setMediaAspectRatio(null);
      return;
    }
    const img = new Image();
    img.src = mediaUrl;
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setMediaAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.onerror = () => {
      setMediaAspectRatio(null);
    };
  }, [mediaUrl]);

  const [uploadedMediaList, setUploadedMediaList] = useState<Array<{ url: string; type: "image" | "video" }>>([
    { url: "/explore/gallery-soul-cinema-3.jpg", type: "image" },
    { url: "/explore/gallery-soul-cinema-1.jpg", type: "image" },
    { url: "/explore/gallery-soul-cinema-2.jpg", type: "image" },
    { url: "/explore/gallery-soul-2-1.jpg", type: "image" },
    { url: "/explore/gallery-soul-2-2.jpg", type: "image" },
    { url: "/explore/gallery-mixed-media-1.jpg", type: "image" },
    { url: "/explore/gallery-mixed-media-2.jpg", type: "image" },
    { url: "/explore/gallery-mixed-media-3.jpg", type: "image" },
    { url: "/explore/tool-upscale.jpg", type: "image" },
  ]);

  // Drawing Canvas States
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [brushSize, setBrushSize] = useState(32);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Generation details
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [productImage, setProductImage] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isUploadingProduct, setIsUploadingProduct] = useState(false);

  const lastCoordsRef = useRef<{ x: number; y: number } | null>(null);

  // Initializing blank canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const blank = canvas.toDataURL();
    setHistory([blank]);
    setHistoryIndex(0);
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas, mediaUrl]);

  // Add new media uploads to gallery list
  useEffect(() => {
    if (mediaUrl) {
      setUploadedMediaList((prev) => {
        if (prev.some((item) => item.url === mediaUrl)) return prev;
        return [{ url: mediaUrl, type: "image" as const }, ...prev].slice(0, 10);
      });
    }
  }, [mediaUrl]);

  const handleFileUpload = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setIsUploadingMedia(true);
    setErrorMessage("");
    try {
      let publicUrl = "";

      // Attempt 1: Try multipart/form-data upload via local server
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          publicUrl = data.publicUrl;
        } else {
          throw new Error(`Server returned status ${response.status}`);
        }
      } catch (err) {
        console.warn("Local server upload failed, trying direct browser upload fallback...", err);

        // Attempt 2: Direct browser PUT upload to cloud storage using signed URL
        const signRes = await fetch("/api/media/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
          }),
        });

        if (!signRes.ok) {
          const errText = await signRes.text();
          throw new Error(`Cloud storage signing failed: ${errText}`);
        }

        const { signedUrl, publicUrl: cloudUrl } = await signRes.json();
        if (!signedUrl || !cloudUrl) {
          throw new Error("Failed to receive signed URL from server.");
        }

        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error("Direct cloud upload failed.");
        }

        publicUrl = cloudUrl;
      }

      if (publicUrl) {
        setMediaUrl(publicUrl);
        setShowResult(false);
        initCanvas();
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMessage(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleProductUpload = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setIsUploadingProduct(true);
    setErrorMessage("");
    try {
      let publicUrl = "";

      // Attempt 1: Try multipart/form-data upload via local server
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          publicUrl = data.publicUrl;
        } else {
          throw new Error(`Server returned status ${response.status}`);
        }
      } catch (err) {
        console.warn("Local server upload failed, trying direct browser upload fallback...", err);

        // Attempt 2: Direct browser PUT upload to cloud storage using signed URL
        const signRes = await fetch("/api/media/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
          }),
        });

        if (!signRes.ok) {
          const errText = await signRes.text();
          throw new Error(`Cloud storage signing failed: ${errText}`);
        }

        const { signedUrl, publicUrl: cloudUrl } = await signRes.json();
        if (!signedUrl || !cloudUrl) {
          throw new Error("Failed to receive signed URL from server.");
        }

        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error("Direct cloud upload failed.");
        }

        publicUrl = cloudUrl;
      }

      if (publicUrl) {
        setProductImage(publicUrl);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMessage(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingProduct(false);
    }
  };

  // Canvas Stroke Handling
  const getCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isProcessing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (isEraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.globalAlpha = 1.0;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(220, 38, 38, 0.4)"; // translucent red mask
      ctx.globalAlpha = 1.0;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    setIsDrawing(true);
    lastCoordsRef.current = { x, y };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isProcessing || !lastCoordsRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoords(e);
    const last = lastCoordsRef.current;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (isEraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.globalAlpha = 1.0;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(220, 38, 38, 0.4)";
      ctx.globalAlpha = 1.0;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    lastCoordsRef.current = { x, y };
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastCoordsRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, state]);
    setHistoryIndex(newHistory.length);
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    const img = new Image();
    img.src = history[nextIndex];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1.0;
      ctx.drawImage(img, 0, 0);
    };
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    const img = new Image();
    img.src = history[nextIndex];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1.0;
      ctx.drawImage(img, 0, 0);
    };
  };

  const handleClearMask = () => {
    initCanvas();
  };

  const cycleBrushSize = () => {
    setBrushSize((prev) => {
      if (prev === 16) return 32;
      if (prev === 32) return 64;
      return 16;
    });
  };

  const downloadMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "inpaint-mask.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  async function handleApply() {
    if (isProcessing || !prompt.trim()) return;

    const gate = await guardGeneration({
      requiredCredits: CREDIT_COST,
      action: "apps:nano-banana-pro-inpaint",
    });
    if (!gate.ok) {
      if (gate.reason === "error") {
        setErrorMessage(gate.message ?? getSafeErrorMessage(gate.message));
      }
      return;
    }

    setErrorMessage("");
    setShowResult(false);
    setIsProcessing(true);

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas is not initialized");
      const maskDataUrl = canvas.toDataURL("image/png");

      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          modelId: "google/nano-banana-edit",
          imageUrl: mediaUrl,
          imageUrls: [maskDataUrl],
          aspectRatio: "4:3",
        }),
      });

      if (!response.ok) {
        throw new Error(`Inpaint server returned status ${response.status}`);
      }

      const data = await response.json();
      setMediaUrl(data.imageUrl || data.mediaUrl);
      setShowResult(true);
      initCanvas();
    } catch (err) {
      setErrorMessage(getSafeErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  }

  // Brush styling
  const cursorSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='${brushSize * 2}' height='${brushSize * 2}' viewBox='0 0 ${brushSize * 2} ${brushSize * 2}'><circle cx='${brushSize}' cy='${brushSize}' r='${brushSize - 1}' fill='none' stroke='%23ffffff' stroke-width='1.5' opacity='0.7'/></svg>`;
  const cursorStyle = `url("data:image/svg+xml;utf8,${cursorSvg}") ${brushSize} ${brushSize}, crosshair`;

  // Calculate dynamic dimensions for the canvas container based on aspect ratio
  let containerWidth = 700;
  let containerHeight = 525;
  if (mediaAspectRatio) {
    const maxW = 700;
    const maxH = 525;
    if (mediaAspectRatio > maxW / maxH) {
      containerWidth = maxW;
      containerHeight = maxW / mediaAspectRatio;
    } else {
      containerHeight = maxH;
      containerWidth = maxH * mediaAspectRatio;
    }
  }

  return (
    <div
      className={cn(
        "flex overflow-hidden bg-[#03060d] text-white select-none relative",
        isEmbedded ? "h-full flex-1" : "h-screen"
      )}
      style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.015) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      
      {/* ─── Breadcrumb Title ─── */}
      {!isEmbedded && (
        <div className="absolute top-5 left-6 z-30 flex items-center gap-2">
          <Link href="/apps" className="text-xs text-zinc-500 hover:text-zinc-300 font-bold transition-colors uppercase tracking-wider">
            Apps
          </Link>
          <span className="text-zinc-600 text-xs">/</span>
          <span className="text-zinc-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
            Nano Banana Pro Inpaint
            <span className="text-zinc-500 font-mono text-[9px] ml-1">&gt;</span>
          </span>
        </div>
      )}

      {/* ─── Main Viewport Area ─── */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 relative">
        
        {isProcessing && (
          <div className="absolute inset-0 bg-[#03060d]/80 backdrop-blur-md z-30 flex flex-col items-center justify-center gap-4">
            <div className="h-10 w-10 rounded-full border-2 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <span className="text-sm font-bold text-zinc-300">Google Nano Banana painting mask edits...</span>
          </div>
        )}

        {/* Canvas Image Container */}
        <div
          className="relative rounded-2xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.85)] ring-1 ring-white/10 bg-zinc-950 flex items-center justify-center group"
          style={{
            width: `${containerWidth}px`,
            height: `${containerHeight}px`,
          }}
        >
          
          {/* Base Backdrop Image */}
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none" style={{ backgroundImage: `url('${mediaUrl}')` }} />
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />

          {/* Interactive Mask Painting Canvas */}
          <canvas
            ref={canvasRef}
            width={containerWidth}
            height={containerHeight}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{ cursor: cursorStyle }}
            className="absolute inset-0 z-10 w-full h-full opacity-80"
          />

          {/* Dynamic Status badge */}
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1.5 z-20">
            {showResult ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider">Paint Applied</span>
              </>
            ) : (
              <>
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Masking Ready</span>
              </>
            )}
          </div>

          {/* Download Button */}
          {showResult && (
            <button
              type="button"
              onClick={() => {
                const link = document.createElement("a");
                link.href = mediaUrl;
                link.download = mediaUrl.split("/").pop() || "inpaint-result";
                link.target = "_blank";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="absolute top-4 right-4 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-black font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg z-30 transition-all hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span>Download Result</span>
            </button>
          )}

          {/* Mask Controls Floating Toolbar (Bottom Right of Image) */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsEraser(false)}
              className={cn("p-2 rounded-lg transition-all", !isEraser ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200")}
              title="Brush Tool"
            >
              <PenTool className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsEraser(true)}
              className={cn("p-2 rounded-lg transition-all", isEraser ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200")}
              title="Eraser Tool"
            >
              <Eraser className="h-4 w-4" />
            </button>
            
            {/* Brush Size Toggle */}
            <button
              type="button"
              onClick={cycleBrushSize}
              className="p-2 rounded-lg transition-all text-zinc-400 hover:text-zinc-200 flex items-center justify-center relative"
              title={`Brush size: ${brushSize}px`}
            >
              <div
                className={cn(
                  "rounded-full border transition-all",
                  brushSize === 16 ? "w-2 h-2" : brushSize === 32 ? "w-3 h-3" : "w-4 h-4",
                  "border-cyan-500 bg-cyan-500/20"
                )}
              />
            </button>

            <div className="w-px h-5 bg-white/10 mx-0.5" />

            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Undo Stroke"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Redo Stroke"
            >
              <Redo2 className="h-4 w-4" />
            </button>
            
            <div className="w-px h-5 bg-white/10 mx-0.5" />

            <button
              type="button"
              onClick={downloadMask}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all"
              title="Download Mask PNG"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all"
              title="Help / Guide"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>

        </div>

        {/* Clear All Text Trigger */}
        <button
          type="button"
          onClick={handleClearMask}
          className="mt-4 text-xs font-bold text-zinc-400 hover:text-zinc-200 uppercase tracking-widest transition-colors duration-200"
        >
          Clear all
        </button>

        {/* Floating Presets Sidebar on Left */}
        {mediaUrl && (
          <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-2xl">
            <label className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors group">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploadingMedia}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await handleFileUpload(file);
                }}
              />
              {isUploadingMedia ? (
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
              ) : (
                <span className="text-zinc-400 text-lg font-light group-hover:text-white transition-colors">+</span>
              )}
            </label>
            
            <div className="w-5 h-px bg-white/10" />

            {uploadedMediaList.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setMediaUrl(item.url);
                  setShowResult(false);
                  initCanvas();
                }}
                className={cn(
                  "h-9 w-9 rounded-xl overflow-hidden border transition-all duration-200 hover:scale-105 active:scale-95 relative",
                  mediaUrl === item.url ? "border-cyan-500 ring-2 ring-cyan-500/20" : "border-white/10"
                )}
              >
                <img src={item.url} alt="Preset" className="h-full w-full object-cover pointer-events-none" />
              </button>
            ))}
          </div>
        )}

        {/* Bottom Floating Prompt Card */}
        <div className="mt-6 w-full max-w-2xl">
          <div className="bg-[#050914]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 flex flex-col gap-2.5 shadow-[0_12px_45px_rgba(0,0,0,0.85)]">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block ml-1">
              Paint over area to edit and describe your changes
            </span>
            
            {/* Input field */}
            <textarea
              placeholder="Describe what you want to generate in the painted mask region..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-transparent border-none text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-0 resize-none h-16"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleApply();
                }
              }}
            />

            {/* Bottom Row controls */}
            <div className="flex items-center justify-between mt-1 border-t border-white/5 pt-2">
              
              {/* Product attachment pill */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => productInputRef.current?.click()}
                  disabled={isUploadingProduct}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs font-bold disabled:opacity-50"
                >
                  {isUploadingProduct ? (
                    <Loader2 className="h-3 w-3 animate-spin text-cyan-400 shrink-0" />
                  ) : (
                    <Plus className="h-3 w-3 shrink-0" />
                  )}
                  <span>{isUploadingProduct ? "Uploading..." : "Add product/image"}</span>
                </button>
                
                {productImage && (
                  <div className="relative rounded-lg overflow-hidden border border-white/20 h-7 w-7">
                    <img src={productImage} alt="Product Attachment" className="h-full w-full object-cover" />
                    <button
                      onClick={() => setProductImage(null)}
                      className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-rose-400 transition-opacity"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action execute button */}
              <button
                type="button"
                onClick={handleApply}
                disabled={isProcessing || !prompt.trim()}
                className={cn(
                  "flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-black font-black uppercase text-xs shadow-md shadow-cyan-500/25 transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Working</span>
                  </>
                ) : (
                  <>
                    <span>Generate</span>
                    <span className="font-sans font-black flex items-center gap-0.5 bg-black/10 px-1 py-0.5 rounded text-[10px]">
                      ✦ {CREDIT_COST}
                    </span>
                  </>
                )}
              </button>

            </div>

          </div>
        </div>

      </div>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => handleFileUpload(e.target.files?.[0] as File)} />
      <input ref={productInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => handleProductUpload(e.target.files?.[0] as File)} />

    </div>
  );
}

// Inline X icon definition
function X({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
