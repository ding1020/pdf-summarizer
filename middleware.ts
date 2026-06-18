import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./navigation";
import { verifyTokenEdge } from "./lib/auth-token-edge";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const handleI18n = createIntlMiddleware(routing);

/**
 * Middleware protects two categories of routes:
 *
 * 1. Page routes (/dashboard/*)
 *    → Unauthenticated users redirected to /sign-in
 *    → Authenticated users pass through to i18n handler
 *
 * 2. Write API routes (/api/summarize/*, PATCH /api/documents/*)
 *    → No __auth_token cookie → immediate 401
 *    → Token present → passes through (API layer does full verification)
 */
export default async function middleware(request: NextRequest): Promise<NextResponse | Response> {
  const pathname = request.nextUrl.pathname;

  // ── 1. Protect dashboard & authenticated pages ──
  const PROTECTED_PAGES = ["/dashboard", "/admin"];
  const isProtectedPage = PROTECTED_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isProtectedPage) {
    const token = request.cookies.get("__auth_token")?.value;
    if (!token || !(await verifyTokenEdge(token))) {
      const signInUrl = new URL(`/${routing.defaultLocale}/sign-in`, request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  // ── 2. Protect write-sensitive API routes (verify token validity) ──
  if (
    (pathname.startsWith("/api/summarize") && !pathname.startsWith("/api/summarize/stream")) ||
    (pathname.startsWith("/api/documents") && request.method !== "GET")
  ) {
    const token = request.cookies.get("__auth_token")?.value;
    if (!token || !(await verifyTokenEdge(token))) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please sign in." }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // ── API routes: skip i18n, let the route handler respond directly ──
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ── Pass through i18n routing ──
  return handleI18n(request);
}

// Match both page routes and protected API routes
export const config = {
  matcher: [
    // Page routes (exclude static assets, _next, api root pattern)
    "/((?!api|_next|_vercel|.*\\..*).*)",
    // Explicitly protect these API paths
    "/api/summarize/:path*",
    "/api/documents/:path*",
  ],
};
