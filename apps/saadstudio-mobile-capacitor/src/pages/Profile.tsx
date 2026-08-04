export default function Profile() {
  return (
    <main className="pt-16 pb-24 px-margin-mobile">
      <div className="mt-lg flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-cyan to-accent-violet mb-md" />
        <h2 className="font-headline-lg text-white">مرحباً بك</h2>
        <p className="text-on-surface-variant font-body-md mt-1">سجّل دخولك للوصول لأعمالك ومشاريعك.</p>
        <button className="mt-lg w-full bg-accent-cyan text-canvas-deep font-headline-md py-3 rounded-xl active:scale-[0.98]">
          تسجيل الدخول
        </button>
      </div>

      <div className="mt-xl space-y-2">
        {[
          { icon: 'work', label: 'مشاريعي' },
          { icon: 'favorite', label: 'المفضلة' },
          { icon: 'credit_card', label: 'باقات الاشتراك' },
          { icon: 'settings', label: 'الإعدادات' },
          { icon: 'help', label: 'المساعدة' },
        ].map((item) => (
          <div
            key={item.label}
            className="glass-card rounded-xl p-md flex items-center gap-md active:scale-[0.98] transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-accent-cyan">
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            </div>
            <span className="flex-1 text-white font-body-md">{item.label}</span>
            <span className="material-symbols-outlined text-on-surface-variant" style={{ transform: 'scaleX(-1)' }}>
              chevron_right
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
