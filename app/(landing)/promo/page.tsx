"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Wand2, 
  Scissors, 
  Aperture, 
  Video, 
  Layers, 
  Play, 
  Pause, 
  RefreshCw, 
  Download, 
  ArrowRight, 
  Check, 
  Sliders, 
  Compass, 
  Eye, 
  ZoomIn, 
  Zap, 
  ChevronRight, 
  Monitor, 
  Maximize2 
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// --- Types ---
type ToolId = "relight" | "faceswap" | "inpaint" | "upscale" | "transitions";

interface ToolItem {
  id: ToolId;
  labelAr: string;
  labelEn: string;
  icon: any;
  color: string;
  glow: string;
  badgeAr: string;
  badgeEn: string;
}

const TOOLS: ToolItem[] = [
  {
    id: "relight",
    labelAr: "تعديل الإضاءة AI",
    labelEn: "AI Relight",
    icon: Compass,
    color: "text-amber-400",
    glow: "shadow-amber-500/25",
    badgeAr: "مباشر",
    badgeEn: "Live",
  },
  {
    id: "faceswap",
    labelAr: "تبديل الوجوه",
    labelEn: "Face Swap Pro",
    icon: Sparkles,
    color: "text-cyan-400",
    glow: "shadow-cyan-500/25",
    badgeAr: "دقيق",
    badgeEn: "HQ",
  },
  {
    id: "inpaint",
    labelAr: "التعديل الذكي Inpaint",
    labelEn: "Smart Inpaint",
    icon: Scissors,
    color: "text-emerald-400",
    glow: "shadow-emerald-500/25",
    badgeAr: "توليدي",
    badgeEn: "GenAI",
  },
  {
    id: "upscale",
    labelAr: "رفع الدقة الفائق",
    labelEn: "AI Upscale",
    icon: ZoomIn,
    color: "text-purple-400",
    glow: "shadow-purple-500/25",
    badgeAr: "8K",
    badgeEn: "8K Ultra",
  },
  {
    id: "transitions",
    labelAr: "انتقالات سينمائية",
    labelEn: "AI Transitions",
    icon: Video,
    color: "text-pink-400",
    glow: "shadow-pink-500/25",
    badgeAr: "جديد",
    badgeEn: "New",
  },
];

