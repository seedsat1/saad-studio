import { useState } from 'react';

const styles = ['سينمائي', 'لو-فاي', 'إلكتروني', 'بوب', 'جاز', 'عربي', 'محيط'];
const models = ['احترافي (Google · معاينة)', 'سريع (Google · سريع)'];
const durations = ['30 ثانية', '1 دقيقة', '2 دقيقة'];

export default function AudioGen() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<string | null>(null);
  const [model, setModel] = useState(models[0]);
  const [bpm, setBpm] = useState(120);
  const [duration, setDuration] = useState('1 دقيقة');
  const [instrumental, setInstrumental] = useState(false);
  const [loading, setLoading] = useState(false);

  const generate = () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <main className="pt-20 pb-32 px-margin-mobile">
      <div className="mt-lg mb-lg">
        <h2 className="font-headline-lg text-white mb-2">أنشئ أغنيتك</h2>
        <p className="text-on-surface-variant font-body-md">من فكرة إلى موسيقى مخصصة بالكامل.</p>
      </div>

      <div className="glass-card rounded-xl p-md mb-lg">
        <label className="block font-label-md text-on-surface-variant mb-sm">الوصف / كلمات مخصصة</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
          rows={5}
          placeholder="مثال: أغنية عربية حماسية بإيقاع سريع، تدور حول النجاح والإصرار، بصوت رجل قوي"
          className="w-full bg-transparent outline-none text-white placeholder:text-on-surface-variant font-body-md resize-none"
        />
        <div className="text-left mt-sm">
          <span className="text-on-surface-variant font-label-sm">{prompt.length} / 500</span>
        </div>
      </div>

      <div className="mb-lg">
        <h3 className="font-label-md text-on-surface-variant mb-sm">اقتراحات الأنماط</h3>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {styles.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(style === s ? null : s)}
              className={[
                'shrink-0 px-4 py-2 rounded-full font-label-md border transition-all',
                style === s
                  ? 'bg-accent-violet text-white border-accent-violet'
                  : 'bg-surface-container text-on-surface-variant border-white/10',
              ].join(' ')}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-xl p-md mb-lg">
        <div className="flex items-center gap-2 mb-md">
          <span className="material-symbols-outlined text-accent-cyan">settings</span>
          <h3 className="font-headline-md text-white text-[18px]">الإعدادات</h3>
        </div>

        <div className="space-y-md">
          <div>
            <label className="block font-label-md text-on-surface-variant mb-sm">النموذج</label>
            <div className="space-y-2">
              {models.map((m) => (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className={[
                    'w-full py-3 px-4 rounded-lg text-right font-body-md border transition-all',
                    model === m
                      ? 'bg-accent-cyan/10 text-white border-accent-cyan'
                      : 'bg-surface-container text-on-surface-variant border-white/10',
                  ].join(' ')}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex justify-between font-label-md text-on-surface-variant mb-sm">
              <span>سرعة الإيقاع (BPM)</span>
              <span className="text-accent-cyan font-bold">{bpm}</span>
            </label>
            <input
              type="range"
              min={60}
              max={200}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-full accent-accent-cyan"
            />
          </div>

          <div>
            <label className="block font-label-md text-on-surface-variant mb-sm">المدة</label>
            <div className="flex gap-2">
              {durations.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={[
                    'flex-1 py-2 rounded-lg font-label-md border transition-all text-[13px]',
                    duration === d
                      ? 'bg-accent-cyan text-canvas-deep border-accent-cyan'
                      : 'bg-surface-container text-on-surface-variant border-white/10',
                  ].join(' ')}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between font-body-md text-white cursor-pointer">
            <span>موسيقى فقط (بدون غناء)</span>
            <input
              type="checkbox"
              checked={instrumental}
              onChange={(e) => setInstrumental(e.target.checked)}
              className="w-5 h-5 accent-accent-cyan"
            />
          </label>
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading || !prompt.trim()}
        className="w-full bg-accent-cyan text-canvas-deep font-headline-md py-4 rounded-xl active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            <span>جاري توليد الموسيقى...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">music_note</span>
            <span>توليد الموسيقى · 20 نقطة</span>
          </>
        )}
      </button>
    </main>
  );
}
