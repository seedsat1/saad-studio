import { NavLink } from 'react-router-dom';

const groups = [
  {
    title: 'الأدوات',
    items: [
      { to: '/explore', icon: 'travel_explore', label: 'استكشف' },
      { to: '/image', icon: 'auto_awesome', label: 'توليد الصور' },
      { to: '/video', icon: 'videocam', label: 'إنشاء الفيديو' },
      { to: '/audio', icon: 'music_note', label: 'أنشئ أغنيتك' },
      { to: '/edit', icon: 'movie_edit', label: 'تعديل الصور' },
      { to: '/storyboard', icon: 'auto_stories', label: 'Storyboard' },
      { to: '/transitions', icon: 'swap_horiz', label: 'الانتقالات' },
    ],
  },
  {
    title: 'الحساب',
    items: [
      { to: '/pricing', icon: 'credit_card', label: 'باقات الاشتراك' },
      { to: '/profile', icon: 'person', label: 'حسابي' },
    ],
  },
];

interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function SideDrawer({ open, onClose }: SideDrawerProps) {
  return (
    <>
      <div
        onClick={onClose}
        className={[
          'fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />
      <aside
        className={[
          'fixed top-0 right-0 h-full w-[80%] max-w-[320px] z-[70] bg-surface-container border-l border-white/10 overflow-y-auto transition-transform duration-300 hide-scrollbar',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="p-lg border-b border-white/10 flex items-center justify-between">
          <h2 className="font-display-lg-mobile text-[28px] font-bold text-accent-cyan">saadstudio</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant active:scale-95"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-md space-y-lg">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="font-label-md text-on-surface-variant px-2 mb-sm uppercase tracking-wider text-[11px]">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 px-3 py-3 rounded-lg font-body-md transition-all',
                        isActive
                          ? 'bg-accent-cyan/10 text-accent-cyan'
                          : 'text-white hover:bg-white/5',
                      ].join(' ')
                    }
                  >
                    <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
