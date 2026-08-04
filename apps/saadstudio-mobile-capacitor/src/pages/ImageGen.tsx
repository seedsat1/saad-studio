import { useState } from 'react';

const styles = [
  { key: 'cinematic', label: 'سينمائي' },
  { key: 'photo', label: 'صورة واقعية' },
  { key: 'anime', label: 'أنمي' },
  { key: 'sketch', label: 'رسم يدوي' },
  { key: 'oil', label: 'زيتي' },
];

const ratios = ['1:1', '3:4', '4:3', '9:16', '16:9'];

export default function ImageGen() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('cinematic');
  const [ratio, setRatio] = useState('1:1');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setTimeout(() => {
      setImages([
        'from-cyan-800 via-slate-900 to-black',
        'from-violet-800 via-slate-900 to-black',
        'from-amber-800 via-slate-900 to-black',
        'from-rose-800 via-slate-900 to-black',
      ]);
      setLoading(false);
    }, 1500);
  };

  return (
    <main className="pt-16 pb-24 px-margin-mobile">
      <div className="mt-lg">
        <h2 className="font-headline-lg text-white mb-2">توليد الصور الذكي</h2>
        <p className="text-on-surface-variant font-body-md">صف صورتك بالعربية وستولد نتائج فورية بأحدث النماذج.</p>
      </div>

      <div className="mt-lg glass-card rounded-xl p-md">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="مثال: رجل عربي بالثوب الأبيض يمشي في شارع الرياض ليلاً، إضاءة سينمائية، تفاصيل عالية"
          rows={4}
          className="w-full bg-transparent outline-none text-white placeholder:text-on-surface-variant font-body-md resize-none"
        />
        <div className="flex items-center justify-between mt-sm border-t border-white/10 pt-sm">
          <button className="text-on-surface-variant hover:text-accent-cyan flex items-center gap-1 font-label-md">
            <span className="material-symbols-outlined text-[20px]">image</span>
            <span>مرجع صورة</span>
          </button>
          <span className="text-on-surface-variant font-label-sm">{prompt.length}/500</span>
        </div>
      </div>

      <div className="mt-lg">
        <h4 className="font-label-md text-on-surface-variant mb-sm">النمط الفني</h4>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {styles.map((s) => (
            <button
              key={s.key}
              onClick={() => setStyle(s.key)}
              className={[
                'shrink-0 px-4 py-2 rounded-full font-label-md transition-all border',
                style === s.key
                  ? 'bg-accent-violet text-white border-accent-violet'
                  : 'bg-surface-container text-on-surface-variant border-white/10',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-md">
        <h4 className="font-label-md text-on-surface-variant mb-sm">النسبة</h4>
        <div className="flex gap-2">
          {ratios.map((r) => (
            <button
              key={r}
              onClick={() => setRatio(r)}
              className={[
                'flex-1 py-2 rounded-lg font-label-md transition-all border',
                ratio === r
                  ? 'bg-accent-cyan text-canvas-deep border-accent-cyan'
                  : 'bg-surface-container text-on-surface-variant border-white/10',
              ].join(' ')}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading || !prompt.trim()}
        className="mt-lg w-full bg-accent-cyan text-canvas-deep font-headline-md py-4 rounded-xl active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            <span>جاري التوليد...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">auto_awesome</span>
            <span>ولّد الصورة</span>
          </>
        )}
      </button>

      {images.length > 0 && (
        <div className="mt-xl">
          <h3 className="font-headline-md text-white mb-md">النتائج</h3>
          <div className="grid grid-cols-2 gap-gutter">
            {images.map((g, i) => (
              <div
                key={i}
                className={`aspect-square rounded-xl border border-white/10 bg-gradient-to-br ${g} relative active:scale-[0.97] transition-transform`}
              >
                <div className="absolute bottom-2 right-2 flex gap-1">
                  <button className="w-9 h-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </button>
                  <button className="w-9 h-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-[18px]">share</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
