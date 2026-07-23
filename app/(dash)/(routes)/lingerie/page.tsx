"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Wand2,
  Sliders,
  Palette,
  Camera,
  User,
  Layers,
  Eye,
  Bookmark,
  ImageIcon,
  RefreshCw,
  SlidersHorizontal,
  Scissors,
  Sparkle,
  Smile,
  Check,
} from "lucide-react";
import SimpleToast from "@/components/SimpleToast";

// --- Constants & Options ---

const CLOTHING_CATEGORIES = [
  "Bra", "Bralette", "Push-up Bra", "Sports Bra", "Balcony Bra", "Strapless Bra",
  "Bodysuit", "Corset", "Bustier", "Teddy", "Babydoll", "Chemise", "Camisole",
  "Slip Dress", "Bikini", "One-piece Swimsuit", "Two-piece Swimsuit", "High-waist Bikini",
  "Garter Belt", "Stockings", "Panties", "Thong", "Boyshort", "Brief",
  "Lace Set", "Satin Set", "Silk Set", "Mesh Set"
];

const FABRIC_TYPES = [
  "Lace", "Satin", "Silk", "Cotton", "Mesh", "Sheer Mesh",
  "Velvet", "Leather", "Latex", "Transparent Fabric", "Floral Lace", "Embroidery"
];

const PRESET_COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#ffffff" },
  { name: "Red", hex: "#dc2626" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Purple", hex: "#9333ea" },
  { name: "Gold", hex: "#eab308" },
  { name: "Silver", hex: "#94a3b8" },
  { name: "Nude", hex: "#d97706" },
  { name: "Ivory", hex: "#fef3c7" },
];

const STYLES = ["Elegant", "Luxury", "Romantic", "Modern", "Classic", "Minimal", "Fashion Editorial", "Glamour", "Soft", "Vintage"];

// Fashion Fit Options
const GARMENT_FITS = ["Skin-tight", "Tailored Fit", "Relaxed Fit", "Sculpted Contour", "Flowing Silhouette"];
const COMPRESSIONS = ["Light Support", "Medium Compression", "High Sculpting", "Corset Tightening"];
const FABRIC_STRETCHES = ["Rigid Weave", "Slight Stretch", "High Elastic Stretch", "4-Way Contour Stretch"];
const NECKLINES = ["V-Neck", "Plunge", "Sweetheart", "Scoop", "Halter", "Square", "Off-Shoulder"];
const SLEEVE_STYLES = ["Sleeveless", "Cap Sleeve", "Long Lace Sleeve", "Spaghetti Strap", "Off-the-Shoulder"];
const STRAP_WIDTHS = ["Ultra Thin (Spaghetti)", "Medium Accent", "Wide Comfort", "Strapless Convertible"];
const STRAP_POSITIONS = ["Classic Parallel", "Crossback X-Strap", "Halterneck Loop", "Asymmetric One-Shoulder"];
const HEM_LENGTHS = ["Micro Length", "Mini Hem", "Knee Length", "Floor Length Flowing"];
const PATTERNS = ["Solid Monochrome", "Floral Botanical", "Damask Ornament", "Geometric Lace", "Polka Dot Mesh"];
const EMBROIDERIES = ["Fine Threadwork", "Gold Metallic Thread", "Raised Floral Appliqué", "Tone-on-Tone Silk"];
const DECORATIVE_ELEMENTS = ["Satin Ribbon", "Petite Bow", "Pearl Accents", "Gold Hardware Clasps", "Sheer Mesh Panels", "Scalloped Lace Edges"];

