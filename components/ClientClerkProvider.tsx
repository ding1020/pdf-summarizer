"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export default function ClientClerkProvider({ children }: { children: React.ReactNode }) {
  const [clerkError, setClerkError] = useState(false);

  // If Clerk SDK fails to initialize (e.g., SSL pending), degrade gracefully
  if (clerkError) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider>
      <ClerkErrorBoundary onError={() => setClerkError(true)}>
        {children}
      </ClerkErrorBoundary>
    </ClerkProvider>
  );
}

// Inner error boundary — catches Clerk init failures without crashing the page
function ClerkErrorBoundary({ children, onError }: {
  children: React.ReactNode;
  onError: () => void;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Listen for unhandled promise rejections from Clerk
    const handler = (e: PromiseRejectionEvent) => {
      if (
        e.reason?.message?.includes("clerk") ||
        e.reason?.message?.includes("fetch") ||
        e.reason?.message?.includes("network") ||
        e.reason?.name === "TypeError"
      ) {
        setHasError(true);
        onError();
      }
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, [onError]);

  if (hasError) return null;
  return <>{children}</>;
}
