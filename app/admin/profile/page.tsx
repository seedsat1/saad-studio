import React from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminProfileView } from "@/components/admin/AdminProfileView";

export const metadata = {
  title: "Admin Profile | Saad Studio Control Plane",
  description: "Manage administrator profile, credentials, and authentication security.",
};

export default function AdminProfilePage() {
  return (
    <AdminShell activeRoute="/admin/profile">
      <AdminProfileView initialTab="profile" />
    </AdminShell>
  );
}
