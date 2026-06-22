import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 configuration — provides connection URLs for CLI commands
// (migrate, generate, studio, etc.)
// The PrismaClient runtime uses its own adapter (see lib/db.ts).

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
