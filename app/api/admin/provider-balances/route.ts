// ============================================================
// FILE: app/api/admin/provider-balances/route.ts
// DESCRIPTION: Live KIE.ai + WaveSpeed balance check
// AUTH: isAdmin() guard
// ============================================================

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let kie: number | null = null;
  let wavespeed: number | null = null;

  await Promise.allSettled([
    // ── KIE.ai balance ──
    (async () => {
      const apiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;
      if (!apiKey) return;
      const res = await fetch("https://api.kie.ai/api/v1/chat/credit", {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      // KIE returns credits; convert to USD at $0.005 / credit
      const credits = Number(data?.data);
      if (Number.isFinite(credits)) kie = credits * 0.005;
    })(),

    // ── WaveSpeed balance ──
    (async () => {
      const apiKey = process.env.WAVESPEED_API_KEY;
      if (!apiKey) return;
      const res = await fetch("https://api.wavespeed.ai/api/v2/user/balance", {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      const val = data?.data?.balance_usd ?? data?.balance ?? null;
      if (val !== null) wavespeed = Number(val);
    })(),
  ]);

  return NextResponse.json({ kie, wavespeed });
}
