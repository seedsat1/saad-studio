"use client";

import { useState } from "react";
import { Plus, Sparkles, User, ImagePlus, X, Loader2, Wand2, Video, Flame, ArrowRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export type InfluencerItem = {
  id: string;
  name: string;
  handle: string;
  coverUrl: string;
  description?: string;
  isDefault?: boolean;
};

interface InfluencerRosterProps {
  influencers: InfluencerItem[];
  onAddInfluencer: (name: string, handle: string, file: File) => Promise<void>;
  onDeleteInfluencer?: (id: string) => void;
  onSelectInfluencerForCanvas?: (handle: string, action?: string) => void;
}

export function InfluencerRoster({
  influencers,
  onAddInfluencer,
  onDeleteInfluencer,
  onSelectInfluencerForCanvas,
}: InfluencerRosterProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeInfluencer, setActiveInfluencer] = useState<InfluencerItem | null>(null);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !selectedFile) {
      setError("يرجى إدخال اسم المؤثر ورفع صورة مرجعية واحدة على الأقل.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const cleanHandle = handle.startsWith("@") ? handle : `@${handle || name.toLowerCase().replace(/\s+/g, "")}`;
      await onAddInfluencer(name.trim(), cleanHandle, selectedFile);
      setIsModalOpen(false);
      setName("");
      setHandle("");
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إنشاء المؤثر");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-12 text-center" id="tour-influencer-grid">
      {/* Hero Title Section matching screenshot 1 100% */}
      <div className="space-y-6">
        {/* Floating Top Influencer Avatars Banner */}
        <div className="flex items-center justify-center -space-x-4 space-x-reverse mb-6">
          <div className="w-20 h-28 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl rotate-[-8deg] hover:rotate-0 hover:scale-110 transition duration-300">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="w-20 h-28 rounded-2xl overflow-hidden border-2 border-pink-500/40 shadow-2xl z-10 hover:scale-110 transition duration-300">
            <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="w-20 h-28 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl rotate-[6deg] hover:rotate-0 hover:scale-110 transition duration-300">
            <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="w-20 h-28 rounded-2xl overflow-hidden border-2 border-purple-500/40 shadow-2xl z-10 rotate-[12deg] hover:scale-110 transition duration-300">
            <img src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300" alt="" className="w-full h-full object-cover" />
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
          لديكِ ابنِ فريق المؤثرين
        </h1>
        <p className="max-w-2xl mx-auto text-sm text-zinc-400 leading-relaxed">
          قم بإنشاء شخصية مرة واحدة، ثم استدعها في أي مكان باستخدام <span className="text-pink-400 font-semibold dir-ltr">@handle</span> — اكتب <span className="text-purple-300 font-semibold dir-ltr">"@ash on a beach"</span> في أي مطالبة صورة أو فيديو أو لوحة رسم وسيعاد استخدام صورتها تلقائيًا.
        </p>
      </div>

      {/* Roster Section Card Header */}
      <div className="space-y-6 text-right" id="tour-influencers-roster">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-pink-500/20 hover:opacity-90 transition cursor-pointer"
          >
            <Plus size={16} />
            مؤثر جديد
          </button>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white tracking-wide">المؤثرون لديك (Your Influencers)</h2>
            <p className="text-xs text-zinc-400">
              استدعهم في أي مكان باستعمال المُنادي المسبوق بـ <span className="text-pink-400 font-semibold">@handle</span>
            </p>
          </div>
        </div>

        {/* Influencers Roster Grid matching screenshots 1, 2, 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Card 1: Add New Influencer Button Card */}
          <div
            id="tour-add-influencer-card"
            onClick={() => setIsModalOpen(true)}
            className="group relative h-80 rounded-2xl border-2 border-dashed border-white/15 hover:border-pink-500/60 bg-white/[0.02] hover:bg-white/[0.04] transition duration-300 cursor-pointer flex flex-col items-center justify-center gap-3 p-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/5 group-hover:bg-pink-500/20 text-zinc-400 group-hover:text-pink-400 border border-white/10 flex items-center justify-center transition duration-300">
              <Plus size={28} />
            </div>
            <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition">مؤثر جديد</span>
          </div>

          {/* Render Influencer Cards - EVERY CARD IS 100% CLICKABLE */}
          {influencers.map((inf) => (
            <div
              key={inf.id}
              id={inf.handle === "@gavi" ? "tour-gavi-card" : undefined}
              onClick={() => setActiveInfluencer(inf)}
              className="group relative h-80 rounded-2xl border border-white/10 hover:border-pink-500/80 bg-[#0d0e17] overflow-hidden shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer ring-0 hover:ring-2 hover:ring-pink-500/40"
            >
              {/* Top Badge: Customization badge if @gavi */}
              {inf.handle === "@gavi" && (
                <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-lg bg-pink-500/90 text-white text-[10px] font-extrabold shadow-md">
                  تخصيص
                </div>
              )}

              {/* Cover Image */}
              <div className="absolute inset-0 z-0">
                <img src={inf.coverUrl} alt={inf.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              </div>

              {/* Bottom Card Footer */}
              <div className="relative z-10 p-4 space-y-2.5 mt-auto text-right">
                <span className="inline-block px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md text-white font-extrabold text-sm border border-white/10 dir-ltr">
                  {inf.handle}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectInfluencerForCanvas) {
                      onSelectInfluencerForCanvas(inf.handle, "canvas");
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-pink-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={13} />
                  استدعاء في الكانفاس ✨
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Influencer Action Modal when Clicking any Card */}
      {activeInfluencer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0f111a] border border-white/10 rounded-3xl p-6 shadow-2xl text-right space-y-6 dir-rtl">
            <button
              onClick={() => setActiveInfluencer(null)}
              className="absolute top-4 left-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 border-b border-white/10 pb-4">
              <img src={activeInfluencer.coverUrl} alt="" className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">{activeInfluencer.name}</h3>
                <span className="text-xs font-bold text-pink-400 dir-ltr block">{activeInfluencer.handle}</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-zinc-300">اختر الإجراء المطلوبة للشخصية:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    if (onSelectInfluencerForCanvas) onSelectInfluencerForCanvas(activeInfluencer.handle, "canvas");
                    setActiveInfluencer(null);
                  }}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/50 text-right space-y-1 transition group"
                >
                  <div className="flex items-center justify-between text-pink-400">
                    <Layers size={18} />
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition transform group-hover:translate-x-1" />
                  </div>
                  <div className="text-xs font-bold text-white">فتح في الكانفاس</div>
                  <div className="text-[10px] text-zinc-400">تحرير العقد والبناء المرئي للمؤثر</div>
                </button>

                <button
                  onClick={() => {
                    if (onSelectInfluencerForCanvas) onSelectInfluencerForCanvas(activeInfluencer.handle, "image");
                    setActiveInfluencer(null);
                  }}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/50 text-right space-y-1 transition group"
                >
                  <div className="flex items-center justify-between text-purple-400">
                    <Wand2 size={18} />
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition transform group-hover:translate-x-1" />
                  </div>
                  <div className="text-xs font-bold text-white">توليد صورة فوتوغرافية</div>
                  <div className="text-[10px] text-zinc-400">إنتاج صور UGC سينمائية جديدة</div>
                </button>

                <button
                  onClick={() => {
                    if (onSelectInfluencerForCanvas) onSelectInfluencerForCanvas(activeInfluencer.handle, "video");
                    setActiveInfluencer(null);
                  }}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/50 text-right space-y-1 transition group"
                >
                  <div className="flex items-center justify-between text-purple-400">
                    <Video size={18} />
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition transform group-hover:translate-x-1" />
                  </div>
                  <div className="text-xs font-bold text-white">توليد فيديو حركي</div>
                  <div className="text-[10px] text-zinc-400">تحريك فيديو سينمائي لـ Kling 3.0</div>
                </button>

                <button
                  onClick={() => {
                    if (onSelectInfluencerForCanvas) onSelectInfluencerForCanvas(activeInfluencer.handle, "faceswap");
                    setActiveInfluencer(null);
                  }}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/50 text-right space-y-1 transition group"
                >
                  <div className="flex items-center justify-between text-pink-400">
                    <Sparkles size={18} />
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition transform group-hover:translate-x-1" />
                  </div>
                  <div className="text-xs font-bold text-white">تبديل وجه (Face Swap)</div>
                  <div className="text-[10px] text-zinc-400">نسخ الوجه على أي جسم مستهدف</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog to Create New Influencer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0f111a] border border-white/10 rounded-2xl p-6 shadow-2xl text-right space-y-6 dir-rtl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 left-4 p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">مؤثر جديد (New Influencer)</h3>
              <p className="text-xs text-zinc-400">
                أدخل اسماً مسبوقاً بـ @ وصورة مرجعية واحدة واضحة للوجه.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">اسم المؤثر</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!handle) setHandle(`@${e.target.value.toLowerCase().replace(/\s+/g, "")}`);
                  }}
                  placeholder="مثال: Katrina"
                  className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-pink-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">اسم المنادي (@handle)</label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@katrina"
                  className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-3.5 text-xs text-pink-300 font-mono outline-none focus:border-pink-500 transition dir-ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">الصورة المرجعية للوجه</label>
                <label className="relative h-44 rounded-2xl border-2 border-dashed border-white/15 hover:border-pink-500/50 bg-white/[0.02] flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden transition">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <ImagePlus size={28} className="text-zinc-500" />
                      <span className="text-xs font-bold text-zinc-400">انقر لرفع صورة المرجع</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-pink-500/20 hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                حفظ المؤثر
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
