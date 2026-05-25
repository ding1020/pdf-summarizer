"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useState, useEffect, ReactNode } from "react";

interface SafeClerkProviderProps {
  children: ReactNode;
  publishableKey?: string;
}

export default function SafeClerkProvider({ children, publishableKey }: SafeClerkProviderProps) {
  const [isClerkReady, setIsClerkReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Check if Clerk can initialize
    const checkClerk = async () => {
      if (!publishableKey || publishableKey.includes("test_")) {
        // Use test key or no key - try to initialize but don't block on failure
        console.log("Clerk: Using test configuration");
      }

      // Give Clerk 3 seconds to initialize
      const timer = setTimeout(() => {
        setIsClerkReady(true);
      }, 3000);

      // Listen for Clerk ready event
      const handleClerkReady = () => {
        clearTimeout(timer);
        setIsClerkReady(true);
      };

      window.addEventListener("clerkready", handleClerkReady);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("clerkready", handleClerkReady);
      };
    };

    checkClerk();
  }, [publishableKey]);

  if (hasError || !publishableKey) {
    // Clerk not configured, render children without Clerk
    console.log("Clerk: Not configured, rendering without auth");
    return <>{children}</>;
  }

  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  );
}
