"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";

export interface UserProfile {
  id: string;
  name: string;
  avatarPhoto: string | null;
  avatarPreset: number;
  isDefault: boolean;
  createdAt: string;
  generationCount?: number;
}

interface ProfileContextType {
  profiles: UserProfile[];
  activeProfile: UserProfile | null;
  activeProfileId: string | null;
  isLoading: boolean;
  switchProfile: (profileId: string) => void;
  createProfile: (
    name: string,
    avatarPreset?: number,
    avatarPhoto?: string,
  ) => Promise<{ success: boolean; error?: string; profile?: UserProfile }>;
  updateProfile: (
    profileId: string,
    data: { name?: string; avatarPreset?: number; avatarPhoto?: string },
  ) => Promise<{ success: boolean; error?: string; profile?: UserProfile }>;
  deleteProfile: (profileId: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfiles: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType>({
  profiles: [],
  activeProfile: null,
  activeProfileId: null,
  isLoading: true,
  switchProfile: () => {},
  createProfile: async () => ({ success: false, error: "Not initialized" }),
  updateProfile: async () => ({ success: false, error: "Not initialized" }),
  deleteProfile: async () => ({ success: false, error: "Not initialized" }),
  refreshProfiles: async () => {},
});

const STORAGE_ACTIVE_PROFILE_KEY = "saad_active_profile_id";

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    if (!isSignedIn) {
      setProfiles([]);
      setActiveProfileId(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/profiles", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch profiles");
      const data = await res.json();
      const list: UserProfile[] = Array.isArray(data?.profiles) ? data.profiles : [];
      setProfiles(list);

      // Determine active profile
      let targetId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_ACTIVE_PROFILE_KEY) : null;
      const found = list.find((p) => p.id === targetId);

      if (found) {
        setActiveProfileId(found.id);
        setCookie(STORAGE_ACTIVE_PROFILE_KEY, found.id);
      } else if (list.length > 0) {
        const defaultProfile = list.find((p) => p.isDefault) || list[0];
        setActiveProfileId(defaultProfile.id);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_ACTIVE_PROFILE_KEY, defaultProfile.id);
        }
        setCookie(STORAGE_ACTIVE_PROFILE_KEY, defaultProfile.id);
      } else {
        setActiveProfileId(null);
      }
    } catch (err) {
      console.error("[ProfileProvider] Error loading profiles:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (isLoaded) {
      void fetchProfiles();
    }
  }, [isLoaded, fetchProfiles, userId]);

  const activeProfile = useMemo(() => {
    if (!activeProfileId || profiles.length === 0) return null;
    return profiles.find((p) => p.id === activeProfileId) || profiles.find((p) => p.isDefault) || profiles[0] || null;
  }, [activeProfileId, profiles]);

  const switchProfile = useCallback((profileId: string) => {
    const match = profiles.find((p) => p.id === profileId);
    if (!match) return;

    setActiveProfileId(match.id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_ACTIVE_PROFILE_KEY, match.id);
      setCookie(STORAGE_ACTIVE_PROFILE_KEY, match.id);
      window.dispatchEvent(new CustomEvent("saad-profile-switched", { detail: { profileId: match.id } }));
    }
  }, [profiles]);

  const createProfile = useCallback(
    async (name: string, avatarPreset = 1, avatarPhoto?: string) => {
      try {
        const res = await fetch("/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, avatarPreset, avatarPhoto }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data?.error || "فشل إنشاء البروفايل" };
        }

        const newProfile: UserProfile = data.profile;
        setProfiles((prev) => [...prev, newProfile]);
        // Automatically switch to the newly created profile
        switchProfile(newProfile.id);
        return { success: true, profile: newProfile };
      } catch (err: any) {
        return { success: false, error: err.message || "حدث خطأ أثناء إنشاء البروفايل" };
      }
    },
    [switchProfile]
  );

  const updateProfile = useCallback(
    async (profileId: string, payload: { name?: string; avatarPreset?: number; avatarPhoto?: string }) => {
      try {
        const res = await fetch(`/api/profiles/${encodeURIComponent(profileId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data?.error || "فشل تعديل البروفايل" };
        }

        const updated: UserProfile = data.profile;
        setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, ...updated } : p)));
        return { success: true, profile: updated };
      } catch (err: any) {
        return { success: false, error: err.message || "حدث خطأ أثناء تعديل البروفايل" };
      }
    },
    []
  );

  const deleteProfile = useCallback(
    async (profileId: string) => {
      try {
        const res = await fetch(`/api/profiles/${encodeURIComponent(profileId)}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data?.error || "فشل حذف البروفايل" };
        }

        setProfiles((prev) => {
          const remaining = prev.filter((p) => p.id !== profileId);
          // If we deleted the active profile, switch to the default
          if (activeProfileId === profileId) {
            const fallback = remaining.find((p) => p.isDefault) || remaining[0];
            if (fallback) {
              switchProfile(fallback.id);
            }
          }
          return remaining;
        });

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || "حدث خطأ أثناء حذف البروفايل" };
      }
    },
    [activeProfileId, switchProfile]
  );

  const value = useMemo(
    () => ({
      profiles,
      activeProfile,
      activeProfileId,
      isLoading,
      switchProfile,
      createProfile,
      updateProfile,
      deleteProfile,
      refreshProfiles: fetchProfiles,
    }),
    [
      profiles,
      activeProfile,
      activeProfileId,
      isLoading,
      switchProfile,
      createProfile,
      updateProfile,
      deleteProfile,
      fetchProfiles,
    ]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export const useActiveProfile = () => useContext(ProfileContext);
