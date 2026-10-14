import { expect, test } from "@playwright/test";

test("the learn page explains the table and offers the tutorial", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "Learn to play" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play the tutorial" })).toBeVisible();
});
