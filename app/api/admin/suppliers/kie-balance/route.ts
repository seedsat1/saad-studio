import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";

type BalanceLevel = "HIGH" | "MEDIUM" | "LOW";

function resolveBalanceLevel(amount: number): BalanceLevel {
  if (amount >= 100) return "HIGH";
  if (amount >= 25) return "MEDIUM";
  return "LOW";
}

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const apiKey = process.env.KIE_API_KEY || process.env.KIEAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "KIE API key is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const externalRes = await fetch("https://api.kie.ai/api/v1/chat/credit", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const payload = await externalRes.json().catch(() => null);
    const amount = Number(payload?.data);

    if (!externalRes.ok || payload?.code !== 200 || !Number.isFinite(amount)) {
      return NextResponse.json(
        {
          error: payload?.msg || "Failed to fetch KIE balance.",
          provider: "KIE.ai",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      provider: "KIE.ai",
      amount,
      currency: "USD",
      status: resolveBalanceLevel(amount),
      syncedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        error: "Could not reach KIE API.",
        provider: "KIE.ai",
      },
      { status: 502 }
    );
  }
}
