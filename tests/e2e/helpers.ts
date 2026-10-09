import { type Page, expect } from "@playwright/test";
import pg from "pg";
import { generateCode, hashCode } from "../../src/lib/security/codes";

export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://glucoperso:glucoperso@localhost:5433/glucoperso_test";

/** Creates a fresh single-use invite directly in the test database. */
export async function nextInvite(): Promise<string> {
  const code = generateCode();
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  await client.query(
    `INSERT INTO "InviteCode" (id, "codeHash", "createdAt") VALUES ($1, $2, now())`,
    [`e2e-${code}`, hashCode(code)],
  );
  await client.end();
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
  await page.getByLabel("Code d'invitation").fill(await nextInvite());
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
