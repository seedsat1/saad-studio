import { useState } from 'react';

const presets = [
  { key: 'all', label: 'الكل' },
  { key: 'cinematic', label: 'سينمائي' },
  { key: 'creative', label: 'إبداعي' },
  { key: 'experimental', label: 'تجريبي' },
];

const transitions = [
  { name: 'Zoom Blur', category: 'cinematic', gradient: 'from-cyan-800 via-slate-900 to-black' },
  { name: 'Warp Speed', category: 'experimental', gradient: 'from-violet-800 via-slate-900 to-black' },
  { name: 'Ink Bleed', category: 'creative', gradient: 'from-amber-800 via-slate-900 to-black' },
  { name: 'Film Burn', category: 'cinematic', gradient: 'from-rose-800 via-slate-900 to-black' },
  { name: 'Glitch', category: 'experimental', gradient: 'from-emerald-800 via-slate-900 to-black' },
  { name: 'Iris Wipe', category: 'creative', gradient: 'from-fuchsia-800 via-slate-900 to-black' },
];

export default function Transitions() {
  const [preset, setPreset] = useState('all');
  const [ratio, setRatio] = useState('16:9');
  const [duration, setDuration] = useState('2s');
  const filtered = preset === 'all' ? transitions : transitions.filter((t) => t.category === preset);

  return (
    <main className="pt-20 pb-32 px-margin-mobile">
      <div className="mt-lg mb-lg flex items-start justify-between">
        <div>
          <h2 className="font-headline-lg text-white mb-2">الانتقالات</h2>
          <p className="text-on-surface-variant font-body-md">أدوات انتقال احترافية بين المشاهد.</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="font-label-sm text-on-surface-variant">Auto-save</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-md mb-lg">
        <label className="glass-card p-md rounded-xl aspect-video flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-[0.98] transition-all">
          <span className="material-symbols-outlined text-3xl text-accent-cyan">cloud_upload</span>
          <span className="font-label-md text-white text-[12px] text-center">المقطع الأول</span>
          <span className="font-label-sm text-on-surface-variant text-[10px]">5-15 ثانية</span>
          <input type="file" accept="video/mp4,video/quicktime" className="hidden" />
        </label>
        <label className="glass-card p-md rounded-xl aspect-video flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-[0.98] transition-all">
          <span className="material-symbols-outlined text-3xl text-accent-violet">cloud_upload</span>
          <span className="font-label-md text-white text-[12px] text-center">المقطع الثاني</span>
          <span className="font-label-sm text-on-surface-variant text-[10px]">5-15 ثانية</span>
          <input type="file" accept="video/mp4,video/quicktime" className="hidden" />
        </label>
      </div>

      <div className="glass-card rounded-xl p-md mb-lg space-y-md">
        <div>
          <label className="block font-label-md text-on-surface-variant mb-sm">الموديل</label>
          <div className="bg-surface-container border border-white/10 rounded-lg py-3 px-4 flex items-center justify-between">
            <span className="text-white font-body-md">Kling 3.0</span>
            <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block font-label-md text-on-surface-variant mb-sm">الأبعاد</label>
            <div className="bg-surface-container border border-white/10 rounded-lg py-2 px-3 text-center text-white font-label-md">
              {ratio}
            </div>
          </div>
          <div>
            <label className="block font-label-md text-on-surface-variant mb-sm">المدة</label>
            <div className="bg-surface-container border border-white/10 rounded-lg py-2 px-3 text-center text-white font-label-md">
              {duration}
            </div>
          </div>
          <div>
            <label className="block font-label-md text-on-surface-variant mb-sm">الدقة</label>
            <div className="bg-surface-container border border-white/10 rounded-lg py-2 px-3 text-center text-white font-label-md">
              1080p
            </div>
          </div>
        </div>
      </div>

      <div className="mb-lg">
        <div className="flex items-center justify-between mb-sm">
          <h3 className="font-headline-md text-white text-[18px]">الأنماط الجاهزة</h3>
          <span className="font-label-sm text-on-surface-variant">{filtered.length} إجمالي</span>
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-md">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={[
                'shrink-0 px-4 py-2 rounded-full font-label-md border transition-all',
                preset === p.key
                  ? 'bg-accent-cyan text-canvas-deep border-accent-cyan'
                  : 'bg-surface-container text-on-surface-variant border-white/10',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-gutter">
          {filtered.map((t) => (
            <div
              key={t.name}
              className={`relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br ${t.gradient} active:scale-[0.97] transition-transform`}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-white/70">play_circle</span>
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-md">
                <h4 className="font-headline-md text-white text-[13px]">{t.name}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="w-full bg-accent-cyan text-canvas-deep font-headline-md py-4 rounded-xl active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center justify-center gap-2">
        <span className="material-symbols-outlined">swap_horiz</span>
        <span>توليد الانتقال</span>
      </button>
    </main>
  );
}
