"use client";

import { ArrowUp, ArrowRight, ArrowDown, User } from "lucide-react";

export type LightDirection = "front" | "side" | "bottom" | "top-down";

interface Props {
  value: LightDirection;
  onChange: (dir: LightDirection) => void;
  imageUrl?: string | null;
  isAr?: boolean;
}

/**
 * Simple direction picker while awaiting a proper 3D scene mockup from
 * the designer. Four clean directional cards. Reliable, non-fancy, and it
 * ships the same value shape the API expects.
 */
export function LightDirectionPicker3D({ value, onChange, isAr = true }: Props) {
  const options: Array<{
    id: LightDirection;
    labelAr: string;
    labelEn: string;
    descAr: string;
    descEn: string;
    icon: React.ReactNode;
  }> = [
    { id: "front",    labelAr: "أمامي",       labelEn: "Front",    descAr: "الضوء من مواجهة الوجه",  descEn: "Light straight ahead",   icon: <User className="w-4 h-4" /> },
    { id: "side",     labelAr: "جانبي",       labelEn: "Side",     descAr: "الضوء من الجانب",         descEn: "Light from the side",     icon: <ArrowRight className="w-4 h-4" /> },
    { id: "bottom",   labelAr: "من الأسفل",   labelEn: "Bottom",   descAr: "الضوء يصعد من الأسفل",    descEn: "Light rising from below", icon: <ArrowUp className="w-4 h-4" /> },
    { id: "top-down", labelAr: "من الأعلى",   labelEn: "Top-Down", descAr: "الضوء ينزل من الأعلى",    descEn: "Light falling from above",icon: <ArrowDown className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
        {isAr ? "اتجاه الإضاءة" : "Light Direction"}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`text-start rounded-xl border p-3 transition-all ${
                active
                  ? "border-amber-400 bg-amber-500/8 ring-1 ring-amber-500/25 shadow-md shadow-amber-500/10"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1 rounded ${active ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-500"}`}>
                  {opt.icon}
                </div>
                <span className={`text-xs font-bold ${active ? "text-amber-200" : "text-slate-300"}`}>
                  {isAr ? opt.labelAr : opt.labelEn}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 leading-relaxed">
                {isAr ? opt.descAr : opt.descEn}
              </div>
            </button>
          );
        })}
      </div>

      {value !== "front" && (
        <button
          type="button"
          onClick={() => onChange("front")}
          className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-200 border border-slate-800 hover:border-slate-600 rounded px-2 py-1 transition-colors"
        >
          {isAr ? "↺ رجوع للافتراضي" : "↺ Reset to default"}
        </button>
      )}
    </div>
  );
}
