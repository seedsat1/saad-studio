"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useUser } from "@clerk/nextjs";

const STORAGE_KEY_PHOTO_PREFIX = "avatar_photo";
const STORAGE_KEY_PRESET_PREFIX = "avatar_preset";

function photoKeyForUser(userId: string) {
  return `${STORAGE_KEY_PHOTO_PREFIX}:${userId}`;
}

function presetKeyForUser(userId: string) {
  return `${STORAGE_KEY_PRESET_PREFIX}:${userId}`;
}

export const PRESET_AVATARS = [
  { id: 1, gradient: "from-violet-500 to-indigo-600", shadow: "shadow-violet-500/30" },
  { id: 2, gradient: "from-rose-500 to-pink-600", shadow: "shadow-rose-500/30" },
  { id: 3, gradient: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/30" },
  { id: 4, gradient: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/30" },
  { id: 5, gradient: "from-sky-500 to-blue-600", shadow: "shadow-sky-500/30" },
  { id: 6, gradient: "from-fuchsia-500 to-purple-600", shadow: "shadow-fuchsia-500/30" },
  { id: 7, gradient: "from-lime-500 to-green-600", shadow: "shadow-lime-500/30" },
  { id: 8, gradient: "from-cyan-500 to-indigo-600", shadow: "shadow-cyan-500/30" },
  { id: 9, gradient: "from-red-500 to-rose-700", shadow: "shadow-red-500/30" },
  { id: 10, gradient: "from-yellow-400 to-amber-600", shadow: "shadow-yellow-400/30" },
  { id: 11, gradient: "from-teal-400 to-cyan-600", shadow: "shadow-teal-400/30" },
  { id: 12, gradient: "from-indigo-400 to-violet-700", shadow: "shadow-indigo-400/30" },
];

type AvatarContextType = {
  uploadedPhoto: string | null;
  activePreset: number;
  setAvatar: (photo: string | null, preset: number) => void;
};

const AvatarContext = createContext<AvatarContextType>({
  uploadedPhoto: null,
  activePreset: 1,
  setAvatar: () => {},
});

export function AvatarProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState(1);

  useEffect(() => {
    if (!isLoaded) return;

    const userId = user?.id;
    if (!userId) {
      setUploadedPhoto(null);
      setActivePreset(1);
      return;
    }

    const savedPhoto = localStorage.getItem(photoKeyForUser(userId));
    const savedPreset = localStorage.getItem(presetKeyForUser(userId));
    setUploadedPhoto(savedPhoto || null);
    setActivePreset(savedPreset ? Number(savedPreset) : 1);
  }, [isLoaded, user?.id]);

  const setAvatar = (photo: string | null, preset: number) => {
    setUploadedPhoto(photo);
    setActivePreset(preset);

    const userId = user?.id;
    if (!userId) return;

    try {
      const photoKey = photoKeyForUser(userId);
      const presetKey = presetKeyForUser(userId);

      if (photo) {
        localStorage.setItem(photoKey, photo);
      } else {
        localStorage.removeItem(photoKey);
      }
      localStorage.setItem(presetKey, String(preset));
    } catch {
      // localStorage quota exceeded - skip persistence silently.
    }
  };

  return (
    <AvatarContext.Provider value={{ uploadedPhoto, activePreset, setAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
}

export const useAvatar = () => useContext(AvatarContext);
