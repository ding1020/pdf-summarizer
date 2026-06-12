"use client";

import ClientClerkProvider from "./ClientClerkProvider";

export default function ClerkWrapper({ children }: { children: React.ReactNode }) {
  return <ClientClerkProvider>{children}</ClientClerkProvider>;
}
