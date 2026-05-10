import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";

/**
 * Returns true if the currently authenticated user is an admin.
 * Set ADMIN_USER_ID in your .env to restrict access to a specific Clerk userId.
 */
export async function isAdmin(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") {
    try {
      const host = headers().get("host")?.split(":")[0]?.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
        return true;
      }
    } catch {}
  }

  const { userId } = await auth();
  if (!userId) return false;

  const adminId = process.env.ADMIN_USER_ID;
  if (!adminId) return false; // No admin configured — deny all
  return userId === adminId;
}
