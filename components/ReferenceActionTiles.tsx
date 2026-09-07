"use client";

import React from "react";
import { Sparkles, User, Plus, X } from "lucide-react";
import {
  HOOK_STYLES,
  HOOK_ELEMENTS,
  HOOK_LOCATIONS,
  HOOK_CAMERAS,
  HOOK_EFFECTS,
  HOOK_CHARACTERS,
  HOOK_SHOT_TYPES,
  HOOK_FILM_STOCKS,
  HOOK_MOVIE_LOOKS,
  HOOK_TONAL_LOOKS,
  HOOK_LIGHTING,
  HOOK_MOTION_BLURS,
  HOOK_GRAINS,
  HOOK_HALATIONS,
} from "@/lib/hook-studio-config";

export interface ReferenceActionTilesProps {
  onOpenStudio: (tab: string) => void;
  selectedStyle?: string | null;
  selectedElementId?: string | null;
  selectedLocationId?: string | null;
  selectedCameraId?: string | null;
  selectedEffectId?: string | null;
  selectedCharacterId?: string | null;
  selectedShotTypeId?: string | null;
  selectedFilmStockId?: string | null;
  selectedMovieLookId?: string | null;
  selectedTonalLookId?: string | null;
  selectedLightingId?: string | null;
  selectedMotionBlurId?: string | null;
  selectedGrainId?: string | null;
  selectedHalationId?: string | null;
  onClearStyle?: () => void;
  onClearElement?: () => void;
  onClearLocation?: () => void;
  onClearCamera?: () => void;
  onClearEffect?: () => void;
  onClearCharacter?: () => void;
  onClearShotType?: () => void;
  onClearFilmStock?: () => void;
  onClearMovieLook?: () => void;
  onClearTonalLook?: () => void;
  onClearLighting?: () => void;
  onClearMotionBlur?: () => void;
  onClearGrain?: () => void;
  onClearHalation?: () => void;
  isAr?: boolean;
  hideLabel?: boolean;
}

