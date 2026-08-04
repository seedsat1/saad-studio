import { useState } from 'react';

const engines = ['Kling 3.0 (NEW)', 'Seedance 2', 'Veo 3.1', 'Hailuo I2V'];
const durations = ['3s', '5s', '10s'];
const ratios = ['16:9', '9:16', '1:1'];
const qualities = ['Standard', 'Ultra'];

export default function VideoGen() {
  const [engine, setEngine] = useState(engines[0]);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState('5s');
  const [ratio, setRatio] = useState('16:9');
  const [quality, setQuality] = useState('Standard');
  const [loading, setLoading] = useState(false);

  const generate = () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <main className="pt-20 pb-32 px-margin-mobile">
      <div className="mt-lg mb-lg">
        <h2 className="font-headline-lg text-white mb-2">إنشاء الفيديو</h2>
        <p className="text-on-surface-variant font-body-md">من نص إلى فيديو سينمائي بأحدث نماذج AI.</p>
      </div>

      <div className="glass-card rounded-xl p-md mb-lg">
        <label className="block font-label-md text-on-surface-variant mb-sm">وصف المشهد</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder="مثال: كاميرا تتحرك ببطء فوق صحراء ليلية، السماء مرصعة بالنجوم، إضاءة قمرية باردة"
          className="w-full bg-transparent outline-none text-white placeholder:text-on-surface-variant font-body-md resize-none"
        />
      </div>

      <div className="glass-card rounded-xl p-md mb-md">
        <div className="flex items-center gap-2 mb-md">
          <span className="material-symbols-outlined text-accent-cyan">settings</span>
          <h3 className="font-headline-md text-white text-[18px]">إعدادات الإنشاء</h3>
        </div>

        <div className="space-y-md">
          <div>
            <label className="block font-label-md text-on-surface-variant mb-sm">محرك الفيديو</label>
            <div className="grid grid-cols-2 gap-2">
              {engines.map((e) => (
                <button
                  key={e}
                  onClick={() => setEngine(e)}
                  className={[
                    'py-2 px-3 rounded-lg text-[13px] font-label-md border transition-all',
                    engine === e
                      ? 'bg-accent-violet text-white border-accent-violet'
                      : 'bg-surface-container text-on-surface-variant border-white/10',
                  ].join(' ')}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-label-md text-on-surface-variant mb-sm">المدة الزمنية</label>
            <div className="flex gap-2">
              {durations.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={[
                    'flex-1 py-2 rounded-lg font-label-md border transition-all',
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

          <div>
            <label className="block font-label-md text-on-surface-variant mb-sm">أبعاد الفيديو</label>
            <div className="flex gap-2">
              {ratios.map((r) => (
                <button
                  key={r}
                  onClick={() => setRatio(r)}
                  className={[
                    'flex-1 py-2 rounded-lg font-label-md border transition-all',
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

          <div>
            <label className="block font-label-md text-on-surface-variant mb-sm">جودة الإنشاء</label>
            <div className="flex gap-2">
              {qualities.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={[
                    'flex-1 py-2 rounded-lg font-label-md border transition-all',
                    quality === q
                      ? 'bg-accent-violet text-white border-accent-violet'
                      : 'bg-surface-container text-on-surface-variant border-white/10',
                  ].join(' ')}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
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
            <span>جاري توليد الفيديو...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">movie_filter</span>
            <span>توليد الفيديو · 9 cr</span>
          </>
        )}
      </button>
    </main>
  );
}
