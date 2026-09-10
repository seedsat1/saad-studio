"use client";

import { useCallback, useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/use-language";

/**
 * Applies a saved character's voice wherever a voice is being chosen.
 *
 * A character carries a voiceId in its metadata, but the studios that actually
 * speak — lipsync, dubbing — have no character concept of their own, so that
 * saved pairing had nowhere to land. This is the bridge: one button that lists
 * the characters which have a voice and hands its id to the caller.
 *
 * Renders nothing when no character has a voice yet, so it stays invisible
 * until it has something to offer.
 */

type CharacterWithVoice = { id: string; name: string; voiceId: string };

export function CharacterVoiceButton({
  onPickVoice,
  className,
}: {
  onPickVoice: (voiceId: string, characterName: string) => void;
  className?: string;
}) {
  const [characters, setCharacters] = useState<CharacterWithVoice[]>([]);
  const [open, setOpen] = useState(false);
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/characters", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled || !res.ok || !Array.isArray(data?.characters)) return;
        setCharacters(
          data.characters
            .map((c: any) => ({
              id: String(c?.id ?? ""),
              name: String(c?.name ?? "Character"),
              voiceId: String(c?.metadata?.voiceId ?? ""),
            }))
            .filter((c: CharacterWithVoice) => c.id && c.voiceId),
        );
      } catch {
        /* the button simply stays hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pick = useCallback(
    (c: CharacterWithVoice) => {
      onPickVoice(c.voiceId, c.name);
      setOpen(false);
    },
    [onPickVoice],
  );

  if (characters.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-bold text-violet-300 transition hover:bg-violet-500/20"
      >
        <UserRound className="h-3 w-3 stroke-[2.5]" />
        <span>{isAr ? "استخدم صوت شخصية" : "Use a character's voice"}</span>
      </button>

      {open ? (
        <div className="absolute bottom-full right-0 z-50 mb-1 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#12151f] shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
          {characters.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] text-zinc-300 transition hover:bg-white/5"
            >
              <UserRound className="h-3 w-3 shrink-0 text-violet-400" />
              <span className="truncate font-semibold">{c.name}</span>
              <span className="ms-auto shrink-0 truncate text-[10px] text-zinc-500">{c.voiceId}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default CharacterVoiceButton;
