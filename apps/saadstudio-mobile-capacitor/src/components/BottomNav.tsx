import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', icon: 'home', label: 'الرئيسية' },
  { to: '/projects', icon: 'work', label: 'المشاريع' },
  { to: '/services', icon: 'category', label: 'الخدمات' },
  { to: '/contact', icon: 'mail', label: 'اتصل بنا' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-4 pt-2 bg-surface/60 backdrop-blur-xl border-t border-white/10 rounded-t-xl h-20">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            [
              'flex flex-col items-center justify-center rounded-xl px-4 py-1 active:scale-90 transition-all duration-300',
              isActive
                ? 'text-primary bg-primary-container/20'
                : 'text-on-surface-variant hover:text-accent-cyan',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <span
                className="material-symbols-outlined"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="font-label-sm text-label-sm">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
