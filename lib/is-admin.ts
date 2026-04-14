import { auth } from "@clerk/nextjs/server";

/**
 * Returns true if the currently authenticated user is an admin.
 * Set ADMIN_USER_ID in your .env.local to restrict access to a specific Clerk userId.
 * If ADMIN_USER_ID is not set, any authenticated user is treated as admin (dev mode).
 */
export async function isAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const adminId = process.env.ADMIN_USER_ID;
  if (!adminId) return true; // dev fallback — restrict in production
  return userId === adminId;
}
