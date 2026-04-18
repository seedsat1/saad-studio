"use client";

import { motion } from "framer-motion";
import WelcomeHero from "@/components/WelcomeHero";
import CoreToolsSection from "@/components/CoreToolsSection";
import TopChoiceGrid from "@/components/TopChoiceGrid";
import PhotodumpCTA from "@/components/PhotodumpCTA";
import CommunityGallery from "@/components/CommunityGallery";
import AppsCarousel from "@/components/AppsCarousel";
import ModelsShowcase from "@/components/ModelsShowcase";
import Footer from "@/components/Footer";

const Divider = () => (
  <div className="mx-auto max-w-[1600px] px-6 md:px-12">
    <div className="h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
  </div>
);

export default function ExplorePage() {
  return (
    <div className="min-h-screen explore-bg">
      {/* Noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10">
        {/* Section 1 — Personalized Welcome */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <WelcomeHero />
        </motion.div>

        {/* Section 2 — Core Tools */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <CoreToolsSection />
        </motion.div>

        <Divider />

        {/* Section 3 — Top Choice */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <TopChoiceGrid />
        </motion.div>

        <Divider />

        {/* Section 4 — Photodump CTA */}
        <PhotodumpCTA />

        <Divider />

        {/* Section 5 — Community Gallery */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <CommunityGallery />
        </motion.div>

        <Divider />

        {/* Section 6 — Apps Mega Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <AppsCarousel />
        </motion.div>

        <Divider />

        {/* Section 7 — AI Models Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <ModelsShowcase />
        </motion.div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}