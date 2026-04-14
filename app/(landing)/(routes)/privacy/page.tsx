"use client";

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="text-slate-100">
      <div className="max-w-4xl mx-auto py-20 px-6">

        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-6">
            <ShieldCheck className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-3">
            Privacy Policy
          </h1>
          <p className="text-slate-400 text-sm tracking-widest uppercase">
            Last Updated: April 2026
          </p>
        </motion.div>

        {/* ── Content Card ───────────────────────────────────────── */}
        <motion.div
          className="bg-slate-900/50 p-8 md:p-12 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
        >
          {/* PASTE YOUR PRIVACY POLICY TEXT HERE */}

          <div
            className="prose prose-invert prose-slate max-w-none
                        prose-p:leading-relaxed prose-p:text-slate-300
                        prose-headings:text-slate-100 prose-headings:font-semibold
                        prose-strong:text-slate-200
                        prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline
                        prose-li:text-slate-300 prose-li:marker:text-violet-400"
          >
            <h2>1. Overview</h2>
            <p>
              This Privacy Policy explains how SAAD STUDIO collects, uses, stores, and
              shares personal information when you use the Platform.
            </p>

            <h2>2. Information We Collect</h2>
            <ul>
              <li><strong>Account information:</strong> name, email, login/authentication data.</li>
              <li><strong>Billing information:</strong> processed by secure payment providers; full card numbers are not stored by us.</li>
              <li><strong>Content data:</strong> prompts, uploads, generated files, and related metadata.</li>
              <li><strong>Technical data:</strong> IP address, device/browser data, session and security logs, and essential cookies.</li>
            </ul>

            <h2>3. How We Use Information</h2>
            <ul>
              <li>Operate, maintain, and improve the Platform.</li>
              <li>Process payments, subscriptions, and account management.</li>
              <li>Prevent fraud, abuse, and policy violations.</li>
              <li>Comply with legal obligations and enforce our Terms.</li>
            </ul>

            <h2>4. AI Processing and Third Parties</h2>
            <p>
              Your prompts and selected data may be sent to third-party AI providers only as needed
              to fulfill your requests.
            </p>
            <p>
              Generated content may be stored in your account library, subject to your settings and
              retention policies.
            </p>
            <p>
              We do not use your content to train new AI models without your explicit consent.
            </p>

            <h2>5. Data Sharing</h2>
            <p>We do not sell personal information. We may share limited data with:</p>
            <ul>
              <li>AI and infrastructure providers strictly for service delivery.</li>
              <li>Payment processors for billing operations.</li>
              <li>Authorities when required by law or valid legal process.</li>
            </ul>

            <h2>6. Security</h2>
            <ul>
              <li>Encryption in transit and at rest where appropriate.</li>
              <li>Access controls, logging, and ongoing security hardening.</li>
              <li>Session protections and anti-abuse monitoring.</li>
            </ul>

            <h2>7. Your Rights</h2>
            <p>
              Depending on your jurisdiction, you may have rights to access, correct, delete, or
              export your data, and to object to certain processing. Contact{" "}
              <a href="mailto:support@saadstudio.com">support@saadstudio.com</a>. We typically
              respond within 30 days.
            </p>

            <h2>8. Children</h2>
            <p>
              The Platform is not intended for individuals under 18. If we learn that prohibited
              child data was provided, we will take appropriate steps to delete it.
            </p>

            <h2>9. Contact</h2>
            <p>
              Privacy and support inquiries:{" "}
              <a href="mailto:support@saadstudio.com">support@saadstudio.com</a>
            </p>
            <p className="text-slate-500 text-sm pt-4 border-t border-slate-800">
              &copy; 2026 SAAD STUDIO. All rights reserved.
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
