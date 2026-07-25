import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./navigation";
import { verifyTokenEdge } from "./lib/auth-token-edge";
import { setLoggerRequestId, logger } from "@/lib/logger";
import { generateCsrfToken } from "@/lib/csrf";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const handleI18n = createIntlMiddleware(routing);

/**
 * Generate a cryptographically random nonce for CSP.
 * Uses Web Crypto API (Edge Runtime compatible), returns base64url string.
 */
function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Encode as base64url (Edge‑safe, no Node.js Buffer)
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Build Content-Security-Policy header with dynamic nonce.
 * Uses 'strict-dynamic' so third-party analytics (Clarity) can inject
 * their scripts without needing 'unsafe-inline'.
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'nonce-${nonce}' https://*.clarity.ms https://*.googletagmanager.com`,
    `script-src-elem 'self' 'unsafe-inline' 'nonce-${nonce}' https://*.clarity.ms https://zz.bdstatic.com http://push.zhanzhang.baidu.com https://*.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.google-analytics.com",
    "font-src 'self' data:",
    "connect-src 'self' https://api.deepseek.com https://api.groq.com https://api.siliconflow.cn https://api.creem.io https://api.resend.com https://api.stripe.com https://*.sentry.io https://*.google-analytics.com https://*.analytics.google.com",
    "frame-src 'self' https://checkout.creem.io https://checkout.stripe.com",
    "frame-ancestors 'none'",
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/**
 * Middleware protects two categories of routes:
 *
 * 1. Page routes (/dashboard/*)
 *    → Unauthenticated users redirected to /sign-in
 *    → Authenticated users pass through to i18n handler
 *
 * 2. Write API routes (listed in WRITE_API_PATTERNS)
 *    → No __auth_token cookie → immediate 401
 *    → Token present → passes through (API layer does full verification)
 *
 * ⚠️  INTENTIONALLY OPEN (no middleware protection):
 *    /api/summarize — Guests must be able to paste content and get AI summaries
 *                      (this is the core acquisition funnel: preview → sign up)
 *    /api/upload     — Guests must be able to upload PDFs for preview
 *                      (handles guest/signed-in branching internally)
 *    /api/v1/*       — Developer API uses API-key auth, not cookie-based
 *
 * These routes handle their own auth/guest logic internally.
 */
export default async function middleware(request: NextRequest): Promise<NextResponse | Response> {
  try {
    // Generate request ID for end-to-end tracing
    const requestId = crypto.randomUUID();
    setLoggerRequestId(requestId);
    const pathname = request.nextUrl.pathname;

  // ── 0. CSP nonce (reserved for future strict-dynamic support) ──
  // NOTE: strict-dynamic requires Next.js native nonce injection (not yet implemented).
  // For now, use 'unsafe-inline' which is compatible with all Next.js scripts.
  const nonce = generateNonce();

  // ── 1. Protect dashboard & authenticated pages ──
  const PROTECTED_PAGES = ["/dashboard", "/admin"];
  const isProtectedPage = PROTECTED_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isProtectedPage) {
    const token = request.cookies.get("__auth_token")?.value;
    if (!token || !(await verifyTokenEdge(token))) {
      const signInUrl = new URL(`/${routing.defaultLocale}/sign-in`, request.url);
      signInUrl.searchParams.set("redirect", pathname);
      const redirectResponse = NextResponse.redirect(signInUrl);
      redirectResponse.headers.set("X-Request-Id", requestId);
      return redirectResponse;
    }

    // Fire-and-forget activity tracking (update lastActiveAt for win-back)
    // Never block the response — errors are silently ignored.
    const trackUrl = new URL("/api/track/activity", request.url);
    fetch(trackUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
    }).catch(() => {});
  }

  // ── 2. Protect write-sensitive API routes (AUTHENTICATED ONLY) ──
  // NOTE: /api/summarize and /api/upload are INTENTIONALLY NOT in this list
  // — guests need them for the core acquisition funnel (upload → preview → sign up).
  const WRITE_API_PATTERNS = [
    "/api/documents",
    "/api/account",
    "/api/payment",
    "/api/api-keys",
    "/api/admin",
  ];

  if (
    WRITE_API_PATTERNS.some((p) => pathname.startsWith(p)) &&
    request.method !== "GET"
  ) {
    const token = request.cookies.get("__auth_token")?.value;
    if (!token || !(await verifyTokenEdge(token))) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please sign in." }),
        { status: 401, headers: { "Content-Type": "application/json", "X-Request-Id": requestId } },
      );
    }
  }

  // ── API routes: skip i18n, let the route handler respond directly ──
  if (pathname.startsWith("/api/")) {
    const apiResponse = NextResponse.next();
    apiResponse.headers.set("X-Request-Id", requestId);
    return apiResponse;
  }

  // ── 3. UTM tracking: persist UTM params in cookies for 30 days ──
  const response = await handleI18n(request);
  response.headers.set("X-Request-Id", requestId);
  const utmParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  for (const param of utmParams) {
    const value = request.nextUrl.searchParams.get(param);
    if (value) {
      response.cookies.set(`__${param}`, value, {
        httpOnly: false,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
        secure: process.env.NODE_ENV === "production",
      });
    }
  }

  response.headers.set("Content-Security-Policy", buildCsp(nonce));

  // Pass nonce to layout via short-lived httpOnly cookie
  response.cookies.set("__csp_nonce", nonce, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 60, // 1 minute — just long enough for the page render
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  // CSRF protection: set a readable cookie on EVERY page GET (except API/static)
  // so the client always has a CSRF token to send back as X-CSRF-Token on POST.
  // Previously we only set it on auth pages, which broke uploads for users who
  // landed directly on the dashboard without visiting a sign-in page first.
  const isApiOrStatic =
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    /\.[a-zA-Z0-9]+$/.test(pathname); // any file with an extension
  if (request.method === "GET" && !isApiOrStatic) {
    const csrfToken = request.cookies.get("__csrf_token")?.value || generateCsrfToken();
    response.cookies.set("__csrf_token", csrfToken, {
      httpOnly: false, // Must be readable by client JS
      sameSite: "strict",
      maxAge: 86400, // 24h
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // These are also set in next.config.mjs static headers; middleware takes precedence
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
  } catch (error) {
    logger.error(
      "[Middleware] Unhandled error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

// Match both page routes and protected API routes
export const config = {
  matcher: [
    // Page routes (exclude static assets, _next, api root pattern)
    "/((?!api|_next|_vercel|.*\\..*).*)",
    // Explicitly protect these API paths
    "/api/documents/:path*",
    "/api/account/:path*",
    "/api/payment/:path*",
    "/api/api-keys/:path*",
    "/api/admin/:path*",
  ],
};
