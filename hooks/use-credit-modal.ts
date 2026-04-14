import { create } from "zustand";

interface CreditModalState {
  isOpen: boolean;
  /** Credits needed for the action that was blocked (optional). */
  requiredCredits: number | null;
  /** User's current balance at the time of the error (optional). */
  currentBalance: number | null;
  onOpen: (opts?: { requiredCredits?: number; currentBalance?: number }) => void;
  onClose: () => void;
}

/**
 * Global Zustand store for the "Out of Credits" modal.
 *
 * ─── USAGE INSIDE ANY CLIENT COMPONENT / STUDIO PAGE ────────────────────────
 *
 * 1. Import the hook:
 *      import { useCreditModal } from "@/hooks/use-credit-modal";
 *
 * 2. Grab the opener inside your component:
 *      const openCreditModal = useCreditModal((s) => s.onOpen);
 *
 * 3. After an API call, check for a 402 status or the "Insufficient credits"
 *    error message and open the modal:
 *
 *      try {
 *        const res = await axios.post("/api/generate/image", payload);
 *        // handle success …
 *      } catch (err: any) {
 *        if (err?.response?.status === 402) {
 *          const { requiredCredits, currentBalance } = err.response.data ?? {};
 *          openCreditModal({ requiredCredits, currentBalance });
 *        } else {
 *          toast({ title: "Error", description: "Something went wrong." });
 *        }
 *      }
 *
 * ─── LEGACY "message" CHECK ─────────────────────────────────────────────────
 * Some older routes may return `data.message === "no credit balance"`.
 * Handle them the same way:
 *      if (data.message === "no credit balance") openCreditModal();
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const useCreditModal = create<CreditModalState>((set) => ({
  isOpen: false,
  requiredCredits: null,
  currentBalance: null,
  onOpen: (opts) =>
    set({
      isOpen: true,
      requiredCredits: opts?.requiredCredits ?? null,
      currentBalance: opts?.currentBalance ?? null,
    }),
  onClose: () =>
    set({ isOpen: false, requiredCredits: null, currentBalance: null }),
}));
