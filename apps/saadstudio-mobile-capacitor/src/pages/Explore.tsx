import { useState } from 'react';

const categories = ['الكل', 'صور', 'فيديو', 'صوت', 'انتقالات', 'قصص مصورة'];

const items = [
  { title: 'مشهد سينمائي عربي', tag: 'صور', gradient: 'from-amber-900 via-slate-900 to-black' },
  { title: 'فيديو ترويجي 4K', tag: 'فيديو', gradient: 'from-cyan-900 via-slate-900 to-black' },
  { title: 'أغنية تصويرية', tag: 'صوت', gradient: 'from-fuchsia-900 via-slate-900 to-black' },
  { title: 'انتقال إبداعي', tag: 'انتقالات', gradient: 'from-emerald-900 via-slate-900 to-black' },
  { title: 'قصة مصورة قصيرة', tag: 'قصص مصورة', gradient: 'from-violet-900 via-slate-900 to-black' },
  { title: 'بورتريه رقمي', tag: 'صور', gradient: 'from-rose-900 via-slate-900 to-black' },
];

export default function Explore() {
  const [active, setActive] = useState('الكل');
  const filtered = active === 'الكل' ? items : items.filter((i) => i.tag === active);

  return (
    <main className="pt-16 pb-24 px-margin-mobile">
      <div className="mt-lg">
        <h2 className="font-headline-lg text-white mb-2">استكشف</h2>
        <p className="text-on-surface-variant font-body-md">أحدث ما أبدعه المجتمع بأدوات saadstudio.</p>
      </div>

      <div className="mt-lg glass-card rounded-full flex items-center px-4 py-3 gap-2">
        <span className="material-symbols-outlined text-on-surface-variant">search</span>
        <input
          className="bg-transparent flex-1 outline-none text-white placeholder:text-on-surface-variant font-body-md"
          placeholder="ابحث عن أعمال أو أدوات..."
        />
      </div>

      <div className="mt-lg flex gap-2 overflow-x-auto hide-scrollbar">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={[
              'shrink-0 px-4 py-2 rounded-full font-label-md transition-all border',
              active === c
                ? 'bg-accent-cyan text-canvas-deep border-accent-cyan'
                : 'bg-surface-container text-on-surface-variant border-white/10 hover:border-accent-cyan/40',
            ].join(' ')}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-lg grid grid-cols-2 gap-gutter">
        {filtered.map((item) => (
          <div
            key={item.title}
            className={`relative aspect-[3/4] rounded-xl overflow-hidden border border-white/5 bg-gradient-to-br ${item.gradient} active:scale-[0.97] transition-transform`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-md">
              <span className="text-accent-cyan font-label-sm mb-1 uppercase tracking-wider">
                {item.tag}
              </span>
              <h4 className="font-headline-md text-white text-[16px] leading-snug">{item.title}</h4>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