// Beauty Options
const FACE_SHAPES = ["Oval", "Heart-shaped", "Soft Square", "Symmetrical Diamond"];
const JAWLINES = ["Soft Contour", "Sculpted Angular", "Delicate Slim"];
const CHEEKBONES = ["Natural Soft", "High Model Sculpted", "Prominent Glossy"];
const NOSES = ["Straight Slim", "Soft Button", "Refined Sculpted"];
const EYE_SHAPES = ["Almond", "Feline Cat-Eye", "Round Doe-Eye", "Deep-set Fashion"];
const LIP_SHAPES = ["Natural Full", "Defined Cupid's Bow", "Soft Tint Contour", "Plump Editorial"];
const EYELASHES = ["Natural Flutter", "Volume Silk Extensions", "Dramatic Cat-Eye", "Feathered Editorial"];
const EYEBROWS = ["Soft Natural Arch", "Feathered Microbladed", "Sculpted High-Fashion", "Straight Boyish"];
const SKIN_TONES = ["Fair Porcelain", "Warm Golden Nude", "Olive Mediterranean", "Rich Bronze", "Deep Espresso"];
const SKIN_TEXTURES = ["Airbrushed Satin", "Natural Dewy Gloss", "Studio Matte", "Velvet Silk"];
const MAKEUP_STYLES = ["Glamour Runway", "Nude Natural Glow", "Smokey Eye Luxury", "Vintage Hollywood Red", "Soft Peach Pastel"];
const HAIR_STYLES = ["Long Waves", "Sleek Straight", "High Fashion Bun", "Voluminous Curls", "Textured Bob"];
const HAIR_VOLUMES = ["Natural Volume", "High Glamour Bounce", "Sleek Low Profile"];
const HAIR_LENGTHS = ["Shoulder Length", "Waist Length Cascading", "Short Pixie Cut"];
const HAIR_COLORS = ["Dark Espresso", "Warm Honey Blonde", "Auburn Copper", "Platinum Ice", "Jet Black"];

// Body Styling Options
const OVERALL_SHAPES = ["Hourglass Silhouette", "Slender Athletic", "Soft Curvaceous", "High-Fashion Runway Model"];
const BODY_BUILDS = ["Slim Petite", "Toned Fit", "Curvy Sculpted", "Athletic Lean"];
const SILHOUETTES = ["Ultra Crisp Contour", "Soft Natural Outline", "Streamlined Editorial"];
const POSTURES = ["Poised Runway Stance", "Relaxed Elegance", "Dynamic Fashion Angle"];

const POSES = ["Standing Runway", "Seated Elegance", "Walking Fashion", "Studio High-Angle", "Side Profile View", "Three-quarter Turn"];
const CAMERAS = ["Full Body Studio", "Upper Body Fashion Shot", "Medium Close-up Portrait", "Macro Detail Lens", "Vogue Magazine Cover"];
const BACKGROUNDS = ["Minimal White Studio", "Moody Dark Slate Studio", "Luxury Penthouse Bedroom", "Haute Couture Runway", "Soft Neutral Gradient"];

interface GeneratedAsset {
  id: string;
  url: string;
  prompt: string;
  category: string;
  fabric: string;
  color: string;
  date: string;
  parameters: Record<string, any>;
}

