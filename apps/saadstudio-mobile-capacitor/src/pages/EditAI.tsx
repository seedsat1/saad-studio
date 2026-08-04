import { useState } from 'react';

const tools = [
  { key: 'bg', icon: 'layers_clear', label: 'مزيل الخلفية', desc: 'إزالة الخلفية بدقة عالية', color: 'text-accent-cyan', bg: 'bg-accent-cyan/10' },
  { key: 'inpaint', icon: 'brush', label: 'الرسم الذكي (Inpaint)', desc: 'ارسم للحذف أو الإضافة', color: 'text-accent-violet', bg: 'bg-accent-violet/10' },
  { key: 'remove', icon: 'scan_delete', label: 'مزيل الكائنات', desc: 'حذف أي عنصر تحدده', color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'face', icon: 'face_6', label: 'تبديل الوجوه', desc: 'تبديل احترافي للوجوه', color: 'text-accent-cyan', bg: 'bg-accent-cyan/10' },
  { key: 'relight', icon: 'lightbulb', label: 'إعادة الإضاءة', desc: 'إضاءة سينمائية جديدة', color: 'text-accent-violet', bg: 'bg-accent-violet/10' },
  { key: 'upscale', icon: 'auto_awesome', label: 'تكبير 4K', desc: 'تحسين الجودة والتفاصيل', color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'style', icon: 'style', label: 'نقل النمط', desc: 'ألوان وأسلوب صورة أخرى', color: 'text-accent-cyan', bg: 'bg-accent-cyan/10' },
];

export default function EditAI() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <main className="pt-20 pb-32 px-margin-mobile">
      <div className="mt-lg mb-lg flex items-center justify-between">
        <div>
          <h2 className="font-headline-lg text-white mb-2">تعديل ذكاء اصطناعي</h2>
          <p className="text-on-surface-variant font-body-md">مجموعة أدوات لمعالجة الصور احترافياً.</p>
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1 justify-end">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-label-sm text-green-400">جاهز</span>
          </div>
          <span className="font-label-sm text-on-surface-variant">معالجة GPU</span>
        </div>
      </div>

      <div className="mb-lg glass-card rounded-xl p-md">
        <label className="w-full aspect-video rounded-lg border-2 border-dashed border-white/20 hover:border-accent-cyan/50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all">
          <span className="material-symbols-outlined text-4xl text-accent-cyan">upload_file</span>
          <p className="font-body-md text-white">ارفع صورتك</p>
          <p className="font-label-sm text-on-surface-variant">PNG · JPG · WEBP</p>
          <input type="file" accept="image/*" className="hidden" />
        </label>
      </div>

      <h3 className="font-headline-md text-white text-[20px] mb-md">اختر الأداة</h3>
      <div className="grid grid-cols-1 gap-2 mb-lg">
        {tools.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={[
              'glass-card rounded-xl p-md flex items-center gap-md active:scale-[0.98] transition-all text-right',
              active === t.key ? 'border-accent-cyan/50 bg-accent-cyan/5' : '',
            ].join(' ')}
          >
            <div className={`w-12 h-12 rounded-xl ${t.bg} flex items-center justify-center shrink-0`}>
              <span className={`material-symbols-outlined ${t.color}`}>{t.icon}</span>
            </div>
            <div className="flex-1">
              <h4 className="font-headline-md text-white text-[16px]">{t.label}</h4>
              <p className="font-label-sm text-on-surface-variant">{t.desc}</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant" style={{ transform: 'scaleX(-1)' }}>
              chevron_right
            </span>
          </button>
        ))}
      </div>

      {active && (
        <button className="w-full bg-accent-cyan text-canvas-deep font-headline-md py-4 rounded-xl active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center justify-center gap-2">
          <span className="material-symbols-outlined">auto_fix</span>
          <span>تطبيق: {tools.find((t) => t.key === active)?.label}</span>
        </button>
      )}
    </main>
  );
}
