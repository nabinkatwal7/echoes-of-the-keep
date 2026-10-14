import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Automated WCAG 2.x A/AA scan of the public pages. Automated tools find roughly a third of real problems,
// so this complements (does not replace) the manual checks in docs/accessibility.md.
const pages = ["/", "/learn", "/wiki", "/login", "/register", "/legal"];

for (const path of pages) {
  test(`no detectable WCAG A/AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(" ")}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}

// Signed-in pages need the demo data: pnpm exec tsx scripts/demo-seed.ts
test.describe("signed-in pages", () => {
  test("no detectable WCAG A/AA violations on the heroes, campaign, table, combat, DM, world and journal pages", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/username/i).fill("demo_dm");
    await page.getByLabel(/password/i).fill("demo-password-1");
    await page.getByRole("button", { name: /sign in|enter|log in/i }).click();
    await page.waitForURL(/\/characters/, { timeout: 10_000 }).catch(() => {});
    test.skip(!/\/characters/.test(page.url()), "demo data is not seeded");

    await page.goto("/campaigns");
    const href = await page.locator('a[href^="/campaigns/"]').first().getAttribute("href");
    test.skip(!href, "no campaign to scan");
    const base = href!.split("?")[0];
    const failures: string[] = [];
    for (const path of ["/characters", "/account", base, `${base}/table`, `${base}/combat`, `${base}/dm`, `${base}/world`, `${base}/journal`]) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      for (const v of results.violations) failures.push(`${path}: ${v.id} (${v.impact}) ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(" ")}`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
});
