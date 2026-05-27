import type { Metadata } from "next";
import CinemaStudioVSO from "@/components/cinema-studio-vso/CinemaStudioVSO";

// Cinema Studio VSO is an internal staging page — keep it out of search
// engines and crawlers until it ships publicly. The page itself remains
// reachable for anyone who knows the URL, but it will not appear in
// Google / Bing results or the site sitemap.
export const metadata: Metadata = {
  title: "Cinema Studio · Saad Studio",
  description: "Internal staging build of the cinematic video studio.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function CinemaStudioVSOPage() {
  return <CinemaStudioVSO />;
}
