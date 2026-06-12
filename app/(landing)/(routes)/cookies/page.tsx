import Link from "next/link";
import { Cookie } from "lucide-react";

export default function CookiePolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20 text-slate-100">
      <header className="mb-12 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10">
          <Cookie className="h-8 w-8 text-cyan-300" />
        </div>
        <h1 className="text-4xl font-bold text-white md:text-5xl">Cookie Policy</h1>
        <p className="mt-3 text-sm uppercase tracking-widest text-slate-400">
          Last updated: June 12, 2026
        </p>
      </header>

      <article className="prose prose-invert prose-slate max-w-none rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl md:p-12">
        <h2>How we use cookies</h2>
        <p>
          Saad Studio uses cookies and similar browser storage to operate the platform, protect
          accounts, remember preferences, and, only with permission, measure usage or marketing.
        </p>

        <h2>Cookie categories</h2>
        <h3>Necessary cookies</h3>
        <p>
          These support authentication, security, fraud prevention, billing, session continuity,
          language preferences, and core platform features. They cannot be disabled through the
          consent banner because the service may not work without them.
        </p>

        <h3>Analytics cookies</h3>
        <p>
          If enabled, these help us understand page performance and how features are used. Analytics
          tools must not be loaded before you grant this permission.
        </p>

        <h3>Marketing cookies</h3>
        <p>
          If enabled, these may support campaign measurement and more relevant advertising.
          Marketing tools must not be loaded before you grant this permission.
        </p>

        <h2>Your choices</h2>
        <p>
          You can accept all optional cookies, reject them, or choose categories separately. Your
          choice is stored for up to one year and can be changed at any time using the shield button
          in the lower-left corner of the site.
        </p>

        <h2>Contact</h2>
        <p>
          For privacy questions, email{" "}
          <a href="mailto:support@saadstudio.app">support@saadstudio.app</a> or read our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </article>
    </main>
  );
}

