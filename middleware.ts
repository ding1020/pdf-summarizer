import { clerkMiddleware } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./navigation";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

export default clerkMiddleware(async (auth, req) => {
  // API routes: pass through, Clerk auth context is available
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Web pages: apply i18n locale routing
  return intlMiddleware(req as NextRequest);
});

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
