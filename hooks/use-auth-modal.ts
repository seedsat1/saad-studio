import { create } from "zustand";

type AuthView = "login" | "signup" | "forgot";

interface AuthModalStore {
  isOpen: boolean;
  view: AuthView;
  onOpen: (view?: AuthView) => void;
  onClose: () => void;
  setView: (view: AuthView) => void;
}

export const useAuthModal = create<AuthModalStore>((set) => ({
  isOpen: false,
  view: "signup",
  onOpen: (view = "signup") => set({ isOpen: true, view }),
  onClose: () => set({ isOpen: false }),
  setView: (view) => set({ view }),
}));
