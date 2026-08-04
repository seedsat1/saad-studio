import { useState } from 'react';
import SideDrawer from './SideDrawer';

interface TopAppBarProps {
  title?: string;
}

export default function TopAppBar({ title = 'saadstudio' }: TopAppBarProps) {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    setLang(next);
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-surface/60 backdrop-blur-xl border-b border-white/10 flex items-center px-margin-mobile h-16">
        <div className="flex items-center gap-4 flex-1">
          <button
            className="active:scale-95 transition-transform duration-200 hover:text-accent-cyan text-on-surface-variant"
            onClick={() => setDrawerOpen(true)}
            aria-label="menu"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="font-display-lg-mobile text-display-lg-mobile font-bold text-accent-cyan">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-1 glass-card px-3 py-1.5 rounded-full border border-white/10 text-label-md hover:bg-white/5 transition-colors"
            onClick={toggleLang}
          >
            <span className="material-symbols-outlined text-[18px]">language</span>
            <span className="font-bold">{lang === 'ar' ? 'EN' : 'AR'}</span>
          </button>
          <div className="w-10 h-10 rounded-full bg-surface-container border border-white/10 overflow-hidden active:scale-95 transition-transform duration-200">
            <div className="w-full h-full bg-gradient-to-br from-accent-cyan/40 to-accent-violet/40" />
          </div>
        </div>
      </header>
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
