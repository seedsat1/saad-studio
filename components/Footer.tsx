"use client";

import Link from "next/link";
import Image from "next/image";
import { Instagram, Youtube, Github, Linkedin, MessageCircle, Mail } from "lucide-react";

const SOCIALS = [
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: MessageCircle, href: "#", label: "Community" },
];

const STUDIO_LINKS = [
  { label: "Our Work", href: "/apps" },
  { label: "Services", href: "/pricing" },
  { label: "Contact Us", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Site Policy", href: "/terms" },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-white/10 bg-slate-950" dir="ltr">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_320px_at_20%_0%,rgba(56,189,248,0.10),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/70 to-slate-950" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="relative h-9 w-9 shrink-0">
                <Image src="/logo-saad-transparent.png" alt="Saad Studio" fill className="object-contain" />
              </div>
              <span className="text-lg font-bold text-cyan-300">Saad Studio</span>
            </Link>

            <p className="max-w-sm text-sm leading-7 text-slate-400">We craft visual experiences that go beyond limits.</p>

            <a href="mailto:support@saadstudio.app" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300 transition-colors">
              <Mail className="h-4 w-4" />
              support@saadstudio.app
            </a>

            <div className="flex items-center gap-2 pt-1">
              {SOCIALS.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:border-cyan-400/40 hover:text-cyan-300"
                >
                  <s.icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
            <h4 className="text-sm font-bold text-white">Studio</h4>
            <ul className="mt-4 space-y-2.5">
              {STUDIO_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <h4 className="text-sm font-bold text-white">Stay in the loop ✨</h4>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="your@email.com"
                className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
              />
              <button className="h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 text-sm font-bold text-white transition-colors hover:from-violet-500 hover:to-indigo-500">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <div className="mt-5 text-sm text-slate-500">
          <p>© {year} Saad Studio. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
