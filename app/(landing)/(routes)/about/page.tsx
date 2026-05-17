import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clapperboard, ImageIcon, Layers, ShieldCheck, Sparkles, VideoIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "About Saad Studio | AI Creative Production Platform",
  description: "Learn about Saad Studio, a cloud-based AI creative production platform for image, video, audio, and cinematic workflows.",
};

const capabilities = [
  { title: "AI Image Studio", text: "Generate, edit, relight, upscale, and build consistent visual assets.", icon: ImageIcon },
  { title: "AI Video Studio", text: "Create text-to-video, image-to-video, transitions, and production-ready motion assets.", icon: VideoIcon },
  { title: "Scene Production", text: "Plan cinematic scenes, characters, storyboards, and visual campaigns in one workspace.", icon: Clapperboard },
  { title: "Project Workflow", text: "Organize generated media, manage credits, and move assets between creative tools.", icon: Layers },
];

const reviewDetails = [
  ["Company", "Saad Studio"],
  ["Product", "AI creative production SaaS"],
  ["Primary users", "Creators, agencies, businesses, and media teams"],
  ["Use cases", "Image generation, video generation, media editing, audio tools, character workflows, cinematic scene production"],
  ["Contact", "support@saadstudio.app"],
  ["Public policies", "Privacy Policy and Terms & Conditions are linked in the footer"],
];

export default function AboutPage() {
  return (
    <div className="text-slate-100">
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">About Saad Studio</p>
        <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl">
              A cloud-based AI creative production platform.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
              Saad Studio helps creators, agencies, small businesses, and media teams generate and edit visual content from one browser-based workspace. The platform brings together AI image generation, video generation, character workflows, audio tools, scene production, and project management so teams can move from idea to publishable media faster.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 ring-1 ring-cyan-400/25">
                <ShieldCheck className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Company Verification</h2>
                <p className="text-sm text-slate-400">Public company and product information for partners, customers, and program reviewers.</p>
              </div>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
                <dt className="text-slate-500">Company</dt>
                <dd className="text-right font-semibold text-white">Saad Studio</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
                <dt className="text-slate-500">Product Type</dt>
                <dd className="text-right font-semibold text-white">AI creative SaaS</dd>
              </div>
              {reviewDetails.slice(2, 6).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-t border-white/10 pt-3">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="max-w-[60%] text-right font-semibold text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                <item.icon className="h-5 w-5 text-cyan-300" />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
            </div>
          ))}
        </div>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-cyan-300">
                <Sparkles className="h-4 w-4" />
                Product summary
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                The platform is designed for practical creative production: users can create assets, refine outputs, test models, manage credits, and reuse media across image, video, audio, and cinematic workflows.
              </p>
            </div>
            <Link href="/contact" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-100">
              Contact us <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-6">
          <h2 className="text-xl font-bold text-white">Public review information</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            This page is intended to make the company website easy to verify for customers, partners, and startup program reviewers.
          </p>
          <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
            {reviewDetails.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                <dt className="text-slate-500">{label}</dt>
                <dd className="mt-1 font-semibold leading-6 text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </section>
    </div>
  );
}
