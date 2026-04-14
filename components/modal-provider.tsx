"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import { ProModal } from "@/components/pro-modal";
import AuthModal from "@/components/AuthModal";
import OutOfCreditsModal from "@/components/OutOfCreditsModal";
import { useAuthModal } from "@/hooks/use-auth-modal";

const AuthQueryHandler = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const { onOpen } = useAuthModal();

  useEffect(() => {
    const authParam = searchParams.get("auth");
    if (!authParam || isSignedIn) return;

    const view = authParam === "signup" ? "signup" : "login";
    onOpen(view);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("auth");
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [searchParams, pathname, router, isSignedIn, onOpen]);

  return null;
};

export const ModalProvider = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <AuthQueryHandler />
      <ProModal />
      <AuthModal />
      {/* Renders the Out-of-Credits modal; triggered via useCreditModal hook */}
      <OutOfCreditsModal />
    </>
  );
};
