"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Upload, X, Loader2, Download, RefreshCw, Sparkles, Zap,
  AlertCircle, CheckCircle,
} from "lucide-react";
import { LightDirectionPicker3D, type LightDirection } from "@/components/enhance-style/LightDirectionPicker3D";

type LightType =
  | "midday"
  | "blue hour light"
  | "low-angle sunlight"
  | "sunrise light"
  | "spotlight on subject"
  | "overcast light"
  | "soft overcast daylight lighting"
  | "cloud-filtered lighting"
  | "fog-diffused lighting"
  | "moonlight lighting"
  | "starlight nighttime"
  | "soft bokeh lighting"
  | "harsh studio lighting";

const B2_LIGHTS = "https://saadstudio-storage.s3.eu-central-003.backblazeb2.com/bria-lights";
const LIGHT_TYPES: Array<{ id: LightType; labelAr: string; labelEn: string; previewUrl: string }> = [
  { id: "midday",                             labelAr: "منتصف النهار",     labelEn: "Midday",              previewUrl: `${B2_LIGHTS}/midday.webp` },
  { id: "sunrise light",                      labelAr: "شروق الشمس",       labelEn: "Sunrise",             previewUrl: `${B2_LIGHTS}/sunrise-light.webp` },
  { id: "low-angle sunlight",                 labelAr: "شمس منخفضة",       labelEn: "Low-Angle Sun",       previewUrl: `${B2_LIGHTS}/low-angle-sunlight.webp` },
  { id: "blue hour light",                    labelAr: "الساعة الزرقاء",   labelEn: "Blue Hour",           previewUrl: `${B2_LIGHTS}/blue-hour-light.webp` },
  { id: "spotlight on subject",               labelAr: "سبوت لايت",        labelEn: "Spotlight",           previewUrl: `${B2_LIGHTS}/spotlight-on-subject.webp` },
  { id: "harsh studio lighting",              labelAr: "استوديو قوي",      labelEn: "Harsh Studio",        previewUrl: `${B2_LIGHTS}/harsh-studio-lighting.webp` },
  { id: "overcast light",                     labelAr: "غيوم",             labelEn: "Overcast",            previewUrl: `${B2_LIGHTS}/overcast-light.webp` },
  { id: "soft overcast daylight lighting",    labelAr: "غيوم ناعمة",       labelEn: "Soft Overcast",       previewUrl: `${B2_LIGHTS}/soft-overcast-daylight-lighting.webp` },
  { id: "cloud-filtered lighting",            labelAr: "مُرشَّح بالغيوم",  labelEn: "Cloud-Filtered",      previewUrl: `${B2_LIGHTS}/cloud-filtered-lighting.webp` },
  { id: "fog-diffused lighting",              labelAr: "ضباب ناعم",        labelEn: "Fog-Diffused",        previewUrl: `${B2_LIGHTS}/fog-diffused-lighting.webp` },
  { id: "soft bokeh lighting",                labelAr: "بوكيه ناعم",       labelEn: "Soft Bokeh",          previewUrl: `${B2_LIGHTS}/soft-bokeh-lighting.webp` },
  { id: "moonlight lighting",                 labelAr: "ضوء القمر",        labelEn: "Moonlight",           previewUrl: `${B2_LIGHTS}/moonlight-lighting.webp` },
  { id: "starlight nighttime",                labelAr: "نجوم الليل",       labelEn: "Starlight",           previewUrl: `${B2_LIGHTS}/starlight-nighttime.webp` },
];

type Status = "idle" | "uploading" | "generating" | "success" | "failed";

/**
 * Rough CSS approximation of Bria's real relight output — instant visual
 * feedback while the user is choosing settings, no API calls burned.
 * Returns { filter, overlay } that are applied to the source image container.
 */
