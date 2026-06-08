import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./navigation";

// ── i18n-ONLY middleware ──
// Clerk is completely disabled until clerk.pdfsum.com SSL is issued.
// The Clerk SDK crashes in Edge Runtime even with dynamic import + try/catch
// when the custom domain is unreachable.
//
// TODO: Once Clerk SSL is active, restore:
//   import { clerkMiddleware } from "@clerk/nextjs/server";
//   export default clerkMiddleware((auth, req) => createMiddleware(routing)(req));

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
