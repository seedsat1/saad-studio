import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { getProviderCostsReadModel } from "@/lib/admin/provider-costs-read-model";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const provider = searchParams.get("provider") || undefined;
    const classification = searchParams.get("classification") || undefined;
    const costTrust = searchParams.get("costTrust") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    const result = await getProviderCostsReadModel({
      search,
      provider,
      classification,
      costTrust,
      status,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API_ADMIN_PROVIDER_COSTS_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
