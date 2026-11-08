import { rmSync } from "node:fs";
import { join } from "node:path";

if (!process.env.npm_config_user_agent?.startsWith("pnpm/")) {
  throw new Error("Use pnpm instead");
}

for (const lockfile of ["package-lock.json", "yarn.lock"]) {
  rmSync(join(process.cwd(), lockfile), { force: true });
}
