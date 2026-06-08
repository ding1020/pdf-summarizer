import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./navigation";

const intlMiddleware = createMiddleware(routing);

// ── Dynamic Clerk middleware (lazy-load to avoid init crashes) ──
// When clerk.pdfsum.com has no SSL (DKIM pending), the Clerk SDK may crash
// during module import or initialization. This dynamic import pattern ensures
// that the site works even when Clerk is completely unavailable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let clerkHandler: any = null;
let clerkLoadFailed = false;

async function getClerkHandler() {
  if (clerkHandler) return clerkHandler;
  if (clerkLoadFailed) return null;

  try {
    // Dynamic import — if Clerk SDK crashes during init, we catch it here
    const { clerkMiddleware } = await import("@clerk/nextjs/server");
    clerkHandler = clerkMiddleware(async (_auth, req) => {
      const res = intlMiddleware(req);
      return res;
    });
    return clerkHandler;
  } catch (err: any) {
    clerkLoadFailed = true;
    console.warn(
      "[middleware] Clerk SDK unavailable (SSL/DNS pending) — site runs without auth:",
      err?.message || err
    );
    return null;
  }
}

export default async function middleware(request: NextRequest) {
  const handler = await getClerkHandler();

  if (!handler) {
    // Clerk not available → i18n routing only (site works, no auth)
    return intlMiddleware(request);
  }

  try {
    return await handler(request);
  } catch (err: any) {
    console.warn("[middleware] Clerk handler threw — falling back to i18n:", err?.message || err);
    return intlMiddleware(request);
  }
}

export const config = {
  matcher: [
    // Match all non-static, non-api paths for i18n + Clerk auth
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
