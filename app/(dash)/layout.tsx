import { ReactNode } from "react";
import TopNavbar from "@/components/TopNavbar";
import { PromotionRenderer } from "@/components/ads/PromotionRenderer";

const DashLayout = ({
  children,
}: {
  children: ReactNode;
}) => {
  return (
    <div className="min-h-screen" style={{ background: "#060c18" }}>
      <TopNavbar />
      <PromotionRenderer />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
};

export default DashLayout;
