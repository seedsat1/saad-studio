import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import {
  PRODUCT_FEATURE_REGISTRY,
  getProductFeatureSummary,
  validateProductFeatureRegistry,
} from "@/lib/product/feature-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const validationErrors = validateProductFeatureRegistry();

  return NextResponse.json({
    ok: validationErrors.length === 0,
    features: PRODUCT_FEATURE_REGISTRY,
    summary: getProductFeatureSummary(),
    validationErrors,
  });
}
