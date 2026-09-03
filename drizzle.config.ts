import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./api/_lib/schema.ts",
  out: "./api/_lib/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
