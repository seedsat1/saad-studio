import TopNavbar from "@/components/TopNavbar";
import Footer from "@/components/Footer";

const LandingLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="relative min-h-screen bg-slate-950 flex flex-col">
      {/* Ambient background gradients */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 h-[400px] w-[400px] rounded-full bg-violet-900/10 blur-[80px]" />
        <div className="absolute top-0 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-900/10 blur-[80px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[200px] w-[500px] rounded-full bg-slate-800/15 blur-[80px]" />
      </div>

      <TopNavbar />

      <main className="relative z-10 flex-1 pt-16">
        {children}
      </main>

      <Footer />
    </div>
  );
};

export default LandingLayout;