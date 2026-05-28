/** Tiny subscribable store.
 *
 * Used for cross-cutting state (current user, credits, recent generations)
 * that multiple components react to. The header reads `user.creditBalance`
 * while a feature page that just succeeded a generation calls
 * `store.refreshUser()` to update the credit chip everywhere at once. */
import { api } from "./api";
const state = {
    user: null,
    userLoading: false,
    userError: null,
    recent: [],
    recentLoading: false,
};
const listeners = new Set();
function emit() { for (const l of listeners)
    l(state); }
export const store = {
    get() { return state; },
    subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },
    async refreshUser() {
        state.userLoading = true;
        state.userError = null;
        emit();
        try {
            state.user = await api.me();
        }
        catch (err) {
            state.user = null;
            state.userError = err.message;
        }
        finally {
            state.userLoading = false;
            emit();
        }
    },
    async refreshCreditsOnly() {
        try {
            const { creditBalance } = await api.credits();
            if (state.user)
                state.user.creditBalance = creditBalance;
            emit();
        }
        catch { /* silent — header keeps last known value */ }
    },
    async refreshRecent() {
        state.recentLoading = true;
        emit();
        try {
            const { items } = await api.recentGenerations();
            state.recent = items;
        }
        catch {
            state.recent = [];
        }
        finally {
            state.recentLoading = false;
            emit();
        }
    },
    clearUser() {
        state.user = null;
        state.recent = [];
        emit();
    },
};
