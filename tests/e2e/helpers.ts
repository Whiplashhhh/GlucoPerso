import { type Page, expect } from "@playwright/test";

export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://glucoperso:glucoperso@localhost:5433/glucoperso_test";

/** Known single-use invite codes inserted by the global setup. */
export const INVITE_CODES = Array.from(
  { length: 12 },
  (_, i) => `E2E0-TEST-${String(i).padStart(4, "0")}`,
);

let inviteIndex = 0;
export function nextInvite(): string {
  const code = INVITE_CODES[inviteIndex];
  inviteIndex += 1;
  if (!code) throw new Error("No invite code left for e2e tests");
  return code;
}

export const PASSWORD = "une jolie phrase secrète";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@exemple.test`;
}

/** Creates an account through the UI and finishes onboarding with defaults. */
export async function registerAndOnboard(
  page: Page,
  { name = "Léa", email = uniqueEmail("lea") }: { name?: string; email?: string } = {},
) {
  await page.goto("/inscription");
  await page.getByLabel("Ton prénom").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Code d'invitation").fill(nextInvite());
  await page.getByRole("button", { name: "Créer mon carnet" }).click();

  await expect(page.getByRole("heading", { name: "Tes codes de secours" })).toBeVisible();
  const codes = await page
    .getByRole("list", { name: "Codes de récupération" })
    .locator("li")
    .allTextContents();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger" }).click();
  await download;
  await page.getByRole("link", { name: "C'est noté, on continue" }).click();

  await expect(page.getByRole("heading", { name: "Enchantée !" })).toBeVisible();
  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: "Continuer" }).click();
  }
  await page.getByRole("button", { name: "C'est parti !" }).click();
  await page.waitForURL("/");
  return { email, codes };
}
