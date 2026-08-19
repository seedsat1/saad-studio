import React from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminProfileView } from "@/components/admin/AdminProfileView";

export const metadata = {
  title: "Admin Security & Password | Saad Studio Control Plane",
  description: "Manage administrator authentication, password updates, and session security.",
};

export default function AdminSecurityPage() {
  return (
    <AdminShell activeRoute="/admin/profile/security">
      <AdminProfileView initialTab="security" />
    </AdminShell>
  );
}
