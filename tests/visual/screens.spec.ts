import { type Page, test } from "@playwright/test";
import pg from "pg";
import { E2E_DATABASE_URL, registerAndOnboard } from "../e2e/helpers";

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
  await page.goto("/");
  await shoot(page, "10-accueil");

  await page.goto("/repas/nouveau");
  await shoot(page, "20-saisie-vide");
  await page.getByLabel("Qu'est-ce qu'on mange ?").fill("Raclette");
  for (const key of ["6", "5"]) await page.getByRole("button", { name: key, exact: true }).click();
  await page.getByRole("button", { name: /Absorption lente/ }).click();
  await shoot(page, "21-saisie-remplie");
});

/** A few weeks of history so « Mon évolution » has something to draw. */
async function seedHistory(email: string) {
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  const { rows } = await client.query<{ id: string }>(`SELECT id FROM "User" WHERE email = $1`, [
    email,
  ]);
  const userId = rows[0]!.id;
  const day = 86_400_000;
  const now = Date.now();
  const moments = ["BREAKFAST", "LUNCH", "DINNER"] as const;
  const outcomes = ["PERFECT", "PERFECT", "TOO_MUCH", "PERFECT", "NOT_ENOUGH"] as const;
  for (let index = 0; index < 24; index += 1) {
    await client.query(
      `INSERT INTO "Meal" (id, "userId", name, "eatenAt", moment, "carbsGrams", "insulinUnits", outcome, "updatedAt")
       VALUES ($1, $2, 'Repas', $3, $4, 50, 5, $5, now())`,
      [
        `seed-${userId}-${index}`,
        userId,
        new Date(now - (index + 1) * day * 1.1),
        moments[index % 3],
        outcomes[index % 5],
      ],
    );
  }
  await client.query(`UPDATE "RatioChange" SET "createdAt" = $2 WHERE "userId" = $1`, [
    userId,
    new Date(now - 28 * day),
  ]);
  const changes: [string, number, number, string, number][] = [
    ["DEFAULT", 10, 11, "SUGGESTION", 18],
    ["DINNER", 11, 12, "MANUAL", 9],
  ];
  for (const [moment, from, to, origin, daysAgo] of changes) {
    await client.query(
      `INSERT INTO "RatioChange" (id, "userId", moment, "fromValue", "toValue", origin, justification, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        `seed-${userId}-${moment}`,
        userId,
        moment,
        from,
        to,
        origin,
        origin === "MANUAL" ? "Conseil de mon diabéto" : "Tes derniers repas ont un peu monté",
        new Date(now - daysAgo * day),
      ],
    );
  }
  await client.query(
    `INSERT INTO "Ratio" (id, "userId", moment, "gramsPerUnit", "updatedAt") VALUES ($1, $2, 'DINNER', 12, now())`,
    [`seed-${userId}-ratio`, userId],
  );
  await client.query(
    `UPDATE "Ratio" SET "gramsPerUnit" = 11 WHERE "userId" = $1 AND moment = 'DEFAULT'`,
    [userId],
  );
  await client.query(`UPDATE "UserSettings" SET "usePerMomentRatios" = true WHERE "userId" = $1`, [
    userId,
  ]);
  await client.end();
}

test("moi screens", async ({ page }) => {
  const { email } = await registerAndOnboard(page, { name: "Léa" });
  await seedHistory(email);
  for (const [name, path] of [
    ["11-accueil-lente", "/"],
    ["50-moi", "/moi"],
    ["51-ratios", "/moi/ratios"],
    ["52-evolution", "/moi/evolution"],
    ["53-donnees", "/moi/donnees"],
    ["54-codes", "/moi/codes"],
  ] as const) {
    await page.goto(path);
    await shoot(page, name);
  }
});
