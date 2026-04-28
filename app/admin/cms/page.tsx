"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootCmsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/cms/home");
  }, [router]);

  return null;
}
