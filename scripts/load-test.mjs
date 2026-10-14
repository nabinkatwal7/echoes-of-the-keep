// Small load test: signs in, then hits pages and APIs concurrently and reports latency percentiles.
// Usage: node scripts/load-test.mjs [baseUrl] [concurrency] [requestsPerPath]
// Needs the demo data (pnpm exec tsx scripts/demo-seed.ts) and a running server.
const base = process.argv[2] ?? "http://localhost:3000";
const concurrency = Number(process.argv[3] ?? 10);
const perPath = Number(process.argv[4] ?? 50);

async function signIn() {
  const csrfRes = await fetch(`${base}/api/auth/csrf`);
  const cookies = csrfRes.headers.getSetCookie().map((c) => c.split(";")[0]);
  const { csrfToken } = await csrfRes.json();
  const res = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookies.join("; ") },
    body: new URLSearchParams({ csrfToken, username: "demo_dm", password: "demo-password-1", json: "true" }),
  });
  return [...cookies, ...res.headers.getSetCookie().map((c) => c.split(";")[0])].join("; ");
}

const cookie = await signIn();
const home = await fetch(`${base}/campaigns`, { headers: { cookie }, redirect: "manual" });
const html = await home.text();
const campaignId = /\/campaigns\/([a-z0-9]{20,})/.exec(html)?.[1];
if (!campaignId) throw new Error("Could not find the demo campaign. Run: pnpm exec tsx scripts/demo-seed.ts");

const paths = ["/", "/learn", "/wiki/spells", "/wiki/classes", "/api/health", `/campaigns/${campaignId}`, `/campaigns/${campaignId}/table`, `/campaigns/${campaignId}/combat`, `/campaigns/${campaignId}/dm`];

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
const results = [];
for (const path of paths) {
  const times = [];
  let failures = 0;
  let next = 0;
  async function worker() {
    while (next < perPath) {
      next++;
      const t = performance.now();
      try {
        const res = await fetch(base + path, { headers: { cookie }, redirect: "manual" });
        await res.arrayBuffer();
        if (res.status >= 400) failures++;
      } catch {
        failures++;
      }
      times.push(performance.now() - t);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  times.sort((a, b) => a - b);
  results.push({ path: path.replace(campaignId, ":id"), p50: Math.round(pct(times, 50)), p95: Math.round(pct(times, 95)), max: Math.round(times.at(-1)), failures });
}
console.table(results);
const bad = results.filter((r) => r.failures > 0 || r.p95 > 1500);
if (bad.length) {
  console.error("Slow or failing paths:", bad.map((b) => b.path).join(", "));
  process.exit(1);
}
