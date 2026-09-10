"use client";

import { useState } from "react";
import { ChevronDown, Mic } from "lucide-react";
import { VoiceLibraryModal } from "@/components/voices/VoiceLibraryModal";
import type { VoiceDefinition } from "@/lib/voice-catalog";

/**
 * Gender and voice for a character, shared by the two places a character can be
 * created — the Character Studio page and the Reference Studio's character tab.
 *
 * Both values live in the character's metadata JSON, so neither needs a column.
 * The voice comes from VoiceLibraryModal rather than a select, because that is
 * what carries the subscriber's own cloned voices; a list built from the static
 * catalogue cannot offer them.
 */

export type CharacterGender = "unspecified" | "male" | "female" | "non-binary";

export function CharacterIdentityFields({
  gender,
  onGenderChange,
  voice,
  onVoiceChange,
  isAr = false,
  layout = "grid",
}: {
  gender: CharacterGender;
  onGenderChange: (gender: CharacterGender) => void;
  voice: VoiceDefinition | null;
  onVoiceChange: (voice: VoiceDefinition | null) => void;
  isAr?: boolean;
  /**
   * "grid" pairs the two fields, which fits the Character Studio page.
   * "stack" is for the Reference Studio's sidebar — a media query cannot see
   * that the column is narrow while the viewport is wide, so the caller says.
   */
  layout?: "grid" | "stack";
}) {
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const t = (ar: string, en: string) => (isAr ? ar : en);

  return (
    <>
      <div className={layout === "stack" ? "space-y-3" : "grid gap-3 sm:grid-cols-2"}>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {t("الجنس", "Gender")}
          </label>
          <select
            value={gender}
            onChange={(e) => onGenderChange(e.target.value as CharacterGender)}
            className="h-10 w-full rounded-xl border border-white/5 bg-black/40 px-3 text-xs text-zinc-200 transition focus:border-violet-500/60 focus:outline-none"
          >
            <option value="unspecified">{t("غير محدد", "Not specified")}</option>
            <option value="male">{t("ذكر", "Male")}</option>
            <option value="female">{t("أنثى", "Female")}</option>
            <option value="non-binary">{t("غير ثنائي", "Non-binary")}</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {t("الصوت", "Voice")}
          </label>
          <button
            type="button"
            onClick={() => setVoiceModalOpen(true)}
            className="flex h-10 w-full items-center gap-2 rounded-xl border border-white/5 bg-black/40 px-3 text-start text-xs text-zinc-200 transition hover:border-violet-500/60"
          >
            <Mic size={13} className="shrink-0 text-zinc-500" />
            {voice ? (
              <span className="truncate">
                {voice.name}
                <span className="text-zinc-500">
                  {" "}
                  — {voice.language} · {voice.accent}
                </span>
              </span>
            ) : (
              <span className="text-zinc-500">{t("اختر صوتاً", "Select a voice")}</span>
            )}
            <ChevronDown size={13} className="ms-auto shrink-0 text-zinc-500" />
          </button>
          {voice ? (
            <audio key={voice.id} controls preload="none" src={voice.sampleUrl} className="mt-1 h-8 w-full" />
          ) : (
            <p className="text-[10px] text-zinc-500">
              {t(
                "اختيار الصوت هنا يُحفظ مع الشخصية، فيستخدمه الفيديو والتعليق الصوتي بدل السؤال مرة أخرى.",
                "Picking a voice here saves it with the character, so video and voice-over reach for it instead of asking again.",
              )}
            </p>
          )}
        </div>
      </div>

      <VoiceLibraryModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        selectedVoiceId={voice?.id}
        onSelectVoice={(v) => {
          onVoiceChange(v);
          setVoiceModalOpen(false);
        }}
      />
    </>
  );
}

export default CharacterIdentityFields;
