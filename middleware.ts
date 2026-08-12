import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./navigation";
import { verifyTokenEdge } from "./lib/auth-token-edge";
import { setLoggerRequestId, logger } from "@/lib/logger";
import { generateCsrfToken } from "@/lib/csrf";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const handleI18n = createIntlMiddleware(routing);

function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://*.clarity.ms https://*.googletagmanager.com`,
    `script-src-elem 'self' 'nonce-${nonce}' 'strict-dynamic' https://*.clarity.ms https://zz.bdstatic.com http://push.zhanzhang.baidu.com https://*.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.google-analytics.com",
    "font-src 'self' data:",
    "connect-src 'self' https://api.deepseek.com https://api.groq.com https://api.siliconflow.cn https://api.creem.io https://api.resend.com https://*.sentry.io https://*.google-analytics.com https://*.analytics.google.com",
    "frame-src 'self' https://checkout.creem.io",
    "frame-ancestors 'none'",
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export default async function middleware(request: NextRequest): Promise<NextResponse | Response> {
  try {
    const requestId = crypto.randomUUID();
    setLoggerRequestId(requestId);
    const pathname = request.nextUrl.pathname;
    const nonce = generateNonce();

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

      const trackUrl = new URL("/api/track/activity", request.url);
      fetch(trackUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: request.headers.get("cookie") || "" },
      }).catch(() => {});
    }

    const WRITE_API_PATTERNS = [
      "/api/documents", "/api/account", "/api/payment", "/api/api-keys",
      "/api/admin", "/api/checkout", "/api/customer-portal", "/api/subscription", "/api/feedback",
    ];

    if (WRITE_API_PATTERNS.some((p) => pathname.startsWith(p)) && request.method !== "GET") {
      const token = request.cookies.get("__auth_token")?.value;
      if (!token || !(await verifyTokenEdge(token))) {
        return new Response(
          JSON.stringify({ error: "Unauthorized. Please sign in." }),
          { status: 401, headers: { "Content-Type": "application/json", "X-Request-Id": requestId } },
        );
      }
    }

    if (pathname.startsWith("/api/")) {
      const apiResponse = NextResponse.next();
      apiResponse.headers.set("X-Request-Id", requestId);
      return apiResponse;
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    const i18nResponse = await handleI18n(request);

    i18nResponse.headers.forEach((value, key) => {
      if (!response.headers.has(key)) response.headers.set(key, value);
    });

    i18nResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));

    response.headers.set("X-Request-Id", requestId);

    const utmParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    for (const param of utmParams) {
      const value = request.nextUrl.searchParams.get(param);
      if (value) {
        response.cookies.set(`__${param}`, value, {
          httpOnly: false, sameSite: "lax", maxAge: 30 * 24 * 60 * 60, path: "/",
          secure: process.env.NODE_ENV === "production",
        });
      }
    }

    response.headers.set("Content-Security-Policy", buildCsp(nonce));

    response.cookies.set("__csp_nonce", nonce, {
      httpOnly: true, sameSite: "strict", maxAge: 60, path: "/",
      secure: process.env.NODE_ENV === "production",
    });

    const isApiOrStatic = pathname.startsWith("/api/") || pathname.startsWith("/_next/") ||
      pathname.startsWith("/favicon") || /\.[a-zA-Z0-9]+$/.test(pathname);
    if (request.method === "GET" && !isApiOrStatic) {
      const csrfToken = request.cookies.get("__csrf_token")?.value || generateCsrfToken();
      response.cookies.set("__csrf_token", csrfToken, {
        httpOnly: false, sameSite: "lax", maxAge: 86400, path: "/",
        secure: process.env.NODE_ENV === "production",
      });
    }

    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    return response;
  } catch (error) {
    logger.error("[Middleware] Unhandled error", error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
    "/api/documents/:path*", "/api/account/:path*", "/api/payment/:path*",
    "/api/api-keys/:path*", "/api/admin/:path*", "/api/checkout/:path*",
    "/api/customer-portal/:path*", "/api/subscription/:path*", "/api/feedback/:path*",
  ],
};
