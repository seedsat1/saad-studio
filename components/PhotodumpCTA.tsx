"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePromoMedia, promoUrl } from "@/hooks/use-promo-media";

export default function PhotodumpCTA() {
  const promo = usePromoMedia();

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(6,182,212,0.12) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 50%, rgba(139,92,246,0.10) 0%, transparent 55%),
            radial-gradient(ellipse at 50% 100%, rgba(236,72,153,0.07) 0%, transparent 50%),
            #060c18
          `,
        }}
      />

      {/* Decorative grid lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148,163,184,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,1) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative mx-auto max-w-[1600px] px-6 md:px-12">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">

          {/* Left: Text content */}
          <motion.div
            className="flex-1 max-w-lg"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.span
              className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-[#06b6d4] mb-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              photodump
            </motion.span>

            <motion.h2
              className="font-display text-[clamp(28px,4vw,52px)] font-bold leading-[1.08] text-[#e2e8f0] mb-5"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
            >
              Different Scenes{" "}
              <span className="text-gradient-cyan">Same Star</span>
            </motion.h2>

            <motion.p
              className="text-[15px] text-[#94a3b8] leading-relaxed mb-8"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.22 }}
            >
              Build your character once. Drop them into any scene, outfit, or environment — one click does the rest. Consistent identity across unlimited contexts.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Link href="/image/photodump">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative inline-flex items-center gap-2.5 rounded-full px-8 py-3.5 text-sm font-bold text-white overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)",
                    boxShadow: "0 0 30px rgba(6,182,212,0.35)",
                  }}
                >
                  <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
                    <path d="M3 7a2 2 0 012-2h.5l1-2h7l1 2H17a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <circle cx="10" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  Try Photodump
                  <motion.div
                    className="absolute inset-0 opacity-0"
                    style={{ background: "rgba(255,255,255,0.12)" }}
                    whileHover={{ opacity: 1 }}
                  />
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right: Decorative visual */}
          <motion.div
            className="flex-1 flex items-center justify-center"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="relative w-full max-w-[420px] aspect-[4/3]">
              {/* Shadow cards behind */}
              {[
                { rotate: -8, x: -20, y: 10, delay: 0.2 },
                { rotate: -3, x: -6, y: 5,  delay: 0.25 },
              ].map((card, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-2xl bg-[#0f1a35]"
                  style={{
                    transform: `rotate(${card.rotate}deg) translate(${card.x}px, ${card.y}px)`,
                    border: "1px solid rgba(148,163,184,0.08)",
                  }}
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 0.6, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: card.delay, duration: 0.5 }}
                />
              ))}

              {/* Main card with image */}
              <motion.div
                className="relative rounded-2xl overflow-hidden aspect-[4/3]"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={{ border: "1px solid rgba(148,163,184,0.10)" }}
              >
                <Image
                  src={promoUrl(promo, "explore/photodump-hero", "/explore/photodump-hero.jpg")}
                  alt="Photodump — Different Scenes Same Star"
                  fill
                  className="object-cover object-center"
                  sizes="420px"
                />
                {/* Overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(135deg, rgba(6,12,24,0.55) 0%, rgba(6,12,24,0.25) 60%, rgba(6,12,24,0.50) 100%)",
                  }}
                />
                {/* Cyan glow tint */}
                <div
                  className="absolute inset-0"
                  style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(6,182,212,0.18), transparent 60%)" }}
                />

                {/* Floating badges */}
                {[
                  { label: "Beach Scene", top: "10%", right: "5%",  color: "text-cyan-400" },
                  { label: "City Night",  bottom: "20%", left: "5%", color: "text-violet-400" },
                  { label: "Studio Shot", bottom: "8%", right: "8%", color: "text-pink-400" },
                ].map((badge) => (
                  <motion.div
                    key={badge.label}
                    className="absolute glass rounded-full px-3 py-1.5 text-[10px] font-bold whitespace-nowrap z-10"
                    style={{ top: badge.top, right: badge.right, bottom: badge.bottom, left: badge.left }}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 2 }}
                  >
                    <span className={badge.color}>{badge.label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
