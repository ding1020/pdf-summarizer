import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./navigation";
import { verifyTokenEdge } from "./lib/auth-token-edge";
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
 * Uses 'strict-dynamic' so third-party analytics (GTM, Clarity) can inject
 * their scripts without needing 'unsafe-inline'.
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'strict-dynamic' 'nonce-${nonce}' https://www.googletagmanager.com https://*.clarity.ms`,
    `script-src-elem 'self' 'strict-dynamic' 'nonce-${nonce}' https://www.googletagmanager.com https://*.clarity.ms`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.deepseek.com https://api.groq.com https://api.siliconflow.cn https://api.creem.io https://api.resend.com https://www.google-analytics.com https://region1.google-analytics.com",
    "frame-src 'self' https://checkout.creem.io",
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
 * 2. Write API routes
 *    → No __auth_token cookie → immediate 401
 *    → Token present → passes through (API layer does full verification)
 */
export default async function middleware(request: NextRequest): Promise<NextResponse | Response> {
  const pathname = request.nextUrl.pathname;

  // ── 0. Generate CSP nonce for all requests ──
  const nonce = generateNonce();

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

  // ── 2. Protect write-sensitive API routes ──
  const WRITE_API_PATTERNS = [
    "/api/summarize",
    "/api/documents",
    "/api/account",
    "/api/payment",
    "/api/api-keys",
  ];

  if (
    WRITE_API_PATTERNS.some((p) => pathname.startsWith(p)) &&
    request.method !== "GET"
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

  // ── 3. Page routes: apply CSP nonce and security headers ──
  const response = await handleI18n(request);
  response.headers.set("Content-Security-Policy", buildCsp(nonce));

  // Pass nonce to layout via short-lived httpOnly cookie
  response.cookies.set("__csp_nonce", nonce, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 60, // 1 minute — just long enough for the page render
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  // These are also set in next.config.mjs static headers; middleware takes precedence
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

// Match both page routes and protected API routes
export const config = {
  matcher: [
    // Page routes (exclude static assets, _next, api root pattern)
    "/((?!api|_next|_vercel|.*\\..*).*)",
    // Explicitly protect these API paths
    "/api/summarize/:path*",
    "/api/documents/:path*",
    "/api/account/:path*",
    "/api/payment/:path*",
    "/api/api-keys/:path*",
  ],
};