export function ReferenceActionTiles({
  onOpenStudio,
  selectedStyle,
  selectedElementId,
  selectedLocationId,
  selectedCameraId,
  selectedEffectId,
  selectedCharacterId,
  selectedShotTypeId,
  selectedFilmStockId,
  selectedMovieLookId,
  selectedTonalLookId,
  selectedLightingId,
  selectedMotionBlurId,
  selectedGrainId,
  selectedHalationId,
  onClearStyle,
  onClearElement,
  onClearLocation,
  onClearCamera,
  onClearEffect,
  onClearCharacter,
  onClearShotType,
  onClearFilmStock,
  onClearMovieLook,
  onClearTonalLook,
  onClearLighting,
  onClearMotionBlur,
  onClearGrain,
  onClearHalation,
  isAr = true,
  hideLabel = true,
}: ReferenceActionTilesProps) {
  const activeStyle = HOOK_STYLES.find((s) => s.id === selectedStyle);
  const activeElement = HOOK_ELEMENTS.find((el) => el.id === selectedElementId);
  const activeLocation = HOOK_LOCATIONS.find((loc) => loc.id === selectedLocationId);
  const activeCamera = HOOK_CAMERAS.find((cam) => cam.id === selectedCameraId);
  const activeEffect = HOOK_EFFECTS.find((eff) => eff.id === selectedEffectId);
  const activeCharacter = HOOK_CHARACTERS.find((c) => c.id === selectedCharacterId);

  const extraBadges = [
    { tab: "shottype",   emoji: "🔲", item: HOOK_SHOT_TYPES.find((x) => x.id === selectedShotTypeId),   onClear: onClearShotType,
      cls: "bg-orange-500/10 text-orange-300 border-orange-500/20 hover:bg-orange-500/20" },
    { tab: "filmstock",  emoji: "🎞️", item: HOOK_FILM_STOCKS.find((x) => x.id === selectedFilmStockId),  onClear: onClearFilmStock,
      cls: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/20" },
    { tab: "movielook",  emoji: "🎬", item: HOOK_MOVIE_LOOKS.find((x) => x.id === selectedMovieLookId),  onClear: onClearMovieLook,
      cls: "bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20" },
    { tab: "tonallook",  emoji: "🌈", item: HOOK_TONAL_LOOKS.find((x) => x.id === selectedTonalLookId),  onClear: onClearTonalLook,
      cls: "bg-sky-500/10 text-sky-300 border-sky-500/20 hover:bg-sky-500/20" },
    { tab: "lighting",   emoji: "💡", item: HOOK_LIGHTING.find((x) => x.id === selectedLightingId),      onClear: onClearLighting,
      cls: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20 hover:bg-yellow-500/20" },
    { tab: "motionblur", emoji: "💨", item: HOOK_MOTION_BLURS.find((x) => x.id === selectedMotionBlurId), onClear: onClearMotionBlur,
      cls: "bg-violet-500/10 text-violet-300 border-violet-500/20 hover:bg-violet-500/20" },
    { tab: "grain",      emoji: "🌾", item: HOOK_GRAINS.find((x) => x.id === selectedGrainId),           onClear: onClearGrain,
      cls: "bg-lime-500/10 text-lime-300 border-lime-500/20 hover:bg-lime-500/20" },
    { tab: "halation",   emoji: "🔆", item: HOOK_HALATIONS.find((x) => x.id === selectedHalationId),     onClear: onClearHalation,
      cls: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20 hover:bg-fuchsia-500/20" },
  ].filter((b) => Boolean(b.item));

  const hasAnyActive =
    activeStyle || activeElement || activeLocation || activeCamera || activeEffect || activeCharacter ||
    extraBadges.length > 0;

  return (
    <div className="space-y-2">
      {!hideLabel && (
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
          {isAr ? "المراجع والمظهر الفني" : "REFERENCES & STYLING"}
        </label>
      )}

      {/* Quick Action Square Tiles Row (Style | Character | Add) */}
      <div className="grid grid-cols-3 gap-2 pb-1">
        {/* 1. Style Tile */}
        <button
          type="button"
          onClick={() => onOpenStudio("style")}
          className="w-full h-20 rounded-2xl border border-dashed border-slate-700/80 bg-[#121520] hover:bg-[#191d2c] hover:border-indigo-500/80 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer group"
        >
          <Sparkles className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-200" />
          <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white">Style</span>
        </button>

        {/* 2. Character Tile */}
        <button
          type="button"
          onClick={() => onOpenStudio("character")}
          className="w-full h-20 rounded-2xl border border-dashed border-slate-700/80 bg-[#121520] hover:bg-[#191d2c] hover:border-emerald-500/80 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer group"
        >
          <User className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-200" />
          <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white">Character</span>
        </button>

        {/* 3. Add Tile */}
        <button
          type="button"
          onClick={() => onOpenStudio("uploads")}
          className="w-full h-20 rounded-2xl border border-dashed border-slate-700/80 bg-[#121520] hover:bg-[#191d2c] hover:border-sky-500/80 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer group"
        >
          <Plus className="w-5 h-5 text-slate-400 group-hover:text-sky-400 group-hover:scale-110 transition-all duration-200" />
          <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white">Add</span>
        </button>
      </div>

      {/* Active Selected Badges */}
      {hasAnyActive && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {activeStyle && (
            <span
              onClick={() => onOpenStudio("style")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 cursor-pointer hover:bg-indigo-500/20 transition-colors"
            >
              🎨 {isAr ? activeStyle.nameAr : activeStyle.nameEn}
              {onClearStyle && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearStyle();
                  }}
                  className="hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          {activeCharacter && (
            <span
              onClick={() => onOpenStudio("character")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20 transition-colors"
            >
              👤 {activeCharacter.tag}
              {onClearCharacter && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearCharacter();
                  }}
                  className="hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          {activeElement && (
            <span
              onClick={() => onOpenStudio("element")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 cursor-pointer hover:bg-purple-500/20 transition-colors"
            >
              📦 {activeElement.tag}
              {onClearElement && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearElement();
                  }}
                  className="hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          {activeLocation && (
            <span
              onClick={() => onOpenStudio("location")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20 cursor-pointer hover:bg-sky-500/20 transition-colors"
            >
              📍 {activeLocation.tag}
              {onClearLocation && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearLocation();
                  }}
                  className="hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          {activeCamera && (
            <span
              onClick={() => onOpenStudio("camera")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors"
            >
              🎥 {activeCamera.tag}
              {onClearCamera && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearCamera();
                  }}
                  className="hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          {activeEffect && (
            <span
              onClick={() => onOpenStudio("effects")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-pink-500/10 text-pink-300 border border-pink-500/20 cursor-pointer hover:bg-pink-500/20 transition-colors"
            >
              ✨ {activeEffect.tag}
              {onClearEffect && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearEffect();
                  }}
                  className="hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )}

          {extraBadges.map((badge) => (
            <span
              key={badge.tab}
              onClick={() => onOpenStudio(badge.tab)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border cursor-pointer transition-colors ${badge.cls}`}
            >
              {badge.emoji} {isAr ? badge.item!.nameAr : badge.item!.nameEn}
              {badge.onClear && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    badge.onClear!();
                  }}
                  className="hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
