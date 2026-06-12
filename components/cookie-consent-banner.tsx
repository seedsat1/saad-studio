"use client";

import Link from "next/link";
import { Cookie, Settings2, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_KEY,
  CookieConsent,
  createCookieConsent,
  parseCookieConsent,
} from "@/lib/cookie-consent";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function readConsent(): CookieConsent | null {
  const localValue = window.localStorage.getItem(COOKIE_CONSENT_KEY);
  const fromLocal = parseCookieConsent(localValue);
  if (fromLocal) return fromLocal;

  const cookieValue = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${COOKIE_CONSENT_KEY}=`))
    ?.slice(COOKIE_CONSENT_KEY.length + 1);

  return parseCookieConsent(cookieValue ?? null);
}

function persistConsent(consent: CookieConsent) {
  const serialized = JSON.stringify(consent);
  window.localStorage.setItem(COOKIE_CONSENT_KEY, serialized);
  document.cookie = `${COOKIE_CONSENT_KEY}=${encodeURIComponent(serialized)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax; Secure`;
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: consent }));
}

export function CookieConsentBanner() {
  const [ready, setReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const consent = readConsent();
    if (consent) {
      setAnalytics(consent.analytics);
      setMarketing(consent.marketing);
      window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: consent }));
    } else {
      setIsOpen(true);
    }
    setReady(true);

    const openPreferences = () => {
      const current = readConsent();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setShowPreferences(true);
      setIsOpen(true);
    };

    window.addEventListener("saad:open-cookie-settings", openPreferences);
    return () => window.removeEventListener("saad:open-cookie-settings", openPreferences);
  }, []);

  const save = (values: { analytics: boolean; marketing: boolean }) => {
    const consent = createCookieConsent(values);
    persistConsent(consent);
    setAnalytics(consent.analytics);
    setMarketing(consent.marketing);
    setIsOpen(false);
    setShowPreferences(false);
  };

  if (!ready) return null;

  return (
    <>
      {isOpen && (
        <section
          aria-label="Cookie consent"
          className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-4xl overflow-hidden rounded-2xl border border-cyan-400/25 bg-slate-950/95 text-left shadow-2xl shadow-black/50 backdrop-blur-xl sm:inset-x-6 sm:bottom-6"
        >
          <div className="h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 sm:flex">
                <Cookie className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-white sm:text-lg">
                      Your privacy choices
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      We use necessary cookies to keep Saad Studio secure and working. Optional cookies
                      help us understand usage and improve marketing.{" "}
                      <Link href="/cookies" className="font-medium text-cyan-300 hover:text-cyan-200">
                        Cookie Policy
                      </Link>
                    </p>
                  </div>
                  {readConsent() && (
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                      aria-label="Close cookie settings"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {showPreferences && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <ConsentOption
                      title="Necessary"
                      description="Authentication, security, billing, and core features."
                      checked
                      disabled
                      onChange={() => undefined}
                    />
                    <ConsentOption
                      title="Analytics"
                      description="Helps us measure performance and product usage."
                      checked={analytics}
                      onChange={setAnalytics}
                    />
                    <ConsentOption
                      title="Marketing"
                      description="Allows relevant campaigns and conversion measurement."
                      checked={marketing}
                      onChange={setMarketing}
                    />
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  {!showPreferences && (
                    <button
                      type="button"
                      onClick={() => setShowPreferences(true)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/5"
                    >
                      <Settings2 className="h-4 w-4" />
                      Customize
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => save({ analytics: false, marketing: false })}
                    className="min-h-11 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/5"
                  >
                    Reject optional
                  </button>
                  {showPreferences ? (
                    <button
                      type="button"
                      onClick={() => save({ analytics, marketing })}
                      className="min-h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:from-cyan-400 hover:to-blue-500"
                    >
                      Save preferences
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => save({ analytics: true, marketing: true })}
                      className="min-h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:from-cyan-400 hover:to-blue-500"
                    >
                      Accept all
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setShowPreferences(true);
            setIsOpen(true);
          }}
          className="fixed bottom-4 left-4 z-[90] inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-slate-950/90 text-slate-300 shadow-lg backdrop-blur transition hover:border-cyan-400/40 hover:text-cyan-300"
          aria-label="Open cookie settings"
          title="Cookie settings"
        >
          <ShieldCheck className="h-4 w-4" />
        </button>
      )}
    </>
  );
}

function ConsentOption({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <span>
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-400">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-cyan-500"
      />
    </label>
  );
}

