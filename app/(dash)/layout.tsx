import { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import TopNavbar from "@/components/TopNavbar";


const DashLayout = ({
  children,
}: {
  children: ReactNode;
}) => {
  // Note: Removed redirect check to allow unauthenticated users to browse
  // Authentication is enforced on generation actions via useGenerationGate()

  return (
    <div className="min-h-screen" style={{ background: "#060c18" }}>
      <TopNavbar />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
};

export default DashLayout;
