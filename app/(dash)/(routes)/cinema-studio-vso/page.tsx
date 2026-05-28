import type { Metadata } from "next";
import CinemaStudioVSO from "@/components/cinema-studio-vso/CinemaStudioVSO";

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
