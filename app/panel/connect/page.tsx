"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth, SignInButton } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

function ConnectFlow() {
  const { isLoaded, isSignedIn } = useAuth();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") ?? "";
  const attempted = useRef(false);
  const [status, setStatus] = useState<"idle" | "approving" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !sessionId || attempted.current) return;
    attempted.current = true;
    setStatus("approving");

    fetch(`/api/panel/auth-session/${sessionId}`, { method: "POST" })
      .then((r) => {
        if (!r.ok)
          return r
            .json()
            .then((d: { error?: string }) => {
              throw new Error(d.error ?? "Failed to connect.");
            });
        return r.json();
      })
      .then(() => setStatus("done"))
      .catch((e: Error) => {
        setErr(e.message);
        setStatus("error");
      });
  }, [isLoaded, isSignedIn, sessionId]);

  if (!sessionId)
    return (
      <div className="text-center space-y-3">
        <p className="text-red-400 text-sm">Invalid link — missing session ID.</p>
        <a href="/panel" className="text-violet-400 text-xs hover:underline">
          ← Back to Panel
        </a>
      </div>
    );

  if (!isLoaded)
    return <p className="text-zinc-500 text-sm text-center">Loading…</p>;

  if (!isSignedIn)
    return (
      <div className="text-center space-y-5">
        <p className="text-zinc-300 text-sm leading-relaxed">
          Sign in to connect the Premiere Pro plugin to your account.
        </p>
        <SignInButton mode="modal">
          <button className="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors">
            Sign in with Saad Studio
          </button>
        </SignInButton>
      </div>
    );

  if (status === "done")
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-3xl mx-auto">
          ✓
        </div>
        <h2 className="text-white font-bold text-lg">Connected!</h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Your Premiere Pro plugin is now connected.
          <br />
          You can close this tab and return to Premiere.
        </p>
      </div>
    );

  if (status === "error")
    return (
      <div className="text-center space-y-3">
        <p className="text-red-400 text-sm">{err}</p>
        <a
          href={`/panel/connect?session=${sessionId}`}
          className="text-violet-400 text-xs hover:underline"
        >
          Try again
        </a>
      </div>
    );

  // approving / idle — spinner
  return (
    <div className="text-center space-y-3">
      <div
        className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto"
        style={{ animation: "spin 0.8s linear infinite" }}
      />
      <p className="text-zinc-300 text-sm">Connecting to Premiere Pro…</p>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07090f] p-6">
      <div className="w-full max-w-sm bg-[#0c1019] border border-white/10 rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
          >
            ⚡
          </div>
          <div>
            <div className="text-white font-bold text-sm">Saad Studio</div>
            <div className="text-zinc-500 text-xs">Premiere Pro Plugin</div>
          </div>
        </div>

        <Suspense
          fallback={<p className="text-zinc-500 text-sm text-center">Loading…</p>}
        >
          <ConnectFlow />
        </Suspense>
      </div>

      {/* spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
