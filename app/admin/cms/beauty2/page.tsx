"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Save, Plus, Trash2, GripVertical,
  Upload, X, Loader2, ArrowLeft, Eye,
  Sparkles, Image as ImageIcon, Type,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════════ */

interface HeroData {
  title: string;
  subtitle: string;
  badge: string;
  mediaUrl: string;
  isVideo: boolean;
  ctaLabel: string;
  ctaHref: string;
}

interface FeatureCard {
  _id: string;
  title: string;
  subtitle: string;
  mediaUrl: string;
  isVideo: boolean;
}

interface CategoryTab {
  _id: string;
  id: string;
  labelEn: string;
  labelAr: string;
}

interface OptionCard {
  _id: string;
  id: string;
  name: string;
  nameAr: string;
  desc: string;
  img: string;
}

interface ToolCard {
  _id: string;
  toolId: string;
  nameEn: string;
  nameAr: string;
  descAr: string;
  category: string;
  badge: string;
  thumb: string;
  optsCols: number;
  options: OptionCard[];
}

interface Beauty2CmsData {
  hero: HeroData;
  featureCards: FeatureCard[];
  categories: CategoryTab[];
  tools: ToolCard[];
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DEFAULTS & SEEDS
   ═══════════════════════════════════════════════════════════════════════════════ */

const uid = () => Math.random().toString(36).slice(2, 10);

const SEED_HERO: HeroData = {
  title: "Beauty & Model Studio",
  subtitle: "AI beauty and fashion studio — upload your photo, choose a style, and view the result.",
  badge: "SAAD STUDIO",
  mediaUrl: "/img/beauty-hero.png",
  isVideo: false,
  ctaLabel: "",
  ctaHref: "",
};

const SEED_FEATURE_CARDS: FeatureCard[] = [
  { _id: uid(), title: "Outfit Change", subtitle: "Upload your photo and change outfits with AI", mediaUrl: "/img/beauty-tools/outfit-change.png", isVideo: false },
  { _id: uid(), title: "Full Glam Makeup", subtitle: "Choose your perfect makeup style", mediaUrl: "/img/beauty-tools/full-glam-makeup.png", isVideo: false },
  { _id: uid(), title: "Hairstyle Change", subtitle: "Try different hairstyles instantly", mediaUrl: "/img/beauty-tools/hijab-styling.png", isVideo: false },
];

const SEED_CATEGORIES: CategoryTab[] = [
  { _id: uid(), id: "all", labelEn: "All", labelAr: "الكل" },
  { _id: uid(), id: "outfit", labelEn: "Outfit Styles", labelAr: "ستايل الملابس" },
  { _id: uid(), id: "makeup", labelEn: "Makeup", labelAr: "ميكاب" },
  { _id: uid(), id: "hair", labelEn: "Hair & Cuts", labelAr: "شعر وقصات" },
  { _id: uid(), id: "body", labelEn: "Body Edit", labelAr: "تعديل الجسم" },
];

const O = (id: string, name: string, nameAr: string, desc: string): OptionCard =>
  ({ _id: uid(), id, name, nameAr, desc, img: "" });

const SEED_TOOLS: ToolCard[] = [
  // ─── OUTFIT ───
  { _id: uid(), toolId: "outfit-change", nameEn: "Outfit Change", nameAr: "تبديل الملابس", descAr: "ارفع صورتك واختر ستايل الملابس", category: "outfit", badge: "hot", thumb: "/img/beauty-tools/outfit-change.png", optsCols: 5, options: [
    O("casual","Casual","كاجوال","ملابس يومية مريحة"), O("elegant","Elegant","أنيق","فساتين سهرة وأناقة"), O("sport","Sport","رياضي","ملابس رياضية"), O("lingerie","Lingerie","لانجري","ملابس داخلية أنيقة"),
    O("formal","Formal","رسمي","بدلة وملابس عمل"), O("streetwear","Streetwear","ستريت وير","ستايل شبابي عصري"), O("boho","Boho","بوهو","لوك بوهيمي ناعم"), O("vintage","Vintage","فينتج","إطلالة كلاسيكية قديمة"),
  ]},
  { _id: uid(), toolId: "evening-dress", nameEn: "Evening Dress", nameAr: "فساتين سهرة", descAr: "اختاري فستان السهرة المثالي", category: "outfit", badge: "pop", thumb: "/img/beauty-tools/evening-dress.png", optsCols: 4, options: [
    O("long-red","Long Red","طويل أحمر","فستان أحمر كلاسيكي"), O("black-mini","Black Mini","أسود قصير","فستان أسود صغير"), O("gold-sequin","Gold Sequin","ذهبي لامع","فستان سهرة ذهبي"), O("emerald","Emerald","زمردي","فستان أخضر زمردي"),
  ]},
  { _id: uid(), toolId: "lingerie-styles", nameEn: "Lingerie Styles", nameAr: "ستايلات لانجري", descAr: "اختاري ستايل اللانجري المفضل", category: "outfit", badge: "hot", thumb: "/img/beauty-tools/lingerie-styles.png", optsCols: 4, options: [
    O("lace-classic","Lace Classic","دانتيل كلاسيكي","لانجري دانتيل أنيق"), O("silk-set","Silk Set","طقم حرير","طقم حريري ناعم"), O("bodysuit","Bodysuit","بودي سوت","قطعة واحدة أنيقة"), O("babydoll","Babydoll","بيبي دول","بيبي دول شفاف"),
  ]},
  { _id: uid(), toolId: "wedding-dress", nameEn: "Wedding Dress", nameAr: "فستان زفاف", descAr: "شوفي نفسك بفستان زفاف الأحلام", category: "outfit", badge: "pop", thumb: "/img/beauty-tools/wedding-dress.png", optsCols: 4, options: [
    O("ball-gown","Ball Gown","منفوش كلاسيكي","فستان أميرات"), O("mermaid","Mermaid","ميرميد","فستان حورية البحر"), O("a-line","A-Line","أيه لاين","قصة كلاسيكية أنيقة"), O("minimalist","Minimalist","بسيط","فستان بسيط عصري"),
  ]},
  { _id: uid(), toolId: "swimwear", nameEn: "Swimwear", nameAr: "ملابس سباحة", descAr: "اختاري ستايل ملابس السباحة", category: "outfit", badge: "new", thumb: "/img/beauty-tools/swimwear.png", optsCols: 4, options: [
    O("bikini","Bikini","بيكيني","بيكيني كلاسيكي"), O("one-piece","One Piece","قطعة واحدة","مايوه قطعة واحدة"), O("high-waist","High Waist","خصر عالي","بيكيني خصر عالي"), O("cover-up","Cover Up","كفر أب","مع غطاء شاطئ"),
  ]},
  { _id: uid(), toolId: "traditional-wear", nameEn: "Traditional Wear", nameAr: "أزياء تقليدية", descAr: "اختر الزي التقليدي المفضل", category: "outfit", badge: "new", thumb: "/img/beauty-tools/traditional-wear.png", optsCols: 4, options: [
    O("abaya","Abaya","عباية","عباية خليجية فاخرة"), O("saree","Saree","ساري هندي","ساري هندي ملون"), O("kimono","Kimono","كيمونو","كيمونو ياباني"), O("hanbok","Hanbok","هانبوك","هانبوك كوري"),
  ]},
  { _id: uid(), toolId: "hijab-style", nameEn: "Hijab Styling", nameAr: "ستايل حجاب", descAr: "اختاري طريقة لف الحجاب", category: "outfit", badge: "new", thumb: "/img/beauty-tools/hijab-styling.png", optsCols: 4, options: [
    O("turkish","Turkish","تركي","لف تركي أنيق"), O("khaleeji","Khaleeji","خليجي","ستايل خليجي فاخر"), O("modern","Modern","عصري","لف عصري بسيط"), O("turban","Turban","توربان","توربان موديل"),
  ]},
  { _id: uid(), toolId: "cosplay", nameEn: "Cosplay", nameAr: "كوسبلاي", descAr: "تحوّل لشخصيتك المفضلة", category: "outfit", badge: "hot", thumb: "/img/beauty-tools/cosplay.png", optsCols: 4, options: [
    O("superhero","Superhero","بطل خارق","زي أبطال خارقين"), O("anime-char","Anime","شخصية أنمي","زي شخصية أنمي"), O("medieval","Medieval","قروسطي","زي فارس أو أميرة"), O("scifi","Sci-Fi","خيال علمي","زي مستقبلي"),
  ]},
  // ─── MAKEUP ───
  { _id: uid(), toolId: "full-glam", nameEn: "Full Glam Makeup", nameAr: "ميكاب فل قلام", descAr: "اختاري ستايل الميكاب الكامل", category: "makeup", badge: "hot", thumb: "/img/beauty-tools/full-glam-makeup.png", optsCols: 4, options: [
    O("smokey","Smokey Eye","سموكي آي","عيون دخانية درامية"), O("glitter","Glitter Glam","قليتر","ميكاب لامع للسهرات"), O("classic-red","Classic Red","أحمر كلاسيكي","روج أحمر كلاسيكي"), O("nude-glam","Soft Neutral Glam","سوفت نيوترال","ميكاب ناعم بألوان محايدة"),
  ]},
  { _id: uid(), toolId: "korean-beauty", nameEn: "Korean Beauty", nameAr: "ميكاب كوري", descAr: "لوك كوري ناعم — بشرة زجاجية", category: "makeup", badge: "hot", thumb: "/img/beauty-tools/korean-beauty.png", optsCols: 3, options: [
    O("glass-skin","Glass Skin","بشرة زجاجية","بشرة شفافة ولامعة"), O("gradient-lip","Gradient Lip","شفاه متدرجة","شفاه كورية متدرجة"), O("fresh-look","Fresh Look","لوك منعش","وجه طبيعي ومنعش"),
  ]},
  { _id: uid(), toolId: "arabic-makeup", nameEn: "Arabic Makeup", nameAr: "ميكاب عربي", descAr: "ميكاب عربي تقليدي درامي", category: "makeup", badge: "pop", thumb: "/img/beauty-tools/arabic-makeup.png", optsCols: 3, options: [
    O("kohl-dramatic","Dramatic Kohl","كحل درامي","كحل عريض تقليدي"), O("gold-arabic","Gold Arabic","ذهبي عربي","ظلال ذهبية فخمة"), O("bridal-arabic","Bridal Arabic","عروسة عربية","ميكاب عروسة عربية"),
  ]},
  { _id: uid(), toolId: "lip-color", nameEn: "Lip Color Try-On", nameAr: "تجربة ألوان الروج", descAr: "اختاري لون الروج المفضل", category: "makeup", badge: "new", thumb: "/img/beauty-tools/lip-color-tryon.png", optsCols: 5, options: [
    O("red","Red","أحمر","أحمر كلاسيكي"), O("nude","Nude","نيود","بيج طبيعي"), O("berry","Berry","بيري","توتي غامق"), O("pink","Pink","وردي","وردي ناعم"), O("brown","Brown","بني","بني دافئ"),
  ]},
  { _id: uid(), toolId: "eye-makeup", nameEn: "Eye Makeup", nameAr: "ميكاب عيون", descAr: "اختاري ستايل ميكاب العيون", category: "makeup", badge: "new", thumb: "/img/beauty-tools/eye-makeup.png", optsCols: 4, options: [
    O("cat-eye","Cat Eye","كات آي","آيلاينر مسحوب"), O("cut-crease","Cut Crease","كت كريز","ظلال محددة"), O("natural-eye","Natural","طبيعي","عيون طبيعية ناعمة"), O("glitter-eye","Glitter","قليتر","عيون لامعة"),
  ]},
  { _id: uid(), toolId: "bridal-makeup", nameEn: "Bridal Makeup", nameAr: "ميكاب عروس", descAr: "اختاري ستايل ميكاب العروسة", category: "makeup", badge: "pop", thumb: "/img/beauty-tools/bridal-makeup.png", optsCols: 3, options: [
    O("soft-bridal","Soft & Romantic","ناعم ورومانسي","لوك عروسة ناعم"), O("dramatic-bridal","Dramatic","درامي","عروسة بميكاب قوي"), O("boho-bridal","Boho","بوهو","عروسة بوهيمية"),
  ]},
  { _id: uid(), toolId: "skin-retouch", nameEn: "Skin Retouch", nameAr: "تنعيم البشرة", descAr: "اختاري مستوى التنعيم", category: "makeup", badge: "new", thumb: "", optsCols: 3, options: [
    O("light-retouch","Light","خفيف","تنعيم بسيط طبيعي"), O("medium-retouch","Medium","متوسط","تنعيم واضح"), O("full-retouch","Full","كامل","تنعيم كامل احترافي"),
  ]},
  // ─── HAIR ───
  { _id: uid(), toolId: "hairstyle", nameEn: "Hairstyle Change", nameAr: "تغيير قصة الشعر", descAr: "اختر القصة الجديدة", category: "hair", badge: "hot", thumb: "", optsCols: 4, options: [
    O("bob","Bob","بوب قصير","قصة بوب كلاسيكية"), O("layers","Layers","طبقات","طبقات طويلة"), O("pixie","Pixie","بيكسي","قصة بيكسي جريئة"), O("curly","Curly","كيرلي","شعر مجعد"),
  ]},
  { _id: uid(), toolId: "hair-color", nameEn: "Hair Color", nameAr: "لون الشعر", descAr: "اختر اللون الجديد", category: "hair", badge: "hot", thumb: "", optsCols: 5, options: [
    O("blonde","Blonde","أشقر","أشقر ذهبي"), O("red-hair","Red","أحمر","أحمر ناري"), O("platinum","Platinum","بلاتيني","بلاتيني فاتح"), O("ombre","Ombré","أومبريه","تدرج لوني"), O("chocolate","Chocolate","شوكولا","بني شوكولا"),
  ]},
  { _id: uid(), toolId: "beard-style", nameEn: "Beard Styles", nameAr: "ستايل لحية", descAr: "اختر ستايل اللحية", category: "hair", badge: "new", thumb: "", optsCols: 4, options: [
    O("full-beard","Full Beard","لحية كاملة","لحية كثيفة كاملة"), O("goatee","Goatee","ذقن","ذقن فقط"), O("stubble","Stubble","خفيفة","لحية خفيفة"), O("clean-shave","Clean Shave","حليق","بدون لحية"),
  ]},
  { _id: uid(), toolId: "bangs", nameEn: "Bangs Try-On", nameAr: "تجربة غرة", descAr: "اختاري نوع الغرة", category: "hair", badge: "new", thumb: "", optsCols: 4, options: [
    O("straight-bangs","Straight","ستريت","غرة مستقيمة"), O("curtain-bangs","Curtain","كيرتن","غرة جانبية"), O("side-bangs","Side Swept","جانبية","غرة مسحوبة"), O("wispy-bangs","Wispy","خفيفة","غرة خفيفة شفافة"),
  ]},
  { _id: uid(), toolId: "braids", nameEn: "Braids & Updos", nameAr: "ضفائر وتسريحات", descAr: "اختاري التسريحة", category: "hair", badge: "new", thumb: "", optsCols: 4, options: [
    O("french-braid","French Braid","ضفيرة فرنسية","ضفيرة كلاسيكية"), O("fishtail","Fishtail","ذيل سمكة","ضفيرة ذيل سمكة"), O("chignon","Chignon","شنيون","كعكة أنيقة"), O("messy-bun","Messy Bun","كعكة عشوائية","كعكة كاجوال"),
  ]},
  { _id: uid(), toolId: "extensions", nameEn: "Hair Extensions", nameAr: "إكستنشن", descAr: "اختاري الطول والكثافة", category: "hair", badge: "new", thumb: "", optsCols: 3, options: [
    O("medium-ext","Medium","متوسط","إضافة طول متوسط"), O("long-ext","Long","طويل","شعر طويل جداً"), O("volume-ext","Volume","كثافة","كثافة بدون طول"),
  ]},
  { _id: uid(), toolId: "balayage", nameEn: "Balayage", nameAr: "بالاياج وهايلايت", descAr: "اختاري نوع التلوين", category: "hair", badge: "new", thumb: "", optsCols: 3, options: [
    O("sun-kissed","Sun-Kissed","لمسة شمس","بالاياج طبيعي"), O("caramel-hl","Caramel","كراميل","هايلايت كراميلي"), O("ash-hl","Ash","رمادي","هايلايت رمادي"),
  ]},
  // ─── BODY ───
  { _id: uid(), toolId: "lip-enhancement", nameEn: "Lip Enhancement", nameAr: "تكبير الشفايف", descAr: "اختاري حجم الشفايف المطلوب", category: "body", badge: "hot", thumb: "", optsCols: 5, options: [
    O("lip-natural","Natural","طبيعي","تعريف خفيف ودقيق"), O("lip-medium","Medium","متوسط","امتلاء معتدل"), O("lip-full","Full","ممتلئ","حجم واضح وحدود محددة"), O("lip-extra","Extra Full","ممتلئ جداً","حجم كبير وشكل بارز"), O("lip-hollywood","Hollywood","هوليوود","أقصى حجم وامتلاء"),
  ]},
  { _id: uid(), toolId: "slim-body", nameEn: "Slim Body", nameAr: "تنحيف الجسم", descAr: "اختاري مستوى التنحيف", category: "body", badge: "pop", thumb: "", optsCols: 3, options: [
    O("slim-light","Light","خفيف","تنحيف بسيط طبيعي"), O("slim-moderate","Moderate","متوسط","خصر أصغر وجسم أنحف"), O("slim-dramatic","Dramatic","درامي","تحول كبير في الشكل"),
  ]},
  { _id: uid(), toolId: "muscle-enhance", nameEn: "Muscle Enhancement", nameAr: "إبراز العضلات", descAr: "اختر مستوى العضلات", category: "body", badge: "new", thumb: "", optsCols: 3, options: [
    O("mus-toned","Toned","متناسق","جسم رياضي خفيف"), O("mus-athletic","Athletic","رياضي","عضلات واضحة"), O("mus-bodybuilder","Bodybuilder","بودي بلدر","عضلات ضخمة"),
  ]},
  { _id: uid(), toolId: "nose-reshape", nameEn: "Nose Reshape", nameAr: "تعديل الأنف", descAr: "اختر الشكل المطلوب", category: "body", badge: "new", thumb: "", optsCols: 4, options: [
    O("nose-refine","Refined","مهذب","تصغير خفيف وتنعيم"), O("nose-slim","Slim","نحيف","أنف أنحف وأضيق"), O("nose-button","Button","صغير","أنف صغير مرفوع"), O("nose-straight","Straight","مستقيم","أنف مستقيم ومحدد"),
  ]},
  { _id: uid(), toolId: "skin-tan", nameEn: "Skin Tan", nameAr: "تسمير البشرة", descAr: "اختر درجة اللون", category: "body", badge: "new", thumb: "", optsCols: 4, options: [
    O("fair","Fair","فاتح","بشرة فاتحة جداً"), O("light-tan","Light Tan","تان خفيف","سمرة خفيفة"), O("golden-tan","Golden","ذهبي","تان ذهبي صيفي"), O("deep-tan","Deep","غامق","سمرة غامقة"),
  ]},
];

const BADGE_OPTIONS = ["hot", "new", "pop"];
const CAT_OPTIONS = ["outfit", "makeup", "hair", "body"];

/* ═══════════════════════════════════════════════════════════════════════════════
   UPLOAD HELPER
   ═══════════════════════════════════════════════════════════════════════════════ */

async function uploadToSupabase(file: File): Promise<string> {
  const res = await fetch("/api/admin/media/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type }),
  });
  if (!res.ok) throw new Error("Upload URL failed");
  const { signedUrl, publicUrl } = await res.json();
  const up = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!up.ok) throw new Error("Upload failed");
  return publicUrl;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FIELD + SORTABLE COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function Field({ label, value, onChange, multiline, placeholder, type }: {
  label: string; value: string | number; onChange: (v: string) => void;
  multiline?: boolean; placeholder?: string; type?: string;
}) {
  const cls = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50";
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
      {multiline
        ? <textarea value={String(value)} onChange={(e) => onChange(e.target.value)} className={cn(cls, "h-20 resize-none")} placeholder={placeholder} />
        : <input type={type ?? "text"} value={String(value)} onChange={(e) => onChange(e.target.value)} className={cls} placeholder={placeholder} />
      }
    </label>
  );
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative group", isDragging && "z-50 opacity-80")}>
      <button {...attributes} {...listeners}
        className="absolute -left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-800 border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10">
        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {children}
    </div>
  );
}

