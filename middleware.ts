import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./navigation";

export default createIntlMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
