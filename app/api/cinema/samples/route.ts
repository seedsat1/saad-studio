import { NextResponse } from "next/server";
import { generateProceduralCinemaScene } from "@/lib/cinema-studio-vso";

export const runtime = "nodejs";

export async function GET() {
  const samples = [
    {
      id: "sample_tokyo",
      prompt: "A man walking down a rain-soaked street in vintage Tokyo, with warm neon lights and dim paper lanterns glowing in the mist",
      dialogueText: "These ancient Tokyo streets hold the quiet footsteps of wanderers, whispering old secrets with every drop of rain...",
      cameraMovement: "Dolly Zoom (Vertigo Effect)",
      lensType: "85mm Anamorphic Cinema",
      voiceId: "TokyoNarrator",
    },
    {
      id: "sample_cyberpunk",
      prompt: "A classic flying car drifting between monolithic skyscrapers in a futuristic cyberpunk city with neon accents",
      dialogueText: "In this digital megacity, the rain washes over corporate metal, and faces reflect the cold neon frost.",
      cameraMovement: "Slow Cinematic Pan Left",
      lensType: "35mm Street Documentary",
      voiceId: "CyberVoice",
    },
  ].map((sample) => ({
    ...sample,
    data: generateProceduralCinemaScene(sample),
  }));

  return NextResponse.json({ samples });
}
