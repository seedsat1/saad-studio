import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const clerk = await clerkClient();
    const { data: clerkUsers } = await clerk.users.getUserList({ limit: 200, orderBy: "-created_at" });

    // Fetch our DB records to merge extra fields (credits, role, ban).
    // If DB is unavailable (quota), degrade gracefully with Clerk-only data.
    let dbMap = new Map<string, Awaited<ReturnType<typeof prismadb.user.findMany>>[number]>();
    let dbErrorMessage: string | null = null;
    try {
      const dbUsers = await prismadb.user.findMany({ take: 500 });
      dbMap = new Map(dbUsers.map((u) => [u.id, u]));
    } catch (dbErr: unknown) {
      dbErrorMessage = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.error("[admin/users GET][db-degraded]", dbErrorMessage, dbErr);
    }

    const users = clerkUsers.map((cu) => {
      const db = dbMap.get(cu.id);
      const meta = (cu.publicMetadata ?? {}) as Record<string, unknown>;
      return {
        id: cu.id,
        email: cu.emailAddresses[0]?.emailAddress ?? "",
        phone: cu.phoneNumbers[0]?.phoneNumber ?? "",
        creditBalance: db?.creditBalance ?? (meta.creditBalance as number) ?? 0,
        role: db?.role ?? (meta.role as string) ?? "USER",
        isBanned: db?.isBanned ?? cu.banned ?? false,
        createdAt: new Date(cu.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      };
    });

    if (dbErrorMessage) {
      return NextResponse.json({ users, degraded: true, error: dbErrorMessage });
    }

    return NextResponse.json({ users, degraded: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.toLowerCase().includes("compute time quota") ? 503 : 500;
    console.error("[admin/users GET]", msg, err);
    return NextResponse.json({ error: msg }, { status });
  }
}
