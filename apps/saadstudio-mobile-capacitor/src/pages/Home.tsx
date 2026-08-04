const services = [
  {
    icon: 'videocam',
    bg: 'bg-accent-cyan/10',
    fg: 'text-accent-cyan',
    title: 'الإنتاج المرئي',
    desc: 'صناعة محتوى فيديو عالي الجودة وبدقة 4K.',
  },
  {
    icon: 'smart_toy',
    bg: 'bg-accent-violet/10',
    fg: 'text-accent-violet',
    title: 'تكامل الذكاء الاصطناعي',
    desc: 'حلول مبتكرة لتوليد المشاهد والشخصيات آلياً.',
  },
  {
    icon: 'design_services',
    bg: 'bg-primary/10',
    fg: 'text-primary',
    title: 'تصميم إبداعي',
    desc: 'هويات بصرية عصرية تواكب المستقبل الرقمي.',
  },
];

const featured = [
  {
    tag: 'Sci-Fi Series',
    tagColor: 'text-accent-cyan',
    title: 'مستقبل الرياض 2050',
    gradient: 'from-cyan-900 via-slate-900 to-black',
  },
  {
    tag: 'AI Experiment',
    tagColor: 'text-accent-violet',
    title: 'تحولات المادة',
    gradient: 'from-violet-900 via-slate-900 to-black',
  },
];

export default function Home() {
  return (
    <main className="pt-16 pb-24">
      <section className="relative h-[85vh] w-full overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black">
          <div className="absolute inset-0 hero-gradient" />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-end px-margin-mobile pb-12">
          <div className="max-w-md space-y-4">
            <h2 className="font-display-lg-mobile text-display-lg-mobile leading-tight text-white">
              ابدع بلا حدود
            </h2>
            <p className="font-body-lg text-on-surface-variant max-w-[80%]">
              نحوّل أفكارك الجريئة إلى واقع رقمي سينمائي باستخدام أحدث تقنيات الذكاء الاصطناعي والإنتاج الفني.
            </p>
            <div className="pt-4">
              <button className="bg-accent-cyan text-canvas-deep font-headline-md px-8 py-4 rounded-xl active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center gap-3">
                <span>ابدأ رحلتك الإبداعية</span>
                <span className="material-symbols-outlined" style={{ transform: 'scaleX(-1)' }}>arrow_back</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-xxl px-margin-mobile">
        <div className="flex justify-between items-center mb-md">
          <h3 className="font-headline-lg text-white">خدماتنا</h3>
          <button className="text-accent-cyan font-label-md flex items-center gap-1 hover:underline">
            مشاهدة الكل
          </button>
        </div>
        <div className="grid grid-cols-1 gap-gutter">
          {services.map((s) => (
            <div
              key={s.title}
              className="glass-card rounded-xl p-lg flex items-center gap-md active:scale-[0.98] transition-all"
            >
              <div className={`w-14 h-14 rounded-full ${s.bg} ${s.fg} flex items-center justify-center shrink-0`}>
                <span className="material-symbols-outlined text-[32px]">{s.icon}</span>
              </div>
              <div>
                <h4 className="font-headline-md text-white">{s.title}</h4>
                <p className="text-on-surface-variant font-body-md">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-xxl">
        <div className="px-margin-mobile flex justify-between items-center mb-md">
          <h3 className="font-headline-lg text-white">أعمال مختارة</h3>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-sm" style={{ transform: 'scaleX(-1)' }}>chevron_right</span>
            </button>
            <button className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-sm" style={{ transform: 'scaleX(-1)' }}>chevron_left</span>
            </button>
          </div>
        </div>
        <div className="flex overflow-x-auto gap-gutter px-margin-mobile hide-scrollbar snap-x">
          {featured.map((w) => (
            <div key={w.title} className="min-w-[280px] snap-start group">
              <div className={`relative h-96 rounded-xl overflow-hidden border border-white/5 bg-gradient-to-br ${w.gradient}`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-lg">
                  <span className={`${w.tagColor} font-label-sm mb-1 uppercase tracking-wider`}>{w.tag}</span>
                  <h4 className="font-headline-md text-white">{w.title}</h4>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-xxl px-margin-mobile">
        <div className="relative rounded-2xl overflow-hidden p-margin-mobile border border-white/10 bg-surface-container">
          <div className="relative z-10">
            <h3 className="font-headline-lg text-white mb-2">انضم لمجتمعنا الإبداعي</h3>
            <p className="font-body-md text-on-surface-variant mb-lg">
              احصل على وصول حصري لأحدث تقنيات الإنتاج وتدريبات الذكاء الاصطناعي.
            </p>
            <button className="bg-white text-canvas-deep font-label-md px-6 py-3 rounded-full hover:bg-accent-cyan transition-colors active:scale-95">
              سجل الآن
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
