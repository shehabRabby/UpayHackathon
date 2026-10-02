import "dotenv/config";
import { defineConfig } from "@prisma/config";
import { externalAuthEnums, externalAuthTables } from "./prisma/external-auth";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in .env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { seed: "tsx prisma/seed.ts" },
  experimental: { externalTables: true },
  tables: { external: externalAuthTables },
  enums: { external: externalAuthEnums },
  datasource: {
    // Prisma 7 uses a single CLI URL; use the session pooler for schema changes.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
