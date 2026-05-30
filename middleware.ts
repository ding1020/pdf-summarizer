import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Minimal middleware: just i18n pass-through
// Clerk auth is handled client-side via ClientClerkProvider
// API auth uses @clerk/nextjs auth() which reads cookies directly
export default function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|_vercel|.*\\..*).*)",
  ],
};
