import type { Metadata } from "next";
import CinemaStudioVSO from "@/components/cinema-studio-vso/CinemaStudioVSO";

export const metadata: Metadata = {
  title: "Cinema Studio VSO · Saad Studio",
  description: "Create cinematic AI video scenes with scene type, mood, grade, camera, cast, voice, and render controls.",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function CinemaStudioVSOPage() {
  return <CinemaStudioVSO />;
}