function livePreviewStyles(
  lightType: LightType,
  direction: LightDirection,
): { filter: string; overlay: string; mix: React.CSSProperties["mixBlendMode"]; overlayOpacity: number; vignetteOpacity: number } {
  const dir = direction === "top-down" ? { x: 50, y: 10 }
    : direction === "bottom"           ? { x: 50, y: 90 }
    : direction === "side"             ? { x: 88, y: 50 }
    :                                    { x: 50, y: 50 }; // front

  const map: Record<LightType, { filter: string; color1: string; color2: string; mix: React.CSSProperties["mixBlendMode"]; ovOp: number; vig: number }> = {
    "midday":                          { filter: "brightness(1.14) contrast(1.12) saturate(1.05)", color1: "rgba(255,248,220,0.55)", color2: "rgba(255,220,150,0)",  mix: "soft-light", ovOp: 0.9, vig: 0 },
    "sunrise light":                   { filter: "brightness(1.08) contrast(1.06) saturate(1.20) hue-rotate(-5deg)", color1: "rgba(255,180,110,0.65)", color2: "rgba(255,120,90,0)", mix: "overlay", ovOp: 1.0, vig: 0.05 },
    "low-angle sunlight":              { filter: "brightness(1.12) contrast(1.15) saturate(1.30) hue-rotate(-10deg)", color1: "rgba(255,150,60,0.75)", color2: "rgba(140,50,20,0)", mix: "overlay", ovOp: 1.0, vig: 0.1 },
    "blue hour light":                 { filter: "brightness(0.90) contrast(1.05) saturate(0.85) hue-rotate(15deg)", color1: "rgba(90,110,200,0.65)", color2: "rgba(60,40,120,0)", mix: "overlay", ovOp: 1.0, vig: 0.15 },
    "spotlight on subject":            { filter: "brightness(0.75) contrast(1.35) saturate(1.05)", color1: "rgba(255,240,210,0.6)", color2: "rgba(0,0,0,0)", mix: "overlay", ovOp: 1.0, vig: 0.55 },
    "harsh studio lighting":           { filter: "brightness(1.20) contrast(1.40) saturate(1.00)", color1: "rgba(255,255,255,0.55)", color2: "rgba(255,255,255,0)", mix: "overlay", ovOp: 0.85, vig: 0.10 },
    "overcast light":                  { filter: "brightness(0.98) contrast(0.90) saturate(0.85)", color1: "rgba(200,210,220,0.5)", color2: "rgba(200,210,220,0)", mix: "soft-light", ovOp: 0.7, vig: 0 },
    "soft overcast daylight lighting": { filter: "brightness(1.02) contrast(0.94) saturate(0.90)", color1: "rgba(230,235,240,0.45)", color2: "rgba(230,235,240,0)", mix: "soft-light", ovOp: 0.75, vig: 0 },
    "cloud-filtered lighting":         { filter: "brightness(1.00) contrast(0.98) saturate(0.95)", color1: "rgba(210,220,235,0.5)", color2: "rgba(210,220,235,0)", mix: "soft-light", ovOp: 0.8, vig: 0.03 },
    "fog-diffused lighting":           { filter: "brightness(1.05) contrast(0.85) saturate(0.75) blur(0.3px)", color1: "rgba(200,210,220,0.65)", color2: "rgba(200,210,220,0.1)", mix: "screen", ovOp: 0.95, vig: 0 },
    "soft bokeh lighting":             { filter: "brightness(1.05) contrast(1.05) saturate(1.20) hue-rotate(-8deg)", color1: "rgba(255,180,220,0.55)", color2: "rgba(180,130,220,0.15)", mix: "overlay", ovOp: 1.0, vig: 0.05 },
    "moonlight lighting":              { filter: "brightness(0.75) contrast(1.15) saturate(0.75) hue-rotate(20deg)", color1: "rgba(140,170,220,0.60)", color2: "rgba(30,40,80,0.1)", mix: "overlay", ovOp: 1.0, vig: 0.25 },
    "starlight nighttime":             { filter: "brightness(0.55) contrast(1.20) saturate(0.60) hue-rotate(15deg)", color1: "rgba(120,140,190,0.55)", color2: "rgba(10,15,35,0.3)", mix: "overlay", ovOp: 1.0, vig: 0.40 },
  };
  const m = map[lightType];
  return {
    filter: m.filter,
    overlay: `radial-gradient(circle at ${dir.x}% ${dir.y}%, ${m.color1} 0%, ${m.color2} 65%)`,
    mix: m.mix,
    overlayOpacity: m.ovOp,
    vignetteOpacity: m.vig,
  };
}


