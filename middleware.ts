import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./navigation";

// ── i18n middleware ──
// NOTE: clerkMiddleware is intentionally NOT included here.
// The custom domain clerk.pdfsum.com has verified DNS but its SSL cert is still Pending.
// Adding clerkMiddleware here would crash EVERY page request in Edge Runtime.
//
// Clerk authentication is handled purely client-side via dynamic imports in:
//   - ClientClerkProvider.tsx (ssr: false)
//   - Navigation.tsx → AuthButtonsClient (dynamic, ssr: false)
//   - Sign-in/Sign-up pages (already client components)
//
// TODO: Once clerk.pdfsum.com SSL is Active (green check), re-enable:
//   import { clerkMiddleware } from "@clerk/nextjs/server";
//   export default clerkMiddleware((auth) => (req) => intlMiddleware(req), { ... });

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
