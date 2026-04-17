"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Video,
  ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  Play,
  X,
  Search,
  Film,
  Sparkles,
  Eye,
  Trash2,
  ExternalLink,
  Megaphone,
  ChevronDown,
  ChevronRight,
  Grid3X3,
  ArrowLeft,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════ */

type PresetMedia = {
  id: string;
  name: string;
  category: string;
  previewVideoUrl: string;
  previewGradient: string;
  description: string;
  costMultiplier: number;
};

type AssetSection = "transitions" | "beauty-tools" | "promo";

type BeautyOption = {
  id: string;
  name: string;
  nameAr: string;
  desc: string;
};

type BeautyToolFull = {
  id: string;
  name: string;
  nameAr: string;
  cat: "outfit" | "makeup" | "hair" | "body";
  thumbFile: string;
  options: BeautyOption[];
};

/* ═══════════════════════════════════════════════════════════════════════
   BEAUTY TOOLS FULL DATA (mirrors beauty2.html TOOLS array)
   ═══════════════════════════════════════════════════════════════════════ */

const BEAUTY_TOOLS_FULL: BeautyToolFull[] = [
  // ─── OUTFIT ───
  {
    id: "outfit-change", name: "Outfit Change", nameAr: "تبديل الملابس", cat: "outfit", thumbFile: "outfit-change.png",
    options: [
      { id: "casual", name: "Casual", nameAr: "كاجوال", desc: "ملابس يومية مريحة" },
      { id: "elegant", name: "Elegant", nameAr: "أنيق", desc: "فساتين سهرة وأناقة" },
      { id: "sport", name: "Sport", nameAr: "رياضي", desc: "ملابس رياضية" },
      { id: "formal", name: "Formal", nameAr: "رسمي", desc: "بدلة وملابس عمل" },
      { id: "streetwear", name: "Streetwear", nameAr: "ستريت وير", desc: "ستايل شبابي عصري" },
      { id: "boho", name: "Boho", nameAr: "بوهو", desc: "لوك بوهيمي ناعم" },
      { id: "vintage", name: "Vintage", nameAr: "فينتج", desc: "إطلالة كلاسيكية قديمة" },
    ],
  },
  {
    id: "evening-dress", name: "Evening Dress", nameAr: "فساتين سهرة", cat: "outfit", thumbFile: "evening-dress.png",
    options: [
      { id: "long-red", name: "Long Red", nameAr: "طويل أحمر", desc: "فستان أحمر كلاسيكي" },
      { id: "black-mini", name: "Black Mini", nameAr: "أسود قصير", desc: "فستان أسود صغير" },
      { id: "gold-sequin", name: "Gold Sequin", nameAr: "ذهبي لامع", desc: "فستان سهرة ذهبي" },
      { id: "emerald", name: "Emerald", nameAr: "زمردي", desc: "فستان أخضر زمردي" },
    ],
  },
  {
    id: "wedding-dress", name: "Wedding Dress", nameAr: "فستان زفاف", cat: "outfit", thumbFile: "wedding-dress.png",
    options: [
      { id: "ball-gown", name: "Ball Gown", nameAr: "منفوش كلاسيكي", desc: "فستان أميرات" },
      { id: "mermaid", name: "Mermaid", nameAr: "ميرميد", desc: "فستان حورية البحر" },
      { id: "a-line", name: "A-Line", nameAr: "أيه لاين", desc: "قصة كلاسيكية أنيقة" },
      { id: "minimalist", name: "Minimalist", nameAr: "بسيط", desc: "فستان بسيط عصري" },
    ],
  },
  {
    id: "traditional-wear", name: "Traditional Wear", nameAr: "أزياء تقليدية", cat: "outfit", thumbFile: "traditional-wear.png",
    options: [
      { id: "abaya", name: "Abaya", nameAr: "عباية", desc: "عباية خليجية فاخرة" },
      { id: "saree", name: "Saree", nameAr: "ساري هندي", desc: "ساري هندي ملون" },
      { id: "kimono", name: "Kimono", nameAr: "كيمونو", desc: "كيمونو ياباني" },
      { id: "hanbok", name: "Hanbok", nameAr: "هانبوك", desc: "هانبوك كوري" },
    ],
  },
  {
    id: "hijab-style", name: "Hijab Styling", nameAr: "ستايل حجاب", cat: "outfit", thumbFile: "hijab-styling.png",
    options: [
      { id: "turkish", name: "Turkish", nameAr: "تركي", desc: "لف تركي أنيق" },
      { id: "khaleeji", name: "Khaleeji", nameAr: "خليجي", desc: "ستايل خليجي فاخر" },
      { id: "modern", name: "Modern", nameAr: "عصري", desc: "لف عصري بسيط" },
      { id: "turban", name: "Turban", nameAr: "توربان", desc: "توربان موديل" },
    ],
  },
  {
    id: "cosplay", name: "Cosplay", nameAr: "كوسبلاي", cat: "outfit", thumbFile: "cosplay.png",
    options: [
      { id: "superhero", name: "Superhero", nameAr: "بطل خارق", desc: "زي أبطال خارقين" },
      { id: "anime-char", name: "Anime", nameAr: "شخصية أنمي", desc: "زي شخصية أنمي" },
      { id: "medieval", name: "Medieval", nameAr: "قروسطي", desc: "زي فارس أو أميرة" },
      { id: "scifi", name: "Sci-Fi", nameAr: "خيال علمي", desc: "زي مستقبلي" },
    ],
  },

  // ─── MAKEUP ───
  {
    id: "full-glam", name: "Full Glam Makeup", nameAr: "ميكاب فل قلام", cat: "makeup", thumbFile: "full-glam-makeup.png",
    options: [
      { id: "smokey", name: "Smokey Eye", nameAr: "سموكي آي", desc: "عيون دخانية درامية" },
      { id: "glitter", name: "Glitter Glam", nameAr: "قليتر", desc: "ميكاب لامع للسهرات" },
      { id: "classic-red", name: "Classic Red", nameAr: "أحمر كلاسيكي", desc: "روج أحمر كلاسيكي" },
      { id: "nude-glam", name: "Soft Neutral Glam", nameAr: "سوفت نيوترال", desc: "ميكاب ناعم بألوان محايدة" },
    ],
  },
  {
    id: "korean-beauty", name: "Korean Beauty", nameAr: "ميكاب كوري", cat: "makeup", thumbFile: "korean-beauty.png",
    options: [
      { id: "glass-skin", name: "Glass Skin", nameAr: "بشرة زجاجية", desc: "بشرة شفافة ولامعة" },
      { id: "gradient-lip", name: "Gradient Lip", nameAr: "شفاه متدرجة", desc: "شفاه كورية متدرجة" },
      { id: "fresh-look", name: "Fresh Look", nameAr: "لوك منعش", desc: "وجه طبيعي ومنعش" },
    ],
  },
  {
    id: "arabic-makeup", name: "Arabic Makeup", nameAr: "ميكاب عربي", cat: "makeup", thumbFile: "arabic-makeup.png",
    options: [
      { id: "kohl-dramatic", name: "Dramatic Kohl", nameAr: "كحل درامي", desc: "كحل عريض تقليدي" },
      { id: "gold-arabic", name: "Gold Arabic", nameAr: "ذهبي عربي", desc: "ظلال ذهبية فخمة" },
      { id: "bridal-arabic", name: "Bridal Arabic", nameAr: "عروسة عربية", desc: "ميكاب عروسة عربية" },
    ],
  },
  {
    id: "lip-color", name: "Lip Color Try-On", nameAr: "تجربة ألوان الروج", cat: "makeup", thumbFile: "lip-color-tryon.png",
    options: [
      { id: "red", name: "Red", nameAr: "أحمر", desc: "أحمر كلاسيكي" },
      { id: "nude", name: "Nude", nameAr: "نيود", desc: "بيج طبيعي" },
      { id: "berry", name: "Berry", nameAr: "بيري", desc: "توتي غامق" },
      { id: "pink", name: "Pink", nameAr: "وردي", desc: "وردي ناعم" },
      { id: "brown", name: "Brown", nameAr: "بني", desc: "بني دافئ" },
    ],
  },
  {
    id: "eye-makeup", name: "Eye Makeup", nameAr: "ميكاب عيون", cat: "makeup", thumbFile: "eye-makeup.png",
    options: [
      { id: "cat-eye", name: "Cat Eye", nameAr: "كات آي", desc: "آيلاينر مسحوب" },
      { id: "cut-crease", name: "Cut Crease", nameAr: "كت كريز", desc: "ظلال محددة" },
      { id: "natural-eye", name: "Natural", nameAr: "طبيعي", desc: "عيون طبيعية ناعمة" },
      { id: "glitter-eye", name: "Glitter", nameAr: "قليتر", desc: "عيون لامعة" },
    ],
  },
  {
    id: "bridal-makeup", name: "Bridal Makeup", nameAr: "ميكاب عروس", cat: "makeup", thumbFile: "bridal-makeup.png",
    options: [
      { id: "soft-bridal", name: "Soft & Romantic", nameAr: "ناعم ورومانسي", desc: "لوك عروسة ناعم" },
      { id: "dramatic-bridal", name: "Dramatic", nameAr: "درامي", desc: "عروسة بميكاب قوي" },
      { id: "boho-bridal", name: "Boho", nameAr: "بوهو", desc: "عروسة بوهيمية" },
    ],
  },
  {
    id: "skin-retouch", name: "Skin Retouch", nameAr: "تنعيم البشرة", cat: "makeup", thumbFile: "skin-retouch.png",
    options: [
      { id: "light-retouch", name: "Light", nameAr: "خفيف", desc: "تنعيم بسيط طبيعي" },
      { id: "medium-retouch", name: "Medium", nameAr: "متوسط", desc: "تنعيم واضح" },
      { id: "full-retouch", name: "Full", nameAr: "كامل", desc: "تنعيم كامل احترافي" },
    ],
  },

  // ─── HAIR ───
  {
    id: "hairstyle", name: "Hairstyle Change", nameAr: "تغيير قصة الشعر", cat: "hair", thumbFile: "hairstyle-change.png",
    options: [
      { id: "bob", name: "Bob", nameAr: "بوب قصير", desc: "قصة بوب كلاسيكية" },
      { id: "layers", name: "Layers", nameAr: "طبقات", desc: "طبقات طويلة" },
      { id: "pixie", name: "Pixie", nameAr: "بيكسي", desc: "قصة بيكسي جريئة" },
      { id: "curly", name: "Curly", nameAr: "كيرلي", desc: "شعر مجعد" },
    ],
  },
  {
    id: "hair-color", name: "Hair Color", nameAr: "لون الشعر", cat: "hair", thumbFile: "hair-color.png",
    options: [
      { id: "blonde", name: "Blonde", nameAr: "أشقر", desc: "أشقر ذهبي" },
      { id: "red-hair", name: "Red", nameAr: "أحمر", desc: "أحمر ناري" },
      { id: "platinum", name: "Platinum", nameAr: "بلاتيني", desc: "بلاتيني فاتح" },
      { id: "ombre", name: "Ombre", nameAr: "أومبريه", desc: "تدرج لوني" },
      { id: "chocolate", name: "Chocolate", nameAr: "شوكولا", desc: "بني شوكولا" },
    ],
  },
  {
    id: "beard-style", name: "Beard Styles", nameAr: "ستايل لحية", cat: "hair", thumbFile: "beard-style.png",
    options: [
      { id: "full-beard", name: "Full Beard", nameAr: "لحية كاملة", desc: "لحية كثيفة كاملة" },
      { id: "goatee", name: "Goatee", nameAr: "ذقن", desc: "ذقن فقط" },
      { id: "stubble", name: "Stubble", nameAr: "خفيفة", desc: "لحية خفيفة" },
      { id: "clean-shave", name: "Clean Shave", nameAr: "حليق", desc: "بدون لحية" },
    ],
  },
  {
    id: "bangs", name: "Bangs Try-On", nameAr: "تجربة غرة", cat: "hair", thumbFile: "bangs-tryon.png",
    options: [
      { id: "straight-bangs", name: "Straight", nameAr: "ستريت", desc: "غرة مستقيمة" },
      { id: "curtain-bangs", name: "Curtain", nameAr: "كيرتن", desc: "غرة جانبية" },
      { id: "side-bangs", name: "Side Swept", nameAr: "جانبية", desc: "غرة مسحوبة" },
      { id: "wispy-bangs", name: "Wispy", nameAr: "خفيفة", desc: "غرة خفيفة شفافة" },
    ],
  },
  {
    id: "braids", name: "Braids & Updos", nameAr: "ضفائر وتسريحات", cat: "hair", thumbFile: "braids-updos.png",
    options: [
      { id: "french-braid", name: "French Braid", nameAr: "ضفيرة فرنسية", desc: "ضفيرة كلاسيكية" },
      { id: "fishtail", name: "Fishtail", nameAr: "ذيل سمكة", desc: "ضفيرة ذيل سمكة" },
      { id: "chignon", name: "Chignon", nameAr: "شنيون", desc: "كعكة أنيقة" },
      { id: "messy-bun", name: "Messy Bun", nameAr: "كعكة عشوائية", desc: "كعكة كاجوال" },
    ],
  },
  {
    id: "extensions", name: "Hair Extensions", nameAr: "إكستنشن", cat: "hair", thumbFile: "hair-extensions.png",
    options: [
      { id: "medium-ext", name: "Medium", nameAr: "متوسط", desc: "إضافة طول متوسط" },
      { id: "long-ext", name: "Long", nameAr: "طويل", desc: "شعر طويل جداً" },
      { id: "volume-ext", name: "Volume", nameAr: "كثافة", desc: "كثافة بدون طول" },
    ],
  },
  {
    id: "balayage", name: "Balayage", nameAr: "بالاياج وهايلايت", cat: "hair", thumbFile: "balayage.png",
    options: [
      { id: "sun-kissed", name: "Sun-Kissed", nameAr: "لمسة شمس", desc: "بالاياج طبيعي" },
      { id: "caramel-hl", name: "Caramel", nameAr: "كراميل", desc: "هايلايت كراميلي" },
      { id: "ash-hl", name: "Ash", nameAr: "رمادي", desc: "هايلايت رمادي" },
    ],
  },

  // ─── BODY ───
  {
    id: "lip-enhancement", name: "Lip Enhancement", nameAr: "تكبير الشفايف", cat: "body", thumbFile: "lip-enhancement.png",
    options: [
      { id: "lip-natural", name: "Natural", nameAr: "طبيعي", desc: "تعريف خفيف ودقيق" },
      { id: "lip-medium", name: "Medium", nameAr: "متوسط", desc: "امتلاء معتدل" },
      { id: "lip-full", name: "Full", nameAr: "ممتلئ", desc: "حجم واضح" },
      { id: "lip-extra", name: "Extra Full", nameAr: "ممتلئ جداً", desc: "حجم كبير وشكل بارز" },
      { id: "lip-hollywood", name: "Hollywood", nameAr: "هوليوود", desc: "أقصى حجم وامتلاء" },
    ],
  },
  {
    id: "slim-body", name: "Slim Body", nameAr: "تنحيف الجسم", cat: "body", thumbFile: "slim-body.png",
    options: [
      { id: "slim-light", name: "Light", nameAr: "خفيف", desc: "تنحيف بسيط طبيعي" },
      { id: "slim-moderate", name: "Moderate", nameAr: "متوسط", desc: "خصر أصغر وجسم أنحف" },
      { id: "slim-dramatic", name: "Dramatic", nameAr: "درامي", desc: "تحول كبير في الشكل" },
    ],
  },
  {
    id: "muscle-enhance", name: "Muscle Enhancement", nameAr: "إبراز العضلات", cat: "body", thumbFile: "muscle-enhance.png",
    options: [
      { id: "mus-toned", name: "Toned", nameAr: "متناسق", desc: "جسم رياضي خفيف" },
      { id: "mus-athletic", name: "Athletic", nameAr: "رياضي", desc: "عضلات واضحة" },
      { id: "mus-bodybuilder", name: "Bodybuilder", nameAr: "بودي بلدر", desc: "عضلات ضخمة" },
    ],
  },
  {
    id: "nose-reshape", name: "Nose Reshape", nameAr: "تعديل الأنف", cat: "body", thumbFile: "nose-reshape.png",
    options: [
      { id: "nose-refine", name: "Refined", nameAr: "مهذب", desc: "تصغير خفيف وتنعيم" },
      { id: "nose-slim", name: "Slim", nameAr: "نحيف", desc: "أنف أنحف وأضيق" },
      { id: "nose-button", name: "Button", nameAr: "صغير", desc: "أنف صغير مرفوع" },
      { id: "nose-straight", name: "Straight", nameAr: "مستقيم", desc: "أنف مستقيم ومحدد" },
    ],
  },
  {
    id: "skin-tan", name: "Skin Tan", nameAr: "تسمير البشرة", cat: "body", thumbFile: "skin-tan.png",
    options: [
      { id: "fair", name: "Fair", nameAr: "فاتح", desc: "بشرة فاتحة جداً" },
      { id: "light-tan", name: "Light Tan", nameAr: "تان خفيف", desc: "سمرة خفيفة" },
      { id: "golden-tan", name: "Golden", nameAr: "ذهبي", desc: "تان ذهبي صيفي" },
      { id: "deep-tan", name: "Deep", nameAr: "غامق", desc: "سمرة غامقة" },
    ],
  },
];

