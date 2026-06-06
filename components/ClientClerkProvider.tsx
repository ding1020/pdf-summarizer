"use client";

import { ClerkProvider } from "@clerk/nextjs";

// ClerkProvider MUST always wrap children — never conditionally render it.
// Clerk handles SSR hydration natively, so no manual mount trick is needed.
// During SSR, Clerk hooks return safe defaults until JS hydrates on client.
export default function ClientClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <div suppressHydrationWarning>
        {children}
      </div>
    </ClerkProvider>
  );
}
