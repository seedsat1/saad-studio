"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Root Admin Route (/admin)
 * Canonical Control Plane landing is /admin/control-center.
 * Automatically routes administrators to the unified Control Center.
 */
export default function AdminRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/control-center");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-mono">
      Redirecting to Saad Studio Admin Control Center...
    </div>
  );
}
