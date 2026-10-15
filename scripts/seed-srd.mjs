// Seeds only the free-rules (SRD 5.1) subset and removes anything else from the database.
// A plain Node script, so it behaves the same on Windows, macOS and Linux (the cross-env wrapper broke on paths with spaces).
import { spawnSync } from "node:child_process";

const result = spawnSync("pnpm", ["exec", "prisma", "db", "seed"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, CONTENT_LICENSE_MODE: "SRD_ONLY" },
});
process.exit(result.status ?? 1);