export default function LingerieStudioPage() {
  // --- Core State ---
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("blurry, bad anatomy, distorted, low quality, deformed, disproportionate limbs");
  const [selectedCategory, setSelectedCategory] = useState("Lace Set");
  const [selectedFabric, setSelectedFabric] = useState("Floral Lace");
  const [selectedColor, setSelectedColor] = useState("Black");
  const [customColor, setCustomColor] = useState("#ec4899");
  const [useCustomColor, setUseCustomColor] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("Luxury");

  // --- Fashion Fit & Garment State ---
  const [garmentFit, setGarmentFit] = useState("Sculpted Contour");
  const [compression, setCompression] = useState("Medium Compression");
  const [fabricStretch, setFabricStretch] = useState("High Elastic Stretch");
  const [transparency, setTransparency] = useState(30);
  const [laceDensity, setLaceDensity] = useState(80);
  const [strapPosition, setStrapPosition] = useState("Classic Parallel");
  const [strapWidth, setStrapWidth] = useState("Ultra Thin (Spaghetti)");
  const [neckline, setNeckline] = useState("Sweetheart");
  const [sleeveStyle, setSleeveStyle] = useState("Spaghetti Strap");
  const [hemLength, setHemLength] = useState("Micro Length");
  const [pattern, setPattern] = useState("Floral Botanical");
  const [embroidery, setEmbroidery] = useState("Fine Threadwork");
  const [ribbon, setRibbon] = useState(true);
  const [decorativeElement, setDecorativeElement] = useState("Satin Ribbon");

  // --- Advanced Body Styling Sliders (-50 to +50) ---
  const [overallShape, setOverallShape] = useState("Hourglass Silhouette");
  const [bodyBuild, setBodyBuild] = useState("Toned Fit");
  const [silhouette, setSilhouette] = useState("Ultra Crisp Contour");
  const [posture, setPosture] = useState("Poised Runway Stance");
  const [proportions, setProportions] = useState(0);
  const [symmetry, setSymmetry] = useState(10);
  const [height, setHeight] = useState(15);
  const [shoulderWidth, setShoulderWidth] = useState(0);
  const [neckLength, setNeckLength] = useState(5);
  const [armLength, setArmLength] = useState(0);
  const [legLength, setLegLength] = useState(20);
  const [waistShape, setWaistShape] = useState(-15);
  const [hipShape, setHipShape] = useState(15);
  const [nippleSize, setNippleSize] = useState(15);
  const [bustVolume, setBustVolume] = useState(20);
  const [buttocksVolume, setButtocksVolume] = useState(25);

  // --- Beauty Styling State ---
  const [lipShape, setLipShape] = useState("Defined Cupid's Bow");
  const [lipFullness, setLipFullness] = useState(15);
  const [faceShape, setFaceShape] = useState("Oval");
  const [jawline, setJawline] = useState("Sculpted Angular");
  const [cheekbone, setCheekbone] = useState("High Model Sculpted");
  const [noseShape, setNoseShape] = useState("Straight Slim");
  const [eyeShape, setEyeShape] = useState("Almond");
  const [eyebrows, setEyebrows] = useState("Soft Natural Arch");
  const [eyelashes, setEyelashes] = useState("Volume Silk Extensions");
  const [skinTone, setSkinTone] = useState("Warm Golden Nude");
  const [skinTexture, setSkinTexture] = useState("Airbrushed Satin");
  const [makeupStyle, setMakeupStyle] = useState("Glamour Runway");
  const [hairStyle, setHairStyle] = useState("Long Waves");
  const [hairVolume, setHairVolume] = useState("High Glamour Bounce");
  const [hairLength, setHairLength] = useState("Waist Length Cascading");
  const [hairColor, setHairColor] = useState("Dark Espresso");

  // --- Skin Appearance Refinements Sliders (0 to 100) ---
  const [skinHydration, setSkinHydration] = useState(85);
  const [skinBrightness, setSkinBrightness] = useState(70);
  const [skinSoftness, setSkinSoftness] = useState(90);
  const [evenSkinTone, setEvenSkinTone] = useState(95);
  const [naturalRetouch, setNaturalRetouch] = useState(80);
  const [bodySkinSmoothing, setBodySkinSmoothing] = useState(85);

  // --- Studio, Pose & Camera ---
  const [selectedPose, setSelectedPose] = useState("Standing Runway");
  const [selectedCamera, setSelectedCamera] = useState("Full Body Studio");
  const [selectedBackground, setSelectedBackground] = useState("Luxury Penthouse Bedroom");

  // --- UI & Gallery ---
  const [activeTab, setActiveTab] = useState<"garment" | "body" | "beauty" | "skin" | "studio" | "presets">("garment");
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState<GeneratedAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<GeneratedAsset | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savedPresets, setSavedPresets] = useState<{ name: string; config: any }[]>([]);
  const [presetNameInput, setPresetNameInput] = useState("");

  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    if (promptTextareaRef.current) {
      promptTextareaRef.current.style.height = "auto";
      promptTextareaRef.current.style.height = `${Math.min(promptTextareaRef.current.scrollHeight, 240)}px`;
    }
  }, [prompt]);

  // Load saved presets
  useEffect(() => {
    try {
      const saved = localStorage.getItem("saad_lingerie_advanced_presets");
      if (saved) setSavedPresets(JSON.parse(saved));
    } catch {}
  }, []);

  const showToast = (msg: string) => setToastMessage(msg);

  // Auto Enhance Master Prompt Constructor
  const handleAutoEnhancePrompt = () => {
    const colorStr = useCustomColor ? customColor : selectedColor;
    const parts = [
      `Haute couture fashion visualization of a model wearing a high-end ${selectedFabric} ${selectedCategory} in ${colorStr}`,
      `Garment Fit & Styling: ${garmentFit} with ${compression}, ${fabricStretch}, ${neckline} neckline, and ${sleeveStyle} sleeves`,
      `Textile Details: ${pattern} design with ${embroidery} embroidery, ${laceDensity}% lace density, ${transparency}% sheer fabric transparency, accented with ${decorativeElement}`,
      `Body Proportions & Posture: ${overallShape}, ${bodyBuild}, ${posture}. Proportions tuned with +${legLength} long leg ratio, ${waistShape < 0 ? 'narrow sculpted waist' : 'natural waist'}, and +${hipShape} defined hip curve`,
      `Beauty & Facial Refinement: ${faceShape} face with ${jawline} jawline, ${cheekbone} cheekbones, ${lipShape} lips, ${eyelashes} eyelashes, and ${makeupStyle} makeup. Hair is ${hairLength} ${hairStyle} in ${hairColor}`,
      `Skin Refinement: ${skinTone} skin with ${skinTexture} texture, ${skinHydration}% radiant hydration glow, and polished natural retouching`,
      `Photography & Studio Setting: ${selectedPose} stance, captured with a ${selectedCamera} lens against a ${selectedBackground} atmosphere`,
      `Masterpiece, 8K resolution, Vogue magazine cover quality, photorealistic textile weaves, professional studio lighting`
    ];
    setPrompt(parts.join(". "));
    showToast("✨ تم تجميع وتوليد كود التنسيق المتقدم المحدث تلقائياً!");
  };

  // Reset Body Controls
  const handleResetBodyControls = () => {
    setProportions(0); setSymmetry(0); setHeight(0); setShoulderWidth(0);
    setNeckLength(0); setArmLength(0); setLegLength(0); setWaistShape(0); setHipShape(0);
    setNippleSize(0); setBustVolume(0); setButtocksVolume(0);
    showToast("🔄 تم إعادة ضبط جميع مقاييس الجسم الدقيقة للحالة الطبيعية.");
  };

  // Save Preset
  const handleSavePreset = () => {
    if (!presetNameInput.trim()) return;
    const newPreset = {
      name: presetNameInput.trim(),
      config: {
        selectedCategory, selectedFabric, selectedColor, selectedStyle, garmentFit, compression,
        neckline, sleeveStyle, laceDensity, transparency, waistShape, hipShape, legLength,
        nippleSize, bustVolume, buttocksVolume,
        makeupStyle, skinTone, selectedPose, selectedCamera
      }
    };
    const updated = [...savedPresets, newPreset];
    setSavedPresets(updated);
    localStorage.setItem("saad_lingerie_advanced_presets", JSON.stringify(updated));
    setPresetNameInput("");
    showToast(`💾 تم حفظ النموذج الاحترافي: "${newPreset.name}"!`);
  };

  // Load Preset
  const handleLoadPreset = (preset: any) => {
    const c = preset.config;
    if (c.selectedCategory) setSelectedCategory(c.selectedCategory);
    if (c.selectedFabric) setSelectedFabric(c.selectedFabric);
    if (c.selectedColor) setSelectedColor(c.selectedColor);
    if (c.garmentFit) setGarmentFit(c.garmentFit);
    if (c.neckline) setNeckline(c.neckline);
    if (c.laceDensity !== undefined) setLaceDensity(c.laceDensity);
    if (c.transparency !== undefined) setTransparency(c.transparency);
    if (c.waistShape !== undefined) setWaistShape(c.waistShape);
    if (c.hipShape !== undefined) setHipShape(c.hipShape);
    if (c.legLength !== undefined) setLegLength(c.legLength);
    if (c.nippleSize !== undefined) setNippleSize(c.nippleSize);
    if (c.bustVolume !== undefined) setBustVolume(c.bustVolume);
    if (c.buttocksVolume !== undefined) setButtocksVolume(c.buttocksVolume);
    if (c.makeupStyle) setMakeupStyle(c.makeupStyle);
    showToast(`⚡ تم تحميل التنسيق: "${preset.name}"!`);
  };

  // API Generation Call
  const handleGenerate = async () => {
    const finalPrompt = prompt.trim() || `A luxury fashion visualization of a model wearing a ${selectedFabric} ${selectedCategory} in ${selectedColor}, haute couture studio lighting, 8k`;
    setIsGenerating(true);

    try {
      const body = {
        prompt: finalPrompt,
        negativePrompt,
        model: "flux-2/pro",
        aspectRatio: "3:4",
        seed: Math.floor(Math.random() * 10000000),
        bodyParameters: { legLength, waistShape, hipShape, height, proportions, symmetry, nippleSize, bustVolume, buttocksVolume },
        garmentParameters: { garmentFit, compression, fabricStretch, laceDensity, transparency },
        skinParameters: { skinHydration, skinBrightness, skinSoftness, evenSkinTone },
      };

      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok && (data.imageUrl || data.imageUrls?.length > 0 || data.url)) {
        const imageUrl = data.imageUrl || data.imageUrls?.[0] || data.url;
        const newAsset: GeneratedAsset = {
          id: `lingerie_adv_${Date.now()}`,
          url: imageUrl,
          prompt: finalPrompt,
          category: selectedCategory,
          fabric: selectedFabric,
          color: useCustomColor ? customColor : selectedColor,
          date: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
          parameters: body,
        };
        setGallery((prev) => [newAsset, ...prev]);
        setSelectedAsset(newAsset);
        showToast("✨ تم ابتكار وتجسيد التصميم عالي الدقة بنجاح!");
      } else {
        showToast(`❌ فشل التوليد: ${data.message || data.error || "خطأ غير معروف"}`);
      }
    } catch (err: any) {
      showToast(`❌ حدث خطأ في الاتصال: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col font-sans select-none pb-20">
      {toastMessage && <SimpleToast message={toastMessage} show={!!toastMessage} onHide={() => setToastMessage(null)} />}

      {/* --- Header --- */}
      <header className="px-6 py-5 bg-gradient-to-r from-pink-950/40 via-[#0d1017] to-purple-950/40 border-b border-pink-500/20 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-400 p-0.5 shadow-lg shadow-pink-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#0d1017] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-pink-400 animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-pink-300 via-rose-200 to-purple-300 bg-clip-text text-transparent">
              استوديو تنسيق الأزياء وقوام الموديل الاحترافي (Advanced Studio)
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              تحكم احترافي متكامل في قماش الملابس، قياسات الجسم الدقيقة، ملامح الوجه والمكياج، ونظارة البشرة.
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-pink-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin text-white" />
              <span>جاري المعالجة والتوليد...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5 text-pink-200" />
              <span>توليد وتجسيد الأزياء · <span style={{ color: "#fbb11f" }}>2 كريدت</span> ✨</span>
            </>
          )}
        </button>
      </header>

      {/* --- Main Grid --- */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* --- Left Column: Interactive Control Studio (7 cols) --- */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* Prompt Box */}
          <div className="bg-[#121620]/80 rounded-2xl p-5 border border-white/10 shadow-xl space-y-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-pink-300 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-pink-400" />
                الموجه الشامل ومترجم التفاصيل (Master Prompt Builder)
              </label>
              <button
                onClick={handleAutoEnhancePrompt}
                className="text-xs px-3 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                تجميع وتحديث التوصيف التلقائي
              </button>
            </div>

            <textarea
              ref={promptTextareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="اكتب تفاصيل إضافية أو اضغط على 'تجميع وتحديث التوصيف التلقائي' لترجمة كافة قياسات الأزياء والبشرة إلى نص برمي مخصص..."
              className="w-full bg-[#090b10] border border-white/10 rounded-xl p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50 resize-none transition-all min-h-[100px] max-h-[240px] overflow-y-auto"
            />
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-[#121620] p-1.5 rounded-xl border border-white/10 overflow-x-auto">
            {[
              { id: "garment", label: "تنسيق الأزياء (Garment)", icon: Scissors },
              { id: "body", label: "مقاييس الجسم (Body)", icon: User },
              { id: "beauty", label: "الجمال والوجه (Beauty)", icon: Smile },
              { id: "skin", label: "نظارة البشرة (Skin)", icon: Sparkle },
              { id: "studio", label: "الاستوديو والوضعية", icon: Camera },
              { id: "presets", label: "التنسيقات", icon: Bookmark },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 min-w-[110px] px-2.5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: FASHION FIT & GARMENT CONTROLS */}
          {activeTab === "garment" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="bg-[#121620]/80 rounded-2xl p-5 border border-white/10 space-y-4">
                <h3 className="text-xs font-bold text-pink-300 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-pink-400" />
                  تحكم قماش وقصة قطعة الملابس (Fashion Fit & Garment Controls)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">فئة القطعة (Category)</label>
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                      {CLOTHING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">نوع النسيج (Fabric)</label>
                    <select value={selectedFabric} onChange={(e) => setSelectedFabric(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                      {FABRIC_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">إحكام القماش (Garment Fit)</label>
                    <select value={garmentFit} onChange={(e) => setGarmentFit(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                      {GARMENT_FITS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">شد الضغط (Compression)</label>
                    <select value={compression} onChange={(e) => setCompression(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                      {COMPRESSIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">مرونة النسيج (Fabric Stretch)</label>
                    <select value={fabricStretch} onChange={(e) => setFabricStretch(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                      {FABRIC_STRETCHES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">طول الحافة (Hem Length)</label>
                    <select value={hemLength} onChange={(e) => setHemLength(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                      {HEM_LENGTHS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div>
                    <div className="flex justify-between text-xs text-slate-200 mb-1">
                      <span>كثافة الدانتيل والزخارف (Lace Density)</span>
                      <span className="text-pink-400 font-bold">{laceDensity}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={laceDensity} onChange={(e) => setLaceDensity(Number(e.target.value))} className="w-full accent-pink-500 cursor-pointer" />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-200 mb-1">
                      <span>شفافية القماش (Fabric Transparency)</span>
                      <span className="text-purple-400 font-bold">{transparency}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={transparency} onChange={(e) => setTransparency(Number(e.target.value))} className="w-full accent-purple-500 cursor-pointer" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: ADVANCED BODY STYLING */}
          {activeTab === "body" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#121620]/80 rounded-2xl p-5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-pink-300 flex items-center gap-2">
                    <User className="w-4 h-4 text-pink-400" />
                    ضبط وتنسيق ابعاد وجسم الموديل الاحترافي (Advanced Body Styling)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">مؤشرات احترافية لضبط القوام والتماثل والارتفاع بنسب دقيقة.</p>
                </div>
                <button onClick={handleResetBodyControls} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1.5 cursor-pointer">
                  <RefreshCw className="w-3.5 h-3.5" /> إعادة ضبط القياسات
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">شكل القوام العام (Overall Body Shape)</label>
                  <select value={overallShape} onChange={(e) => setOverallShape(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                    {OVERALL_SHAPES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">بنية الجسم (Body Build)</label>
                  <select value={bodyBuild} onChange={(e) => setBodyBuild(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                    {BODY_BUILDS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: "حجم وتكبير الصدر (Bust Volume & Lift)", val: bustVolume, set: setBustVolume },
                  { label: "بروز وتكبير حلمات الصدر (Nipple Prominence & Size)", val: nippleSize, set: setNippleSize },
                  { label: "استدارة وتكبير الأرداف (Buttocks & Glute Volume)", val: buttocksVolume, set: setButtocksVolume },
                  { label: "نسب وتناسق القوام (Body Proportions)", val: proportions, set: setProportions },
                  { label: "تماثل وتوازن الجسم (Body Symmetry)", val: symmetry, set: setSymmetry },
                  { label: "طول الموديل والقامة (Height Aspect)", val: height, set: setHeight },
                  { label: "عرض الكتفين (Shoulder Width)", val: shoulderWidth, set: setShoulderWidth },
                  { label: "طول العنق (Neck Length)", val: neckLength, set: setNeckLength },
                  { label: "طول الذراعين (Arm Length)", val: armLength, set: setArmLength },
                  { label: "طول الساقين والرشق (Leg Length)", val: legLength, set: setLegLength },
                  { label: "نحافة وتحديد الخصر (Waist Shape)", val: waistShape, set: setWaistShape },
                  { label: "استدارة وانحناء الوركين (Hip Shape)", val: hipShape, set: setHipShape },
                ].map((item) => (
                  <div key={item.label} className="bg-[#090b10] p-3 rounded-xl border border-white/5 flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-200 min-w-[180px]">{item.label}</span>
                    <input type="range" min="-50" max="50" value={item.val} onChange={(e) => item.set(Number(e.target.value))} className="flex-1 accent-pink-500 cursor-pointer" />
                    <span className={`font-mono font-bold text-xs min-w-[35px] text-right ${item.val > 0 ? "text-pink-400" : item.val < 0 ? "text-purple-400" : "text-slate-500"}`}>
                      {item.val > 0 ? `+${item.val}` : item.val}
                    </span>
                    <button onClick={() => item.set(0)} className="text-[10px] text-slate-500 hover:text-pink-300 underline">إعادة</button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 3: BEAUTY STYLING */}
          {activeTab === "beauty" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#121620]/80 rounded-2xl p-5 border border-white/10 space-y-4">
              <h3 className="text-xs font-bold text-pink-300 flex items-center gap-2">
                <Smile className="w-4 h-4 text-pink-400" />
                تجميل وملامح الوجه والشعر (Beauty Styling Controls)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">رسمة الوجه (Face Shape)</label>
                  <select value={faceShape} onChange={(e) => setFaceShape(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                    {FACE_SHAPES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">تحديد الفك (Jawline)</label>
                  <select value={jawline} onChange={(e) => setJawline(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                    {JAWLINES.map((j) => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">بروز الوجنتين (Cheekbone)</label>
                  <select value={cheekbone} onChange={(e) => setCheekbone(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                    {CHEEKBONES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">رسمة العيون (Eye Shape)</label>
                  <select value={eyeShape} onChange={(e) => setEyeShape(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                    {EYE_SHAPES.map((eVal) => <option key={eVal} value={eVal}>{eVal}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">تصفيفة الشعر (Hair Style)</label>
                  <select value={hairStyle} onChange={(e) => setHairStyle(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                    {HAIR_STYLES.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">لون الشعر (Hair Color)</label>
                  <select value={hairColor} onChange={(e) => setHairColor(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                    {HAIR_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: SKIN APPEARANCE */}
          {activeTab === "skin" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#121620]/80 rounded-2xl p-5 border border-white/10 space-y-4">
              <h3 className="text-xs font-bold text-pink-300 flex items-center gap-2">
                <Sparkle className="w-4 h-4 text-pink-400" />
                تحسين ونظارة نسيج البشرة (Skin Appearance Refinements)
              </h3>

              <div className="space-y-3">
                {[
                  { label: "إشراقة وترطيب البشرة (Skin Hydration Look)", val: skinHydration, set: setSkinHydration },
                  { label: "سطوع وتألق البشرة (Skin Brightness)", val: skinBrightness, set: setSkinBrightness },
                  { label: "نعومة النسيج Silk (Skin Softness)", val: skinSoftness, set: setSkinSoftness },
                  { label: "توحيد لون البشرة (Even Skin Tone)", val: evenSkinTone, set: setEvenSkinTone },
                  { label: "الرتوش الطبيعي (Natural Retouch)", val: naturalRetouch, set: setNaturalRetouch },
                  { label: "تنعيم وتمليس بشرة الجسم (Body Skin Smoothing)", val: bodySkinSmoothing, set: setBodySkinSmoothing },
                ].map((item) => (
                  <div key={item.label} className="bg-[#090b10] p-3 rounded-xl border border-white/5 flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-200 min-w-[200px]">{item.label}</span>
                    <input type="range" min="0" max="100" value={item.val} onChange={(e) => item.set(Number(e.target.value))} className="flex-1 accent-purple-500 cursor-pointer" />
                    <span className="font-mono font-bold text-xs text-purple-400 min-w-[35px] text-right">{item.val}%</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 5 & 6: STUDIO & PRESETS */}
          {activeTab === "studio" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#121620]/80 rounded-2xl p-5 border border-white/10 space-y-4">
              <h3 className="text-xs font-bold text-pink-300 flex items-center gap-2">
                <Camera className="w-4 h-4 text-pink-400" />
                الكاميرا والخلفية والوضعية (Studio Settings)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">الوضعية (Pose)</label>
                  <select value={selectedPose} onChange={(e) => setSelectedPose(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                    {POSES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">لقطة الكاميرا (Camera)</label>
                  <select value={selectedCamera} onChange={(e) => setSelectedCamera(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                    {CAMERAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">الخلفية (Background)</label>
                  <select value={selectedBackground} onChange={(e) => setSelectedBackground(e.target.value)} className="w-full bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500">
                    {BACKGROUNDS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "presets" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#121620]/80 rounded-2xl p-5 border border-white/10 space-y-4">
              <h3 className="text-xs font-bold text-pink-300 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-pink-400" />
                إدارة النماذج والتنسيقات المحفوظة (Saved Presets)
              </h3>
              <div className="flex gap-2">
                <input type="text" value={presetNameInput} onChange={(e) => setPresetNameInput(e.target.value)} placeholder="اسم النموذج المخصص..." className="flex-1 bg-[#090b10] border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500" />
                <button onClick={handleSavePreset} className="px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer">حفظ</button>
              </div>
              <div className="space-y-2 pt-2">
                {savedPresets.length === 0 ? <p className="text-xs text-slate-500 text-center py-4">لا توجد نماذج محفوظة حالياً.</p> : savedPresets.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#090b10] p-3 rounded-xl border border-white/5">
                    <span className="text-xs text-slate-200 font-bold">{p.name}</span>
                    <button onClick={() => handleLoadPreset(p)} className="px-3 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded-md text-xs transition-colors cursor-pointer">تطبيق</button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </div>

        {/* --- Right Column: Studio Real-Time Preview & Output Gallery (5 cols) --- */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* Real-time Parameter Indicator Banner */}
          <div className="bg-gradient-to-r from-pink-950/40 via-[#121620] to-purple-950/40 p-4 rounded-2xl border border-pink-500/20 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-pink-400" />
                مؤشر المعاينة التفاعلي المباشر (Studio Real-Time Status)
              </span>
              <span className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full border border-pink-500/30">نشط</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="bg-[#090b10]/80 p-2 rounded-lg border border-white/5">
                <span className="text-slate-500 block text-[10px]">القصة والضغط:</span>
                <span className="font-bold text-pink-400">{garmentFit}</span>
              </div>
              <div className="bg-[#090b10]/80 p-2 rounded-lg border border-white/5">
                <span className="text-slate-500 block text-[10px]">نسبة الرشق والخصر:</span>
                <span className="font-bold text-purple-400">ساقين +{legLength} | خصر {waistShape}</span>
              </div>
            </div>
          </div>

          {/* Large Preview Canvas */}
          <div className="bg-[#121620]/90 rounded-2xl p-5 border border-white/10 shadow-2xl flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden">
            {selectedAsset ? (
              <div className="w-full flex flex-col items-center space-y-4">
                <img src={selectedAsset.url} alt={selectedAsset.prompt} className="w-full max-h-[440px] object-contain rounded-xl shadow-2xl border border-white/10" />
                <div className="w-full bg-[#090b10] p-3 rounded-xl border border-white/10 text-xs space-y-1">
                  <div className="flex items-center justify-between text-pink-400 font-bold">
                    <span>{selectedAsset.category} ({selectedAsset.fabric})</span>
                    <span className="text-[10px] text-slate-400">{selectedAsset.date}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] line-clamp-2">{selectedAsset.prompt}</p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3 p-6">
                <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto text-pink-400">
                  <ImageIcon className="w-8 h-8 opacity-60" />
                </div>
                <h4 className="text-sm font-bold text-slate-300">منطقة معاينة وتجسيد الموضة الاحترافية</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  قم بتعديل مؤشرات القماش، تناسق القوام ونظارة البشرة ثم اضغط على "توليد وتجسيد الأزياء" للمعاينة الحية.
                </p>
              </div>
            )}
          </div>

          {/* History Gallery Grid */}
          <div className="bg-[#121620]/80 rounded-2xl p-5 border border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-pink-300 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-pink-400" />
              سجل الابتكارات المعالجة (Studio Output History)
            </h3>

            {gallery.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">لم يتم توليد أي تصاميم في هذه الجلسة بعد.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {gallery.map((item) => (
                  <div key={item.id} onClick={() => setSelectedAsset(item)} className={`aspect-square rounded-xl overflow-hidden border-2 cursor-pointer relative group transition-all ${selectedAsset?.id === item.id ? "border-pink-500 scale-95" : "border-transparent hover:border-white/20"}`}>
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
