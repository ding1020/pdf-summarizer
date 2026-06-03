"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useEffect, useState } from "react";

// Key insight: ClerkProvider MUST always wrap children.
// Conditional rendering (only after mount) causes useUser() to
// permanently return { isLoaded: false } because no Clerk context exists.
// Clerk handles SSR hydration natively — no manual mount trick needed.
export default function ClientClerkProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always wrap with ClerkProvider. During SSR, the provider still
  // functions correctly — Clerk hooks return safe defaults until
  // the JS bundle hydrates on the client.
  return (
    <ClerkProvider>
      <div suppressHydrationWarning>
        {children}
      </div>
    </ClerkProvider>
  );
}
