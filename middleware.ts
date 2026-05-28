import { authMiddleware } from "@clerk/nextjs";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./navigation";

const intlMiddleware = createIntlMiddleware(routing);

export default authMiddleware({
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

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
