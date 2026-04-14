import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import TopNavbar from "@/components/TopNavbar";


const DashLayout = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { userId } = auth();

  if (!userId) {
    redirect("/?auth=login&redirect=/dash");
  }

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
