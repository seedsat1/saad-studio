import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/is-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminConfigured = !!process.env.ADMIN_USER_ID;

  // If ADMIN_USER_ID is not set yet — show setup page to authenticated user
  if (!adminConfigured) {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    return (
      <div style={{ minHeight: "100vh", background: "#050911", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>
        <div style={{ maxWidth: 520, width: "100%", padding: "2rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }}>
          <div style={{ color: "#f87171", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>⚠ Admin Not Configured</div>
          <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            Add the following line to your <code style={{ color: "#a78bfa" }}>.env</code> file on the server, then restart PM2.
          </p>
          <div style={{ background: "#0d1321", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 8, padding: "1rem", marginBottom: 20 }}>
            <div style={{ color: "#64748b", fontSize: 11, marginBottom: 6 }}>YOUR USER ID (copy this line):</div>
            <code style={{ color: "#a78bfa", fontSize: 13, wordBreak: "break-all" }}>ADMIN_USER_ID={userId}</code>
          </div>
          <div style={{ background: "#0d1321", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "1rem" }}>
            <div style={{ color: "#64748b", fontSize: 11, marginBottom: 8 }}>Then run on the server:</div>
            <code style={{ color: "#34d399", fontSize: 12, display: "block", lineHeight: 2 }}>
              {`echo 'ADMIN_USER_ID=${userId}' >> .env`}<br />
              {`pm2 restart saadstudio`}
            </code>
          </div>
        </div>
      </div>
    );
  }

  const admin = await isAdmin();
  if (!admin) redirect("/");

  return <>{children}</>;
}
