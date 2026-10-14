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

// WCAG 1.4.10 Reflow: at 320 CSS px (400% zoom on a 1280 px screen) nothing should need sideways scrolling.
// 1.4.4 Resize text: 640 px is 200% zoom on 1280 px.
for (const width of [320, 640]) {
  test(`pages fit without sideways scrolling at ${width}px wide`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const wide: string[] = [];
    for (const path of ["/", "/learn", "/wiki", "/wiki/spells", "/login", "/register", "/legal"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) wide.push(`${path} overflows by ${overflow}px`);
    }
    expect(wide, wide.join("\n")).toEqual([]);
  });
}

// 1.4.12 Text spacing: increasing line, paragraph, letter and word spacing must not hide or clip content.
test("text spacing overrides do not hide content or add sideways scrolling", async ({ page }) => {
  for (const path of ["/", "/learn", "/legal"]) {
    await page.goto(path);
    await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} overflows with text spacing`).toBeLessThanOrEqual(1);
    await expect(page.locator("main, #main").first()).toBeVisible();
  }
});

// Windows high contrast mode is emulated with forced colors. Interactive controls must still be visible and axe must stay clean.
test("forced colors mode keeps controls visible and passes axe", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  for (const path of ["/", "/login", "/learn"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => v.id), path).toEqual([]);
  }
  await page.goto("/login");
  const box = await page.getByRole("button", { name: /sign in|enter|log in/i }).first().boundingBox();
  expect(box && box.width > 20 && box.height > 20).toBe(true);
});

// 2.4.1 / 2.4.7: the first Tab stop is the skip link, it is visible when focused, and it moves focus to the content.
test("keyboard: the skip link is first, visible, and works", async ({ page }) => {
  await page.goto("/learn");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: /skip to content/i });
  await expect(skip).toBeFocused();
  // the link slides in with a short transition, so wait for it to settle on screen
  await expect.poll(async () => (await skip.boundingBox())?.y ?? -100).toBeGreaterThanOrEqual(0);
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

// The character sheet, on a desktop and on a phone (where the hit point bar is pinned to the bottom of the screen).
test("the character sheet passes axe and fits a phone without sideways scrolling", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/username/i).fill("demo_player");
  await page.getByLabel(/password/i).fill("demo-password-1");
  await page.getByRole("button", { name: /sign in|enter|log in/i }).click();
  await page.waitForURL(/\/characters/, { timeout: 10_000 }).catch(() => {});
  test.skip(!/\/characters/.test(page.url()), "demo data is not seeded");
  const href = await page.locator('a[href^="/characters/"]:not([href="/characters/new"])').first().getAttribute("href");
  test.skip(!href, "no hero to scan");

  await page.goto(href!);
  let results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(href!);
  await expect(page.getByRole("group", { name: "Quick hit point changes" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
});

// Solo play, through the real screens: start a game, move the story along, scan each page, then delete the game.
test("solo play: create a game, read the story, and the pages pass axe", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/username/i).fill("demo_player");
  await page.getByLabel(/password/i).fill("demo-password-1");
  await page.getByRole("button", { name: /sign in|enter|log in/i }).click();
  await page.waitForURL(/\/characters/, { timeout: 10_000 }).catch(() => {});
  test.skip(!/\/characters/.test(page.url()), "demo data is not seeded");

  const scan = async (label: string) => {
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`), label).toEqual([]);
  };

  await page.goto("/solo");
  await scan("/solo");
  await page.getByRole("button", { name: /^begin$/i }).click();
  await page.waitForURL(/\/campaigns\/[^/]+\/solo/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /what next/i })).toBeVisible();
  await scan("solo game page");

  await page.getByRole("button", { name: /begin the story/i }).click();
  await expect(page.getByText(/by dusk|word reaches|finds the party/i).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /face the first foes/i }).click();
  await page.waitForURL(/\/combat/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Combat", exact: true })).toBeVisible();
  // the computer plays its turns by itself: if it is the player's turn first, end it and watch the others act
  const endTurn = page.getByRole("button", { name: /^end turn$/i });
  await page.waitForTimeout(1500);
  if (await endTurn.isVisible()) await endTurn.click();
  await expect(page.getByText(/ends their turn/i).first()).toBeVisible({ timeout: 30_000 });
  await scan("combat page in a solo fight");

  page.once("dialog", (d) => void d.accept());
  await page.goto(page.url().replace(/\/combat.*/, "/solo"));
  await page.getByRole("button", { name: /delete this game/i }).click();
  await page.waitForURL(/\/solo$/, { timeout: 15_000 });
});
