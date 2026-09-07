"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import TopNavbar from "@/components/TopNavbar";
import { PromotionRenderer } from "@/components/ads/PromotionRenderer";

const DashLayout = ({
  children,
}: {
  children: ReactNode;
}) => {
  const pathname = usePathname();
  const isMobileAppRoute = pathname?.startsWith("/m/") || pathname === "/m";

  if (isMobileAppRoute) {
    return (
      <div className="min-h-screen bg-[#05080F]">
        <main>{children}</main>
      </div>
    );
  }

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

