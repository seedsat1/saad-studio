import { useState, FormEvent } from 'react';

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <main className="pt-24 pb-32 px-margin-mobile min-h-screen relative">
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none bg-gradient-to-b from-canvas-deep via-slate-900 to-canvas-deep" />

      <div className="relative z-10 space-y-xl">
        <section className="space-y-md">
          <div className="inline-block px-3 py-1 rounded-full border border-accent-cyan/30 bg-accent-cyan/5 text-accent-cyan font-label-sm">
            من نحن
          </div>
          <h1 className="font-display-lg-mobile text-display-lg-mobile text-white">
            نبتكر تجارب رقمية تأسر الحواس
          </h1>
          <p className="font-body-lg text-on-surface-variant leading-relaxed">
            استوديو سعد هو بيت خبرة إبداعي متخصص في تحويل الأفكار المعقدة إلى واجهات مستخدم مذهلة وحلول تقنية مبتكرة.
          </p>
        </section>

        <section className="glass-card p-lg rounded-xl space-y-lg">
          <div className="space-y-xs">
            <h2 className="font-headline-md text-white">اتصل بنا</h2>
            <p className="font-body-md text-on-surface-variant">دعنا نتحدث عن مشروعك القادم.</p>
          </div>
          <form onSubmit={submit} className="space-y-md">
            <div className="space-y-xs">
              <label className="block font-label-md text-on-surface-variant pr-1">الاسم الكامل</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="سعد المنصور"
                className="w-full bg-surface-container-low border-b-2 border-transparent focus:border-accent-cyan transition-all duration-300 py-3 px-4 rounded-lg outline-none text-white font-body-md"
                required
              />
            </div>
            <div className="space-y-xs">
              <label className="block font-label-md text-on-surface-variant pr-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="example@studio.sa"
                className="w-full bg-surface-container-low border-b-2 border-transparent focus:border-accent-cyan transition-all duration-300 py-3 px-4 rounded-lg outline-none text-white font-body-md"
                required
              />
            </div>
            <div className="space-y-xs">
              <label className="block font-label-md text-on-surface-variant pr-1">الرسالة</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="كيف يمكننا مساعدتك؟"
                rows={4}
                className="w-full bg-surface-container-low border-b-2 border-transparent focus:border-accent-cyan transition-all duration-300 py-3 px-4 rounded-lg outline-none text-white font-body-md resize-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-accent-cyan text-canvas-deep font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all duration-200"
            >
              {sent ? '✓ تم الإرسال' : 'إرسال الرسالة'}
            </button>
          </form>
        </section>

        <section className="grid grid-cols-1 gap-md">
          <div className="glass-card p-md rounded-xl flex items-center gap-md">
            <div className="w-12 h-12 rounded-lg bg-accent-violet/20 flex items-center justify-center text-accent-violet shrink-0">
              <span className="material-symbols-outlined">mail</span>
            </div>
            <div>
              <p className="font-label-sm text-on-surface-variant">راسلنا عبر</p>
              <p className="font-body-md text-white">hello@saadstudio.app</p>
            </div>
          </div>
          <div className="glass-card p-md rounded-xl flex items-center gap-md">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined">share</span>
            </div>
            <div className="flex-1 flex justify-between items-center">
              <div>
                <p className="font-label-sm text-on-surface-variant">تابعنا على</p>
                <p className="font-body-md text-white">@saadstudio</p>
              </div>
              <div className="flex gap-3">
                <a href="#" className="text-on-surface-variant hover:text-accent-cyan transition-colors">
                  <span className="material-symbols-outlined">alternate_email</span>
                </a>
                <a href="#" className="text-on-surface-variant hover:text-accent-cyan transition-colors">
                  <span className="material-symbols-outlined">public</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
