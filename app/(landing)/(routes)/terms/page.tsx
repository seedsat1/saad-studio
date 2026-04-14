"use client";

import { motion } from "framer-motion";
import { ScrollText } from "lucide-react";

export default function TermsPage() {
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-600/20 border border-sky-500/30 mb-6">
            <ScrollText className="w-8 h-8 text-sky-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-3">
            Terms &amp; Conditions
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
          {/* PASTE YOUR TERMS & CONDITIONS TEXT HERE */}

          {/*
           * ────────────────────────────────────────────────────────────
           *  PLACEHOLDER — Replace the content inside this <div> with
           *  your own terms & conditions text.
           *  The `prose` classes handle all typography automatically.
           * ────────────────────────────────────────────────────────────
           */}
          <div
            className="prose prose-invert prose-slate max-w-none
                        prose-p:leading-relaxed prose-p:text-slate-300
                        prose-headings:text-slate-100 prose-headings:font-semibold
                        prose-strong:text-slate-200
                        prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline
                        prose-li:text-slate-300 prose-li:marker:text-sky-400"
          >
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using SAAD STUDIO (the &ldquo;Platform&rdquo;), including all associated
              websites, applications, APIs, and services, you agree to be bound by these Terms of
              Service. If you do not agree, do not use the Platform.
            </p>
            <p>
              These Terms are a legally binding agreement between you (&ldquo;User&rdquo;) and SAAD STUDIO
              (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). We may update these Terms from time to time. Your
              continued use of the Platform after changes become effective means you accept the
              updated Terms.
            </p>

            <h2>2. Eligibility</h2>
            <ul>
              <li>You must be at least 18 years old to use the Platform.</li>
              <li>You must provide accurate and complete registration information.</li>
              <li>You are responsible for safeguarding your account and for all activity under your account.</li>
            </ul>

            <h2>3. Description of Services</h2>
            <p>
              SAAD STUDIO is a cloud-based AI creative platform that enables users to generate and
              edit images, videos, music, and text using multiple third-party AI models.
            </p>

            <h2>4. Credits, Pricing, and Billing</h2>

            <h3>4.1 How Credits Work</h3>
            <p>
              Credits are the Platform&rsquo;s virtual usage units. You may obtain credits through
              monthly subscription plans and one-time top-up packs.
            </p>
            <p>
              Current sample plans: Starter ($10 / 1,000 credits), Pro ($25 / 2,800 credits),
              Creator ($50 / 6,000 credits), billed monthly.
            </p>
            <p>
              Current sample top-ups: $5 (450 credits), $15 (1,500 credits), $30 (3,200 credits),
              $50 (5,500 credits). Top-up credits remain available until used or account termination.
            </p>

            <h3>4.2 How Credits Are Consumed</h3>
            <ul>
              <li>Credits are deducted when you submit a generation request.</li>
              <li>The estimated credit cost is shown before confirmation whenever available.</li>
              <li>Credit usage varies by model, quality level, duration, resolution, and selected options.</li>
              <li>Requests are processed through external AI providers that charge real-time usage costs.</li>
            </ul>

            <h3>4.3 No Refunds for Completed AI Generations</h3>
            <p>
              Credits used for completed generations are generally non-refundable. AI outputs are
              probabilistic and may vary in style or quality. Results that do not match personal
              preference are not considered service defects.
            </p>
            <p>
              Because third-party provider costs are incurred at processing time, those costs are
              typically irreversible once generation starts.
            </p>

            <h3>4.4 Credit Refund Exceptions</h3>
            <p>Credits may be restored when a failure is caused by the Platform or infrastructure, including:</p>
            <ul>
              <li>System failure that returns no output.</li>
              <li>Duplicate credit deduction for one request due to a technical issue.</li>
              <li>Generation request lost during a verified service outage.</li>
            </ul>
            <p>
              To request a credit review, contact{" "}
              <a href="mailto:support@saadstudio.com">support@saadstudio.com</a> and include your
              generation ID and details. We aim to respond within 7 business days.
            </p>

            <h3>4.5 Subscriptions and Renewal</h3>
            <ul>
              <li>Subscriptions renew automatically each billing cycle until cancelled.</li>
              <li>You may cancel at any time; cancellation takes effect at the end of the current billing period unless required otherwise by law.</li>
              <li>Unused subscription credits may expire at the end of the billing cycle unless stated otherwise in your plan.</li>
              <li>Top-up credit expiration and priority of usage are defined in your active plan terms at purchase time.</li>
              <li>We may update pricing with advance notice (typically at least 30 days).</li>
            </ul>

            <h2>5. Acceptable Use</h2>
            <p>You agree not to use the Platform to:</p>
            <ul>
              <li>Create illegal, harmful, abusive, or defamatory content.</li>
              <li>Create child sexual abuse material (CSAM) or exploitative content.</li>
              <li>Generate non-consensual deepfakes or impersonation content.</li>
              <li>Infringe intellectual property, trademarks, or copyrights.</li>
              <li>Distribute malware, phishing, spam, or malicious automation.</li>
              <li>Bypass security, abuse APIs, or build competing services through unauthorized means.</li>
            </ul>

            <h2>6. Content Rights</h2>
            <p>
              You retain ownership of your uploaded inputs. You grant SAAD STUDIO a limited license
              to host, process, and transmit your inputs only as necessary to operate the Platform.
            </p>
            <p>
              Subject to these Terms and applicable law, you own your generated outputs. Similar
              outputs may be generated for other users, and uniqueness is not guaranteed.
            </p>
            <p>
              All Platform software, interface design, branding, and infrastructure remain the
              property of SAAD STUDIO or its licensors.
            </p>

            <h2>7. AI-Specific Disclaimer</h2>
            <ul>
              <li>AI outputs may include inaccuracies, bias, artifacts, or unexpected results.</li>
              <li>You are responsible for reviewing outputs before publication or commercial use.</li>
              <li>Where law or policy requires, you must disclose AI-generated content appropriately.</li>
            </ul>

            <h2>8. Liability and Termination</h2>
            <p>
              The Platform is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; to the extent permitted by
              law. We disclaim implied warranties where legally allowed.
            </p>
            <p>
              To the maximum extent permitted by law, SAAD STUDIO is not liable for indirect,
              incidental, special, consequential, or punitive damages.
            </p>
            <p>
              Our aggregate liability for claims related to the Platform is limited to the fees you
              paid during the 12 months before the event giving rise to liability.
            </p>
            <p>
              We may suspend or terminate access for policy violations, legal requirements, security
              risks, or prolonged account inactivity.
            </p>

            <h2>9. Contact</h2>
            <p>
              Support:{" "}
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
