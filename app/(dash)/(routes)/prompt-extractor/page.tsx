"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  Check,
  Clipboard,
  Download,
  ImageIcon,
  Loader2,
  Sparkles,
  UploadCloud,
  Wand2,
  X,
} from "lucide-react";

import { useGenerationGate } from "@/hooks/use-generation-gate";
import { PROMPT_EXTRACTOR_CREDIT_COST } from "@/lib/prompt-extractor-pricing";

type ExtractState = "idle" | "ready" | "loading" | "done" | "error";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

async function compressImageForExtraction(file: File, maxDimension = 1560, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(String(e.target?.result ?? ""));
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error("Could not load image for processing."));
      img.src = String(e.target?.result ?? "");
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PromptExtractorPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const [imageDataUrl, setImageDataUrl] = useState<string>("");
  const [imageName, setImageName] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<ExtractState>("idle");

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const imageLabel = useMemo(() => {
    if (!imageName) return "Drop image";
    return imageName.length > 34 ? `${imageName.slice(0, 18)}...${imageName.slice(-10)}` : imageName;
  }, [imageName]);

  const acceptFile = useCallback(async (file?: File | null) => {
    if (!file) return;
    setError("");
    setPrompt("");
    setCopied(false);

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setState("error");
      setError("Use JPG, PNG, WEBP, or GIF.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setState("error");
      setError("Image must be under 20 MB.");
      return;
    }

    try {
      const dataUrl = await compressImageForExtraction(file);
      setImageDataUrl(dataUrl);
      setImageName(file.name);
      setState("ready");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not process image.");
    }
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  }, [acceptFile]);

  const extractPrompt = useCallback(async () => {
    if (!imageDataUrl || state === "loading") return;
    setState("loading");
    setError("");
    setCopied(false);

    try {
      const gate = await guardGeneration({
        requiredCredits: PROMPT_EXTRACTOR_CREDIT_COST,
        action: "image:prompt-extractor",
      });
      if (!gate.ok) {
        setState(imageDataUrl ? "ready" : "idle");
        if (gate.reason === "error") setError(gate.message ?? "Could not check credits.");
        return;
      }

      const res = await fetch("/api/prompt-extractor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageDataUrl }),
      });
      const responseText = await res.text().catch(() => "");
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch {
        // Not JSON
      }

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error("حجم الصورة كبير جداً. يرجى استخدام صورة بأبعاد أقل.");
        }
        throw new Error(data?.error || `فشل استخراج البرومبت (رمز ${res.status}).`);
      }

      setPrompt(String(data?.prompt ?? "").trim());
      setState("done");
    } catch (err) {
      setState("error");
      setError(getSafeErrorMessage(err));
    }
  }, [getSafeErrorMessage, guardGeneration, imageDataUrl, state]);

  const copyPrompt = useCallback(async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }, [prompt]);

  const reset = useCallback(() => {
    setImageDataUrl("");
    setImageName("");
    setPrompt("");
    setError("");
    setCopied(false);
    setState("idle");
  }, []);

  return (
    <main className="fixed inset-x-0 bottom-0 top-16 overflow-hidden bg-[#05070b] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.2),rgba(5,7,11,0.9)_42%,rgba(88,28,135,0.18)),linear-gradient(45deg,rgba(20,184,166,0.18),transparent_28%,rgba(244,63,94,0.16)_64%,transparent)]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.16)_0_1px,transparent_1px_72px),repeating-linear-gradient(0deg,rgba(255,255,255,.12)_0_1px,transparent_1px_72px)]" />
        <div className="absolute left-0 top-0 h-full w-full opacity-40 [background-image:linear-gradient(135deg,transparent_0_18%,rgba(255,255,255,.08)_18%_18.4%,transparent_18.4%_40%,rgba(255,255,255,.06)_40%_40.3%,transparent_40.3%)]" />
      </div>

      <section className="relative mx-auto flex h-full w-full max-w-6xl items-center justify-center px-4 py-4">
        <div className="grid h-full max-h-[720px] w-full min-h-0 items-stretch gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex min-h-0 flex-col justify-between border border-white/10 bg-black/35 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/70">Image Prompt</p>
                <h1 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl">Prompt Extractor</h1>
              </div>
              <div className="grid h-12 w-12 place-items-center border border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
                <Sparkles size={22} />
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={[
                "group relative mt-6 flex flex-1 cursor-pointer items-center justify-center overflow-hidden border border-dashed p-4 transition",
                isDragging ? "border-cyan-300 bg-cyan-300/10" : "border-white/15 bg-white/[0.035] hover:border-cyan-300/60",
              ].join(" ")}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={(event) => acceptFile(event.target.files?.[0])}
              />

              {imageDataUrl ? (
                <img src={imageDataUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,.08),transparent_34%,rgba(34,211,238,.08)_65%,rgba(244,63,94,.08))]" />
              )}
              <div className="absolute inset-0 bg-black/45" />
              <div className="relative z-10 flex max-w-sm flex-col items-center text-center">
                <div className="grid h-16 w-16 place-items-center border border-white/15 bg-black/45 text-cyan-100">
                  {imageDataUrl ? <ImageIcon size={28} /> : <UploadCloud size={30} />}
                </div>
                <p className="mt-4 text-lg font-bold text-white">{imageLabel}</p>
                <p className="mt-2 text-sm text-slate-300">JPG / PNG / WEBP</p>
              </div>

              {imageDataUrl && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    reset();
                  }}
                  className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center border border-white/10 bg-black/60 text-white transition hover:bg-white/10"
                  aria-label="Remove image"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={extractPrompt}
              disabled={!imageDataUrl || state === "loading"}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 bg-white text-sm font-black uppercase tracking-[0.18em] text-black transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/35"
            >
              {state === "loading" ? <Loader2 size={17} className="animate-spin" /> : <Wand2 size={17} />}
              Extract · {PROMPT_EXTRACTOR_CREDIT_COST} cr
            </button>
          </div>

          <div className="flex min-h-0 flex-col border border-white/10 bg-[#070a12]/85 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-200/70">Generated Prompt</p>
                <h2 className="mt-2 text-2xl font-black text-white">Studio Prompt</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyPrompt}
                  disabled={!prompt}
                  className="grid h-10 w-10 place-items-center border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/10 disabled:opacity-35"
                  aria-label="Copy prompt"
                  title="Copy"
                >
                  {copied ? <Check size={16} /> : <Clipboard size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => downloadText("saad-image-prompt.txt", prompt)}
                  disabled={!prompt}
                  className="grid h-10 w-10 place-items-center border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/10 disabled:opacity-35"
                  aria-label="Download prompt"
                  title="Download"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>

            <textarea
              value={prompt || (state === "loading" ? "Analyzing image..." : "")}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Your extracted prompt will appear here."
              className="mt-5 min-h-0 flex-1 resize-none border border-white/10 bg-black/35 p-4 text-sm leading-7 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50"
            />

            {error && (
              <div className="mt-4 border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">
                {error}
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              <div className="border border-white/10 bg-white/[0.03] px-2 py-3">Composition</div>
              <div className="border border-white/10 bg-white/[0.03] px-2 py-3">Lighting</div>
              <div className="border border-white/10 bg-white/[0.03] px-2 py-3">Style</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
