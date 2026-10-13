/**
 * One JSON object per line, so a log collector can index it. Never pass passwords, tokens or full request bodies.
 * Set LOG_LEVEL=debug to see debug lines; the default is info.
 */
type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const threshold = () => ORDER[(process.env.LOG_LEVEL as Level) in ORDER ? (process.env.LOG_LEVEL as Level) : "info"];

export function log(level: Level, message: string, fields: Record<string, unknown> = {}) {
  if (ORDER[level] < threshold()) return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export const logger = {
  debug: (m: string, f?: Record<string, unknown>) => log("debug", m, f),
  info: (m: string, f?: Record<string, unknown>) => log("info", m, f),
  warn: (m: string, f?: Record<string, unknown>) => log("warn", m, f),
  error: (m: string, f?: Record<string, unknown>) => log("error", m, f),
};
