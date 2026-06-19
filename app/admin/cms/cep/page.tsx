"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Save,
  Plus,
  Trash2,
  Upload,
  X,
  Loader2,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";

interface SlideBlock {
  id: string;
  image: string;
  headingEn: string;
  headingAr: string;
  subheadingEn: string;
  subheadingAr: string;
  descEn: string;
  descAr: string;
  btnEn: string;
  btnAr: string;
  url: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_SLIDES: SlideBlock[] = [
  {
    id: uid(),
    image: "/slide1.png",
    headingEn: "SAAD STUDIO",
    headingAr: "سعد ستوديو",
    subheadingEn: "AI CREATIVE POWER",
    subheadingAr: "القوة الإبداعية للذكاء الاصطناعي",
    descEn: "All-in-one AI tools for video, image, audio and content creation.",
    descAr: "أدوات متكاملة بالذكاء الاصطناعي للفيديو، الصور، الصوت وصناعة المحتوى.",
    btnEn: "Visit Website",
    btnAr: "زيارة الموقع",
    url: "https://www.saadstudio.app",
  },
  {
    id: uid(),
    image: "/slide2.png",
    headingEn: "LIP SYNC PRO",
    headingAr: "مزامنة الشفاه الاحترافية",
    subheadingEn: "PERFECT SPEECH DUBBING",
    subheadingAr: "دبلجة كلامية مثالية",
    descEn: "Sync audio and video frames automatically with lip-aware AI.",
    descAr: "مزامنة الصوت وحركات الشفاه تلقائياً باستخدام الذكاء الاصطناعي.",
    btnEn: "Visit Website",
    btnAr: "زيارة الموقع",
    url: "https://www.saadstudio.app",
  },
  {
    id: uid(),
    image: "/slide3.png",
    headingEn: "AI CLIP MAKER",
    headingAr: "صانع المقاطع الذكي",
    subheadingEn: "VIRAL CLIPS IN SECONDS",
    subheadingAr: "مقاطع ريلز قصيرة بثوانٍ",
    descEn: "Generate short, highly engaging clips from your long videos automatically.",
    descAr: "استخرج مقاطع قصيرة وجذابة من فيديوهاتك الطويلة تلقائياً.",
    btnEn: "Visit Website",
    btnAr: "زيارة الموقع",
    url: "https://www.saadstudio.app",
  },
];

export default function CepCmsPage() {
  const [slides, setSlides] = useState<SlideBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    async function loadLayout() {
      try {
        const res = await fetch("/api/admin/layouts?page=cep-slides", {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.layoutBlocks) && data.layoutBlocks.length > 0) {
            setSlides(data.layoutBlocks as SlideBlock[]);
          } else {
            setSlides(DEFAULT_SLIDES);
          }
        } else {
          setSlides(DEFAULT_SLIDES);
        }
      } catch (err) {
        console.error("Failed to load layouts", err);
        setSlides(DEFAULT_SLIDES);
      } finally {
        setLoading(false);
      }
    }
    loadLayout();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/layouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageName: "cep-slides",
          layoutBlocks: slides,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save changes to DB");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async (slideId: string, file: File) => {
    setUploadingId(slideId);
    setError(null);

    try {
      const signRes = await fetch("/api/admin/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });

      if (!signRes.ok) {
        const err = await signRes.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to create upload URL");
      }

      const { signedUrl, publicUrl } = (await signRes.json()) as {
        signedUrl: string;
        publicUrl: string;
      };

      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Upload to storage failed");

      // Update slide image URL
      setSlides((prev) =>
        prev.map((s) => (s.id === slideId ? { ...s, image: publicUrl } : s))
      );
    } catch (err) {
      console.error(err);
      setError("Image upload failed. Please try again.");
    } finally {
      setUploadingId(null);
    }
  };

  const addSlide = () => {
    const newSlide: SlideBlock = {
      id: uid(),
      image: "/slide1.png",
      headingEn: "New Slide Heading",
      headingAr: "عنوان الشريحة الجديدة",
      subheadingEn: "New Subheading",
      subheadingAr: "عنوان فرعي جديد",
      descEn: "Description of the slide...",
      descAr: "وصف الشريحة...",
      btnEn: "Learn More",
      btnAr: "اقرأ المزيد",
      url: "https://www.saadstudio.app",
    };
    setSlides((prev) => [...prev, newSlide]);
  };

  const deleteSlide = (id: string) => {
    setSlides((prev) => prev.filter((s) => s.id !== id));
  };

  const moveSlide = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    setSlides((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const updateSlideField = (id: string, field: keyof SlideBlock, value: string) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Admin Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">CEP Extension Hero Slides</h1>
          <p className="text-sm text-zinc-400">
            Manage the hero banner slides displayed on the homepage of Saad Studio Adobe CEP Extension panel in Premiere Pro.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg shadow-violet-600/15"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-xl text-emerald-400 text-sm">
          Layout saved successfully! The extension panel will update immediately.
        </div>
      )}

      {/* Empty State */}
      {slides.length === 0 && (
        <div className="p-12 text-center bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl space-y-3">
          <ImageIcon className="h-10 w-10 text-zinc-600 mx-auto" />
          <h3 className="font-semibold text-lg">No slides defined</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Without dynamic slides, the CEP extension panel will fall back to default pre-packaged slides.
          </p>
          <button
            onClick={addSlide}
            className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-sm transition font-medium"
          >
            <Plus className="h-4 w-4" /> Add First Slide
          </button>
        </div>
      )}

