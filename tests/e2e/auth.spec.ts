import { expect, test } from "@playwright/test";
import { PASSWORD, registerAndOnboard, uniqueEmail } from "./helpers";

test("protected pages send visitors to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/connexion$/);
  await expect(page.getByRole("heading", { name: "Re-coucou !" })).toBeVisible();
});

test("register with an invite, onboard, sign out and sign back in", async ({ page }) => {
  const { email } = await registerAndOnboard(page, { name: "Léa" });
  await expect(page.getByRole("heading", { name: /Coucou Léa/ })).toBeVisible();

  await page.getByRole("link", { name: "Moi" }).click();
  await page.getByRole("button", { name: "Me déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page.getByRole("heading", { name: /Coucou Léa/ })).toBeVisible();
});

test("the raw sign-up endpoint is closed and pages carry security headers", async ({ request }) => {
  const signUp = await request.post("/api/auth/sign-up/email", {
    data: { name: "Intrus", email: uniqueEmail("intrus"), password: PASSWORD },
  });
  expect(signUp.status()).toBe(403);

  const response = await request.get("/connexion");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("'nonce-");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=(self)");
  expect(headers["strict-transport-security"]).toContain("max-age=");
});

test("an invalid invite code is refused", async ({ page }) => {
  await page.goto("/inscription");
  await page.getByLabel("Ton prénom").fill("Zoé");
  await page.getByLabel("Email").fill(uniqueEmail("zoe"));
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Code d'invitation").fill("AAAA-BBBB-CCCC");
  await page.getByRole("button", { name: "Créer mon carnet" }).click();
  await expect(page.getByText("Ce code d'invitation n'est pas (ou plus) valable.")).toBeVisible();
});

test("a recovery code resets the password once", async ({ page }) => {
  const { email, codes } = await registerAndOnboard(page, { name: "Inès" });
  await page.context().clearCookies();

  await page.goto("/recuperation");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Code de secours").fill(codes[0]!.toLowerCase());
  await page.getByLabel("Nouveau mot de passe").fill("un tout nouveau secret");
  await page.getByRole("button", { name: "Choisir ce mot de passe" }).click();
  await expect(page.getByText("ton nouveau mot de passe est enregistré")).toBeVisible();

  await page.goto("/recuperation");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Code de secours").fill(codes[0]!);
  await page.getByLabel("Nouveau mot de passe").fill("encore un autre secret");
  await page.getByRole("button", { name: "Choisir ce mot de passe" }).click();
  await expect(page.getByText("Ce code ne correspond pas.")).toBeVisible();
});

test("repeated wrong passwords lock the account for a while", async ({ page }) => {
  const email = uniqueEmail("locked");
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(email);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.getByLabel("Mot de passe", { exact: true }).fill(`mauvais ${attempt}`);
    await page.getByRole("button", { name: "Me connecter" }).click();
    await expect(page.getByText("Email ou mot de passe incorrect")).toBeVisible();
  }
  await page.getByLabel("Mot de passe", { exact: true }).fill("encore faux");
  await page.getByRole("button", { name: "Me connecter" }).click();
  await expect(page.getByText(/Trop d'essais/)).toBeVisible();
});
