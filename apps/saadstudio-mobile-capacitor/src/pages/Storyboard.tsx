import { useState } from 'react';

interface Shot {
  id: number;
  title: string;
  description: string;
  gradient: string;
}

const initial: Shot[] = [
  { id: 1, title: 'اللقطة 01: شوارع المستقبل', description: 'كاميرا واسعة تكشف مدينة مضاءة بالنيون', gradient: 'from-cyan-800 via-slate-900 to-black' },
  { id: 2, title: 'اللقطة 02: البطل', description: 'لقطة قريبة للبطل يمشي بثقة', gradient: 'from-violet-800 via-slate-900 to-black' },
  { id: 3, title: 'اللقطة 03: المواجهة', description: 'تصوير من الأسفل، إضاءة درامية', gradient: 'from-amber-800 via-slate-900 to-black' },
];

const visualStyles = ['سينمائي', 'رسم يدوي', 'أنمي', 'واقعي'];
const aspects = ['16:9', '9:16', '4:3', '1:1'];

export default function Storyboard() {
  const [shots, setShots] = useState<Shot[]>(initial);
  const [style, setStyle] = useState('سينمائي');
  const [aspect, setAspect] = useState('16:9');

  const addShot = () => {
    setShots([
      ...shots,
      {
        id: Date.now(),
        title: `اللقطة ${String(shots.length + 1).padStart(2, '0')}: جديدة`,
        description: 'أضف وصفاً لهذه اللقطة',
        gradient: 'from-slate-700 via-slate-900 to-black',
      },
    ]);
  };

  const removeShot = (id: number) => {
    setShots(shots.filter((s) => s.id !== id));
  };

  return (
    <main className="pt-20 pb-32 px-margin-mobile">
      <div className="mt-lg mb-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-accent-cyan">auto_awesome</span>
          <span className="font-label-sm text-accent-cyan">ذكاء اصطناعي إبداعي</span>
        </div>
        <h2 className="font-headline-lg text-white leading-tight">
          حوّل أفكارك إلى<br />
          <span className="text-accent-cyan">قصص بصرية</span> متكاملة
        </h2>
      </div>

      <div className="glass-card rounded-xl p-md mb-lg">
        <h3 className="font-headline-md text-white text-[18px] mb-md flex items-center gap-2">
          <span className="material-symbols-outlined text-accent-cyan">palette</span>
          أدوات التحكم
        </h3>
        <div className="space-y-md">
          <div>
            <label className="block font-label-md text-on-surface-variant mb-sm">النمط البصري</label>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {visualStyles.map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
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
          <div>
            <label className="block font-label-md text-on-surface-variant mb-sm">نسبة العرض</label>
            <div className="flex gap-2">
              {aspects.map((a) => (
                <button
                  key={a}
                  onClick={() => setAspect(a)}
                  className={[
                    'flex-1 py-2 rounded-lg font-label-md border transition-all',
                    aspect === a
                      ? 'bg-accent-cyan text-canvas-deep border-accent-cyan'
                      : 'bg-surface-container text-on-surface-variant border-white/10',
                  ].join(' ')}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-md">
        <h3 className="font-headline-md text-white text-[20px]">اللقطات ({shots.length})</h3>
        <button
          onClick={addShot}
          className="bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30 rounded-full px-4 py-2 font-label-md flex items-center gap-1 active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>لقطة</span>
        </button>
      </div>

      <div className="space-y-md mb-lg">
        {shots.map((shot) => (
          <div key={shot.id} className="glass-card rounded-xl overflow-hidden">
            <div className={`aspect-video bg-gradient-to-br ${shot.gradient} relative`}>
              <button
                onClick={() => removeShot(shot.id)}
                className="absolute top-2 end-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white/80 hover:text-red-400"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
            <div className="p-md">
              <h4 className="font-headline-md text-white text-[16px] mb-1">{shot.title}</h4>
              <p className="font-label-md text-on-surface-variant text-[13px]">{shot.description}</p>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full bg-accent-cyan text-canvas-deep font-headline-md py-4 rounded-xl active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center justify-center gap-2">
        <span className="material-symbols-outlined">movie</span>
        <span>توليد القصة كاملة</span>
      </button>
    </main>
  );
}
