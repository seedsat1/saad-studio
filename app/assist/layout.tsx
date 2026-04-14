import { ReactNode } from "react";
import TopNavbar from "@/components/TopNavbar";

export default function AssistLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: "#030712" }}>
      <TopNavbar />
      <div className="h-16 flex-shrink-0" aria-hidden="true" />
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
