import { expect, test } from "@playwright/test";
import { format, subDays } from "date-fns";
import { PASSWORD, registerAndOnboard } from "./helpers";

test("settings: dark theme, pen increment and a manual ratio change", async ({ page }) => {
  await registerAndOnboard(page, { name: "Léa" });
  await page.getByRole("link", { name: "Moi" }).click();
  await expect(page.getByRole("heading", { name: "Moi", exact: true })).toBeVisible();

  await page.getByRole("radio", { name: "Sombre" }).click();
  await expect(page.getByText("Enregistré")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  await page.getByRole("radio", { name: /0,5 U/ }).click();
  await expect(page.getByText("Enregistré")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("radio", { name: /0,5 U/ })).toHaveAttribute("aria-checked", "true");

  await page.getByRole("link", { name: /Modifier mes ratios/ }).click();
  await page.getByRole("button", { name: "Modifier le ratio général" }).click();
  await page.getByRole("button", { name: "Augmenter ratio Général" }).click();
  await page.getByRole("button", { name: "Augmenter ratio Général" }).click();
  await page.getByLabel(/Pourquoi ce changement/).fill("Conseil de mon diabéto");
  await page.getByRole("button", { name: "Enregistrer" }).click();

  const history = page.getByRole("list", { name: "Historique des ratios" });
  await expect(history.getByText("manuel")).toBeVisible();
  await expect(history.getByText("« Conseil de mon diabéto »")).toBeVisible();
  await expect(history.getByText("1 U / 11 g")).toBeVisible();
  await expect(history.getByText("départ", { exact: true })).toBeVisible();
});

test("long-acting insulin check on the home page, with undo", async ({ page }) => {
  await registerAndOnboard(page, { name: "Léa" });
  await expect(page.getByText("Ta lente du jour")).toBeVisible();
  await page.getByRole("button", { name: "Lente faite", exact: true }).click();
  await expect(page.getByText("Lente faite aujourd'hui ✓")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Lente faite aujourd'hui ✓")).toBeVisible();

  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByText("Ta lente du jour")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Ta lente du jour")).toBeVisible();
});

test("exports: CSV, PDF and the full ZIP, only for the owner", async ({ page, playwright }) => {
  await registerAndOnboard(page, { name: "Léa" });

  await page.goto("/repas/nouveau");
  await page.getByLabel("Qu'est-ce qu'on mange ?").fill("Crêpes 🥞");
  await page.getByRole("button", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: "0", exact: true }).click();
  await page.getByRole("button", { name: "Utiliser" }).click();
  await page.getByRole("button", { name: "Enregistrer le repas" }).click();
  await page.waitForURL(/ajout=/);

  const to = format(new Date(), "yyyy-MM-dd");
  const from = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const csv = await page.request.get(`/api/export/csv?from=${from}&to=${to}`);
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toBe("text/csv; charset=utf-8");
  expect(csv.headers()["content-disposition"]).toMatch(/^attachment; filename=".+\.csv"$/);
  expect(csv.headers()["cache-control"]).toContain("no-store");
  const text = await csv.text();
  expect(text.charCodeAt(0)).toBe(0xfeff);
  expect(text).toContain("Date;Heure;Moment;Plat");
  expect(text).toContain("Crêpes 🥞;40;");

  const pdf = await page.request.get(`/api/export/pdf?from=${from}&to=${to}`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect(pdf.headers()["content-disposition"]).toMatch(/^attachment; filename=".+\.pdf"$/);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  const zip = await page.request.get("/api/export/all");
  expect(zip.status()).toBe(200);
  expect(zip.headers()["content-type"]).toBe("application/zip");
  expect(zip.headers()["content-disposition"]).toMatch(/^attachment; filename=".+\.zip"$/);
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");

  const bad = await page.request.get(`/api/export/csv?from=${to}&to=${from}`);
  expect(bad.status()).toBe(400);

  // Download links on « Mes données ».
  await page.goto("/moi/donnees");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Exporter toutes mes données" }).click();
  expect((await download).suggestedFilename()).toMatch(/^glucoperso-mes-donnees-.+\.zip$/);

  const anonymous = await playwright.request.newContext({ baseURL: new URL(page.url()).origin });
  for (const path of [
    "/api/export/all",
    `/api/export/csv?from=${from}&to=${to}`,
    "/api/export/pdf",
  ]) {
    expect((await anonymous.get(path)).status()).toBe(401);
  }
  await anonymous.dispose();
});

test("account deletion asks for the password, then everything is gone", async ({ page }) => {
  const { email } = await registerAndOnboard(page, { name: "Léa" });
  await page.goto("/moi/donnees");
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();

  const dialog = page.getByRole("dialog", { name: "Supprimer ton compte ?" });
  await dialog.getByLabel("Ton mot de passe").fill("pas le bon mot de passe");
  await dialog.getByRole("button", { name: "Oui, tout supprimer" }).click();
  await expect(dialog.getByText("Ce n'est pas le bon mot de passe.")).toBeVisible();

  await dialog.getByLabel("Ton mot de passe").fill(PASSWORD);
  await dialog.getByRole("button", { name: "Oui, tout supprimer" }).click();
  await page.waitForURL(/\/connexion\?au-revoir=1$/);
  await expect(page.getByRole("heading", { name: /Au revoir/ })).toBeVisible();

  await page.goto("/");
  await expect(page).toHaveURL(/\/connexion$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page.getByText("Email ou mot de passe incorrect")).toBeVisible();
});
