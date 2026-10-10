import { type Page, expect, test } from "@playwright/test";
import sharp from "sharp";
import { registerAndOnboard } from "./helpers";

async function tapNumber(page: Page, digits: string) {
  for (const digit of digits) {
    await page
      .getByRole("button", { name: digit === "," ? "Virgule" : digit, exact: true })
      .click();
  }
}

test("log a meal in a few taps, then find it again as « Déjà mangé »", async ({ page }) => {
  await registerAndOnboard(page, { name: "Léa" });

  await page.getByRole("link", { name: "Ajouter un repas" }).click();
  await expect(page.getByRole("heading", { name: "Nouveau repas" })).toBeVisible();

  const png = await sharp({
    create: { width: 64, height: 48, channels: 3, background: "#f08a6c" },
  })
    .png()
    .toBuffer();
  await page
    .getByTestId("photo-gallery-input")
    .setInputFiles({ name: "raclette.png", mimeType: "image/png", buffer: png });
  await expect(page.getByAltText("Aperçu de la photo du repas")).toBeVisible();

  await page.getByLabel("Qu'est-ce qu'on mange ?").fill("Raclette");
  await page.getByRole("button", { name: "Dîner" }).click();
  await tapNumber(page, "60");
  // Default onboarding ratio is 1 U / 10 g with a 1 U pen.
  await expect(page.getByText("60 g → 6 U")).toBeVisible();
  await page.getByRole("button", { name: "Utiliser" }).click();
  await page.getByRole("button", { name: /Absorption lente/ }).click();
  await page.getByRole("button", { name: "Enregistrer le repas" }).click();
  await page.waitForURL(/\/\?ajout=/, { waitUntil: "commit" });

  await page.goto("/repas/nouveau");
  await page.getByLabel("Qu'est-ce qu'on mange ?").fill("raclet");
  await expect(page.getByText(/Déjà mangé/)).toBeVisible();
  await expect(page.getByText(/La dernière fois, tu avais noté/)).toBeVisible();
  await page.getByRole("button", { name: "Reprendre ces valeurs" }).click();
  await expect(page.getByRole("button", { name: "Glucides : 60 g" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Insuline rapide : 6 U" })).toBeVisible();
});

test("a big dose asks for a gentle confirmation", async ({ page }) => {
  await registerAndOnboard(page, { name: "Mia" });
  await page.goto("/repas/nouveau");
  await page.getByLabel("Qu'est-ce qu'on mange ?").fill("Gâteau d'anniversaire");
  await tapNumber(page, "150");
  await page.getByRole("button", { name: /Insuline rapide/ }).click();
  await tapNumber(page, "18");
  await page.getByRole("button", { name: "Enregistrer le repas" }).click();
  await expect(page.getByRole("dialog", { name: "C'est bien 18 unités ?" })).toBeVisible();
  await page.getByRole("button", { name: "Oui, c'est bien ça" }).click();
  await page.waitForURL(/\/\?ajout=/, { waitUntil: "commit" });
});

test("a non-image file is refused by the photo upload", async ({ page }) => {
  await registerAndOnboard(page, { name: "Noé" });
  const response = await page.request.post("/api/photos", {
    headers: { origin: new URL(page.url()).origin },
    multipart: {
      photo: { name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<svg></svg>") },
    },
  });
  expect(response.status()).toBe(415);

  const crossSite = await page.request.post("/api/photos", {
    headers: { origin: "https://evil.example" },
    multipart: { photo: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("x") } },
  });
  expect(crossSite.status()).toBe(403);
});
