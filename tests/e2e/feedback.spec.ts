import { expect, test } from "@playwright/test";
import { registerAndOnboard } from "./helpers";

test("give feedback: readings pre-select, her choice wins, pile poil celebrates", async ({
  page,
}) => {
  await registerAndOnboard(page, { name: "Léa" });
  await page.goto("/repas/nouveau");
  await page.getByLabel("Qu'est-ce qu'on mange ?").fill("Raclette");
  await page.getByRole("button", { name: "6", exact: true }).click();
  await page.getByRole("button", { name: "0", exact: true }).click();
  await page.getByRole("button", { name: "Utiliser" }).click();
  await page.getByRole("button", { name: "Enregistrer le repas" }).click();
  await page.waitForURL(/ajout=/);
  const mealId = new URL(page.url()).searchParams.get("ajout");

  await page.goto(`/retour/${mealId}`);
  await expect(page.getByRole("heading", { name: /pour raclette/ })).toBeVisible();

  await page.getByText("Ajouter des valeurs (facultatif)").click();
  await page.getByLabel("Plus bas (g/L)").fill("0,55");
  await expect(page.getByRole("radio", { name: /Un peu trop d'insuline/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  await page.getByRole("radio", { name: /Pile poil/ }).click();
  await page.getByLabel("Une note pour la prochaine fois").fill("Fromage à volonté");
  await page.getByRole("button", { name: "C'est noté" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.getByRole("link", { name: "Retour à l'accueil" }).click();

  await page.goto("/repas/nouveau");
  await page.getByLabel("Qu'est-ce qu'on mange ?").fill("Raclette");
  await expect(page.getByText("Fromage à volonté")).toBeVisible();
});
