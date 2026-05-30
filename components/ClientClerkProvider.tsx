"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";

export default function ClientClerkProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [clerkError, setClerkError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // During SSR: render children without Clerk context
    // This prevents "UserContext not found" error
    return <>{children}</>;
  }

  if (clerkError) {
    // Clerk failed to initialize — render without Clerk
    return <>{children}</>;
  }

  try {
    return <ClerkProvider>{children}</ClerkProvider>;
  } catch {
    return <>{children}</>;
  }
}
