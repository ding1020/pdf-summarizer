import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./navigation";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

export default function middleware(req: NextRequest) {
  // API routes: pass through
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  // Web pages: apply i18n locale routing
  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
