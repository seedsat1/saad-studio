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
  Save, Plus, Trash2, GripVertical, Upload, X, Loader2,
  ArrowLeft, Eye, Compass, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════════ */

const uid = () => Math.random().toString(36).slice(2, 10);

interface CoreTool {
  _id: string;
  id: string;
  name: string;
  desc: string;
  href: string;
  badge: string;
  image: string;
}

interface TopTool {
  _id: string;
  id: string;
  name: string;
  desc: string;
  href: string;
  badge: string;
  image: string;
}

interface PhotodumpData {
  badge: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
  image: string;
  floatingBadges: string[];
}

interface AppItem {
  _id: string;
  name: string;
}

interface ModelItem {
  _id: string;
  name: string;
  emoji: string;
}

interface FooterLink {
  _id: string;
  label: string;
  href: string;
}

interface FooterSection {
  _id: string;
  title: string;
  links: FooterLink[];
}

interface SocialLink {
  _id: string;
  platform: string;
  href: string;
}

interface FooterData {
  brandName: string;
  tagline: string;
  email: string;
  logoUrl: string;
  sections: FooterSection[];
  socialLinks: SocialLink[];
  newsletterHeading: string;
  newsletterSubtitle: string;
}

interface DiscoverCmsData {
  coreTools: { heading: string; subtitle: string; tools: CoreTool[] };
  topChoice: { heading: string; subtitle: string; seeAllHref: string; tools: TopTool[] };
  photodump: PhotodumpData;
  appsCarousel: { heading: string; subtitle: string; apps: AppItem[] };
  modelsShowcase: { heading: string; subtitle: string; models: ModelItem[] };
  footer: FooterData;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SEEDS
   ═══════════════════════════════════════════════════════════════════════════════ */

const SEED_CORE_TOOLS: CoreTool[] = [
  { _id: uid(), id: "create-image", name: "Create Image", desc: "Generate AI images", href: "/image", badge: "TOP", image: "" },
  { _id: uid(), id: "create-video", name: "Create Video", desc: "Generate AI videos", href: "/video", badge: "", image: "" },
  { _id: uid(), id: "motion-control", name: "Motion Control", desc: "Precise character control", href: "/cinema-studio", badge: "NEW", image: "" },
  { _id: uid(), id: "soul-2", name: "ماجك", desc: "Ultra-realistic fashion visuals", href: "/image/soul-id-character", badge: "NEW", image: "" },
  { _id: uid(), id: "soul-id", name: "Soul ID", desc: "Create unique characters", href: "/image/soul-id-character", badge: "", image: "" },
  { _id: uid(), id: "upscale", name: "Upscale", desc: "Enhance media quality", href: "/apps/tool/image-upscale", badge: "", image: "" },
  { _id: uid(), id: "edit-image", name: "Edit Image", desc: "AI-powered editing", href: "/edit", badge: "", image: "" },
  { _id: uid(), id: "edit-video", name: "Edit Video", desc: "Advanced video editing", href: "/video/edit", badge: "", image: "" },
  { _id: uid(), id: "mixed-media", name: "Mixed Media", desc: "Transform with AI presets", href: "/video/mixed-media", badge: "", image: "" },
  { _id: uid(), id: "angles-2", name: "Angles 2.0", desc: "Multi-angle generation", href: "/image/angles", badge: "NEW", image: "" },
];

const SEED_TOP_TOOLS: TopTool[] = [
  { _id: uid(), id: "nano-banana-pro", name: "Nano Banana Pro", desc: "Best 4K image model. Photorealistic output with state-of-the-art quality.", href: "/image", badge: "Popular", image: "" },
  { _id: uid(), id: "motion-control", name: "Motion Control", desc: "Character actions up to 30 seconds with precise cinematic control.", href: "/cinema-studio", badge: "", image: "" },
  { _id: uid(), id: "skin-enhancer", name: "Skin Enhancer", desc: "Natural, flawless skin textures with zero artifacts and real depth.", href: "/apps/tool/skin-enhancer", badge: "Pro", image: "" },
  { _id: uid(), id: "shots", name: "Shots", desc: "9 unique cinematic shots from a single image. Instant variety.", href: "/image/shots", badge: "", image: "" },
  { _id: uid(), id: "angles-2", name: "Angles 2.0", desc: "Multi-angle character and product generation from one source image.", href: "/image/angles", badge: "Pro", image: "" },
  { _id: uid(), id: "kling-3", name: "Kling 3.0", desc: "15-second videos with frame-perfect consistency and motion depth.", href: "/video", badge: "", image: "" },
  { _id: uid(), id: "seedream-5", name: "Seedream 5.0", desc: "Intelligent visual reasoning with contextual image generation.", href: "/image", badge: "New", image: "" },
  { _id: uid(), id: "soul-moodboard", name: "Soul Moodboard", desc: "Style your AI characters with real fashion references and presets.", href: "/moodboard", badge: "", image: "" },
];

const SEED_PHOTODUMP: PhotodumpData = {
  badge: "photodump",
  title: "Different Scenes Same Star",
  subtitle: "Build your character once. Drop them into any scene, outfit, or environment — one click does the rest.",
  cta: "Try Photodump",
  ctaHref: "/image/photodump",
  image: "",
  floatingBadges: ["Beach Scene", "City Night", "Studio Shot"],
};

const SEED_APPS: AppItem[] = [
  "Angles 2.0", "AI Stylist", "Relight", "Shots", "Zooms", "Skin Enhancer",
  "ClipCut", "Behind the Scenes", "Urban Cuts", "Sticker", "Match Cut",
  "Outfit Swap", "Game Dump", "Style Snap", "Paint App", "Nano Strike",
  "Breakdown", "Simlife", "Signboard", "Glitter Sticker", "Plushies",
  "Click to Ad", "Micro-Beasts", "Transitions", "Recast", "Character Swap 2.0",
  "Face Swap", "Commercial Faces", "ASMR Add-On", "ASMR Classic", "Poster",
  "Video Face Swap", "3D Render", "Bullet Time", "Chameleon", "Packshot",
  "Magic Button", "Truck Ad", "Giant Product", "Billboard Ad", "Graffiti Ad",
  "Volcano Ad", "Latex", "Pixel Game", "GTA", "Roller Coaster", "Comic Book",
  "Cloud Surf", "Mukbang", "Renaissance", "Rap God", "Mugshot", "Cosplay",
  "Meme Generator", "Headshot Generator", "Background Remover",
].map((n) => ({ _id: uid(), name: n }));

const SEED_MODELS: ModelItem[] = [
  { _id: uid(), name: "Kling 3.0", emoji: "🎬" },
  { _id: uid(), name: "Sora 2", emoji: "🌐" },
  { _id: uid(), name: "Veo 3.1", emoji: "🎥" },
  { _id: uid(), name: "WAN 2.5", emoji: "🌊" },
  { _id: uid(), name: "MiniMax", emoji: "⚡" },
  { _id: uid(), name: "Seedance Pro", emoji: "🌱" },
  { _id: uid(), name: "Flux Kontext", emoji: "🔮" },
  { _id: uid(), name: "GPT Image", emoji: "🤖" },
  { _id: uid(), name: "Topaz", emoji: "💎" },
  { _id: uid(), name: "Nano Banana", emoji: "🍌" },
  { _id: uid(), name: "Seedream 5.0", emoji: "🌸" },
];

const SEED_FOOTER: FooterData = {
  brandName: "Saad Studio",
  tagline: "The world's most powerful AI creative studio.",
  email: "support@saadstudio.app",
  logoUrl: "/logo-saad-transparent.png",
  sections: [
    {
      _id: uid(), title: "AI Tools",
      links: [
        { _id: uid(), label: "Image Generation", href: "/image" },
        { _id: uid(), label: "Video Generation", href: "/video" },
        { _id: uid(), label: "Audio & Music", href: "/music" },
        { _id: uid(), label: "AI Editing Suite", href: "/edit" },
        { _id: uid(), label: "Character Studio", href: "/character" },
        { _id: uid(), label: "Next Scene", href: "/cinema-studio" },
        { _id: uid(), label: "AI Assist (Chat)", href: "/conversation" },
        { _id: uid(), label: "Apps Gallery", href: "/apps" },
      ],
    },
    {
      _id: uid(), title: "Resources",
      links: [
        { _id: uid(), label: "Documentation", href: "/docs" },
        { _id: uid(), label: "API Reference", href: "/api-docs" },
        { _id: uid(), label: "Tutorials", href: "/tutorials" },
        { _id: uid(), label: "Blog", href: "/blog" },
        { _id: uid(), label: "Changelog", href: "/changelog" },
        { _id: uid(), label: "Status", href: "/status" },
        { _id: uid(), label: "Community", href: "/community" },
      ],
    },
    {
      _id: uid(), title: "Company",
      links: [
        { _id: uid(), label: "About Us", href: "/about" },
        { _id: uid(), label: "Careers", href: "/careers" },
        { _id: uid(), label: "Press Kit", href: "/press" },
        { _id: uid(), label: "Contact", href: "/contact" },
        { _id: uid(), label: "Pricing", href: "/pricing" },
        { _id: uid(), label: "Privacy Policy", href: "/privacy" },
        { _id: uid(), label: "Terms & Conditions", href: "/terms" },
      ],
    },
  ],
  socialLinks: [
    { _id: uid(), platform: "Twitter", href: "#" },
    { _id: uid(), platform: "Instagram", href: "#" },
    { _id: uid(), platform: "YouTube", href: "#" },
    { _id: uid(), platform: "GitHub", href: "#" },
    { _id: uid(), platform: "LinkedIn", href: "#" },
    { _id: uid(), platform: "Discord", href: "#" },
  ],
  newsletterHeading: "Stay in the loop ✨",
  newsletterSubtitle: "New models & drops. No spam.",
};

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
   SHARED UI
   ═══════════════════════════════════════════════════════════════════════════════ */

function Field({ label, value, onChange, multiline, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; placeholder?: string;
}) {
  const cls = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50";
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
      {multiline
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} className={cn(cls, "h-20 resize-none")} placeholder={placeholder} />
        : <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} placeholder={placeholder} />}
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