function MediaUploader({ url, isVideo, onUpload, label }: {
  url: string; isVideo: boolean; onUpload: (url: string, isVideo: boolean) => void; label: string;
}) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadToSupabase(file);
      onUpload(publicUrl, file.type.startsWith("video/"));
    } catch { /* skip */ }
    setUploading(false);
    if (ref.current) ref.current.value = "";
  };

  return (
    <div className="space-y-2">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
      <div className="relative rounded-xl border border-dashed border-white/15 bg-white/[.02] overflow-hidden"
        style={{ minHeight: 120 }}>
        {url ? (
          isVideo ? (
            <video src={url} className="w-full h-32 object-cover" muted loop autoPlay playsInline />
          ) : (
            <Image src={url} alt="" fill className="object-cover" unoptimized />
          )
        ) : (
          <div className="flex items-center justify-center h-32 text-zinc-600">
            <Upload className="w-5 h-5" />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={() => ref.current?.click()}
          className="flex-1 py-1.5 rounded-lg bg-violet-600/20 text-violet-400 text-xs font-bold hover:bg-violet-600/30 transition-colors">
          {uploading ? "Uploading..." : "Upload"}
        </button>
        {url && (
          <button onClick={() => onUpload("", false)}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FEATURE CARD EDITOR
   ═══════════════════════════════════════════════════════════════════════════════ */

function FeatureCardEditor({ card, onUpdate, onRemove }: {
  card: FeatureCard; onUpdate: (c: FeatureCard) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const up = (p: Partial<FeatureCard>) => onUpdate({ ...card, ...p });
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[.02] transition-colors" onClick={() => setOpen(!open)}>
        {card.mediaUrl ? (
          <div className="relative w-12 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
            <Image src={card.mediaUrl} alt="" fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="w-12 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-3 h-3 text-zinc-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{card.title || "Untitled"}</p>
          <p className="text-xs text-zinc-500 truncate">{card.subtitle}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1.5 text-red-400 hover:text-red-300 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {open && (
        <div className="p-4 pt-2 space-y-3 border-t border-white/5">
          <Field label="Title" value={card.title} onChange={(v) => up({ title: v })} />
          <Field label="Subtitle" value={card.subtitle} onChange={(v) => up({ subtitle: v })} />
          <MediaUploader url={card.mediaUrl} isVideo={card.isVideo}
            onUpload={(url, isVid) => up({ mediaUrl: url, isVideo: isVid })} label="Card Image" />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   OPTION CARD EDITOR
   ═══════════════════════════════════════════════════════════════════════════════ */

function OptionEditor({ option, onUpdate, onRemove }: {
  option: OptionCard; onUpdate: (patch: Partial<OptionCard>) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/[.06] bg-slate-800/40 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/[.02]" onClick={() => setOpen(!open)}>
        {option.img ? (
          <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
            <Image src={option.img} alt="" fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex-shrink-0 flex items-center justify-center">
            <ImageIcon className="w-3 h-3 text-zinc-600" />
          </div>
        )}
        <span className="text-xs font-semibold text-white flex-1 truncate">{option.name}</span>
        <span className="text-[10px] text-zinc-500 truncate max-w-[80px]">{option.nameAr}</span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1 text-red-400/60 hover:text-red-400"><Trash2 className="h-2.5 w-2.5" /></button>
      </div>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/5">
          <MediaUploader url={option.img} isVideo={false}
            onUpload={(url) => onUpdate({ img: url })} label="Option Image" />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Name (EN)" value={option.name} onChange={(v) => onUpdate({ name: v })} />
            <Field label="Name (AR)" value={option.nameAr} onChange={(v) => onUpdate({ nameAr: v })} />
          </div>
          <Field label="Description" value={option.desc} onChange={(v) => onUpdate({ desc: v })} />
          <Field label="Option ID" value={option.id} onChange={(v) => onUpdate({ id: v })} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TOOL CARD EDITOR
   ═══════════════════════════════════════════════════════════════════════════════ */

function ToolCardEditor({ tool, onUpdate, onRemove }: {
  tool: ToolCard; onUpdate: (t: ToolCard) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [optOpen, setOptOpen] = useState(false);
  const up = (p: Partial<ToolCard>) => onUpdate({ ...tool, ...p });

  const updateOption = (optId: string, patch: Partial<OptionCard>) => {
    up({ options: tool.options.map((o) => o._id === optId ? { ...o, ...patch } : o) });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[.02] transition-colors" onClick={() => setOpen(!open)}>
        {tool.thumb ? (
          <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
            <Image src={tool.thumb} alt="" fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3 h-3 text-zinc-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{tool.nameEn}</p>
          <p className="text-xs text-zinc-500 truncate">{tool.nameAr} · {tool.category} · {tool.options.length} options</p>
        </div>
        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
          tool.badge === "hot" ? "bg-orange-500/20 text-orange-400" :
          tool.badge === "new" ? "bg-emerald-500/20 text-emerald-400" :
          "bg-pink-500/20 text-pink-400"
        )}>
          {tool.badge}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1.5 text-red-400 hover:text-red-300 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {open && (
        <div className="p-4 pt-2 space-y-3 border-t border-white/5">
          <MediaUploader url={tool.thumb} isVideo={false}
            onUpload={(url) => up({ thumb: url })} label="Tool Thumbnail" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name (EN)" value={tool.nameEn} onChange={(v) => up({ nameEn: v })} />
            <Field label="Name (AR)" value={tool.nameAr} onChange={(v) => up({ nameAr: v })} />
          </div>
          <Field label="Description (AR)" value={tool.descAr} onChange={(v) => up({ descAr: v })} />
          <div className="grid grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Category</span>
              <select value={tool.category} onChange={(e) => up({ category: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none">
                {CAT_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Badge</span>
              <select value={tool.badge} onChange={(e) => up({ badge: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none">
                {BADGE_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <Field label="Grid Cols" value={tool.optsCols} onChange={(v) => up({ optsCols: Number(v) || 4 })} type="number" />
          </div>

          {/* ── Options Section ── */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <button onClick={() => setOptOpen(!optOpen)} className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider hover:text-zinc-200 transition-colors">
                <span>Options ({tool.options.length})</span>
                {optOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <button onClick={() => up({ options: [...tool.options, { _id: uid(), id: "new-opt", name: "New Option", nameAr: "خيار جديد", desc: "وصف", img: "" }] })}
                className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:bg-white/10">
                <Plus className="h-3 w-3" /> Add Option
              </button>
            </div>
            {optOpen && (
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                {tool.options.map((opt) => (
                  <OptionEditor key={opt._id} option={opt}
                    onUpdate={(patch) => updateOption(opt._id, patch)}
                    onRemove={() => up({ options: tool.options.filter((o) => o._id !== opt._id) })} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CATEGORY ROW
   ═══════════════════════════════════════════════════════════════════════════════ */

function CategoryRow({ cat, onUpdate, onRemove }: {
  cat: CategoryTab; onUpdate: (c: CategoryTab) => void; onRemove: () => void;
}) {
  const up = (p: Partial<CategoryTab>) => onUpdate({ ...cat, ...p });
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-slate-900/80">
      <div className="flex-1 grid grid-cols-3 gap-2">
        <input value={cat.id} onChange={(e) => up({ id: e.target.value })} placeholder="all"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none" />
        <input value={cat.labelEn} onChange={(e) => up({ labelEn: e.target.value })} placeholder="All"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none" />
        <input value={cat.labelAr} onChange={(e) => up({ labelAr: e.target.value })} placeholder="الكل"
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none" />
      </div>
      <button onClick={onRemove} className="p-1.5 text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Beauty2CmsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // State
  const [hero, setHero] = useState<HeroData>(SEED_HERO);
  const [featureCards, setFeatureCards] = useState<FeatureCard[]>(SEED_FEATURE_CARDS);
  const [categories, setCategories] = useState<CategoryTab[]>(SEED_CATEGORIES);
  const [tools, setTools] = useState<ToolCard[]>(SEED_TOOLS);
  const [filterCat, setFilterCat] = useState("all");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Load
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/layouts?page=cms-beauty2");
        if (!res.ok) return;
        const row = await res.json();
        const b = row?.layoutBlocks;
        if (!b) return;
        if (b.hero) setHero(b.hero);
        if (b.featureCards?.length) setFeatureCards(b.featureCards);
        if (b.categories?.length) setCategories(b.categories);
        if (b.tools?.length) setTools(b.tools.map((t: Record<string, unknown>) => ({
          ...t,
          options: Array.isArray(t.options) ? t.options : [],
          optsCols: typeof t.optsCols === "number" ? t.optsCols : 4,
        })) as ToolCard[]);
      } catch { /* use seeds */ }
    })();
  }, []);

  // Also convert & save into the old block format for usePageLayout("beauty2")
  const saveOldBlocks = useCallback(async (h: HeroData, cards: FeatureCard[]) => {
    const blocks = [
      {
        id: "hero-1",
        type: "HERO",
        title: h.title,
        subtitle: h.subtitle,
        mediaUrl: h.mediaUrl,
        isVideo: h.isVideo,
        badge: h.badge,
        ctaHref: h.ctaHref,
        ctaLabel: h.ctaLabel,
      },
      ...cards.map((c) => ({
        id: c._id,
        type: "FEATURE_CARD",
        title: c.title,
        subtitle: c.subtitle,
        mediaUrl: c.mediaUrl,
        isVideo: c.isVideo,
      })),
    ];
    await fetch("/api/admin/layouts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageName: "beauty2", layoutBlocks: blocks }),
    });
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    setSaving(true);
    const payload: Beauty2CmsData = { hero, featureCards, categories, tools };
    try {
      // Save the full CMS data
      await fetch("/api/admin/layouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageName: "cms-beauty2", layoutBlocks: payload }),
      });
      // Also save old block format for the live page
      await saveOldBlocks(hero, featureCards);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* skip */ }
    setSaving(false);
  }, [hero, featureCards, categories, tools, saveOldBlocks]);

  // DnD handlers
  const handleFeatureDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFeatureCards((prev) => {
        const oldIdx = prev.findIndex((c) => c._id === active.id);
        const newIdx = prev.findIndex((c) => c._id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const handleToolDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTools((prev) => {
        const oldIdx = prev.findIndex((t) => t._id === active.id);
        const newIdx = prev.findIndex((t) => t._id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const filteredTools = filterCat === "all" ? tools : tools.filter((t) => t.category === filterCat);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Top bar */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-pink-400" />
                Beauty Studio CMS
              </h1>
              <p className="text-[11px] text-zinc-500">Manage hero, feature cards, categories & tools</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/beauty2.html" target="_blank"
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-white/10 transition-colors">
              <Eye className="h-3.5 w-3.5" /> Preview
            </a>
            <button onClick={handleSave} disabled={saving}
              className={cn(
                "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300",
                saved
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25"
              )}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saved ? "Saved!" : saving ? "Saving..." : "Publish"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">

        {/* ── Hero Section ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-pink-500" />
            Hero Section
          </h2>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
            <MediaUploader url={hero.mediaUrl} isVideo={hero.isVideo}
              onUpload={(url, isVid) => setHero({ ...hero, mediaUrl: url, isVideo: isVid })} label="Background Image / Video" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Badge" value={hero.badge} onChange={(v) => setHero({ ...hero, badge: v })} placeholder="SAAD STUDIO" />
              <Field label="CTA Href" value={hero.ctaHref} onChange={(v) => setHero({ ...hero, ctaHref: v })} placeholder="/beauty2.html" />
            </div>
            <Field label="Title" value={hero.title} onChange={(v) => setHero({ ...hero, title: v })} />
            <Field label="Subtitle" value={hero.subtitle} onChange={(v) => setHero({ ...hero, subtitle: v })} multiline />
          </div>
        </section>

        {/* ── Feature Cards ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-violet-500" />
            Feature Cards
          </h2>
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">Shown above the tools grid (max 6)</p>
            <button onClick={() => setFeatureCards([...featureCards, { _id: uid(), title: "New Card", subtitle: "Description", mediaUrl: "", isVideo: false }])}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600/20 px-3 py-1.5 text-xs font-bold text-violet-400 hover:bg-violet-600/30 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Card
            </button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFeatureDragEnd}>
            <SortableContext items={featureCards.map((c) => c._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {featureCards.map((card) => (
                  <SortableItem key={card._id} id={card._id}>
                    <FeatureCardEditor card={card}
                      onUpdate={(c) => setFeatureCards((prev) => prev.map((x) => x._id === c._id ? c : x))}
                      onRemove={() => setFeatureCards((prev) => prev.filter((x) => x._id !== card._id))} />
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        {/* ── Categories ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-amber-500" />
            Category Tabs
          </h2>
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">ID · English · Arabic</p>
            <button onClick={() => setCategories([...categories, { _id: uid(), id: "new", labelEn: "New", labelAr: "جديد" }])}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600/20 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-600/30 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Category
            </button>
          </div>
          <div className="space-y-2">
            {categories.map((cat) => (
              <CategoryRow key={cat._id} cat={cat}
                onUpdate={(c) => setCategories((prev) => prev.map((x) => x._id === c._id ? c : x))}
                onRemove={() => setCategories((prev) => prev.filter((x) => x._id !== cat._id))} />
            ))}
          </div>
        </section>

        {/* ── Tools Grid ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-emerald-500" />
            Beauty Tools ({tools.length})
          </h2>

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {["all", ...CAT_OPTIONS].map((c) => (
              <button key={c} onClick={() => setFilterCat(c)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-bold transition-colors border",
                  filterCat === c
                    ? "border-pink-500/50 bg-pink-500/10 text-pink-400"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                )}>
                {c === "all" ? `All (${tools.length})` : `${c} (${tools.filter((t) => t.category === c).length})`}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end">
            <button onClick={() => setTools([...tools, {
              _id: uid(), toolId: "new-tool", nameEn: "New Tool", nameAr: "أداة جديدة",
              descAr: "وصف الأداة", category: "outfit", badge: "new", thumb: "", optsCols: 4,
              options: [{ _id: uid(), id: "opt-1", name: "Option 1", nameAr: "خيار ١", desc: "وصف", img: "" }],
            }])}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600/20 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-600/30 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Tool
            </button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleToolDragEnd}>
            <SortableContext items={filteredTools.map((t) => t._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {filteredTools.map((tool) => (
                  <SortableItem key={tool._id} id={tool._id}>
                    <ToolCardEditor tool={tool}
                      onUpdate={(t) => setTools((prev) => prev.map((x) => x._id === t._id ? t : x))}
                      onRemove={() => setTools((prev) => prev.filter((x) => x._id !== tool._id))} />
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>

      </div>
    </div>
  );
}
