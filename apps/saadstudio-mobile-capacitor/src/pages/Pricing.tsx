import { useState } from 'react';

const plans = [
  {
    id: 'starter',
    name: 'مبتدئ',
    tagline: 'لصناع محتوى AI الجدد',
    price: 15,
    credits: 300,
    creditsLabel: '97 صورة Nano',
    icon: 'rocket_launch',
    features: ['وصول للنماذج الأساسية', 'دقة قياسية', 'دعم عبر البريد'],
    ctaClass: 'bg-surface-container text-white hover:bg-surface-container-high',
    borderClass: '',
  },
  {
    id: 'pro',
    name: 'برو',
    tagline: 'لاستوديوهات المحتوى الجادة',
    price: 70,
    credits: 1800,
    creditsLabel: 'حتى 34 فيديو Kling',
    icon: 'stars',
    popular: true,
    features: ['الوصول للنماذج المميزة', 'توليد متوازي (5 فيديو / 10 صور)', 'أولوية طابور التوليد', 'حقوق الاستخدام التجاري'],
    ctaClass: 'bg-accent-cyan text-canvas-deep',
    borderClass: 'border-accent-cyan/50 shadow-[0_0_30px_rgba(6,182,212,0.15)]',
  },
  {
    id: 'max',
    name: 'ماكس',
    tagline: 'للوكالات والفرق الاحترافية',
    price: 99,
    credits: 2700,
    creditsLabel: '/شهر',
    icon: 'diamond',
    features: ['وصول كامل للـ API', 'مدير حساب مخصص', 'دعم على مدار الساعة', 'تدريب الفريق'],
    ctaClass: 'border border-primary text-primary hover:bg-primary/10',
    borderClass: 'border-primary/20',
  },
];

const topups = [
  { credits: 75, price: 5, popular: false },
  { credits: 250, price: 15, popular: true },
  { credits: 500, price: 30, popular: false },
];

export default function Pricing() {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <main className="pt-20 pb-32 px-margin-mobile">
      <div className="mt-lg text-center mb-xl">
        <h2 className="font-headline-lg text-white mb-2">اختر باقتك</h2>
        <p className="text-on-surface-variant font-body-md">تسعير شفاف · لا رسوم مخفية</p>
      </div>

      <div className="flex justify-center mb-lg">
        <div className="bg-surface-container rounded-full p-1 flex gap-1">
          <button
            onClick={() => setCycle('monthly')}
            className={[
              'px-6 py-2 rounded-full font-label-md transition-all',
              cycle === 'monthly' ? 'bg-accent-cyan text-canvas-deep' : 'text-on-surface-variant',
            ].join(' ')}
          >
            شهرياً
          </button>
          <button
            onClick={() => setCycle('yearly')}
            className={[
              'px-6 py-2 rounded-full font-label-md transition-all',
              cycle === 'yearly' ? 'bg-accent-cyan text-canvas-deep' : 'text-on-surface-variant',
            ].join(' ')}
          >
            سنوياً <span className="text-[10px] text-accent-cyan">-20%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-lg mb-xl">
        {plans.map((p) => {
          const price = cycle === 'yearly' ? Math.floor(p.price * 0.8) : p.price;
          return (
            <div key={p.id} className={`glass-card rounded-xl p-lg relative ${p.borderClass}`}>
              {p.popular && (
                <div className="absolute -top-3 right-6 bg-accent-cyan text-canvas-deep px-3 py-1 rounded-full font-label-sm">
                  الأكثر شعبية
                </div>
              )}
              <div className="flex justify-between items-start mb-md">
                <div>
                  <h3 className="font-headline-md text-white">{p.name}</h3>
                  <p className="text-on-surface-variant font-label-sm">{p.tagline}</p>
                </div>
                <span className="material-symbols-outlined text-accent-cyan" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {p.icon}
                </span>
              </div>
              <div className="mb-lg">
                <span className="font-display-lg-mobile text-display-lg-mobile text-white">${price}</span>
                <span className="text-on-surface-variant"> / {cycle === 'yearly' ? 'سنوياً' : 'شهرياً'}</span>
              </div>
              <div className="bg-surface-container/50 rounded-lg p-md mb-lg flex justify-between items-center border border-white/5">
                <span className="font-body-md text-accent-cyan font-bold">{p.credits.toLocaleString('ar-EG')} نقطة</span>
                <span className="font-label-sm text-on-surface-variant">{p.creditsLabel}</span>
              </div>
              <ul className="space-y-sm mb-xl">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-on-background font-body-md">
                    <span className="material-symbols-outlined text-accent-cyan text-[16px]">check_circle</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button className={`w-full py-4 rounded-xl font-headline-md hover:scale-[1.02] active:scale-95 transition-all ${p.ctaClass}`}>
                احصل على {p.name}
              </button>
            </div>
          );
        })}
      </div>

      <section className="mb-xl">
        <div className="flex items-center gap-2 mb-md">
          <span className="material-symbols-outlined text-accent-cyan">add_circle</span>
          <h2 className="font-headline-md text-white">اشترِ نقاطاً إضافية</h2>
        </div>
        <p className="text-on-surface-variant font-body-md mb-md">
          تتراكم النقاط مع خطتك ولا تنتهي صلاحيتها أبداً.
        </p>
        <div className="flex overflow-x-auto gap-md pb-2 hide-scrollbar">
          {topups.map((t) => (
            <div
              key={t.credits}
              className={[
                'shrink-0 w-40 glass-card p-md rounded-xl text-center relative',
                t.popular ? 'border-accent-cyan/40' : '',
              ].join(' ')}
            >
              {t.popular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent-cyan text-canvas-deep text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                  أفضل قيمة
                </div>
              )}
              <div className="text-accent-cyan font-bold text-[28px] mb-1">+{t.credits}</div>
              <div className="text-on-surface-variant font-label-sm mb-md">نقطة</div>
              <div className="text-white font-bold text-[20px] mb-md">${t.price}</div>
              <button
                className={[
                  'w-full py-2 rounded-lg font-label-md transition-all',
                  t.popular ? 'bg-accent-cyan text-canvas-deep' : 'bg-surface-container text-white hover:bg-accent-cyan hover:text-canvas-deep',
                ].join(' ')}
              >
                شراء
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