      {/* Slides Editor List */}
      <div className="space-y-6">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className="bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden p-6 relative group"
          >
            {/* Top controls */}
            <div className="absolute top-4 right-4 flex items-center gap-1">
              <button
                onClick={() => moveSlide(index, "up")}
                disabled={index === 0}
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Move Up"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => moveSlide(index, "down")}
                disabled={index === slides.length - 1}
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Move Down"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => deleteSlide(slide.id)}
                className="p-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-900/40 rounded-lg text-red-400 hover:text-red-300 transition ml-2"
                title="Delete Slide"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 md:mt-0">
              {/* Image Preview & Upload Column */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wide">
                  Slide Image
                </label>
                <div className="relative aspect-video rounded-xl bg-zinc-900 overflow-hidden border border-zinc-800 flex items-center justify-center group/img">
                  {slide.image ? (
                    <img
                      src={slide.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-zinc-700" />
                  )}

                  {uploadingId === slide.id && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-center py-2 rounded-xl text-xs font-medium transition block">
                    <span className="flex items-center justify-center gap-1.5">
                      <Upload className="h-3.5 w-3.5" /> Upload Image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(slide.id, file);
                      }}
                    />
                  </label>
                  {slide.image?.startsWith("http") && (
                    <a
                      href={slide.image}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 p-2 rounded-xl text-zinc-400 hover:text-white transition flex items-center justify-center"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Image URL or public path..."
                  value={slide.image}
                  onChange={(e) => updateSlideField(slide.id, "image", e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 text-xs px-3 py-2 rounded-xl focus:border-violet-500 focus:outline-none placeholder-zinc-700"
                />
              </div>

              {/* Text Fields Columns (split into English and Arabic fields) */}
              <div className="md:col-span-2 space-y-4">
                {/* Languages inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* English Section */}
                  <div className="space-y-3 bg-zinc-900/20 p-4 rounded-xl border border-zinc-900">
                    <span className="text-xs font-bold text-violet-400 uppercase tracking-wide flex items-center gap-1">
                      🇬🇧 English Language
                    </span>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Slide title (EN)"
                        value={slide.headingEn}
                        onChange={(e) => updateSlideField(slide.id, "headingEn", e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-sm px-3.5 py-2.5 rounded-xl focus:border-violet-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Subheading (EN)"
                        value={slide.subheadingEn}
                        onChange={(e) => updateSlideField(slide.id, "subheadingEn", e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-xl focus:border-violet-500 focus:outline-none"
                      />
                      <textarea
                        placeholder="Slide description (EN)"
                        value={slide.descEn}
                        rows={2}
                        onChange={(e) => updateSlideField(slide.id, "descEn", e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-xl focus:border-violet-500 focus:outline-none resize-none"
                      />
                      <input
                        type="text"
                        placeholder="Button CTA (EN)"
                        value={slide.btnEn}
                        onChange={(e) => updateSlideField(slide.id, "btnEn", e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-xl focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Arabic Section */}
                  <div className="space-y-3 bg-zinc-900/20 p-4 rounded-xl border border-zinc-900" dir="rtl">
                    <span className="text-xs font-bold text-violet-400 uppercase tracking-wide flex items-center gap-1 justify-end">
                      🇸🇦 اللغة العربية
                    </span>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="عنوان الشريحة (AR)"
                        value={slide.headingAr}
                        onChange={(e) => updateSlideField(slide.id, "headingAr", e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-sm px-3.5 py-2.5 rounded-xl focus:border-violet-500 focus:outline-none text-right"
                      />
                      <input
                        type="text"
                        placeholder="العنوان الفرعي (AR)"
                        value={slide.subheadingAr}
                        onChange={(e) => updateSlideField(slide.id, "subheadingAr", e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-xl focus:border-violet-500 focus:outline-none text-right"
                      />
                      <textarea
                        placeholder="الوصف (AR)"
                        value={slide.descAr}
                        rows={2}
                        onChange={(e) => updateSlideField(slide.id, "descAr", e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-xl focus:border-violet-500 focus:outline-none resize-none text-right"
                      />
                      <input
                        type="text"
                        placeholder="زر الإجراء (AR)"
                        value={slide.btnAr}
                        onChange={(e) => updateSlideField(slide.id, "btnAr", e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-xl focus:border-violet-500 focus:outline-none text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Redirect Link field */}
                <div className="space-y-1 bg-zinc-900/10 p-3 rounded-xl border border-zinc-900/60">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Redirect URL (opens on slide or button click)
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={slide.url}
                    onChange={(e) => updateSlideField(slide.id, "url", e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs px-3 py-2.5 rounded-xl focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Controls */}
      <div className="flex justify-center border-t border-zinc-900 pt-6">
        <button
          onClick={addSlide}
          className="flex items-center gap-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white px-5 py-3 rounded-xl transition font-medium text-sm"
        >
          <Plus className="h-4 w-4" /> Add Slide Card
        </button>
      </div>
    </div>
  );
}
