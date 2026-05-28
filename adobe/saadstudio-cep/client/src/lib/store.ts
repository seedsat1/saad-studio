/** Tiny subscribable store.
 *
 * Used for cross-cutting state (current user, credits, recent generations)
 * that multiple components react to. The header reads `user.creditBalance`
 * while a feature page that just succeeded a generation calls
 * `store.refreshUser()` to update the credit chip everywhere at once. */

import { api, type PanelMe, type GenerationItem } from "./api";

interface State {
  user: PanelMe | null;
  userLoading: boolean;
  userError: string | null;
  recent: GenerationItem[];
  recentLoading: boolean;
}

type Listener = (s: State) => void;

const state: State = {
  user: null,
  userLoading: false,
  userError: null,
  recent: [],
  recentLoading: false,
};

const listeners = new Set<Listener>();

function emit() { for (const l of listeners) l(state); }

export const store = {
  get(): State { return state; },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  async refreshUser(): Promise<void> {
    state.userLoading = true;
    state.userError = null;
    emit();
    try {
      state.user = await api.me();
    } catch (err) {
      state.user = null;
      state.userError = (err as Error).message;
    } finally {
      state.userLoading = false;
      emit();
    }
  },

  async refreshCreditsOnly(): Promise<void> {
    try {
      const { creditBalance } = await api.credits();
      if (state.user) state.user.creditBalance = creditBalance;
      emit();
    } catch { /* silent — header keeps last known value */ }
  },

  async refreshRecent(): Promise<void> {
    state.recentLoading = true;
    emit();
    try {
      const { items } = await api.recentGenerations();
      state.recent = items;
    } catch {
      state.recent = [];
    } finally {
      state.recentLoading = false;
      emit();
    }
  },

  clearUser(): void {
    state.user = null;
    state.recent = [];
    emit();
  },
};
