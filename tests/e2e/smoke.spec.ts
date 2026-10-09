import { expect, test } from "@playwright/test";

test("the app answers in French", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { name: "GlucoPerso" })).toBeVisible();
});
