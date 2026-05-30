import { authMiddleware } from "@clerk/nextjs";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./navigation";
import { NextResponse } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

const clerkMiddleware = authMiddleware({
  publicRoutes: [
    "/",
    "/sign-in",
    "/sign-up",
    "/pricing",
    "/help",
    "/(en|zh|ja|ko|es|fr|de)",
    "/(en|zh|ja|ko|es|fr|de)/sign-in",
    "/(en|zh|ja|ko|es|fr|de)/sign-up",
    "/(en|zh|ja|ko|es|fr|de)/pricing",
    "/(en|zh|ja|ko|es|fr|de)/help",
  ],
  afterAuth(_auth, req) {
    // API routes: Clerk sets auth cookies, skip i18n
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return;
    }
    // Web pages: apply i18n locale routing
    return intlMiddleware(req);
  },
});

export default function middleware(args: Parameters<typeof clerkMiddleware>[0]) {
  try {
    return clerkMiddleware(args);
  } catch (error) {
    // Clerk init failed (wrong keys / network) → fall back to i18n only
    console.error("Middleware: Clerk auth failed, falling back to i18n-only", error);
    const { request } = args;

    // For API routes, pass through without auth
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.next();
    }

    // For web routes, still apply locale routing
    return intlMiddleware(request);
  }
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
