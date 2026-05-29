"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Info,
  Lightbulb,
  Layers,
  Scissors,
  Smile,
  Ban,
  RefreshCw,
  Search,
  Brush,
  Zap,
  Play,
  RotateCcw,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";


interface ToolShowcaseProps {
  activeTool: string;
}

export default function ToolShowcase({ activeTool }: ToolShowcaseProps) {
  // Common states
  const [demoState, setDemoState] = useState<string>("initial"); // initial, processing, completed
  const [resetKey, setResetKey] = useState<number>(0);

  // Inpaint States
  const [inpaintBrushed, setInpaintBrushed] = useState(false);

  // Replace States
  const [replaceTarget, setReplaceTarget] = useState<"orange" | "banana" | "diamond">("orange");

  // Relight States
  const [lightX, setLightX] = useState<number>(50);
  const [lightY, setLightY] = useState<number>(50);
  const [lightColor, setLightColor] = useState<string>("#fcd34d");
  const relightContainerRef = useRef<HTMLDivElement>(null);

  // Background Remove States
  const [bgRemoveSlider, setBgRemoveSlider] = useState<number>(50);

  // Outpaint States
  const [outpaintScale, setOutpaintScale] = useState<number>(40);

  // Style States
  const [stylePreset, setStylePreset] = useState<"cyberpunk" | "vangogh" | "neon">("cyberpunk");

  // Draw States
  const [drawStep, setDrawStep] = useState<"sketch" | "color">("sketch");

  // Motion States
  const [motionSpeed, setMotionSpeed] = useState<number>(5);
  const [motionDirection, setMotionDirection] = useState<"forward" | "reverse">("forward");

  // Upscale States
  const [upscaleLensPos, setUpscaleLensPos] = useState({ x: 50, y: 50 });
  const [isHoveringLens, setIsHoveringLens] = useState(false);
  const upscaleContainerRef = useRef<HTMLDivElement>(null);

  // Face Swap States
  const [faceSwapRef, setFaceSwapRef] = useState<"astro" | "cyber" | "royal">("astro");

  // Reset demo when active tool changes
  useEffect(() => {
    setDemoState("initial");
    setInpaintBrushed(false);
    setReplaceTarget("orange");
    setLightX(50);
    setLightY(30);
    setLightColor("#fcd34d");
    setBgRemoveSlider(50);
    setOutpaintScale(40);
    setStylePreset("cyberpunk");
    setDrawStep("sketch");
    setMotionSpeed(5);
    setMotionDirection("forward");
    setFaceSwapRef("astro");
  }, [activeTool, resetKey]);

  // Handle trigger simulation
  const triggerSimulation = () => {
    if (demoState !== "initial") return;
    setDemoState("processing");
    setTimeout(() => {
      setDemoState("completed");
    }, 1200);
  };

  // Relight Drag Handler
  const handleRelightMouseMove = (e: React.MouseEvent) => {
    if (!relightContainerRef.current) return;
    const rect = relightContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLightX(Math.max(0, Math.min(100, x)));
    setLightY(Math.max(0, Math.min(100, y)));
  };

  // Upscale Hover Lens Handler
  const handleUpscaleMouseMove = (e: React.MouseEvent) => {
    if (!upscaleContainerRef.current) return;
    const rect = upscaleContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setUpscaleLensPos({ x, y });
  };

  // ─── RENDERING TOOLS DETAILS ──────────────────────────────────────────

  // Tool specific configurations
  const getToolMeta = () => {
    switch (activeTool) {
      case "inpaint":
        return {
          title: "الترميم الذكي (Smart Inpaint)",
          description: "حذف العناصر غير المرغوب فيها من الصور واستبدالها بخلفية متناسقة تلقائياً.",
          steps: [
            "قم برفع الصورة المراد تعديلها في المساحة المخصصة.",
            "استخدم الفرشاة لتحديد الجزء أو الكائن الذي ترغب في إزالته.",
            "اضغط على Apply ليتولى الذكاء الاصطناعي ترميم الخلفية بذكاء.",
          ],
        };
      case "replace":
        return {
          title: "استبدال العناصر (Object Replace)",
          description: "تحديد أي عنصر داخل الصورة واستبداله بعنصر آخر تماماً عبر الوصف النصي.",
          steps: [
            "قم برفع الصورة وتحديد العنصر المراد تغييره بالفرشاة.",
            "اكتب الوصف النصي للعنصر الجديد (مثلاً: 'كرة ذهبية لامعة').",
            "اضغط Apply ليقوم النموذج بدمج العنصر الجديد بظلال وإضاءة متناسقة.",
          ],
        };
      case "relight":
        return {
          title: "إعادة الإضاءة الذكية (AI Relight)",
          description: "تعديل اتجاه ومصدر الإضاءة وألوانها في الصورة بشكل ثلاثي الأبعاد.",
          steps: [
            "ارفع صورتك الشخصية أو المشهد المراد تعديل إضاءته.",
            "حدد موجه الإضاءة، الشدة، واللون المناسب من لوحة التحكم.",
            "يقوم محرك الذكاء الاصطناعي بإعادة رسم الظلال وتوزيع الإضاءة بدقة.",
          ],
        };
      case "bgremove":
        return {
          title: "إزالة الخلفية (Background Remove)",
          description: "عزل العنصر الأساسي في الصورة وحذف الخلفية تماماً بضغطة زر واحدة.",
          steps: [
            "ارفع صورتك الشخصية أو صورة المنتج الخاص بك.",
            "اضبط درجة التنعيم للحواف (Feather) ونوع الملف المخرجات.",
            "اضغط Apply للحصول على صورة مفرغة شفافة بالكامل وحواف احترافية.",
          ],
        };
      case "outpaint":
        return {
          title: "توسيع الصورة (Expand & Outpaint)",
          description: "تمديد أبعاد الصورة وملء الفراغات الجديدة بمحتوى تخيلي متناسق.",
          steps: [
            "ارفع صورتك واختر أبعاد الإطار الجديد الذي ترغب بتوسيعه.",
            "اختر اتجاهات التوسيع (أعلى، أسفل، يمين، يسار، أو الكل).",
            "يقوم الذكاء الاصطناعي بإنشاء تفاصيل مكملة تحاكي محتوى الصورة الأصلي.",
          ],
        };
      case "style":
        return {
          title: "نقل النمط الفني (Style Transfer)",
          description: "تطبيق أنماط فنية أو ألوان سينمائية مخصصة على الصورة بأكملها أو جزء منها.",
          steps: [
            "ارفع صورتك وحدد ما إذا كنت تريد تطبيق النمط على كامل الصورة أو جزء منها.",
            "اختر الفلتر أو النمط الفني المفضل (سايبربانك، ألوان زيتية، كرتون).",
            "اضغط Apply لدمج تفاصيل النمط المختار مع هيكل صورتك بدقة عالية.",
          ],
        };
      case "draw":
        return {
          title: "الرسم الذكي (Draw to Edit)",
          description: "تحويل الرسم اليدوي التخطيطي البسيط إلى لوحة فنية متكاملة ومجسمة.",
          steps: [
            "ارفع صورة أساسية أو ابدأ بلوحة بيضاء، ثم ارسم خطوطاً تخطيطية.",
            "اكتب وصفاً نصياً يوضح الكائن الذي رسمته ليوجه عملية التوليد.",
            "يقوم الذكاء الاصطناعي بتحويل الرسم البسيط إلى مجسم واقعي ثلاثي الأبعاد.",
          ],
        };
      case "motion":
        return {
          title: "تحريك العناصر (Motion Track Edit)",
          description: "إضافة حركة ديناميكية لعنصر معين داخل الفيديو مع الحفاظ على ثبات المشهد.",
          steps: [
            "ارفع الفيديو وحدد الكائن المراد تتبع حركته أو تعديله.",
            "حدد اتجاه الحركة والسرعة المفضلة من خيارات التحكم الجانبية.",
            "اضغط Apply للحصول على لقطة سينمائية معدلة وثابتة ديناميكياً.",
          ],
        };
      case "upscale":
        return {
          title: "ترقية الجودة والوضوح (AI Upscale)",
          description: "زيادة دقة وحجم الصور والفيديوهات حتى 4K مع إزالة التشويش وتحسين ملامح الوجه.",
          steps: [
            "ارفع الصورة أو الفيديو ذي الدقة المنخفضة.",
            "اختر معدل التكبير المطلوب (2x أو 4x) وقم بتفعيل خيار تحسين ملامح الوجه.",
            "يقوم المحرك بترقية الجودة وتوضيح التفاصيل البصرية الصغيرة والغائبة.",
          ],
        };
      case "faceswap":
        return {
          title: "تبديل الوجوه الاحترافي (Face Swap Pro)",
          description: "دمج وتبديل الوجوه في الصور بدقة واقعية فائقة وخالية من العلامات المائية.",
          steps: [
            "ارفع الصورة الأساسية التي تحتوي على الشخص المراد تبديل وجهه.",
            "ارفع الصورة المرجعية للوجه الجديد الذي ترغب في دمجه.",
            "اضغط Apply ليقوم النظام بملاءمة الإضاءة والجلد والملامح بسلاسة مطلقة.",
          ],
        };
      case "watermark":
        return {
          title: "مزيل العلامات المائية (Watermark Remover)",
          description: "إزالة الشعارات، النصوص، والترجمات المطبوعة من الفيديوهات مع الحفاظ على الجودة البصرية.",
          steps: [
            "ارفع الفيديو الذي يحتوي على علامة مائية أو شعار ترغب بإزالته.",
            "سيتعرف الذكاء الاصطناعي على موقع العلامة المائية وزمنها تلقائياً.",
            "اضغط Apply لمعالجة الفيديو وإعطائك مقطعاً نظيفاً وخالياً من الفليكر والتشويه.",
          ],
        };
      default:
        return {
          title: "أداة ذكاء اصطناعي",
          description: "أداة ذكية متطورة لتعديل وتحرير الوسائط بلمسة واحدة.",
          steps: ["ارفع ملفك المفضل", "اضبط الخيارات الجانبية", "اضغط تطبيق التعديل"],
        };
    }
  };

  const meta = getToolMeta();

  return (
    <div className="space-y-6">
      {/* ─── TITLE & DESCRIPTION ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
            <Zap className="h-3 w-3 fill-current animate-pulse" />
            <span>عرض تفاعلي مباشر</span>
          </span>
          <button
            type="button"
            onClick={() => setResetKey(prev => prev + 1)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
          >
            <RotateCcw className="h-3 w-3" />
            <span>إعادة تعيين</span>
          </button>
        </div>
        <h4 className="text-sm font-black text-slate-100">{meta.title}</h4>
        <p className="text-xs text-zinc-400 leading-relaxed font-semibold">{meta.description}</p>
      </div>

      {/* ─── INTERACTIVE SHOWCASE AREA ─── */}
      <div className="bg-zinc-950/80 border border-white/5 rounded-2xl overflow-hidden relative shadow-inner group select-none">
        
        {/* INPAINT SHOWCASE */}
        {activeTool === "inpaint" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[170px] space-y-4">
            <div className="relative w-full aspect-[16/9] max-w-[240px] rounded-xl overflow-hidden border border-white/10 bg-slate-900 flex items-center justify-center">
              {/* Sky Background */}
              <div className="absolute inset-0 bg-gradient-to-b from-sky-400 to-indigo-500 transition-colors duration-1000" />
              
              {/* Mountains SVG */}
              <svg className="absolute bottom-0 w-full h-12 text-slate-800" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0,20 L15,8 L35,16 L55,4 L80,14 L100,7 L100,20 Z" fill="currentColor" />
              </svg>

              {/* Clouds SVG */}
              <svg className="absolute top-2 left-4 w-12 h-6 text-white/40" viewBox="0 0 24 12" fill="currentColor">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
              </svg>

              {/* Hot Air Balloon (The element to remove) */}
              {demoState !== "completed" && (
                <div 
                  className={cn(
                    "absolute transition-all duration-1000 flex flex-col items-center",
                    inpaintBrushed ? "scale-95 filter brightness-75" : "hover:scale-105"
                  )}
                  style={{ top: "25%", left: "45%" }}
                >
                  <svg className="w-10 h-12 text-rose-500 animate-bounce" viewBox="0 0 20 24" fill="currentColor">
                    {/* Balloon Body */}
                    <path d="M10,0 C4.5,0 0,4.5 0,10 C0,13.5 1.8,16.5 4.5,18.5 L6,22 C6,22.5 6.5,23 7,23 L13,23 C13.5,23 14,22.5 14,22 L15.5,18.5 C18.2,16.5 20,13.5 20,10 C20,4.5 15.5,0 10,0 Z" />
                    {/* Basket */}
                    <rect x="8" y="23.5" width="4" height="2" fill="#78350f" />
                  </svg>

                  {/* Red Brush Stroke Overlay */}
                  {inpaintBrushed && (
                    <div className="absolute inset-0 bg-rose-600/40 rounded-full blur-[2px] border border-rose-500 animate-pulse pointer-events-none" />
                  )}
                </div>
              )}

              {/* Success Cloud replacement */}
              {demoState === "completed" && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute"
                  style={{ top: "25%", left: "45%" }}
                >
                  <svg className="w-10 h-6 text-white/60" viewBox="0 0 24 12" fill="currentColor">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                  </svg>
                </motion.div>
              )}

              {/* Processing Loader */}
              {demoState === "processing" && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                  <div className="h-6 w-6 rounded-full border border-t-cyan-400 border-r-transparent animate-spin" />
                </div>
              )}
            </div>

            {/* Inpaint Controls */}
            <div className="flex gap-2">
              {demoState === "initial" && (
                <button
                  type="button"
                  onClick={() => setInpaintBrushed(true)}
                  disabled={inpaintBrushed}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:border-violet-500/30 text-[10px] font-bold text-zinc-300 flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Brush className="h-3 w-3 text-violet-400" />
                  <span>1. تحديد البالون بالفرشاة</span>
                </button>
              )}
              {inpaintBrushed && demoState === "initial" && (
                <button
                  type="button"
                  onClick={triggerSimulation}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-[10px] font-black text-white flex items-center gap-1.5 animate-bounce"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>2. تطبيق المسح</span>
                </button>
              )}
              {demoState === "completed" && (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                  ✓ تم مسح وترميم الخلفية بنجاح!
                </span>
              )}
            </div>
          </div>
        )}

        {/* OBJECT REPLACE SHOWCASE */}
        {activeTool === "replace" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[170px] space-y-4">
            <div className="relative w-full aspect-[16/9] max-w-[240px] rounded-xl overflow-hidden border border-white/10 bg-zinc-900 flex items-center justify-center">
              
              {/* Bowl Platform */}
              <div className="absolute bottom-2 w-32 h-2.5 rounded-full bg-zinc-800 border-b border-white/5" />

              {/* Initial Apple */}
              {demoState === "initial" && (
                <motion.div 
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="absolute bottom-4 flex flex-col items-center"
                >
                  {/* Apple SVG */}
                  <svg className="w-12 h-12 text-rose-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C10.5 2 9.5 2.5 8.5 3.5 7.5 2.5 6.5 2 5 2 2.2 2 0 4.2 0 7c0 5 6 10 12 15 6-5 12-10 12-15 0-2.8-2.2-5-5-5-1.5 0-2.5.5-3.5 1.5C14.5 2.5 13.5 2 12 2z" />
                    {/* Stem */}
                    <path d="M12 2c0-1 1-2 2-2" stroke="#78350f" strokeWidth="2" fill="none" />
                  </svg>
                  <span className="text-[9px] bg-black/60 px-1.5 py-0.5 rounded-full font-bold text-rose-400 mt-1">تفاحة حمراء</span>
                </motion.div>
              )}

              {/* Processing Loader with scanning bar */}
              {demoState === "processing" && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                  <div className="h-6 w-6 rounded-full border border-t-cyan-400 border-r-transparent animate-spin mb-1" />
                  <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest animate-pulse">استبدال ذكي...</span>
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent top-0 animate-[bounce_1.2s_infinite]" />
                </div>
              )}

              {/* Replaced Object */}
              {demoState === "completed" && (
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  className="absolute bottom-4 flex flex-col items-center"
                >
                  {replaceTarget === "orange" && (
                    <svg className="w-12 h-12 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="5" r="1" fill="#78350f" />
                    </svg>
                  )}
                  {replaceTarget === "banana" && (
                    <svg className="w-12 h-12 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19,3C14,3 10,7 8,11C6,15 6,19 8,21C10,21 11,20 11.5,19.5C10.5,18.5 10.5,16 11.5,13.5C12.5,11 14.5,8.5 18,7C19,6.5 20,6 21,5C21,4.5 20.5,3.5 19,3Z" />
                    </svg>
                  )}
                  {replaceTarget === "diamond" && (
                    <svg className="w-12 h-12 text-cyan-400 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12,2 L2,12 L12,22 L22,12 Z" />
                    </svg>
                  )}
                  <span className="text-[9px] bg-black/60 px-1.5 py-0.5 rounded-full font-black text-cyan-400 mt-1 uppercase tracking-wider">
                    {replaceTarget === "orange" && "برتقالة مضيئة"}
                    {replaceTarget === "banana" && "موزة ناضجة"}
                    {replaceTarget === "diamond" && "جوهرة ثمينة"}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Target Options */}
            <div className="space-y-2 w-full max-w-[240px]">
              <div className="flex justify-between items-center gap-1">
                <span className="text-[9px] font-bold text-zinc-500">اختر العنصر الجديد:</span>
                <div className="flex gap-1.5">
                  {(["orange", "banana", "diamond"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setReplaceTarget(t);
                        setDemoState("initial");
                      }}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[9px] font-bold border transition-all",
                        replaceTarget === t
                          ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                          : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      {t === "orange" && "برتقالة"}
                      {t === "banana" && "موزة"}
                      {t === "diamond" && "ماسة"}
                    </button>
                  ))}
                </div>
              </div>
              
              {demoState === "initial" && (
                <button
                  type="button"
                  onClick={triggerSimulation}
                  className="w-full py-1 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 text-[10px] font-black text-white flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>تطبيق الاستبدال السحري</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* AI RELIGHT SHOWCASE */}
        {activeTool === "relight" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[170px] space-y-4">
            <div 
              ref={relightContainerRef}
              onMouseMove={handleRelightMouseMove}
              className="relative w-full aspect-[16/9] max-w-[240px] rounded-xl overflow-hidden border border-white/10 bg-slate-950 cursor-crosshair flex items-center justify-center"
            >
              {/* Silhouette Head */}
              <svg className="w-20 h-20 text-zinc-800 z-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2 C6.5,2 2,6.5 2,12 C2,15.5 3.8,18.5 6.5,20.5 L6,22 C6,22.5 6.5,23 7,23 L17,23 C17.5,23 18,22.5 18,22 L17.5,20.5 C20.2,18.5 22,15.5 22,12 C22,6.5 17.5,2 12,2 Z" />
              </svg>

              {/* Dynamic Radial Lighting Overlay */}
              <div 
                className="absolute inset-0 pointer-events-none mix-blend-color-dodge transition-all duration-75"
                style={{
                  background: `radial-gradient(circle 70px at ${lightX}% ${lightY}%, ${lightColor} 0%, transparent 100%)`
                }}
              />

              {/* Glowing Bulb source indicator */}
              <div 
                className="absolute h-4.5 w-4.5 rounded-full bg-white shadow-2xl flex items-center justify-center -translate-x-1/2 -translate-y-1/2 transition-all duration-75 pointer-events-none"
                style={{
                  left: `${lightX}%`,
                  top: `${lightY}%`,
                  boxShadow: `0 0 20px 4px ${lightColor}`
                }}
              >
                <Lightbulb className="h-2.5 w-2.5 text-zinc-950 fill-current" />
              </div>
            </div>

            {/* Relight Controls */}
            <div className="w-full max-w-[240px] space-y-2">
              <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500">
                <span>اسحب مصباح الإضاءة في الأعلى لمعاينة الظل</span>
                <div className="flex gap-1">
                  {(["#fcd34d", "#f43f5e", "#3b82f6"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setLightColor(c)}
                      className="h-3 w-3 rounded-full border border-white/20 transition-transform active:scale-90"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BACKGROUND REMOVE SHOWCASE */}
        {activeTool === "bgremove" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[170px] space-y-4">
            <div className="relative w-full aspect-[16/9] max-w-[240px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center">
              
              {/* Checkered transparent background */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:12px_12px]" />

              {/* Original Background Landscape (visible left of slider) */}
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-900 to-purple-800 transition-all overflow-hidden"
                style={{ width: `${bgRemoveSlider}%` }}
              >
                <div className="w-[240px] h-[135px] relative">
                  {/* Sky/Galaxy Elements */}
                  <div className="absolute top-2 left-6 h-6 w-6 rounded-full bg-yellow-100/20 blur-[1px]" />
                  <div className="absolute bottom-0 w-full h-8 bg-zinc-800" />
                </div>
              </div>

              {/* Astronaut Character (The Subject) */}
              <div className="absolute z-10 flex flex-col items-center justify-center pointer-events-none">
                <svg className="w-14 h-16 text-slate-100 filter drop-shadow-xl" viewBox="0 0 24 24" fill="currentColor">
                  {/* Helmet */}
                  <circle cx="12" cy="7" r="5" />
                  <ellipse cx="12" cy="7" rx="3.5" ry="2.5" fill="#080e1b" />
                  {/* Body suit */}
                  <path d="M6,14 C6,12.5 7.5,12 12,12 C16.5,12 18,12.5 18,14 L18,22 C18,22.5 17.5,23 17,23 L7,23 C6.5,23 6,22.5 6,22 Z" />
                </svg>
              </div>

              {/* Split Slider Line */}
              <div 
                className="absolute inset-y-0 w-0.5 bg-rose-500 cursor-ew-resize z-20"
                style={{ left: `${bgRemoveSlider}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-rose-500 border border-white flex items-center justify-center shadow-lg">
                  <span className="text-[8px] font-black text-white font-mono">↔</span>
                </div>
              </div>

              {/* Invisible slider input for dragging */}
              <input
                type="range"
                min="0"
                max="100"
                value={bgRemoveSlider}
                onChange={(e) => setBgRemoveSlider(Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-ew-resize z-30"
              />
            </div>
            
            <span className="text-[9px] font-bold text-zinc-500">اسحب الشريط لمعاينة عزل الخلفية بالكامل</span>
          </div>
        )}

        {/* EXPAND & OUTPAINT SHOWCASE */}
        {activeTool === "outpaint" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[170px] space-y-4">
            <div className="relative w-full aspect-[16/9] max-w-[240px] rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center">
              
              {/* Inner Original Canvas */}
              <div 
                className="border-2 border-dashed border-emerald-500/40 rounded bg-slate-900 transition-all flex items-center justify-center overflow-hidden"
                style={{
                  width: `${100 - outpaintScale}%`,
                  height: `${100 - outpaintScale}%`
                }}
              >
                {/* SVG Landscape Inside Core */}
                <svg className="w-16 h-16 text-emerald-400/80" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2 C6.48,2 2,6.48 2,12 C2,17.52 6.48,22 12,22 C17.52,22 22,17.52 22,12 C22,6.48 17.52,2 12,2 Z M12,4 C16.42,4 20,7.58 20,12 C20,13.82 19.39,15.5 18.38,16.85 L14.85,13.32 C15.56,12.11 15.34,10.51 14.19,9.36 C12.94,8.11 10.92,8.11 9.67,9.36 C8.52,10.51 8.3,12.11 9.01,13.32 L5.48,16.85 C4.47,15.5 3.82,13.82 3.82,12 C3.82,7.58 7.4,4 12,4 Z" />
                </svg>
              </div>

              {/* Generative expanded areas (faded edges) */}
              <div className="absolute inset-0 pointer-events-none border border-emerald-500/10 flex items-center justify-center">
                <span className="text-[8px] font-bold text-emerald-400/30 uppercase tracking-widest absolute top-1">توليد الفراغات...</span>
              </div>
            </div>

            {/* Outpaint Slider */}
            <div className="w-full max-w-[240px] space-y-1">
              <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500">
                <span>نسبة توسيع الإطار:</span>
                <span className="text-emerald-400 font-mono">%{outpaintScale}</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                value={outpaintScale}
                onChange={(e) => setOutpaintScale(Number(e.target.value))}
                className="w-full accent-emerald-500 h-1 rounded bg-zinc-800"
              />
            </div>
          </div>
        )}

        {/* STYLE TRANSFER SHOWCASE */}
        {activeTool === "style" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[170px] space-y-4">
            <div className="relative w-full aspect-[16/9] max-w-[240px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center">
              
              {/* Core SVG Structure (City Skyline) */}
              <svg 
                className={cn(
                  "w-36 h-20 transition-all duration-500",
                  stylePreset === "cyberpunk" && "text-pink-500 drop-shadow-[0_0_8px_#ec4899]",
                  stylePreset === "vangogh" && "text-amber-500/80 saturate-150 blur-[0.3px]",
                  stylePreset === "neon" && "text-cyan-400 drop-shadow-[0_0_12px_#22d3ee]"
                )}
                viewBox="0 0 100 50" 
                fill="currentColor"
              >
                <rect x="5" y="20" width="10" height="30" />
                <rect x="20" y="10" width="15" height="40" />
                <rect x="40" y="25" width="12" height="25" />
                <rect x="55" y="5" width="8" height="45" />
                <rect x="68" y="18" width="14" height="32" />
                <rect x="85" y="12" width="10" height="38" />
              </svg>

              {/* Dynamic ambient color overlays */}
              <div 
                className="absolute inset-0 pointer-events-none mix-blend-overlay transition-colors duration-500"
                style={{
                  background: stylePreset === "cyberpunk" 
                    ? "linear-gradient(to top, rgba(236,72,153,0.3), rgba(139,92,246,0.1))" 
                    : stylePreset === "vangogh"
                    ? "linear-gradient(to top, rgba(245,158,11,0.25), rgba(59,130,246,0.15))"
                    : "linear-gradient(to top, rgba(6,182,212,0.35), transparent)"
                }}
              />
            </div>

            {/* Style Selector Chips */}
            <div className="flex gap-2">
              {(["cyberpunk", "vangogh", "neon"] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setStylePreset(style)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[9px] font-black border uppercase tracking-wider transition-all",
                    stylePreset === style
                      ? "bg-pink-500/10 border-pink-500/30 text-pink-400"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {style === "cyberpunk" && "سايبربانك"}
                  {style === "vangogh" && "ألوان زيتية"}
                  {style === "neon" && "نيون مستقبلي"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DRAW TO EDIT SHOWCASE */}
        {activeTool === "draw" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[170px] space-y-4">
            <div className="relative w-full aspect-[16/9] max-w-[240px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center">
              
              {/* The sketch lines */}
              {drawStep === "sketch" && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  <svg className="w-20 h-20 text-zinc-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
                    {/* Hand-drawn flower sketch */}
                    <circle cx="50" cy="50" r="10" />
                    <path d="M50,15 C40,25 40,35 50,40 C60,35 60,25 50,15 Z" />
                    <path d="M50,85 C40,75 40,65 50,60 C60,65 60,75 50,85 Z" />
                    <path d="M15,50 C25,40 35,40 40,50 C35,60 25,60 15,50 Z" />
                    <path d="M85,50 C75,40 65,40 60,50 C65,60 75,60 85,50 Z" />
                  </svg>
                  <span className="text-[8px] text-zinc-500 font-bold mt-1">الرسم التخطيطي الأولي (سكيتش)</span>
                </motion.div>
              )}

              {/* Glowing processed AI art */}
              {drawStep === "color" && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center"
                >
                  <svg className="w-20 h-20 text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]" viewBox="0 0 100 100" fill="currentColor">
                    {/* Detailed AI rendered flower */}
                    <circle cx="50" cy="50" r="12" fill="#3b82f6" />
                    <path d="M50,10 C42,25 42,38 50,45 C58,38 58,25 50,10 Z" fill="#60a5fa" />
                    <path d="M50,90 C42,75 42,62 50,55 C58,62 58,75 50,90 Z" fill="#60a5fa" />
                    <path d="M10,50 C25,42 38,42 45,50 C38,58 25,58 10,50 Z" fill="#93c5fd" />
                    <path d="M90,50 C75,42 62,42 55,50 C62,58 75,58 90,50 Z" fill="#93c5fd" />
                  </svg>
                  <span className="text-[9px] text-blue-400 font-black mt-1 uppercase tracking-wider animate-pulse">توليد مجسم واقعي</span>
                </motion.div>
              )}
            </div>

            {/* Toggle trigger buttons */}
            <button
              type="button"
              onClick={() => setDrawStep(prev => prev === "sketch" ? "color" : "sketch")}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:border-blue-500/30 text-[10px] font-bold text-zinc-300 flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              {drawStep === "sketch" ? (
                <>
                  <Sparkles className="h-3 w-3 text-blue-400 animate-pulse" />
                  <span>انقر للتوليد والتحويل</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-3 w-3" />
                  <span>العودة للمخطط الأول</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* MOTION TRACK SHOWCASE */}
        {activeTool === "motion" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[170px] space-y-4">
            <div className="relative w-full aspect-[16/9] max-w-[240px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center">
              
              {/* Path track line */}
              <div className="absolute inset-x-4 h-0.5 border-t border-dashed border-zinc-700/60 top-1/2" />

              {/* Rocket (Animating element) */}
              <div 
                className="absolute transition-all duration-300 flex flex-col items-center"
                style={{
                  top: "35%",
                  left: "30%",
                  animation: `bounce ${10 / motionSpeed}s infinite ease-in-out`
                }}
              >
                <svg className="w-10 h-10 text-orange-500 rotate-90" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2 C12,2 9,6 9,12 C9,17 12,22 12,22 C12,22 15,17 15,12 C15,6 12,2 12,2 Z" />
                  {/* Fire */}
                  <path d="M10,22 L12,24 L14,22" fill="#ef4444" className="animate-pulse" />
                </svg>
              </div>

              {/* Direction Indicator */}
              <div className="absolute top-1 right-2 text-[8px] font-mono text-orange-400/60">
                TRACKING: {motionDirection.toUpperCase()}
              </div>
            </div>

            {/* Motion Controls */}
            <div className="w-full max-w-[240px] space-y-2">
              <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500">
                <span>تعديل سرعة التتبع:</span>
                <span className="text-orange-400 font-mono">{motionSpeed}x</span>
              </div>
              <input
                type="range"
                min="2"
                max="10"
                value={motionSpeed}
                onChange={(e) => setMotionSpeed(Number(e.target.value))}
                className="w-full accent-orange-500 h-1 rounded bg-zinc-800"
              />
            </div>
          </div>
        )}

        {/* AI UPSCALE SHOWCASE */}
        {activeTool === "upscale" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[170px] space-y-4">
            <div 
              ref={upscaleContainerRef}
              onMouseMove={handleUpscaleMouseMove}
              onMouseEnter={() => setIsHoveringLens(true)}
              onMouseLeave={() => setIsHoveringLens(false)}
              className="relative w-full aspect-[16/9] max-w-[240px] rounded-xl overflow-hidden border border-white/10 bg-slate-900 cursor-none flex items-center justify-center"
            >
              {/* Blur pixelated image (Initial low quality) */}
              <div className="absolute inset-0 flex items-center justify-center blur-[3px] select-none filter contrast-125">
                <svg className="w-24 h-24 text-teal-800" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2 L2,22 L22,22 Z" />
                </svg>
              </div>

              {/* Lens showing high detail */}
              {isHoveringLens && (
                <div 
                  className="absolute h-16 w-16 rounded-full border-2 border-teal-400 shadow-2xl overflow-hidden pointer-events-none flex items-center justify-center -translate-x-1/2 -translate-y-1/2 bg-slate-900"
                  style={{
                    left: `${upscaleLensPos.x}%`,
                    top: `${upscaleLensPos.y}%`,
                  }}
                >
                  {/* Scaled-up and sharp detail vector */}
                  <div className="scale-[2] absolute">
                    <svg className="w-12 h-12 text-teal-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12,2 L2,22 L22,22 Z" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Cursor indicator */}
              {!isHoveringLens && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/35 backdrop-blur-[1px]">
                  <span className="text-[9px] font-bold text-teal-400 uppercase tracking-widest flex items-center gap-1">
                    <Search className="h-3 w-3" />
                    <span>مرر الفأرة فوق الصورة للمقارنة</span>
                  </span>
                </div>
              )}
            </div>

            <span className="text-[9px] font-bold text-zinc-500">عدسة التكبير توضح الفرق بين الدقة المنخفضة والترقية بـ AI</span>
          </div>
        )}

        {/* FACE SWAP PRO SHOWCASE */}
        {activeTool === "faceswap" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[170px] space-y-4">
            <div className="relative w-full aspect-[16/9] max-w-[240px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center">
              
              {/* Outer target frame with current avatar */}
              <div className="relative flex flex-col items-center">
                {/* Body shape */}
                <svg className="w-16 h-16 text-zinc-800" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,12 C15,12 18,12.5 18,14 L18,22 C18,22.5 17.5,23 17,23 L7,23 C6.5,23 6,22.5 6,22 L6,14 C6,12.5 9,12 12,12 Z" />
                </svg>

                {/* Swapped Face Slot */}
                <div className="absolute top-1 h-9.5 w-9.5 rounded-full overflow-hidden border border-white/10 bg-zinc-900 flex items-center justify-center">
                  <motion.div
                    key={faceSwapRef}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {faceSwapRef === "astro" && (
                      <svg className="w-7 h-7 text-cyan-400 fill-current" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <ellipse cx="12" cy="12" rx="6" ry="4" fill="#0c1328" />
                      </svg>
                    )}
                    {faceSwapRef === "cyber" && (
                      <svg className="w-7 h-7 text-fuchsia-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,2 C6.48,2 2,6.48 2,12 C2,17.52 6.48,22 12,22 C17.52,22 22,17.52 22,12 C22,6.48 17.52,2 12,2 Z M12,18 L8,14 L16,14 Z" />
                      </svg>
                    )}
                    {faceSwapRef === "royal" && (
                      <svg className="w-7 h-7 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2,22 L22,22 L19,10 L15,14 L12,8 L9,14 L5,10 Z" />
                      </svg>
                    )}
                  </motion.div>
                </div>
              </div>

              {/* Floating success banner */}
              <div className="absolute bottom-1 right-2 text-[8px] bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20 px-1 rounded font-bold">
                PRO ACTIVE
              </div>
            </div>

            {/* Choose Reference Cards */}
            <div className="flex gap-2">
              {(["astro", "cyber", "royal"] as const).map((face) => (
                <button
                  key={face}
                  type="button"
                  onClick={() => setFaceSwapRef(face)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[9px] font-black border uppercase tracking-wider transition-all",
                    faceSwapRef === face
                      ? "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {face === "astro" && "رائد فضاء"}
                  {face === "cyber" && "سايبربانك"}
                  {face === "royal" && "تاجر/ملكي"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* WATERMARK REMOVER SHOWCASE */}
        {activeTool === "watermark" && (
          <div className="p-4 flex flex-col items-center justify-center min-h-[170px] space-y-4">
            <div className="relative w-full aspect-[16/9] max-w-[240px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center">
              
              {/* Video frame dummy representation */}
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950" />

              {/* Watermark Logo text overlay */}
              {demoState !== "completed" && (
                <div 
                  className={cn(
                    "absolute top-2 right-2 text-[10px] font-black text-white/40 tracking-wider bg-black/35 px-1.5 py-0.5 rounded border border-white/5 select-none",
                    demoState === "processing" && "animate-pulse border-red-500/30 text-red-500/50"
                  )}
                >
                  WATERMARK
                </div>
              )}

              {/* Caption Overlay */}
              {demoState !== "completed" && (
                <div className="absolute bottom-2 text-[8px] font-bold text-yellow-100/50 text-center w-full">
                  [ترجمة ونصوص أسفل المقطع]
                </div>
              )}

              {/* Laser line scanning effect */}
              {demoState === "processing" && (
                <div className="absolute inset-y-0 w-0.5 bg-indigo-500 shadow-[0_0_12px_#6366f1] animate-[pulse_0.4s_infinite]"
                  style={{
                    animationName: "leftToRight",
                    animationDuration: "1.2s",
                    animationIterationCount: "infinite"
                  }}
                />
              )}

              {/* Success Result Display */}
              {demoState === "completed" && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute bottom-2 right-2 bg-emerald-500/20 text-emerald-400 text-[8px] px-1 rounded font-bold"
                >
                  ✓ مقطع نظيف بالكامل
                </motion.div>
              )}

              {/* Loader overlay */}
              {demoState === "processing" && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[0.5px] flex items-center justify-center">
                  <div className="h-5 w-5 rounded-full border border-t-indigo-400 border-r-transparent animate-spin" />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {demoState === "initial" && (
                <button
                  type="button"
                  onClick={triggerSimulation}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:border-indigo-500/30 text-[10px] font-bold text-zinc-300 flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Ban className="h-3 w-3 text-indigo-400" />
                  <span>انقر لتطبيق إزالة العلامة</span>
                </button>
              )}
              {demoState === "completed" && (
                <button
                  type="button"
                  onClick={() => setDemoState("initial")}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-[9px] font-bold text-zinc-400 hover:text-zinc-200"
                >
                  إعادة المعاينة
                </button>
              )}
            </div>

            {/* Custom Animation Keyframes for scanner */}
            <style jsx global>{`
              @keyframes leftToRight {
                0% { left: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { left: 100%; opacity: 0; }
              }
            `}</style>
          </div>
        )}

      </div>

      {/* ─── MECHANISM OF ACTION (STEP-BY-STEP) ─── */}
      <div className="space-y-3.5 border-t border-white/5 pt-4">
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Info className="h-4 w-4 shrink-0 text-cyan-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider">آلية عمل الأداة وخطوات التنفيذ</span>
        </div>

        <div className="space-y-3 pl-1">
          {meta.steps.map((step, idx) => (
            <div key={idx} className="flex gap-3 items-start group">
              {/* Number Badge */}
              <div className="h-5 w-5 rounded-full bg-zinc-900 border border-white/10 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/5 text-[9px] font-black text-zinc-400 group-hover:text-cyan-400 flex items-center justify-center shrink-0 transition-colors">
                {idx + 1}
              </div>
              
              {/* Content */}
              <p className="text-[10.5px] text-zinc-400 group-hover:text-zinc-300 leading-relaxed font-semibold transition-colors mt-0.5">
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
