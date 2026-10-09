import { type Page, test } from "@playwright/test";
import { registerAndOnboard } from "../e2e/helpers";

/**
 * Visual self-review: captures every screen at 390×844 in light and dark.
 * Run with `npm run screens`, then look at ./screenshots.
 */
const SCHEMES = ["light", "dark"] as const;

async function shoot(page: Page, name: string) {
  for (const colorScheme of SCHEMES) {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.waitForTimeout(250);
    await page.screenshot({ path: `screenshots/${name}-${colorScheme}.png`, fullPage: true });
  }
}

test("public screens", async ({ page }) => {
  for (const [name, path] of [
    ["01-connexion", "/connexion"],
    ["02-inscription", "/inscription"],
    ["03-recuperation", "/recuperation"],
  ] as const) {
    await page.goto(path);
    await shoot(page, name);
  }
});

test("app screens", async ({ page }) => {
  await registerAndOnboard(page, { name: "Léa" });
  for (const [name, path] of [
    ["10-accueil", "/"],
    ["50-moi", "/moi"],
  ] as const) {
    await page.goto(path);
    await shoot(page, name);
  }

  await page.goto("/repas/nouveau");
  await shoot(page, "20-saisie-vide");
  await page.getByLabel("Qu'est-ce qu'on mange ?").fill("Raclette");
  for (const key of ["6", "5"]) await page.getByRole("button", { name: key, exact: true }).click();
  await page.getByRole("button", { name: /Absorption lente/ }).click();
  await shoot(page, "21-saisie-remplie");
});