function MediaUploader({ url, onUpload, label }: {
  url: string; onUpload: (url: string) => void; label: string;
}) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { onUpload(await uploadToSupabase(file)); } catch { /* skip */ }
    setUploading(false);
    if (ref.current) ref.current.value = "";
  };
  return (
    <div className="space-y-2">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
      <div className="relative rounded-xl border border-dashed border-white/15 bg-white/[.02] overflow-hidden" style={{ minHeight: 72 }}>
        {url ? <Image src={url} alt="" fill className="object-cover" unoptimized />
          : <div className="flex items-center justify-center h-[72px] text-zinc-600"><Upload className="w-5 h-5" /></div>}
        {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>}
      </div>
      <div className="flex gap-2">
        <button onClick={() => ref.current?.click()} className="flex-1 py-1.5 rounded-lg bg-violet-600/20 text-violet-400 text-xs font-bold hover:bg-violet-600/30 transition-colors">{uploading ? "Uploading..." : "Upload"}</button>
        {url && <button onClick={() => onUpload("")} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"><X className="w-3 h-3" /></button>}
      </div>
      <input ref={ref} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TOOL ROW (shared for CoreTools & TopChoice)
   ═══════════════════════════════════════════════════════════════════════════════ */

function ToolRow({ tool, onUpdate, onRemove }: {
  tool: CoreTool | TopTool; onUpdate: (t: CoreTool | TopTool) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const up = (p: Partial<CoreTool>) => onUpdate({ ...tool, ...p });
  return (
    <div className="rounded-xl border border-white/[.06] bg-slate-900/40 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/[.02] transition-colors" onClick={() => setOpen(!open)}>
        {tool.image ? (
          <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
            <Image src={tool.image} alt="" fill className="object-cover" unoptimized />
          </div>
        ) : <div className="w-8 h-8 rounded-lg bg-slate-800 flex-shrink-0" />}
        <span className="text-xs font-semibold text-white flex-1 truncate">{tool.name}</span>
        {tool.badge && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/5 text-zinc-400">{tool.badge}</span>}
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1 text-red-400/60 hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
      </div>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/5">
          <MediaUploader url={tool.image} onUpload={(url) => up({ image: url })} label="Thumbnail" />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Name" value={tool.name} onChange={(v) => up({ name: v })} />
            <Field label="Tool ID" value={tool.id} onChange={(v) => up({ id: v })} />
          </div>
          <Field label="Description" value={tool.desc} onChange={(v) => up({ desc: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Href" value={tool.href} onChange={(v) => up({ href: v })} />
            <Field label="Badge" value={tool.badge} onChange={(v) => up({ badge: v })} placeholder="NEW / TOP / Pro" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FOOTER SECTION EDITOR
   ═══════════════════════════════════════════════════════════════════════════════ */

function FooterSectionEditor({ section, onUpdate, onRemove }: {
  section: FooterSection; onUpdate: (s: FooterSection) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const links = [...section.links];
      const oi = links.findIndex((l) => l._id === active.id);
      const ni = links.findIndex((l) => l._id === over.id);
      onUpdate({ ...section, links: arrayMove(links, oi, ni) });
    }
  };

  return (
    <div className="rounded-xl border border-white/[.06] bg-slate-900/40 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-white/[.02]" onClick={() => setOpen(!open)}>
        <span className="text-xs font-bold text-white flex-1">{section.title}</span>
        <span className="text-[10px] text-zinc-500">{section.links.length} links</span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1 text-red-400/60 hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
      </div>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/5">
          <Field label="Section Title" value={section.title} onChange={(v) => onUpdate({ ...section, title: v })} />
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={section.links.map((l) => l._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {section.links.map((link) => (
                  <SortableItem key={link._id} id={link._id}>
                    <div className="flex items-center gap-2 rounded-lg bg-white/[.02] px-2 py-1.5">
                      <input value={link.label} onChange={(e) => onUpdate({ ...section, links: section.links.map((l) => l._id === link._id ? { ...l, label: e.target.value } : l) })}
                        className="flex-1 bg-transparent text-xs text-white focus:outline-none" placeholder="Label" />
                      <input value={link.href} onChange={(e) => onUpdate({ ...section, links: section.links.map((l) => l._id === link._id ? { ...l, href: e.target.value } : l) })}
                        className="w-32 bg-transparent text-xs text-zinc-500 focus:outline-none" placeholder="/path" />
                      <button onClick={() => onUpdate({ ...section, links: section.links.filter((l) => l._id !== link._id) })}
                        className="p-0.5 text-red-400/50 hover:text-red-400"><Trash2 className="h-2.5 w-2.5" /></button>
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button onClick={() => onUpdate({ ...section, links: [...section.links, { _id: uid(), label: "New Link", href: "/" }] })}
            className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-300"><Plus className="h-3 w-3" /> Add Link</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   COLLAPSIBLE SECTION
   ═══════════════════════════════════════════════════════════════════════════════ */

function Section({ title, color, count, children, defaultOpen }: {
  title: string; color: string; count?: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <section className="space-y-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-left">
        <div className={cn("h-6 w-1 rounded-full", color)} />
        <h2 className="text-lg font-bold text-white flex-1">
          {title} {count !== undefined && <span className="text-zinc-500 text-sm font-normal">({count})</span>}
        </h2>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>
      {open && <div className="space-y-4">{children}</div>}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function DiscoverCmsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Core Tools
  const [coreHeading, setCoreHeading] = useState("What will you create today?");
  const [coreSubtitle, setCoreSubtitle] = useState("Pick a tool and start generating in seconds");
  const [coreTools, setCoreTools] = useState<CoreTool[]>(SEED_CORE_TOOLS);

  // Top Choice
  const [topHeading, setTopHeading] = useState("Top Choice");
  const [topSubtitle, setTopSubtitle] = useState("Creator-recommended tools");
  const [topSeeAll, setTopSeeAll] = useState("/apps");
  const [topTools, setTopTools] = useState<TopTool[]>(SEED_TOP_TOOLS);

  // Photodump
  const [photodump, setPhotodump] = useState<PhotodumpData>(SEED_PHOTODUMP);

  // Apps Carousel
  const [appsHeading, setAppsHeading] = useState("All AI Apps");
  const [appsSubtitle, setAppsSubtitle] = useState("powerful tools in one studio");
  const [apps, setApps] = useState<AppItem[]>(SEED_APPS);

  // Models
  const [modelsHeading, setModelsHeading] = useState("Powered by the best AI models");
  const [modelsSubtitle, setModelsSubtitle] = useState("Access every top-tier model from one unified studio");
  const [models, setModels] = useState<ModelItem[]>(SEED_MODELS);

  // Footer
  const [footer, setFooter] = useState<FooterData>(SEED_FOOTER);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Load
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/layouts?page=cms-discover");
        if (!res.ok) return;
        const row = await res.json();
        const b = row?.layoutBlocks;
        if (!b) return;
        if (b.coreTools) {
          if (b.coreTools.heading) setCoreHeading(b.coreTools.heading);
          if (b.coreTools.subtitle) setCoreSubtitle(b.coreTools.subtitle);
          if (b.coreTools.tools?.length) setCoreTools(b.coreTools.tools);
        }
        if (b.topChoice) {
          if (b.topChoice.heading) setTopHeading(b.topChoice.heading);
          if (b.topChoice.subtitle) setTopSubtitle(b.topChoice.subtitle);
          if (b.topChoice.seeAllHref) setTopSeeAll(b.topChoice.seeAllHref);
          if (b.topChoice.tools?.length) setTopTools(b.topChoice.tools);
        }
        if (b.photodump) setPhotodump(b.photodump);
        if (b.appsCarousel) {
          if (b.appsCarousel.heading) setAppsHeading(b.appsCarousel.heading);
          if (b.appsCarousel.subtitle) setAppsSubtitle(b.appsCarousel.subtitle);
          if (b.appsCarousel.apps?.length) setApps(b.appsCarousel.apps);
        }
        if (b.modelsShowcase) {
          if (b.modelsShowcase.heading) setModelsHeading(b.modelsShowcase.heading);
          if (b.modelsShowcase.subtitle) setModelsSubtitle(b.modelsShowcase.subtitle);
          if (b.modelsShowcase.models?.length) setModels(b.modelsShowcase.models);
        }
        if (b.footer) setFooter(b.footer);
      } catch { /* seeds */ }
    })();
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    setSaving(true);
    const payload: DiscoverCmsData = {
      coreTools: { heading: coreHeading, subtitle: coreSubtitle, tools: coreTools },
      topChoice: { heading: topHeading, subtitle: topSubtitle, seeAllHref: topSeeAll, tools: topTools },
      photodump,
      appsCarousel: { heading: appsHeading, subtitle: appsSubtitle, apps },
      modelsShowcase: { heading: modelsHeading, subtitle: modelsSubtitle, models },
      footer,
    };
    try {
      const res = await fetch("/api/admin/layouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageName: "cms-discover", layoutBlocks: payload }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaved(false);
      alert("Save failed. Please check admin permissions and database connection.");
    }
    setSaving(false);
  }, [coreHeading, coreSubtitle, coreTools, topHeading, topSubtitle, topSeeAll, topTools, photodump, appsHeading, appsSubtitle, apps, modelsHeading, modelsSubtitle, models, footer]);

  /* DnD handlers */
  const makeDragHandler = <T extends { _id: string }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setter((prev) => {
        const oi = prev.findIndex((x) => x._id === active.id);
        const ni = prev.findIndex((x) => x._id === over.id);
        return arrayMove(prev, oi, ni);
      });
    }
  };

  const handleFooterSectionDrag = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFooter((prev) => {
      const oi = prev.sections.findIndex((x) => x._id === active.id);
      const ni = prev.sections.findIndex((x) => x._id === over.id);
      if (oi < 0 || ni < 0) return prev;
      return { ...prev, sections: arrayMove(prev.sections, oi, ni) };
    });
  };

  const handleFooterSocialDrag = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFooter((prev) => {
      const oi = prev.socialLinks.findIndex((x) => x._id === active.id);
      const ni = prev.socialLinks.findIndex((x) => x._id === over.id);
      if (oi < 0 || ni < 0) return prev;
      return { ...prev, socialLinks: arrayMove(prev.socialLinks, oi, ni) };
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Top bar */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="p-2 rounded-lg hover:bg-white/5 transition-colors"><ArrowLeft className="h-4 w-4" /></button>
            <div>
              <h1 className="text-base font-bold flex items-center gap-2"><Compass className="h-4 w-4 text-cyan-400" /> Discover Page CMS</h1>
              <p className="text-[11px] text-zinc-500">{coreTools.length} core · {topTools.length} top · {apps.length} apps · {models.length} models</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/explore" target="_blank" className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-white/10 transition-colors"><Eye className="h-3.5 w-3.5" /> Preview</a>
            <button onClick={handleSave} disabled={saving}
              className={cn("flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300",
                saved ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25")}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saved ? "Saved!" : saving ? "Saving..." : "Publish"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* ═══ CORE TOOLS ═══ */}
        <Section title="Core Tools" color="bg-cyan-500" count={coreTools.length} defaultOpen>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
            <Field label="Section Heading" value={coreHeading} onChange={setCoreHeading} />
            <Field label="Section Subtitle" value={coreSubtitle} onChange={setCoreSubtitle} />
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tools</p>
              <button onClick={() => setCoreTools([...coreTools, { _id: uid(), id: "new-tool", name: "New Tool", desc: "Description", href: "/", badge: "", image: "" }])}
                className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:bg-white/10"><Plus className="h-3 w-3" /> Add</button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeDragHandler(setCoreTools)}>
              <SortableContext items={coreTools.map((t) => t._id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {coreTools.map((t) => (
                    <SortableItem key={t._id} id={t._id}>
                      <ToolRow tool={t} onUpdate={(u) => setCoreTools((p) => p.map((x) => x._id === u._id ? u as CoreTool : x))} onRemove={() => setCoreTools((p) => p.filter((x) => x._id !== t._id))} />
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </Section>

        {/* ═══ TOP CHOICE ═══ */}
        <Section title="Top Choice" color="bg-amber-500" count={topTools.length}>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Section Heading" value={topHeading} onChange={setTopHeading} />
              <Field label="Section Subtitle" value={topSubtitle} onChange={setTopSubtitle} />
            </div>
            <Field label="'See All' Link" value={topSeeAll} onChange={setTopSeeAll} />
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tools</p>
              <button onClick={() => setTopTools([...topTools, { _id: uid(), id: "new-tool", name: "New Tool", desc: "Description", href: "/", badge: "", image: "" }])}
                className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:bg-white/10"><Plus className="h-3 w-3" /> Add</button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeDragHandler(setTopTools)}>
              <SortableContext items={topTools.map((t) => t._id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {topTools.map((t) => (
                    <SortableItem key={t._id} id={t._id}>
                      <ToolRow tool={t} onUpdate={(u) => setTopTools((p) => p.map((x) => x._id === u._id ? u as TopTool : x))} onRemove={() => setTopTools((p) => p.filter((x) => x._id !== t._id))} />
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </Section>

        {/* ═══ PHOTODUMP CTA ═══ */}
        <Section title="Photodump CTA" color="bg-pink-500">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
            <MediaUploader url={photodump.image} onUpload={(url) => setPhotodump({ ...photodump, image: url })} label="Hero Image" />
            <Field label="Badge" value={photodump.badge} onChange={(v) => setPhotodump({ ...photodump, badge: v })} />
            <Field label="Title" value={photodump.title} onChange={(v) => setPhotodump({ ...photodump, title: v })} />
            <Field label="Subtitle" value={photodump.subtitle} onChange={(v) => setPhotodump({ ...photodump, subtitle: v })} multiline />
            <div className="grid grid-cols-2 gap-3">
              <Field label="CTA Text" value={photodump.cta} onChange={(v) => setPhotodump({ ...photodump, cta: v })} />
              <Field label="CTA Href" value={photodump.ctaHref} onChange={(v) => setPhotodump({ ...photodump, ctaHref: v })} />
            </div>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Floating Badges (comma-separated)</span>
              <input type="text" value={photodump.floatingBadges.join(", ")}
                onChange={(e) => setPhotodump({ ...photodump, floatingBadges: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                placeholder="Beach Scene, City Night, Studio Shot" />
            </label>
          </div>
        </Section>

        {/* ═══ APPS CAROUSEL ═══ */}
        <Section title="Apps Carousel" color="bg-violet-500" count={apps.length}>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Heading" value={appsHeading} onChange={setAppsHeading} />
              <Field label="Subtitle" value={appsSubtitle} onChange={setAppsSubtitle} />
            </div>
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">App Names</p>
              <button onClick={() => setApps([...apps, { _id: uid(), name: "New App" }])}
                className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:bg-white/10"><Plus className="h-3 w-3" /> Add</button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeDragHandler(setApps)}>
              <SortableContext items={apps.map((a) => a._id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {apps.map((app) => (
                    <SortableItem key={app._id} id={app._id}>
                      <div className="flex items-center gap-2 rounded-lg bg-white/[.02] border border-white/[.04] px-3 py-1.5">
                        <input value={app.name} onChange={(e) => setApps((p) => p.map((a) => a._id === app._id ? { ...a, name: e.target.value } : a))}
                          className="flex-1 bg-transparent text-xs text-white focus:outline-none" />
                        <button onClick={() => setApps((p) => p.filter((a) => a._id !== app._id))}
                          className="p-0.5 text-red-400/50 hover:text-red-400"><Trash2 className="h-2.5 w-2.5" /></button>
                      </div>
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </Section>

        {/* ═══ MODELS SHOWCASE ═══ */}
        <Section title="Models Showcase" color="bg-emerald-500" count={models.length}>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Heading" value={modelsHeading} onChange={setModelsHeading} />
              <Field label="Subtitle" value={modelsSubtitle} onChange={setModelsSubtitle} />
            </div>
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Models</p>
              <button onClick={() => setModels([...models, { _id: uid(), name: "New Model", emoji: "✨" }])}
                className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:bg-white/10"><Plus className="h-3 w-3" /> Add</button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeDragHandler(setModels)}>
              <SortableContext items={models.map((m) => m._id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {models.map((m) => (
                    <SortableItem key={m._id} id={m._id}>
                      <div className="flex items-center gap-2 rounded-lg bg-white/[.02] border border-white/[.04] px-3 py-1.5">
                        <input value={m.emoji} onChange={(e) => setModels((p) => p.map((x) => x._id === m._id ? { ...x, emoji: e.target.value } : x))}
                          className="w-8 bg-transparent text-center text-sm focus:outline-none" />
                        <input value={m.name} onChange={(e) => setModels((p) => p.map((x) => x._id === m._id ? { ...x, name: e.target.value } : x))}
                          className="flex-1 bg-transparent text-xs text-white focus:outline-none" />
                        <button onClick={() => setModels((p) => p.filter((x) => x._id !== m._id))}
                          className="p-0.5 text-red-400/50 hover:text-red-400"><Trash2 className="h-2.5 w-2.5" /></button>
                      </div>
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </Section>

        {/* ═══ FOOTER ═══ */}
        <Section title="Footer" color="bg-rose-500">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Brand Name" value={footer.brandName} onChange={(v) => setFooter({ ...footer, brandName: v })} />
              <Field label="Email" value={footer.email} onChange={(v) => setFooter({ ...footer, email: v })} />
            </div>
            <Field label="Tagline" value={footer.tagline} onChange={(v) => setFooter({ ...footer, tagline: v })} />
            <MediaUploader url={footer.logoUrl} onUpload={(url) => setFooter({ ...footer, logoUrl: url })} label="Logo" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Newsletter Heading" value={footer.newsletterHeading} onChange={(v) => setFooter({ ...footer, newsletterHeading: v })} />
              <Field label="Newsletter Subtitle" value={footer.newsletterSubtitle} onChange={(v) => setFooter({ ...footer, newsletterSubtitle: v })} />
            </div>

            {/* Link Sections */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Link Sections</p>
              <button onClick={() => setFooter({ ...footer, sections: [...footer.sections, { _id: uid(), title: "New Section", links: [] }] })}
                className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:bg-white/10"><Plus className="h-3 w-3" /> Add Section</button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleFooterSectionDrag}
            >
              <SortableContext items={footer.sections.map((sec) => sec._id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
                  {footer.sections.map((sec) => (
                    <SortableItem key={sec._id} id={sec._id}>
                      <FooterSectionEditor section={sec}
                        onUpdate={(s) => setFooter({ ...footer, sections: footer.sections.map((x) => x._id === s._id ? s : x) })}
                        onRemove={() => setFooter({ ...footer, sections: footer.sections.filter((x) => x._id !== sec._id) })} />
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Social Links */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Social Links</p>
              <button onClick={() => setFooter({ ...footer, socialLinks: [...footer.socialLinks, { _id: uid(), platform: "Link", href: "#" }] })}
                className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:bg-white/10"><Plus className="h-3 w-3" /> Add</button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleFooterSocialDrag}
            >
              <SortableContext items={footer.socialLinks.map((sl) => sl._id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                  {footer.socialLinks.map((sl) => (
                    <SortableItem key={sl._id} id={sl._id}>
                      <div className="flex items-center gap-2 rounded-lg bg-white/[.02] border border-white/[.04] px-3 py-1.5">
                        <input value={sl.platform} onChange={(e) => setFooter({ ...footer, socialLinks: footer.socialLinks.map((x) => x._id === sl._id ? { ...x, platform: e.target.value } : x) })}
                          className="w-24 bg-transparent text-xs text-white focus:outline-none" placeholder="Platform" />
                        <input value={sl.href} onChange={(e) => setFooter({ ...footer, socialLinks: footer.socialLinks.map((x) => x._id === sl._id ? { ...x, href: e.target.value } : x) })}
                          className="flex-1 bg-transparent text-xs text-zinc-500 focus:outline-none" placeholder="https://..." />
                        <button onClick={() => setFooter({ ...footer, socialLinks: footer.socialLinks.filter((x) => x._id !== sl._id) })}
                          className="p-0.5 text-red-400/50 hover:text-red-400"><Trash2 className="h-2.5 w-2.5" /></button>
                      </div>
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </Section>

      </div>
    </div>
  );
}