function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImage(dataUrl: string, maxBytes = 2_500_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_SIDE = 2048;
      let { width, height } = img;
      if (width > MAX_SIDE || height > MAX_SIDE) {
        const s = MAX_SIDE / Math.max(width, height);
        width = Math.round(width * s);
        height = Math.round(height * s);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.9;
      let result = canvas.toDataURL("image/jpeg", quality);
      while (result.length > maxBytes && quality > 0.3) {
        quality -= 0.1;
        result = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(result);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

export default function BriaRelightPage() {
  const isAr = true;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [srcDataUrl, setSrcDataUrl] = useState<string | null>(null);
  const [lightType, setLightType] = useState<LightType>("midday");
  const [lightDirection, setLightDirection] = useState<LightDirection>("front");
  const [status, setStatus] = useState<Status>("idle");
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isDrag, setIsDrag] = useState(false);
  const busy = status === "uploading" || status === "generating";

  // Elapsed-seconds ticker while generating
  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    const t = setInterval(() => setElapsedSec(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(t);
  }, [busy]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError(isAr ? "الملف يجب أن يكون صورة" : "File must be an image"); return; }
    if (file.size > 20 * 1024 * 1024)     { setError(isAr ? "الحد الأقصى 20MB" : "Max 20MB"); return; }
    setError("");
    setResultUrl(null);
    const raw = await readFileAsDataUrl(file);
    const compressed = await compressImage(raw);
    setSrcDataUrl(compressed);
  };

  const onSubmit = useCallback(async () => {
    if (!srcDataUrl) { setError(isAr ? "ارفع صورة أولاً" : "Upload an image first"); return; }
    setError("");
    setResultUrl(null);
    setStatus("uploading");
    setProgressMsg(isAr ? "جاري رفع الصورة…" : "Uploading image…");
    setElapsedSec(0);

    try {
      setStatus("generating");
      setProgressMsg(isAr ? "المولّد يحسب الإضاءة…" : "Model computing new lighting…");

      const res = await fetch("/api/wavespeed/bria/fibo/relight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: srcDataUrl,
          light_type: lightType,
          light_direction: lightDirection,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.outputUrl) {
        throw new Error(data?.error || `Failed (${res.status})`);
      }
      setResultUrl(data.outputUrl as string);
      setStatus("success");
      setProgressMsg(isAr ? "تم!" : "Done!");
    } catch (e: any) {
      setStatus("failed");
      setError(e?.message || (isAr ? "فشل التوليد" : "Generation failed"));
      setProgressMsg("");
    }
  }, [srcDataUrl, lightType, lightDirection, isAr]);

  const reset = () => {
    setSrcDataUrl(null);
    setResultUrl(null);
    setError("");
    setStatus("idle");
    setProgressMsg("");
    setElapsedSec(0);
  };

  const activeLightMeta = LIGHT_TYPES.find((l) => l.id === lightType) || LIGHT_TYPES[0];

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-[#050810] text-slate-200">
      {/* Header */}
      <div className="border-b border-slate-800/80 bg-[#0b0f1a] sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/apps" className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h1 className="text-sm font-bold text-white">
                  {isAr ? "استوديو الإضاءة" : "Relight Studio"}
                </h1>
                <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">BRIA · FIBO</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {isAr ? "غيّر إضاءة أي صورة بتوجيه ثلاثي الأبعاد" : "Change any photo's lighting with a 3D direction picker"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>{isAr ? "2 credits · ~15-30 ثانية" : "2 credits · ~15-30s"}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
        {/* ── Preview column ──────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Before / After */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {isAr ? "قبل" : "Before"}
              </div>
              {!srcDataUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
                  onDragLeave={() => setIsDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDrag(false);
                    const file = e.dataTransfer?.files?.[0];
                    if (file) handleFile(file);
                  }}
                  className={`aspect-[4/5] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                    isDrag ? "border-amber-400 bg-amber-500/10" : "border-slate-800 hover:border-slate-700 bg-[#0d1017]"
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-slate-200">
                      {isAr ? "اسحب صورة هنا" : "Drop an image here"}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">PNG · JPG · WEBP · حتى 20MB</div>
                  </div>
                </div>
              ) : (() => {
                const preview = livePreviewStyles(lightType, lightDirection);
                return (
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 group">
                  <img
                    src={srcDataUrl}
                    alt="source"
                    className="w-full h-full object-cover"
                    style={{ filter: preview.filter, transition: "filter 0.35s ease" }}
                  />
                  {/* Directional light overlay (mimics Bria's relight before real gen) */}
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: preview.overlay,
                      mixBlendMode: preview.mix,
                      opacity: preview.overlayOpacity,
                      transition: "background 0.35s ease, opacity 0.35s ease",
                    }}
                  />
                  {/* Vignette for spotlight / night scenes */}
                  {preview.vignetteOpacity > 0 && (
                    <div
                      aria-hidden
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: "radial-gradient(circle at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.9) 100%)",
                        opacity: preview.vignetteOpacity,
                        transition: "opacity 0.35s ease",
                      }}
                    />
                  )}
                  {/* Live preview badge */}
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-[9px] font-bold text-amber-200 px-2 py-0.5 rounded-full border border-amber-500/40">
                    {isAr ? "معاينة حية" : "Live preview"}
                  </div>
                  <button
                    onClick={reset}
                    className="absolute top-2 left-2 bg-black/70 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    title={isAr ? "إزالة" : "Remove"}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                );
              })()}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            {/* Result */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                <span>{isAr ? "بعد" : "After"}</span>
                {resultUrl && (
                  <a
                    href={resultUrl}
                    download="relit.jpg"
                    className="text-amber-300 hover:text-amber-200 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>{isAr ? "تنزيل" : "Download"}</span>
                  </a>
                )}
              </div>
              <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 relative flex items-center justify-center">
                {resultUrl && status === "success" && (
                  <img src={resultUrl} alt="result" className="w-full h-full object-cover" />
                )}
                {busy && (
                  <div className="text-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
                    <div className="text-xs font-bold text-slate-300">{progressMsg}</div>
                    <div className="text-[10px] text-slate-500">{elapsedSec}s</div>
                  </div>
                )}
                {status === "failed" && (
                  <div className="text-center space-y-2 px-4">
                    <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                    <div className="text-[11px] text-rose-300">{error}</div>
                    <button onClick={onSubmit} className="text-[10px] text-slate-400 underline hover:text-slate-200 flex items-center gap-1 mx-auto">
                      <RefreshCw className="w-3 h-3" />
                      {isAr ? "إعادة المحاولة" : "Retry"}
                    </button>
                  </div>
                )}
                {status === "idle" && !resultUrl && (
                  <div className="text-slate-600 text-[11px] text-center px-6">
                    {isAr ? "النتيجة ستظهر هنا بعد التوليد" : "Your relit image will appear here"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Light type visual grid */}
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
              <span>{isAr ? "نمط الإضاءة" : "Lighting Style"}</span>
              <div className="flex items-center gap-2 normal-case tracking-normal">
                <span className="text-amber-300 text-[11px] font-normal">
                  {isAr ? activeLightMeta.labelAr : activeLightMeta.labelEn}
                </span>
                {(lightType !== "midday" || lightDirection !== "front") && (
                  <button
                    type="button"
                    onClick={() => { setLightType("midday"); setLightDirection("front"); }}
                    disabled={busy}
                    className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 rounded px-2 py-0.5 transition-colors disabled:opacity-50"
                    title={isAr ? "إعادة إلى الافتراضي (منتصف النهار + أمامي)" : "Reset to default (Midday + Front)"}
                  >
                    {isAr ? "↺ افتراضي" : "↺ Reset"}
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {LIGHT_TYPES.map((lt) => {
                const active = lightType === lt.id;
                return (
                  <button
                    key={lt.id}
                    type="button"
                    onClick={() => setLightType(lt.id)}
                    disabled={busy}
                    className={`group aspect-square rounded-xl border overflow-hidden relative transition-all ${
                      active
                        ? "border-amber-400 ring-2 ring-amber-500/30 scale-[1.03] shadow-lg shadow-amber-500/15"
                        : "border-slate-800 hover:border-slate-600"
                    } disabled:opacity-50 disabled:cursor-not-allowed bg-slate-900`}
                    title={isAr ? lt.labelAr : lt.labelEn}
                  >
                    <img
                      src={lt.previewUrl}
                      alt={isAr ? lt.labelAr : lt.labelEn}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-300"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-1.5 pt-6">
                      <span className="text-[9.5px] font-bold text-white leading-tight block text-center drop-shadow-lg">
                        {isAr ? lt.labelAr : lt.labelEn}
                      </span>
                    </div>
                    {active && (
                      <div className="absolute top-1 right-1 bg-amber-500 text-white rounded-full p-0.5 shadow">
                        <CheckCircle className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Controls column ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-[#0c0f18] border border-slate-800 rounded-2xl p-5">
            <LightDirectionPicker3D
              value={lightDirection}
              onChange={setLightDirection}
              imageUrl={srcDataUrl}
              isAr={isAr}
            />
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!srcDataUrl || busy}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{progressMsg} · {elapsedSec}s</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{isAr ? "أعد إضاءة الصورة" : "Relight Image"}</span>
              </>
            )}
          </button>

          <div className="text-[10px] text-slate-500 leading-relaxed text-center">
            {isAr
              ? "مدعوم بـ Bria Fibo Relight — يحلل بنية المشهد ويعيد إضاءته طبيعياً"
              : "Powered by Bria Fibo Relight — analyzes scene structure and re-lights it naturally"}
          </div>
        </div>
      </div>
    </div>
  );
}
