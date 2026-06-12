"use client";

import dynamic from "next/dynamic";

// Dynamic import ensures Clerk SDK only loads on client.
// Prevents SSR crash when clerk.pdfsum.com SSL is still Pending.
const ClientClerkProvider = dynamic(
  () => import("./ClientClerkProvider"),
  { ssr: false }
);

export default function ClerkWrapper({ children }: { children: React.ReactNode }) {
  return <ClientClerkProvider>{children}</ClientClerkProvider>;
}
