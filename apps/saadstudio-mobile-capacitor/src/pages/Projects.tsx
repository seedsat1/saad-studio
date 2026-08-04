import { useState } from 'react';

const filters = ['الكل', 'فيديو', 'تصميم', 'ذكاء اصطناعي'];

const projects = [
  {
    id: 1,
    title: 'عالم سـيدانس الرقمي',
    desc: 'تجربة بصرية متكاملة تم تطويرها باستخدام أحدث تقنيات المحركات الرسومية لخلق عوالم خيالية غامرة.',
    tag: 'رائد',
    category: 'ذكاء اصطناعي',
    featured: true,
    gradient: 'from-cyan-800 via-slate-900 to-black',
  },
  { id: 2, title: 'نيون فيوتشر', desc: 'تصميم هوية بصرية مستقبلية', category: 'تصميم', gradient: 'from-violet-800 via-fuchsia-900 to-black' },
  { id: 3, title: 'نانو بانانا برو', desc: 'واجهة ذكاء اصطناعي متطورة', category: 'ذكاء اصطناعي', gradient: 'from-amber-700 via-orange-900 to-black' },
  { id: 4, title: 'محرك المشاهد القادم', desc: 'إنتاج سينمائي عالي الجودة', category: 'فيديو', gradient: 'from-blue-800 via-indigo-900 to-black' },
  { id: 5, title: 'تناسق الشخصيات', desc: 'ذكاء اصطناعي إبداعي', category: 'ذكاء اصطناعي', gradient: 'from-emerald-800 via-teal-900 to-black' },
  { id: 6, title: 'انتقالات سينمائية', desc: 'تأثيرات بصرية متقدمة', category: 'فيديو', gradient: 'from-rose-800 via-pink-900 to-black' },
];

export default function Projects() {
  const [active, setActive] = useState('الكل');
  const list = active === 'الكل' ? projects : projects.filter((p) => p.category === active);

  return (
    <main className="pt-20 pb-32 px-margin-mobile">
      <section className="mb-8">
        <h2 className="font-headline-lg text-white mb-2">معرض الأعمال</h2>
        <p className="text-on-surface-variant font-body-md">نحول الخيال إلى واقع بصري مذهل</p>
      </section>

      <div className="flex gap-3 overflow-x-auto mb-8 pb-2 hide-scrollbar">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActive(f)}
            className={[
              'px-6 py-2 rounded-full font-label-md whitespace-nowrap transition-all',
              active === f
                ? 'bg-primary text-on-primary shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                : 'bg-surface-variant/50 text-on-surface hover:bg-primary/20',
            ].join(' ')}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-gutter">
        {list.map((p) => (
          <div
            key={p.id}
            className={[
              'group relative bg-canvas-elevated rounded-xl overflow-hidden border border-white/10 flex flex-col active:scale-[0.98] transition-transform',
              p.featured ? 'col-span-2' : '',
            ].join(' ')}
          >
            <div className={`${p.featured ? 'aspect-video' : 'aspect-square'} w-full relative overflow-hidden bg-gradient-to-br ${p.gradient}`}>
              <div className="absolute inset-0 bg-gradient-to-t from-canvas-deep via-transparent to-transparent opacity-80" />
              {p.tag && (
                <div className="absolute bottom-4 end-4 bg-accent-cyan/20 backdrop-blur-md px-3 py-1 rounded-lg border border-accent-cyan/30">
                  <span className="text-accent-cyan text-label-sm font-label-sm">{p.tag}</span>
                </div>
              )}
            </div>
            <div className={p.featured ? 'p-6' : 'p-4'}>
              <h3 className={[p.featured ? 'font-headline-md text-headline-md' : 'text-[16px] font-semibold', 'text-white mb-1 group-hover:text-primary transition-colors'].join(' ')}>
                {p.title}
              </h3>
              <p className={[p.featured ? 'font-body-md' : 'font-label-sm', 'text-on-surface-variant line-clamp-2'].join(' ')}>
                {p.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-12 bg-primary/5 rounded-2xl p-8 border border-primary/20 text-center">
        <h3 className="font-headline-lg text-primary mb-4">هل لديك مشروع؟</h3>
        <p className="text-on-surface-variant font-body-md mb-6">
          دعنا نحول فكرتك إلى حقيقة بصرية مذهلة.
        </p>
        <button className="bg-primary text-on-primary px-8 py-3 rounded-xl font-headline-md active:scale-95 transition-transform">
          ابدأ مشروعك الآن
        </button>
      </section>
    </main>
  );
}
