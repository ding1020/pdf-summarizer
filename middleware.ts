import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./navigation";

const intlMiddleware = createMiddleware(routing);

// ── Clerk-resilient middleware ──
// When clerk.pdfsum.com has no SSL (DKIM pending), clerkMiddleware() throws
// and takes down the ENTIRE site ("Application error: client-side exception").
// This wrapper catches that and falls back to i18n-only routing.
const clerkHandler = clerkMiddleware(async (_auth, req) => {
  return intlMiddleware(req);
});

export default async function middleware(request: NextRequest) {
  try {
    return await clerkHandler(request);
  } catch (err) {
    // Clerk unavailable (custom domain SSL not issued yet)
    // → skip auth, serve page as public/read-only
    console.warn("[middleware] Clerk SDK error — serving without auth:", err);
    return intlMiddleware(request);
  }
}

export const config = {
  matcher: [
    // Match all non-static, non-api paths for i18n + Clerk auth
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
