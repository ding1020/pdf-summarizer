"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useEffect, useState } from "react";

// Wraps ClerkProvider to avoid SSR hydration issues with Clerk v7
// Renders children without auth during SSR, applies ClerkProvider after mount
export default function ClientClerkProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR + first render: render without Clerk (prevents flash + hydration mismatch)
  if (!mounted) {
    return <>{children}</>;
  }

  // Mounted on client: wrap with real ClerkProvider
  // Clerk v7 handles missing keys gracefully (renders without auth)
  return <ClerkProvider>{children}</ClerkProvider>;
}
