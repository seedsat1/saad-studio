import { useEffect } from "react";

export default function SimpleToast({ message, show, onHide }: { message: string; show: boolean; onHide: () => void }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onHide, 1800);
    return () => clearTimeout(t);
  }, [show, onHide]);

  if (!show) return null;
  return (
    <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-xl bg-black/90 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 animate-fade-in-up">
      {message}
    </div>
  );
}
