"use client";

import { useEffect, useState } from "react";
import { Folder, Image as ImageIcon, Video as VideoIcon, Download, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type AssetRecord = {
  id: string;
  type: string;
  url: string;
  prompt?: string;
  createdAt: string;
  monthGroup?: string;
};

export function LibraryStudio() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/assets", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (Array.isArray(data?.assets)) {
        const mapped: AssetRecord[] = data.assets.map((item: any) => {
          const date = new Date(item.createdAt || Date.now());
          const monthStr = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
          return {
            id: item.id || `asset-${Math.random()}`,
            type: item.type || "image",
            url: item.url || item.mediaUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500",
            prompt: item.prompt || "AI Generation",
            createdAt: item.createdAt || new Date().toISOString(),
            monthGroup: monthStr,
          };
        });
        setAssets(mapped);
      }
    } catch {
      // Fallback sample assets grouped by month
      setAssets([
        {
          id: "1",
          type: "image",
          url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500",
          prompt: "@gavi portrait photo",
          createdAt: new Date().toISOString(),
          monthGroup: "July 2026",
        },
        {
          id: "2",
          type: "image",
          url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500",
          prompt: "@sophie bear hoodie photo",
          createdAt: new Date().toISOString(),
          monthGroup: "July 2026",
        },
        {
          id: "3",
          type: "image",
          url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500",
          prompt: "@katrina balcony sunset",
          createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
          monthGroup: "June 2026",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  // Group assets by monthGroup
  const grouped = assets.reduce<Record<string, AssetRecord[]>>((acc, item) => {
    const key = item.monthGroup || "July 2026";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8 text-right dir-rtl">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <button
          onClick={loadAssets}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold transition flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={cn(loading && "animate-spin")} />
          تحديث المكتبة
        </button>

        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white">مكتبة الوسائط المولّدة (Generations Vault)</h2>
          <p className="text-xs text-zinc-400">سجل كافة الصور والفيديوهات المولّدة لشخصياتك مقسمة حسب الشهر.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-zinc-500 space-y-3">
          <Loader2 size={32} className="mx-auto animate-spin text-pink-400" />
          <span className="text-xs font-bold block">جاري تحميل وسائط الحساب...</span>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="py-16 text-center text-zinc-500 space-y-2 bg-[#0c0d16] rounded-3xl border border-white/10">
          <Folder size={36} className="mx-auto text-zinc-600" />
          <span className="text-xs font-bold block text-zinc-400">لا توجد وسائط مولّدة بعد في حسابك</span>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([month, items]) => (
            <div key={month} className="space-y-4">
              <h3 className="text-sm font-extrabold text-pink-400 uppercase tracking-wider flex items-center justify-end gap-2">
                <span>{month}</span>
                <Folder size={14} />
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map((asset) => (
                  <div key={asset.id} className="group relative h-72 rounded-2xl overflow-hidden border border-white/10 bg-black shadow-xl">
                    {asset.type === "video" ? (
                      <video src={asset.url} className="w-full h-full object-cover" controls />
                    ) : (
                      <img src={asset.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-3 flex flex-col justify-between">
                      <span className="text-[10px] text-zinc-300 line-clamp-2 bg-black/60 p-2 rounded-xl backdrop-blur-md">
                        {asset.prompt}
                      </span>
                      <a
                        href={asset.url}
                        target="_blank"
                        download
                        className="w-full py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Download size={12} />
                        تنزيل
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
