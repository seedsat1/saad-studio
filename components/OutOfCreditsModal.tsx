"use client";

/**
 * OutOfCreditsModal
 * ─────────────────────────────────────────────────────────────────────────────
 * A high-converting "Out of Credits" modal that renders inside the Studio
 * workspace when a user hits a 402 / insufficient-credits API response.
 *
 * HOW TO TRIGGER (in any client page / component):
 * ─────────────────────────────────────────────────
 *  import { useCreditModal } from "@/hooks/use-credit-modal";
 *
 *  const openCreditModal = useCreditModal((s) => s.onOpen);
 *
 *  // Inside your API call catch block:
 *  try {
 *    const res = await axios.post("/api/generate/image", payload);
 *  } catch (err: any) {
 *    if (err?.response?.status === 402) {
 *      const { requiredCredits, currentBalance } = err.response.data ?? {};
 *      openCreditModal({ requiredCredits, currentBalance });
 *    }
 *  }
 *
 *  // Legacy route check (if the route returns a plain message):
 *  if (data.message === "no credit balance") openCreditModal();
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { BatteryLow, Sparkles, Zap, Crown } from "lucide-react";
import { useCreditModal } from "@/hooks/use-credit-modal";
import { useCmsData } from "@/lib/use-cms-data";
import { INSUFFICIENT_CREDITS_MESSAGE } from "@/lib/generation-errors";

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

// ─── Animation variants ───────────────────────────────────────────────────────
const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 24 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 22, delay: 0.05 },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 24,
    transition: { duration: 0.18 },
  },
};

const tierVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.08, duration: 0.35 },
  }),
};

// ─── Component ────────────────────────────────────────────────────────────────
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
        // ── Backdrop ────────────────────────────────────────────────────────
        <motion.div
          key="ooc-backdrop"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex justify-center items-center p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          // Close when clicking outside the card
          onClick={onClose}
        >
          {/* ── Modal Card ──────────────────────────────────────────────── */}
          <motion.div
            key="ooc-card"
            className="
              max-w-5xl w-full bg-slate-900
              overflow-hidden
              shadow-[0_0_50px_rgba(59,130,246,0.15)]
              border border-slate-800
              rounded-3xl p-8
            "
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            // Stop backdrop-click propagating through the card
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Top Section ─────────────────────────────────────────── */}
            <div className="flex flex-col items-center text-center gap-y-3">
              {/* Animated warning icon */}
              <motion.div
                className="relative flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30"
                animate={{
                  boxShadow: [
                    "0 0 0px rgba(245,158,11,0)",
                    "0 0 18px rgba(245,158,11,0.35)",
                    "0 0 0px rgba(245,158,11,0)",
                  ],
                }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
              >
                <BatteryLow className="w-8 h-8 text-amber-400" />
              </motion.div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Insufficient credits
              </h2>

              <p className="text-slate-400 text-sm sm:text-base max-w-md leading-relaxed">
                {INSUFFICIENT_CREDITS_MESSAGE}
              </p>

              {/* Optional credit context badge */}
              {(requiredCredits !== null || currentBalance !== null) && (
                <div className="flex gap-3 mt-1 flex-wrap justify-center">
                  {currentBalance !== null && (
                    <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-400">
                      Balance:{" "}
                      <span className="text-white font-semibold">
                        {currentBalance} cr
                      </span>
                    </span>
                  )}
                  {requiredCredits !== null && (
                    <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-400">
                      Needed:{" "}
                      <span className="text-amber-400 font-semibold">
                        {requiredCredits} cr
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ── Pricing Grid ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-8">
              {liveTopups.map((tier, i) => {
                const Icon = iconSet[i % iconSet.length];
                return (
                  <motion.div
                    key={tier._id ?? `${tier.credits}-${tier.price}`}
                    custom={i}
                    variants={tierVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring" as const, stiffness: 350, damping: 20 }}
                    className={`
                      relative flex flex-col gap-y-3 p-5 rounded-2xl
                      bg-gradient-to-br ${tier.popular ? "from-amber-600/20 to-orange-700/20" : "from-slate-700 to-slate-800"}
                      border ${tier.popular ? "border-amber-500" : "border-slate-700"}
                      ${tier.popular ? "shadow-[0_0_24px_rgba(245,158,11,0.25)]" : ""}
                    `}
                  >
                    {/* Badge */}
                    {tier.popular && (
                      <span
                        className={`
                          absolute -top-3 left-1/2 -translate-x-1/2
                          px-3 py-0.5 rounded-full text-[11px] font-semibold
                          whitespace-nowrap
                          bg-amber-500 text-white
                        `}
                      >
                        Best Value
                      </span>
                    )}

                    {/* Icon + label */}
                    <div className="flex items-center gap-2 mt-1">
                      <Icon
                        className={`w-5 h-5 ${
                          tier.popular ? "text-amber-300" : "text-slate-300"
                        }`}
                      />
                      <span className="text-white font-semibold text-sm">Extra Credits</span>
                    </div>

                    {/* Credits */}
                    <p className="text-3xl font-bold text-white">
                      {tier.credits}
                    </p>

                    {/* Price + per-credit */}
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold text-white">
                        {tier.price}
                      </span>
                      <span className="text-xs text-slate-400 mb-0.5">
                        / {tier.pricePerCredit} per credit
                      </span>
                    </div>

                    {/* CTA button */}
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleBuyNow(tier.credits)}
                      className={`
                        mt-auto w-full py-2 rounded-xl text-sm font-semibold
                        transition-colors duration-150
                        ${tier.popular ? "bg-amber-500 hover:bg-amber-400 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}
                      `}
                    >
                      Buy Credits
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>

            {/* ── Footer ───────────────────────────────────────────────── */}
            <div className="mt-6 flex flex-col items-center gap-2">
              <p className="text-xs text-slate-500">
                Credits never expire &bull; One-time purchase &bull; All AI
                models included
              </p>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-300 transition-colors text-sm underline underline-offset-2"
              >
                Maybe Later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