const BEAUTY_CATEGORIES: { id: string; label: string; color: string }[] = [
  { id: "all", label: "All", color: "bg-violet-600" },
  { id: "outfit", label: "Outfit", color: "bg-pink-600" },
  { id: "makeup", label: "Makeup", color: "bg-rose-600" },
  { id: "hair", label: "Hair", color: "bg-amber-600" },
  { id: "body", label: "Body", color: "bg-cyan-600" },
];

const CAT_BADGE: Record<string, string> = {
  outfit: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  makeup: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  hair: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  body: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

/* ═══════════════════════════════════════════════════════════════════════
   TRANSITION PRESET CATEGORY COLORS
   ═══════════════════════════════════════════════════════════════════════ */

const CATEGORY_COLORS: Record<string, string> = {
  transformation: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  fx_material: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  camera_motion: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  object_reveal: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  stylized_special: "bg-violet-500/20 text-violet-300 border-violet-500/30",
};

/* ═══════════════════════════════════════════════════════════════════════
   UPLOAD HELPER
   ═══════════════════════════════════════════════════════════════════════ */

async function uploadToSupabase(
  file: File
): Promise<{ publicUrl: string; isVideo: boolean }> {
  const signRes = await fetch("/api/admin/media/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type }),
  });
  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(err?.error ?? "Failed to get upload URL");
  }
  const { signedUrl, publicUrl, isVideo } = (await signRes.json()) as {
    signedUrl: string;
    publicUrl: string;
    isVideo: boolean;
  };
  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadRes.ok) throw new Error("Upload to storage failed");
  return { publicUrl, isVideo };
}

