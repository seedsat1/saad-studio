"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";

export default function PanelPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generateToken() {
    setLoading(true);
    try {
      const res = await fetch("/api/panel/token", { method: "POST" });
      const data = await res.json() as { token?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setToken(data.token ?? null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate token");
    } finally {
      setLoading(false);
    }
  }

  async function copyToken() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080b12]">
        <div className="text-zinc-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#080b12] p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Saad Studio — Premiere Panel</h1>
          <p className="text-zinc-400 text-sm">Sign in to generate your panel access token.</p>
        </div>
        <SignInButton mode="modal">
          <button className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm transition-colors">
            Sign In
          </button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#080b12] p-8">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c1019] p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-sky-500 flex items-center justify-center text-white font-bold text-sm">
            SA
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Premiere Pro Panel Token</h1>
            <p className="text-zinc-500 text-xs">Connect the plugin to your Saad Studio account</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6 space-y-3 text-sm text-zinc-400">
          <div className="flex gap-2">
            <span className="text-teal-400 font-bold shrink-0">1.</span>
            <span>Click <strong className="text-white">Generate Token</strong> below.</span>
          </div>
          <div className="flex gap-2">
            <span className="text-teal-400 font-bold shrink-0">2.</span>
            <span>Copy the token and paste it into the plugin&apos;s <strong className="text-white">Settings → Panel Token</strong> field.</span>
          </div>
          <div className="flex gap-2">
            <span className="text-teal-400 font-bold shrink-0">3.</span>
            <span>Set the <strong className="text-white">Website URL</strong> to <code className="bg-white/5 px-1.5 py-0.5 rounded text-teal-400 text-xs">{typeof window !== "undefined" ? window.location.origin : "https://your-site.com"}</code></span>
          </div>
          <div className="flex gap-2">
            <span className="text-teal-400 font-bold shrink-0">4.</span>
            <span>Click <strong className="text-white">Connect</strong> in the plugin. Your Saad Studio credits will be used for all generations.</span>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={generateToken}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-teal-500/20 mb-4"
        >
          {loading ? "Generating…" : token ? "Regenerate Token" : "Generate Token"}
        </button>

        {/* Token display */}
        {token && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Your Panel Token</label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={token}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-teal-400 outline-none pr-20"
              />
              <button
                onClick={copyToken}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 text-xs font-semibold transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-zinc-600">Keep this token private. Regenerating will invalidate the old one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
