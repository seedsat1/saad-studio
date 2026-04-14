import { useAuth } from "@clerk/nextjs";
import { useAuthModal } from "@/hooks/use-auth-modal";

/**
 * Returns a guard function. Call it before any generation action.
 * If the user is NOT signed in, it opens the AuthModal and returns false.
 * If signed in, returns true and the action can proceed.
 *
 * Usage:
 *   const guard = useAuthGuard();
 *   const handleGenerate = () => {
 *     if (!guard()) return;
 *     // ... proceed with generation
 *   };
 */
export function useAuthGuard() {
  const { isSignedIn } = useAuth();
  const { onOpen } = useAuthModal();

  return (): boolean => {
    if (!isSignedIn) {
      onOpen("signup");
      return false;
    }
    return true;
  };
}
