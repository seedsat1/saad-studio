export type SubtitlePart = {
  text: string;
  start: number;
  end: number;
};

export type CinemaSceneData = {
  visualDescription: string;
  dialogue: string;
  subtitles: SubtitlePart[];
  lensType: string;
  cameraMovement: string;
  soundEffects: string;
  visualLayout: {
    backgroundColor: string;
    foregroundElements: string[];
    lightingGradient: string;
  };
};

export type CinemaStudioRender = {
  title: string;
  directorNotes: string;
  moodColor: string;
  accentColor: string;
  particlesType: "rain" | "dust" | "fog" | "snow" | "none";
  scenes: CinemaSceneData[];
};

export type CinemaRenderInput = {
  prompt: string;
  dialogueText?: string;
  cameraMovement?: string;
  lensType?: string;
  voiceId?: string;
  genre?: string;
  sceneType?: string;
  sceneTypeDirection?: string;
  voiceDirection?: string;
};

function subtitleParts(dialogue: string): SubtitlePart[] {
  const safe = dialogue.trim() || "A quiet cinematic moment unfolds in the dark.";
  const midpoint = Math.max(1, Math.floor(safe.length / 2));
  return [
    { text: safe.slice(0, midpoint).trim(), start: 0, end: 3 },
    { text: safe.slice(midpoint).trim(), start: 3, end: 7.5 },
  ].filter((part) => part.text);
}

export function generateProceduralCinemaScene(input: CinemaRenderInput): CinemaStudioRender {
  const safePrompt = input.prompt || "A classic cinematic scene";
  const dialogue = input.dialogueText || "This is the voice of truth whispering in the dark.";
  const lensType = input.lensType || "85mm Anamorphic Cinema";
  const cameraMovement = input.cameraMovement || "Dolly Zoom";
  const genre = input.genre || "General Cinema";
  const sceneType = input.sceneType || "Cinematic Scene";

  let particlesType: CinemaStudioRender["particlesType"] = "none";
  let moodColor = "#0B0C10";
  let accentColor = "#FF0055";
  let lightGradient = "radial-gradient(circle at 30% 40%, rgba(255, 0, 85, 0.25) 0%, rgba(0, 0, 0, 0) 70%)";
  let backgroundColor = "bg-slate-950";

  const lowerPrompt = safePrompt.toLowerCase();
  if (lowerPrompt.includes("rain") || lowerPrompt.includes("water") || lowerPrompt.includes("sea")) {
    particlesType = "rain";
    moodColor = "#09101E";
    accentColor = "#22D3EE";
    lightGradient = "radial-gradient(circle at 50% 30%, rgba(34, 211, 238, 0.22) 0%, rgba(0, 0, 0, 0) 80%)";
    backgroundColor = "bg-slate-950 text-sky-200";
  } else if (lowerPrompt.includes("snow") || lowerPrompt.includes("winter") || lowerPrompt.includes("cold")) {
    particlesType = "snow";
    moodColor = "#111827";
    accentColor = "#93C5FD";
    lightGradient = "radial-gradient(circle at 20% 20%, rgba(147, 197, 253, 0.25) 0%, rgba(0, 0, 0, 0) 75%)";
  } else if (lowerPrompt.includes("dust") || lowerPrompt.includes("sand") || lowerPrompt.includes("desert")) {
    particlesType = "dust";
    moodColor = "#180F05";
    accentColor = "#F59E0B";
    lightGradient = "radial-gradient(circle at 70% 50%, rgba(245, 158, 11, 0.2) 0%, rgba(0, 0, 0, 0) 70%)";
  } else if (lowerPrompt.includes("fog") || lowerPrompt.includes("dark") || lowerPrompt.includes("mystery") || lowerPrompt.includes("noir")) {
    particlesType = "fog";
    moodColor = "#0F172A";
    accentColor = "#94A3B8";
    lightGradient = "radial-gradient(circle at 50% 50%, rgba(148, 163, 184, 0.15) 0%, rgba(0, 0, 0, 0) 80%)";
  }

  return {
    title: `Scene: ${safePrompt.slice(0, 36)}${safePrompt.length > 36 ? "..." : ""}`,
    directorNotes: `Director setup: ${sceneType} format, ${genre} mood, ${cameraMovement} paired with ${lensType}. Grade toward ${accentColor}, with atmosphere and foreground silhouettes matching the prompt's emotional pressure.`,
    moodColor,
    accentColor,
    particlesType,
    scenes: [
      {
        visualDescription: `A cinematic frame based on: ${safePrompt}. The blocking emphasizes depth, atmosphere, layered highlights, and a clear subject silhouette.`,
        dialogue,
        subtitles: subtitleParts(dialogue),
        lensType,
        cameraMovement,
        soundEffects: particlesType === "rain" ? "rain and distant thunder" : "low wind and subtle room tone",
        visualLayout: {
          backgroundColor,
          foregroundElements: ["Primary subject silhouette", "Practical light source", "Atmospheric depth layers"],
          lightingGradient: lightGradient,
        },
      },
    ],
  };
}

export function normalizeCinemaRender(value: unknown, fallback: CinemaRenderInput): CinemaStudioRender {
  const data = value as Partial<CinemaStudioRender> | null;
  if (!data || typeof data !== "object" || !data.title || !Array.isArray(data.scenes)) {
    return generateProceduralCinemaScene(fallback);
  }
  const procedural = generateProceduralCinemaScene(fallback);
  return {
    title: String(data.title || procedural.title),
    directorNotes: String(data.directorNotes || procedural.directorNotes),
    moodColor: String(data.moodColor || procedural.moodColor),
    accentColor: String(data.accentColor || procedural.accentColor),
    particlesType: ["rain", "dust", "fog", "snow", "none"].includes(String(data.particlesType))
      ? (data.particlesType as CinemaStudioRender["particlesType"])
      : procedural.particlesType,
    scenes: data.scenes.length
      ? data.scenes.map((scene) => ({
          visualDescription: String(scene?.visualDescription || procedural.scenes[0].visualDescription),
          dialogue: String(scene?.dialogue || fallback.dialogueText || procedural.scenes[0].dialogue),
          subtitles: Array.isArray(scene?.subtitles) && scene.subtitles.length
            ? scene.subtitles.map((part) => ({
                text: String(part?.text || ""),
                start: Number(part?.start ?? 0),
                end: Number(part?.end ?? 3),
              })).filter((part) => part.text)
            : subtitleParts(String(scene?.dialogue || fallback.dialogueText || "")),
          lensType: String(scene?.lensType || fallback.lensType || procedural.scenes[0].lensType),
          cameraMovement: String(scene?.cameraMovement || fallback.cameraMovement || procedural.scenes[0].cameraMovement),
          soundEffects: String(scene?.soundEffects || procedural.scenes[0].soundEffects),
          visualLayout: {
            backgroundColor: String(scene?.visualLayout?.backgroundColor || procedural.scenes[0].visualLayout.backgroundColor),
            foregroundElements: Array.isArray(scene?.visualLayout?.foregroundElements)
              ? scene.visualLayout.foregroundElements.map(String).slice(0, 6)
              : procedural.scenes[0].visualLayout.foregroundElements,
            lightingGradient: String(scene?.visualLayout?.lightingGradient || procedural.scenes[0].visualLayout.lightingGradient),
          },
        }))
      : procedural.scenes,
  };
}
