"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

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

// ClerkProvider MUST always wrap children — never conditionally render it.
// Clerk handles SSR hydration natively, so no manual mount trick is needed.
// During SSR, Clerk hooks return safe defaults until JS hydrates on client.
export default function ClientClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkErrorBoundary>
      <ClerkProvider>
        <div suppressHydrationWarning>
          {children}
        </div>
      </ClerkProvider>
    </ClerkErrorBoundary>
  );
}
