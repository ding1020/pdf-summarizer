"use client";

import React, { Component, ReactNode, useState, useEffect } from "react";
import dynamic from "next/dynamic";

// ── Clerk-specific Error Boundary ──
// If clerk.pdfsum.com has no SSL (DNS pending), Clerk SDK crashes.
// This boundary catches it and renders the page WITHOUT auth (read-only mode).
interface ClerkErrorState {
  hasError: boolean;
}
interface ClerkErrorProps {
  children: ReactNode;
}

class ClerkErrorBoundary extends Component<ClerkErrorProps, ClerkErrorState> {
  constructor(props: ClerkErrorProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): Partial<ClerkErrorState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[ClerkProvider] Clerk SDK failed to load — rendering page without auth:", error.message);
  }

  render() {
    if (this.state.hasError) {
      // Render children directly without Clerk — page works but auth features are disabled
      return <div suppressHydrationWarning>{this.props.children}</div>;
    }
    return this.props.children;
  }
}

// Dynamically import ClerkProvider — if clerk.pdfsum.com SSL is broken,
// the dynamic import will fail at runtime and ErrorBoundary catches it.
// Using ssr:false to avoid SSR crash when Clerk domain is unreachable.
const DynamicClerkProvider = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.ClerkProvider),
  {
    ssr: false,
    loading: () => null, // render nothing during load — no flash
  }
);

export default function ClientClerkProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // During SSR and before hydration, render children without Clerk wrapper
  // (prevents SSR crash from Clerk SDK init)
  if (!mounted) {
    return <div suppressHydrationWarning>{children}</div>;
  }

  return (
    <ClerkErrorBoundary>
      <DynamicClerkProvider>
        <div suppressHydrationWarning>
          {children}
        </div>
      </DynamicClerkProvider>
    </ClerkErrorBoundary>
  );
}
