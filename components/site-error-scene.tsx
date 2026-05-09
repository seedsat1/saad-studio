"use client";

import Link from "next/link";
import { ArrowLeft, Home, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type SiteErrorSceneProps = {
  code?: string;
  eyebrow?: string;
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  onRetry?: () => void;
  className?: string;
};

function RobotMascot() {
  return (
    <div className="relative mx-auto h-[300px] w-[300px] sm:h-[380px] sm:w-[380px]">
      <div className="absolute left-1/2 top-12 h-48 w-48 -translate-x-1/2 animate-[saad-float_4s_ease-in-out_infinite] rounded-[2.2rem] border border-white/45 bg-[linear-gradient(135deg,#f7f4e8,#b9b0a1_45%,#6d6460)] p-3 shadow-[0_0_80px_rgba(103,232,249,.28)]">
        <div className="absolute -inset-2 -z-10 rounded-[2.6rem] bg-[conic-gradient(from_140deg,#67e8f9,#a78bfa,#fb7185,#fde68a,#67e8f9)] opacity-80 blur-sm" />
        <div className="relative h-full rounded-[1.7rem] border border-black/30 bg-[#0b0d12] shadow-inner">
          <div className="absolute inset-4 rounded-[1.25rem] bg-[linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px)] bg-[length:18px_18px]" />
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-7">
            <span className="h-4 w-4 animate-pulse rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,.9)]" />
            <span className="h-4 w-4 animate-pulse rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,.9)] [animation-delay:.2s]" />
          </div>
          <div className="absolute bottom-5 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-cyan-200/70" />
        </div>
      </div>

      <div className="absolute left-[47%] top-[220px] h-24 w-28 -translate-x-1/2 rounded-[2rem] border border-white/30 bg-[linear-gradient(160deg,#e8dfcf,#948879)] shadow-2xl sm:top-[270px]">
        <div className="absolute left-1/2 top-5 flex -translate-x-1/2 gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-200" />
          <span className="h-2 w-2 rounded-full bg-fuchsia-300" />
          <span className="h-2 w-2 rounded-full bg-amber-200" />
        </div>
        <div className="absolute bottom-4 left-5 h-8 w-3 rounded-full bg-slate-800/60" />
        <div className="absolute bottom-4 right-5 h-8 w-3 rounded-full bg-slate-800/60" />
      </div>

      <div className="absolute left-8 top-[245px] h-12 w-28 rotate-[-24deg] rounded-full bg-slate-950 shadow-[inset_0_0_0_10px_rgba(255,255,255,.08)] sm:top-[300px]" />
      <div className="absolute right-8 top-[245px] h-12 w-28 rotate-[24deg] rounded-full bg-slate-950 shadow-[inset_0_0_0_10px_rgba(255,255,255,.08)] sm:top-[300px]" />
      <div className="absolute left-[-22px] top-[255px] h-3 w-36 rotate-[-24deg] rounded-full bg-white/70 sm:top-[310px]" />
      <div className="absolute right-[-22px] top-[255px] h-3 w-36 rotate-[24deg] rounded-full bg-white/70 sm:top-[310px]" />
      <div className="absolute left-10 top-[278px] h-10 w-10 rounded-full bg-cyan-300 shadow-[0_0_30px_rgba(103,232,249,.7)] sm:top-[333px]" />
      <div className="absolute right-10 top-[278px] h-10 w-10 rounded-full bg-cyan-300 shadow-[0_0_30px_rgba(103,232,249,.7)] sm:top-[333px]" />
    </div>
  );
}

export function SiteErrorScene({
  code = "404",
  eyebrow = "Saad Studio system notice",
  title = "This scene is missing",
  message = "The page you are looking for does not exist, moved, or failed to load.",
  actionLabel = "Back to homepage",
  actionHref = "/",
  onRetry,
  className,
}: SiteErrorSceneProps) {
  return (
    <main className={cn("relative min-h-screen overflow-hidden bg-black px-4 py-8 text-white", className)}>
      <style jsx global>{`
        @keyframes saad-float {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -14px); }
        }
        @keyframes saad-orbit {
          0% { transform: translate3d(0,0,0) scale(1); opacity: .55; }
          50% { transform: translate3d(24px,-20px,0) scale(1.08); opacity: .9; }
          100% { transform: translate3d(0,0,0) scale(1); opacity: .55; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_35%,rgba(255,255,255,.18),transparent_10%),radial-gradient(circle_at_92%_66%,rgba(255,255,255,.16),transparent_11%),radial-gradient(circle_at_70%_8%,rgba(34,211,238,.2),transparent_22%)]" />
      <div className="pointer-events-none absolute -left-16 top-24 h-40 w-40 animate-[saad-orbit_7s_ease-in-out_infinite] rounded-full border border-white/40 bg-white/5 shadow-[inset_0_0_35px_rgba(255,255,255,.5),0_0_45px_rgba(255,255,255,.18)]" />
      <div className="pointer-events-none absolute -right-10 bottom-20 h-52 w-52 animate-[saad-orbit_8s_ease-in-out_infinite_reverse] rounded-full border border-white/30 bg-white/5 shadow-[inset_0_0_40px_rgba(255,255,255,.45),0_0_55px_rgba(255,255,255,.15)]" />

      <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/20 bg-[#0c0c12]/95 shadow-[0_0_0_1px_rgba(255,255,255,.18),0_40px_120px_rgba(0,0,0,.7)]">
          <div className="flex h-12 items-center border-b border-white/10 bg-white/[0.03]">
            <div className="flex h-full items-center gap-2 border-r border-white/10 px-4">
              <span className="flex h-5 w-5 items-center justify-center rounded-md border border-cyan-300/40 bg-cyan-300/10">
                <Sparkles className="h-3 w-3 text-cyan-200" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">Saad Studio</span>
            </div>
            <div className="hidden h-full items-center border-r border-white/10 px-5 text-[10px] font-black uppercase tracking-[0.16em] text-white/50 sm:flex">
              Error protocol
            </div>
            <div className="ml-auto flex h-full items-center gap-3 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
              <span className="rounded border border-white/10 px-3 py-1">Credits safe</span>
              <span className="hidden sm:inline">0xSAAD...404</span>
            </div>
          </div>

          <div className="grid min-h-[620px] items-center gap-8 p-7 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:p-14">
            <div className="relative z-10">
              <div className="mb-6 h-px w-56 bg-gradient-to-r from-amber-300 via-cyan-300 to-violet-400" />
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/70">{eyebrow}</p>
              <h1 className="mt-5 text-7xl font-light leading-none tracking-tight text-white sm:text-8xl">
                {code}
              </h1>
              <p className="mt-2 text-xl font-black tracking-tight text-white/90 sm:text-2xl">{title}</p>
              <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">{message}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={actionHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-950 hover:bg-cyan-100"
                >
                  <Home className="h-4 w-4" />
                  {actionLabel}
                </Link>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white hover:bg-white/10"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try again
                  </button>
                )}
                <button
                  onClick={() => window.history.back()}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go back
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-3xl" />
              <RobotMascot />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
