"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Instagram, Facebook, Youtube, Github, Linkedin, MessageCircle, Mail, Phone } from "lucide-react";
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

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

const SOCIALS: Array<{ icon: any; href: string; label: string }> = [
  { icon: Instagram, href: "https://www.instagram.com/saadstudio.ai", label: "Instagram" },
  { icon: Facebook, href: "https://www.facebook.com/Saadstudio", label: "Facebook" },
  { icon: XIcon, href: "https://x.com/saadstudioapp", label: "X" },
  { icon: DiscordIcon, href: "https://discord.gg/9HXRqNFtS", label: "Discord" },
];

const ALLOWED_FOOTER_LINKS = new Set([
  "/about",
  "/contact",
  "/image",
  "/video",
  "/character",
  "/cinema-studio",
  "/apps",
  "/pricing",
  "/privacy",
  "/cookies",
  "/terms",
]);

const DEFAULT_SECTIONS: FooterSection[] = [
  {
    _id: "create",
    title: "AI Tools",
    links: [
      { label: "Image Generation", href: "/image" },
      { label: "Video Generation", href: "/video" },
      { label: "Character Studio", href: "/character" },
      { label: "Next Scene", href: "/cinema-studio" },
      { label: "Apps Gallery", href: "/apps" },
    ],
  },
  {
    _id: "company",
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Pricing", href: "/pricing" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
    ],
  },
];

function FooterAnchor({
  href,
  children,
  className,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const isExternal = /^https?:\/\//i.test(href);
  const isHash = href === "#" || href.startsWith("#");

  if (isExternal || isHash) {
    return (
      <a href={href} aria-label={ariaLabel} className={className} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} prefetch={false} aria-label={ariaLabel} className={className}>
      {children}
    </Link>
  );
}

const Footer = () => {
  const year = new Date().getFullYear();
  const { data: cms } = useCmsData<DiscoverCms>("discover");
  const footer = cms?.footer;
  const brandName = footer?.brandName || "Saad Studio";
  const tagline = footer?.tagline || "The world's most powerful AI creative studio.";
  const email = footer?.email || "support@saadstudio.app";
  const phone = "009647755815500";
  const logoUrl = footer?.logoUrl || "/logo-saad-transparent.png?v=2";
  const sections = (footer?.sections?.length ? footer.sections : DEFAULT_SECTIONS)
    .map((section) => ({
      ...section,
      links: section.links.filter((item) => {
        const href = item.href?.trim();
        return Boolean(item.label?.trim()) && Boolean(href) && ALLOWED_FOOTER_LINKS.has(href);
      }),
    }))
    .filter((section) => section.links.length > 0);
  const hasCookiePolicyLink = sections.some((section) =>
    section.links.some((link) => link.href === "/cookies")
  );
  if (!hasCookiePolicyLink) {
    const companySection = sections.find((section) => section.title.toLowerCase() === "company");
    if (companySection) {
      companySection.links.push({ label: "Cookie Policy", href: "/cookies" });
    } else {
      sections.push({
        _id: "legal",
        title: "Legal",
        links: [{ label: "Cookie Policy", href: "/cookies" }],
      });
    }
  }
  const cmsSocials = footer?.socialLinks?.length
    ? footer.socialLinks
      .filter((social) => social.href && social.href !== "#" && social.href.trim() !== "")
      .map((social) => {
        const iconMap = {
          Instagram,
          Facebook,
          YouTube: Youtube,
          Youtube,
          GitHub: Github,
          Github,
          LinkedIn: Linkedin,
          Linkedin,
          Discord: DiscordIcon,
          Community: DiscordIcon,
          Twitter: XIcon,
          X: XIcon,
        } as const;
        const Icon = iconMap[social.platform as keyof typeof iconMap] || MessageCircle;
        return { icon: Icon, href: social.href, label: social.platform };
      })
    : [];
  const socials = cmsSocials.length ? cmsSocials : SOCIALS;
  const newsletterHeading = footer?.newsletterHeading || "Stay in the loop ✨";
  const newsletterSubtitle = footer?.newsletterSubtitle || "New models & drops. No spam.";

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

            <a href="tel:+9647755815500" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300 transition-colors">
              <Phone className="h-4 w-4" />
              {phone}
            </a>

            <div className="flex items-center gap-2 pt-1">
              {socials.map((s) => (
                <FooterAnchor
                  key={s.label}
                  href={s.href}
                  ariaLabel={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:border-cyan-400/40 hover:text-cyan-300"
                >
                  <s.icon className="h-4 w-4" />
                </FooterAnchor>
              ))}
            </div>
          </div>

          {(sections.length ? sections : DEFAULT_SECTIONS).map((section) => (
            <div key={section._id || section.title} className="lg:col-span-2">
              <h4 className="text-sm font-bold text-white">{section.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {section.links.map((item) => (
                  <li key={item._id || item.href}>
                    <FooterAnchor href={item.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                      {item.label}
                    </FooterAnchor>
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
              <button className="h-11 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white transition-all hover:bg-indigo-500 shadow-md shadow-indigo-600/10">
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
