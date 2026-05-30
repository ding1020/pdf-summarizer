import { clerkMiddleware } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./navigation";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

// Clerk v7 + Next.js 15: clerkMiddleware decorates all requests with auth context
// so that auth() works in API routes and server pages
export default clerkMiddleware(async (_auth, req) => {
  // API routes: Clerk auth context already injected, just pass through
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  // Web pages: apply i18n locale routing (Clerk auth available for SSR pages)
  return intlMiddleware(req as NextRequest);
});

export const config = {
  // Match all paths except Next.js internals and static files
  // API routes included so clerkMiddleware provides auth context
  matcher: [
    "/((?!_next|_vercel|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