export default function PromoPage() {
  const [activeTool, setActiveTool] = useState<ToolId>("relight");
  const [isPlaying, setIsPlaying] = useState(true);
  const [playheadProgress, setPlayheadProgress] = useState(25); // 0 to 100%
  const [lang, setLang] = useState<"ar" | "en">("ar");
  
  // States for AI Relight
  const [lightPos, setLightPos] = useState({ x: 50, y: 35 }); // percentage relative to container
  const [brightness, setBrightness] = useState(130);
  const [lightColor, setLightColor] = useState("#f59e0b"); // amber-500
  const [lightRadius, setLightRadius] = useState(45); // percentage size
  const relightContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingLight = useRef(false);

  // States for AI Upscale
  const [sliderPos, setSliderPos] = useState(50); // percentage split
  const upscaleContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingSlider = useRef(false);

  // States for Smart Inpaint
  const [inpaintStage, setInpaintStage] = useState<"idle" | "drawing" | "rendering" | "done">("idle");
  const [inpaintPrompt, setInpaintPrompt] = useState("emerald necklace");
  const [dressColor, setDressColor] = useState<"original" | "emerald" | "red" | "gold">("original");

  // States for Face Swap
  const [faceSwapTarget, setFaceSwapTarget] = useState<"model" | "celebrity1" | "celebrity2">("model");
  const [isSwapping, setIsSwapping] = useState(false);

  // States for AI Transitions
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [activeTransition, setActiveTransition] = useState<"zoom" | "leak" | "glitch">("zoom");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Language state effect
  useEffect(() => {
    const savedLang = localStorage.getItem("saad_language");
    if (savedLang === "ar" || savedLang === "en") {
      setLang(savedLang);
    }
  }, []);

  // Animating the playhead timeline
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPlayheadProgress((prev) => {
        if (prev >= 99.5) {
          return 0;
        }
        return prev + 0.15;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle Dragging Light Source (Relight)
  const handleLightMove = useCallback((clientX: number, clientY: number) => {
    if (!relightContainerRef.current) return;
    const rect = relightContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    setLightPos({ x, y });
  }, []);

  const handleLightStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDraggingLight.current = true;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    handleLightMove(clientX, clientY);
  };

  // Handle Dragging Upscale Split Bar
  const handleSliderMove = useCallback((clientX: number) => {
    if (!upscaleContainerRef.current) return;
    const rect = upscaleContainerRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pos);
  }, []);

  const handleSliderStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDraggingSlider.current = true;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    handleSliderMove(clientX);
  };

  // Global mouse listeners for dragging
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      if (isDraggingLight.current) {
        handleLightMove(clientX, clientY);
      }
      if (isDraggingSlider.current) {
        handleSliderMove(clientX);
      }
    };

    const handleGlobalUp = () => {
      isDraggingLight.current = false;
      isDraggingSlider.current = false;
    };

    window.addEventListener("mousemove", handleGlobalMove);
    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("touchmove", handleGlobalMove);
    window.addEventListener("touchend", handleGlobalUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchmove", handleGlobalMove);
      window.removeEventListener("touchend", handleGlobalUp);
    };
  }, [handleLightMove, handleSliderMove]);

  // Autoplay walkthrough of features if user stays idle (or just clicks play)
  useEffect(() => {
    const interval = setInterval(() => {
      // Loop Smart Inpaint draw effect automatically when active
      if (activeTool === "inpaint" && inpaintStage === "idle") {
        setInpaintStage("drawing");
        setTimeout(() => {
          setInpaintStage("rendering");
          setTimeout(() => {
            setInpaintStage("done");
            setDressColor("emerald");
          }, 2000);
        }, 1500);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [activeTool, inpaintStage]);

  // Trigger Smart Inpaint Manual Animation
  const runSmartInpaint = (prompt: string, color: typeof dressColor) => {
    setInpaintStage("drawing");
    setInpaintPrompt(prompt);
    setTimeout(() => {
      setInpaintStage("rendering");
      setTimeout(() => {
        setInpaintStage("done");
        setDressColor(color);
      }, 1800);
    }, 1200);
  };

  // Trigger Face Swap
  const triggerFaceSwap = (target: typeof faceSwapTarget) => {
    setIsSwapping(true);
    setTimeout(() => {
      setFaceSwapTarget(target);
      setIsSwapping(false);
    }, 1200);
  };

  // Trigger Transitions Simulation
  const triggerTransition = (type: typeof activeTransition) => {
    setActiveTransition(type);
    setIsTransitioning(true);
    let prog = 0;
    const interval = setInterval(() => {
      prog += 5;
      setTransitionProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsTransitioning(false);
          setTransitionProgress(0);
        }, 300);
      }
    }, 30);
  };

  // Texts mapping
  const content = {
    title: lang === "ar" ? "إضافة سعد ستوديو لبرامج أدوبي" : "SaadStudio Adobe CEP Panel",
    subtitle: lang === "ar" ? "لوحة أدوات الذكاء الاصطناعي الاحترافية داخل Premiere Pro & After Effects" : "Professional AI tool suite integrated directly inside Premiere Pro & After Effects",
    downloadBtn: lang === "ar" ? "تحميل الإضافة مجاناً" : "Download Extension Free",
    featuresTitle: lang === "ar" ? "أدوات مذهلة بلمسة واحدة" : "Stunning Tools At One Click",
    howItWorks: lang === "ar" ? "دليل التثبيت والاستخدام" : "Setup & Installation Guide",
    compatibility: lang === "ar" ? "متوافق مع إصدارات Adobe Creative Cloud 2022 فما فوق" : "Compatible with Adobe Creative Cloud 2022 and newer",
    steps: [
      {
        num: "1",
        titleAr: "تحميل وتثبيت ملف ZXP",
        titleEn: "Download & Install ZXP",
        descAr: "قم بتحميل ملف لوحة الأدوات وتثبيته عبر تطبيق ZXP Installer بسهولة.",
        descEn: "Download the panel file and install it via ZXP Installer helper utility."
      },
      {
        num: "2",
        titleAr: "ربط الحساب عبر رمز التوكن",
        titleEn: "Link Account via Token",
        descAr: "افتح لوحة الإعدادات والصق رمز الوصول الفريد الخاص بك لربط حسابك وسحب رصيد العمليات.",
        descEn: "Open Settings and paste your unique panel token to link credits."
      },
      {
        num: "3",
        titleAr: "ابدأ المونتاج الذكي",
        titleEn: "Start Smart Editing",
        descAr: "حدد الفيديو أو الصورة في جدول العرض الزمني واستدعي ميزات تعديل الإضاءة والوجوه والمؤثرات فورا.",
        descEn: "Select target track clips on the timeline and generate relight/faceswap/inpaint instantly."
      }
    ]
  };

  return (
    <div className="relative min-h-screen text-[#e2e8f0] pb-20 overflow-x-hidden font-body" style={{ direction: "ltr" }}>
      
      {/* Background elements */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-indigo-950/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Header Container */}
      <header className="relative w-full max-w-[1440px] mx-auto px-6 pt-12 text-center z-20">
        
        {/* Language Switcher Button */}
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="absolute top-4 right-6 px-4 py-1.5 rounded-full border border-white/10 bg-slate-900/60 hover:bg-slate-800 text-xs font-bold text-slate-300 transition backdrop-blur-md flex items-center gap-1.5 cursor-pointer z-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {lang === "ar" ? "Switch to English" : "تغيير للعربية"}
        </button>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/30 bg-teal-950/20 text-teal-400 text-xs font-semibold mb-6 shadow-lg shadow-teal-500/5">
          <Sparkles className="h-3.5 w-3.5" />
          {lang === "ar" ? "إصدار لوحة التحكم 2.1 — متاح الآن للتحميل" : "Panel Version 2.1 — Live & Ready"}
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          {content.title}
        </h1>
        
        <p className="mt-6 text-base md:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
          {content.subtitle}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a
            href="/download"
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-white font-bold text-sm shadow-xl shadow-teal-500/25 transition-all duration-300 hover:scale-[1.03] flex items-center gap-2"
          >
            <Download className="h-4.5 w-4.5" />
            {content.downloadBtn}
          </a>
          <button
            onClick={() => document.getElementById("mockup-workspace")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-sm transition backdrop-blur flex items-center gap-2 cursor-pointer"
          >
            {lang === "ar" ? "جرب العرض التفاعلي" : "Try Interactive Demo"}
            <ArrowRight className={cn("h-4.5 w-4.5 transition-transform", lang === "ar" ? "rotate-180" : "")} />
          </button>
        </div>
      </header>

      {/* --- MOCKUP WORKSPACE CONTAINER --- */}
      <section id="mockup-workspace" className="relative w-full max-w-[1400px] mx-auto px-4 md:px-6 mt-16 z-20">
        
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
            {lang === "ar" ? "تجرِبة المونتاج داخل البرنامج" : "Inside Adobe Workspace Simulation"}
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            {lang === "ar" ? "اضغط على الأدوات في لوحة سعد ستوديو الجانبية وتفاعل مع الموديل لمشاهدة الذكاء الاصطناعي مباشرة!" : "Click tools in the SaadStudio side panel and interact with the model to see the AI in action!"}
          </p>
        </div>

        {/* Outer Frame mimicking Premiere Pro */}
        <div className="relative border border-slate-800 rounded-2xl bg-[#090b10] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
          
          {/* Mock Window Top Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e1117] border-b border-slate-900 text-xs text-slate-400 select-none">
            <div className="flex items-center gap-4">
              {/* Window Controls */}
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              {/* Fake Menu */}
              <div className="hidden md:flex items-center gap-3 font-medium">
                <span className="text-slate-200">Adobe Premiere Pro 2026</span>
                <span className="hover:text-white transition cursor-pointer">{lang === "ar" ? "ملف" : "File"}</span>
                <span className="hover:text-white transition cursor-pointer">{lang === "ar" ? "تعديل" : "Edit"}</span>
                <span className="hover:text-white transition cursor-pointer">{lang === "ar" ? "كليب" : "Clip"}</span>
                <span className="hover:text-white transition cursor-pointer text-teal-400 font-semibold">{lang === "ar" ? "إضافة SaadStudio" : "SaadStudio Extension"}</span>
              </div>
            </div>
            {/* Project Title / Timecode */}
            <div className="font-mono text-teal-500 bg-slate-950/80 px-2 py-0.5 rounded border border-white/5">
              00:00:12:15
            </div>
          </div>

          {/* Workspace Body */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-px bg-slate-900">
            
            {/* LEFT / CENTER: Editor Canvas + Timeline (Standard Video Editor Layout) */}
            <div className="flex flex-col bg-[#0b0e14]">
              
              {/* Video Monitor Viewer */}
              <div className="relative flex-1 min-h-[480px] md:min-h-[580px] flex items-center justify-center p-4 md:p-8 bg-[#07090c] overflow-hidden select-none">
                
                {/* Safe Margins guides mockup */}
                <div className="absolute inset-6 border border-dashed border-white/5 pointer-events-none rounded" />
                <div className="absolute inset-12 border border-dashed border-white/[0.02] pointer-events-none rounded" />
                <div className="absolute top-4 left-6 text-[10px] font-mono text-slate-600 tracking-wider">FIT / 100%</div>
                <div className="absolute top-4 right-6 text-[10px] font-mono text-slate-600 tracking-wider">RG BRG 8-BIT</div>
                
                {/* ACTIVE TOOL VIEWERS */}
                
                {/* 1. AI RELIGHT COMPONENT */}
                {activeTool === "relight" && (
                  <div 
                    ref={relightContainerRef}
                    className="relative w-full max-w-[340px] aspect-[9/16] rounded-xl overflow-hidden shadow-2xl border border-white/10 select-none group"
                  >
                    {/* The Base Model Image */}
                    <img 
                      src="/explore/promo-model.png" 
                      alt="SaadStudio Model" 
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />

                    {/* Radial Blending Lighting Overlay */}
                    <div 
                      className="absolute inset-0 pointer-events-none transition-opacity duration-300 mix-blend-color-dodge opacity-90"
                      style={{
                        background: `radial-gradient(circle ${lightRadius}% at ${lightPos.x}% ${lightPos.y}%, ${lightColor} 0%, rgba(0,0,0,0) 100%)`
                      }}
                    />
                    <div 
                      className="absolute inset-0 pointer-events-none transition-opacity duration-300 mix-blend-overlay opacity-60"
                      style={{
                        background: `radial-gradient(circle ${lightRadius * 1.5}% at ${lightPos.x}% ${lightPos.y}%, ${lightColor} 0%, rgba(0,0,0,0) 100%)`
                      }}
                    />

                    {/* Ambient shadow gradient representing darkness before light */}
                    <div 
                      className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-40 bg-slate-950"
                      style={{
                        background: `radial-gradient(circle ${lightRadius * 2.5}% at ${lightPos.x}% ${lightPos.y}%, rgba(255,255,255,1) 0%, rgba(20,20,30,1) 70%)`
                      }}
                    />

                    {/* Interactive Drag Orb Handle */}
                    <div 
                      onMouseDown={handleLightStart}
                      onTouchStart={handleLightStart}
                      className="absolute w-8 h-8 rounded-full border-2 border-white cursor-grab active:cursor-grabbing flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-30"
                      style={{
                        left: `calc(${lightPos.x}% - 16px)`,
                        top: `calc(${lightPos.y}% - 16px)`,
                        backgroundColor: lightColor,
                        boxShadow: `0 0 25px ${lightColor}, inset 0 0 8px #fff`
                      }}
                    >
                      <Compass className="h-4.5 w-4.5 text-slate-900 animate-spin-slow" />
                    </div>

                    {/* Coordinate Indicator card */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded bg-black/80 backdrop-blur border border-white/10 text-[10px] font-mono text-amber-400 z-10 flex gap-2">
                      <span>X: {Math.round(lightPos.x)}%</span>
                      <span>Y: {Math.round(lightPos.y)}%</span>
                    </div>

                    {/* Tool Info overlay */}
                    <div className="absolute top-4 left-4 right-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                        {lang === "ar" ? "اسحب الكرة المضيئة على الصورة" : "Drag the glowing orb on the image"}
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. AI UPSCALE COMPONENT */}
                {activeTool === "upscale" && (
                  <div 
                    ref={upscaleContainerRef}
                    className="relative w-full max-w-[340px] aspect-[9/16] rounded-xl overflow-hidden shadow-2xl border border-white/10 select-none"
                  >
                    {/* Left (Before) Side Image: blurred with filter */}
                    <div className="absolute inset-0 w-full h-full">
                      <img 
                        src="/explore/promo-model.png" 
                        alt="Standard quality" 
                        className="w-full h-full object-cover filter blur-[2px] saturate-[0.8] brightness-95"
                      />
                      <div className="absolute bottom-4 left-4 px-2 py-1 rounded bg-black/60 text-[10px] font-bold text-white z-10">
                        {lang === "ar" ? "قبل (HD)" : "Before (HD)"}
                      </div>
                    </div>

                    {/* Right (After) Side Image: sharp with clipping path */}
                    <div 
                      className="absolute inset-0 w-full h-full"
                      style={{
                        clipPath: lang === "ar"
                          ? `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`
                          : `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)`
                      }}
                    >
                      <img 
                        src="/explore/promo-model.png" 
                        alt="Upscaled 8K quality" 
                        className="w-full h-full object-cover filter contrast-[1.03] saturate-[1.05] brightness-105"
                      />
                      <div className="absolute bottom-4 right-4 px-2 py-1 rounded bg-teal-500/80 text-[10px] font-bold text-white z-10">
                        {lang === "ar" ? "بعد (8K Ultra)" : "After (8K Ultra)"}
                      </div>
                    </div>

                    {/* Slider Separator Handle Line */}
                    <div 
                      onMouseDown={handleSliderStart}
                      onTouchStart={handleSliderStart}
                      className="absolute top-0 bottom-0 w-1 bg-teal-400 cursor-ew-resize flex items-center justify-center z-30"
                      style={{
                        left: `${sliderPos}%`
                      }}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-900 border border-teal-400 flex items-center justify-center text-teal-400 shadow-xl shadow-teal-500/25">
                        <Sliders className="h-4 w-4 rotate-90" />
                      </div>
                    </div>

                    {/* Tool Info overlay */}
                    <div className="absolute top-4 left-4 right-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-bold">
                        {lang === "ar" ? "اسحب الشريط للمقارنة بين الدقة العادية و 8K" : "Drag slider to compare SD and 8K details"}
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. SMART INPAINT COMPONENT */}
                {activeTool === "inpaint" && (
                  <div className="relative w-full max-w-[340px] aspect-[9/16] rounded-xl overflow-hidden shadow-2xl border border-white/10 select-none">
                    
                    {/* The Base Model Image with dress color shifting filter */}
                    <img 
                      src="/explore/promo-model.png" 
                      alt="SaadStudio Model" 
                      className={cn(
                        "w-full h-full object-cover transition-all duration-[1000ms] ease-out",
                        dressColor === "red" && "hue-rotate-[140deg] saturate-[1.2]",
                        dressColor === "emerald" && "hue-rotate-[240deg] saturate-[1.4] brightness-105",
                        dressColor === "gold" && "hue-rotate-[35deg] saturate-[1.6]"
                      )}
                    />

                    {/* Canvas Mask Overlay when drawing */}
                    {inpaintStage === "drawing" && (
                      <div className="absolute inset-0 z-20 pointer-events-none">
                        {/* Simulate brush painting */}
                        <svg className="w-full h-full">
                          {/* Highlight over the necklace area */}
                          <motion.path 
                            d="M 120 220 Q 170 260 220 220"
                            fill="none"
                            stroke="rgba(16, 185, 129, 0.65)"
                            strokeWidth="24"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1 }}
                          />
                        </svg>
                        {/* Dynamic brush tip */}
                        <motion.div 
                          className="absolute w-6 h-6 rounded-full border border-white bg-emerald-400/50"
                          initial={{ left: 120, top: 220 }}
                          animate={{ left: [120, 170, 220], top: [220, 245, 220] }}
                          transition={{ duration: 1 }}
                        />
                      </div>
                    )}

                    {/* Rendering Spinner Overlays */}
                    {inpaintStage === "rendering" && (
                      <div className="absolute inset-0 bg-black/60 z-30 flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                        <span className="text-xs font-bold text-emerald-400 tracking-wider">
                          {lang === "ar" ? "يجري معالجة الرسم الذكي..." : "Inpainting Product Area..."}
                        </span>
                      </div>
                    )}

                    {/* Product Badge overlay */}
                    {inpaintStage === "done" && (
                      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-950/80 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 shadow-2xl flex items-center gap-1.5 z-10">
                        <Check className="h-3 w-3" />
                        {lang === "ar" ? `تم توليد: ${inpaintPrompt}` : `Generated: ${inpaintPrompt}`}
                      </div>
                    )}

                    {/* Tool Info overlay */}
                    <div className="absolute top-4 left-4 right-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                        {inpaintStage === "idle" && (lang === "ar" ? "اختر ستايل التعديل من اللوحة الجانبية" : "Select edit style from the side panel")}
                        {inpaintStage === "drawing" && (lang === "ar" ? "تحديد مسار المجوهرات والفستان..." : "Masking dress & jewelry...")}
                        {inpaintStage === "rendering" && (lang === "ar" ? "تعديل الستايل بالذكاء الاصطناعي..." : "Generating custom product variant...")}
                        {inpaintStage === "done" && (lang === "ar" ? "اكتمل التعديل بنجاح!" : "Edit applied successfully!")}
                      </span>
                    </div>
                  </div>
                )}

                {/* 4. FACE SWAP COMPONENT */}
                {activeTool === "faceswap" && (
                  <div className="relative w-full max-w-[340px] aspect-[9/16] rounded-xl overflow-hidden shadow-2xl border border-white/10 select-none">
                    
                    {/* Source Portrait Base */}
                    {faceSwapTarget === "model" && (
                      <img 
                        src="/explore/promo-model.png" 
                        alt="Original Model" 
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Swapped Celebrity Face 1 */}
                    {faceSwapTarget === "celebrity1" && (
                      <img 
                        src="/explore/face-swap-result.png" 
                        alt="Face Swap Target 1" 
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Swapped Celebrity Face 2 */}
                    {faceSwapTarget === "celebrity2" && (
                      <img 
                        src="/explore/face-swap-target.png" 
                        alt="Face Swap Target 2" 
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Scan Line effect when swapping */}
                    {isSwapping && (
                      <div className="absolute inset-0 bg-black/40 z-20 overflow-hidden flex flex-col justify-between">
                        <div className="w-full h-0.5 bg-cyan-400 shadow-[0_0_12px_#22d3ee] animate-scanline" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <div className="w-10 h-10 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin" />
                          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                            {lang === "ar" ? "استبدال الملامح..." : "Aligning landmarks..."}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Mini Thumb of Source overlay */}
                    <div className="absolute bottom-4 left-4 w-12 h-16 rounded border border-white/20 bg-slate-950/80 p-0.5 shadow-xl">
                      <img 
                        src="/explore/promo-model.png" 
                        className="w-full h-full object-cover rounded-[2px]" 
                      />
                      <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-cyan-500 border border-slate-950 flex items-center justify-center text-[7px] font-bold text-white">
                        SRC
                      </div>
                    </div>

                    {/* Tool Info overlay */}
                    <div className="absolute top-4 left-4 right-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold">
                        {lang === "ar" ? "اختر وجه هدف للدمج" : "Choose target face in panel to swap"}
                      </span>
                    </div>
                  </div>
                )}

                {/* 5. AI TRANSITIONS COMPONENT */}
                {activeTool === "transitions" && (
                  <div className="relative w-full max-w-[340px] aspect-[9/16] rounded-xl overflow-hidden shadow-2xl border border-white/10 select-none">
                    
                    {/* The Base Model Image */}
                    <img 
                      src="/explore/promo-model.png" 
                      alt="SaadStudio Model" 
                      className={cn(
                        "w-full h-full object-cover transition-all",
                        isTransitioning && activeTransition === "zoom" && "animate-transition-zoom",
                        isTransitioning && activeTransition === "glitch" && "animate-transition-glitch"
                      )}
                    />

                    {/* Custom Video Transition Overlay */}
                    <AnimatePresence>
                      {isTransitioning && (
                        <motion.div 
                          className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {/* Light Leak transition overlay */}
                          {activeTransition === "leak" && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/60 via-amber-400/80 to-transparent mix-blend-screen animate-pulse" />
                          )}
                          
                          {/* Spin Progress Loader overlay */}
                          <div className="px-4 py-2 rounded-xl bg-black/80 border border-white/10 text-xs font-mono text-pink-400 flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>{transitionProgress}% Rendering</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Transition overlay cards */}
                    <div className="absolute bottom-4 left-4 right-4 flex gap-2 justify-center">
                      <button
                        onClick={() => triggerTransition("zoom")}
                        className={cn(
                          "px-2.5 py-1 rounded text-[10px] font-bold transition duration-300 backdrop-blur cursor-pointer",
                          activeTransition === "zoom" ? "bg-pink-500 text-white border border-pink-400" : "bg-black/60 text-slate-400 border border-white/5"
                        )}
                      >
                        {lang === "ar" ? "تأثير تقريب بلور" : "Zoom Blur"}
                      </button>
                      <button
                        onClick={() => triggerTransition("leak")}
                        className={cn(
                          "px-2.5 py-1 rounded text-[10px] font-bold transition duration-300 backdrop-blur cursor-pointer",
                          activeTransition === "leak" ? "bg-pink-500 text-white border border-pink-400" : "bg-black/60 text-slate-400 border border-white/5"
                        )}
                      >
                        {lang === "ar" ? "تأثير تسرب إضاءة" : "Light Leak"}
                      </button>
                      <button
                        onClick={() => triggerTransition("glitch")}
                        className={cn(
                          "px-2.5 py-1 rounded text-[10px] font-bold transition duration-300 backdrop-blur cursor-pointer",
                          activeTransition === "glitch" ? "bg-pink-500 text-white border border-pink-400" : "bg-black/60 text-slate-400 border border-white/5"
                        )}
                      >
                        {lang === "ar" ? "تأثير خلل رقمي" : "Glitch"}
                      </button>
                    </div>

                    {/* Tool Info overlay */}
                    <div className="absolute top-4 left-4 right-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-400 text-[10px] font-bold">
                        {lang === "ar" ? "اضغط على التأثير في الأسفل لتشغيله" : "Click a transition effect below to play"}
                      </span>
                    </div>
                  </div>
                )}

              </div>

              {/* MOCK ADOBE TIMELINE TRACKS (Bottom Panel) */}
              <div className="h-44 bg-[#0d1016] border-t border-slate-900 flex flex-col font-mono text-[10px] text-slate-500 select-none">
                
                {/* Timeline Header Row (Buttons + Time ruler) */}
                <div className="h-9 border-b border-slate-950 flex items-center justify-between px-4 bg-[#090b10]">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="text-slate-300 hover:text-teal-400 transition cursor-pointer"
                    >
                      {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                    </button>
                    <span className="text-slate-400 text-xs">V1 A1 TRACK</span>
                  </div>
                  
                  {/* Timeline Ruler */}
                  <div className="flex-1 max-w-[600px] h-full relative mx-4">
                    <div className="absolute inset-0 flex justify-between items-end pb-1 opacity-20">
                      <span>00:00</span>
                      <span>00:05</span>
                      <span>00:10</span>
                      <span>00:15</span>
                      <span>00:20</span>
                      <span>00:25</span>
                    </div>
                    
                    {/* Playhead Marker Indicator */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
                      style={{ left: `${playheadProgress}%` }}
                    >
                      <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white cursor-pointer shadow-lg" />
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-600">30.00 fps</span>
                </div>

                {/* Timeline Tracks Box */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto bg-[#0a0d12]">
                  
                  {/* Video Track 1 */}
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-right font-bold text-slate-600">V1</span>
                    <div className="flex-1 h-6 rounded bg-slate-900 border border-slate-800 relative overflow-hidden flex items-center px-2">
                      <div className="absolute inset-0 bg-blue-500/10 w-[70%] border-r border-blue-500/40 flex items-center justify-between px-2">
                        <span className="text-blue-300 font-bold text-[9px] flex items-center gap-1.5">
                          <Video className="h-3 w-3" />
                          promo-model.png
                        </span>
                        <span className="text-blue-400/60 font-mono text-[8px]">[00:00 - 00:18]</span>
                      </div>
                      
                      {/* Active tool indicator segment inside track clip */}
                      <div 
                        className="absolute h-full bg-teal-500/20 border-l border-r border-teal-400/40 z-0"
                        style={{
                          left: `${playheadProgress - 5}%`,
                          width: "12%"
                        }}
                      />
                    </div>
                  </div>

                  {/* Audio Track 1 */}
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-right font-bold text-slate-600">A1</span>
                    <div className="flex-1 h-6 rounded bg-slate-900 border border-slate-800 relative overflow-hidden flex items-center px-2">
                      <div className="absolute inset-0 bg-emerald-500/10 w-[85%] border-r border-emerald-500/40 flex items-center justify-between px-2">
                        <span className="text-emerald-300 font-bold text-[9px]">background-orchestra-theme.wav</span>
                        <span className="text-emerald-500/40 font-mono text-[8px]">[00:00 - 00:22]</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* RIGHT PANEL: Saad Studio CEP Extension Panel inside Premiere */}
            <div className="bg-[#0e1117] border-l border-slate-900 flex flex-col p-4">
              
              {/* CEP Panel Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 select-none">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-teal-500/10">
                    SA
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Saad Studio</h3>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Extension v2.1</p>
                  </div>
                </div>
                
                <span className="text-[10px] text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded font-mono font-bold">
                  {lang === "ar" ? "رصيد متصل" : "Connected"}
                </span>
              </div>

              {/* CEP Panel Tools Selection Tab list */}
              <div className="space-y-1.5 mb-6">
                {TOOLS.map((tool) => {
                  const isSelected = activeTool === tool.id;
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setActiveTool(tool.id);
                        if (tool.id === "inpaint") setInpaintStage("idle");
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition text-right cursor-pointer select-none",
                        isSelected 
                          ? "bg-slate-800/80 border-slate-700 shadow-md " + tool.glow
                          : "bg-slate-900/40 border-slate-900/60 hover:bg-slate-800/30 text-slate-400 hover:text-slate-200"
                      )}
                      style={{ direction: "ltr" }}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-4.5 w-4.5", isSelected ? tool.color : "text-slate-500")} />
                        <span className="text-xs font-bold">
                          {lang === "ar" ? tool.labelAr : tool.labelEn}
                        </span>
                      </div>
                      
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                        isSelected ? "bg-white/10 " + tool.color : "bg-slate-800 text-slate-600"
                      )}>
                        {lang === "ar" ? tool.badgeAr : tool.badgeEn}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* TOOL DYNAMIC PARAMETERS CARD */}
              <div className="flex-1 bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between">
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 select-none">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      {lang === "ar" ? "إعدادات الأداة" : "Tool Parameters"}
                    </span>
                    <span className="text-[10px] text-teal-400 font-mono">Run Mode: Fast</span>
                  </div>

                  {/* Relight parameters panel */}
                  {activeTool === "relight" && (
                    <div className="space-y-4 text-xs">
                      
                      {/* Compass visual indicator summary */}
                      <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded border border-white/5">
                        <div className="space-y-1">
                          <div className="text-slate-400 font-bold">{lang === "ar" ? "زاوية الإضاءة ثلاثية الأبعاد" : "3D Light Angle"}</div>
                          <div className="text-[10px] text-slate-600 font-mono">Azimuth / Elevation projection</div>
                        </div>
                        <div className="w-10 h-10 rounded-full border border-slate-700 relative bg-slate-900 flex items-center justify-center">
                          {/* Animated line pointing to angle */}
                          <div 
                            className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-amber-400 origin-left"
                            style={{ transform: `rotate(${Math.atan2(lightPos.y - 50, lightPos.x - 50) * (180 / Math.PI)}deg)` }}
                          />
                        </div>
                      </div>

                      {/* Brightness Slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono">
                          <span className="text-slate-400">{lang === "ar" ? "شدة الإضاءة" : "Intensity"}</span>
                          <span className="text-amber-400 font-bold">{brightness}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="30" 
                          max="250" 
                          value={brightness}
                          onChange={(e) => setBrightness(Number(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>

                      {/* Light color options picker */}
                      <div className="space-y-1.5">
                        <span className="text-slate-400">{lang === "ar" ? "لون الإضاءة" : "Light Color"}</span>
                        <div className="grid grid-cols-5 gap-2">
                          {[
                            { hex: "#f59e0b", label: "Orange" },
                            { hex: "#a855f7", label: "Purple" },
                            { hex: "#06b6d4", label: "Cyan" },
                            { hex: "#10b981", label: "Green" },
                            { hex: "#ffffff", label: "White" }
                          ].map((col) => (
                            <button
                              key={col.hex}
                              onClick={() => setLightColor(col.hex)}
                              className={cn(
                                "h-6 rounded-md border border-white/10 transition-transform relative cursor-pointer",
                                lightColor === col.hex && "scale-110 border-white"
                              )}
                              style={{ backgroundColor: col.hex }}
                              title={col.label}
                            >
                              {lightColor === col.hex && (
                                <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-slate-900" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Radius size slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono">
                          <span className="text-slate-400">{lang === "ar" ? "انتشار الضوء" : "Radius Spread"}</span>
                          <span className="text-amber-400 font-bold">{lightRadius}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="20" 
                          max="80" 
                          value={lightRadius}
                          onChange={(e) => setLightRadius(Number(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>

                    </div>
                  )}

                  {/* Upscale parameters panel */}
                  {activeTool === "upscale" && (
                    <div className="space-y-4 text-xs">
                      
                      <div className="bg-purple-950/20 border border-purple-500/20 rounded-lg p-3 text-purple-400 space-y-1">
                        <div className="font-bold">{lang === "ar" ? "تقنية التكبير الفائق 8K" : "8K Super Resolution"}</div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          {lang === "ar" 
                            ? "تقوم بزيادة عدد البكسلات وتحسين التفاصيل في الوجه والرموش والشعر لإبراز الصورة بجودة سينمائية."
                            : "Enhances texture detail, hair strands, eyelashes, and skin details via deep tensor network upscale."}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-slate-400">{lang === "ar" ? "نمط التحسين" : "Enhancement Mode"}</label>
                        <select className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white outline-none cursor-pointer">
                          <option>{lang === "ar" ? "محسن ملامح الوجه الفائق" : "Ultra Facial Enhance"}</option>
                          <option>{lang === "ar" ? "موازنة وتعديل الألوان السينمائية" : "Cinematic Color Tone"}</option>
                          <option>{lang === "ar" ? "نمط استعادة التفاصيل القديمة" : "Old Photo Restore"}</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>{lang === "ar" ? "قوة التحسين" : "Strength"}</span>
                          <span>100%</span>
                        </div>
                        <div className="w-full h-1 bg-purple-500/20 rounded-full overflow-hidden">
                          <div className="w-full h-full bg-purple-500" />
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Inpaint parameters panel */}
                  {activeTool === "inpaint" && (
                    <div className="space-y-4 text-xs">
                      
                      {/* Prompts Preset List Grid */}
                      <div className="space-y-2">
                        <span className="text-slate-400">{lang === "ar" ? "اختر المجوهرات والفستان" : "Choose presets"}</span>
                        <div className="grid grid-cols-1 gap-2">
                          <button
                            onClick={() => runSmartInpaint("emerald necklace", "emerald")}
                            className={cn(
                              "w-full text-right py-2 px-3 rounded border text-xs transition cursor-pointer select-none",
                              inpaintPrompt === "emerald necklace" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                            )}
                            style={{ direction: "ltr" }}
                          >
                            🟢 {lang === "ar" ? "عقد ملكي من الزمرد" : "Royal Emerald Necklace"}
                          </button>
                          <button
                            onClick={() => runSmartInpaint("red velvet dress", "red")}
                            className={cn(
                              "w-full text-right py-2 px-3 rounded border text-xs transition cursor-pointer select-none",
                              inpaintPrompt === "red velvet dress" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                            )}
                            style={{ direction: "ltr" }}
                          >
                            🔴 {lang === "ar" ? "فستان مخملي أحمر" : "Red Velvet Dress"}
                          </button>
                          <button
                            onClick={() => runSmartInpaint("gold earrings & necklace", "gold")}
                            className={cn(
                              "w-full text-right py-2 px-3 rounded border text-xs transition cursor-pointer select-none",
                              inpaintPrompt === "gold earrings & necklace" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                            )}
                            style={{ direction: "ltr" }}
                          >
                            🟡 {lang === "ar" ? "مجوهرات وأقراط ذهبية" : "Gold Earrings & Necklace"}
                          </button>
                        </div>
                      </div>

                      {/* Custom Prompt textbox mock */}
                      <div className="space-y-1.5">
                        <span className="text-slate-400">{lang === "ar" ? "أو اكتب طلباً مخصصاً" : "Or write custom prompt"}</span>
                        <input 
                          type="text"
                          placeholder={lang === "ar" ? "مثال: فستان أزرق حريري" : "e.g. blue silk dress"}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white text-xs outline-none"
                        />
                      </div>

                    </div>
                  )}

                  {/* Face Swap parameters panel */}
                  {activeTool === "faceswap" && (
                    <div className="space-y-4 text-xs">
                      
                      <span className="text-slate-400">{lang === "ar" ? "اختر الوجه المراد دمجه" : "Select target face to swap"}</span>
                      
                      {/* Target Faces Catalog mock */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => triggerFaceSwap("model")}
                          className={cn(
                            "aspect-square rounded border overflow-hidden p-0.5 transition hover:scale-105 cursor-pointer",
                            faceSwapTarget === "model" ? "border-cyan-400 bg-cyan-950/20" : "border-slate-800 bg-slate-950"
                          )}
                        >
                          <img src="/explore/promo-model.png" className="w-full h-full object-cover rounded" />
                        </button>
                        
                        <button
                          onClick={() => triggerFaceSwap("celebrity1")}
                          className={cn(
                            "aspect-square rounded border overflow-hidden p-0.5 transition hover:scale-105 cursor-pointer",
                            faceSwapTarget === "celebrity1" ? "border-cyan-400 bg-cyan-950/20" : "border-slate-800 bg-slate-950"
                          )}
                        >
                          <img src="/explore/face-swap-result.png" className="w-full h-full object-cover rounded" />
                        </button>

                        <button
                          onClick={() => triggerFaceSwap("celebrity2")}
                          className={cn(
                            "aspect-square rounded border overflow-hidden p-0.5 transition hover:scale-105 cursor-pointer",
                            faceSwapTarget === "celebrity2" ? "border-cyan-400 bg-cyan-950/20" : "border-slate-800 bg-slate-950"
                          )}
                        >
                          <img src="/explore/face-swap-target.png" className="w-full h-full object-cover rounded" />
                        </button>
                      </div>

                      <div className="bg-slate-950/60 p-2.5 rounded border border-white/5 text-[10px] text-slate-500 space-y-1 select-none">
                        <div className="font-bold text-slate-400">{lang === "ar" ? "تبديل وجوه سينمائي" : "Cinematic Geometry Fit"}</div>
                        <p>{lang === "ar" ? "ميزة المحاذاة التلقائية لزوايا الرأس والإضاءة المحيطية." : "Automatically matches head rotation, ambient occlusion and facial details."}</p>
                      </div>

                    </div>
                  )}

                  {/* Transitions parameters panel */}
                  {activeTool === "transitions" && (
                    <div className="space-y-4 text-xs">
                      
                      <div className="space-y-2">
                        <label className="text-slate-400">{lang === "ar" ? "مدة الانتقال" : "Transition Duration"}</label>
                        <select className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white outline-none cursor-pointer">
                          <option>0.5s (15 frames)</option>
                          <option>1.0s (30 frames)</option>
                          <option>1.5s (45 frames)</option>
                        </select>
                      </div>

                      <div className="bg-slate-950/60 p-2.5 rounded border border-white/5 text-[10px] text-slate-500 space-y-1 select-none">
                        <div className="font-bold text-slate-400">{lang === "ar" ? "توليد فريمات انتقالية" : "Frame Interpolation"}</div>
                        <p>{lang === "ar" ? "يقوم الذكاء الاصطناعي بتوليد مشاهد وسيطة ديناميكية لربط اللقطتين بسلاسة." : "AI synthesizes missing frames between two distinct video clips dynamically."}</p>
                      </div>

                    </div>
                  )}

                </div>

                {/* Generate / Apply Button inside CEP panel */}
                <div className="mt-6 pt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      if (activeTool === "relight") {
                        alert(lang === "ar" ? "تم تثبيت قيم الإضاءة وتحديثها في العرض الزمني!" : "Lighting applied to active timeline track!");
                      } else if (activeTool === "upscale") {
                        alert(lang === "ar" ? "جاري رفع الدقة للمقطع المختار..." : "Upscale job sent to rendering queue...");
                      } else if (activeTool === "inpaint") {
                        runSmartInpaint(inpaintPrompt, dressColor);
                      } else if (activeTool === "faceswap") {
                        triggerFaceSwap(faceSwapTarget);
                      } else if (activeTool === "transitions") {
                        triggerTransition(activeTransition);
                      }
                    }}
                    className={cn(
                      "w-full py-3 rounded-lg font-bold text-xs tracking-wider text-slate-950 uppercase shadow-lg transition duration-300 hover:scale-[1.02] cursor-pointer text-center",
                      activeTool === "relight" && "bg-gradient-to-r from-amber-400 to-orange-500 shadow-amber-500/10",
                      activeTool === "upscale" && "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-purple-500/10",
                      activeTool === "inpaint" && "bg-gradient-to-r from-emerald-400 to-teal-500 shadow-emerald-500/10",
                      activeTool === "faceswap" && "bg-gradient-to-r from-cyan-400 to-blue-500 shadow-cyan-500/10",
                      activeTool === "transitions" && "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-pink-500/10"
                    )}
                  >
                    {lang === "ar" ? "تطبيق على المقطع المحدد" : "Apply to Selected Clip"}
                  </button>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* --- WHY CHOOSE THE PANEL / BENEFITS SECTION --- */}
      <section className="relative w-full max-w-[1200px] mx-auto px-6 mt-28 z-20">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black text-white">
            {lang === "ar" ? "لماذا تستخدم إضافة سعد ستوديو؟" : "Why Choose SaadStudio Panel?"}
          </h2>
          <div className="w-16 h-1 bg-teal-500 mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-[#0c0f17] border border-slate-800/80 rounded-2xl p-6 shadow-xl relative group hover:border-slate-700 transition duration-300">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {lang === "ar" ? "تكامل أصلي وداخلي" : "Native Integration"}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {lang === "ar" 
                ? "لا تحتاج للتنقل بين المتصفح والتطبيق. تظهر اللوحة بجانب أدوات المونتاج وتعمل مباشرة على الملفات المفتوحة."
                : "No browser toggling needed. The panel operates inside Premiere Pro, modifying workspace sequences directly."}
            </p>
          </div>

          <div className="bg-[#0c0f17] border border-slate-800/80 rounded-2xl p-6 shadow-xl relative group hover:border-slate-700 transition duration-300">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {lang === "ar" ? "أداء سحابي فائق السرعة" : "Ultra Fast Cloud Render"}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {lang === "ar"
                ? "تتم المعالجة عبر خوادم مجهزة بأحدث بطاقات المعالجة الرسومية لإنتاج النتائج بسرعة دون استهلاك موارد جهازك."
                : "All operations execute on powerful cloud GPUs, keeping your computer resources free for playback caching."}
            </p>
          </div>

          <div className="bg-[#0c0f17] border border-slate-800/80 rounded-2xl p-6 shadow-xl relative group hover:border-slate-700 transition duration-300">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-4">
              <Wand2 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {lang === "ar" ? "دقة سينمائية 4K/8K" : "8K Cinematic Quality"}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {lang === "ar"
                ? "نماذج ذكاء اصطناعي مدربة خصيصاً للمحترفين لتعديل الوجوه والإضاءة مع الحفاظ على تفاصيل البشرة والأنسجة الحقيقية."
                : "Specially trained video models to change lighting, replace details and swap faces with extreme skin fidelity."}
            </p>
          </div>

        </div>

      </section>

      {/* --- HOW IT WORKS / SETUP SECTION --- */}
      <section className="relative w-full max-w-[1200px] mx-auto px-6 mt-28 z-20">
        
        <div className="bg-gradient-to-r from-[#0b0f17] to-[#080b11] border border-slate-800/60 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-black text-white">
              {content.howItWorks}
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              {content.compatibility}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {content.steps.map((step, idx) => (
              <div key={idx} className="flex flex-col gap-4 relative">
                
                {/* Number card */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500 to-sky-500 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-teal-500/10">
                  {step.num}
                </div>

                <h3 className="text-lg font-bold text-white">
                  {lang === "ar" ? step.titleAr : step.titleEn}
                </h3>
                
                <p className="text-sm text-slate-400 leading-relaxed">
                  {lang === "ar" ? step.descAr : step.descEn}
                </p>

                {/* Arrow connector line for desktop */}
                {idx < 2 && (
                  <div className="hidden md:block absolute top-6 left-[85%] w-[40%] h-0.5 border-t border-dashed border-slate-700 z-0" />
                )}

              </div>
            ))}
          </div>

          {/* Bottom Call Action inside instructions */}
          <div className="mt-12 pt-8 border-t border-slate-800/80 text-center">
            <p className="text-sm text-slate-400 mb-6">
              {lang === "ar" 
                ? "لديك أسئلة حول التثبيت؟ اتصل بفريق الدعم الفني مباشرة عبر واتساب" 
                : "Questions about installation? Reach out to support directly on WhatsApp"}
            </p>
            <a 
              href="https://wa.me/9647700000000" 
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Zap className="h-4 w-4" />
              {lang === "ar" ? "تواصل معنا عبر واتساب" : "Chat on WhatsApp"}
            </a>
          </div>

        </div>

      </section>

      {/* FOOTER CTA SECTION */}
      <section className="relative w-full max-w-[800px] mx-auto px-6 mt-28 text-center z-20">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
          {lang === "ar" ? "ارتقِ بمستوى مونتاجك اليوم" : "Elevate Your Editing Workflow Today"}
        </h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto mb-8">
          {lang === "ar" 
            ? "قم بتحميل إضافة سعد ستوديو وجرب تعديل الوجوه، تغيير الإضاءة والتعديل الذكي مجاناً." 
            : "Download the panel and start using professional AI tools in Premiere Pro completely for free."}
        </p>
        <Link 
          href="/download"
          className="px-8 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-white font-bold text-sm shadow-xl shadow-teal-500/25 transition-all duration-300 hover:scale-[1.03]"
        >
          {lang === "ar" ? "تحميل لوحة الإضافة مجاناً" : "Download Panel Extension Free"}
        </Link>
      </section>

    </div>
  );
}
