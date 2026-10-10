import { type Page, expect, test } from "@playwright/test";
import { registerAndOnboard } from "./helpers";

async function tap(page: Page, keys: string[]) {
  for (const key of keys) await page.getByRole("button", { name: key, exact: true }).click();
}

/** Logs a meal with the suggested dose (default ratio 1 U / 10 g); returns its id. */
async function logMeal(page: Page, name: string, carbs: string[], notes?: string) {
  await page.goto("/repas/nouveau");
  await page.getByLabel("Qu'est-ce qu'on mange ?").fill(name);
  await tap(page, carbs);
  await page.getByRole("button", { name: "Utiliser" }).click();
  if (notes) await page.getByLabel("Notes").fill(notes);
  await page.getByRole("button", { name: "Enregistrer le repas" }).click();
  await page.waitForURL(/ajout=/, { waitUntil: "commit" });
  return new URL(page.url()).searchParams.get("ajout") ?? "";
}

test("« Mes plats »: grouping, favourites, one-tap entry, rename and merge", async ({
  page,
  browser,
}) => {
  await registerAndOnboard(page, { name: "Léa" });

  // An empty library is kind.
  await page.getByRole("link", { name: "Mes plats" }).click();
  await expect(page.getByRole("heading", { name: "Ton carnet t'attend" })).toBeVisible();

  // Two spellings, one dish.
  const first = await logMeal(page, "Pâtes au pesto", ["6", "0"], "Avec un peu de parmesan");
  await page.goto(`/retour/${first}`);
  await page.getByRole("radio", { name: /Pile poil/ }).click();
  await page.getByRole("button", { name: "C'est noté" }).click();
  await page.getByRole("link", { name: "Retour à l'accueil" }).waitFor();
  await logMeal(page, "pates pesto", ["8", "0"]);

  await page.goto("/plats");
  const all = page.getByRole("list", { name: "Tous mes plats" });
  await expect(all.getByRole("link")).toHaveCount(1);
  const card = all.getByRole("link", { name: /Pâtes au pesto/ });
  await expect(card).toContainText("2 fois");
  await expect(card).toContainText("~70 g");

  // Dish page: stats, best dose, notes, meals.
  await card.click();
  await page.waitForURL(/\/plats\/[^/]+$/);
  const dishUrl = page.url();
  await expect(page.getByRole("heading", { name: "Pâtes au pesto", level: 1 })).toBeVisible();
  await expect(page.getByText("Mangé 2 fois")).toBeVisible();
  const best = page.getByRole("region", { name: /La dose qui a le mieux marché/ });
  await expect(best).toContainText("60 g · 6 U");
  await expect(best).toContainText("pile poil 1 fois");
  await expect(
    page.getByRole("region", { name: "Mes notes" }).getByText("Avec un peu de parmesan"),
  ).toBeVisible();
  await expect(page.getByRole("list", { name: /Repas : / }).getByRole("link")).toHaveCount(2);

  // Favourite, optimistic, and kept after a reload.
  const favorite = page.getByRole("button", { name: "Favori" });
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "Favori" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.goto("/plats");
  await expect(
    page.getByRole("list", { name: "Mes favoris" }).getByRole("link", { name: /Pâtes au pesto/ }),
  ).toBeVisible();

  // One tap from the meal form fills the name and the values that worked.
  await page.goto("/repas/nouveau");
  const chips = page.getByRole("list", { name: "Mes plats favoris" });
  await chips.getByRole("button", { name: /Pâtes au pesto/ }).click();
  await expect(page.getByLabel("Qu'est-ce qu'on mange ?")).toHaveValue("Pâtes au pesto");
  await expect(page.getByRole("button", { name: "Glucides : 60 g" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Insuline rapide : 6 U" })).toBeVisible();
  await expect(chips).toHaveCount(0);

  // « Manger ça » prefills the form too.
  await page.goto(dishUrl);
  await page.getByRole("link", { name: "Manger ça" }).click();
  await page.waitForURL(/\/repas\/nouveau\?plat=/);
  await expect(page.getByLabel("Qu'est-ce qu'on mange ?")).toHaveValue("Pâtes au pesto");
  await expect(page.getByRole("button", { name: "Glucides : 60 g" })).toBeVisible();

  // Rename.
  await page.goto(dishUrl);
  await page.getByRole("button", { name: "Renommer" }).click();
  const rename = page.getByRole("dialog", { name: "Renommer le plat" });
  await rename.getByLabel("Nouveau nom").fill("Pâtes au pesto de mamie");
  await rename.getByRole("button", { name: "Renommer" }).click();
  await expect(rename).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Pâtes au pesto de mamie", level: 1 }),
  ).toBeVisible();

  // Merge another dish into it.
  await logMeal(page, "Trofie genovese", ["5", "0"]);
  await page.goto("/plats");
  await page.getByRole("link", { name: /Trofie genovese/ }).click();
  await page.waitForURL(/\/plats\/[^/]+$/);
  const sourceUrl = page.url();
  await page.getByRole("button", { name: "Fusionner…" }).click();
  const merge = page.getByRole("dialog", { name: "Fusionner avec…" });
  await merge.getByRole("radio", { name: /Pâtes au pesto de mamie/ }).click();
  await merge.getByRole("button", { name: "Continuer" }).click();
  const confirm = page.getByRole("dialog", { name: "On fusionne ?" });
  await expect(confirm).toContainText("« Trofie genovese » disparaîtra");
  await confirm.getByRole("button", { name: "Oui, fusionner" }).click();
  await page.waitForURL((url) => url.href.startsWith(dishUrl));
  await expect(page.getByText("C'est fusionné !")).toBeVisible();
  await expect(page.getByText("Mangé 3 fois")).toBeVisible();
  expect((await page.goto(sourceUrl))?.status()).toBe(404);
  await page.goto("/plats");
  await expect(page.getByRole("link", { name: /Trofie genovese/ })).toHaveCount(0);

  // Someone else never sees her dish.
  const other = await browser.newContext({
    baseURL: new URL(page.url()).origin,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  });
  const intruder = await other.newPage();
  await registerAndOnboard(intruder, { name: "Max" });
  expect((await intruder.goto(dishUrl))?.status()).toBe(404);
  const dishId = new URL(dishUrl).pathname.split("/").pop();
  await intruder.goto(`/repas/nouveau?plat=${dishId}`);
  await expect(intruder.getByLabel("Qu'est-ce qu'on mange ?")).toHaveValue("");
  await other.close();
});
