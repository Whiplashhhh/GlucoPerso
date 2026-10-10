import { type Page, expect, test } from "@playwright/test";
import { registerAndOnboard } from "./helpers";

async function tap(page: Page, keys: string[]) {
  for (const key of keys) await page.getByRole("button", { name: key, exact: true }).click();
}

/** Today as "yyyy-MM-dd" in Europe/Paris (the browser and the account timezone). */
function todayInParis() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

test("calendar, meal detail, edit, delete with undo and search", async ({ page }) => {
  await registerAndOnboard(page, { name: "Léa" });

  // Log a meal.
  await page.goto("/repas/nouveau");
  await page.getByLabel("Qu'est-ce qu'on mange ?").fill("Tartiflette");
  await tap(page, ["8", "0"]);
  await page.getByRole("button", { name: "Utiliser" }).click();
  await page.getByRole("button", { name: /Sport/ }).click();
  await page.getByLabel("Notes").fill("Chez mamie, part généreuse");
  await page.getByRole("button", { name: "Enregistrer le repas" }).click();
  await page.waitForURL(/ajout=/, { waitUntil: "commit" });

  // Calendar: a pending marker on today, and the day's list below.
  await page.getByRole("link", { name: "Calendrier" }).click();
  await page.waitForURL(/\/calendrier/);
  const today = page.locator(`[data-day="${todayInParis()}"]`);
  await expect(today).toHaveAttribute("aria-current", "date");
  await expect(today).toHaveAccessibleName(/1 repas/);
  await expect(today.getByRole("img", { name: "En attente de ton retour" })).toBeVisible();
  await today.click();
  await expect(page).toHaveURL(new RegExp(`jour=${todayInParis()}`));
  const row = page.getByRole("link", { name: /Tartiflette/ });
  await expect(row).toContainText("80 g");

  // Another month is empty, then back to today.
  await page.getByRole("button", { name: "Mois suivant" }).click();
  await expect(page).toHaveURL(/mois=/);
  await expect(page.getByRole("link", { name: /Tartiflette/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Aujourd'hui", exact: true }).click();
  await expect(row).toBeVisible();

  // Detail.
  await row.click();
  await expect(page.getByRole("heading", { name: "Tartiflette" })).toBeVisible();
  await expect(page.getByText("Chez mamie, part généreuse")).toBeVisible();
  await expect(page.getByText("Sport", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Donner mon retour" })).toBeVisible();

  // Edit the carbs.
  await page.getByRole("link", { name: "Modifier", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Modifier le repas" })).toBeVisible();
  await expect(page.getByLabel("Qu'est-ce qu'on mange ?")).toHaveValue("Tartiflette");
  await expect(page.getByRole("button", { name: "Glucides : 80 g" })).toBeVisible();
  await tap(page, ["Effacer", "Effacer", "9", "5"]);
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await page.waitForURL(/\/repas\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "Tartiflette" })).toBeVisible();
  await expect(page.getByText("95 g")).toBeVisible();

  // Delete, then undo.
  await page.getByRole("button", { name: "Supprimer" }).click();
  await page.waitForURL(/\/calendrier/);
  await expect(page.getByText("Repas supprimé")).toBeVisible();
  await expect(page.getByRole("link", { name: /Tartiflette/ })).toHaveCount(0);
  await expect(today).toHaveAccessibleName(/aucun repas/);
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("link", { name: /Tartiflette/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: /Tartiflette/ })).toContainText("95 g");

  // Search by name, by note and by tag.
  await page.getByRole("link", { name: "Rechercher un repas" }).click();
  await page.waitForURL(/\/recherche/);
  const search = page.getByRole("searchbox", { name: /Rechercher/ });
  await search.fill("tartif");
  await expect(page.getByRole("link", { name: /Tartiflette/ })).toBeVisible();
  await expect(page.getByText("1 repas trouvé")).toBeVisible();
  await search.fill("MAMIE");
  await expect(page.getByRole("link", { name: /Tartiflette/ })).toBeVisible();
  await search.fill("");
  await page.getByRole("button", { name: /Alcool/ }).click();
  await expect(page.getByText("Rien trouvé")).toBeVisible();
  await page.getByRole("button", { name: /Alcool/ }).click();
  await page.getByRole("button", { name: /Sport/ }).click();
  await expect(page).toHaveURL(/tag=SPORT/);
  await expect(page.getByRole("link", { name: /Tartiflette/ })).toBeVisible();
});

test("someone else's meal stays private", async ({ page, browser }) => {
  await registerAndOnboard(page, { name: "Zoé" });
  await page.goto("/repas/nouveau");
  await page.getByLabel("Qu'est-ce qu'on mange ?").fill("Secret de Zoé");
  await tap(page, ["3", "0"]);
  await page.getByRole("button", { name: "Utiliser" }).click();
  await page.getByRole("button", { name: "Enregistrer le repas" }).click();
  await page.waitForURL(/ajout=/, { waitUntil: "commit" });
  const mealId = new URL(page.url()).searchParams.get("ajout");
  expect(mealId).toBeTruthy();

  const other = await browser.newContext({
    baseURL: new URL(page.url()).origin,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  });
  const intruder = await other.newPage();
  await registerAndOnboard(intruder, { name: "Max" });
  expect((await intruder.goto(`/repas/${mealId}`))?.status()).toBe(404);
  expect((await intruder.goto(`/repas/${mealId}/modifier`))?.status()).toBe(404);
  await intruder.goto("/recherche?q=Secret");
  await expect(intruder.getByText("Rien trouvé")).toBeVisible();
  await other.close();
});
