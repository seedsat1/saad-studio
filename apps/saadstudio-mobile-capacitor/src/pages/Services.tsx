import { Link } from 'react-router-dom';

const tools = [
  { to: '/image', icon: 'auto_awesome', color: 'text-accent-cyan', bg: 'bg-accent-cyan/10', label: 'توليد الصور', desc: 'صور فورية بأحدث نماذج AI' },
  { to: '/video', icon: 'videocam', color: 'text-accent-violet', bg: 'bg-accent-violet/10', label: 'إنشاء الفيديو', desc: 'مقاطع سينمائية 4K' },
  { to: '/audio', icon: 'music_note', color: 'text-primary', bg: 'bg-primary/10', label: 'الصوت والأغاني', desc: 'موسيقى وأصوات مخصصة' },
  { to: '/edit', icon: 'movie_edit', color: 'text-accent-violet', bg: 'bg-accent-violet/10', label: 'التعديل بالـ AI', desc: 'مونتاج ذكي احترافي' },
  { to: '/storyboard', icon: 'auto_stories', color: 'text-accent-cyan', bg: 'bg-accent-cyan/10', label: 'Storyboard', desc: 'قصص مصورة قبل الإنتاج' },
  { to: '/transitions', icon: 'swap_horiz', color: 'text-primary', bg: 'bg-primary/10', label: 'الانتقالات', desc: 'مكتبة انتقالات متقدمة' },
];

const stats = [
  { value: '+50', label: 'مشروع ناجح' },
  { value: '12', label: 'جائزة إبداعية' },
  { value: '100%', label: 'رضا العملاء' },
];

export default function Services() {
  return (
    <main className="pt-20 pb-32 px-margin-mobile">
      <section className="py-xl">
        <div className="relative rounded-xl overflow-hidden h-64 mb-lg bg-gradient-to-br from-cyan-900 via-slate-900 to-black">
          <div className="absolute inset-0 bg-gradient-to-t from-canvas-deep via-transparent to-transparent" />
          <div className="absolute bottom-4 start-4 end-4 text-right">
            <span className="inline-block px-3 py-1 bg-accent-cyan text-canvas-deep rounded-full font-label-sm mb-2">
              ابتكار مستقبلي
            </span>
            <h2 className="font-headline-lg text-white font-bold leading-tight">
              خدمات إنتاج تفوق<br />حدود الخيال
            </h2>
          </div>
        </div>
        <p className="font-body-md text-on-surface-variant leading-relaxed">
          في استوديو سعد، ندمج بين التكنولوجيا المتقدمة والخبرة الإبداعية لنقدم حلولاً بصرية تعيد تعريف مفهوم الإنتاج السينمائي والتقني.
        </p>
      </section>

      <section className="mb-xl">
        <h3 className="font-headline-md text-white mb-md">أدواتنا</h3>
        <div className="grid grid-cols-2 gap-gutter">
          {tools.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="glass-card rounded-xl p-md flex flex-col gap-2 active:scale-[0.98] transition-all"
            >
              <div className={`w-11 h-11 rounded-xl ${t.bg} flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${t.color}`}>{t.icon}</span>
              </div>
              <h4 className="font-headline-md text-white text-[16px] leading-tight">{t.label}</h4>
              <p className="text-on-surface-variant text-[12px] leading-snug">{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-xxl">
        <div className="flex gap-gutter overflow-x-auto pb-4 hide-scrollbar">
          {stats.map((s) => (
            <div key={s.label} className="min-w-[140px] flex-shrink-0 bg-surface-container rounded-xl p-lg border border-white/5">
              <span className="block text-[36px] leading-none text-accent-cyan font-bold mb-1">{s.value}</span>
              <span className="font-label-sm text-on-surface-variant">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-xl text-center mb-xxl relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-cyan blur-3xl" />
        </div>
        <div className="relative z-10">
          <h3 className="font-headline-lg text-white font-bold mb-md">هل لديك رؤية تريد تحقيقها؟</h3>
          <p className="font-body-md text-on-surface-variant mb-xl">
            نحن هنا لنحول أفكارك الطموحة إلى واقع بصري ملموس يتحدث لغة المستقبل.
          </p>
          <Link
            to="/contact"
            className="inline-block px-xl py-4 bg-white text-canvas-deep rounded-full font-label-md font-bold shadow-lg shadow-white/10 active:scale-95 transition-all"
          >
            ابدأ مشروعك الآن
          </Link>
        </div>
      </section>
    </main>
  );
}
