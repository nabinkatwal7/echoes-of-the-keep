// Database backup: pg_dump in custom format, timestamped, keeping the newest 14. Usage: pnpm backup
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const KEEP = 14;

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (existsSync(".env")) {
    const m = /^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m.exec(readFileSync(".env", "utf8"));
    if (m) return m[1];
  }
  throw new Error("DATABASE_URL is not set (environment or .env)");
}

function pgDump() {
  if (process.env.PG_DUMP) return process.env.PG_DUMP;
  const windows = "C:\\Program Files\\PostgreSQL";
  if (process.platform === "win32" && existsSync(windows)) {
    const versions = readdirSync(windows).filter((v) => /^\d+$/.test(v)).sort((a, b) => Number(b) - Number(a));
    for (const v of versions) {
      const exe = join(windows, v, "bin", "pg_dump.exe");
      if (existsSync(exe)) return exe;
    }
  }
  return "pg_dump";
}

const url = new URL(databaseUrl());
url.searchParams.delete("schema"); // Prisma-only parameter that pg_dump does not understand
const pad = (n) => String(n).padStart(2, "0");
const d = new Date();
const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
mkdirSync("backups", { recursive: true });
const file = join("backups", `dnd-${stamp}.dump`);

const run = spawnSync(pgDump(), ["--format=custom", "--no-owner", "--file", file, url.toString()], { stdio: "inherit" });
if (run.error || run.status !== 0) {
  console.error("Backup failed:", run.error?.message ?? `pg_dump exited with ${run.status}`);
  process.exit(1);
}
console.log(`Wrote ${file} (${(statSync(file).size / 1024).toFixed(0)} KB)`);

const dumps = readdirSync("backups").filter((f) => /^dnd-.*\.dump$/.test(f)).sort();
for (const old of dumps.slice(0, Math.max(0, dumps.length - KEEP))) unlinkSync(join("backups", old));
