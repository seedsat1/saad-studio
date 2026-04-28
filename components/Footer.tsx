"use client";

import Link from "next/link";
import Image from "next/image";
import { Instagram, Youtube, Github, Linkedin, MessageCircle, Mail } from "lucide-react";
import { useCmsData } from "@/lib/use-cms-data";

interface FooterLink {
  _id?: string;
  label: string;
  href: string;
}

interface FooterSection {
  _id?: string;
  title: string;
  links: FooterLink[];
}

interface FooterData {
  brandName?: string;
  tagline?: string;
  email?: string;
  logoUrl?: string;
  sections?: FooterSection[];
  socialLinks?: { _id?: string; platform: string; href: string }[];
  newsletterHeading?: string;
  newsletterSubtitle?: string;
}

interface DiscoverCms {
  footer?: FooterData;
  [k: string]: unknown;
}

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
  const { data: cms } = useCmsData<DiscoverCms>("discover");
  const footer = cms?.footer;
  const brandName = footer?.brandName || "Saad Studio";
  const tagline = footer?.tagline || "We craft visual experiences that go beyond limits.";
  const email = footer?.email || "support@saadstudio.app";
  const logoUrl = footer?.logoUrl || "/logo-saad-transparent.png";
  const sections = footer?.sections?.length
    ? footer.sections
    : [{ _id: "studio", title: "Studio", links: STUDIO_LINKS }];
  const socials = footer?.socialLinks?.length
    ? footer.socialLinks.map((social) => {
        const iconMap = {
          Instagram,
          YouTube: Youtube,
          Youtube,
          GitHub: Github,
          Github,
          LinkedIn: Linkedin,
          Linkedin,
          Discord: MessageCircle,
          Community: MessageCircle,
          Twitter: MessageCircle,
        } as const;
        const Icon = iconMap[social.platform as keyof typeof iconMap] || MessageCircle;
        return { icon: Icon, href: social.href, label: social.platform };
      })
    : SOCIALS;
  const newsletterHeading = footer?.newsletterHeading || "Stay in the loop";
  const newsletterSubtitle = footer?.newsletterSubtitle || "";

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-white/10 bg-slate-950" dir="ltr">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_320px_at_20%_0%,rgba(56,189,248,0.10),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/70 to-slate-950" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-12">
          <div className="lg:col-span-3 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="relative h-9 w-9 shrink-0">
                <Image src={logoUrl} alt={brandName} fill className="object-contain" unoptimized />
              </div>
              <span className="text-lg font-bold text-cyan-300">{brandName}</span>
            </Link>

            <p className="max-w-sm text-sm leading-7 text-slate-400">{tagline}</p>

            <a href={`mailto:${email}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300 transition-colors">
              <Mail className="h-4 w-4" />
              {email}
            </a>

            <div className="flex items-center gap-2 pt-1">
              {socials.map((s) => (
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

          {sections.slice(0, 3).map((section) => (
            <div key={section._id || section.title} className="lg:col-span-2">
              <h4 className="text-sm font-bold text-white">{section.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {section.links.map((item) => (
                  <li key={item._id || item.href}>
                    <Link href={item.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="lg:col-span-3">
            <h4 className="text-sm font-bold text-white">{newsletterHeading}</h4>
            {newsletterSubtitle && <p className="mt-2 text-sm text-slate-500">{newsletterSubtitle}</p>}
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
