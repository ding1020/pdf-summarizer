"use client";

// ── Clerk DISABLED until SSL issued for clerk.pdfsum.com ──
// Clerk SDK connects to clerk.pdfsum.com, which has no SSL certificate yet
// (DKIM DNS records pending). Any Clerk initialization crashes the page.
//
// TODO: Once Clerk SSL is active, restore ClerkProvider:
//   import { ClerkProvider } from "@clerk/nextjs";
//   return <ClerkProvider>{children}</ClerkProvider>;

export default function ClientClerkProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
