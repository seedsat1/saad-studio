import { auth } from "@clerk/nextjs/server";

/**
 * Returns true if the currently authenticated user is an admin.
 * Set ADMIN_USER_ID in your .env to restrict access to a specific Clerk userId.
 */
export async function isAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const adminId = process.env.ADMIN_USER_ID;
  if (!adminId) return false; // No admin configured — deny all
  return userId === adminId;
}
