import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/is-admin";

export const dynamic = "force-dynamic";

export default async function InfluencersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const admin = await isAdmin();
  if (!admin) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
