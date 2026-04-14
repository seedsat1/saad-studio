"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { Montserrat } from "next/font/google";
import {
  Twitter,
  Instagram,
  Youtube,
  Github,
  Linkedin,
  MessageCircle,
  ChevronRight,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

const montserrat = Montserrat({ weight: "600", subsets: ["latin"] });

// â”€â”€â”€ Footer Link Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FOOTER_LINKS = {
  aiTools: {
    title: "AI Tools",
    links: [
      { label: "Image Generation", href: "/image" },
      { label: "Video Generation", href: "/video" },
      { label: "Audio & Music", href: "/music" },
      { label: "AI Editing Suite", href: "/edit" },
      { label: "Character Studio", href: "/character" },
      { label: "Cinema Studio", href: "/cinema-studio" },
      { label: "AI Assist (Chat)", href: "/conversation" },
      { label: "Apps Gallery", href: "/apps" },
    ],
  },
  resources: {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "API Reference", href: "/api-docs" },
      { label: "Tutorials", href: "/tutorials" },
      { label: "Blog", href: "/blog" },
      { label: "Changelog", href: "/changelog" },
      { label: "Status", href: "/status" },
      { label: "Community", href: "/community" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Press Kit", href: "/press" },
      { label: "Contact", href: "/contact" },
      { label: "Pricing", href: "/pricing", highlight: true },
      { label: "Privacy Policy", href: "/privacy", highlight: true },
      { label: "Terms & Conditions", href: "/terms", highlight: true },
    ],
  },
};

const SOCIAL_LINKS = [
  { icon: Twitter, href: "#", label: "Twitter / X", color: "hover:text-sky-400 hover:bg-sky-400/10" },
  { icon: Instagram, href: "#", label: "Instagram", color: "hover:text-rose-400 hover:bg-rose-400/10" },
  { icon: Youtube, href: "#", label: "YouTube", color: "hover:text-red-400 hover:bg-red-400/10" },
  { icon: Github, href: "#", label: "GitHub", color: "hover:text-zinc-300 hover:bg-zinc-400/10" },
  { icon: Linkedin, href: "#", label: "LinkedIn", color: "hover:text-blue-400 hover:bg-blue-400/10" },
  { icon: MessageCircle, href: "#", label: "Discord", color: "hover:text-indigo-400 hover:bg-indigo-400/10" },
];

// â”€â”€â”€ Animation Variants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

// â”€â”€â”€ Column Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FooterColumn = ({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; highlight?: boolean }[];
}) => (
  <motion.div variants={itemVariants} className="space-y-3">
    <div>
      <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300">
        {title}
      </h3>
    </div>
    <ul className="space-y-1.5">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className={cn(
              "group flex items-center gap-1.5 text-sm transition-colors",
              link.highlight
                ? "text-violet-400 hover:text-violet-300"
                : "text-zinc-500 hover:text-zinc-200"
            )}
          >
            <ChevronRight
              className={cn(
                "h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5",
                link.highlight ? "text-violet-500" : "text-zinc-700"
              )}
            />
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </motion.div>
);

// â”€â”€â”€ Footer Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-white/10">
      {/* Glassmorphism background layers */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/60 to-slate-950/90" />

      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute -top-32 left-1/4 h-64 w-64 rounded-full bg-violet-600/8 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 right-1/4 h-48 w-48 rounded-full bg-indigo-600/8 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {/* â”€â”€ Main Row: Brand | AI Tools | Resources | Company | Security | Newsletter â”€â”€ */}
          <div className="grid grid-cols-1 gap-6 mb-6 items-start md:grid-cols-2 xl:grid-cols-3">

            {/* 1. Brand */}
            <motion.div variants={itemVariants} className="space-y-3">
              <Link
                href="https://saadstudio.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2"
              >
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                  <Image
                    src="/logo-saad-transparent.png"
                    alt="Saad Studio"
                    fill
                    className="object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                <span className={cn("text-base font-bold tracking-tight", montserrat.className)}>
                  <span className="bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">Saad</span>
                  <span className="bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent"> Studio</span>
                </span>
              </Link>
              <p className="text-xs leading-relaxed text-zinc-500">
                The world&apos;s most powerful AI creative studio.
              </p>
              <a
                href="mailto:support@saadstudio.app"
                className="group inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-violet-300 transition-colors"
              >
                <Mail className="h-3 w-3 shrink-0 text-violet-500" />
                support@saadstudio.app
              </a>
            </motion.div>

            {/* 2. AI Tools */}
            <FooterColumn {...FOOTER_LINKS.aiTools} />

            {/* 3. Newsletter */}
            <motion.div variants={itemVariants} className="space-y-2">
              <p className="text-sm font-semibold text-zinc-300">Stay in the loop âœ¨</p>
              <p className="text-xs text-zinc-600">New models & drops. No spam.</p>
              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none ring-1 ring-white/10 focus:ring-violet-500/50 transition-all"
                />
                <button className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-sm font-semibold text-white hover:from-violet-500 hover:to-indigo-500 transition-colors">
                  Subscribe
                </button>
              </div>
            </motion.div>

          </div>

          {/* Divider */}
          <div className="mb-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* â”€â”€ Bottom bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between"
          >
            {/* Copyright */}
            <div className="text-center sm:text-left space-y-1">
              <p className="text-xs text-zinc-500">
                Â© {year} Saad Studio. All rights reserved.
              </p>
              <a
                href="https://saadstudio.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-zinc-700 hover:text-violet-400 transition-colors"
              >
                saadstudio.app
              </a>
            </div>

            {/* Legal quick links */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms & Conditions", href: "/terms" },
                { label: "Cookie Policy", href: "/cookies" },
                { label: "Pricing", href: "/pricing" },
              ].map((l, i) => (
                <span key={l.href} className="flex items-center gap-4">
                  {i > 0 && <span className="h-3 w-px bg-white/15" />}
                  <Link
                    href={l.href}
                    className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    {l.label}
                  </Link>
                </span>
              ))}
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-1.5">
              {SOCIAL_LINKS.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 ring-1 ring-white/10 transition-all duration-200",
                    s.color
                  )}
                >
                  <s.icon className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
