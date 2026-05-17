import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Saad Studio",
  description: "Contact Saad Studio for support, partnerships, and company verification.",
};

export default function ContactPage() {
  return (
    <div className="text-slate-100">
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Contact</p>
        <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-white md:text-6xl">
          Get in touch with Saad Studio.
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
          For product support, partnerships, startup program verification, or business questions, contact the Saad Studio team using the details below. This page provides a public contact point for reviewers who need to verify the company website and product information.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          <a href="mailto:support@saadstudio.app" className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 transition hover:border-cyan-400/40 hover:bg-white/[0.06]">
            <Mail className="h-6 w-6 text-cyan-300" />
            <h2 className="mt-4 text-lg font-bold text-white">Email</h2>
            <p className="mt-2 text-sm text-slate-400">support@saadstudio.app</p>
          </a>
          <a href="tel:+9647755815500" className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 transition hover:border-cyan-400/40 hover:bg-white/[0.06]">
            <Phone className="h-6 w-6 text-cyan-300" />
            <h2 className="mt-4 text-lg font-bold text-white">Phone</h2>
            <p className="mt-2 text-sm text-slate-400">009647755815500</p>
          </a>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <MessageCircle className="h-6 w-6 text-lime-300" />
            <h2 className="mt-4 text-lg font-bold text-white">Support</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Customer and account support for Saad Studio users.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <ShieldCheck className="h-6 w-6 text-violet-300" />
            <h2 className="mt-4 text-lg font-bold text-white">Verification</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Company and product information for partner and cloud program review.</p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-cyan-400/20 bg-white/[0.04] p-6">
          <h2 className="text-xl font-bold text-white">Company information</h2>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Company</dt>
              <dd className="mt-1 font-semibold text-white">Saad Studio</dd>
            </div>
            <div>
              <dt className="text-slate-500">Product</dt>
              <dd className="mt-1 font-semibold text-white">AI creative production SaaS</dd>
            </div>
            <div>
              <dt className="text-slate-500">Audience</dt>
              <dd className="mt-1 font-semibold text-white">Creators, agencies, businesses, and media teams</dd>
            </div>
            <div>
              <dt className="text-slate-500">Primary contact</dt>
              <dd className="mt-1 font-semibold text-white">support@saadstudio.app</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="mt-1 font-semibold text-white">009647755815500</dd>
            </div>
            <div>
              <dt className="text-slate-500">Website verification</dt>
              <dd className="mt-1 font-semibold text-white">Public About, Pricing, Privacy, and Terms pages are available from the footer.</dd>
            </div>
          </dl>
          <Link href="/about" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-100">
            Read about the product <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
