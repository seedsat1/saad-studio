import { CmsSidebar } from "@/components/admin/cms-sidebar";

export default function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#050911]">
      <CmsSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
