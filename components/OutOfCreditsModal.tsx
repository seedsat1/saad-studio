"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { ArrowRight, BatteryLow, Crown, Sparkles, X, Zap } from "lucide-react";
import { useCreditModal } from "@/hooks/use-credit-modal";
import { useCmsData } from "@/lib/use-cms-data";
import { INSUFFICIENT_CREDITS_MESSAGE } from "@/lib/generation-errors";
import { SaadRobotMascot } from "@/components/site-error-scene";

interface CmsTopup {
  _id?: string;
  credits: string;
  price: string;
  pricePerCredit: string;
  popular: boolean;
}

interface PricingCmsData {
  topups?: CmsTopup[];
}

const DEFAULT_TOPUPS: CmsTopup[] = [
  { credits: "+75 Credits", price: "$5", pricePerCredit: "$0.067", popular: false },
  { credits: "+160 Credits", price: "$10", pricePerCredit: "$0.063", popular: false },
  { credits: "+250 Credits", price: "$15", pricePerCredit: "$0.060", popular: true },
  { credits: "+330 Credits", price: "$20", pricePerCredit: "$0.061", popular: false },
  { credits: "+500 Credits", price: "$30", pricePerCredit: "$0.060", popular: false },
];

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 18 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 24, delay: 0.04 },
  },
  exit: { opacity: 0, scale: 0.94, y: 18, transition: { duration: 0.16 } },
};

const tierVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 + i * 0.05, duration: 0.3 },
  }),
};

export default function OutOfCreditsModal() {
  const { isOpen, onClose, requiredCredits, currentBalance } = useCreditModal();
  const router = useRouter();
  const { data: cms } = useCmsData<PricingCmsData>("pricing");
  const liveTopups = cms?.topups?.length ? cms.topups : DEFAULT_TOPUPS;
  const iconSet = [Zap, Sparkles, Crown];

  const handleBuyNow = (creditsLabel: string) => {
    onClose();
    const credits = creditsLabel.replace(/\D/g, "");
    router.push(`/payment?type=topup&credits=${encodeURIComponent(credits)}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="credits-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/82 p-4 backdrop-blur-md"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            key="credits-card"
            className="relative w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/15 bg-[#0c0c12] shadow-[0_0_0_1px_rgba(255,255,255,.08),0_40px_120px_rgba(0,0,0,.8)]"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,.2),transparent_26%),radial-gradient(circle_at_84%_72%,rgba(168,85,247,.18),transparent_28%)]" />
            <div className="relative flex h-12 items-center border-b border-white/10 bg-white/[0.03]">
              <div className="flex h-full items-center gap-2 border-r border-white/10 px-4">
                <span className="flex h-5 w-5 items-center justify-center rounded-md border border-amber-300/40 bg-amber-300/10">
                  <BatteryLow className="h-3 w-3 text-amber-200" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">Credit system</span>
              </div>
              <div className="ml-auto px-3">
                <button onClick={onClose} className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
              <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-black/25 p-5">
                <div>
                  <div className="mb-5 h-px w-44 bg-gradient-to-r from-amber-300 via-cyan-300 to-violet-400" />
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-100/80">Generation paused</p>
                  <h2 className="mt-4 text-4xl font-light leading-tight text-white sm:text-5xl">
                    Credits are empty
                  </h2>
                  <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
                    {INSUFFICIENT_CREDITS_MESSAGE}
                  </p>

                  {(requiredCredits !== null || currentBalance !== null) && (
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Balance</p>
                        <p className="mt-2 text-2xl font-black text-white">{currentBalance ?? 0}</p>
                        <p className="text-xs text-slate-500">credits</p>
                      </div>
                      <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/70">Needed</p>
                        <p className="mt-2 text-2xl font-black text-amber-100">{requiredCredits ?? "-"}</p>
                        <p className="text-xs text-amber-100/60">credits</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-7">
                  <SaadRobotMascot />
                </div>
              </div>

              <div>
                <div className="mb-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/70">Top up instantly</p>
                  <h3 className="mt-2 text-2xl font-black text-white">Choose extra credits</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Pick a pack and continue generating images, videos, scenes, and audio.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {liveTopups.map((tier, i) => {
                    const Icon = iconSet[i % iconSet.length];
                    return (
                      <motion.div
                        key={tier._id ?? `${tier.credits}-${tier.price}`}
                        custom={i}
                        variants={tierVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ y: -3 }}
                        className={`
                          relative overflow-hidden rounded-2xl border p-4
                          ${tier.popular ? "border-amber-300/50 bg-amber-300/10 shadow-[0_0_30px_rgba(245,158,11,.18)]" : "border-white/10 bg-white/[0.04]"}
                        `}
                      >
                        {tier.popular && (
                          <span className="absolute right-3 top-3 rounded-full bg-amber-300 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950">
                            Best value
                          </span>
                        )}
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/30">
                          <Icon className={tier.popular ? "h-5 w-5 text-amber-200" : "h-5 w-5 text-cyan-100"} />
                        </div>
                        <p className="mt-4 text-2xl font-black text-white">{tier.credits}</p>
                        <p className="mt-1 text-sm font-bold text-slate-300">{tier.price}</p>
                        <p className="mt-1 text-xs text-slate-500">{tier.pricePerCredit} per credit</p>
                        <button
                          onClick={() => handleBuyNow(tier.credits)}
                          className={`
                            mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition
                            ${tier.popular ? "bg-amber-300 text-slate-950 hover:bg-white" : "bg-white text-slate-950 hover:bg-cyan-100"}
                          `}
                        >
                          Buy credits
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <p className="text-xs text-slate-400">Credits never expire. One balance for all AI models.</p>
                  <button onClick={onClose} className="text-sm font-semibold text-slate-500 underline underline-offset-4 hover:text-white">
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
