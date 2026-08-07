"use client";

import React from "react";
import { Sparkles, User, Plus, X, Image as ImageIcon, Video, AudioLines, Palette } from "lucide-react";
import {
  HOOK_STYLES,
  HOOK_ELEMENTS,
  HOOK_LOCATIONS,
  HOOK_CAMERAS,
  HOOK_EFFECTS,
  HOOK_CHARACTERS,
} from "@/lib/hook-studio-config";

export interface ReferenceActionTilesProps {
  onOpenStudio: (tab: string) => void;
  selectedStyle?: string | null;
  selectedElementId?: string | null;
  selectedLocationId?: string | null;
  selectedCameraId?: string | null;
  selectedEffectId?: string | null;
  selectedCharacterId?: string | null;
  onClearStyle?: () => void;
  onClearElement?: () => void;
  onClearLocation?: () => void;
  onClearCamera?: () => void;
  onClearEffect?: () => void;
  onClearCharacter?: () => void;
  isAr?: boolean;
  hasImages?: boolean;
  hasVideos?: boolean;
  hasAudio?: boolean;
  onAddMedia?: () => void;
}

export function ReferenceActionTiles({
  onOpenStudio,
  selectedStyle,
  selectedElementId,
  selectedLocationId,
  selectedCameraId,
  selectedEffectId,
  selectedCharacterId,
  onClearStyle,
  onClearElement,
  onClearLocation,
  onClearCamera,
  onClearEffect,
  onClearCharacter,
  isAr = true,
  hasImages,
  hasVideos,
  hasAudio,
  onAddMedia,
}: ReferenceActionTilesProps) {
  const activeStyle = HOOK_STYLES.find((s) => s.id === selectedStyle);
  const activeElement = HOOK_ELEMENTS.find((el) => el.id === selectedElementId);
  const activeLocation = HOOK_LOCATIONS.find((loc) => loc.id === selectedLocationId);
  const activeCamera = HOOK_CAMERAS.find((cam) => cam.id === selectedCameraId);
  const activeEffect = HOOK_EFFECTS.find((eff) => eff.id === selectedEffectId);
  const activeCharacter = HOOK_CHARACTERS.find((c) => c.id === selectedCharacterId);

  const hasAnyActive =
    activeStyle || activeElement || activeLocation || activeCamera || activeEffect || activeCharacter;

  if (onAddMedia) {
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
          {isAr ? "المراجع والمظهر الفني" : "REFERENCES & STYLING"}
        </label>
        <div className="flex items-center justify-between gap-1 rounded-xl bg-black/20 p-1 border border-white/[0.03]">
          <div className="flex items-center gap-1">
            {/* 1. Image Icon Button */}
            <button
              type="button"
              onClick={() => onOpenStudio("uploads")}
              className="relative w-[28px] h-[28px] rounded-lg bg-[#121520] border border-slate-800/80 flex flex-col items-center justify-center transition-all duration-200 hover:bg-[#191d2c] group cursor-pointer"
              title={isAr ? "الصور المرجعية" : "Reference Images"}
            >
              <ImageIcon className={`w-3.5 h-3.5 transition-all ${hasImages ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-400"}`} />
              <div
                className={`absolute bottom-0 left-0.5 right-0.5 h-[1.5px] rounded-full transition-all ${
                  hasImages
                    ? "bg-cyan-500 shadow-[0_0_8px_#06b6d4]"
                    : "bg-transparent group-hover:bg-slate-700"
                }`}
              />
            </button>

            {/* 2. Video Icon Button */}
            <button
              type="button"
              onClick={() => onOpenStudio("uploads")}
              className="relative w-[28px] h-[28px] rounded-lg bg-[#121520] border border-slate-800/80 flex flex-col items-center justify-center transition-all duration-200 hover:bg-[#191d2c] group cursor-pointer"
              title={isAr ? "الفيديوهات المرجعية" : "Reference Videos"}
            >
              <Video className={`w-3.5 h-3.5 transition-all ${hasVideos ? "text-purple-400" : "text-slate-500 group-hover:text-slate-400"}`} />
              <div
                className={`absolute bottom-0 left-0.5 right-0.5 h-[1.5px] rounded-full transition-all ${
                  hasVideos
                    ? "bg-purple-500 shadow-[0_0_8px_#a855f7]"
                    : "bg-transparent group-hover:bg-slate-700"
                }`}
              />
            </button>

            {/* 3. Audio Icon Button */}
            <button
              type="button"
              onClick={() => onOpenStudio("uploads")}
              className="relative w-[28px] h-[28px] rounded-lg bg-[#121520] border border-slate-800/80 flex flex-col items-center justify-center transition-all duration-200 hover:bg-[#191d2c] group cursor-pointer"
              title={isAr ? "الأصوات المرجعية" : "Reference Audio"}
            >
              <AudioLines className={`w-3.5 h-3.5 transition-all ${hasAudio ? "text-teal-400" : "text-slate-500 group-hover:text-slate-400"}`} />
              <div
                className={`absolute bottom-0 left-0.5 right-0.5 h-[1.5px] rounded-full transition-all ${
                  hasAudio
                    ? "bg-teal-500 shadow-[0_0_8px_#14b8a6]"
                    : "bg-transparent group-hover:bg-slate-700"
                }`}
              />
            </button>

            {/* 4. Character Icon Button */}
            <button
              type="button"
              onClick={() => onOpenStudio("character")}
              className="relative w-[28px] h-[28px] rounded-lg bg-[#121520] border border-slate-800/80 flex flex-col items-center justify-center transition-all duration-200 hover:bg-[#191d2c] group cursor-pointer"
              title={isAr ? "شخصية محفوظة" : "Saved Character"}
            >
              <User className={`w-3.5 h-3.5 transition-all ${activeCharacter ? "text-pink-400" : "text-slate-500 group-hover:text-slate-400"}`} />
              <div
                className={`absolute bottom-0 left-0.5 right-0.5 h-[1.5px] rounded-full transition-all ${
                  activeCharacter
                    ? "bg-pink-500 shadow-[0_0_8px_#ec4899]"
                    : "bg-transparent group-hover:bg-slate-700"
                }`}
              />
            </button>

            {/* 5. Style Icon Button */}
            <button
              type="button"
              onClick={() => onOpenStudio("style")}
              className="relative w-[28px] h-[28px] rounded-lg bg-[#121520] border border-slate-800/80 flex flex-col items-center justify-center transition-all duration-200 hover:bg-[#191d2c] group cursor-pointer"
              title={isAr ? "مكتبة الأنماط" : "Style Library"}
            >
              <Palette className={`w-3.5 h-3.5 transition-all ${activeStyle ? "text-amber-400" : "text-slate-500 group-hover:text-slate-400"}`} />
              <div
                className={`absolute bottom-0 left-0.5 right-0.5 h-[1.5px] rounded-full transition-all ${
                  activeStyle
                    ? "bg-amber-500 shadow-[0_0_8px_#eab308]"
                    : "bg-transparent group-hover:bg-slate-700"
                }`}
              />
            </button>
          </div>

          <div className="h-5 w-[1px] bg-slate-800/80 mx-0.5 flex-shrink-0" />

          {/* 6. Add Media Button */}
          <button
            type="button"
            onClick={onAddMedia}
            className="flex-shrink-0 min-w-[80px] h-[28px] rounded-lg border border-dashed border-slate-700 hover:border-cyan-500/80 bg-cyan-500/5 hover:bg-cyan-500/10 flex items-center justify-center gap-1 transition-all duration-200 cursor-pointer text-cyan-400 hover:text-white"
          >
            <Plus className="w-3 h-3 flex-shrink-0" />
            <span className="text-[10px] font-bold tracking-tight" style={{ whiteSpace: "nowrap" }}>{isAr ? "إضافة وسائط" : "Add media"}</span>
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
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
        {isAr ? "المراجع والمظهر الفني" : "REFERENCES & STYLING"}
      </label>

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
        </div>
      )}
    </div>
  );
}
