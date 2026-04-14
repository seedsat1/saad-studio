import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isAllowedOrigin } from "@/lib/security";
import {
  type GenerationMode,
  type ShotType,
  estimateShotCredits,
  getShotPack,
  SHOT_PRESETS,
  SHOT_PACKS,
  SHOT_CREDIT_COSTS,
  MODE_CONFIG,
} from "@/lib/shots-studio";

interface EstimateBody {
  mode?: GenerationMode;
  packId?: string;
  shotTypes?: ShotType[];
  consistencyLock?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: EstimateBody = await req.json().catch(() => ({}));
    const {
      mode = "standard",
      packId,
      shotTypes: shotTypesInput,
      consistencyLock = false,
    } = body;

    // ── Resolve shot types ──
    let shotTypes: ShotType[];

    if (shotTypesInput && shotTypesInput.length > 0) {
      shotTypes = shotTypesInput.filter((s) => s in SHOT_PRESETS);
      if (!shotTypes.length) {
        return NextResponse.json({ error: "No valid shot types provided." }, { status: 400 });
      }
    } else if (packId) {
      const pack = getShotPack(packId);
      if (!pack) {
        const valid = SHOT_PACKS.map((p) => p.id).join(", ");
        return NextResponse.json(
          { error: `Unknown packId: "${packId}". Valid: ${valid}` },
          { status: 400 },
        );
      }
      shotTypes = pack.shots;
    } else {
      return NextResponse.json(
        { error: 'Provide either "packId" or "shotTypes" array.' },
        { status: 400 },
      );
    }

    const estimate = estimateShotCredits(shotTypes, mode, consistencyLock);

    return NextResponse.json({
      estimatedCredits: estimate.total,
      shotCount: estimate.shotCount,
      mode,
      modeLabel: MODE_CONFIG[mode].label,
      modeSublabel: MODE_CONFIG[mode].sublabel,
      consistencyLock,
      breakdown: estimate.breakdown.map((b) => ({
        shotType: b.shotType,
        shotLabel: SHOT_PRESETS[b.shotType].label,
        model: b.model,
        cost: b.cost,
        isIdentityCritical: b.isIdentityCritical,
      })),
      routingSummary: {
        standardCostPerShot: SHOT_CREDIT_COSTS["nano-banana-pro"],
        budgetCostPerShot: SHOT_CREDIT_COSTS["z-image"],
        note: "Standard uses Nano Banana. Budget routes scene-wide shots to Z-Image.",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
