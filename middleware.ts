import { clerkMiddleware } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./navigation";

const intlMiddleware = createMiddleware(routing);

// clerkMiddleware provides auth context headers;
// intlMiddleware handles locale detection and routing.
export default clerkMiddleware(async (_auth, req) => {
  return intlMiddleware(req);
});

export const config = {
  matcher: [
    // Match all non-static, non-api paths for i18n + Clerk auth
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
