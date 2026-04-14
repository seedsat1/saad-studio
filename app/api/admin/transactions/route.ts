import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

function parseTransactionPlan(raw: string) {
  const parts = raw.split("|").map((p) => p.trim()).filter(Boolean);

  let displayPlan = "";
  let method: string | null = null;
  let orderId: string | null = null;
  let proofFileName: string | null = null;
  let proofUrl: string | null = null;

  for (const part of parts) {
    if (part.startsWith("method:")) {
      method = part.slice("method:".length).trim() || null;
      continue;
    }
    if (part.startsWith("ORDER:")) {
      orderId = part.slice("ORDER:".length).trim() || null;
      continue;
    }
    if (part.startsWith("proofName:")) {
      proofFileName = part.slice("proofName:".length).trim() || null;
      continue;
    }
    if (part.startsWith("proofUrl:")) {
      proofUrl = part.slice("proofUrl:".length).trim() || null;
      continue;
    }
    displayPlan = displayPlan ? `${displayPlan} | ${part}` : part;
  }

  if (!proofUrl && proofFileName) {
    const looksLikeUrl =
      proofFileName.startsWith("http://") ||
      proofFileName.startsWith("https://") ||
      proofFileName.startsWith("/");
    if (looksLikeUrl) {
      proofUrl = proofFileName;
    }
  }

  return { displayPlan: displayPlan || raw, method, orderId, proofFileName, proofUrl };
}

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
  const transactions = await prismadb.adminTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true } } },
  });

    return NextResponse.json(
      transactions.map((t) => {
        const parsed = parseTransactionPlan(t.plan);
        return {
          ...parsed,
          id: t.id,
          userEmail: t.user.email,
          plan: parsed.displayPlan,
          amount: t.amount,
          credits: t.credits,
          paymentStatus: t.paymentStatus,
          createdAt: t.createdAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        };
      })
    );
  } catch {
    return NextResponse.json([]);
  }
}
