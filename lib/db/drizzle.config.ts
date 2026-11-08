import { defineConfig } from "drizzle-kit";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import path from "path";

const envPath = path.join(__dirname, "../../.env");
if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: `${__dirname.replace(/\\/g, "/")}/src/schema/*.ts`,
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
