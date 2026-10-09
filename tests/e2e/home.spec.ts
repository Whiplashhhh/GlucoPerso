import { expect, test } from "@playwright/test";
import { format } from "date-fns";
import { registerAndOnboard } from "./helpers";

test("home shows the ratio hero and asks how an earlier meal went", async ({ page }) => {
  await registerAndOnboard(page, { name: "Léa" });
  await expect(page.getByText("1 U pour")).toBeVisible();
  await expect(page.getByText(/Confiance faible/)).toBeVisible();
  await expect(page.getByText("ton estomac attend son heure")).toBeVisible();
  await expect(page.getByText(/Indications basées sur ton historique/)).toBeVisible();

  await page.goto("/repas/nouveau");
  await page.getByLabel("Qu'est-ce qu'on mange ?").fill("Crêpes");
  await page.getByRole("button", { name: "Changer l'heure" }).click();
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
  await page.getByLabel("Date et heure du repas").fill(format(threeHoursAgo, "yyyy-MM-dd'T'HH:mm"));
  await page.getByRole("button", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: "0", exact: true }).click();
  await page.getByRole("button", { name: "Utiliser" }).click();
  await page.getByRole("button", { name: "Enregistrer le repas" }).click();
  await page.waitForURL(/ajout=/);

  await expect(page.getByText("C'est noté ! Je te demanderai")).toBeVisible();
  await page.getByRole("link", { name: /Comment ça s'est passé pour crêpes/ }).click();
  await page.getByRole("radio", { name: /Pile poil/ }).click();
  await page.getByRole("button", { name: "C'est noté" }).click();
  await page.getByRole("link", { name: "Retour à l'accueil" }).click();
  await expect(page.getByRole("link", { name: /Comment ça s'est passé/ })).toHaveCount(0);
});