/* ═══════════════════════════════════════════════════════════════════════
   TRANSITION CARD
   ═══════════════════════════════════════════════════════════════════════ */

function TransitionCard({
  preset,
  onUpload,
  uploading,
}: {
  preset: PresetMedia;
  onUpload: (presetId: string, file: File) => void;
  uploading: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);
  const hasVideo = !!preset.previewVideoUrl;
  const isUploading = uploading === preset.id;
  const catColor =
    CATEGORY_COLORS[preset.category] ??
    "bg-slate-500/20 text-slate-300 border-slate-500/30";

  useEffect(() => {
    if (videoRef.current && hasVideo) {
      if (hovering) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [hovering, hasVideo]);

  return (
    <div
      className="group relative rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900/60 transition-all hover:border-slate-600 hover:shadow-xl hover:shadow-black/30"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="relative aspect-video bg-slate-950 overflow-hidden">
        {hasVideo ? (
          <>
            <video
              ref={videoRef}
              src={preset.previewVideoUrl}
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold">
              <CheckCircle2 className="w-3 h-3" /> Video Ready
            </div>
          </>
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${preset.previewGradient} flex flex-col items-center justify-center gap-2`}
          >
            <Film className="w-8 h-8 text-white/20" />
            <span className="text-[10px] text-white/30 font-semibold">No Preview Video</span>
          </div>
        )}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center transition-opacity ${hovering ? "opacity-100" : "opacity-0"}`}
        >
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-lg"
          >
            {isUploading ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-3.5 h-3.5" /> {hasVideo ? "Replace Video" : "Upload Video"}</>
            )}
          </button>
        </div>
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur text-[9px] font-bold text-amber-300">
          x{preset.costMultiplier}
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <h3 className="text-sm font-bold text-slate-200 truncate">{preset.name}</h3>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catColor} whitespace-nowrap`}>
            {preset.category.replace(/_/g, " ")}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{preset.description}</p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(preset.id, f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   BEAUTY OPTION CARD (image or video upload for each option)
   ═══════════════════════════════════════════════════════════════════════ */

function OptionUploadCard({
  toolId,
  option,
  uploadedUrl,
  uploadedType,
  uploading,
  onUpload,
}: {
  toolId: string;
  option: BeautyOption;
  uploadedUrl: string;
  uploadedType: string;
  uploading: boolean;
  onUpload: (toolId: string, optionId: string, file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [hovering, setHovering] = useState(false);
  const hasMedia = !!uploadedUrl;
  const isVideo = uploadedType === "video";
  const fallbackImg = `/img/beauty-options/${toolId}/default.jpg`;

  return (
    <div
      className="group relative rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900/60 transition-all hover:border-slate-600 hover:shadow-lg hover:shadow-black/20"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="relative aspect-[3/4] bg-slate-950 overflow-hidden">
        {hasMedia && isVideo ? (
          <video
            src={uploadedUrl}
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
            onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
            onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
          />
        ) : (
          <img
            src={hasMedia ? uploadedUrl : fallbackImg}
            alt={option.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
          />
        )}

        {/* Status badge */}
        {hasMedia ? (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[8px] font-bold">
            {isVideo ? <Video className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
            {isVideo ? "Video" : "Image"}
          </div>
        ) : (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[8px] font-bold">
            Default
          </div>
        )}

        {/* Upload overlay */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 transition-opacity ${hovering ? "opacity-100" : "opacity-0"}`}
        >
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold transition-all disabled:opacity-50 shadow-lg"
          >
            {uploading ? (
              <><RefreshCw className="w-3 h-3 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-3 h-3" /> Upload Image/Video</>
            )}
          </button>
        </div>
      </div>

      <div className="p-2.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <h4 className="text-xs font-bold text-slate-200 truncate">{option.name}</h4>
          <span className="text-[9px] text-slate-600 truncate">{option.nameAr}</span>
        </div>
        <p className="text-[10px] text-slate-500 truncate">{option.desc}</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(toolId, option.id, f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   BEAUTY TOOL ROW (thumbnail + expand to options)
   ═══════════════════════════════════════════════════════════════════════ */

function BeautyToolRow({
  tool,
  isOpen,
  onToggle,
  onThumbUpload,
  onOptionUpload,
  thumbUploading,
  optionUploading,
  optionMedia,
}: {
  tool: BeautyToolFull;
  isOpen: boolean;
  onToggle: () => void;
  onThumbUpload: (toolId: string, file: File) => void;
  onOptionUpload: (toolId: string, optionId: string, file: File) => void;
  thumbUploading: boolean;
  optionUploading: string | null;
  optionMedia: Record<string, { url: string; type: string }>;
}) {
  const thumbRef = useRef<HTMLInputElement>(null);
  const catBadge = CAT_BADGE[tool.cat] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30";

  return (
    <div className={`rounded-xl border transition-all ${isOpen ? "border-violet-500/40 bg-slate-900/80" : "border-slate-700/60 bg-slate-900/40"}`}>
      {/* Header row */}
      <div
        className="flex items-center gap-4 p-3 cursor-pointer hover:bg-slate-800/30 transition-colors rounded-xl"
        onClick={onToggle}
      >
        {/* Thumbnail */}
        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-950 flex-shrink-0 group">
          <img
            src={`/img/beauty-tools/${tool.thumbFile}`}
            alt={tool.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
          />
          <div
            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); thumbRef.current?.click(); }}
          >
            {thumbUploading ? (
              <RefreshCw className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-white" />
            )}
          </div>
          <input
            ref={thumbRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onThumbUpload(tool.id, f);
              e.target.value = "";
            }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-200 truncate">{tool.name}</h3>
            <span className="text-[10px] text-slate-500">{tool.nameAr}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catBadge}`}>
              {tool.cat}
            </span>
            <span className="text-[10px] text-slate-600">
              {tool.options.length} options
            </span>
            <span className="text-[10px] text-slate-700">|</span>
            <span className="text-[10px] text-slate-600 font-mono">
              {tool.thumbFile}
            </span>
          </div>
        </div>

        {/* Expand icon */}
        <div className="flex-shrink-0">
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-violet-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-600" />
          )}
        </div>
      </div>

      {/* Expanded options grid */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1">
              <div className="border-t border-slate-800 pt-3 mb-3">
                <p className="text-[11px] text-slate-500 mb-3">
                  Upload image or video for each option — these appear when users select this tool
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {tool.options.map((opt) => {
                  const media = optionMedia[`${tool.id}/${opt.id}`];
                  return (
                    <OptionUploadCard
                      key={opt.id}
                      toolId={tool.id}
                      option={opt}
                      uploadedUrl={media?.url ?? ""}
                      uploadedType={media?.type ?? ""}
                      uploading={optionUploading === `${tool.id}/${opt.id}`}
                      onUpload={onOptionUpload}
                    />
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PROMO UPLOAD ZONE
   ═══════════════════════════════════════════════════════════════════════ */

function PromoUploadZone({
  onUpload,
  uploads,
  onRemove,
}: {
  onUpload: (files: FileList) => void;
  uploads: { url: string; type: string; name: string }[];
  onRemove: (idx: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files?.length) onUpload(e.dataTransfer.files);
    },
    [onUpload]
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragging ? "border-violet-500 bg-violet-500/5" : "border-slate-700 bg-slate-900/30 hover:border-slate-600"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/20 to-purple-700/10 border border-violet-500/20 flex items-center justify-center">
            <Upload className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200">Drop files here or click to upload</p>
            <p className="text-xs text-slate-500 mt-1">Videos (MP4, WebM) or Images (PNG, JPG, WebP)</p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onUpload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {uploads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {uploads.map((u, idx) => (
            <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-700/60 bg-slate-900/40">
              {u.type.startsWith("video") ? (
                <video src={u.url} className="w-full aspect-video object-cover" muted playsInline preload="metadata" />
              ) : (
                <img src={u.url} alt={u.name} className="w-full aspect-video object-cover" />
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <a
                  href={u.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button onClick={() => onRemove(idx)} className="p-2 rounded-lg bg-red-600/30 text-red-300 hover:bg-red-600/50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2">
                <p className="text-[10px] text-slate-400 truncate">{u.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SECTION TABS
   ═══════════════════════════════════════════════════════════════════════ */

const SECTIONS: { id: AssetSection; label: string; icon: React.ElementType }[] = [
  { id: "transitions", label: "Transitions", icon: Film },
  { id: "beauty-tools", label: "Beauty Studio", icon: Sparkles },
  { id: "promo", label: "Promo & Ads", icon: Megaphone },
];

/* ═══════════════════════════════════════════════════════════════════════
   STATS BAR
   ═══════════════════════════════════════════════════════════════════════ */

function StatsBar({ presets, optionMedia }: { presets: PresetMedia[]; optionMedia: Record<string, { url: string; type: string }> }) {
  const withVideo = presets.filter((p) => p.previewVideoUrl).length;
  const totalOptions = BEAUTY_TOOLS_FULL.reduce((s, t) => s + t.options.length, 0);
  const optionsWithMedia = Object.keys(optionMedia).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-600/5 border border-violet-500/20 p-4">
        <p className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Transitions</p>
        <p className="text-2xl font-black text-white mt-1">{presets.length}</p>
        <p className="text-[10px] text-violet-500">{withVideo} with preview</p>
      </div>
      <div className="rounded-xl bg-gradient-to-br from-pink-500/10 to-rose-600/5 border border-pink-500/20 p-4">
        <p className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">Beauty Tools</p>
        <p className="text-2xl font-black text-pink-300 mt-1">{BEAUTY_TOOLS_FULL.length}</p>
        <p className="text-[10px] text-pink-500">4 categories</p>
      </div>
      <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/20 p-4">
        <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Total Options</p>
        <p className="text-2xl font-black text-amber-300 mt-1">{totalOptions}</p>
        <p className="text-[10px] text-amber-500">{optionsWithMedia} with media</p>
      </div>
      <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-600/5 border border-emerald-500/20 p-4">
        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Coverage</p>
        <p className="text-2xl font-black text-emerald-300 mt-1">
          {totalOptions > 0 ? Math.round((optionsWithMedia / totalOptions) * 100) : 0}%
        </p>
        <p className="text-[10px] text-emerald-500">option media filled</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════ */

export default function PageBuilderPage() {
  const [section, setSection] = useState<AssetSection>("transitions");
  const [presets, setPresets] = useState<PresetMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [promoUploads, setPromoUploads] = useState<{ url: string; type: string; name: string }[]>([]);
  const [promoUploading, setPromoUploading] = useState(false);

  // Beauty state
  const [beautyCat, setBeautyCat] = useState("all");
  const [beautySearch, setBeautySearch] = useState("");
  const [openTool, setOpenTool] = useState<string | null>(null);
  const [thumbUploading, setThumbUploading] = useState<string | null>(null);
  const [optionUploading, setOptionUploading] = useState<string | null>(null);
  const [optionMedia, setOptionMedia] = useState<Record<string, { url: string; type: string }>>({});

  // Load transition presets
  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/presets/media")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.presets)) setPresets(data.presets);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load saved beauty option media from API
  useEffect(() => {
    fetch("/api/admin/beauty/media")
      .then((r) => r.json())
      .then((data) => {
        if (data.media && typeof data.media === "object") setOptionMedia(data.media);
      })
      .catch(() => {});
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ─── Transition upload ───
  const handleTransitionUpload = async (presetId: string, file: File) => {
    setUploading(presetId);
    try {
      const { publicUrl } = await uploadToSupabase(file);
      const res = await fetch("/api/admin/presets/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId, previewVideoUrl: publicUrl }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to save");
      setPresets((prev) => prev.map((p) => (p.id === presetId ? { ...p, previewVideoUrl: publicUrl } : p)));
      setToast({ msg: `Preview uploaded for "${presets.find((p) => p.id === presetId)?.name}"`, type: "ok" });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Upload failed", type: "err" });
    } finally {
      setUploading(null);
    }
  };

  // ─── Beauty thumbnail upload ───
  const handleThumbUpload = async (toolId: string, file: File) => {
    setThumbUploading(toolId);
    try {
      const { publicUrl } = await uploadToSupabase(file);
      // Save via API
      await fetch("/api/admin/beauty/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId, type: "thumb", url: publicUrl }),
      });
      setToast({ msg: `Thumbnail uploaded for "${toolId}"`, type: "ok" });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Upload failed", type: "err" });
    } finally {
      setThumbUploading(null);
    }
  };

  // ─── Beauty option media upload ───
  const handleOptionUpload = async (toolId: string, optionId: string, file: File) => {
    const key = `${toolId}/${optionId}`;
    setOptionUploading(key);
    try {
      const { publicUrl, isVideo } = await uploadToSupabase(file);
      // Save via API
      await fetch("/api/admin/beauty/media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId, optionId, type: "option", url: publicUrl, mediaType: isVideo ? "video" : "image" }),
      });
      setOptionMedia((prev) => ({ ...prev, [key]: { url: publicUrl, type: isVideo ? "video" : "image" } }));
      setToast({ msg: `Media uploaded for "${optionId}"`, type: "ok" });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Upload failed", type: "err" });
    } finally {
      setOptionUploading(null);
    }
  };

  // ─── Promo upload ───
  const handlePromoUpload = async (files: FileList) => {
    setPromoUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { publicUrl } = await uploadToSupabase(file);
        setPromoUploads((prev) => [...prev, { url: publicUrl, type: file.type, name: file.name }]);
      }
      setToast({ msg: `${files.length} promo asset(s) uploaded`, type: "ok" });
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Upload failed", type: "err" });
    } finally {
      setPromoUploading(false);
    }
  };

  // ─── Filters ───
  const transitionCategories = ["all", ...Array.from(new Set(presets.map((p) => p.category)))];
  const filteredPresets = presets.filter((p) => {
    if (catFilter !== "all" && p.category !== catFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredBeautyTools = BEAUTY_TOOLS_FULL.filter((t) => {
    if (beautyCat !== "all" && t.cat !== beautyCat) return false;
    if (beautySearch && !t.name.toLowerCase().includes(beautySearch.toLowerCase()) && !t.nameAr.includes(beautySearch)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-sm px-6 py-4">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/50">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-white leading-none">Media Asset Manager</h1>
              <p className="text-[11px] text-slate-500 mt-0.5">Transitions, Beauty Tools & Promo Media</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/apps/tool/transitions" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-cyan-300 hover:text-cyan-200 hover:bg-slate-800 transition-colors">
              <Eye className="w-3.5 h-3.5" /> Transitions
            </a>
            <a href="/beauty2.html" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-pink-300 hover:text-pink-200 hover:bg-slate-800 transition-colors">
              <Eye className="w-3.5 h-3.5" /> Beauty
            </a>
            <a href="/admin" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-300 border border-slate-800 bg-slate-900/50 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Admin
            </a>
          </div>
        </div>
      </header>

      {/* ═══ BODY ═══ */}
      <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        <StatsBar presets={presets} optionMedia={optionMedia} />

        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800/60 pb-0">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
                  isActive ? "border-violet-500 text-violet-300" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* ═══ TRANSITIONS ═══ */}
        {section === "transitions" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search transitions..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder-slate-600"
                />
              </div>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/40 border border-slate-700 flex-wrap">
                {transitionCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCatFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      catFilter === cat ? "bg-violet-600 text-white" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {cat === "all" ? "All" : cat.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-600">{filteredPresets.length} of {presets.length}</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse">
                    <div className="aspect-video bg-slate-800/60 rounded-t-xl" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-800/60 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPresets.map((preset) => (
                  <TransitionCard key={preset.id} preset={preset} onUpload={handleTransitionUpload} uploading={uploading} />
                ))}
                {filteredPresets.length === 0 && (
                  <div className="col-span-full py-16 text-center">
                    <Film className="w-10 h-10 mx-auto text-slate-800 mb-3" />
                    <p className="text-sm text-slate-600">No transitions match your filter</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ BEAUTY STUDIO ═══ */}
        {section === "beauty-tools" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  value={beautySearch}
                  onChange={(e) => setBeautySearch(e.target.value)}
                  placeholder="Search beauty tools..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder-slate-600"
                />
              </div>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/40 border border-slate-700">
                {BEAUTY_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setBeautyCat(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      beautyCat === cat.id ? `${cat.color} text-white` : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-600">
                {filteredBeautyTools.length} tools &middot;{" "}
                {filteredBeautyTools.reduce((s, t) => s + t.options.length, 0)} options
              </span>
            </div>

            {/* Tool list */}
            <div className="space-y-2">
              {filteredBeautyTools.map((tool) => (
                <BeautyToolRow
                  key={tool.id}
                  tool={tool}
                  isOpen={openTool === tool.id}
                  onToggle={() => setOpenTool(openTool === tool.id ? null : tool.id)}
                  onThumbUpload={handleThumbUpload}
                  onOptionUpload={handleOptionUpload}
                  thumbUploading={thumbUploading === tool.id}
                  optionUploading={optionUploading}
                  optionMedia={optionMedia}
                />
              ))}
              {filteredBeautyTools.length === 0 && (
                <div className="py-16 text-center">
                  <Sparkles className="w-10 h-10 mx-auto text-slate-800 mb-3" />
                  <p className="text-sm text-slate-600">No beauty tools match your filter</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ PROMO ═══ */}
        {section === "promo" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Promotional Media</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Upload videos and images for ads, banners, and promo across the site.</p>
              </div>
              {promoUploading && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-bold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...
                </div>
              )}
            </div>
            <PromoUploadZone onUpload={handlePromoUpload} uploads={promoUploads} onRemove={(idx) => setPromoUploads((p) => p.filter((_, i) => i !== idx))} />
          </div>
        )}
      </div>

      {/* ═══ TOAST ═══ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className={`fixed bottom-6 left-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-2xl shadow-black/40 border text-sm font-semibold ${
              toast.type === "ok"
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200"
                : "bg-red-950/90 border-red-500/30 text-red-200"
            }`}
          >
            {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
            {toast.msg}
            <button onClick={() => setToast(null)} className="ml-2 text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
