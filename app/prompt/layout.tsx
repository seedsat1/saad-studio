import TopNavbar from "@/components/TopNavbar";

export default function PromptLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#060c18" }}>
      <TopNavbar />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}
